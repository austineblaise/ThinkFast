// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol"; 

contract QuizRewards is Ownable, ReentrancyGuard {
    using Strings for uint256;

    struct Play {
        string category;
        uint8 score;
        uint8 totalQuestions;
        uint256 timestamp;
    }

    address public rewardToken;

    mapping(address => mapping(string => uint256)) public lastClaimTimestampForCategory; 
    uint256 public constant CLAIM_COOLDOWN = 24 hours; 

    mapping(address => string) public lastClaimedCategory;

    uint256 public defaultMaxReward = 0.00001 ether; 
    
    mapping(string => uint256) public maxRewardForCategory;
    mapping(address => Play[]) private _playHistory;

    mapping(address => mapping(string => uint256)) public bestScorePerCategory;
    mapping(address => uint256) public totalScore;

    address[] public allPlayers;
    mapping(address => bool) private hasPlayedBefore;

    mapping(address => uint256) public totalClaimedAmount;
    mapping(address => uint256) public totalClaimedScore;

    event PlayRecorded(
        address indexed player,
        uint256 indexed playIndex,
        string category,
        uint8 score,
        uint8 totalQuestions,
        uint256 timestamp
    );

    event RewardClaimed(
        address indexed player,
        uint256 indexed playIndex,
        uint256 amount,
        address token
    );

    event RewardTokenUpdated(address indexed oldToken, address indexed newToken);
    event MaxRewardForCategoryUpdated(string category, uint256 oldReward, uint256 newReward);
    event NewPlayer(address indexed player);

    constructor(address _rewardToken) Ownable(msg.sender) {
        rewardToken = _rewardToken;
    }

    function recordPlayAndClaim(
        string calldata category,
        uint8 score,
        uint8 totalQuestions
    ) external nonReentrant {

        require(bytes(category).length > 0, "category required");
        require(totalQuestions > 0, "totalQuestions > 0");
        require(score <= totalQuestions, "score <= totalQuestions");

        uint256 lastClaim = lastClaimTimestampForCategory[msg.sender][category];
        require(block.timestamp >= lastClaim + CLAIM_COOLDOWN, "Cooldown: cannot claim for this category yet");

        uint256 maxReward = maxRewardForCategory[category];

        if (maxReward == 0) maxReward = defaultMaxReward;

        require(maxReward > 0, "no reward set");

        uint256 amount = (maxReward * score) / totalQuestions;
        require(amount > 0, "no reward for this score");

        Play memory p = Play({
            category: category,
            score: score,
            totalQuestions: totalQuestions,
            timestamp: block.timestamp
        });

        _playHistory[msg.sender].push(p);
        uint256 idx = _playHistory[msg.sender].length - 1;

        if (score > bestScorePerCategory[msg.sender][category]) {
            bestScorePerCategory[msg.sender][category] = score;
        }

        totalScore[msg.sender] += score;
        totalClaimedScore[msg.sender] += score;
        totalClaimedAmount[msg.sender] += amount;

        lastClaimTimestampForCategory[msg.sender][category] = block.timestamp;
        lastClaimedCategory[msg.sender] = category;

        if (!hasPlayedBefore[msg.sender]) {
            hasPlayedBefore[msg.sender] = true;
            allPlayers.push(msg.sender);
            emit NewPlayer(msg.sender);
        }

        emit PlayRecorded(msg.sender, idx, category, score, totalQuestions, block.timestamp);

        if (rewardToken == address(0)) {
            string memory errorMessage = string.concat(
                "insufficient balance: contract needs ",
                amount.toString(),
                " wei"
            );

            require(address(this).balance >= amount, errorMessage);

            (bool ok, ) = msg.sender.call{value: amount}("");
            require(ok, "transfer failed");

            emit RewardClaimed(msg.sender, idx, amount, address(0));
        } else {
            IERC20 token = IERC20(rewardToken);
            require(token.balanceOf(address(this)) >= amount, "insufficient token balance");
            require(token.transfer(msg.sender, amount), "token transfer failed");

            emit RewardClaimed(msg.sender, idx, amount, rewardToken);
        }
    }

    function getPlayCount(address player) external view returns (uint256) {
        return _playHistory[player].length;
    }

    function getPlay(address player, uint256 index)
        external
        view
        returns (string memory category, uint8 score, uint8 totalQuestions, uint256 timestamp)
    {
        require(index < _playHistory[player].length, "index out of range");
        Play storage p = _playHistory[player][index];
        return (p.category, p.score, p.totalQuestions, p.timestamp);
    }

    function getAllPlayers() external view returns (address[] memory) {
        return allPlayers;
    }

    function getPlayersCount() external view returns (uint256) {
        return allPlayers.length;
    }

    function getPlayerSummary(address player)
        external
        view
        returns (uint256 _totalScore, uint256 _totalClaimedScore, uint256 _totalClaimedAmount, uint256 _playsCount)
    {
        _totalScore = totalScore[player];
        _totalClaimedScore = totalClaimedScore[player];
        _totalClaimedAmount = totalClaimedAmount[player];
        _playsCount = _playHistory[player].length;
    }

    function getLastClaimInfo(address player, string calldata category)
        external
        view
        returns (string memory _lastCategory, uint256 _lastClaimTimestamp, uint256 _cooldownRemaining)
    {
        _lastCategory = lastClaimedCategory[player];
        _lastClaimTimestamp = lastClaimTimestampForCategory[player][category];

        if (block.timestamp >= _lastClaimTimestamp + CLAIM_COOLDOWN) {
            _cooldownRemaining = 0;
        } else {
            _cooldownRemaining = (_lastClaimTimestamp + CLAIM_COOLDOWN) - block.timestamp;
        }
    }

    function setRewardToken(address _token) external onlyOwner {
        address old = rewardToken;
        rewardToken = _token;
        emit RewardTokenUpdated(old, _token);
    }

    function setDefaultMaxReward(uint256 amount) external onlyOwner {
        defaultMaxReward = amount;
    }

    function setMaxRewardForCategory(string calldata category, uint256 amount) external onlyOwner {
        uint256 old = maxRewardForCategory[category];
        maxRewardForCategory[category] = amount;
        emit MaxRewardForCategoryUpdated(category, old, amount);
    }

    receive() external payable {}

    function withdrawNative(address payable to, uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "insufficient balance");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "withdraw failed");
    }

    function withdrawToken(address tokenAddr, address to, uint256 amount) external onlyOwner {
        IERC20 token = IERC20(tokenAddr);
        require(token.balanceOf(address(this)) >= amount, "insufficient token");
        require(token.transfer(to, amount), "token transfer failed");
    }
}




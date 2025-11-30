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

    // FIXED: You MUST call Ownable(msg.sender)
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









// pragma solidity ^0.8.20;

// import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// contract QuizRewards is Ownable, ReentrancyGuard {

//     struct Play {
//         string category;
//         uint8 score;
//         uint8 totalQuestions;
//         uint256 timestamp;
//         bool claimed;
//     }

//     address public rewardToken;

//     mapping(string => uint256) public maxRewardForCategory;
//     mapping(address => Play[]) private _playHistory;

//     mapping(address => mapping(string => uint256)) public bestScorePerCategory;
//     mapping(address => uint256) public totalScore;

//     address[] public allPlayers;
//     mapping(address => bool) private hasPlayedBefore;

//     mapping(address => uint256) public totalClaimedAmount;
//     mapping(address => uint256) public totalClaimedScore;

//     event PlayRecorded(
//         address indexed player,
//         uint256 indexed playIndex,
//         string category,
//         uint8 score,
//         uint8 totalQuestions,
//         uint256 timestamp
//     );

//     event RewardClaimed(
//         address indexed player,
//         uint256 indexed playIndex,
//         uint256 amount,
//         address token
//     );

//     event RewardTokenUpdated(address indexed oldToken, address indexed newToken);
//     event MaxRewardForCategoryUpdated(string category, uint256 oldReward, uint256 newReward);
//     event NewPlayer(address indexed player);

//     constructor(address _rewardToken) Ownable(msg.sender) {
//         rewardToken = _rewardToken;  // address(0) means CELO native token
//     }

//     // --- SIMPLIFIED RECORD PLAY (NO SIGNATURES) ---
//     function recordPlay(
//         string calldata category,
//         uint8 score,
//         uint8 totalQuestions
//     ) external {
//         require(bytes(category).length > 0, "category required");
//         require(totalQuestions > 0, "totalQuestions > 0");
//         require(score <= totalQuestions, "score <= totalQuestions");

//         Play memory p = Play({
//             category: category,
//             score: score,
//             totalQuestions: totalQuestions,
//             timestamp: block.timestamp,
//             claimed: false
//         });

//         _playHistory[msg.sender].push(p);

//         uint256 idx = _playHistory[msg.sender].length - 1;

//         if (score > bestScorePerCategory[msg.sender][category]) {
//             bestScorePerCategory[msg.sender][category] = score;
//         }

//         totalScore[msg.sender] += score;

//         if (!hasPlayedBefore[msg.sender]) {
//             hasPlayedBefore[msg.sender] = true;
//             allPlayers.push(msg.sender);
//             emit NewPlayer(msg.sender);
//         }

//         emit PlayRecorded(msg.sender, idx, category, score, totalQuestions, block.timestamp);
//     }

//     function getPlayCount(address player) external view returns (uint256) {
//         return _playHistory[player].length;
//     }

//     function getPlay(address player, uint256 index)
//         external
//         view
//         returns (
//             string memory category,
//             uint8 score,
//             uint8 totalQuestions,
//             uint256 timestamp,
//             bool claimed
//         )
//     {
//         require(index < _playHistory[player].length, "index out of range");
//         Play storage p = _playHistory[player][index];
//         return (p.category, p.score, p.totalQuestions, p.timestamp, p.claimed);
//     }

//     function getAllPlayers() external view returns (address[] memory) {
//         return allPlayers;
//     }

//     function getPlayersCount() external view returns (uint256) {
//         return allPlayers.length;
//     }

//     function getPlayerSummary(address player) external view returns (
//         uint256 _totalScore,
//         uint256 _totalClaimedScore,
//         uint256 _totalClaimedAmount,
//         uint256 _playsCount
//     ) {
//         _totalScore = totalScore[player];
//         _totalClaimedScore = totalClaimedScore[player];
//         _totalClaimedAmount = totalClaimedAmount[player];
//         _playsCount = _playHistory[player].length;
//     }

//     // --- CLAIM REWARD (UNCHANGED) ---
//     function claimReward(uint256 playIndex) external nonReentrant {
//         require(playIndex < _playHistory[msg.sender].length, "invalid playIndex");
//         Play storage p = _playHistory[msg.sender][playIndex];
//         require(!p.claimed, "already claimed");

//         uint256 maxReward = maxRewardForCategory[p.category];
//         require(maxReward > 0, "no reward set for category");

//         uint256 amount = (maxReward * uint256(p.score)) / uint256(p.totalQuestions);
//         require(amount > 0, "no reward for this score");

//         p.claimed = true;

//         totalClaimedScore[msg.sender] += p.score;
//         totalClaimedAmount[msg.sender] += amount;

//         if (rewardToken == address(0)) {
//             require(address(this).balance >= amount, "insufficient balance");
//             (bool ok, ) = msg.sender.call{value: amount}("");
//             require(ok, "transfer failed");
//             emit RewardClaimed(msg.sender, playIndex, amount, address(0));
//         } else {
//             IERC20 token = IERC20(rewardToken);
//             require(token.balanceOf(address(this)) >= amount, "insufficient token balance");
//             bool sent = token.transfer(msg.sender, amount);
//             require(sent, "token transfer failed");
//             emit RewardClaimed(msg.sender, playIndex, amount, rewardToken);
//         }
//     }

//     function setRewardToken(address _token) external onlyOwner {
//         address old = rewardToken;
//         rewardToken = _token;
//         emit RewardTokenUpdated(old, _token);
//     }

//     function setMaxRewardForCategory(string calldata category, uint256 amount) external onlyOwner {
//         uint256 old = maxRewardForCategory[category];
//         maxRewardForCategory[category] = amount;
//         emit MaxRewardForCategoryUpdated(category, old, amount);
//     }

//     receive() external payable {}

//     function withdrawNative(address payable to, uint256 amount) external onlyOwner {
//         require(address(this).balance >= amount, "insufficient balance");
//         (bool ok, ) = to.call{value: amount}("");
//         require(ok, "withdraw failed");
//     }

//     function withdrawToken(address tokenAddr, address to, uint256 amount) external onlyOwner {
//         IERC20 token = IERC20(tokenAddr);
//         require(token.balanceOf(address(this)) >= amount, "insufficient token");
//         bool sent = token.transfer(to, amount);
//         require(sent, "token transfer failed");
//     }
// }






// // pragma solidity ^0.8.20;

// // /**
// //  *  QuizRewards - Pure Solidity version (no OpenZeppelin)
// //  *
// //  *  - Ownable implemented
// //  *  - ReentrancyGuard implemented
// //  *  - Minimal IERC20 interface
// //  *  - ECDSA recover implemented (expects 65-byte signature r,s,v)
// //  *  - toEthSignedMessageHash implemented
// //  *
// //  *  Notes:
// //  *   - Categories are accepted as `string calldata` externally but stored/used as bytes32 keccak256(category)
// //  *   - Nonces incremented per-player on successful recordPlay verification
// //  *   - claimReward supports native payout (rewardToken == address(0)) or ERC20
// //  *   - Keep gas/stack usage reasonable by delegating signature verification to internal function
// //  */

// // contract QuizRewards {
// //     /* ========== ACCESS CONTROL (Ownable) ========== */
// //     address public owner;

// //     modifier onlyOwner() {
// //         require(msg.sender == owner, "Ownable: caller is not the owner");
// //         _;
// //     }

// //     function _transferOwnership(address newOwner) internal {
// //         owner = newOwner;
// //     }

// //     /* ========== REENTRANCY GUARD ========== */
// //     uint256 private _status;
// //     uint256 private constant _NOT_ENTERED = 1;
// //     uint256 private constant _ENTERED = 2;

// //     modifier nonReentrant() {
// //         require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
// //         _status = _ENTERED;
// //         _;
// //         _status = _NOT_ENTERED;
// //     }

// //     /* ========== MINIMAL ERC20 INTERFACE ========== */
// //     interface IERC20 {
// //         function balanceOf(address account) external view returns (uint256);
// //         function transfer(address to, uint256 amount) external returns (bool);
// //     }

// //     /* ========== STRUCTS & STORAGE ========== */
// //     struct Play {
// //         string category; // original category text (for reading)
// //         uint8 score;
// //         uint8 totalQuestions;
// //         uint256 timestamp;
// //         bool claimed;
// //     }

// //     address public trustedSigner;
// //     address public rewardToken; // address(0) => native

// //     // Use bytes32 hash of category for mapping keys (cheaper & safer)
// //     mapping(bytes32 => uint256) private _maxRewardForCategory;
// //     mapping(address => Play[]) private _playHistory;
// //     mapping(address => mapping(bytes32 => uint256)) public bestScorePerCategory;
// //     mapping(address => uint256) public totalScore;
// //     mapping(address => uint256) public nonces;

// //     address[] public allPlayers;
// //     mapping(address => bool) private hasPlayedBefore;

// //     mapping(address => uint256) public totalClaimedAmount;
// //     mapping(address => uint256) public totalClaimedScore;

// //     /* ========== EVENTS ========== */
// //     event PlayRecorded(
// //         address indexed player,
// //         uint256 indexed playIndex,
// //         string category,
// //         uint8 score,
// //         uint8 totalQuestions,
// //         uint256 timestamp
// //     );

// //     event RewardClaimed(
// //         address indexed player,
// //         uint256 indexed playIndex,
// //         uint256 amount,
// //         address token
// //     );

// //     event TrustedSignerUpdated(address indexed oldSigner, address indexed newSigner);
// //     event RewardTokenUpdated(address indexed oldToken, address indexed newToken);
// //     event MaxRewardForCategoryUpdated(string category, uint256 oldReward, uint256 newReward);
// //     event NewPlayer(address indexed player);

// //     /* ========== CONSTRUCTOR ========== */
// //     constructor(address _trustedSigner, address _rewardToken) {
// //         require(_trustedSigner != address(0), "trustedSigner cannot be zero");
// //         owner = msg.sender;
// //         _status = _NOT_ENTERED;
// //         trustedSigner = _trustedSigner;
// //         rewardToken = _rewardToken;
// //     }

// //     /* ========== EXTERNAL / PUBLIC API ========== */

// //     /**
// //      * recordPlay
// //      * - Verifies a signature made by the trustedSigner over the play details + nonce
// //      * - Stores play and updates derived stats
// //      */
// //     function recordPlay(
// //         address player,
// //         string calldata category,
// //         uint8 score,
// //         uint8 totalQuestions,
// //         uint256 timestamp,
// //         bytes calldata signature
// //     ) external {
// //         require(player != address(0), "invalid player");
// //         require(bytes(category).length > 0, "category required");
// //         require(totalQuestions > 0, "totalQuestions > 0");
// //         require(score <= totalQuestions, "score <= totalQuestions");

// //         // verify signature and that it's from trustedSigner
// //         _verifyPlaySignature(player, category, score, totalQuestions, timestamp, signature);

// //         // increment nonce AFTER successful verification to prevent replay
// //         nonces[player]++;

// //         Play memory p = Play({
// //             category: category,
// //             score: score,
// //             totalQuestions: totalQuestions,
// //             timestamp: timestamp,
// //             claimed: false
// //         });

// //         _playHistory[player].push(p);
// //         uint256 idx = _playHistory[player].length - 1;

// //         bytes32 catHash = keccak256(bytes(category));
// //         if (score > bestScorePerCategory[player][catHash]) {
// //             bestScorePerCategory[player][catHash] = score;
// //         }

// //         totalScore[player] += score;

// //         if (!hasPlayedBefore[player]) {
// //             hasPlayedBefore[player] = true;
// //             allPlayers.push(player);
// //             emit NewPlayer(player);
// //         }

// //         emit PlayRecorded(player, idx, category, score, totalQuestions, timestamp);
// //     }

// //     /**
// //      * claimReward - player claims reward for a recorded play
// //      */
// //     function claimReward(uint256 playIndex) external nonReentrant {
// //         require(playIndex < _playHistory[msg.sender].length, "invalid playIndex");
// //         Play storage p = _playHistory[msg.sender][playIndex];
// //         require(!p.claimed, "already claimed");

// //         bytes32 catHash = keccak256(bytes(p.category));
// //         uint256 maxReward = _maxRewardForCategory[catHash];
// //         require(maxReward > 0, "no reward set for category");

// //         uint256 amount = (maxReward * uint256(p.score)) / uint256(p.totalQuestions);
// //         require(amount > 0, "no reward for this score");

// //         p.claimed = true;

// //         totalClaimedScore[msg.sender] += p.score;
// //         totalClaimedAmount[msg.sender] += amount;

// //         if (rewardToken == address(0)) {
// //             require(address(this).balance >= amount, "insufficient contract balance");
// //             (bool ok, ) = msg.sender.call{value: amount}("");
// //             require(ok, "native transfer failed");
// //             emit RewardClaimed(msg.sender, playIndex, amount, address(0));
// //         } else {
// //             IERC20 token = IERC20(rewardToken);
// //             require(token.balanceOf(address(this)) >= amount, "insufficient token balance");
// //             bool sent = token.transfer(msg.sender, amount);
// //             require(sent, "token transfer failed");
// //             emit RewardClaimed(msg.sender, playIndex, amount, rewardToken);
// //         }
// //     }

// //     /* ========== VIEW HELPERS ========== */

// //     function getPlayCount(address player) external view returns (uint256) {
// //         return _playHistory[player].length;
// //     }

// //     function getPlay(address player, uint256 index)
// //         external
// //         view
// //         returns (
// //             string memory category,
// //             uint8 score,
// //             uint8 totalQuestions,
// //             uint256 timestamp,
// //             bool claimed
// //         )
// //     {
// //         require(index < _playHistory[player].length, "index out of range");
// //         Play storage p = _playHistory[player][index];
// //         return (p.category, p.score, p.totalQuestions, p.timestamp, p.claimed);
// //     }

// //     function getAllPlayers() external view returns (address[] memory) {
// //         return allPlayers;
// //     }

// //     function getPlayersCount() external view returns (uint256) {
// //         return allPlayers.length;
// //     }

// //     function getPlayerSummary(address player) external view returns (
// //         uint256 _totalScore,
// //         uint256 _totalClaimedScore,
// //         uint256 _totalClaimedAmount,
// //         uint256 _playsCount
// //     ) {
// //         _totalScore = totalScore[player];
// //         _totalClaimedScore = totalClaimedScore[player];
// //         _totalClaimedAmount = totalClaimedAmount[player];
// //         _playsCount = _playHistory[player].length;
// //     }

// //     function getMaxRewardForCategory(string calldata category) external view returns (uint256) {
// //         return _maxRewardForCategory[keccak256(bytes(category))];
// //     }

// //     /* ========== OWNER FUNCTIONS ========== */

// //     function setTrustedSigner(address _signer) external onlyOwner {
// //         require(_signer != address(0), "zero address");
// //         address old = trustedSigner;
// //         trustedSigner = _signer;
// //         emit TrustedSignerUpdated(old, _signer);
// //     }

// //     function setRewardToken(address _token) external onlyOwner {
// //         address old = rewardToken;
// //         rewardToken = _token;
// //         emit RewardTokenUpdated(old, _token);
// //     }

// //     function setMaxRewardForCategory(string calldata category, uint256 amount) external onlyOwner {
// //         bytes32 catHash = keccak256(bytes(category));
// //         uint256 old = _maxRewardForCategory[catHash];
// //         _maxRewardForCategory[catHash] = amount;
// //         emit MaxRewardForCategoryUpdated(category, old, amount);
// //     }

// //     receive() external payable {}

// //     function withdrawNative(address payable to, uint256 amount) external onlyOwner {
// //         require(to != address(0), "zero address");
// //         require(address(this).balance >= amount, "insufficient balance");
// //         (bool ok, ) = to.call{value: amount}("");
// //         require(ok, "withdraw failed");
// //     }

// //     function withdrawToken(address tokenAddr, address to, uint256 amount) external onlyOwner {
// //         require(to != address(0), "zero address");
// //         IERC20 token = IERC20(tokenAddr);
// //         require(token.balanceOf(address(this)) >= amount, "insufficient token balance");
// //         bool sent = token.transfer(to, amount);
// //         require(sent, "token transfer failed");
// //     }

// //     /* ========== INTERNAL: SIGNATURE VERIFICATION (ECDSA) ========== */

// //     // Compose the hash used in signatures (same fields as original)
// //     function _hashPlay(
// //         address player,
// //         bytes32 categoryHash,
// //         uint8 score,
// //         uint8 totalQuestions,
// //         uint256 timestamp,
// //         uint256 playerNonce,
// //         address contractAddr,
// //         uint256 chainId
// //     ) internal pure returns (bytes32) {
// //         return keccak256(
// //             abi.encode(
// //                 player,
// //                 categoryHash,
// //                 score,
// //                 totalQuestions,
// //                 timestamp,
// //                 playerNonce,
// //                 contractAddr,
// //                 chainId
// //             )
// //         );
// //     }

// //     // Prefix per EIP-191 for eth_sign
// //     function _toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
// //         // "\x19Ethereum Signed Message:\n32" + hash
// //         return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
// //     }

// //     // Recover signer from 65-byte signature
// //     function _recoverSigner(bytes32 ethSignedHash, bytes calldata signature) internal pure returns (address) {
// //         // signature must be 65 bytes
// //         require(signature.length == 65, "invalid signature length");
// //         bytes32 r;
// //         bytes32 s;
// //         uint8 v;
// //         // solhint-disable-next-line no-inline-assembly
// //         assembly {
// //             r := calldataload(add(signature.offset, 0x20))
// //             s := calldataload(add(signature.offset, 0x40))
// //             v := byte(0, calldataload(add(signature.offset, 0x60)))
// //         }
// //         // Adjust v value if needed (27/28)
// //         if (v < 27) {
// //             v += 27;
// //         }
// //         require(v == 27 || v == 28, "invalid v value");

// //         address signer = ecrecover(ethSignedHash, v, r, s);
// //         require(signer != address(0), "invalid signature");
// //         return signer;
// //     }

// //     function _verifyPlaySignature(
// //         address player,
// //         string calldata category,
// //         uint8 score,
// //         uint8 totalQuestions,
// //         uint256 timestamp,
// //         bytes calldata signature
// //     ) internal view {
// //         bytes32 categoryHash = keccak256(bytes(category));
// //         uint256 playerNonce = nonces[player];

// //         bytes32 structHash = _hashPlay(
// //             player,
// //             categoryHash,
// //             score,
// //             totalQuestions,
// //             timestamp,
// //             playerNonce,
// //             address(this),
// //             block.chainid
// //         );

// //         bytes32 ethHash = _toEthSignedMessageHash(structHash);
// //         address recovered = _recoverSigner(ethHash, signature);
// //         require(recovered == trustedSigner, "invalid signature");
// //     }

// //     /* ========== OPTIONAL: ADMIN - TRANSFER OWNERSHIP ========== */

// //     function transferOwnership(address newOwner) external onlyOwner {
// //         require(newOwner != address(0), "Ownable: new owner is the zero address");
// //         _transferOwnership(newOwner);
// //     }
// // }



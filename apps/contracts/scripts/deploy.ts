import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying QuizRewards...");


  const rewardToken = "0x0000000000000000000000000000000000000000";

  // IMPORTANT FIX: get signer
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deploying from:", deployer.address);

  const QuizRewards = await ethers.getContractFactory("QuizRewards", deployer);

const contract = await QuizRewards.deploy(rewardToken);


  await contract.waitForDeployment();

  console.log("🎉 QuizRewards deployed successfully!");
  console.log("📌 Contract Address:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});



// import { ethers } from "hardhat";


// async function main() {
//   console.log("🚀 Deploying QuizRewards...");

//   const trustedSigner = "0xac8eef928150f4e3c6c27dfc2a93c1a77522d258";
//   const rewardToken = "0x0000000000000000000000000000000000000000";

//   const QuizRewards = await ethers.getContractFactory("QuizRewards");
//   const contract = await QuizRewards.deploy(trustedSigner, rewardToken);

//   await contract.deployed();

//   console.log("🎉 QuizRewards deployed successfully!");
//   console.log("📌 Contract Address:", contract.address);
// }

// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });















// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// /* -------------------------------- */
// /* ------------- IERC20 ----------- */
// /* -------------------------------- */
// interface IERC20 {
//     function transfer(address to, uint256 amount) external returns (bool);
//     function balanceOf(address account) external view returns (uint256);
// }

// /* -------------------------------- */
// /* --------- OWNABLE -------------- */
// /* -------------------------------- */
// contract Ownable {
//     address public owner;

//     event OwnershipTransferred(address indexed old, address indexed newOwner);

//     constructor(address _owner) {
//         require(_owner != address(0), "owner zero");
//         owner = _owner;
//         emit OwnershipTransferred(address(0), _owner);
//     }

//     modifier onlyOwner() {
//         require(msg.sender == owner, "not owner");
//         _;
//     }

//     function transferOwnership(address newOwner) external onlyOwner {
//         require(newOwner != address(0), "zero");
//         emit OwnershipTransferred(owner, newOwner);
//         owner = newOwner;
//     }
// }

// /* -------------------------------- */
// /* ------- REENTRANCY GUARD ------- */
// /* -------------------------------- */
// contract ReentrancyGuard {
//     uint256 private locked = 1;

//     modifier nonReentrant() {
//         require(locked == 1, "reentrancy");
//         locked = 2;
//         _;
//         locked = 1;
//     }
// }

// /* -------------------------------- */
// /* -------- ECDSA RECOVER --------- */
// /* -------------------------------- */
// library SimpleECDSA {
//     function recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
//         require(signature.length == 65, "bad sig");

//         bytes32 r;
//         bytes32 s;
//         uint8 v;

//         // Extract signature fields
//         assembly {
//             r := mload(add(signature, 32))
//             s := mload(add(signature, 64))
//             v := byte(0, mload(add(signature, 96)))
//         }

//         // Reject malleable signatures
//         require(uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF, "bad s");

//         if (v < 27) v += 27;
//         require(v == 27 || v == 28, "bad v");

//         return ecrecover(hash, v, r, s);
//     }

//     function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
//         return keccak256(
//             abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
//         );
//     }
// }

// /* -------------------------------- */
// /* ----------- QUIZ REWARDS ------- */
// /* -------------------------------- */
// contract QuizRewards is Ownable, ReentrancyGuard {

//     using SimpleECDSA for bytes32;

//     struct Play {
//         string category;
//         uint8 score;
//         uint8 totalQuestions;
//         uint256 timestamp;
//         bool claimed;
//     }

//     address public trustedSigner;
//     address public rewardToken;

//     mapping(string => uint256) public maxRewardForCategory;
//     mapping(address => Play[]) private plays;

//     mapping(address => mapping(string => uint256)) public bestScorePerCategory;
//     mapping(address => uint256) public totalScore;
//     mapping(address => uint256) public nonces;

//     address[] public allPlayers;
//     mapping(address => bool) private seenPlayer;

//     mapping(address => uint256) public totalClaimedAmount;
//     mapping(address => uint256) public totalClaimedScore;

//     event PlayRecorded(address indexed player, uint256 index, string category, uint8 score, uint8 totalQ, uint256 time);
//     event RewardClaimed(address indexed player, uint256 playIndex, uint256 amount, address token);
//     event NewPlayer(address indexed player);

//     constructor(address _signer, address _rewardToken)
//         Ownable(msg.sender)
//     {
//         require(_signer != address(0), "zero signer");
//         trustedSigner = _signer;
//         rewardToken = _rewardToken;
//     }

//     /* ---------------------------- VERIFY SIGNATURE ---------------------------- */
//     function verifySignature(
//         address player,
//         string calldata category,
//         uint8 score,
//         uint8 totalQ,
//         uint256 timestamp,
//         uint256 nonce,
//         bytes calldata sig
//     ) internal view {

//         bytes32 catHash = keccak256(bytes(category));

//         bytes32 hash = keccak256(
//             abi.encode(
//                 player,
//                 catHash,
//                 score,
//                 totalQ,
//                 timestamp,
//                 nonce,
//                 address(this),
//                 block.chainid
//             )
//         );

//         bytes32 ethHash = hash.toEthSignedMessageHash();
//         address signer = ethHash.recover(sig);

//         require(signer == trustedSigner, "bad signature");
//     }

//     /* ---------------------------- RECORD PLAY ---------------------------- */
//     function recordPlay(
//         address player,
//         string calldata category,
//         uint8 score,
//         uint8 totalQ,
//         uint256 timestamp,
//         bytes calldata signature
//     ) external {

//         require(player != address(0), "zero");
//         require(bytes(category).length > 0, "empty category");
//         require(score <= totalQ, "invalid score");
//         require(totalQ > 0, "bad totalQ");

//         uint256 nonce = nonces[player];

//         verifySignature(player, category, score, totalQ, timestamp, nonce, signature);
//         nonces[player]++;

//         Play memory p = Play(category, score, totalQ, timestamp, false);
//         plays[player].push(p);

//         uint256 idx = plays[player].length - 1;

//         if (score > bestScorePerCategory[player][category]) {
//             bestScorePerCategory[player][category] = score;
//         }

//         totalScore[player] += score;

//         if (!seenPlayer[player]) {
//             seenPlayer[player] = true;
//             allPlayers.push(player);
//             emit NewPlayer(player);
//         }

//         emit PlayRecorded(player, idx, category, score, totalQ, timestamp);
//     }

//     /* ---------------------------- CLAIM REWARD ---------------------------- */
//     function claimReward(uint256 playIndex) external nonReentrant {
//         require(playIndex < plays[msg.sender].length, "bad index");
//         Play storage p = plays[msg.sender][playIndex];
//         require(!p.claimed, "claimed");

//         uint256 maxReward = maxRewardForCategory[p.category];
//         require(maxReward > 0, "no reward");

//         uint256 amt = (maxReward * p.score) / p.totalQuestions;
//         require(amt > 0, "no reward");

//         p.claimed = true;

//         totalClaimedScore[msg.sender] += p.score;
//         totalClaimedAmount[msg.sender] += amt;

//         if (rewardToken == address(0)) {
//             require(address(this).balance >= amt, "no balance");
//             (bool ok, ) = msg.sender.call{value: amt}("");
//             require(ok, "transfer fail");
//         } else {
//             IERC20 t = IERC20(rewardToken);
//             require(t.balanceOf(address(this)) >= amt, "no token");
//             require(t.transfer(msg.sender, amt), "token fail");
//         }

//         emit RewardClaimed(msg.sender, playIndex, amt, rewardToken);
//     }

//     /* ---------------------------- ADMIN ---------------------------- */
//     function setTrustedSigner(address s) external onlyOwner {
//         require(s != address(0), "zero");
//         trustedSigner = s;
//     }

//     function setRewardToken(address t) external onlyOwner {
//         rewardToken = t;
//     }

//     function setMaxRewardForCategory(string calldata c, uint256 amt) external onlyOwner {
//         maxRewardForCategory[c] = amt;
//     }

//     /* ---------------------------- VIEW HELPERS ---------------------------- */
//     function getPlay(address p, uint256 i) external view returns (Play memory) {
//         return plays[p][i];
//     }

//     function getPlayCount(address p) external view returns (uint256) {
//         return plays[p].length;
//     }

//     function getAllPlayers() external view returns (address[] memory) {
//         return allPlayers;
//     }

//     function getPlayerSummary(address p) external view returns (
//         uint256 tScore,
//         uint256 tClaimedScore,
//         uint256 tClaimedAmount,
//         uint256 playCount
//     ) {
//         return (
//             totalScore[p],
//             totalClaimedScore[p],
//             totalClaimedAmount[p],
//             plays[p].length
//         );
//     }

//     /* ---------------------------- WITHDRAW ---------------------------- */
//     receive() external payable {}

//     function withdrawNative(address payable to, uint256 amt) external onlyOwner {
//         require(address(this).balance >= amt, "no balance");
//         (bool ok, ) = to.call{value: amt}("");
//         require(ok, "fail");
//     }

//     function withdrawToken(address token, address to, uint256 amt) external onlyOwner {
//         IERC20 t = IERC20(token);
//         require(t.balanceOf(address(this)) >= amt, "no token");
//         require(t.transfer(to, amt), "fail");
//     }
// }

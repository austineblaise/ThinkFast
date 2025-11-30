import { NextResponse } from "next/server";
import { createPublicClient, http, encodeAbiParameters, keccak256, stringToBytes, parseEther } from "viem";
import { celoAlfajores } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const contractAddress = "0x0a759b0515F7FABc33fe9702Bd7465c69b279319";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { player, category, score, totalQuestions, timestamp } = body;

    if (!player || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Load private key
    const pk = process.env.PRIVATE_KEY;
    if (!pk) return NextResponse.json({ error: "PRIVATE_KEY missing" }, { status: 500 });

    const account = privateKeyToAccount(pk as `0x${string}`);

    // 2. Public client for reading nonce
    const publicClient = createPublicClient({ chain: celoAlfajores, transport: http() });

    const nonce: bigint = await publicClient.readContract({
      address: contractAddress,
      abi: [
        { name: "nonces", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }
      ],
      functionName: "nonces",
      args: [player],
    });

    // 3. CATEGORY HASH (must match solidity: keccak256(bytes(category)))
    const categoryHash = keccak256(stringToBytes(category));

    // 4. STRUCT HASH — MUST MATCH EXACT solidity abi.encode order
    const structHash = keccak256(
      encodeAbiParameters(
        [
          { type: "address" },
          { type: "bytes32" },
          { type: "uint8" },
          { type: "uint8" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "address" },
          { type: "uint256" }
        ],
        [
          player,
          categoryHash,
          score,
          totalQuestions,
          BigInt(timestamp),
          nonce,
          contractAddress,
          BigInt(44787) // chainId for Celo Alfajores
        ]
      )
    );

    // 5. ETH SIGNED MESSAGE (must match: MessageHashUtils.toEthSignedMessageHash)
    const ethSignedMessage = account.signMessage({ message: { raw: structHash } });

    const signature = await ethSignedMessage;

    return NextResponse.json({ signature, nonce: Number(nonce) }, { status: 200 });

  } catch (e: any) {
    console.error("SIGNING ERROR:", e);
    return NextResponse.json({ error: "Signing failed", details: e.message }, { status: 500 });
  }
}


// You can add other handlers (HEAD, PUT, DELETE, etc.) if you want to be exhaustive
// but GET is the most common accidental method.



// import { NextResponse } from "next/server";
// import { 
//   createPublicClient, 
//   http, 
//   keccak256, 
//   encodeAbiParameters, 
//   stringToHex,
//   isAddress 
// } from "viem";
// import { privateKeyToAccount } from "viem/accounts";
// import { celoSepolia } from "viem/chains";

// // 1. Setup Public Client to read Nonces
// const publicClient = createPublicClient({
//   chain: celoSepolia,
//   transport: http()
// });

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const { player, category, score, totalQuestions, timestamp } = body;

//     // --- Validation ---
//     if (!process.env.PRIVATE_KEY) {
//       return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
//     }
    
//     // Ensure the contract address is set in .env
//     const contractAddress = process.env.NEXT_PUBLIC_QUIZ_REWARDS_ADDRESS as `0x${string}`;
//     if (!contractAddress || !isAddress(contractAddress)) {
//       return NextResponse.json({ error: "Contract address missing" }, { status: 500 });
//     }

//     if (!isAddress(player) || !category || typeof score !== 'number') {
//       return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
//     }

//     // --- 2. Fetch Data from Blockchain ---
//     // The contract uses `nonces[player]`. We MUST use the same value.
//     const nonce = await publicClient.readContract({
//       address: contractAddress,
//       abi: [
//         {
//           inputs: [{ name: "", type: "address" }],
//           name: "nonces",
//           outputs: [{ name: "", type: "uint256" }],
//           stateMutability: "view",
//           type: "function",
//         },
//       ],
//       functionName: "nonces",
//       args: [player],
//     }) as bigint;

//     // --- 3. Replicate Contract Hashing Logic ---
    
//     // A. Calculate Category Hash
//     // Solidity: keccak256(bytes(category))
//     const categoryHash = keccak256(stringToHex(category));

//     // B. Create Struct Hash
//     // Solidity: keccak256(abi.encode(player, categoryHash, score, totalQuestions, timestamp, nonce, address(this), chainid))
//     // We use encodeAbiParameters for `abi.encode`
//     const rawStruct = encodeAbiParameters(
//       [
//         { type: 'address' }, // player
//         { type: 'bytes32' }, // categoryHash
//         { type: 'uint8' },   // score
//         { type: 'uint8' },   // totalQuestions
//         { type: 'uint256' }, // timestamp
//         { type: 'uint256' }, // playerNonce (Fetched from chain)
//         { type: 'address' }, // contract address (address(this))
//         { type: 'uint256' }  // chainId
//       ],
//       [
//         player,
//         categoryHash,
//         score,
//         totalQuestions,
//         BigInt(timestamp),
//         nonce,               // <--- CRITICAL: Must match contract state
//         contractAddress,
//         BigInt(celoSepolia.id)
//       ]
//     );

//     const structHash = keccak256(rawStruct);

//     // --- 4. Sign ---
//     const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    
//     // account.signMessage automatically handles the "\x19Ethereum Signed Message:\n32" prefix
//     // which matches MessageHashUtils.toEthSignedMessageHash(structHash) in your contract.
//     const signature = await account.signMessage({
//       message: { raw: structHash },
//     });

//     console.log(`✅ Signed for ${player}: Nonce ${nonce}, Score ${score}`);

//     return NextResponse.json({ signature });

//   } catch (error) {
//     console.error("Signing Error:", error);
//     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
//   }
// }
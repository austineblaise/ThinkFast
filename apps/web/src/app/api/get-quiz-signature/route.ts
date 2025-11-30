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
    const pk = process.env.PRIVATE_KEY;
    if (!pk) return NextResponse.json({ error: "PRIVATE_KEY missing" }, { status: 500 });

    const account = privateKeyToAccount(pk as `0x${string}`);

    const publicClient = createPublicClient({ chain: celoAlfajores, transport: http() });

    const nonce: bigint = await publicClient.readContract({
      address: contractAddress,
      abi: [
        { name: "nonces", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }
      ],
      functionName: "nonces",
      args: [player],
    });

    const categoryHash = keccak256(stringToBytes(category));
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
          BigInt(44787) 
        ]
      )
    );
    const ethSignedMessage = account.signMessage({ message: { raw: structHash } });

    const signature = await ethSignedMessage;

    return NextResponse.json({ signature, nonce: Number(nonce) }, { status: 200 });

  } catch (e: any) {
    console.error("SIGNING ERROR:", e);
    return NextResponse.json({ error: "Signing failed", details: e.message }, { status: 500 });
  }
}

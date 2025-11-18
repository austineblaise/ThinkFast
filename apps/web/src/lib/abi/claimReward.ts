export async function claimReward(score: number) {
  if (typeof window === "undefined") return;


  const { ethers } = await import("ethers");

  if (!window.ethereum) {
    throw new Error("No crypto wallet found. Please install MetaMask or Valora.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const artifact = await import("./ScoreReward.json");
  const contract = new ethers.Contract(
    "0xdaf2501af5144a6901c2a3749Cb5Dc14aa77757D",
    artifact.abi,
    signer
  );

  try {
    const tx = await contract.claimReward(score);
    await tx.wait();
    return tx.hash;
  } catch (error: any) {
    console.error("Reward claim failed:", error);
    throw new Error(error.message || "Transaction failed");
  }
}


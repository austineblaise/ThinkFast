"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  useAccount,
  useConnect,
  useSwitchChain,
  useSendTransaction,
  usePublicClient,
} from "wagmi";
import { getReferralTag, submitReferral } from "@divvi/referral-sdk";
import { decodeErrorResult, encodeFunctionData } from "viem";

import ScoreRewardArtifact from "@/lib/abi/ScoreReward.json";
import { celo } from "wagmi/chains";

const ABI = ScoreRewardArtifact.abi;
const contractAddress = process.env
  .NEXT_PUBLIC_SCORE_REWARD_ADDRESS as `0x${string}`;

const CELO_CHAIN_ID = celo.id;

export default function ClaimRewardPage() {
  const { connect, connectors } = useConnect();
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();

  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastClaimedAt, setLastClaimedAt] = useState<number | null>(null);
  const [claimCooldown, setClaimCooldown] = useState<number>(0);
  const [isPending, setPending] = useState(false);

  const isMiniPay =
    typeof window !== "undefined" && (window as any).minipay;
  const isCorrectChain = chain?.id === CELO_CHAIN_ID;

  /* -------------------------------------------------------
     Load last played score from localStorage
  ------------------------------------------------------- */
  useEffect(() => {
    const stored = localStorage.getItem("lastQuizScore");
    if (stored) setLastScore(Number(stored));
  }, []);

  /* -------------------------------------------------------
     Auto-connect for MiniPay
  ------------------------------------------------------- */
  useEffect(() => {
    if (isMiniPay && !isConnected) {
      connect({ connector: connectors[0], chainId: CELO_CHAIN_ID });
    }
  }, [isMiniPay, isConnected]);

  /* -------------------------------------------------------
     Connect Wallet
  ------------------------------------------------------- */
  const handleConnect = useCallback(async () => {
    try {
      let connector =
        connectors.find((c) => c.id === "injected") ||
        connectors.find((c) => c.name?.toLowerCase().includes("metamask")) ||
        connectors[0];

      await connect({ connector, chainId: CELO_CHAIN_ID });
      toast.success("🔗 Wallet Connected");
    } catch (err) {
      toast.error("Failed to connect wallet.");
    }
  }, [connect, connectors]);

  /* -------------------------------------------------------
     Switch to CELO
  ------------------------------------------------------- */
  const handleSwitchChain = useCallback(async () => {
    try {
      await switchChain({ chainId: CELO_CHAIN_ID });
      toast.success("🌐 Switched to Celo");
    } catch (err) {
      toast.error("Unable to switch network.");
    }
  }, [switchChain]);

  /* -------------------------------------------------------
     Fetch lastClaimedAt from contract
  ------------------------------------------------------- */
  const fetchLastClaimedAt = useCallback(async () => {
    if (!address || !isCorrectChain) return;

    try {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: ABI,
        functionName: "lastClaimedAt",
        args: [address],
      });

      const timestamp = Number(result);
      setLastClaimedAt(timestamp);

      const now = Math.floor(Date.now() / 1000);
      const remaining = timestamp + 86400 - now;

      setClaimCooldown(remaining > 0 ? remaining : 0);
    } catch (err) {
      console.error("Failed to fetch cooldown");
    }
  }, [address, isCorrectChain]);

  useEffect(() => {
    fetchLastClaimedAt();
  }, [address, isCorrectChain]);

  useEffect(() => {
    if (claimCooldown <= 0) return;

    const interval = setInterval(() => {
      setClaimCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [claimCooldown]);

  const formatTime = (seconds: number) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  /* -------------------------------------------------------
     Claim Reward Logic (EXACTLY SAME AS YOUR QUIZ)
  ------------------------------------------------------- */
  const claimReward = useCallback(async () => {
    if (!lastScore || lastScore <= 0) {
      toast.error("Play a quiz and score > 0 first.");
      return;
    }

    setPending(true);

    if (!isConnected) {
      toast.info("Connecting wallet...");
      await handleConnect();
      setPending(false);
      return;
    }

    if (!isCorrectChain) {
      toast.error("Please switch to CELO network.");
      await handleSwitchChain();
      setPending(false);
      return;
    }

    let txHash: `0x${string}` | null = null;

    try {
      const consumer = "0x876E807dfe068145CAFF46F7C77df10e5ae8E308";
      const providers:any = [
        "0x0423189886d7966f0dd7e7d256898daeee625dca",
        "0xc95876688026be9d6fa7a7c33328bd013effa2bb",
        "0x7beb0e14f8d2e6f6678cc30d867787b384b19e20",
      ];

      const encoded = encodeFunctionData({
        abi: ABI,
        functionName: "claimReward",
        args: [lastScore],
      });

      const tag = await getReferralTag({
        user: address!,
        consumer,
        providers,
      });

      const txData = encoded + tag;

      txHash = await sendTransactionAsync({
        account: address!,
        to: contractAddress,
        data: txData as `0x${string}`,
      });

      toast.loading("⏳ Waiting for confirmation...");

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      toast.dismiss();

      if (receipt.status === "reverted") {
        toast.error("Transaction reverted.");
        setPending(false);
        return;
      }

      toast.success("🎉 Reward claimed!");

      const now = Math.floor(Date.now() / 1000);
      setLastClaimedAt(now);
      setClaimCooldown(86400);
    } catch (err: any) {
      toast.dismiss();
      toast.error("Claim failed.");
    }

    setPending(false);
  }, [
    lastScore,
    isConnected,
    isCorrectChain,
    address,
    sendTransactionAsync,
  ]);

  /* -------------------------------------------------------
     UI: BEAUTIFUL CARD
  ------------------------------------------------------- */

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-white dark:bg-[#17111F]">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-3xl p-10 shadow-2xl bg-gradient-to-br
        from-gray-900 via-gray-800 to-gray-700
        dark:from-[#E6E6FA] dark:via-[#dcdcf8] dark:to-[#c7c7ef]
        text-gray-100 dark:text-[#17111F]
        space-y-8"
      >
        <h1 className="text-2xl font-extrabold text-center">
          🎁 Claim Your Reward
        </h1>

        {/* If user never played */}
        {!lastScore && (
          <div className="text-center text-lg font-medium py-6">
            You have not played any quiz yet.
            <br />
            <span className="font-bold">Play a quiz to earn rewards!</span>
          </div>
        )}

        {/* Score display */}
        {lastScore !== null && (
          <div className="text-center">
            <p className="text-lg text-gray-300 dark:text-gray-700">
              Your last score:
            </p>
            <p className="text-4xl font-extrabold mt-1">
              {lastScore} / 10
            </p>
          </div>
        )}

        {/* Cooldown */}
        {claimCooldown > 0 && (
          <div className="text-center text-sm font-medium text-red-400 dark:text-red-600">
            ⏳ Claim again in: {formatTime(claimCooldown)}
          </div>
        )}

        {/* Claim Button */}
        <button
          disabled={
            isPending ||
            !lastScore ||
            lastScore <= 0 ||
            claimCooldown > 0
          }
          onClick={claimReward}
          className={`
          w-full py-4 rounded-xl font-bold text-lg transition-all shadow-md
          ${
            isPending || !lastScore || lastScore <= 0 || claimCooldown > 0
              ? "bg-gray-600 dark:bg-gray-300 text-gray-300 dark:text-gray-500 cursor-not-allowed"
              : "bg-[#17111F] dark:bg-[#E6E6FA] text-white dark:text-[#17111F] hover:scale-[1.02]"
          }
        `}
        >
          {isPending ? "Processing..." : "Claim Reward"}
        </button>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600">
          Reward is based on your last quiz score.
        </p>
      </motion.div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ContractFunctionExecutionError } from "viem";
import { celoSepolia } from "wagmi/chains";
import { FaRedoAlt, FaTimesCircle } from "react-icons/fa";
import { IoTimerOutline, IoTrophyOutline } from "react-icons/io5";
import {
  useAccount,
  useSwitchChain,
  useSendTransaction,
  usePublicClient,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getReferralTag } from "@divvi/referral-sdk";
import ScoreRewardArtifact from "@/lib/abi/QuizRewards.json";
const ABI = ScoreRewardArtifact.abi;
const contractAddress = process.env
  .NEXT_PUBLIC_REWARD_CONTRACT_ADDRESS as `0x${string}`;
const CELO_CHAIN_ID = celoSepolia.id;
const MAX_REWARD = 0.00001;

type PublicClient = ReturnType<typeof usePublicClient>;
type SimulateContractFn = NonNullable<PublicClient>["simulateContract"];
type ContractSimulateRequest = Awaited<
  ReturnType<SimulateContractFn>
>["request"] & { data: `0x${string}` };

const formatCategoryName = (category: string) => {
  return category.replace(/([A-Z])/g, " $1").trim();
};

interface ClaimScreenProps {
  initialScore: number;
  initialTotal: number;
  initialCategory: string;
  onClose: () => void;
}

export default function ClaimScreen({
  initialScore,
  initialTotal,
  initialCategory,
  onClose,
}: ClaimScreenProps) {
  const router = useRouter();

  const [showModal, setShowModal] = useState(true);

  const categoryForContract = initialCategory;
  const currentCategoryDisplay =
    formatCategoryName(categoryForContract) || "General Knowledge";

  const [score, setScore] = useState<number | null>(initialScore);
  const [totalQuestions, setTotalQuestions] = useState<number | null>(
    initialTotal
  );
  const [dataLoaded, setDataLoaded] = useState(false);

  const [isPending, setPending] = useState(false);
  const [lastCategory, setLastCategory] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();

  const isCorrectChain = chain?.id === CELO_CHAIN_ID;
  const isCooldownActive = cooldownRemaining > 0;

  useEffect(() => {
    setDataLoaded(true);
  }, []);

  const fetchCooldownInfo = useCallback(async () => {
    if (!address || !publicClient || !isCorrectChain || !categoryForContract)
      return;

    try {
      const res: any = await publicClient.readContract({
        address: contractAddress,
        abi: ABI,
        functionName: "getLastClaimInfo",
        args: [address, categoryForContract],
      });

      const lastCat = res[0];
      const remaining = Number(res[2]);

      setLastCategory(lastCat);
      setCooldownRemaining(remaining * 1000);
    } catch (err) {
      console.error("cooldown error:", err);
    }
  }, [address, publicClient, isCorrectChain, categoryForContract]);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const t = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(prev - 1000, 0));
    }, 1000);

    return () => clearInterval(t);
  }, [cooldownRemaining]);

  useEffect(() => {
    if (address && isCorrectChain && dataLoaded && categoryForContract) {
      fetchCooldownInfo();
    }
  }, [
    address,
    isCorrectChain,
    dataLoaded,
    categoryForContract,
    fetchCooldownInfo,
  ]);

  const getRewardForScore = (s: number) => {
    if (!s || !totalQuestions) return 0;
    return parseFloat((MAX_REWARD * (s / totalQuestions)).toFixed(8));
  };

  const recordAndClaimReward = useCallback(async () => {
    if (!address || score == null || totalQuestions == null) return;

    if (isCooldownActive) {
      toast.error(
        `Cooldown active for ${formatCategoryName(
          lastCategory || categoryForContract
        )}`
      );
      return;
    }

    try {
      setPending(true);

      const safeScore = Math.min(Math.max(Number(score), 0), 255);
      const safeTotal = Math.min(Math.max(Number(totalQuestions), 1), 255);

      const args = [categoryForContract.trim(), safeScore, safeTotal] as const;

      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi: ABI,
        functionName: "recordPlayAndClaim",
        args,
        account: address,
      });

      const encoded = (request as ContractSimulateRequest).data;

      try {
        await getReferralTag({
          user: address,
          consumer: "0x876E807dfe068145CAFF46F7C77df10e5ae8E308",
          providers: ["0x0423189886d7966f0dd7e7d256898daeee625dca"],
        });
      } catch {}

      toast.loading("Recording score & claiming reward...", { id: "claim-tx" });

      const txHash = await sendTransactionAsync({
        to: contractAddress,
        data: encoded,
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      toast.dismiss("claim-tx");

      if (receipt.status === "reverted") {
        toast.error("Transaction reverted. Check cooldown or reward balance.");
      } else {
        toast.success("🎉 Reward claimed!");
        fetchCooldownInfo();
        setScore(0);
        setTotalQuestions(null);
        router.push("/");
        onClose(); 
      }
    } catch (err: any) {
      toast.dismiss("claim-tx");
      let msg = "Transaction failed.";

      if (err?.message?.includes("rejected")) msg = "User rejected.";
      else if (err instanceof ContractFunctionExecutionError)
        msg = err.shortMessage ?? err.message;

      toast.error(msg);
    } finally {
      setPending(false);
    }
  }, [
    address,
    score,
    totalQuestions,
    categoryForContract,
    publicClient,
    sendTransactionAsync,
    fetchCooldownInfo,
    lastCategory,
    isCooldownActive,
    router,
    onClose, 
  ]);

  const canAttemptClaim =
    isConnected &&
    isCorrectChain &&
    score != null &&
    score > 0 &&
    !isPending &&
    !isCooldownActive;

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const getButtonText = () => {
    if (isPending) return "Claiming Reward...";

    if (isCooldownActive)
      return (
        <>
          <IoTimerOutline className="inline-block mr-1 text-xl" />
          {formatTime(cooldownRemaining)}
        </>
      );

    if (score! > 0) return "Claim Reward";

    return "Play to Earn";
  };

  const handleClose = () => {
    setShowModal(false);
    onClose();

    router.push("/");
  };

  return (
    <AnimatePresence>
      {showModal && (
        <>
          {/* BACKDROP - Uses handleClose */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 40 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative w-full max-w-md">
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 rounded-full p-2 bg-red-500 text-white shadow-md hover:bg-red-600 z-50"
              >
                <FaTimesCircle size={22} />
              </button>
              <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8">
                <div className="text-center mb-6">
                  <IoTrophyOutline className="mx-auto text-5xl text-[#2596be] mb-2" />
                  <h1 className="text-3xl font-extrabold text-zinc-800 dark:text-zinc-50">
                    Quiz Reward Status
                  </h1>
                </div>

                {score != null && totalQuestions != null && score! > 0 ? (
                  <div className="space-y-5">
                    {/* Info Card */}
                    <div className="bg-zinc-100 dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700">
                      <div className="mb-3">
                        <span className="text-sm text-zinc-500 font-semibold">
                          Quiz Category
                        </span>
                        <p className="text-xl font-bold text-[#2596be] mt-1">
                          {currentCategoryDisplay}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t pt-3 border-zinc-300 dark:border-zinc-700">
                        <div>
                          <span className="text-sm text-zinc-500 font-semibold">
                            Score
                          </span>
                          <p
                            className={`text-2xl font-extrabold mt-1 ${
                              score! / totalQuestions! > 0.5
                                ? "text-green-500"
                                : "text-orange-500"
                            }`}
                          >
                            {score} / {totalQuestions}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-zinc-500 font-semibold">
                            Potential Reward
                          </span>
                          <p className="font-mono text-xl font-bold mt-1">
                            {getRewardForScore(score!)} CELO
                          </p>
                        </div>
                      </div>
                    </div>

                    {isCooldownActive && (
                      <div className="flex items-center justify-center bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded-xl">
                        <IoTimerOutline className="text-2xl mr-2" />
                        <p className="text-sm font-medium">
                          Cooldown active...
                        </p>
                      </div>
                    )}

                    {!isConnected && (
                      <ConnectButton
                        showBalance={false}
                        label="Connect Wallet"
                      />
                    )}

                    {isConnected && !isCorrectChain && (
                      <button
                        onClick={() => switchChain({ chainId: CELO_CHAIN_ID })}
                        className="w-full py-3 bg-rose-500 text-white rounded-xl"
                      >
                        Switch to CELO Sepolia
                      </button>
                    )}

                    {isConnected && isCorrectChain && (
                      <button
                        disabled={!canAttemptClaim}
                        onClick={recordAndClaimReward}
                        className={`w-full py-4 rounded-xl font-bold text-lg ${
                          canAttemptClaim
                            ? "bg-[#2596be] hover:bg-[#1e789b] text-white"
                            : "bg-zinc-300 dark:bg-zinc-700 text-white/70"
                        }`}
                      >
                        {getButtonText()}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-6 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                    <FaTimesCircle className="mx-auto text-4xl text-red-500 mb-3" />
                    <p className="text-zinc-600 dark:text-zinc-400 font-medium">
                      {score === 0
                        ? "Reward claimed. Start a new quiz to earn more."
                        : "You must complete a quiz to earn rewards."}
                    </p>
                  </div>
                )}

                <hr className="my-6 border-zinc-300 dark:border-zinc-800" />

                <div className="text-center">
                  <button
                    onClick={() => router.push("/")}
                    className="text-sm font-semibold text-[#2596be]"
                  >
                    <FaRedoAlt className="inline-block mr-2" />
                    Start a New Quiz
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

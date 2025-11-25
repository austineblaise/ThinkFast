"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { decodeErrorResult, encodeFunctionData } from "viem";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaRedoAlt,
  FaWallet,
  FaHistory,
  FaClock,
} from "react-icons/fa";
import {
  useAccount,
  useConnect,
  useSwitchChain,
  useSendTransaction,
  usePublicClient,
} from "wagmi";
import ScoreRewardArtifact from "@/lib/abi/ScoreReward.json";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { getReferralTag, submitReferral } from "@divvi/referral-sdk";
import { celo } from "wagmi/chains";

const ABI = ScoreRewardArtifact.abi;
const contractAddress = process.env
  .NEXT_PUBLIC_SCORE_REWARD_ADDRESS as `0x${string}`;
const CELO_CHAIN_ID = celo.id;

export default function ClaimScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- State to hold score data ---
  const [score, setScore] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Wagmi hooks
  const { connect, connectors } = useConnect();
  const { sendTransactionAsync } = useSendTransaction();
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();

  // Claim specific state
  const [lastClaimedAt, setLastClaimedAt] = useState<number | null>(null);
  const [claimCooldown, setClaimCooldown] = useState<number>(0);
  const [isPending, setPending] = useState(false);

  const isCorrectChain = chain?.id === CELO_CHAIN_ID;
  const maxReward = 0.00001;

  // --- 1. LOAD SCORE LOGIC ---
  useEffect(() => {
    const scoreParam = searchParams.get("score");
    const totalParam = searchParams.get("total");

    if (scoreParam && totalParam) {
      setScore(parseInt(scoreParam));
      setTotalQuestions(parseInt(totalParam));
      setDataLoaded(true);
    } else {
      try {
        const storedHistory = localStorage.getItem("quizHistory");
        if (storedHistory) {
          const parsed = JSON.parse(storedHistory);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const lastGame = parsed[parsed.length - 1];
            setScore(lastGame.score || 0);
            setTotalQuestions(lastGame.totalQuestions || 0);
          }
        }
      } catch (error) {
        console.error("Error reading local storage", error);
      } finally {
        setDataLoaded(true);
      }
    }
  }, [searchParams]);

  // --- Helper to calculate reward ---
  const getRewardForScore = (s: number) => {
    if (s <= 0) return 0;
    return parseFloat((maxReward * (s / 10)).toFixed(8));
  };

  // --- Wallet Connection ---
  const handleConnect = useCallback(async () => {
    try {
      let connector =
        connectors.find((c) => c.id === "injected") ||
        connectors.find((c) => c.name?.toLowerCase().includes("metamask")) ||
        connectors[0];

      await connect({ connector, chainId: CELO_CHAIN_ID });
      toast.success("🔗 Connected to Celo!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect wallet.");
    }
  }, [connect, connectors]);

  const handleSwitchChain = useCallback(async () => {
    try {
      await switchChain({ chainId: CELO_CHAIN_ID });
      toast.success("🌐 Switched to Celo!");
    } catch (err) {
      console.error("Chain switch failed:", err);
      toast.error("Unable to switch network. Please switch manually.");
    }
  }, [switchChain]);

  // --- Fetch Cooldown Logic ---
  const fetchLastClaimedAt = useCallback(async () => {
    if (!address || !isCorrectChain || !publicClient) return;
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
      const cooldownSeconds = 24 * 60 * 60;
      const remaining = timestamp + cooldownSeconds - now;
      setClaimCooldown(remaining > 0 ? remaining : 0);
    } catch (err) {
      console.error("Failed to fetch lastClaimedAt:", err);
    }
  }, [address, isCorrectChain, publicClient]);

  useEffect(() => {
    if (address && isCorrectChain) fetchLastClaimedAt();
  }, [address, isCorrectChain, fetchLastClaimedAt]);

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
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}h ${m}m ${s}s`;
  };

  // --- Claim Transaction ---
  const claimReward = useCallback(async () => {
    setPending(true);
    if (score <= 0) {
      toast.error("⚠️ You must score more than 0 to claim.");
      setPending(false);
      return;
    }
    if (!isConnected) {
      await handleConnect();
      setPending(false);
      return;
    }
    if (!isCorrectChain) {
      await handleSwitchChain();
      setPending(false);
      return;
    }

    try {
      const consumer = "0x876E807dfe068145CAFF46F7C77df10e5ae8E308";
      const providers = [
        "0x0423189886d7966f0dd7e7d256898daeee625dca",
        "0xc95876688026be9d6fa7a7c33328bd013effa2bb",
        "0x7beb0e14f8d2e6f6678cc30d867787b384b19e20",
      ] as const;

      const encoded = encodeFunctionData({
        abi: ABI,
        functionName: "claimReward",
        args: [score],
      });

      const tag = await getReferralTag({ user: address!, consumer, providers });
      const txData = encoded + tag;

      const txHash = await sendTransactionAsync({
        account: address!,
        to: contractAddress,
        data: txData as `0x${string}`,
      });

      toast.loading("⏳ Waiting for confirmation...");
      const receipt = await publicClient?.waitForTransactionReceipt({
        hash: txHash,
      });
      toast.dismiss();

      if (receipt?.status === "reverted") {
        toast.error("❌ Transaction reverted.");
        setPending(false);
        return;
      }

      setLastClaimedAt(Math.floor(Date.now() / 1000));
      setClaimCooldown(24 * 60 * 60);
      toast.success("🎉 Reward claimed successfully!");

      try {
        if (txHash) await submitReferral({ txHash, chainId: CELO_CHAIN_ID });
      } catch (e) {
        console.log(e);
      }
    } catch (err: any) {
      toast.dismiss();
      const revertData = err?.cause?.data || err?.data;
      if (revertData) {
        try {
          const decoded = decodeErrorResult({ abi: ABI, data: revertData });
          if (decoded.errorName === "ClaimTooSoon")
            toast.error("⏱️ You can only claim once every 24 hours.");
          else toast.error(`⚠️ Error: ${decoded.errorName}`);
        } catch {
          toast.error("❌ Claim failed.");
        }
      } else {
        toast.error("❌ Claim failed: " + (err.shortMessage || "Unknown"));
      }
    }
    setPending(false);
  }, [
    score,
    isConnected,
    isCorrectChain,
    address,
    sendTransactionAsync,
    publicClient,
    handleConnect,
    handleSwitchChain,
  ]);

  // --- Initial Loading Spinner ---
  if (!dataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#2596be] border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm font-medium tracking-wide">
            Retrieving performance data...
          </p>
        </div>
      </div>
    );
  }

  const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
  const isPerfect = percentage === 100;

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300 overflow-hidden">
      
      {/* Ambient Background Effects - Updated to #2596be */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#2596be]/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-400/10 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Glass Card Container - Compacted Height (p-6, space-y-6) */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-3xl shadow-2xl shadow-[#2596be]/10 p-6 overflow-hidden">
          
          {/* Header Section */}
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-widest text-[#2596be] uppercase">
                Performance Report
              </span>
              {/* Badge for Logic Source */}
              {!searchParams.get("score") && totalQuestions > 0 && (
                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-zinc-200 dark:border-zinc-700">
                  <FaHistory className="text-[8px]" /> LAST RUN
                </span>
              )}
            </div>
            
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight text-center">
              Claim Rewards
            </h1>
          </div>

          {/* Main Content Area */}
          <div className="space-y-6">
            
            {/* Score Display */}
            {totalQuestions > 0 ? (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-[#2596be]/10 to-cyan-400/10 rounded-xl blur-md transition-opacity duration-500 opacity-60 group-hover:opacity-100" />
                <div className="relative bg-white dark:bg-zinc-950/80 border border-zinc-100 dark:border-zinc-800 rounded-xl p-5 text-center">
                  <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium mb-1 uppercase tracking-wide">
                    Total Score
                  </p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                      {score}
                    </span>
                    <span className="text-lg text-zinc-400 font-medium">
                      / {totalQuestions}
                    </span>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="mt-3 flex justify-center">
                    {score === 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-rose-500 text-xs font-bold bg-rose-500/10 px-2.5 py-1 rounded-full">
                        <FaTimesCircle /> No Answers
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${isPerfect ? 'text-[#2596be] bg-[#2596be]/10' : 'text-[#2596be] bg-[#2596be]/10'}`}>
                        <FaCheckCircle /> {isPerfect ? 'Perfect Score' : 'Completed'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
               <div className="p-6 text-center bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
                 <p className="text-zinc-500 text-sm">No quiz data found.</p>
               </div>
            )}

            {/* Action Area */}
            {score === 0 && totalQuestions > 0 ? (
              <div className="text-center px-2">
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  You need at least one correct answer to earn CELO rewards.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                
                {/* Reward Preview */}
                <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
                   <span className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">Reward Value</span>
                   <span className="text-zinc-900 dark:text-white font-bold font-mono text-lg">
                     {getRewardForScore(score)} <span className="text-[#2596be]">CELO</span>
                   </span>
                </div>

                {/* Main Action Buttons */}
                {!isConnected ? (
                  <button
                    onClick={handleConnect}
                    className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-semibold rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                  >
                    <FaWallet /> Connect Wallet
                  </button>
                ) : !isCorrectChain ? (
                  <button
                    onClick={handleSwitchChain}
                    className="w-full py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl shadow-lg shadow-rose-500/20 transition-all duration-200 text-sm"
                  >
                    Switch to Celo Network
                  </button>
                ) : claimCooldown > 0 ? (
                  <div className="w-full py-3 px-4 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed text-sm">
                    <FaClock className="animate-pulse" />
                    <span className="font-mono font-medium">Cooldown: {formatTime(claimCooldown)}</span>
                  </div>
                ) : (
                  <button
                    onClick={claimReward}
                    disabled={isPending || score === 0}
                    // Updated Gradient to use #2596be
                    className={`
                      w-full py-3 px-4 rounded-xl font-bold shadow-lg shadow-[#2596be]/25 flex items-center justify-center gap-2
                      transition-all duration-300 transform active:scale-[0.98]
                      ${score === 0 
                        ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-[#2596be] to-[#2fb5e6] hover:brightness-110 text-white'
                      }
                    `}
                  >
                    {isPending ? (
                      <span className="flex items-center gap-2 text-sm">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      "Claim Reward"
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer / Secondary Action - Compacted */}
          <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-white/5 flex justify-center">
            <button
              onClick={() => router.push("/quiz")}
              className="group flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-[#2596be] dark:hover:text-[#2596be] transition-colors duration-200 font-semibold text-xs uppercase tracking-wide"
            >
              <span className="p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-[#2596be]/10 transition-colors">
                 <FaRedoAlt className="text-xs group-hover:rotate-180 transition-transform duration-500" />
              </span>
              {totalQuestions > 0 ? "Play Again" : "Start New Quiz"}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}



// "use client";

// import { useEffect, useState, useCallback } from "react";
// import { motion } from "framer-motion";
// import { decodeErrorResult, encodeFunctionData } from "viem";
// import {
//   FaCheckCircle,
//   FaTimesCircle,
//   FaRedoAlt,
//   FaWallet,
//   FaHistory,
//   FaClock,
// } from "react-icons/fa";
// import {
//   useAccount,
//   useConnect,
//   useSwitchChain,
//   useSendTransaction,
//   usePublicClient,
// } from "wagmi";
// import ScoreRewardArtifact from "@/lib/abi/ScoreReward.json";
// import { toast } from "sonner";
// import { useRouter, useSearchParams } from "next/navigation";
// import { getReferralTag, submitReferral } from "@divvi/referral-sdk";
// import { celo } from "wagmi/chains";

// const ABI = ScoreRewardArtifact.abi;
// const contractAddress = process.env
//   .NEXT_PUBLIC_SCORE_REWARD_ADDRESS as `0x${string}`;
// const CELO_CHAIN_ID = celo.id;

// export default function ClaimScreen() {
//   const router = useRouter();
//   const searchParams = useSearchParams();

//   // --- State to hold score data ---
//   const [score, setScore] = useState<number>(0);
//   const [totalQuestions, setTotalQuestions] = useState<number>(0);
//   const [dataLoaded, setDataLoaded] = useState(false);

//   // Wagmi hooks
//   const { connect, connectors } = useConnect();
//   const { sendTransactionAsync } = useSendTransaction();
//   const { address, isConnected, chain } = useAccount();
//   const { switchChain } = useSwitchChain();
//   const publicClient = usePublicClient();

//   // Claim specific state
//   const [lastClaimedAt, setLastClaimedAt] = useState<number | null>(null);
//   const [claimCooldown, setClaimCooldown] = useState<number>(0);
//   const [isPending, setPending] = useState(false);

//   const isCorrectChain = chain?.id === CELO_CHAIN_ID;
//   const maxReward = 0.00001;

//   // --- 1. LOAD SCORE LOGIC ---
//   useEffect(() => {
//     const scoreParam = searchParams.get("score");
//     const totalParam = searchParams.get("total");

//     if (scoreParam && totalParam) {
//       setScore(parseInt(scoreParam));
//       setTotalQuestions(parseInt(totalParam));
//       setDataLoaded(true);
//     } else {
//       try {
//         const storedHistory = localStorage.getItem("quizHistory");
//         if (storedHistory) {
//           const parsed = JSON.parse(storedHistory);
//           if (Array.isArray(parsed) && parsed.length > 0) {
//             const lastGame = parsed[parsed.length - 1];
//             setScore(lastGame.score || 0);
//             setTotalQuestions(lastGame.totalQuestions || 0);
//           }
//         }
//       } catch (error) {
//         console.error("Error reading local storage", error);
//       } finally {
//         setDataLoaded(true);
//       }
//     }
//   }, [searchParams]);

//   // --- Helper to calculate reward ---
//   const getRewardForScore = (s: number) => {
//     if (s <= 0) return 0;
//     return parseFloat((maxReward * (s / 10)).toFixed(8));
//   };

//   // --- Wallet Connection ---
//   const handleConnect = useCallback(async () => {
//     try {
//       let connector =
//         connectors.find((c) => c.id === "injected") ||
//         connectors.find((c) => c.name?.toLowerCase().includes("metamask")) ||
//         connectors[0];

//       await connect({ connector, chainId: CELO_CHAIN_ID });
//       toast.success("🔗 Connected to Celo!");
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to connect wallet.");
//     }
//   }, [connect, connectors]);

//   const handleSwitchChain = useCallback(async () => {
//     try {
//       await switchChain({ chainId: CELO_CHAIN_ID });
//       toast.success("🌐 Switched to Celo!");
//     } catch (err) {
//       console.error("Chain switch failed:", err);
//       toast.error("Unable to switch network. Please switch manually.");
//     }
//   }, [switchChain]);

//   // --- Fetch Cooldown Logic ---
//   const fetchLastClaimedAt = useCallback(async () => {
//     if (!address || !isCorrectChain || !publicClient) return;
//     try {
//       const result = await publicClient.readContract({
//         address: contractAddress,
//         abi: ABI,
//         functionName: "lastClaimedAt",
//         args: [address],
//       });
//       const timestamp = Number(result);
//       setLastClaimedAt(timestamp);
//       const now = Math.floor(Date.now() / 1000);
//       const cooldownSeconds = 24 * 60 * 60;
//       const remaining = timestamp + cooldownSeconds - now;
//       setClaimCooldown(remaining > 0 ? remaining : 0);
//     } catch (err) {
//       console.error("Failed to fetch lastClaimedAt:", err);
//     }
//   }, [address, isCorrectChain, publicClient]);

//   useEffect(() => {
//     if (address && isCorrectChain) fetchLastClaimedAt();
//   }, [address, isCorrectChain, fetchLastClaimedAt]);

//   useEffect(() => {
//     if (claimCooldown <= 0) return;
//     const interval = setInterval(() => {
//       setClaimCooldown((prev) => {
//         if (prev <= 1) {
//           clearInterval(interval);
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);
//     return () => clearInterval(interval);
//   }, [claimCooldown]);

//   const formatTime = (seconds: number) => {
//     const h = Math.floor(seconds / 3600)
//       .toString()
//       .padStart(2, "0");
//     const m = Math.floor((seconds % 3600) / 60)
//       .toString()
//       .padStart(2, "0");
//     const s = (seconds % 60).toString().padStart(2, "0");
//     return `${h}h ${m}m ${s}s`;
//   };

//   // --- Claim Transaction ---
//   const claimReward = useCallback(async () => {
//     setPending(true);
//     if (score <= 0) {
//       toast.error("⚠️ You must score more than 0 to claim.");
//       setPending(false);
//       return;
//     }
//     if (!isConnected) {
//       await handleConnect();
//       setPending(false);
//       return;
//     }
//     if (!isCorrectChain) {
//       await handleSwitchChain();
//       setPending(false);
//       return;
//     }

//     try {
//       const consumer = "0x876E807dfe068145CAFF46F7C77df10e5ae8E308";
//       const providers = [
//         "0x0423189886d7966f0dd7e7d256898daeee625dca",
//         "0xc95876688026be9d6fa7a7c33328bd013effa2bb",
//         "0x7beb0e14f8d2e6f6678cc30d867787b384b19e20",
//       ] as const;

//       const encoded = encodeFunctionData({
//         abi: ABI,
//         functionName: "claimReward",
//         args: [score],
//       });

//       const tag = await getReferralTag({ user: address!, consumer, providers });
//       const txData = encoded + tag;

//       const txHash = await sendTransactionAsync({
//         account: address!,
//         to: contractAddress,
//         data: txData as `0x${string}`,
//       });

//       toast.loading("⏳ Waiting for confirmation...");
//       const receipt = await publicClient?.waitForTransactionReceipt({
//         hash: txHash,
//       });
//       toast.dismiss();

//       if (receipt?.status === "reverted") {
//         toast.error("❌ Transaction reverted.");
//         setPending(false);
//         return;
//       }

//       setLastClaimedAt(Math.floor(Date.now() / 1000));
//       setClaimCooldown(24 * 60 * 60);
//       toast.success("🎉 Reward claimed successfully!");

//       try {
//         if (txHash) await submitReferral({ txHash, chainId: CELO_CHAIN_ID });
//       } catch (e) {
//         console.log(e);
//       }
//     } catch (err: any) {
//       toast.dismiss();
//       const revertData = err?.cause?.data || err?.data;
//       if (revertData) {
//         try {
//           const decoded = decodeErrorResult({ abi: ABI, data: revertData });
//           if (decoded.errorName === "ClaimTooSoon")
//             toast.error("⏱️ You can only claim once every 24 hours.");
//           else toast.error(`⚠️ Error: ${decoded.errorName}`);
//         } catch {
//           toast.error("❌ Claim failed.");
//         }
//       } else {
//         toast.error("❌ Claim failed: " + (err.shortMessage || "Unknown"));
//       }
//     }
//     setPending(false);
//   }, [
//     score,
//     isConnected,
//     isCorrectChain,
//     address,
//     sendTransactionAsync,
//     publicClient,
//     handleConnect,
//     handleSwitchChain,
//   ]);

//   // --- Initial Loading Spinner ---
//   if (!dataLoaded) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-zinc-950">
//         <div className="flex flex-col items-center gap-4">
//           <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
//           <p className="text-zinc-400 text-sm font-medium tracking-wide">
//             Retrieving performance data...
//           </p>
//         </div>
//       </div>
//     );
//   }

//   const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
//   const isPerfect = percentage === 100;
//   const isPassed = percentage > 0;

//   return (
//     <div className="relative min-h-screen flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300 overflow-hidden">
      
//       {/* Ambient Background Effects */}
//       <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
//       <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

//       <motion.div
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.6, ease: "easeOut" }}
//         className="relative z-10 w-full max-w-lg"
//       >
//         {/* Glass Card Container */}
//         <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-3xl shadow-2xl p-8 overflow-hidden">
          
//           {/* Header Section */}
//           <div className="flex flex-col items-center gap-3 mb-8">
//             <div className="flex items-center gap-2">
//               <span className="text-sm font-semibold tracking-wider text-indigo-500 dark:text-indigo-400 uppercase">
//                 Performance Report
//               </span>
//               {/* Badge for Logic Source */}
//               {!searchParams.get("score") && totalQuestions > 0 && (
//                 <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-zinc-200 dark:border-zinc-700">
//                   <FaHistory className="text-[9px]" /> HISTORICAL
//                 </span>
//               )}
//             </div>
            
//             <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight text-center">
//               Claim Rewards
//             </h1>
//           </div>

//           {/* Main Content Area */}
//           <div className="space-y-8">
            
//             {/* Score Display */}
//             {totalQuestions > 0 ? (
//               <div className="relative group">
//                 <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl blur-lg transition-opacity duration-500 opacity-50 group-hover:opacity-100" />
//                 <div className="relative bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center">
//                   <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">
//                     Total Score
//                   </p>
//                   <div className="flex items-baseline justify-center gap-2">
//                     <span className="text-5xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
//                       {score}
//                     </span>
//                     <span className="text-xl text-zinc-400 font-medium">
//                       / {totalQuestions}
//                     </span>
//                   </div>
                  
//                   {/* Status Indicator */}
//                   <div className="mt-4 flex justify-center">
//                     {score === 0 ? (
//                       <span className="inline-flex items-center gap-1.5 text-rose-500 text-sm font-medium bg-rose-500/10 px-3 py-1 rounded-full">
//                         <FaTimesCircle /> No Answers
//                       </span>
//                     ) : (
//                       <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${isPerfect ? 'text-emerald-500 bg-emerald-500/10' : 'text-indigo-500 bg-indigo-500/10'}`}>
//                         <FaCheckCircle /> {isPerfect ? 'Perfect Score' : 'Completed'}
//                       </span>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             ) : (
//                <div className="p-8 text-center bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
//                  <p className="text-zinc-500">No quiz data found.</p>
//                </div>
//             )}

//             {/* Action Area */}
//             {score === 0 && totalQuestions > 0 ? (
//               <div className="text-center px-4">
//                 <p className="text-zinc-500 dark:text-zinc-400">
//                   You need at least one correct answer to earn CELO rewards.
//                 </p>
//               </div>
//             ) : (
//               <div className="space-y-4">
                
//                 {/* Reward Preview */}
//                 <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50">
//                    <span className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">Reward Value</span>
//                    <span className="text-zinc-900 dark:text-yellow-400 font-bold font-mono">
//                      {getRewardForScore(score)} CELO
//                    </span>
//                 </div>

//                 {/* Main Action Buttons */}
//                 {!isConnected ? (
//                   <button
//                     onClick={handleConnect}
//                     className="w-full py-3.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-semibold rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
//                   >
//                     <FaWallet /> Connect Wallet
//                   </button>
//                 ) : !isCorrectChain ? (
//                   <button
//                     onClick={handleSwitchChain}
//                     className="w-full py-3.5 px-4 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl shadow-lg shadow-rose-500/20 transition-all duration-200"
//                   >
//                     Switch to Celo Network
//                   </button>
//                 ) : claimCooldown > 0 ? (
//                   <div className="w-full py-3.5 px-4 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
//                     <FaClock className="animate-pulse" />
//                     <span className="font-mono font-medium">Cooldown: {formatTime(claimCooldown)}</span>
//                   </div>
//                 ) : (
//                   <button
//                     onClick={claimReward}
//                     disabled={isPending || score === 0}
//                     className={`
//                       w-full py-3.5 px-4 rounded-xl font-bold shadow-xl flex items-center justify-center gap-2
//                       transition-all duration-300 transform active:scale-[0.98]
//                       ${score === 0 
//                         ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' 
//                         : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25'
//                       }
//                     `}
//                   >
//                     {isPending ? (
//                       <span className="flex items-center gap-2">
//                         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//                         Processing...
//                       </span>
//                     ) : (
//                       "Claim Reward"
//                     )}
//                   </button>
//                 )}
//               </div>
//             )}
//           </div>

//           {/* Footer / Secondary Action */}
//           <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-white/5 flex justify-center">
//             <button
//               onClick={() => router.push("/quiz")}
//               className="group flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200 font-medium text-sm"
//             >
//               <span className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
//                  <FaRedoAlt className="text-xs group-hover:rotate-180 transition-transform duration-500" />
//               </span>
//               {totalQuestions > 0 ? "Play Again" : "Start New Quiz"}
//             </button>
//           </div>

//         </div>
//       </motion.div>
//     </div>
//   );
// }




// "use client";

// import { useEffect, useState, useCallback } from "react";
// import { motion } from "framer-motion";
// import { decodeErrorResult, encodeFunctionData } from "viem";
// import {
//   FaCheckCircle,
//   FaTimesCircle,
//   FaRedoAlt,
// } from "react-icons/fa";
// import {
//   useAccount,
//   useConnect,
//   useSwitchChain,
//   useSendTransaction,
//   usePublicClient,
// } from "wagmi";
// import ScoreRewardArtifact from "@/lib/abi/ScoreReward.json";
// import { toast } from "sonner";
// import { useRouter, useSearchParams } from "next/navigation";
// import { getReferralTag, submitReferral } from "@divvi/referral-sdk";
// import { celo } from "wagmi/chains";

// const ABI = ScoreRewardArtifact.abi;
// const contractAddress = process.env
//   .NEXT_PUBLIC_SCORE_REWARD_ADDRESS as `0x${string}`;
// const CELO_CHAIN_ID = celo.id;

// export default function ClaimScreen() {
//   const router = useRouter();
//   const searchParams = useSearchParams();

//   // --- State to hold score data ---
//   const [score, setScore] = useState<number>(0);
//   const [totalQuestions, setTotalQuestions] = useState<number>(0);
//   const [dataLoaded, setDataLoaded] = useState(false);

//   // Wagmi hooks
//   const { connect, connectors } = useConnect();
//   const { sendTransactionAsync } = useSendTransaction();
//   const { address, isConnected, chain } = useAccount();
//   const { switchChain } = useSwitchChain();
//   const publicClient = usePublicClient();

//   // Claim specific state
//   const [lastClaimedAt, setLastClaimedAt] = useState<number | null>(null);
//   const [claimCooldown, setClaimCooldown] = useState<number>(0);
//   const [isPending, setPending] = useState(false);

//   const isCorrectChain = chain?.id === CELO_CHAIN_ID;
//   const maxReward = 0.00001;

//   // --- 1. LOAD SCORE LOGIC ---
//   useEffect(() => {
//     const scoreParam = searchParams.get("score");
//     const totalParam = searchParams.get("total");

//     if (scoreParam && totalParam) {
//       // Priority A: Data passed via URL (Fresh game)
//       setScore(parseInt(scoreParam));
//       setTotalQuestions(parseInt(totalParam));
//       setDataLoaded(true);
//     } else {
//       // Priority B: Data from Local Storage (Returning visitor)
//       try {
//         const storedHistory = localStorage.getItem("quizHistory");
//         if (storedHistory) {
//           const parsed = JSON.parse(storedHistory);
//           if (Array.isArray(parsed) && parsed.length > 0) {
//             // Get the most recent game
//             const lastGame = parsed[parsed.length - 1]; 
//             setScore(lastGame.score || 0);
//             setTotalQuestions(lastGame.totalQuestions || 0);
//           }
//         }
//       } catch (error) {
//         console.error("Error reading local storage", error);
//       } finally {
//         setDataLoaded(true);
//       }
//     }
//   }, [searchParams]);

//   // --- Helper to calculate reward ---
//   const getRewardForScore = (s: number) => {
//     if (s <= 0) return 0;
//     return parseFloat((maxReward * (s / 10)).toFixed(8));
//   };

//   // --- Wallet Connection ---
//   const handleConnect = useCallback(async () => {
//     try {
//       let connector =
//         connectors.find((c) => c.id === "injected") ||
//         connectors.find((c) => c.name?.toLowerCase().includes("metamask")) ||
//         connectors[0];

//       await connect({ connector, chainId: CELO_CHAIN_ID });
//       toast.success("🔗 Connected to Celo!");
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to connect wallet.");
//     }
//   }, [connect, connectors]);

//   const handleSwitchChain = useCallback(async () => {
//     try {
//       await switchChain({ chainId: CELO_CHAIN_ID });
//       toast.success("🌐 Switched to Celo!");
//     } catch (err) {
//       console.error("Chain switch failed:", err);
//       toast.error("Unable to switch network. Please switch manually.");
//     }
//   }, [switchChain]);

//   // --- Fetch Cooldown Logic ---
//   const fetchLastClaimedAt = useCallback(async () => {
//     if (!address || !isCorrectChain || !publicClient) return;
//     try {
//       const result = await publicClient.readContract({
//         address: contractAddress,
//         abi: ABI,
//         functionName: "lastClaimedAt",
//         args: [address],
//       });
//       const timestamp = Number(result);
//       setLastClaimedAt(timestamp);
//       const now = Math.floor(Date.now() / 1000);
//       const cooldownSeconds = 24 * 60 * 60;
//       const remaining = timestamp + cooldownSeconds - now;
//       setClaimCooldown(remaining > 0 ? remaining : 0);
//     } catch (err) {
//       console.error("Failed to fetch lastClaimedAt:", err);
//     }
//   }, [address, isCorrectChain, publicClient]);

//   useEffect(() => {
//     if (address && isCorrectChain) fetchLastClaimedAt();
//   }, [address, isCorrectChain, fetchLastClaimedAt]);

//   useEffect(() => {
//     if (claimCooldown <= 0) return;
//     const interval = setInterval(() => {
//       setClaimCooldown((prev) => {
//         if (prev <= 1) {
//           clearInterval(interval);
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);
//     return () => clearInterval(interval);
//   }, [claimCooldown]);

//   const formatTime = (seconds: number) => {
//     const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
//     const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
//     const s = (seconds % 60).toString().padStart(2, "0");
//     return `${h}:${m}:${s}`;
//   };

//   // --- Claim Transaction ---
//   const claimReward = useCallback(async () => {
//     setPending(true);
//     if (score <= 0) {
//       toast.error("⚠️ You must score more than 0 to claim.");
//       setPending(false);
//       return;
//     }
//     if (!isConnected) {
//       await handleConnect();
//       setPending(false);
//       return;
//     }
//     if (!isCorrectChain) {
//       await handleSwitchChain();
//       setPending(false);
//       return;
//     }

//     try {
//       const consumer = "0x876E807dfe068145CAFF46F7C77df10e5ae8E308";
//       const providers = [
//         "0x0423189886d7966f0dd7e7d256898daeee625dca",
//         "0xc95876688026be9d6fa7a7c33328bd013effa2bb",
//         "0x7beb0e14f8d2e6f6678cc30d867787b384b19e20",
//       ] as const;

//       const encoded = encodeFunctionData({
//         abi: ABI,
//         functionName: "claimReward",
//         args: [score],
//       });

//       const tag = await getReferralTag({ user: address!, consumer, providers });
//       const txData = encoded + tag;

//       const txHash = await sendTransactionAsync({
//         account: address!,
//         to: contractAddress,
//         data: txData as `0x${string}`,
//       });

//       toast.loading("⏳ Waiting for confirmation...");
//       const receipt = await publicClient?.waitForTransactionReceipt({ hash: txHash });
//       toast.dismiss();

//       if (receipt?.status === "reverted") {
//         toast.error("❌ Transaction reverted.");
//         setPending(false);
//         return;
//       }

//       setLastClaimedAt(Math.floor(Date.now() / 1000));
//       setClaimCooldown(24 * 60 * 60);
//       toast.success("🎉 Reward claimed successfully!");

//       try {
//         if (txHash) await submitReferral({ txHash, chainId: CELO_CHAIN_ID });
//       } catch (e) { console.log(e); }

//     } catch (err: any) {
//       toast.dismiss();
//       const revertData = err?.cause?.data || err?.data;
//       if (revertData) {
//         try {
//           const decoded = decodeErrorResult({ abi: ABI, data: revertData });
//           if(decoded.errorName === "ClaimTooSoon") toast.error("⏱️ You can only claim once every 24 hours.");
//           else toast.error(`⚠️ Error: ${decoded.errorName}`);
//         } catch { toast.error("❌ Claim failed."); }
//       } else {
//         toast.error("❌ Claim failed: " + (err.shortMessage || "Unknown"));
//       }
//     }
//     setPending(false);
//   }, [score, isConnected, isCorrectChain, address, sendTransactionAsync, publicClient, handleConnect, handleSwitchChain]);

//   // --- Initial Loading Spinner ---
//   if (!dataLoaded) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#17111F]">
//         <div className="animate-pulse text-purple-600 dark:text-purple-400 font-semibold">
//           Loading report...
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center p-6 bg-white dark:bg-[#17111F] transition-colors duration-300">
//       <motion.div
//         initial={{ opacity: 0, scale: 0.9 }}
//         animate={{ opacity: 1, scale: 1 }}
//         transition={{ duration: 0.5 }}
//         className="text-center space-y-6 w-full max-w-2xl"
//       >
//         <motion.div
//           className="rounded-2xl px-8 py-10 shadow-2xl space-y-8 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 dark:from-[#E6E6FA] dark:via-[#d5d5f5] dark:to-[#c2c2ef] text-gray-100 dark:text-[#17111F]"
//         >
//           <div className="flex flex-col items-center gap-2">
//             <h2 className="text-xl font-extrabold tracking-tight">Performance Report</h2>
//             {/* Show 'Last Result' text only if we pulled from storage and not params */}
//             {!searchParams.get("score") && totalQuestions > 0 && (
//                <span className="text-xs uppercase tracking-widest bg-black/20 dark:bg-white/30 px-2 py-1 rounded">Last Quiz Result</span>
//             )}
//           </div>

//           <div className="text-center">
//             {totalQuestions > 0 ? (
//                 <p className="text-xl text-gray-300 dark:text-gray-700">
//                 You scored <span className="font-bold text-2xl text-white dark:text-[#17111F]">{score} / {totalQuestions}</span>
//                 </p>
//             ) : (
//                 <p className="text-xl text-gray-300 dark:text-gray-700">
//                     No recent quiz history found.
//                 </p>
//             )}
//           </div>

//           {score === 0 && totalQuestions > 0 ? (
//             <div className="flex flex-col items-center text-red-400 dark:text-red-600 gap-2 mt-4">
//               <FaTimesCircle className="text-4xl" />
//               <p className="text-lg font-medium">No correct answers 😢</p>
//             </div>
//           ) : (
//             <div className="flex flex-col items-center gap-4">
//               {score > 0 && <FaCheckCircle className="text-green-400 dark:text-green-700 text-4xl" />}
              
//               {claimCooldown > 0 ? (
//                 <div className="flex flex-col items-center gap-2 text-sm sm:text-base text-center text-yellow-100 dark:text-yellow-900 bg-yellow-900/40 dark:bg-yellow-200/40 border border-yellow-600 rounded-xl p-4 w-full max-w-md shadow-lg">
//                   <p className="font-semibold">Daily CELO already claimed!</p>
//                 </div>
//               ) : (
//                 score > 0 && (
//                     <div className="text-lg text-gray-300 dark:text-gray-800">
//                     🎉 Reward Available: <span className="font-bold text-white dark:text-[#17111F]">{getRewardForScore(score)} CELO</span>
//                     </div>
//                 )
//               )}

//               {/* Action Buttons */}
//               {!isConnected ? (
//                 <button onClick={handleConnect} className="bg-yellow-800 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold shadow">
//                   Connect Wallet to claim
//                 </button>
//               ) : !isCorrectChain ? (
//                 <button onClick={handleSwitchChain} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold shadow">
//                   🌐 Switch to Celo to claim
//                 </button>
//               ) : claimCooldown > 0 ? (
//                 <button disabled className="bg-gray-500 text-white px-4 py-2 rounded-xl font-semibold shadow-inner cursor-not-allowed opacity-80 animate-pulse">
//                   Claim again in {formatTime(claimCooldown)}
//                 </button>
//               ) : (
//                 <button onClick={claimReward} disabled={isPending || score === 0} className={`text-white px-4 py-2 rounded-lg font-semibold tracking-wide shadow-lg transition-all duration-200 ${score === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-farcaster to-farcaster/80 hover:opacity-90'}`}>
//                   {isPending ? "Claiming..." : "Claim Your Reward"}
//                 </button>
//               )}
//             </div>
//           )}

//           <div className="text-center cursor-pointer">
//             <button onClick={() => router.push("/quiz")} className="inline-flex items-center gap-2 bg-gray-800 dark:bg-gray-300 hover:bg-gray-700 dark:hover:bg-gray-200 text-white dark:text-[#17111F] font-semibold px-5 py-2 rounded-full shadow transition-all duration-200">
//               <FaRedoAlt />
//               {totalQuestions > 0 ? "Play Again" : "Play Quiz"}
//             </button>
//           </div>
//         </motion.div>
//       </motion.div>
//     </div>
//   );
// }




// "use client";

// import { useEffect, useState, useCallback } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { toast } from "sonner";
// import {
//   useAccount,
//   useConnect,
//   useSwitchChain,
//   useSendTransaction,
//   usePublicClient,
// } from "wagmi";
// import { getReferralTag } from "@divvi/referral-sdk";
// import { encodeFunctionData } from "viem";
// import { Wallet, Trophy, Clock, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

// import ScoreRewardArtifact from "@/lib/abi/ScoreReward.json";
// import { celo } from "wagmi/chains";

// const ABI = ScoreRewardArtifact.abi;
// const contractAddress = process.env.NEXT_PUBLIC_SCORE_REWARD_ADDRESS as `0x${string}`;
// const CELO_CHAIN_ID = celo.id;

// export default function ClaimRewardPage() {
//   // --- LOGIC SECTION (Unchanged functionality) ---
//   const { connect, connectors } = useConnect();
//   const { address, isConnected, chain } = useAccount();
//   const { switchChain } = useSwitchChain();
//   const { sendTransactionAsync } = useSendTransaction();
//   const publicClient = usePublicClient();

//   const [lastScore, setLastScore] = useState<number | null>(null);
//   const [lastClaimedAt, setLastClaimedAt] = useState<number | null>(null);
//   const [claimCooldown, setClaimCooldown] = useState<number>(0);
//   const [isPending, setPending] = useState(false);

//   const isMiniPay = typeof window !== "undefined" && (window as any).minipay;
//   const isCorrectChain = chain?.id === CELO_CHAIN_ID;

//   useEffect(() => {
//     const stored = localStorage.getItem("lastQuizScore");
//     if (stored) setLastScore(Number(stored));
//   }, []);

//   useEffect(() => {
//     if (isMiniPay && !isConnected) {
//       connect({ connector: connectors[0], chainId: CELO_CHAIN_ID });
//     }
//   }, [isMiniPay, isConnected]);

//   const handleConnect = useCallback(async () => {
//     try {
//       let connector =
//         connectors.find((c) => c.id === "injected") ||
//         connectors.find((c) => c.name?.toLowerCase().includes("metamask")) ||
//         connectors[0];
//       await connect({ connector, chainId: CELO_CHAIN_ID });
//       toast.success("Wallet Connected");
//     } catch (err) {
//       toast.error("Failed to connect wallet.");
//     }
//   }, [connect, connectors]);

//   const handleSwitchChain = useCallback(async () => {
//     try {
//       await switchChain({ chainId: CELO_CHAIN_ID });
//       toast.success("Switched to Celo");
//     } catch (err) {
//       toast.error("Unable to switch network.");
//     }
//   }, [switchChain]);

//   const fetchLastClaimedAt = useCallback(async () => {
//     if (!address || !isCorrectChain) return;
//     try {
//       const result = await publicClient.readContract({
//         address: contractAddress,
//         abi: ABI,
//         functionName: "lastClaimedAt",
//         args: [address],
//       });
//       const timestamp = Number(result);
//       setLastClaimedAt(timestamp);
//       const now = Math.floor(Date.now() / 1000);
//       const remaining = timestamp + 86400 - now;
//       setClaimCooldown(remaining > 0 ? remaining : 0);
//     } catch (err) {
//       console.error("Failed to fetch cooldown");
//     }
//   }, [address, isCorrectChain]);

//   useEffect(() => {
//     fetchLastClaimedAt();
//   }, [address, isCorrectChain]);

//   useEffect(() => {
//     if (claimCooldown <= 0) return;
//     const interval = setInterval(() => {
//       setClaimCooldown((prev) => {
//         if (prev <= 1) {
//           clearInterval(interval);
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);
//     return () => clearInterval(interval);
//   }, [claimCooldown]);

//   const formatTime = (seconds: number) => {
//     const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
//     const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
//     const s = String(seconds % 60).padStart(2, "0");
//     return `${h}:${m}:${s}`;
//   };

//   const claimReward = useCallback(async () => {
//     if (!lastScore || lastScore <= 0) {
//       toast.error("Play a quiz and score > 0 first.");
//       return;
//     }
//     setPending(true);

//     if (!isConnected) {
//       toast.info("Connecting wallet...");
//       await handleConnect();
//       setPending(false);
//       return;
//     }

//     if (!isCorrectChain) {
//       toast.error("Please switch to CELO network.");
//       await handleSwitchChain();
//       setPending(false);
//       return;
//     }

//     try {
//       const consumer = "0x876E807dfe068145CAFF46F7C77df10e5ae8E308";
//       const providers: any = [
//         "0x0423189886d7966f0dd7e7d256898daeee625dca",
//         "0xc95876688026be9d6fa7a7c33328bd013effa2bb",
//         "0x7beb0e14f8d2e6f6678cc30d867787b384b19e20",
//       ];

//       const encoded = encodeFunctionData({
//         abi: ABI,
//         functionName: "claimReward",
//         args: [lastScore],
//       });

//       const tag = await getReferralTag({ user: address!, consumer, providers });
//       const txData = encoded + tag;

//       const txHash = await sendTransactionAsync({
//         account: address!,
//         to: contractAddress,
//         data: txData as `0x${string}`,
//       });

//       toast.loading("Waiting for confirmation...");
//       const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
//       toast.dismiss();

//       if (receipt.status === "reverted") {
//         toast.error("Transaction reverted.");
//         setPending(false);
//         return;
//       }

//       toast.success("Reward claimed successfully!");
//       const now = Math.floor(Date.now() / 1000);
//       setLastClaimedAt(now);
//       setClaimCooldown(86400);
//     } catch (err: any) {
//       toast.dismiss();
//       toast.error("Claim failed.");
//     }
//     setPending(false);
//   }, [lastScore, isConnected, isCorrectChain, address, sendTransactionAsync]);


//   // --- UI HELPER: Calculate potential reward display ---
//   const maxReward = 0.00001; // Based on your logic
//   const estimatedReward = lastScore ? (maxReward * (lastScore / 10)).toFixed(6) : "0.000000";

//   return (
//     <div className="min-h-screen flex items-center justify-center p-6 bg-[#F5F5F7] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors duration-300 font-sans">
      
//       {/* Background Accents */}
//       <div className="fixed inset-0 overflow-hidden pointer-events-none">
//         <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
//         <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
//       </div>

//       <motion.div
//         initial={{ opacity: 0, scale: 0.95 }}
//         animate={{ opacity: 1, scale: 1 }}
//         transition={{ duration: 0.4, ease: "easeOut" }}
//         className="relative w-full max-w-md"
//       >
//         {/* Card Container */}
//         <div className="relative bg-white dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
          
//           {/* Header */}
//           <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
//             <div className="flex items-center gap-2">
//                <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
//                  <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
//                </div>
//                <h1 className="font-bold text-lg tracking-tight">Claim Rewards</h1>
//             </div>
//             <div className={`px-3 py-1 rounded-full text-xs font-medium border ${isConnected ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'}`}>
//               {isConnected ? 'Connected' : 'Disconnected'}
//             </div>
//           </div>

//           {/* Content Body */}
//           <div className="p-8 space-y-6">
            
//             {/* Status Cards */}
//             <div className="grid grid-cols-2 gap-4">
//               {/* Score Card */}
//               <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 flex flex-col items-center justify-center gap-1">
//                 <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Last Score</span>
//                 <span className="text-3xl font-extrabold font-mono tracking-tight">
//                   {lastScore ?? "0"}<span className="text-lg text-zinc-400">/10</span>
//                 </span>
//               </div>

//               {/* Est. Reward Card */}
//               <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 flex flex-col items-center justify-center gap-1">
//                 <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Rewards</span>
//                 <div className="flex items-baseline gap-1">
//                   <span className="text-xl font-bold font-mono text-green-600 dark:text-green-400">{estimatedReward}</span>
//                   <span className="text-[10px] font-bold text-zinc-400">CELO</span>
//                 </div>
//               </div>
//             </div>

//             {/* Cooldown Notification */}
//             <AnimatePresence>
//               {claimCooldown > 0 && (
//                 <motion.div 
//                   initial={{ opacity: 0, height: 0 }}
//                   animate={{ opacity: 1, height: 'auto' }}
//                   exit={{ opacity: 0, height: 0 }}
//                   className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start gap-3"
//                 >
//                   <Clock className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
//                   <div>
//                     <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400">Cooldown Active</h3>
//                     <p className="text-xs text-orange-600/80 dark:text-orange-400/70 mt-1">
//                       You can claim your next reward in <span className="font-mono font-bold">{formatTime(claimCooldown)}</span>
//                     </p>
//                   </div>
//                 </motion.div>
//               )}
//             </AnimatePresence>

//             {/* Wallet / Network Warning */}
//             {!isCorrectChain && isConnected && (
//                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 text-sm text-red-600 dark:text-red-400">
//                  <AlertCircle className="w-4 h-4" />
//                  <span>Wrong Network. Switch to Celo.</span>
//                </div>
//             )}

//             {/* Action Button */}
//             <div className="pt-2">
//               {lastScore && lastScore > 0 ? (
//                  <button
//                  onClick={claimReward}
//                  disabled={isPending || claimCooldown > 0}
//                  className={`
//                    relative w-full group overflow-hidden rounded-xl py-4 px-6 font-semibold text-sm transition-all duration-200
//                    disabled:opacity-50 disabled:cursor-not-allowed
//                    ${claimCooldown > 0 
//                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700'
//                      : 'bg-zinc-900 dark:bg-white text-white dark:text-black hover:shadow-lg hover:shadow-purple-500/20'
//                    }
//                  `}
//                >
//                  <span className="relative z-10 flex items-center justify-center gap-2">
//                    {isPending ? (
//                      <>
//                        <Loader2 className="w-4 h-4 animate-spin" /> Processing
//                      </>
//                    ) : claimCooldown > 0 ? (
//                      "Come back tomorrow"
//                    ) : (
//                      <>
//                        Claim to Wallet <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
//                      </>
//                    )}
//                  </span>
//                </button>
//               ) : (
//                 <div className="text-center p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
//                   <p className="text-sm text-zinc-500">No recent score found.</p>
//                   <p className="text-xs text-zinc-400 mt-1">Play the quiz to activate rewards.</p>
//                 </div>
//               )}
             
//             </div>
//           </div>

//           {/* Footer Info */}
//           <div className="px-8 py-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
//             <div className="flex items-center gap-1.5">
//               <Wallet className="w-3 h-3" />
//               <span className="font-mono opacity-70">
//                 {address ? `${address.slice(0,6)}...${address.slice(-4)}` : "Not Connected"}
//               </span>
//             </div>
//             <div className="flex items-center gap-1">
//                {isCorrectChain && <CheckCircle2 className="w-3 h-3 text-green-500" />}
//                <span>Celo Network</span>
//             </div>
//           </div>
          
//         </div>
//       </motion.div>
//     </div>
//   );
// }





// // "use client";

// // import { useEffect, useState, useCallback } from "react";
// // import { motion } from "framer-motion";
// // import { toast } from "sonner";
// // import {
// //   useAccount,
// //   useConnect,
// //   useSwitchChain,
// //   useSendTransaction,
// //   usePublicClient,
// // } from "wagmi";
// // import { getReferralTag, submitReferral } from "@divvi/referral-sdk";
// // import { decodeErrorResult, encodeFunctionData } from "viem";

// // import ScoreRewardArtifact from "@/lib/abi/ScoreReward.json";
// // import { celo } from "wagmi/chains";

// // const ABI = ScoreRewardArtifact.abi;
// // const contractAddress = process.env
// //   .NEXT_PUBLIC_SCORE_REWARD_ADDRESS as `0x${string}`;

// // const CELO_CHAIN_ID = celo.id;

// // export default function ClaimRewardPage() {
// //   const { connect, connectors } = useConnect();
// //   const { address, isConnected, chain } = useAccount();
// //   const { switchChain } = useSwitchChain();
// //   const { sendTransactionAsync } = useSendTransaction();
// //   const publicClient = usePublicClient();

// //   const [lastScore, setLastScore] = useState<number | null>(null);
// //   const [lastClaimedAt, setLastClaimedAt] = useState<number | null>(null);
// //   const [claimCooldown, setClaimCooldown] = useState<number>(0);
// //   const [isPending, setPending] = useState(false);

// //   const isMiniPay =
// //     typeof window !== "undefined" && (window as any).minipay;
// //   const isCorrectChain = chain?.id === CELO_CHAIN_ID;

// //   /* -------------------------------------------------------
// //      Load last played score from localStorage
// //   ------------------------------------------------------- */
// //   useEffect(() => {
// //     const stored = localStorage.getItem("lastQuizScore");
// //     if (stored) setLastScore(Number(stored));
// //   }, []);

// //   /* -------------------------------------------------------
// //      Auto-connect for MiniPay
// //   ------------------------------------------------------- */
// //   useEffect(() => {
// //     if (isMiniPay && !isConnected) {
// //       connect({ connector: connectors[0], chainId: CELO_CHAIN_ID });
// //     }
// //   }, [isMiniPay, isConnected]);

// //   /* -------------------------------------------------------
// //      Connect Wallet
// //   ------------------------------------------------------- */
// //   const handleConnect = useCallback(async () => {
// //     try {
// //       let connector =
// //         connectors.find((c) => c.id === "injected") ||
// //         connectors.find((c) => c.name?.toLowerCase().includes("metamask")) ||
// //         connectors[0];

// //       await connect({ connector, chainId: CELO_CHAIN_ID });
// //       toast.success("🔗 Wallet Connected");
// //     } catch (err) {
// //       toast.error("Failed to connect wallet.");
// //     }
// //   }, [connect, connectors]);

// //   /* -------------------------------------------------------
// //      Switch to CELO
// //   ------------------------------------------------------- */
// //   const handleSwitchChain = useCallback(async () => {
// //     try {
// //       await switchChain({ chainId: CELO_CHAIN_ID });
// //       toast.success("🌐 Switched to Celo");
// //     } catch (err) {
// //       toast.error("Unable to switch network.");
// //     }
// //   }, [switchChain]);

// //   /* -------------------------------------------------------
// //      Fetch lastClaimedAt from contract
// //   ------------------------------------------------------- */
// //   const fetchLastClaimedAt = useCallback(async () => {
// //     if (!address || !isCorrectChain) return;

// //     try {
// //       const result = await publicClient.readContract({
// //         address: contractAddress,
// //         abi: ABI,
// //         functionName: "lastClaimedAt",
// //         args: [address],
// //       });

// //       const timestamp = Number(result);
// //       setLastClaimedAt(timestamp);

// //       const now = Math.floor(Date.now() / 1000);
// //       const remaining = timestamp + 86400 - now;

// //       setClaimCooldown(remaining > 0 ? remaining : 0);
// //     } catch (err) {
// //       console.error("Failed to fetch cooldown");
// //     }
// //   }, [address, isCorrectChain]);

// //   useEffect(() => {
// //     fetchLastClaimedAt();
// //   }, [address, isCorrectChain]);

// //   useEffect(() => {
// //     if (claimCooldown <= 0) return;

// //     const interval = setInterval(() => {
// //       setClaimCooldown((prev) => {
// //         if (prev <= 1) {
// //           clearInterval(interval);
// //           return 0;
// //         }
// //         return prev - 1;
// //       });
// //     }, 1000);

// //     return () => clearInterval(interval);
// //   }, [claimCooldown]);

// //   const formatTime = (seconds: number) => {
// //     const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
// //     const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
// //     const s = String(seconds % 60).padStart(2, "0");
// //     return `${h}:${m}:${s}`;
// //   };

// //   /* -------------------------------------------------------
// //      Claim Reward Logic (EXACTLY SAME AS YOUR QUIZ)
// //   ------------------------------------------------------- */
// //   const claimReward = useCallback(async () => {
// //     if (!lastScore || lastScore <= 0) {
// //       toast.error("Play a quiz and score > 0 first.");
// //       return;
// //     }

// //     setPending(true);

// //     if (!isConnected) {
// //       toast.info("Connecting wallet...");
// //       await handleConnect();
// //       setPending(false);
// //       return;
// //     }

// //     if (!isCorrectChain) {
// //       toast.error("Please switch to CELO network.");
// //       await handleSwitchChain();
// //       setPending(false);
// //       return;
// //     }

// //     let txHash: `0x${string}` | null = null;

// //     try {
// //       const consumer = "0x876E807dfe068145CAFF46F7C77df10e5ae8E308";
// //       const providers:any = [
// //         "0x0423189886d7966f0dd7e7d256898daeee625dca",
// //         "0xc95876688026be9d6fa7a7c33328bd013effa2bb",
// //         "0x7beb0e14f8d2e6f6678cc30d867787b384b19e20",
// //       ];

// //       const encoded = encodeFunctionData({
// //         abi: ABI,
// //         functionName: "claimReward",
// //         args: [lastScore],
// //       });

// //       const tag = await getReferralTag({
// //         user: address!,
// //         consumer,
// //         providers,
// //       });

// //       const txData = encoded + tag;

// //       txHash = await sendTransactionAsync({
// //         account: address!,
// //         to: contractAddress,
// //         data: txData as `0x${string}`,
// //       });

// //       toast.loading("⏳ Waiting for confirmation...");

// //       const receipt = await publicClient.waitForTransactionReceipt({
// //         hash: txHash,
// //       });

// //       toast.dismiss();

// //       if (receipt.status === "reverted") {
// //         toast.error("Transaction reverted.");
// //         setPending(false);
// //         return;
// //       }

// //       toast.success("🎉 Reward claimed!");

// //       const now = Math.floor(Date.now() / 1000);
// //       setLastClaimedAt(now);
// //       setClaimCooldown(86400);
// //     } catch (err: any) {
// //       toast.dismiss();
// //       toast.error("Claim failed.");
// //     }

// //     setPending(false);
// //   }, [
// //     lastScore,
// //     isConnected,
// //     isCorrectChain,
// //     address,
// //     sendTransactionAsync,
// //   ]);

// //   /* -------------------------------------------------------
// //      UI: BEAUTIFUL CARD
// //   ------------------------------------------------------- */

// //   return (
// //     <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-white dark:bg-[#17111F]">
// //       <motion.div
// //         initial={{ opacity: 0, y: 25 }}
// //         animate={{ opacity: 1, y: 0 }}
// //         className="w-full max-w-lg rounded-3xl p-10 shadow-2xl bg-gradient-to-br
// //         from-gray-900 via-gray-800 to-gray-700
// //         dark:from-[#E6E6FA] dark:via-[#dcdcf8] dark:to-[#c7c7ef]
// //         text-gray-100 dark:text-[#17111F]
// //         space-y-8"
// //       >
// //         <h1 className="text-2xl font-extrabold text-center">
// //           🎁 Claim Your Reward
// //         </h1>

// //         {/* If user never played */}
// //         {!lastScore && (
// //           <div className="text-center text-lg font-medium py-6">
// //             You have not played any quiz yet.
// //             <br />
// //             <span className="font-bold">Play a quiz to earn rewards!</span>
// //           </div>
// //         )}

// //         {/* Score display */}
// //         {lastScore !== null && (
// //           <div className="text-center">
// //             <p className="text-lg text-gray-300 dark:text-gray-700">
// //               Your last score:
// //             </p>
// //             <p className="text-4xl font-extrabold mt-1">
// //               {lastScore} / 10
// //             </p>
// //           </div>
// //         )}

// //         {/* Cooldown */}
// //         {claimCooldown > 0 && (
// //           <div className="text-center text-sm font-medium text-red-400 dark:text-red-600">
// //             ⏳ Claim again in: {formatTime(claimCooldown)}
// //           </div>
// //         )}

// //         {/* Claim Button */}
// //         <button
// //           disabled={
// //             isPending ||
// //             !lastScore ||
// //             lastScore <= 0 ||
// //             claimCooldown > 0
// //           }
// //           onClick={claimReward}
// //           className={`
// //           w-full py-4 rounded-xl font-bold text-lg transition-all shadow-md
// //           ${
// //             isPending || !lastScore || lastScore <= 0 || claimCooldown > 0
// //               ? "bg-gray-600 dark:bg-gray-300 text-gray-300 dark:text-gray-500 cursor-not-allowed"
// //               : "bg-[#17111F] dark:bg-[#E6E6FA] text-white dark:text-[#17111F] hover:scale-[1.02]"
// //           }
// //         `}
// //         >
// //           {isPending ? "Processing..." : "Claim Reward"}
// //         </button>

// //         <p className="text-center text-xs text-gray-400 dark:text-gray-600">
// //           Reward is based on your last quiz score.
// //         </p>
// //       </motion.div>
// //     </div>
// //   );
// // }

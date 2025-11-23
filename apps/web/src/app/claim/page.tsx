"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  useAccount,
  useConnect,
  useSwitchChain,
  useSendTransaction,
  usePublicClient,
} from "wagmi";
import { getReferralTag } from "@divvi/referral-sdk";
import { encodeFunctionData } from "viem";
import { Wallet, Trophy, Clock, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

import ScoreRewardArtifact from "@/lib/abi/ScoreReward.json";
import { celo } from "wagmi/chains";

const ABI = ScoreRewardArtifact.abi;
const contractAddress = process.env.NEXT_PUBLIC_SCORE_REWARD_ADDRESS as `0x${string}`;
const CELO_CHAIN_ID = celo.id;

export default function ClaimRewardPage() {
  // --- LOGIC SECTION (Unchanged functionality) ---
  const { connect, connectors } = useConnect();
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();

  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastClaimedAt, setLastClaimedAt] = useState<number | null>(null);
  const [claimCooldown, setClaimCooldown] = useState<number>(0);
  const [isPending, setPending] = useState(false);

  const isMiniPay = typeof window !== "undefined" && (window as any).minipay;
  const isCorrectChain = chain?.id === CELO_CHAIN_ID;

  useEffect(() => {
    const stored = localStorage.getItem("lastQuizScore");
    if (stored) setLastScore(Number(stored));
  }, []);

  useEffect(() => {
    if (isMiniPay && !isConnected) {
      connect({ connector: connectors[0], chainId: CELO_CHAIN_ID });
    }
  }, [isMiniPay, isConnected]);

  const handleConnect = useCallback(async () => {
    try {
      let connector =
        connectors.find((c) => c.id === "injected") ||
        connectors.find((c) => c.name?.toLowerCase().includes("metamask")) ||
        connectors[0];
      await connect({ connector, chainId: CELO_CHAIN_ID });
      toast.success("Wallet Connected");
    } catch (err) {
      toast.error("Failed to connect wallet.");
    }
  }, [connect, connectors]);

  const handleSwitchChain = useCallback(async () => {
    try {
      await switchChain({ chainId: CELO_CHAIN_ID });
      toast.success("Switched to Celo");
    } catch (err) {
      toast.error("Unable to switch network.");
    }
  }, [switchChain]);

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

    try {
      const consumer = "0x876E807dfe068145CAFF46F7C77df10e5ae8E308";
      const providers: any = [
        "0x0423189886d7966f0dd7e7d256898daeee625dca",
        "0xc95876688026be9d6fa7a7c33328bd013effa2bb",
        "0x7beb0e14f8d2e6f6678cc30d867787b384b19e20",
      ];

      const encoded = encodeFunctionData({
        abi: ABI,
        functionName: "claimReward",
        args: [lastScore],
      });

      const tag = await getReferralTag({ user: address!, consumer, providers });
      const txData = encoded + tag;

      const txHash = await sendTransactionAsync({
        account: address!,
        to: contractAddress,
        data: txData as `0x${string}`,
      });

      toast.loading("Waiting for confirmation...");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      toast.dismiss();

      if (receipt.status === "reverted") {
        toast.error("Transaction reverted.");
        setPending(false);
        return;
      }

      toast.success("Reward claimed successfully!");
      const now = Math.floor(Date.now() / 1000);
      setLastClaimedAt(now);
      setClaimCooldown(86400);
    } catch (err: any) {
      toast.dismiss();
      toast.error("Claim failed.");
    }
    setPending(false);
  }, [lastScore, isConnected, isCorrectChain, address, sendTransactionAsync]);


  // --- UI HELPER: Calculate potential reward display ---
  const maxReward = 0.00001; // Based on your logic
  const estimatedReward = lastScore ? (maxReward * (lastScore / 10)).toFixed(6) : "0.000000";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F5F5F7] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors duration-300 font-sans">
      
      {/* Background Accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        {/* Card Container */}
        <div className="relative bg-white dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
                 <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
               </div>
               <h1 className="font-bold text-lg tracking-tight">Claim Rewards</h1>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium border ${isConnected ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          {/* Content Body */}
          <div className="p-8 space-y-6">
            
            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Score Card */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 flex flex-col items-center justify-center gap-1">
                <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Last Score</span>
                <span className="text-3xl font-extrabold font-mono tracking-tight">
                  {lastScore ?? "0"}<span className="text-lg text-zinc-400">/10</span>
                </span>
              </div>

              {/* Est. Reward Card */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 flex flex-col items-center justify-center gap-1">
                <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Rewards</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold font-mono text-green-600 dark:text-green-400">{estimatedReward}</span>
                  <span className="text-[10px] font-bold text-zinc-400">CELO</span>
                </div>
              </div>
            </div>

            {/* Cooldown Notification */}
            <AnimatePresence>
              {claimCooldown > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start gap-3"
                >
                  <Clock className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400">Cooldown Active</h3>
                    <p className="text-xs text-orange-600/80 dark:text-orange-400/70 mt-1">
                      You can claim your next reward in <span className="font-mono font-bold">{formatTime(claimCooldown)}</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Wallet / Network Warning */}
            {!isCorrectChain && isConnected && (
               <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 text-sm text-red-600 dark:text-red-400">
                 <AlertCircle className="w-4 h-4" />
                 <span>Wrong Network. Switch to Celo.</span>
               </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              {lastScore && lastScore > 0 ? (
                 <button
                 onClick={claimReward}
                 disabled={isPending || claimCooldown > 0}
                 className={`
                   relative w-full group overflow-hidden rounded-xl py-4 px-6 font-semibold text-sm transition-all duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed
                   ${claimCooldown > 0 
                     ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                     : 'bg-zinc-900 dark:bg-white text-white dark:text-black hover:shadow-lg hover:shadow-purple-500/20'
                   }
                 `}
               >
                 <span className="relative z-10 flex items-center justify-center gap-2">
                   {isPending ? (
                     <>
                       <Loader2 className="w-4 h-4 animate-spin" /> Processing
                     </>
                   ) : claimCooldown > 0 ? (
                     "Come back tomorrow"
                   ) : (
                     <>
                       Claim to Wallet <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                     </>
                   )}
                 </span>
               </button>
              ) : (
                <div className="text-center p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
                  <p className="text-sm text-zinc-500">No recent score found.</p>
                  <p className="text-xs text-zinc-400 mt-1">Play the quiz to activate rewards.</p>
                </div>
              )}
             
            </div>
          </div>

          {/* Footer Info */}
          <div className="px-8 py-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-3 h-3" />
              <span className="font-mono opacity-70">
                {address ? `${address.slice(0,6)}...${address.slice(-4)}` : "Not Connected"}
              </span>
            </div>
            <div className="flex items-center gap-1">
               {isCorrectChain && <CheckCircle2 className="w-3 h-3 text-green-500" />}
               <span>Celo Network</span>
            </div>
          </div>
          
        </div>
      </motion.div>
    </div>
  );
}





// "use client";

// import { useEffect, useState, useCallback } from "react";
// import { motion } from "framer-motion";
// import { toast } from "sonner";
// import {
//   useAccount,
//   useConnect,
//   useSwitchChain,
//   useSendTransaction,
//   usePublicClient,
// } from "wagmi";
// import { getReferralTag, submitReferral } from "@divvi/referral-sdk";
// import { decodeErrorResult, encodeFunctionData } from "viem";

// import ScoreRewardArtifact from "@/lib/abi/ScoreReward.json";
// import { celo } from "wagmi/chains";

// const ABI = ScoreRewardArtifact.abi;
// const contractAddress = process.env
//   .NEXT_PUBLIC_SCORE_REWARD_ADDRESS as `0x${string}`;

// const CELO_CHAIN_ID = celo.id;

// export default function ClaimRewardPage() {
//   const { connect, connectors } = useConnect();
//   const { address, isConnected, chain } = useAccount();
//   const { switchChain } = useSwitchChain();
//   const { sendTransactionAsync } = useSendTransaction();
//   const publicClient = usePublicClient();

//   const [lastScore, setLastScore] = useState<number | null>(null);
//   const [lastClaimedAt, setLastClaimedAt] = useState<number | null>(null);
//   const [claimCooldown, setClaimCooldown] = useState<number>(0);
//   const [isPending, setPending] = useState(false);

//   const isMiniPay =
//     typeof window !== "undefined" && (window as any).minipay;
//   const isCorrectChain = chain?.id === CELO_CHAIN_ID;

//   /* -------------------------------------------------------
//      Load last played score from localStorage
//   ------------------------------------------------------- */
//   useEffect(() => {
//     const stored = localStorage.getItem("lastQuizScore");
//     if (stored) setLastScore(Number(stored));
//   }, []);

//   /* -------------------------------------------------------
//      Auto-connect for MiniPay
//   ------------------------------------------------------- */
//   useEffect(() => {
//     if (isMiniPay && !isConnected) {
//       connect({ connector: connectors[0], chainId: CELO_CHAIN_ID });
//     }
//   }, [isMiniPay, isConnected]);

//   /* -------------------------------------------------------
//      Connect Wallet
//   ------------------------------------------------------- */
//   const handleConnect = useCallback(async () => {
//     try {
//       let connector =
//         connectors.find((c) => c.id === "injected") ||
//         connectors.find((c) => c.name?.toLowerCase().includes("metamask")) ||
//         connectors[0];

//       await connect({ connector, chainId: CELO_CHAIN_ID });
//       toast.success("🔗 Wallet Connected");
//     } catch (err) {
//       toast.error("Failed to connect wallet.");
//     }
//   }, [connect, connectors]);

//   /* -------------------------------------------------------
//      Switch to CELO
//   ------------------------------------------------------- */
//   const handleSwitchChain = useCallback(async () => {
//     try {
//       await switchChain({ chainId: CELO_CHAIN_ID });
//       toast.success("🌐 Switched to Celo");
//     } catch (err) {
//       toast.error("Unable to switch network.");
//     }
//   }, [switchChain]);

//   /* -------------------------------------------------------
//      Fetch lastClaimedAt from contract
//   ------------------------------------------------------- */
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

//   /* -------------------------------------------------------
//      Claim Reward Logic (EXACTLY SAME AS YOUR QUIZ)
//   ------------------------------------------------------- */
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

//     let txHash: `0x${string}` | null = null;

//     try {
//       const consumer = "0x876E807dfe068145CAFF46F7C77df10e5ae8E308";
//       const providers:any = [
//         "0x0423189886d7966f0dd7e7d256898daeee625dca",
//         "0xc95876688026be9d6fa7a7c33328bd013effa2bb",
//         "0x7beb0e14f8d2e6f6678cc30d867787b384b19e20",
//       ];

//       const encoded = encodeFunctionData({
//         abi: ABI,
//         functionName: "claimReward",
//         args: [lastScore],
//       });

//       const tag = await getReferralTag({
//         user: address!,
//         consumer,
//         providers,
//       });

//       const txData = encoded + tag;

//       txHash = await sendTransactionAsync({
//         account: address!,
//         to: contractAddress,
//         data: txData as `0x${string}`,
//       });

//       toast.loading("⏳ Waiting for confirmation...");

//       const receipt = await publicClient.waitForTransactionReceipt({
//         hash: txHash,
//       });

//       toast.dismiss();

//       if (receipt.status === "reverted") {
//         toast.error("Transaction reverted.");
//         setPending(false);
//         return;
//       }

//       toast.success("🎉 Reward claimed!");

//       const now = Math.floor(Date.now() / 1000);
//       setLastClaimedAt(now);
//       setClaimCooldown(86400);
//     } catch (err: any) {
//       toast.dismiss();
//       toast.error("Claim failed.");
//     }

//     setPending(false);
//   }, [
//     lastScore,
//     isConnected,
//     isCorrectChain,
//     address,
//     sendTransactionAsync,
//   ]);

//   /* -------------------------------------------------------
//      UI: BEAUTIFUL CARD
//   ------------------------------------------------------- */

//   return (
//     <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-white dark:bg-[#17111F]">
//       <motion.div
//         initial={{ opacity: 0, y: 25 }}
//         animate={{ opacity: 1, y: 0 }}
//         className="w-full max-w-lg rounded-3xl p-10 shadow-2xl bg-gradient-to-br
//         from-gray-900 via-gray-800 to-gray-700
//         dark:from-[#E6E6FA] dark:via-[#dcdcf8] dark:to-[#c7c7ef]
//         text-gray-100 dark:text-[#17111F]
//         space-y-8"
//       >
//         <h1 className="text-2xl font-extrabold text-center">
//           🎁 Claim Your Reward
//         </h1>

//         {/* If user never played */}
//         {!lastScore && (
//           <div className="text-center text-lg font-medium py-6">
//             You have not played any quiz yet.
//             <br />
//             <span className="font-bold">Play a quiz to earn rewards!</span>
//           </div>
//         )}

//         {/* Score display */}
//         {lastScore !== null && (
//           <div className="text-center">
//             <p className="text-lg text-gray-300 dark:text-gray-700">
//               Your last score:
//             </p>
//             <p className="text-4xl font-extrabold mt-1">
//               {lastScore} / 10
//             </p>
//           </div>
//         )}

//         {/* Cooldown */}
//         {claimCooldown > 0 && (
//           <div className="text-center text-sm font-medium text-red-400 dark:text-red-600">
//             ⏳ Claim again in: {formatTime(claimCooldown)}
//           </div>
//         )}

//         {/* Claim Button */}
//         <button
//           disabled={
//             isPending ||
//             !lastScore ||
//             lastScore <= 0 ||
//             claimCooldown > 0
//           }
//           onClick={claimReward}
//           className={`
//           w-full py-4 rounded-xl font-bold text-lg transition-all shadow-md
//           ${
//             isPending || !lastScore || lastScore <= 0 || claimCooldown > 0
//               ? "bg-gray-600 dark:bg-gray-300 text-gray-300 dark:text-gray-500 cursor-not-allowed"
//               : "bg-[#17111F] dark:bg-[#E6E6FA] text-white dark:text-[#17111F] hover:scale-[1.02]"
//           }
//         `}
//         >
//           {isPending ? "Processing..." : "Claim Reward"}
//         </button>

//         <p className="text-center text-xs text-gray-400 dark:text-gray-600">
//           Reward is based on your last quiz score.
//         </p>
//       </motion.div>
//     </div>
//   );
// }

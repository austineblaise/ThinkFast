"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { decodeErrorResult, encodeFunctionData } from "viem";
import {
  FaCheckCircle,
  FaTimesCircle,

  FaRegLaughSquint,
  FaRedoAlt,
} from "react-icons/fa";
import {
  useAccount,
  useWriteContract,
  useConnect,
  useSwitchChain,
  useSendTransaction,
  usePublicClient,
} from "wagmi";
// import { celo } from "viem/chains";
import ScoreRewardArtifact from "@/lib/abi/ScoreReward.json";
import { allQuestions } from "@/app/quiz/data/questions";
import { toast } from "sonner";
import { config } from "@/lib/wagmi";
// import { getPublicClient } from "@wagmi/core";
// import { saveScoreToFirestore } from "@/lib/firestore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getReferralTag, submitReferral } from "@divvi/referral-sdk";
import { celo, celoAlfajores } from "wagmi/chains";

const ABI = ScoreRewardArtifact.abi;
const contractAddress = process.env
  .NEXT_PUBLIC_SCORE_REWARD_ADDRESS as `0x${string}`;
const CELO_CHAIN_ID = celo.id;

export default function QuizGame() {
  const { connect, connectors } = useConnect();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [noAnswer, setNoAnswer] = useState(false);
  const [questionFinished, setQuestionFinished] = useState(false);
  const [questions, setQuestions] = useState<typeof allQuestions>([]);
  const router = useRouter();
  const [hasAnswered, setHasAnswered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { sendTransactionAsync } = useSendTransaction();
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const [lastClaimedAt, setLastClaimedAt] = useState<number | null>(null);
  const [claimCooldown, setClaimCooldown] = useState<number>(0); // seconds remaining
  const publicClient = usePublicClient();
  const [isPending, setPending] = useState(false);
  const client = publicClient;
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  const fetchQuestions = async (category: string) => {
    const res = await fetch("/api/questions", {
      method: "POST",
      body: JSON.stringify({ category }),
    });

    const data = await res.json();
    return data.questions; // returns array
  };

  const isMiniPay = typeof window !== "undefined" && (window as any).minipay;



useEffect(() => {
  if (!showFeedback) return;

  if (noAnswer) {
    toast(
      `No answer selected. Correct answer: ${currentQuestion?.answer}`,
      // {
      //   icon: "⏰",
      // }
    );
  } else if (isCorrect) {
    toast.success("Correct! Nice job 🎉")
  } else {
    toast.error(`Incorrect. Correct answer: ${currentQuestion?.answer}`
    );
  }
}, [showFeedback]);



  useEffect(() => {
    if (isMiniPay && !isConnected) {
      connect({
        connector: connectors[0],
      });
    }
  }, [isMiniPay, isConnected]);

  const isCorrectChain = chain?.id === CELO_CHAIN_ID;

  const handleConnect = useCallback(async () => {
    try {
      let connector =
        connectors.find((c) => c.id === "injected") ||
        connectors.find((c) => c.name?.toLowerCase().includes("metamask")) ||
        connectors[0];

      await connect({
        connector,
        chainId: CELO_CHAIN_ID,
      });

      toast.success("🔗 Connected to Celo!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect wallet.");
    }
  }, [connect, connectors]);

  const handleSwitchChain = useCallback(async () => {
    try {
      await switchChain({
        chainId: CELO_CHAIN_ID, // can be celo.id or celoAlfajores.id // 42220 or // 44787
      });
      toast.success("🌐 Switched to Celo!");
    } catch (err) {
      console.error("Chain switch failed:", err);
      toast.error("Unable to switch network. Please switch manually.");
    }
  }, [switchChain]);

  const maxReward = 0.00001;

  const getRewardForScore = (score: number) => {
    if (score <= 0) return 0;
    return parseFloat((maxReward * (score / 10)).toFixed(8));
  };

  const claimReward = useCallback(async () => {
    setPending(true);

    if (!score || score <= 0) {
      toast.error("⚠️ You must score more than 0 to claim.");
      setPending(false);
      return;
    }

    if (!isConnected) {
      toast.info("🔌 Connecting wallet...");
      await handleConnect();
      setPending(false);
      return;
    }

    if (!isCorrectChain) {
      toast.error("🌐 Please switch to the Celo network.");
      await handleSwitchChain();
      setPending(false);
      return;
    }

    let txHash: `0x${string}` | null = null;

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

      txHash = await sendTransactionAsync({
        account: address!,
        to: contractAddress,
        data: txData as `0x${string}`,
      });

      toast.loading("⏳ Waiting for confirmation...");

      // const client = getPublicClient(config);
      const client = publicClient;

      const receipt = await client.waitForTransactionReceipt({ hash: txHash });

      toast.dismiss();

      if (receipt.status === "reverted") {
        toast.error("❌ Transaction reverted.");
        setPending(false);
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      setLastClaimedAt(now);
      setClaimCooldown(24 * 60 * 60);

      toast.success(
        <div>
          🎉 Reward claimed successfully!
          <br />
          <a
            href={`https://celoscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-300"
          >
            View on CeloScan ↗
          </a>
        </div>
      );
    } catch (err: any) {
      toast.dismiss();

      const revertData =
        err?.cause?.data ||
        err?.data ||
        err?.error?.data ||
        err?.error?.error?.data;

      if (revertData) {
        try {
          const decoded = decodeErrorResult({ abi: ABI, data: revertData });
          switch (decoded.errorName) {
            case "NotEnoughCelo":
              toast.error("⚠️ Not enough CELO in contract.");
              return;
            case "ClaimTooSoon":
              toast.error("⏱️ You can only claim once every 24 hours.");
              return;
            case "InvalidScore":
              toast.error("⚠️ Invalid score submitted.");
              return;
            default:
              toast.error(`⚠️ Unknown contract error: ${decoded.errorName}`);
              return;
          }
        } catch (decodeErr) {
          console.warn("❌ Failed to decode error:", decodeErr);
        }
      }

      const fallbackMessage =
        typeof err === "object" && "shortMessage" in err
          ? err.shortMessage
          : "Unknown error. Check console.";

      toast.error("❌ Claim failed: " + fallbackMessage);
      setPending(false);
      return;
    }

    // Submit Divvi referral (best-effort)
    try {
      if (txHash) {
        console.log("Submitting referral to Divi:", {
          txHash,
          chainId: CELO_CHAIN_ID,
        });
        await submitReferral({ txHash, chainId: CELO_CHAIN_ID });

        console.log("✅ Divvi referral submitted successfully.");
      }
    } catch (divviErr) {
      console.log("⚠️ Divvi referral submission failed:", divviErr);
      toast.info("Referral tracking failed but reward was still claimed.");
    }

    setPending(false);
  }, [
    score,
    isConnected,
    isCorrectChain,
    handleConnect,
    handleSwitchChain,
    address,
    sendTransactionAsync,
    config,
  ]);

  const currentQuestion = questions[step];
  const userAnswer = answers[step];

  useEffect(() => {
    if (score !== null || !currentQuestion) return;

    setTimeLeft(15);
    setNoAnswer(false);
    setQuestionFinished(false);
    setHasAnswered(false);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;

          if (answers[step] === undefined) {
            handleAnswer("");
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, currentQuestion]);

  useEffect(() => {
    if (!questionFinished) return;

    if (step + 1 === questions.length) {
      const correctCount = answers.filter(
        (ans, i) => ans === questions[i].answer
      ).length;
      setScore(correctCount);
    } else {
      setStep((prev) => prev + 1);
    }
  }, [questionFinished]);

  useEffect(() => {
    // Save score to Firestore after user has a score and hasn't claimed yet
    if (!score || !address || claimCooldown > 0) return;

    const fetchAndSave = async () => {
      try {
        // No Farcaster username available — save with address as identifier
        // await saveScoreToFirestore({
        //   username: address,
        //   address,
        //   score,
        //   profilePic: null,
        // });
      } catch (err) {
        console.error("Failed to save score to Firestore:", err);
      }
    };

    fetchAndSave();
  }, [address, score, claimCooldown]);

  const handleAnswer = (option: string) => {
    if (!currentQuestion || hasAnswered) return;
    setHasAnswered(true);

    if (timerRef.current) clearInterval(timerRef.current);

    const updatedAnswers = [...answers];
    updatedAnswers[step] = option;
    setAnswers(updatedAnswers);

    const correct = option === currentQuestion.answer;
    setIsCorrect(correct);
    setNoAnswer(option === "");
    setShowFeedback(true);

    setTimeout(() => {
      setShowFeedback(false);
      setIsCorrect(null);
      setNoAnswer(false);
      setQuestionFinished(true);
      setHasAnswered(false);
    }, 2000);
  };

  const getRandomQuestions = () => {
    const shuffled = [...allQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 10);
  };

  const searchParams = useSearchParams();
  const category = searchParams.get("category") || "all";

  useEffect(() => {
    if (!category) return;

    async function load() {
      setLoadingQuestions(true);

      try {
        const qs = await fetchQuestions(category);
        setQuestions(qs);
      } finally {
        setLoadingQuestions(false);
      }
    }

    load();
  }, [category]);

  //   useEffect(() => {
  //   if (!category) return;

  //   async function load() {
  //     const qs = await fetchQuestions(category);
  //     setQuestions(qs);
  //   }

  //   load();
  // }, [category]);

  // useEffect(() => {
  //   if (!category) return;
  //   if (!allQuestions || allQuestions.length === 0) return;

  //   let filtered = allQuestions;

  //   if (category !== "all") {
  //     filtered = allQuestions.filter((q) => q.category === category);
  //   }

  //   if (filtered.length === 0) {
  //     console.warn("No questions found for category:", category);
  //     setQuestions([]);
  //     return;
  //   }

  //   const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  //   const finalQuestions =
  //     shuffled.length >= 10 ? shuffled.slice(0, 10) : shuffled;

  //   setQuestions(finalQuestions);
  // }, [category]);

  const restart = () => {
    setQuestions(getRandomQuestions());
    setStep(0);
    setAnswers([]);
    setScore(null);
    setShowFeedback(false);
    setIsCorrect(null);
    setTimeLeft(15);
    setNoAnswer(false);
  };

  const unansweredCount = answers.filter((ans) => ans === "").length;

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
      const cooldownSeconds = 24 * 60 * 60; // 24 hrs
      const remaining = timestamp + cooldownSeconds - now;

      if (remaining > 0) {
        setClaimCooldown(remaining);
      } else {
        setClaimCooldown(0);
      }
    } catch (err) {
      console.error("Failed to fetch lastClaimedAt:", err);
    }
  }, [address, isCorrectChain]);

  useEffect(() => {
    if (address && isCorrectChain) {
      fetchLastClaimedAt();
    }
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
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");

    return `${h}:${m}:${s}`;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 
    bg-white dark:bg-[#17111F] transition-colors duration-300"
    >
      {loadingQuestions ? (
        <div
          className="min-h-screen flex items-center justify-center p-10 
    bg-white dark:bg-[#17111F] transition-colors duration-300"
        >
          <div className="relative flex flex-col items-center gap-6">
            {/* Glowing 3D Orbit Rings */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <motion.div
                className="absolute w-32 h-32 border-4 
        border-purple-500/60 dark:border-purple-500/40 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />

              <motion.div
                className="absolute w-24 h-24 border-4 
        border-blue-500/60 dark:border-blue-400/40 rounded-full"
                animate={{ rotate: -360 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              />

              <motion.div
                className="absolute w-16 h-16 border-4 
        border-pink-500/60 dark:border-pink-500/40 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />

              {/* Pulsing center dot */}
              <motion.div
                className="w-4 h-4 rounded-full 
        bg-gray-800 dark:bg-white 
        shadow-lg shadow-purple-500/40 dark:shadow-purple-500/60"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>

            {/* Text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                ease: "easeInOut",
              }}
              className="text-lg tracking-wide 
      text-gray-700 dark:text-gray-200 transition-colors duration-300"
            >
              Fetching questions...
            </motion.p>
          </div>
        </div>
      ) : (
        // <div className="w-full max-w-2xl p-6 bg-[#E6E6FA] shadow-2xl rounded-2xl space-y-6 relative">
        //   <div className="flex justify-between items-center">

        //   </div>

        //   {score === null && (
        //     <>
        //       {/* Progress Bar */}
        //       <div className="w-full bg-gray-300 rounded-full h-4 overflow-hidden">
        //         <motion.div
        //           className="bg-[#17111F] h-4"
        //           initial={{ width: 0 }}
        //           animate={{
        //             width: `${((step + 1) / questions.length) * 100}%`,
        //           }}
        //           transition={{ duration: 0.3 }}
        //         />
        //       </div>

        //       <div className="flex justify-between items-center text-sm text-[#17111F]">
        //         <span>
        //           Question {step + 1} of {questions.length}
        //         </span>
        //         <span className="text-green-700 font-semibold">
        //           Score:{" "}
        //           {
        //             answers.filter(
        //               (ans, i) => ans && questions[i]?.answer === ans
        //             ).length
        //           }
        //         </span>
        //         <span>⏱ {timeLeft}s</span>
        //       </div>
        //     </>
        //   )}

        //   {/* Quiz Section */}
        //   {score === null && currentQuestion ? (
        //     <AnimatePresence mode="wait">
        //       <motion.div
        //         key={step}
        //         initial={{ opacity: 0, x: 50 }}
        //         animate={{ opacity: 1, x: 0 }}
        //         exit={{ opacity: 0, x: -50 }}
        //         transition={{ duration: 0.4 }}
        //       >
        //         <h2 className="text-lg font-semibold text-[#17111F] mb-4">
        //           {currentQuestion.question}
        //         </h2>
        //         <div className="grid gap-3">
        //           {currentQuestion.options.map((option: any) => (
        //             <button
        //               key={option}
        //               onClick={() => handleAnswer(option)}
        //               disabled={userAnswer !== undefined}
        //               className={`px-4 py-3 rounded-lg text-[#17111F] border text-left transition-all ${
        //                 userAnswer !== undefined
        //                   ? option === currentQuestion.answer
        //                     ? "bg-green-100 border-green-500"
        //                     : option === userAnswer
        //                     ? "bg-red-100 border-red-500"
        //                     : "border-gray-300"
        //                   : "border-gray-300 hover:border-[#17111F]"
        //               }`}
        //             >
        //               {option}
        //             </button>
        //           ))}
        //         </div>

        //         {showFeedback && (
        //           <div className="mt-4 w-full flex justify-center">
        //             <div className="w-full max-w-md">
        //               {noAnswer ? (
        //                 <div className="flex items-center bg-yellow-50 text-yellow-800 px-4 py-4 rounded-xl shadow-sm gap-4">
        //                   <div className="flex-grow text-sm sm:text-base leading-snug">
        //                     <p className="font-semibold">No answer selected.</p>
        //                     <p>
        //                       Correct answer:{" "}
        //                       <strong>{currentQuestion.answer}</strong>
        //                     </p>
        //                   </div>
        //                   <div className="flex-shrink-0 text-yellow-500 text-xl">
        //                     ⏰
        //                   </div>
        //                 </div>
        //               ) : isCorrect ? (
        //                 <div className="flex items-center bg-green-50 text-green-800 px-4 py-4 rounded-xl shadow-sm gap-4">
        //                   <div className="flex-grow text-sm sm:text-base leading-snug">
        //                     <p className="font-semibold">
        //                       Correct! Nice job 🎉
        //                     </p>
        //                   </div>
        //                   <FaCheckCircle className="flex-shrink-0 text-green-500 text-xl" />
        //                 </div>
        //               ) : (
        //                 <div className="flex items-center bg-red-50 text-red-800 px-4 py-4 rounded-xl shadow-sm gap-4">
        //                   <div className="flex-grow text-sm sm:text-base leading-snug">
        //                     <p className="font-semibold">Incorrect.</p>
        //                     <p>
        //                       Correct answer:{" "}
        //                       <strong>{currentQuestion.answer}</strong>
        //                     </p>
        //                   </div>
        //                   <FaTimesCircle className="flex-shrink-0 text-red-500 text-xl" />
        //                 </div>
        //               )}
        //             </div>
        //           </div>
        //         )}
        //       </motion.div>
        //     </AnimatePresence>
        //   ) : score !== null ? (
        //     // Results Section
        //     <motion.div
        //       initial={{ opacity: 0, scale: 0.9 }}
        //       animate={{ opacity: 1, scale: 1 }}
        //       transition={{ duration: 0.5 }}
        //       className="text-center space-y-6"
        //     >
        //       <motion.div
        //         initial={{ opacity: 0, scale: 0.95 }}
        //         animate={{ opacity: 1, scale: 1 }}
        //         transition={{ duration: 0.6, ease: "easeOut" }}
        //         className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-100 rounded-2xl px-8 py-10 shadow-2xl space-y-8"
        //       >
        //         <div className="flex flex-col items-center gap-2">
        //           <h2 className="text-xl font-extrabold tracking-tight">
        //             Performance Report
        //           </h2>
        //         </div>

        //         <div className="text-center">
        //           <p className="text-xl text-gray-300">
        //             You scored{" "}
        //             <span className="text-white font-bold text-2xl">
        //               {score} / {questions.length}
        //             </span>
        //           </p>
        //         </div>

        //         {score === 0 && unansweredCount === questions.length ? (
        //           <div className="flex flex-col items-center text-yellow-400 text-center gap-2 mt-4">
        //             <FaRegLaughSquint className="text-4xl" />
        //             <p className="text-lg font-medium">Did you even try? 😅</p>
        //             <span className="text-sm text-gray-500">
        //               All questions were skipped. Let's give it another shot!
        //             </span>
        //           </div>
        //         ) : score === 0 ? (
        //           <div className="flex flex-col items-center text-red-400 text-center gap-2 mt-4">
        //             <FaTimesCircle className="text-4xl" />
        //             <p className="text-lg font-medium">No correct answers 😢</p>
        //             <span className="text-sm text-gray-500">
        //               Don't worry. You'll do better next time!
        //             </span>
        //           </div>
        //         ) : (
        //           <div className="flex flex-col items-center gap-4">
        //             <FaCheckCircle className="text-green-400 text-4xl" />
        //             <p className="text-lg font-semibold text-gray-200">
        //               Great job!
        //             </p>

        //             {score !== null && (
        //               <>
        //                 {claimCooldown > 0 ? (
        //                   <div className="flex flex-col items-center gap-2 text-sm sm:text-base text-center text-yellow-100 bg-yellow-900/40 border border-yellow-600 rounded-xl p-4 w-full max-w-md shadow-lg">
        //                     <div className="text-2xl">⏳</div>
        //                     <p className="font-semibold">
        //                       Daily CELO already claimed!
        //                     </p>
        //                   </div>
        //                 ) : (
        //                   <div className="text-lg text-gray-300">
        //                     🎉 You earned{" "}
        //                     <span className="font-bold text-white">
        //                       {getRewardForScore(score)} CELO
        //                     </span>
        //                   </div>
        //                 )}
        //               </>
        //             )}

        //             {!isConnected ? (
        //               <button
        //                 onClick={handleConnect}
        //                 className="bg-yellow-800 hover:bg-yellow-600 text-white px-2 py-2 rounded-lg font-semibold shadow"
        //               >
        //                 Connect Wallet to claim
        //               </button>
        //             ) : !isCorrectChain ? (
        //               <button
        //                 onClick={handleSwitchChain}
        //                 className="bg-red-500 hover:bg-red-600 text-white px-2 py-2 rounded-lg font-semibold shadow"
        //               >
        //                 🌐 Switch to Celo to claim
        //               </button>
        //             ) : claimCooldown > 0 ? (
        //               <button
        //                 disabled
        //                 className="bg-gradient-to-r from-gray-500 to-gray-700 text-white px-4 py-2 rounded-xl font-semibold shadow-inner cursor-not-allowed opacity-80 flex items-center gap-2 animate-pulse"
        //               >
        //                 <span className="text-sm sm:text-base">
        //                   Claim again in {formatTime(claimCooldown)}
        //                 </span>
        //               </button>
        //             ) : (
        //               <button
        //                 onClick={claimReward}
        //                 disabled={isPending}
        //                 className="bg-gradient-to-r cursor-pointer from-farcaster to-farcaster/80 text-white md:px-5 px-2 py-2 rounded-lg font-semibold tracking-wide hover:opacity-90 shadow-lg transition-all duration-200"
        //               >
        //                 🎁 {isPending ? "Claiming..." : "Claim Your Reward"}
        //               </button>
        //             )}
        //           </div>
        //         )}

        //         <div className="text-center cursor-pointer">
        //           <button
        //             onClick={restart}
        //             className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold px-5 py-2 rounded-full shadow transition-all duration-200"
        //           >
        //             <FaRedoAlt />
        //             Restart Quiz
        //           </button>
        //         </div>
        //       </motion.div>
        //     </motion.div>
        //   ) : null}
        // </div>

        <div
          className="
    w-full max-w-2xl p-6 rounded-2xl shadow-2xl space-y-6 relative
    bg-[#E6E6FA] dark:bg-[#17111F]
  "
        >
          <div className="flex justify-between items-center"></div>

          {score === null && (
            <>
              {/* Progress Bar */}
              <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <motion.div
                  className="h-4 bg-[#17111F] dark:bg-[#E6E6FA]"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${((step + 1) / questions.length) * 100}%`,
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <div className="flex justify-between items-center text-sm text-[#17111F] dark:text-gray-200">
                <span>
                  Question {step + 1} of {questions.length}
                </span>

                <span className="text-green-700 dark:text-green-400 font-semibold">
                  Score:{" "}
                  {
                    answers.filter(
                      (ans, i) => ans && questions[i]?.answer === ans
                    ).length
                  }
                </span>

                <span>⏱ {timeLeft}s</span>
              </div>
            </>
          )}

          {/* QUIZ */}
          {score === null && currentQuestion ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="text-lg font-semibold text-[#17111F] dark:text-gray-100 mb-4">
                  {currentQuestion.question}
                </h2>

                <div className="grid gap-3">
                  {currentQuestion.options.map((option: any) => (
                    <button
                      key={option}
                      onClick={() => handleAnswer(option)}
                      disabled={userAnswer !== undefined}
                      className={`
                px-4 py-3 rounded-lg text-left border transition-all
                text-[#17111F] dark:text-gray-100
                ${
                  userAnswer !== undefined
                    ? option === currentQuestion.answer
                      ? "bg-green-100 dark:bg-green-900/40 border-green-500"
                      : option === userAnswer
                      ? "bg-red-100 dark:bg-red-900/40 border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                    : "border-gray-300 dark:border-gray-600 hover:border-[#17111F] dark:hover:border-gray-200"
                }
              `}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {/* {showFeedback && (
                  <div className="mt-4 w-full flex justify-center">
                    <div className="w-full max-w-md">
                      {noAnswer ? (
                        <div className="flex items-center bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-4 py-4 rounded-xl shadow-sm gap-4">
                          <div className="flex-grow text-sm sm:text-base leading-snug">
                            <p className="font-semibold">No answer selected.</p>
                            <p>
                              Correct answer:{" "}
                              <strong>{currentQuestion.answer}</strong>
                            </p>
                          </div>
                          <div className="flex-shrink-0 text-yellow-500 text-xl">
                            ⏰
                          </div>
                        </div>
                      ) : isCorrect ? (
                        <div className="flex items-center bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-4 py-4 rounded-xl shadow-sm gap-4">
                          <div className="flex-grow text-sm sm:text-base leading-snug">
                            <p className="font-semibold">
                              Correct! Nice job 🎉
                            </p>
                          </div>
                          <FaCheckCircle className="flex-shrink-0 text-green-500 text-xl" />
                        </div>
                      ) : (
                        <div className="flex items-center bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-4 py-4 rounded-xl shadow-sm gap-4">
                          <div className="flex-grow text-sm sm:text-base leading-snug">
                            <p className="font-semibold">Incorrect.</p>
                            <p>
                              Correct answer:{" "}
                              <strong>{currentQuestion.answer}</strong>
                            </p>
                          </div>
                          <FaTimesCircle className="flex-shrink-0 text-red-500 text-xl" />
                        </div>
                      )}
                    </div>
                  </div>
                )} */}


              </motion.div>
            </AnimatePresence>
          ) : score !== null ? (
            /* RESULTS */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center space-y-6"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="
          rounded-2xl px-8 py-10 shadow-2xl space-y-8
          bg-gradient-to-br
          from-gray-950 via-gray-900 to-gray-800
          dark:from-[#E6E6FA] dark:via-[#d5d5f5] dark:to-[#c2c2ef]
          text-gray-100 dark:text-[#17111F]
        "
              >
                <div className="flex flex-col items-center gap-2">
                  <h2 className="text-xl font-extrabold tracking-tight">
                    Performance Report
                  </h2>
                </div>

                <div className="text-center">
                  <p className="text-xl text-gray-300 dark:text-gray-700">
                    You scored{" "}
                    <span className="font-bold text-2xl text-white dark:text-[#17111F]">
                      {score} / {questions.length}
                    </span>
                  </p>
                </div>

                {/* Skipped all */}
                {score === 0 && unansweredCount === questions.length ? (
                  <div className="flex flex-col items-center text-yellow-400 dark:text-yellow-700 text-center gap-2 mt-4">
                    <FaRegLaughSquint className="text-4xl" />
                    <p className="text-lg font-medium">Did you even try? 😅</p>
                  </div>
                ) : score === 0 ? (
                  <div className="flex flex-col items-center text-red-400 dark:text-red-600 text-center gap-2 mt-4">
                    <FaTimesCircle className="text-4xl" />
                    <p className="text-lg font-medium">No correct answers 😢</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <FaCheckCircle className="text-green-400 dark:text-green-700 text-4xl" />
                    <p className="text-lg font-semibold text-gray-200 dark:text-gray-800">
                      Great job!
                    </p>

                    {score !== null && (
                      <>
                        {claimCooldown > 0 ? (
                          <div className="flex flex-col items-center gap-2 text-sm sm:text-base text-center text-yellow-100 dark:text-yellow-900 bg-yellow-900/40 dark:bg-yellow-200/40 border border-yellow-600 rounded-xl p-4 w-full max-w-md shadow-lg">
                            <p className="font-semibold">
                              Daily CELO already claimed!
                            </p>
                          </div>
                        ) : (
                          <div className="text-lg text-gray-300 dark:text-gray-800">
                            🎉 You earned{" "}
                            <span className="font-bold text-white dark:text-[#17111F]">
                              {getRewardForScore(score)} CELO
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Wallet buttons unchanged */}
                    {!isConnected ? (
                      <button
                        onClick={handleConnect}
                        className="bg-yellow-800 hover:bg-yellow-600 text-white px-2 py-2 rounded-lg font-semibold shadow"
                      >
                        Connect Wallet to claim
                      </button>
                    ) : !isCorrectChain ? (
                      <button
                        onClick={handleSwitchChain}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-2 rounded-lg font-semibold shadow"
                      >
                        🌐 Switch to Celo to claim
                      </button>
                    ) : claimCooldown > 0 ? (
                      <button
                        disabled
                        className="bg-gradient-to-r from-gray-500 to-gray-700 dark:from-gray-300 dark:to-gray-400 text-white dark:text-[#17111F] px-4 py-2 rounded-xl font-semibold shadow-inner cursor-not-allowed opacity-80 animate-pulse"
                      >
                        Claim again in {formatTime(claimCooldown)}
                      </button>
                    ) : (
                      <button
                        onClick={claimReward}
                        disabled={isPending}
                        className="bg-gradient-to-r from-farcaster to-farcaster/80 text-white px-4 py-2 rounded-lg font-semibold tracking-wide hover:opacity-90 shadow-lg transition-all duration-200"
                      >
                        🎁 {isPending ? "Claiming..." : "Claim Your Reward"}
                      </button>
                    )}
                  </div>
                )}

                <div className="text-center cursor-pointer">
                  <button
                    onClick={restart}
                    className="
              inline-flex items-center gap-2
              bg-gray-800 dark:bg-gray-300 
              hover:bg-gray-700 dark:hover:bg-gray-200
              text-white dark:text-[#17111F] 
              font-semibold px-5 py-2 rounded-full shadow
              transition-all duration-200
            "
                  >
                    <FaRedoAlt />
                    Restart Quiz
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// "use client";

// import { useEffect, useState, useCallback, useRef } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { decodeErrorResult, encodeFunctionData } from "viem";
// import {
//   FaCheckCircle,
//   FaTimesCircle,
//   FaCrown,
//   FaRegLaughSquint,
//   FaRedoAlt,
// } from "react-icons/fa";
// import {
//   useAccount,
//   useWriteContract,
//   useConnect,
//   useSwitchChain,
//   useSendTransaction,
//   usePublicClient,
// } from "wagmi";
// import { celo } from "viem/chains";
// import ScoreRewardArtifact from "@/lib/abi/ScoreReward.json";
// import { allQuestions } from "@/app/quiz/data/questions";
// import { toast } from "react-toastify";
// import { sdk } from "@farcaster/frame-sdk";
// import { config } from "@/lib/wagmi";
// import { getPublicClient } from "@wagmi/core";
// import { saveScoreToFirestore } from "@/lib/firestore";
// import Link from "next/link";
// import { useRouter, useSearchParams } from "next/navigation";
// import { getReferralTag, submitReferral } from "@divvi/referral-sdk";

// const ABI = ScoreRewardArtifact.abi;
// const contractAddress = process.env
//   .NEXT_PUBLIC_SCORE_REWARD_ADDRESS as `0x${string}`;
// const CELO_CHAIN_ID = celo.id;

// export default function QuizGame() {

//   const { connect, connectors, status } = useConnect();

//   const [step, setStep] = useState(0);
//   const [answers, setAnswers] = useState<string[]>([]);
//   const [score, setScore] = useState<number | null>(null);
//   const [showFeedback, setShowFeedback] = useState(false);
//   const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
//   const [timeLeft, setTimeLeft] = useState(15);
//   const [noAnswer, setNoAnswer] = useState(false);
//   const [questionFinished, setQuestionFinished] = useState(false);
//   const [questions, setQuestions] = useState<typeof allQuestions>([]);
//   const router = useRouter();
//   const [hasAnswered, setHasAnswered] = useState(false);
//   const timerRef = useRef<NodeJS.Timeout | null>(null);
//   const { sendTransactionAsync } = useSendTransaction();
//   const { address, isConnected, chain } = useAccount();
//   const { switchChain } = useSwitchChain();
//   // const { isPending } = useWriteContract();
//   const [lastClaimedAt, setLastClaimedAt] = useState<number | null>(null);
//   const [claimCooldown, setClaimCooldown] = useState<number>(0); // seconds remaining
//   const publicClient = usePublicClient();
//   const [isPending, setPending] = useState(false);

// useEffect(() => {
//   if (typeof window !== "undefined") {
//     if (window.ethereum && window.ethereum.isMiniPay) {
//       // Auto-open Web3Modal to connect MiniPay
//       open();
//     }
//   }
// }, []);

//   const isCorrectChain = chain?.id === CELO_CHAIN_ID;

//   const handleConnect = useCallback(async () => {
//     try {
//       // Prefer an injected wallet (e.g., MetaMask, Coinbase, Rainbow)
//       let connector =
//         connectors.find((c) => c.id === "injected") ||
//         connectors.find((c) => c.name.toLowerCase().includes("metamask")) ||
//         connectors[0];

//       if (!connector) {
//         toast.error("⚠️ No wallet connector found.");
//         return;
//       }

//       await connect({
//         connector,
//         chainId: CELO_CHAIN_ID,
//       });

//       toast.success("🔗 Wallet connected!");
//     } catch (err: any) {
//       console.error("Wallet connect error:", err);
//       toast.error("❌ Failed to connect wallet. Please try again.");
//     }
//   }, [connect, connectors]);

//   const handleSwitchChain = useCallback(() => {
//     try {
//       switchChain({ chainId: CELO_CHAIN_ID });
//     } catch (error) {
//       console.error("Chain switch failed:", error);
//       alert(`Failed to switch to Celo Network. Please try again.`);
//     }
//   }, [switchChain]);

//   const maxReward = 0.00001;

//   const getRewardForScore = (score: number) => {
//     if (score <= 0) return 0;
//     return parseFloat((maxReward * (score / 10)).toFixed(8));
//   };

//   const claimReward = useCallback(async () => {
//     setPending(true);

//     if (!score || score <= 0) {
//       toast.error("⚠️ You must score more than 0 to claim.");
//       setPending(false);
//       return;
//     }

//     if (!isConnected) {
//       toast.info("🔌 Connecting wallet...");
//       await handleConnect();
//       setPending(false);
//       return;
//     }

//     if (!isCorrectChain) {
//       toast.error("🌐 Please switch to the Celo network.");
//       await handleSwitchChain();
//       setPending(false);
//       return;
//     }

//     let txHash: `0x${string}` | null = null;

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

//       txHash = await sendTransactionAsync({
//         account: address!,
//         to: contractAddress,
//         data: txData as `0x${string}`,
//       });

//       toast.loading("⏳ Waiting for confirmation...");

//       const client = getPublicClient(config);
//       const receipt = await client.waitForTransactionReceipt({ hash: txHash });

//       toast.dismiss();

//       if (receipt.status === "reverted") {
//         toast.error("❌ Transaction reverted.");
//         setPending(false);
//         return;
//       }

//       const now = Math.floor(Date.now() / 1000);
//       setLastClaimedAt(now);
//       setClaimCooldown(24 * 60 * 60);

//       toast.success(
//         <div>
//           🎉 Reward claimed successfully!
//           <br />
//           <a
//             href={`https://celoscan.io/tx/${txHash}`}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="underline text-blue-300"
//           >
//             View on CeloScan ↗
//           </a>
//         </div>
//       );
//     } catch (err: any) {
//       toast.dismiss();

//       const revertData =
//         err?.cause?.data ||
//         err?.data ||
//         err?.error?.data ||
//         err?.error?.error?.data;

//       if (revertData) {
//         try {
//           const decoded = decodeErrorResult({ abi: ABI, data: revertData });
//           switch (decoded.errorName) {
//             case "NotEnoughCelo":
//               toast.error("⚠️ Not enough CELO in contract.");
//               return;
//             case "ClaimTooSoon":
//               toast.error("⏱️ You can only claim once every 24 hours.");
//               return;
//             case "InvalidScore":
//               toast.error("⚠️ Invalid score submitted.");
//               return;
//             default:
//               toast.error(`⚠️ Unknown contract error: ${decoded.errorName}`);
//               return;
//           }
//         } catch (decodeErr) {
//           console.warn("❌ Failed to decode error:", decodeErr);
//         }
//       }

//       const fallbackMessage =
//         typeof err === "object" && "shortMessage" in err
//           ? err.shortMessage
//           : "Unknown error. Check console.";

//       toast.error("❌ Claim failed: " + fallbackMessage);
//       setPending(false);
//       return;
//     }

//     // 🔁 Report to Divvi separately
//     try {
//       if (txHash) {
//         console.log("Submitting referral to Divi:", {
//           txHash,
//           chainId: CELO_CHAIN_ID,
//         });
//         await submitReferral({ txHash, chainId: CELO_CHAIN_ID });

//         console.log("✅ Divvi referral submitted successfully.");
//       }
//     } catch (divviErr) {
//       console.log("⚠️ Divvi referral submission failed:", divviErr);
//       toast.info("Referral tracking failed but reward was still claimed.");
//     }

//     setPending(false);
//   }, [
//     score,
//     isConnected,
//     isCorrectChain,
//     handleConnect,
//     handleSwitchChain,
//     address,
//     sendTransactionAsync,
//     config,
//   ]);

//   const currentQuestion = questions[step];
//   const userAnswer = answers[step];

//   useEffect(() => {
//     if (score !== null || !currentQuestion) return;

//     setTimeLeft(15);
//     setNoAnswer(false);
//     setQuestionFinished(false);
//     setHasAnswered(false);

//     timerRef.current = setInterval(() => {
//       setTimeLeft((prev) => {
//         if (prev <= 1) {
//           clearInterval(timerRef.current!);
//           timerRef.current = null;

//           if (answers[step] === undefined) {
//             handleAnswer("");
//           }

//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);

//     return () => {
//       if (timerRef.current) clearInterval(timerRef.current);
//     };
//   }, [step, currentQuestion]);

//   useEffect(() => {
//     if (!questionFinished) return;

//     if (step + 1 === questions.length) {
//       const correctCount = answers.filter(
//         (ans, i) => ans === questions[i].answer
//       ).length;
//       setScore(correctCount);
//     } else {
//       setStep((prev) => prev + 1);
//     }
//   }, [questionFinished]);

//   useEffect(() => {
//     if (!score || !address || claimCooldown > 0) return; // ✅ prevent saving if already claimed

//     const fetchAndSave = async () => {
//       try {
//         const context = await sdk.context;
//         const username = context.user?.username;
//         let profilePic: any = context.user?.pfpUrl;

//         if (!username) {
//           console.warn("Missing username for saving score");
//           return;
//         }

//         await saveScoreToFirestore({
//           username,
//           address,
//           score,
//           profilePic,
//         });
//       } catch (err) {
//         console.error("Failed to fetch sdk context or save score:", err);
//       }
//     };

//     fetchAndSave();
//   }, [address, score, claimCooldown]);

//   const handleAnswer = (option: string) => {
//     if (!currentQuestion || hasAnswered) return;
//     setHasAnswered(true);

//     if (timerRef.current) clearInterval(timerRef.current);

//     const updatedAnswers = [...answers];
//     updatedAnswers[step] = option;
//     setAnswers(updatedAnswers);

//     const correct = option === currentQuestion.answer;
//     setIsCorrect(correct);
//     setNoAnswer(option === "");
//     setShowFeedback(true);

//     setTimeout(() => {
//       setShowFeedback(false);
//       setIsCorrect(null);
//       setNoAnswer(false);
//       setQuestionFinished(true);
//       setHasAnswered(false);
//     }, 2000);
//   };

//   const getRandomQuestions = () => {
//     const shuffled = [...allQuestions];
//     for (let i = shuffled.length - 1; i > 0; i--) {
//       const j = Math.floor(Math.random() * (i + 1));
//       [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
//     }
//     return shuffled.slice(0, 10);
//   };

//   // useEffect(() => {
//   //   setQuestions(getRandomQuestions());
//   // }, []);

// const searchParams = useSearchParams();
// const category = searchParams.get("category") || "all";

// useEffect(() => {
//   if (!category) return;
//   if (!allQuestions || allQuestions.length === 0) return;

//   let filtered = allQuestions;

//   if (category !== "all") {
//     filtered = allQuestions.filter((q) => q.category === category);
//   }

//   if (filtered.length === 0) {
//     console.warn("No questions found for category:", category);
//     setQuestions([]);
//     return;
//   }

//   const shuffled = [...filtered].sort(() => Math.random() - 0.5);
//   const finalQuestions =
//     shuffled.length >= 10 ? shuffled.slice(0, 10) : shuffled;

//   setQuestions(finalQuestions);
// }, [category]);

//   const handleOpenModal = async () => {
//     try {
//       await open(); // opens the Web3Modal interface
//     } catch (err) {
//       console.error("Failed to open wallet modal:", err);
//     }
//   };

//   // useEffect(() => {
//   //   if (!isConnected) {
//   //     handleConnect();
//   //   }
//   // }, [isConnected, handleConnect]);

//   const restart = () => {
//     setQuestions(getRandomQuestions());
//     setStep(0);
//     setAnswers([]);
//     setScore(null);
//     setShowFeedback(false);
//     setIsCorrect(null);
//     setTimeLeft(15);
//     setNoAnswer(false);
//   };

//   const unansweredCount = answers.filter((ans) => ans === "").length;

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
//       const cooldownSeconds = 24 * 60 * 60; // 24 hrs
//       const remaining = timestamp + cooldownSeconds - now;

//       if (remaining > 0) {
//         setClaimCooldown(remaining);
//       } else {
//         setClaimCooldown(0);
//       }
//     } catch (err) {
//       console.error("Failed to fetch lastClaimedAt:", err);
//     }
//   }, [address, isCorrectChain]);

//   useEffect(() => {
//     if (address && isCorrectChain) {
//       fetchLastClaimedAt();
//     }
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
//     const h = Math.floor(seconds / 3600)
//       .toString()
//       .padStart(2, "0");
//     const m = Math.floor((seconds % 3600) / 60)
//       .toString()
//       .padStart(2, "0");
//     const s = (seconds % 60).toString().padStart(2, "0");

//     return `${h}:${m}:${s}`;
//   };

//   return (
//     <div className="min-h-screen bg-[#17111F] flex items-center justify-center p-6">
//       <div className="w-full max-w-2xl p-6 bg-[#E6E6FA] shadow-2xl rounded-2xl space-y-6 relative">
//         <div className="flex justify-between items-center">
//           <Link href="/">
//             <div className="flex items-center  cursor-pointer select-none relative -left-2">
//               <img
//                 src="/splashlogo.png"
//                 alt="BrainBlast Logo"
//                 className="w-12 h-12 object-contain"
//                 style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.1))" }}
//               />
//             </div>
//           </Link>

//           {/* Leaderboard button */}
//           <button
//             onClick={() => {
//               if (!isConnected && questionFinished) {
//                 console.log("🔌 Connect your wallet to view the leaderboard");
//                 return;
//               }

//               if (score === null) {
//                 console.log("📊 No score available. Take the quiz first!");
//                 return;
//               }

//               router.push("/leaderboard");
//             }}
//             className={`flex items-center gap-2 px-3 py-1 rounded-lg shadow transition
//     ${
//       !isConnected || score === null
//         ? "bg-gray-400 cursor-not-allowed text-gray-200"
//         : "bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
//     }`}
//             aria-label="Go to Leaderboard"
//           >
//             <FaCrown />
//             <span className="hidden sm:inline">Leaderboard</span>
//           </button>
//         </div>

//         {score === null && (
//           <>
//             {/* Progress Bar */}
//             <div className="w-full bg-gray-300 rounded-full h-4 overflow-hidden">
//               <motion.div
//                 className="bg-[#17111F] h-4"
//                 initial={{ width: 0 }}
//                 animate={{
//                   width: `${((step + 1) / questions.length) * 100}%`,
//                 }}
//                 transition={{ duration: 0.3 }}
//               />
//             </div>

//             <div className="flex justify-between items-center text-sm text-[#17111F]">
//               <span>
//                 Question {step + 1} of {questions.length}
//               </span>
//               <span className="text-green-700 font-semibold">
//                 Score:{" "}
//                 {
//                   answers.filter(
//                     (ans, i) => ans && questions[i]?.answer === ans
//                   ).length
//                 }
//               </span>
//               <span>⏱ {timeLeft}s</span>
//             </div>
//           </>
//         )}

//         {/* Quiz Section */}
//         {score === null && currentQuestion ? (
//           <AnimatePresence mode="wait">
//             <motion.div
//               key={step}
//               initial={{ opacity: 0, x: 50 }}
//               animate={{ opacity: 1, x: 0 }}
//               exit={{ opacity: 0, x: -50 }}
//               transition={{ duration: 0.4 }}
//             >
//               <h2 className="text-lg font-semibold text-[#17111F] mb-4">
//                 {currentQuestion.question}
//               </h2>

//               <div className="grid gap-3">
//                 {currentQuestion.options.map((option:any) => (
//                   <button
//                     key={option}
//                     onClick={() => handleAnswer(option)}
//                     disabled={userAnswer !== undefined}
//                     className={`px-4 py-3 rounded-lg text-[#17111F] border text-left transition-all ${
//                       userAnswer !== undefined
//                         ? option === currentQuestion.answer
//                           ? "bg-green-100 border-green-500"
//                           : option === userAnswer
//                           ? "bg-red-100 border-red-500"
//                           : "border-gray-300"
//                         : "border-gray-300 hover:border-[#17111F]"
//                     }`}
//                   >
//                     {option}
//                   </button>
//                 ))}
//               </div>

//               {showFeedback && (
//                 <div className="mt-4 w-full flex justify-center">
//                   <div className="w-full max-w-md">
//                     {noAnswer ? (
//                       <div className="flex items-center bg-yellow-50 text-yellow-800 px-4 py-4 rounded-xl shadow-sm gap-4">
//                         <div className="flex-grow text-sm sm:text-base leading-snug">
//                           <p className="font-semibold">No answer selected.</p>
//                           <p>
//                             Correct answer:{" "}
//                             <strong>{currentQuestion.answer}</strong>
//                           </p>
//                         </div>
//                         <div className="flex-shrink-0 text-yellow-500 text-xl">
//                           ⏰
//                         </div>
//                       </div>
//                     ) : isCorrect ? (
//                       <div className="flex items-center bg-green-50 text-green-800 px-4 py-4 rounded-xl shadow-sm gap-4">
//                         <div className="flex-grow text-sm sm:text-base leading-snug">
//                           <p className="font-semibold">Correct! Nice job 🎉</p>
//                         </div>
//                         <FaCheckCircle className="flex-shrink-0 text-green-500 text-xl" />
//                       </div>
//                     ) : (
//                       <div className="flex items-center bg-red-50 text-red-800 px-4 py-4 rounded-xl shadow-sm gap-4">
//                         <div className="flex-grow text-sm sm:text-base leading-snug">
//                           <p className="font-semibold">Incorrect.</p>
//                           <p>
//                             Correct answer:{" "}
//                             <strong>{currentQuestion.answer}</strong>
//                           </p>
//                         </div>
//                         <FaTimesCircle className="flex-shrink-0 text-red-500 text-xl" />
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </motion.div>
//           </AnimatePresence>
//         ) : score !== null ? (
//           // Results Section
//           <motion.div
//             initial={{ opacity: 0, scale: 0.9 }}
//             animate={{ opacity: 1, scale: 1 }}
//             transition={{ duration: 0.5 }}
//             className="text-center space-y-6"
//           >
//             <motion.div
//               initial={{ opacity: 0, scale: 0.95 }}
//               animate={{ opacity: 1, scale: 1 }}
//               transition={{ duration: 0.6, ease: "easeOut" }}
//               className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-100 rounded-2xl px-8 py-10 shadow-2xl space-y-8"
//             >
//               <div className="flex flex-col items-center gap-2">
//                 <h2 className="text-xl font-extrabold tracking-tight">
//                   Performance Report
//                 </h2>
//               </div>

//               <div className="text-center">
//                 <p className="text-xl text-gray-300">
//                   You scored{" "}
//                   <span className="text-white font-bold text-2xl">
//                     {score} / {questions.length}
//                   </span>
//                 </p>
//               </div>

//               {score === 0 && unansweredCount === questions.length ? (
//                 <div className="flex flex-col items-center text-yellow-400 text-center gap-2 mt-4">
//                   <FaRegLaughSquint className="text-4xl" />
//                   <p className="text-lg font-medium">Did you even try? 😅</p>
//                   <span className="text-sm text-gray-500">
//                     All questions were skipped. Let's give it another shot!
//                   </span>
//                 </div>
//               ) : score === 0 ? (
//                 <div className="flex flex-col items-center text-red-400 text-center gap-2 mt-4">
//                   <FaTimesCircle className="text-4xl" />
//                   <p className="text-lg font-medium">No correct answers 😢</p>
//                   <span className="text-sm text-gray-500">
//                     Don't worry. You'll do better next time!
//                   </span>
//                 </div>
//               ) : (
//                 <div className="flex flex-col items-center gap-4">
//                   <FaCheckCircle className="text-green-400 text-4xl" />
//                   <p className="text-lg font-semibold text-gray-200">
//                     Great job!
//                   </p>

//                   {score !== null && (
//                     <>
//                       {claimCooldown > 0 ? (
//                         <div className="flex flex-col items-center gap-2 text-sm sm:text-base text-center text-yellow-100 bg-yellow-900/40 border border-yellow-600 rounded-xl p-4 w-full max-w-md shadow-lg">
//                           <div className="text-2xl">⏳</div>
//                           <p className="font-semibold">
//                             Daily CELO already claimed!
//                           </p>
//                           {/* <p className="text-yellow-300">
//                             Come back in{" "}
//                             <span className="font-bold">
//                               {formatTime(claimCooldown)}
//                             </span>{" "}
//                             to earn again.
//                           </p> */}
//                         </div>
//                       ) : (
//                         <div className="text-lg text-gray-300">
//                           🎉 You earned{" "}
//                           <span className="font-bold text-white">
//                             {getRewardForScore(score)} CELO
//                           </span>
//                         </div>
//                       )}
//                     </>
//                   )}

//     {!isConnected && (
//       <button
//         onClick={handleOpenModal}
//         className="bg-yellow-800 hover:bg-yellow-600 text-white px-2 py-2 rounded-lg font-semibold shadow"
//       >
//         Connect Wallet to claim
//       </button>
//     )}

//     {!isConnected ? (
//       <button
//         onClick={handleConnect}
//         className="bg-yellow-800 hover:bg-yellow-600 text-white px-2 py-2 rounded-lg font-semibold shadow"
//       >
//         Connect Wallet to claim
//       </button>
//     ) : !isCorrectChain ? (
//       <button
//         onClick={handleSwitchChain}
//         className="bg-red-500 hover:bg-red-600 text-white px-2 py-2 rounded-lg font-semibold shadow"
//       >
//         🌐 Switch to Celo to claim
//       </button>
//     ) : claimCooldown > 0 ? (
//       <button
//         disabled
//         className="bg-gradient-to-r from-gray-500 to-gray-700 text-white px-4 py-2 rounded-xl font-semibold shadow-inner cursor-not-allowed opacity-80 flex items-center gap-2 animate-pulse"
//       >
//         <span className="text-sm sm:text-base">
//           Claim again in {formatTime(claimCooldown)}
//         </span>
//       </button>
//     ) : (
//       <button
//         onClick={claimReward}
//         disabled={isPending}
//         className="bg-gradient-to-r cursor-pointer from-farcaster to-farcaster/80 text-white md:px-5 px-2 py-2 rounded-lg font-semibold tracking-wide hover:opacity-90 shadow-lg transition-all duration-200"
//       >
//         🎁 {isPending ? "Claiming..." : "Claim Your Reward"}
//       </button>
//     )}
//   </div>
// )}

//               <div className="text-center cursor-pointer">
//                 <button
//                   onClick={restart}
//                   className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-farcaster font-semibold px-5 py-2 rounded-full shadow transition-all duration-200"
//                 >
//                   <FaRedoAlt className="text-farcaster" />
//                   Restart Quiz
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         ) : null}
//       </div>
//     </div>
//   );
// }

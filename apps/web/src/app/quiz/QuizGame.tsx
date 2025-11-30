"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { allQuestions } from "@/app/quiz/data/questions";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FaClock,
  FaTrophy,
  FaChevronRight,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import LoadingScreen from "@/components/Loading";
import ClaimScreen from "../claim/ClaimScreen ";

// --- FIREBASE & WAGMI IMPORTS ADDED HERE ---
import { db, leaderboardCollection } from "@/lib/firebase"; 
import { addDoc, serverTimestamp } from "firebase/firestore"; 
import { useAccount } from "wagmi"; // To get wallet address for leaderboard
// -------------------------------------------

const ACCENT_COLOR = "#2596be";

export default function QuizGame() {
  // --- HOOKS ---
  const { address } = useAccount(); // Get connected wallet address

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [noAnswer, setNoAnswer] = useState(false);
  const [questionFinished, setQuestionFinished] = useState(false);
  const [questions, setQuestions] = useState<typeof allQuestions>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [hasAnswered, setHasAnswered] = useState(false);
  
  // New State to track duration for leaderboard tie-breaking
  const [startTime, setStartTime] = useState<number | null>(null);

  // **********************************************
  // 2. MODAL STATE: Use this to control the ClaimScreen visibility
  const [showClaimModal, setShowClaimModal] = useState(false);
  // **********************************************

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || "all";

  // --- Helper to convert letter to index ---
  const letterToIndex = (letter: string) => {
    const map: any = { A: 0, B: 1, C: 2, D: 3 };
    return map[letter];
  };

  // --- New helper: robustly get the correct option text from a question ---
  const getCorrectOption = (q: any) => {
    if (!q) return undefined;
    const ans = q.answer;
    if (typeof ans === "string") {
      const trimmed = ans.trim();

      // if it's a single letter A-D
      if (/^[A-D]$/i.test(trimmed)) {
        const idx = letterToIndex(trimmed.toUpperCase());
        return q.options?.[idx];
      }

      // if the answer already matches one of the option texts
      if (Array.isArray(q.options)) {
        const found = q.options.find((opt: string) => opt === ans);
        if (found) return found;
      }

      // defensive: if it's numeric in string form
      const num = Number(trimmed);
      if (!Number.isNaN(num) && Array.isArray(q.options)) {
        return q.options[num];
      }
    }

    // if answer provided as index number
    if (typeof ans === "number" && Array.isArray(q.options)) {
      return q.options[ans];
    }

    return undefined;
  };

  // --- CALCULATE RUNNING SCORE (New logic for UI display) ---
  const currentRunningScore = useMemo(() => {
    return answers.filter((ans, i) => {
      if (!questions[i] || ans === undefined || ans === "") return false;
      const correctOption = getCorrectOption(questions[i]);
      if (!correctOption) return false;
      return ans === correctOption;
    }).length;
  }, [answers, questions]);

  // --- Fetch Questions ---
  const fetchQuestions = async (category: string) => {
    const res = await fetch("/api/questions", {
      method: "POST",
      body: JSON.stringify({ category }),
    });

    if (!res.ok) throw new Error("API error");

    const data = await res.json();

    if (!data.questions) throw new Error("Invalid API response");

    return data.questions;
  };

  useEffect(() => {
    async function load() {
      setLoadingQuestions(true);

      try {
        const qs = await fetchQuestions(category);

        // Validate the API data won't break your app
        const valid = Array.isArray(qs) && qs.length > 0;
        if (!valid) {
          throw new Error("Invalid API data");
        }

        setQuestions(qs);
        // --- ADDED: Set start time when questions load ---
        setStartTime(Date.now());
      } catch (err) {
        console.error("Failed to load from API:", err);

        // FALLBACK TO LOCAL QUESTIONS
        let fallback: any[] = [];

        if (category === "all") {
          fallback = [...allQuestions]
            .sort(() => 0.5 - Math.random())
            .slice(0, 10);
        } else {
          fallback = allQuestions.filter(
            (q) => q.category.toLowerCase() === category.toLowerCase()
          );

          if (fallback.length === 0) {
            fallback = [...allQuestions]
              .sort(() => 0.5 - Math.random())
              .slice(0, 10);
          } else {
            fallback = fallback.slice(0, 10);
          }
        }

        setQuestions(fallback);
        // --- ADDED: Set start time fallback ---
        setStartTime(Date.now()); 
        toast.error(
          "Couldn't fetch online questions — using offline questions"
        );
      }

      setLoadingQuestions(false);
    }

    load();
  }, [category]);

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
          if (answers[step] === undefined) handleAnswer("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, currentQuestion]);

  useEffect(() => {
    if (!questionFinished) return;

    if (step + 1 === questions.length) {
      // Calculate final score
      const correctCount = answers.filter((ans, i) => {
        if (!questions[i]) return false;
        const correctOption = getCorrectOption(questions[i]);
        if (!correctOption) return false;
        return ans === correctOption;
      }).length;

      setScore(correctCount);
    } else {
      setStep((prev) => prev + 1);
      setQuestionFinished(false);
    }
  }, [questionFinished, answers, questions, step]);


  // --- FIREBASE SAVE FUNCTION ---
  const saveToLeaderboard = async (finalScore: number, totalQs: number) => {
    // If user is not connected, we can't save to leaderboard securely (or save as Anonymous)
    // You can remove the 'if (!address)' check if you want to allow anonymous scores
    if (!address) {
       console.log("No wallet address found, skipping leaderboard save");
       return; 
    }

    try {
      const timeTaken = startTime ? Date.now() - startTime : 0;
      
      await addDoc(leaderboardCollection, {
        walletAddress: address, // The User ID
        score: finalScore,
        totalQuestions: totalQs,
        category: category,
        timeTakenMs: timeTaken, // Good for tie-breakers (fastest wins)
        createdAt: serverTimestamp(),
        date: new Date().toLocaleDateString()
      });
      console.log("Score saved to Firebase Leaderboard");
    } catch (error) {
      console.error("Error saving to leaderboard:", error);
    }
  };


  // --- Final Effect: Save & Show Claim Modal ---
  useEffect(() => {
    if (score === null) return;

    // 1. Save History Locally
    const newResult = {
      score: score,
      totalQuestions: questions.length,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
      category: category, 
    };

    try {
      const existingHistory = JSON.parse(
        localStorage.getItem("quizHistory") || "[]"
      );
      localStorage.setItem(
        "quizHistory",
        JSON.stringify([...existingHistory, newResult])
      );
    } catch (error) {
      console.error("Failed to save to local storage:", error);
    }

    // 2. --- SAVE TO FIREBASE LEADERBOARD ---
    // Only save if score is generated. 
    saveToLeaderboard(score, questions.length);
    // ---------------------------------------

    setShowClaimModal(true);
  
  }, [score, questions.length, category]);

  // --- UI Feedback ---
  useEffect(() => {
    if (!showFeedback) return;
    if (noAnswer) {
      // show the option text (resolved)
      const correctOption = getCorrectOption(currentQuestion);
      toast(
        `No answer selected. Correct: ${
          correctOption ?? currentQuestion?.answer
        }`
      );
    } else if (isCorrect) {
      toast.success("Correct! Nice job 🎉");
    } else {
      const correctOption = getCorrectOption(currentQuestion);
      toast.error(
        `Incorrect. Correct: ${correctOption ?? currentQuestion?.answer}`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFeedback, isCorrect, noAnswer, currentQuestion]);

  const handleAnswer = (option: string) => {
    if (!currentQuestion || hasAnswered) return;
    setHasAnswered(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const updatedAnswers = [...answers];
    updatedAnswers[step] = option;
    setAnswers(updatedAnswers);

    const correctOption = getCorrectOption(currentQuestion);
    const correct = option === correctOption;

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

  if (loadingQuestions) {
    return (
      <div>
        <LoadingScreen />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300 overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#2596be]/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-400/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-2xl"
      >
        {/* Your existing quiz UI... */}
        <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4">
          {/* Header Bar: Score & Progress */}
          <div className="flex flex-col gap-3">
            {/* Score and Timer Section */}
            <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
              {/* Running Score */}
              <div className="flex items-center gap-2 font-bold text-lg text-green-600 dark:text-green-400">
                <FaTrophy />
                <span className="text-zinc-900 dark:text-white">
                  {currentRunningScore}
                </span>
                <span className="text-zinc-500 font-medium text-sm">
                  Correct
                </span>
              </div>

              {/* Timer */}
              <div
                className={`flex items-center gap-2 font-bold px-3 py-1 rounded-full border transition-all duration-300 ${
                  timeLeft <= 5
                    ? "bg-rose-500/10 text-rose-500 border-rose-500/50 animate-pulse"
                    : "bg-[#2596be]/10 text-[#2596be] border-[#2596be]/50"
                }`}
              >
                <FaClock className="text-sm" />
                {timeLeft}s
              </div>
            </div>

            {/* Progress Bar (Question Counter) */}
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5 overflow-hidden">
              <motion.div
                className="h-2.5"
                style={{ backgroundColor: ACCENT_COLOR }}
                initial={{ width: 0 }}
                animate={{ width: `${((step + 1) / questions.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 text-right font-medium tracking-wide">
              Question {step + 1} of {questions.length}
            </div>
          </div>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            {currentQuestion && (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div className="bg-zinc-100 dark:bg-zinc-800/80 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-md mb-6">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white leading-relaxed">
                    {currentQuestion.question}
                  </h2>
                </div>

                <div className="grid gap-3">
                  {currentQuestion.options.map((option, index) => {
                    const userAnsweredThis = userAnswer !== undefined;
                    const correctOption = getCorrectOption(currentQuestion);
                    const isCurrentAnswer = option === userAnswer;
                    const isCorrectAnswer = option === correctOption;

                    let btnClass =
                      "border-zinc-300 dark:border-zinc-700 hover:border-[#2596be] dark:hover:border-[#2596be]/80";
                    let textClass = "text-zinc-900 dark:text-zinc-100";
                    let icon = (
                      <FaChevronRight className="text-xs text-zinc-400 dark:text-zinc-500" />
                    );

                    if (userAnsweredThis) {
                      if (isCorrectAnswer) {
                        btnClass =
                          "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/10";
                        textClass =
                          "text-emerald-600 dark:text-emerald-400 font-semibold";
                        icon = <FaCheckCircle className="text-emerald-500" />;
                      } else if (isCurrentAnswer) {
                        btnClass =
                          "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 shadow-md shadow-rose-500/10";
                        textClass =
                          "text-rose-600 dark:text-rose-400 font-semibold";
                        icon = <FaTimesCircle className="text-rose-500" />;
                      } else {
                        btnClass =
                          "border-zinc-300 dark:border-zinc-700 opacity-50 cursor-not-allowed";
                        textClass = "text-zinc-500 dark:text-zinc-500";
                        icon = (
                          <FaChevronRight className="text-xs text-zinc-400 dark:text-zinc-500" />
                        );
                      }
                    }

                    // Assigning A, B, C, D labels
                    const optionLabel = String.fromCharCode(65 + index);

                    return (
                      <button
                        key={option}
                        disabled={userAnsweredThis}
                        onClick={() => handleAnswer(option)}
                        className={`
                          w-full flex items-center justify-between p-2 rounded-xl text-left border transition-all duration-200
                          ${btnClass} ${
                          !userAnsweredThis &&
                          "hover:shadow-md hover:scale-[1.01]"
                        }
                        `}
                      >
                        <span
                          className={`font-semibold mr-3 w-5 text-center ${textClass}`}
                        >
                          {optionLabel}.
                        </span>
                        <span className={`flex-1 text-sm ${textClass}`}>
                          {option}
                        </span>
                        {icon}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      
      {score !== null && (
        <ClaimScreen
       
          initialScore={score}
          initialTotal={questions.length}
          initialCategory={category}
          // Also pass down a setter to close the modal
          onClose={() => setShowClaimModal(false)}
        />
      )}
    </div>
  );
}



// "use client";

// import { useEffect, useState, useRef, useMemo } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { allQuestions } from "@/app/quiz/data/questions";
// import { toast } from "sonner";
// import { useRouter, useSearchParams } from "next/navigation";
// import {
//   FaClock,
//   FaTrophy,
//   FaChevronRight,
//   FaCheckCircle,
//   FaTimesCircle,
// } from "react-icons/fa";
// import LoadingScreen from "@/components/Loading";
// import ClaimScreen from "../claim/ClaimScreen ";
// import { db, leaderboardCollection } from "@/lib/firebase"; // Adjust path as needed
// import { addDoc } from "firebase/firestore"; // Import addDoc

// const ACCENT_COLOR = "#2596be";

// export default function QuizGame() {
//   const [step, setStep] = useState(0);
//   const [answers, setAnswers] = useState<string[]>([]);
//   const [score, setScore] = useState<number | null>(null);
//   const [showFeedback, setShowFeedback] = useState(false);
//   const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
//   const [timeLeft, setTimeLeft] = useState(15);
//   const [noAnswer, setNoAnswer] = useState(false);
//   const [questionFinished, setQuestionFinished] = useState(false);
//   const [questions, setQuestions] = useState<typeof allQuestions>([]);
//   const [loadingQuestions, setLoadingQuestions] = useState(true);
//   const [hasAnswered, setHasAnswered] = useState(false);
  
//   // **********************************************
//   // 2. MODAL STATE: Use this to control the ClaimScreen visibility
//   const [showClaimModal, setShowClaimModal] = useState(false);
//   // **********************************************

//   const timerRef = useRef<NodeJS.Timeout | null>(null);
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const category = searchParams.get("category") || "all";

//   // --- Helper to convert letter to index ---
//   const letterToIndex = (letter: string) => {
//     const map: any = { A: 0, B: 1, C: 2, D: 3 };
//     return map[letter];
//   };

//   // --- New helper: robustly get the correct option text from a question ---
//   const getCorrectOption = (q: any) => {
//     if (!q) return undefined;
//     const ans = q.answer;
//     if (typeof ans === "string") {
//       const trimmed = ans.trim();

//       // if it's a single letter A-D
//       if (/^[A-D]$/i.test(trimmed)) {
//         const idx = letterToIndex(trimmed.toUpperCase());
//         return q.options?.[idx];
//       }

//       // if the answer already matches one of the option texts
//       if (Array.isArray(q.options)) {
//         const found = q.options.find((opt: string) => opt === ans);
//         if (found) return found;
//       }

//       // defensive: if it's numeric in string form
//       const num = Number(trimmed);
//       if (!Number.isNaN(num) && Array.isArray(q.options)) {
//         return q.options[num];
//       }
//     }

//     // if answer provided as index number
//     if (typeof ans === "number" && Array.isArray(q.options)) {
//       return q.options[ans];
//     }

//     return undefined;
//   };

//   // --- CALCULATE RUNNING SCORE (New logic for UI display) ---
//   const currentRunningScore = useMemo(() => {
//     return answers.filter((ans, i) => {
//       if (!questions[i] || ans === undefined || ans === "") return false;
//       const correctOption = getCorrectOption(questions[i]);
//       if (!correctOption) return false;
//       return ans === correctOption;
//     }).length;
//   }, [answers, questions]);

//   // --- Fetch Questions ---
//   const fetchQuestions = async (category: string) => {
//     const res = await fetch("/api/questions", {
//       method: "POST",
//       body: JSON.stringify({ category }),
//     });

//     if (!res.ok) throw new Error("API error");

//     const data = await res.json();

//     if (!data.questions) throw new Error("Invalid API response");

//     return data.questions;
//   };

//   useEffect(() => {
//     async function load() {
//       setLoadingQuestions(true);

//       try {
//         const qs = await fetchQuestions(category);

//         // Validate the API data won't break your app
//         const valid = Array.isArray(qs) && qs.length > 0;
//         if (!valid) {
//           throw new Error("Invalid API data");
//         }

//         setQuestions(qs);
//       } catch (err) {
//         console.error("Failed to load from API:", err);

//         // FALLBACK TO LOCAL QUESTIONS
//         let fallback: any[] = [];

//         if (category === "all") {
//           fallback = [...allQuestions]
//             .sort(() => 0.5 - Math.random())
//             .slice(0, 10);
//         } else {
//           fallback = allQuestions.filter(
//             (q) => q.category.toLowerCase() === category.toLowerCase()
//           );

//           if (fallback.length === 0) {
//             fallback = [...allQuestions]
//               .sort(() => 0.5 - Math.random())
//               .slice(0, 10);
//           } else {
//             fallback = fallback.slice(0, 10);
//           }
//         }

//         setQuestions(fallback);
//         toast.error(
//           "Couldn't fetch online questions — using offline questions"
//         );
//       }

//       setLoadingQuestions(false);
//     }

//     load();
//   }, [category]);

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
//           if (answers[step] === undefined) handleAnswer("");
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);

//     return () => {
//       if (timerRef.current) clearInterval(timerRef.current);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [step, currentQuestion]);

//   useEffect(() => {
//     if (!questionFinished) return;

//     if (step + 1 === questions.length) {
//       // Calculate final score
//       const correctCount = answers.filter((ans, i) => {
//         if (!questions[i]) return false;
//         const correctOption = getCorrectOption(questions[i]);
//         if (!correctOption) return false;
//         return ans === correctOption;
//       }).length;

//       setScore(correctCount);
//     } else {
//       setStep((prev) => prev + 1);
//       setQuestionFinished(false);
//     }
//   }, [questionFinished, answers, questions, step]);

//   // --- Final Effect: Save & Show Claim Modal ---
//   useEffect(() => {
//     if (score === null) return;

//     // 1. Save History Locally
//     const newResult = {
//       score: score,
//       totalQuestions: questions.length,
//       date: new Date().toLocaleDateString(),
//       time: new Date().toLocaleTimeString(),
//       timestamp: Date.now(),
//       category: category, // Save category for complete history
//     };

//     try {
//       const existingHistory = JSON.parse(
//         localStorage.getItem("quizHistory") || "[]"
//       );
//       localStorage.setItem(
//         "quizHistory",
//         JSON.stringify([...existingHistory, newResult])
//       );
//     } catch (error) {
//       console.error("Failed to save to local storage:", error);
//     }

//     setShowClaimModal(true);
  
//   }, [score, questions.length, category]);

//   // --- UI Feedback ---
//   useEffect(() => {
//     if (!showFeedback) return;
//     if (noAnswer) {
//       // show the option text (resolved)
//       const correctOption = getCorrectOption(currentQuestion);
//       toast(
//         `No answer selected. Correct: ${
//           correctOption ?? currentQuestion?.answer
//         }`
//       );
//     } else if (isCorrect) {
//       toast.success("Correct! Nice job 🎉");
//     } else {
//       const correctOption = getCorrectOption(currentQuestion);
//       toast.error(
//         `Incorrect. Correct: ${correctOption ?? currentQuestion?.answer}`
//       );
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [showFeedback, isCorrect, noAnswer, currentQuestion]);

//   const handleAnswer = (option: string) => {
//     if (!currentQuestion || hasAnswered) return;
//     setHasAnswered(true);
//     if (timerRef.current) clearInterval(timerRef.current);

//     const updatedAnswers = [...answers];
//     updatedAnswers[step] = option;
//     setAnswers(updatedAnswers);

//     const correctOption = getCorrectOption(currentQuestion);
//     const correct = option === correctOption;

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

//   if (loadingQuestions) {
//     return (
//       <div>
//         <LoadingScreen />
//       </div>
//     );
//   }

//   return (
//     <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300 overflow-hidden">
//       {/* Ambient Background Glows */}
//       <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#2596be]/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
//       <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-400/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />

//       <motion.div
//         initial={{ opacity: 0, scale: 0.95 }}
//         animate={{ opacity: 1, scale: 1 }}
//         transition={{ duration: 0.6 }}
//         className="relative z-10 w-full max-w-2xl"
//       >
//         {/* Your existing quiz UI... */}
//         <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4">
//           {/* Header Bar: Score & Progress */}
//           <div className="flex flex-col gap-3">
//             {/* Score and Timer Section */}
//             <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
//               {/* Running Score */}
//               <div className="flex items-center gap-2 font-bold text-lg text-green-600 dark:text-green-400">
//                 <FaTrophy />
//                 <span className="text-zinc-900 dark:text-white">
//                   {currentRunningScore}
//                 </span>
//                 <span className="text-zinc-500 font-medium text-sm">
//                   Correct
//                 </span>
//               </div>

//               {/* Timer */}
//               <div
//                 className={`flex items-center gap-2 font-bold px-3 py-1 rounded-full border transition-all duration-300 ${
//                   timeLeft <= 5
//                     ? "bg-rose-500/10 text-rose-500 border-rose-500/50 animate-pulse"
//                     : "bg-[#2596be]/10 text-[#2596be] border-[#2596be]/50"
//                 }`}
//               >
//                 <FaClock className="text-sm" />
//                 {timeLeft}s
//               </div>
//             </div>

//             {/* Progress Bar (Question Counter) */}
//             <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5 overflow-hidden">
//               <motion.div
//                 className="h-2.5"
//                 style={{ backgroundColor: ACCENT_COLOR }}
//                 initial={{ width: 0 }}
//                 animate={{ width: `${((step + 1) / questions.length) * 100}%` }}
//                 transition={{ duration: 0.3 }}
//               />
//             </div>
//             <div className="text-sm text-zinc-500 dark:text-zinc-400 text-right font-medium tracking-wide">
//               Question {step + 1} of {questions.length}
//             </div>
//           </div>

//           {/* Question Card */}
//           <AnimatePresence mode="wait">
//             {currentQuestion && (
//               <motion.div
//                 key={step}
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: -20 }}
//                 transition={{ duration: 0.4 }}
//               >
//                 <div className="bg-zinc-100 dark:bg-zinc-800/80 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-md mb-6">
//                   <h2 className="text-xl font-bold text-zinc-900 dark:text-white leading-relaxed">
//                     {currentQuestion.question}
//                   </h2>
//                 </div>

//                 <div className="grid gap-3">
//                   {currentQuestion.options.map((option, index) => {
//                     const userAnsweredThis = userAnswer !== undefined;
//                     const correctOption = getCorrectOption(currentQuestion);
//                     const isCurrentAnswer = option === userAnswer;
//                     const isCorrectAnswer = option === correctOption;

//                     let btnClass =
//                       "border-zinc-300 dark:border-zinc-700 hover:border-[#2596be] dark:hover:border-[#2596be]/80";
//                     let textClass = "text-zinc-900 dark:text-zinc-100";
//                     let icon = (
//                       <FaChevronRight className="text-xs text-zinc-400 dark:text-zinc-500" />
//                     );

//                     if (userAnsweredThis) {
//                       if (isCorrectAnswer) {
//                         btnClass =
//                           "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/10";
//                         textClass =
//                           "text-emerald-600 dark:text-emerald-400 font-semibold";
//                         icon = <FaCheckCircle className="text-emerald-500" />;
//                       } else if (isCurrentAnswer) {
//                         btnClass =
//                           "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 shadow-md shadow-rose-500/10";
//                         textClass =
//                           "text-rose-600 dark:text-rose-400 font-semibold";
//                         icon = <FaTimesCircle className="text-rose-500" />;
//                       } else {
//                         btnClass =
//                           "border-zinc-300 dark:border-zinc-700 opacity-50 cursor-not-allowed";
//                         textClass = "text-zinc-500 dark:text-zinc-500";
//                         icon = (
//                           <FaChevronRight className="text-xs text-zinc-400 dark:text-zinc-500" />
//                         );
//                       }
//                     }

//                     // Assigning A, B, C, D labels
//                     const optionLabel = String.fromCharCode(65 + index);

//                     return (
//                       <button
//                         key={option}
//                         disabled={userAnsweredThis}
//                         onClick={() => handleAnswer(option)}
//                         className={`
//                           w-full flex items-center justify-between p-2 rounded-xl text-left border transition-all duration-200
//                           ${btnClass} ${
//                           !userAnsweredThis &&
//                           "hover:shadow-md hover:scale-[1.01]"
//                         }
//                         `}
//                       >
//                         <span
//                           className={`font-semibold mr-3 w-5 text-center ${textClass}`}
//                         >
//                           {optionLabel}.
//                         </span>
//                         <span className={`flex-1 text-sm ${textClass}`}>
//                           {option}
//                         </span>
//                         {icon}
//                       </button>
//                     );
//                   })}
//                 </div>
//               </motion.div>
//             )}
//           </AnimatePresence>
//         </div>
//       </motion.div>
      
//       {score !== null && (
//         <ClaimScreen
       
//           initialScore={score}
//           initialTotal={questions.length}
//           initialCategory={category}
//           // Also pass down a setter to close the modal
//           onClose={() => setShowClaimModal(false)}
//         />
//       )}
//     </div>
//   );
// }


// "use client";

// import { useEffect, useState, useRef, useMemo } from "react"; 
// import { motion, AnimatePresence } from "framer-motion";
// import { allQuestions } from "@/app/quiz/data/questions";
// import { toast } from "sonner";
// import { useRouter, useSearchParams } from "next/navigation";
// import {
//   FaClock,
//   FaTrophy,
//   FaChevronRight,
//   FaCheckCircle,
//   FaTimesCircle,
// } from "react-icons/fa"; 
// import LoadingScreen from "@/components/Loading";

// // Define the primary accent color
// const ACCENT_COLOR = "#2596be";

// export default function QuizGame() {
//   const [step, setStep] = useState(0);
//   const [answers, setAnswers] = useState<string[]>([]);
//   const [score, setScore] = useState<number | null>(null);
//   const [showFeedback, setShowFeedback] = useState(false);
//   const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
//   const [timeLeft, setTimeLeft] = useState(15);
//   const [noAnswer, setNoAnswer] = useState(false);
//   const [questionFinished, setQuestionFinished] = useState(false);
//   const [questions, setQuestions] = useState<typeof allQuestions>([]);
//   const [loadingQuestions, setLoadingQuestions] = useState(true);
//   const [hasAnswered, setHasAnswered] = useState(false);

//   const timerRef = useRef<NodeJS.Timeout | null>(null);
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const category = searchParams.get("category") || "all";

//   // --- Helper to convert letter to index ---
//   const letterToIndex = (letter: string) => {
//     const map: any = { A: 0, B: 1, C: 2, D: 3 };
//     return map[letter];
//   };

//   // --- New helper: robustly get the correct option text from a question ---
//   const getCorrectOption = (q: any) => {
//     if (!q) return undefined;
//     const ans = q.answer;
//     if (typeof ans === "string") {
//       const trimmed = ans.trim();

//       // if it's a single letter A-D
//       if (/^[A-D]$/i.test(trimmed)) {
//         const idx = letterToIndex(trimmed.toUpperCase());
//         return q.options?.[idx];
//       }

//       // if the answer already matches one of the option texts
//       if (Array.isArray(q.options)) {
//         const found = q.options.find((opt: string) => opt === ans);
//         if (found) return found;
//       }

//       // defensive: if it's numeric in string form
//       const num = Number(trimmed);
//       if (!Number.isNaN(num) && Array.isArray(q.options)) {
//         return q.options[num];
//       }
//     }

//     // if answer provided as index number
//     if (typeof ans === "number" && Array.isArray(q.options)) {
//       return q.options[ans];
//     }

//     return undefined;
//   };

//   // --- CALCULATE RUNNING SCORE (New logic for UI display) ---
//   const currentRunningScore = useMemo(() => {
//     return answers.filter((ans, i) => {
//       if (!questions[i] || ans === undefined || ans === "") return false;
//       const correctOption = getCorrectOption(questions[i]);
//       if (!correctOption) return false;
//       return ans === correctOption;
//     }).length;
//   }, [answers, questions]);

//   // --- Fetch Questions ---
//   const fetchQuestions = async (category: string) => {
//     const res = await fetch("/api/questions", {
//       method: "POST",
//       body: JSON.stringify({ category }),
//     });

//     if (!res.ok) throw new Error("API error");

//     const data = await res.json();

//     if (!data.questions) throw new Error("Invalid API response");

//     return data.questions;
//   };

//   useEffect(() => {
//     async function load() {
//       setLoadingQuestions(true);

//       try {
//         const qs = await fetchQuestions(category);

//         // Validate the API data won't break your app
//         const valid = Array.isArray(qs) && qs.length > 0;
//         if (!valid) {
//           throw new Error("Invalid API data");
//         }

//         setQuestions(qs);
//       } catch (err) {
//         console.error("Failed to load from API:", err);

//         // FALLBACK TO LOCAL QUESTIONS
//         let fallback: any[] = [];

//         if (category === "all") {
//           fallback = [...allQuestions]
//             .sort(() => 0.5 - Math.random())
//             .slice(0, 10);
//         } else {
//           fallback = allQuestions.filter(
//             (q) => q.category.toLowerCase() === category.toLowerCase()
//           );

//           if (fallback.length === 0) {
//             fallback = [...allQuestions]
//               .sort(() => 0.5 - Math.random())
//               .slice(0, 10);
//           } else {
//             fallback = fallback.slice(0, 10);
//           }
//         }

//         setQuestions(fallback);
//         toast.error(
//           "Couldn't fetch online questions — using offline questions"
//         );
//       }

//       setLoadingQuestions(false);
//     }

//     load();
//   }, [category]);

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
//           if (answers[step] === undefined) handleAnswer("");
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);

//     return () => {
//       if (timerRef.current) clearInterval(timerRef.current);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [step, currentQuestion]);

//   useEffect(() => {
//     if (!questionFinished) return;

//     if (step + 1 === questions.length) {
//       // Calculate final score
//       const correctCount = answers.filter((ans, i) => {
//         if (!questions[i]) return false;
//         const correctOption = getCorrectOption(questions[i]);
//         if (!correctOption) return false;
//         return ans === correctOption;
//       }).length;

//       setScore(correctCount);
//     } else {
//       setStep((prev) => prev + 1);
//       setQuestionFinished(false);
//     }
//   }, [questionFinished, answers, questions, step]);

//   // --- Final Effect: Save & Redirect to Claim Screen ---
//   useEffect(() => {
//     if (score === null) return;

//     // 1. Save History Locally
//     const newResult = {
//       score: score,
//       totalQuestions: questions.length,
//       date: new Date().toLocaleDateString(),
//       time: new Date().toLocaleTimeString(),
//       timestamp: Date.now(),
//     };

//     try {
//       const existingHistory = JSON.parse(
//         localStorage.getItem("quizHistory") || "[]"
//       );
//       localStorage.setItem(
//         "quizHistory",
//         JSON.stringify([...existingHistory, newResult])
//       );
//     } catch (error) {
//       console.error("Failed to save to local storage:", error);
//     }

//     // 2. Redirect to Claim Screen
//    router.push(`/claim?score=${score}&total=${questions.length}&category=${category}`);
//   }, [score, questions.length, router, category]);
//   // --- UI Feedback ---
//   useEffect(() => {
//     if (!showFeedback) return;
//     if (noAnswer) {
//       // show the option text (resolved)
//       const correctOption = getCorrectOption(currentQuestion);
//       toast(
//         `No answer selected. Correct: ${
//           correctOption ?? currentQuestion?.answer
//         }`
//       );
//     } else if (isCorrect) {
//       toast.success("Correct! Nice job 🎉");
//     } else {
//       const correctOption = getCorrectOption(currentQuestion);
//       toast.error(
//         `Incorrect. Correct: ${correctOption ?? currentQuestion?.answer}`
//       );
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [showFeedback, isCorrect, noAnswer, currentQuestion]);

//   const handleAnswer = (option: string) => {
//     if (!currentQuestion || hasAnswered) return;
//     setHasAnswered(true);
//     if (timerRef.current) clearInterval(timerRef.current);

//     const updatedAnswers = [...answers];
//     updatedAnswers[step] = option;
//     setAnswers(updatedAnswers);

//     const correctOption = getCorrectOption(currentQuestion);
//     const correct = option === correctOption;

//     setIsCorrect(correct);
//     setNoAnswer(option === "");
//     setShowFeedback(true);

//     setTimeout(() => {
//       setShowFeedback(false);
//       setIsCorrect(null);
//       setNoAnswer(false);
//       setQuestionFinished(true);
//       setHasAnswered(false);
//     }, 2000); // 2 second delay before next question
//   };

//   if (loadingQuestions) {
//     return (
//       <div>
//         <LoadingScreen />
//       </div>
//     );
//   }

//   return (
//     <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300 overflow-hidden">
//       {/* Ambient Background Glows */}
//       <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#2596be]/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
//       <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-400/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />

//       <motion.div
//         initial={{ opacity: 0, scale: 0.95 }}
//         animate={{ opacity: 1, scale: 1 }}
//         transition={{ duration: 0.6 }}
//         className="relative z-10 w-full max-w-2xl"
//       >
//         {/* Glass Card Container */}
//         <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4">
//           {/* Header Bar: Score & Progress */}
//           <div className="flex flex-col gap-3">
//             {/* Score and Timer Section */}
//             <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
//               {/* Running Score */}
//               <div className="flex items-center gap-2 font-bold text-lg text-green-600 dark:text-green-400">
//                 <FaTrophy />
//                 <span className="text-zinc-900 dark:text-white">
//                   {currentRunningScore}
//                 </span>
//                 <span className="text-zinc-500 font-medium text-sm">
//                   Correct
//                 </span>
//               </div>

//               {/* Timer */}
//               <div
//                 className={`flex items-center gap-2 font-bold px-3 py-1 rounded-full border transition-all duration-300 ${
//                   timeLeft <= 5
//                     ? "bg-rose-500/10 text-rose-500 border-rose-500/50 animate-pulse"
//                     : "bg-[#2596be]/10 text-[#2596be] border-[#2596be]/50"
//                 }`}
//               >
//                 <FaClock className="text-sm" />
//                 {timeLeft}s
//               </div>
//             </div>

//             {/* Progress Bar (Question Counter) */}
//             <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5 overflow-hidden">
//               <motion.div
//                 className="h-2.5"
//                 style={{ backgroundColor: ACCENT_COLOR }}
//                 initial={{ width: 0 }}
//                 animate={{ width: `${((step + 1) / questions.length) * 100}%` }}
//                 transition={{ duration: 0.3 }}
//               />
//             </div>
//             <div className="text-sm text-zinc-500 dark:text-zinc-400 text-right font-medium tracking-wide">
//               Question {step + 1} of {questions.length}
//             </div>
//           </div>

//           {/* Question Card */}
//           <AnimatePresence mode="wait">
//             {currentQuestion && (
//               <motion.div
//                 key={step}
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: -20 }}
//                 transition={{ duration: 0.4 }}
//               >
//                 <div className="bg-zinc-100 dark:bg-zinc-800/80 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-md mb-6">
//                   <h2 className="text-xl font-bold text-zinc-900 dark:text-white leading-relaxed">
//                     {currentQuestion.question}
//                   </h2>
//                 </div>

//                 <div className="grid gap-3">
//                   {currentQuestion.options.map((option, index) => {
//                     const userAnsweredThis = userAnswer !== undefined;
//                     const correctOption = getCorrectOption(currentQuestion);
//                     const isCurrentAnswer = option === userAnswer;
//                     const isCorrectAnswer = option === correctOption;

//                     let btnClass =
//                       "border-zinc-300 dark:border-zinc-700 hover:border-[#2596be] dark:hover:border-[#2596be]/80";
//                     let textClass = "text-zinc-900 dark:text-zinc-100";
//                     let icon = (
//                       <FaChevronRight className="text-xs text-zinc-400 dark:text-zinc-500" />
//                     );

//                     if (userAnsweredThis) {
//                       if (isCorrectAnswer) {
//                         btnClass =
//                           "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/10";
//                         textClass =
//                           "text-emerald-600 dark:text-emerald-400 font-semibold";
//                         icon = <FaCheckCircle className="text-emerald-500" />;
//                       } else if (isCurrentAnswer) {
//                         btnClass =
//                           "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 shadow-md shadow-rose-500/10";
//                         textClass =
//                           "text-rose-600 dark:text-rose-400 font-semibold";
//                         icon = <FaTimesCircle className="text-rose-500" />;
//                       } else {
//                         btnClass =
//                           "border-zinc-300 dark:border-zinc-700 opacity-50 cursor-not-allowed";
//                         textClass = "text-zinc-500 dark:text-zinc-500";
//                         icon = (
//                           <FaChevronRight className="text-xs text-zinc-400 dark:text-zinc-500" />
//                         );
//                       }
//                     }

//                     // Assigning A, B, C, D labels
//                     const optionLabel = String.fromCharCode(65 + index);

//                     return (
//                       <button
//                         key={option}
//                         disabled={userAnsweredThis}
//                         onClick={() => handleAnswer(option)}
//                         className={`
//                           w-full flex items-center justify-between p-2 rounded-xl text-left border transition-all duration-200
//                           ${btnClass} ${
//                           !userAnsweredThis &&
//                           "hover:shadow-md hover:scale-[1.01]"
//                         }
//                         `}
//                       >
//                         <span
//                           className={`font-semibold mr-3 w-5 text-center ${textClass}`}
//                         >
//                           {optionLabel}.
//                         </span>
//                         <span className={`flex-1 text-sm ${textClass}`}>
//                           {option}
//                         </span>
//                         {icon}
//                       </button>
//                     );
//                   })}
//                 </div>
//               </motion.div>
//             )}
//           </AnimatePresence>
//         </div>
//       </motion.div>
//     </div>
//   );
// }

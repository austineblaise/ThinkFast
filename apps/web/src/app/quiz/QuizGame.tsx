// "use client";

// import { useEffect, useState, useRef } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { allQuestions } from "@/app/quiz/data/questions";
// import { toast } from "sonner";
// import { useRouter, useSearchParams } from "next/navigation";

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

//   // --- Fetch Questions ---
//   const fetchQuestions = async (category: string) => {
//     // Note: Ensure your API route handles this correctly
//     const res = await fetch("/api/questions", {
//       method: "POST",
//       body: JSON.stringify({ category }),
//     });
//     const data = await res.json();
//     return data.questions || [];
//   };

//   useEffect(() => {
//     async function load() {
//       setLoadingQuestions(true);
//       try {
//         const qs = await fetchQuestions(category);
//         setQuestions(qs);
//       } catch (e) {
//         console.error("Failed to load questions", e);
//         // Fallback to local questions if API fails
//         setQuestions(allQuestions.slice(0, 10));
//       } finally {
//         setLoadingQuestions(false);
//       }
//     }
//     load();
//   }, [category]);

//   // --- Game Logic ---
//   const currentQuestion = questions[step];
//   const userAnswer = answers[step];

//   const letterToIndex = (letter: string) => {
//     const map: any = { A: 0, B: 1, C: 2, D: 3 };
//     return map[letter];
//   };

//   // Timer Logic
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
//   }, [step, currentQuestion]);

//   // Handle Score Calculation & Redirect
//   useEffect(() => {
//     if (!questionFinished) return;

//     if (step + 1 === questions.length) {
//       // Calculate final score
//       const correctCount = answers.filter((ans, i) => {
//         if (!questions[i]) return false;
//         const correctIndex = letterToIndex(questions[i].answer);
//         const correctOption = questions[i].options[correctIndex];
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
//       const existingHistory = JSON.parse(localStorage.getItem("quizHistory") || "[]");
//       localStorage.setItem("quizHistory", JSON.stringify([...existingHistory, newResult]));
//     } catch (error) {
//       console.error("Failed to save to local storage:", error);
//     }

//     // 2. Redirect to Claim Screen
//     router.push(`/claim?score=${score}&total=${questions.length}`);

//   }, [score, questions.length, router]);

//   // --- UI Feedback ---
//   useEffect(() => {
//     if (!showFeedback) return;
//     if (noAnswer) {
//       toast(`No answer selected. Correct: ${currentQuestion?.answer}`);
//     } else if (isCorrect) {
//       toast.success("Correct! Nice job 🎉");
//     } else {
//       toast.error(`Incorrect. Correct: ${currentQuestion?.answer}`);
//     }
//   }, [showFeedback, isCorrect, noAnswer, currentQuestion]);

//   const handleAnswer = (option: string) => {
//     if (!currentQuestion || hasAnswered) return;
//     setHasAnswered(true);
//     if (timerRef.current) clearInterval(timerRef.current);

//     const updatedAnswers = [...answers];
//     updatedAnswers[step] = option;
//     setAnswers(updatedAnswers);

//     const correctIndex = letterToIndex(currentQuestion.answer);
//     const correctOption = currentQuestion.options[correctIndex];
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
//       <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#17111F]">
//         <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-xl text-purple-500">
//            Loading Quiz...
//         </motion.p>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center p-6 bg-white dark:bg-[#17111F] transition-colors duration-300">
//       <div className="w-full max-w-2xl p-6 rounded-2xl shadow-2xl space-y-6 relative bg-[#E6E6FA] dark:bg-[#17111F]">
//         {/* Progress Bar */}
//         <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
//           <motion.div
//             className="h-4 bg-[#17111F] dark:bg-[#E6E6FA]"
//             initial={{ width: 0 }}
//             animate={{ width: `${((step + 1) / questions.length) * 100}%` }}
//             transition={{ duration: 0.3 }}
//           />
//         </div>

//         <div className="flex justify-between items-center text-sm text-[#17111F] dark:text-gray-200">
//           <span>Question {step + 1} of {questions.length}</span>
//           <span>⏱ {timeLeft}s</span>
//         </div>

//         {/* Question Card */}
//         <AnimatePresence mode="wait">
//           {currentQuestion && (
//             <motion.div
//               key={step}
//               initial={{ opacity: 0, x: 50 }}
//               animate={{ opacity: 1, x: 0 }}
//               exit={{ opacity: 0, x: -50 }}
//               transition={{ duration: 0.4 }}
//             >
//               <h2 className="text-lg font-semibold text-[#17111F] dark:text-gray-100 mb-4">
//                 {currentQuestion.question}
//               </h2>

//               <div className="grid gap-3">
//                 {currentQuestion.options.map((option) => {
//                    const userAnsweredThis = userAnswer !== undefined;
//                    const correctIndex = letterToIndex(currentQuestion.answer);
//                    const correctOption = currentQuestion.options[correctIndex];

//                    let btnClass = "border-gray-300 dark:border-gray-600 hover:border-[#17111F]";
//                    if (userAnsweredThis) {
//                      if (option === correctOption) btnClass = "bg-green-100 dark:bg-green-900/40 border-green-500";
//                      else if (option === userAnswer) btnClass = "bg-red-100 dark:bg-red-900/40 border-red-500";
//                      else btnClass = "border-gray-300 dark:border-gray-600 opacity-50";
//                    }

//                   return (
//                     <button
//                       key={option}
//                       disabled={userAnsweredThis}
//                       onClick={() => handleAnswer(option)}
//                       className={`px-4 py-3 rounded-lg text-left border transition-all text-[#17111F] dark:text-gray-100 ${btnClass}`}
//                     >
//                       {option}
//                     </button>
//                   );
//                 })}
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useState, useRef, useMemo } from "react"; // Added useMemo for score calculation
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
} from "react-icons/fa"; // Added icons

// Define the primary accent color
const ACCENT_COLOR = "#2596be";

export default function QuizGame() {
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
    // Note: Ensure your API route handles this correctly
    const res = await fetch("/api/questions", {
      method: "POST",
      body: JSON.stringify({ category }),
    });
    const data = await res.json();
    return data.questions;
  };

  useEffect(() => {
    async function load() {
      setLoadingQuestions(true);

      // --- Timeout wrapper (4 seconds) ---
      const fetchWithTimeout = (ms: number) => {
        return new Promise(async (resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("timeout")), ms);

          try {
            const qs = await fetchQuestions(category);
            clearTimeout(timeout);
            resolve(qs);
          } catch (err) {
            clearTimeout(timeout);
            reject(err);
          }
        });
      };

      try {
        // Try fetching with 4s timeout
        const qs: any = await fetchWithTimeout(4000);
        setQuestions(qs);
      } catch (e) {
        console.error("API fetch failed or timed out:", e);

        // --- FALLBACK TO LOCAL QUESTIONS ---
        let fallback: any[] = [];

        if (category === "all") {
          // give 10 random questions from all categories
          fallback = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, 10);
        } else {
          // filter by category
          fallback = allQuestions.filter((q) =>
            q.category.toLowerCase() === category.toLowerCase()
          );

          // if not enough, still slice max 10
          fallback = fallback.slice(0, 10);

          // If no local match at all, fallback to full random 10
          if (fallback.length === 0) {
            fallback = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, 10);
          }
        }

        setQuestions(fallback);
        toast.error("Network issue — using offline questions");
      }

      setLoadingQuestions(false);
    }

    load();
  }, [category]);

  // --- Game Logic ---
  const currentQuestion = questions[step];
  const userAnswer = answers[step];

  // Timer Logic
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

  // Handle Score Calculation & Redirect
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

  // --- Final Effect: Save & Redirect to Claim Screen ---
  useEffect(() => {
    if (score === null) return;

    // 1. Save History Locally
    const newResult = {
      score: score,
      totalQuestions: questions.length,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
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

    // 2. Redirect to Claim Screen
    router.push(`/claim?score=${score}&total=${questions.length}`);
  }, [score, questions.length, router]);

  // --- UI Feedback ---
  useEffect(() => {
    if (!showFeedback) return;
    if (noAnswer) {
      // show the option text (resolved)
      const correctOption = getCorrectOption(currentQuestion);
      toast(`No answer selected. Correct: ${correctOption ?? currentQuestion?.answer}`);
    } else if (isCorrect) {
      toast.success("Correct! Nice job 🎉");
    } else {
      const correctOption = getCorrectOption(currentQuestion);
      toast.error(`Incorrect. Correct: ${correctOption ?? currentQuestion?.answer}`);
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
    }, 2000); // 2 second delay before next question
  };

  if (loadingQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-xl text-[#2596be]"
        >
          Loading Quiz...
        </motion.p>
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
        {/* Glass Card Container */}
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
    </div>
  );
}


// "use client";

// import { useEffect, useState, useRef } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { allQuestions } from "@/app/quiz/data/questions";
// import { toast } from "sonner";
// import { useRouter, useSearchParams } from "next/navigation";

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

//   // --- Fetch Questions ---
//   const fetchQuestions = async (category: string) => {
//     // Note: Ensure your API route handles this correctly
//     const res = await fetch("/api/questions", {
//       method: "POST",
//       body: JSON.stringify({ category }),
//     });
//     const data = await res.json();
//     return data.questions;
//   };

//   useEffect(() => {
//     async function load() {
//       setLoadingQuestions(true);
//       try {
//         const qs = await fetchQuestions(category);
//         setQuestions(qs);
//       } catch (e) {
//         console.error("Failed to load questions", e);
//         // Fallback to local questions if API fails
//         setQuestions(allQuestions.slice(0, 10));
//       } finally {
//         setLoadingQuestions(false);
//       }
//     }
//     load();
//   }, [category]);

//   // --- Game Logic ---
//   const currentQuestion = questions[step];
//   const userAnswer = answers[step];

//   const letterToIndex = (letter: string) => {
//     const map: any = { A: 0, B: 1, C: 2, D: 3 };
//     return map[letter];
//   };

//   // Timer Logic
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
//   }, [step, currentQuestion]);

//   // Handle Score Calculation & Redirect
//   useEffect(() => {
//     if (!questionFinished) return;

//     if (step + 1 === questions.length) {
//       // Calculate final score
//       const correctCount = answers.filter((ans, i) => {
//         if (!questions[i]) return false;
//         const correctIndex = letterToIndex(questions[i].answer);
//         const correctOption = questions[i].options[correctIndex];
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
//     router.push(`/claim?score=${score}&total=${questions.length}`);
//   }, [score, questions.length, router]);

//   // --- UI Feedback ---
//   useEffect(() => {
//     if (!showFeedback) return;
//     if (noAnswer) {
//       toast(`No answer selected. Correct: ${currentQuestion?.answer}`);
//     } else if (isCorrect) {
//       toast.success("Correct! Nice job 🎉");
//     } else {
//       toast.error(`Incorrect. Correct: ${currentQuestion?.answer}`);
//     }
//   }, [showFeedback, isCorrect, noAnswer, currentQuestion]);

//   const handleAnswer = (option: string) => {
//     if (!currentQuestion || hasAnswered) return;
//     setHasAnswered(true);
//     if (timerRef.current) clearInterval(timerRef.current);

//     const updatedAnswers = [...answers];
//     updatedAnswers[step] = option;
//     setAnswers(updatedAnswers);

//     const correctIndex = letterToIndex(currentQuestion.answer);
//     const correctOption = currentQuestion.options[correctIndex];
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
//       <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#17111F]">
//         <motion.p
//           animate={{ opacity: [0.5, 1, 0.5] }}
//           transition={{ repeat: Infinity, duration: 1.5 }}
//           className="text-xl text-purple-500"
//         >
//           Loading Quiz...
//         </motion.p>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center p-6 bg-white dark:bg-[#17111F] transition-colors duration-300">
//       <div className="w-full max-w-2xl p-6 rounded-2xl shadow-2xl space-y-6 relative bg-[#E6E6FA] dark:bg-[#17111F]">
//         {/* Progress Bar */}
//         <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
//           <motion.div
//             className="h-4 bg-[#17111F] dark:bg-[#E6E6FA]"
//             initial={{ width: 0 }}
//             animate={{ width: `${((step + 1) / questions.length) * 100}%` }}
//             transition={{ duration: 0.3 }}
//           />
//         </div>

//         <div className="flex justify-between items-center text-sm text-[#17111F] dark:text-gray-200">
//           <span>
//             Question {step + 1} of {questions.length}
//           </span>
//           <span>⏱ {timeLeft}s</span>
//         </div>

//         {/* Question Card */}
//         <AnimatePresence mode="wait">
//           {currentQuestion && (
//             <motion.div
//               key={step}
//               initial={{ opacity: 0, x: 50 }}
//               animate={{ opacity: 1, x: 0 }}
//               exit={{ opacity: 0, x: -50 }}
//               transition={{ duration: 0.4 }}
//             >
//               <h2 className="text-lg font-semibold text-[#17111F] dark:text-gray-100 mb-4">
//                 {currentQuestion.question}
//               </h2>

//               <div className="grid gap-3">
//                 {currentQuestion.options.map((option) => {
//                   const userAnsweredThis = userAnswer !== undefined;
//                   const correctIndex = letterToIndex(currentQuestion.answer);
//                   const correctOption = currentQuestion.options[correctIndex];

//                   let btnClass =
//                     "border-gray-300 dark:border-gray-600 hover:border-[#17111F]";
//                   if (userAnsweredThis) {
//                     if (option === correctOption)
//                       btnClass =
//                         "bg-green-100 dark:bg-green-900/40 border-green-500";
//                     else if (option === userAnswer)
//                       btnClass = "bg-red-100 dark:bg-red-900/40 border-red-500";
//                     else
//                       btnClass =
//                         "border-gray-300 dark:border-gray-600 opacity-50";
//                   }

//                   return (
//                     <button
//                       key={option}
//                       disabled={userAnsweredThis}
//                       onClick={() => handleAnswer(option)}
//                       className={`px-4 py-3 rounded-lg text-left border transition-all text-[#17111F] dark:text-gray-100 ${btnClass}`}
//                     >
//                       {option}
//                     </button>
//                   );
//                 })}
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>
//     </div>
//   );
// }

// "use client";

// import { useEffect, useState, useCallback, useRef } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { decodeErrorResult, encodeFunctionData } from "viem";
// import {
//   FaCheckCircle,
//   FaTimesCircle,
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
// // import { celo } from "viem/chains";
// import ScoreRewardArtifact from "@/lib/abi/ScoreReward.json";
// import { allQuestions } from "@/app/quiz/data/questions";
// import { toast } from "sonner";
// import { config } from "@/lib/wagmi";
// // import { getPublicClient } from "@wagmi/core";
// // import { saveScoreToFirestore } from "@/lib/firestore";
// import Link from "next/link";
// import { useRouter, useSearchParams } from "next/navigation";
// import { getReferralTag, submitReferral } from "@divvi/referral-sdk";
// import { celo, celoAlfajores } from "wagmi/chains";

// const ABI = ScoreRewardArtifact.abi;
// const contractAddress = process.env
//   .NEXT_PUBLIC_SCORE_REWARD_ADDRESS as `0x${string}`;
// const CELO_CHAIN_ID = celo.id;

// export default function QuizGame() {
//   const { connect, connectors } = useConnect();

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
//   const [lastClaimedAt, setLastClaimedAt] = useState<number | null>(null);
//   const [claimCooldown, setClaimCooldown] = useState<number>(0); // seconds remaining
//   const publicClient = usePublicClient();
//   const [isPending, setPending] = useState(false);
//   const client = publicClient;
//   const [loadingQuestions, setLoadingQuestions] = useState(true);

//   // ... existing code ...

//   useEffect(() => {
//     // 1. Only run this if a score exists (game is finished)
//     if (score === null) return;

//     // 2. Create the data object
//     const newResult = {
//       score: score,
//       totalQuestions: questions.length,
//       date: new Date().toLocaleDateString(), // e.g., "11/24/2025"
//       time: new Date().toLocaleTimeString(), // e.g., "10:30:00 AM"
//       timestamp: Date.now(), // Useful for sorting by newest later
//     };

//     try {
//       // 3. Get existing history from Local Storage (or empty array if none)
//       const existingHistory = JSON.parse(
//         localStorage.getItem("quizHistory") || "[]"
//       );

//       // 4. Add the new result to the array
//       const updatedHistory = [...existingHistory, newResult];

//       // 5. Save it back to Local Storage
//       localStorage.setItem("quizHistory", JSON.stringify(updatedHistory));

//       console.log("Score saved locally:", newResult);
//     } catch (error) {
//       console.error("Failed to save to local storage:", error);
//     }
//   }, [score]); // Dependency: Runs whenever 'score' updates

//   // ... rest of your code ...

//   const fetchQuestions = async (category: string) => {
//     const res = await fetch("/api/questions", {
//       method: "POST",
//       body: JSON.stringify({ category }),
//     });

//     const data = await res.json();
//     return data.questions; // returns array
//   };

//   const isMiniPay = typeof window !== "undefined" && (window as any).minipay;

//   useEffect(() => {
//     if (!showFeedback) return;

//     if (noAnswer) {
//       toast(
//         `No answer selected. Correct answer: ${currentQuestion?.answer}`
//         // {
//         //   icon: "⏰",
//         // }
//       );
//     } else if (isCorrect) {
//       toast.success("Correct! Nice job 🎉");
//     } else {
//       toast.error(`Incorrect. Correct answer: ${currentQuestion?.answer}`);
//     }
//   }, [showFeedback]);

//   useEffect(() => {
//     if (isMiniPay && !isConnected) {
//       connect({
//         connector: connectors[0],
//       });
//     }
//   }, [isMiniPay, isConnected]);

//   const isCorrectChain = chain?.id === CELO_CHAIN_ID;

//   const handleConnect = useCallback(async () => {
//     try {
//       let connector =
//         connectors.find((c) => c.id === "injected") ||
//         connectors.find((c) => c.name?.toLowerCase().includes("metamask")) ||
//         connectors[0];

//       await connect({
//         connector,
//         chainId: CELO_CHAIN_ID,
//       });

//       toast.success("🔗 Connected to Celo!");
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to connect wallet.");
//     }
//   }, [connect, connectors]);

//   const handleSwitchChain = useCallback(async () => {
//     try {
//       await switchChain({
//         chainId: CELO_CHAIN_ID, // can be celo.id or celoAlfajores.id // 42220 or // 44787
//       });
//       toast.success("🌐 Switched to Celo!");
//     } catch (err) {
//       console.error("Chain switch failed:", err);
//       toast.error("Unable to switch network. Please switch manually.");
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

//       // const client = getPublicClient(config);
//       const client = publicClient;

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

//     // Submit Divvi referral (best-effort)
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
//       const correctCount = answers.filter((ans, i) => {
//         const correctIndex = letterToIndex(questions[i].answer);
//         const correctOption = questions[i].options[correctIndex];
//         return ans === correctOption;
//       }).length;

//       setScore(correctCount);
//     } else {
//       setStep((prev) => prev + 1);
//     }

//     setQuestionFinished(false);
//   }, [questionFinished, answers, questions]); // <--- Added answers and questions here

//   useEffect(() => {
//     if (!score || !address || claimCooldown > 0) return;

//     const fetchAndSave = async () => {
//       try {
//       } catch (err) {
//         console.error("Failed to save score to Firestore:", err);
//       }
//     };

//     fetchAndSave();
//   }, [address, score, claimCooldown]);

//   const letterToIndex = (letter: string) => {
//     const map: any = { A: 0, B: 1, C: 2, D: 3 };
//     return map[letter];
//   };

//   const handleAnswer = (option: string) => {
//     if (!currentQuestion || hasAnswered) return;
//     setHasAnswered(true);

//     if (timerRef.current) clearInterval(timerRef.current);

//     const updatedAnswers = [...answers];
//     updatedAnswers[step] = option;
//     setAnswers(updatedAnswers);

//     const correctIndex = letterToIndex(currentQuestion.answer);
//     const correctOption = currentQuestion.options[correctIndex];
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

//   const getRandomQuestions = () => {
//     const shuffled = [...allQuestions];
//     for (let i = shuffled.length - 1; i > 0; i--) {
//       const j = Math.floor(Math.random() * (i + 1));
//       [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
//     }
//     return shuffled.slice(0, 10);
//   };

//   const searchParams = useSearchParams();
//   const category = searchParams.get("category") || "all";

//   useEffect(() => {
//     if (!category) return;

//     async function load() {
//       setLoadingQuestions(true);

//       try {
//         const qs = await fetchQuestions(category);
//         setQuestions(qs);
//       } finally {
//         setLoadingQuestions(false);
//       }
//     }

//     load();
//   }, [category]);

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
//     <div
//       className="min-h-screen flex items-center justify-center p-6
//     bg-white dark:bg-[#17111F] transition-colors duration-300"
//     >
//       {loadingQuestions ? (
//         <div
//           className="min-h-screen flex items-center justify-center p-10
//     bg-white dark:bg-[#17111F] transition-colors duration-300"
//         >
//           <div className="relative flex flex-col items-center gap-6">
//             {/* Glowing 3D Orbit Rings */}
//             <div className="relative w-40 h-40 flex items-center justify-center">
//               <motion.div
//                 className="absolute w-32 h-32 border-4
//         border-purple-500/60 dark:border-purple-500/40 rounded-full"
//                 animate={{ rotate: 360 }}
//                 transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
//               />

//               <motion.div
//                 className="absolute w-24 h-24 border-4
//         border-blue-500/60 dark:border-blue-400/40 rounded-full"
//                 animate={{ rotate: -360 }}
//                 transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
//               />

//               <motion.div
//                 className="absolute w-16 h-16 border-4
//         border-pink-500/60 dark:border-pink-500/40 rounded-full"
//                 animate={{ rotate: 360 }}
//                 transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
//               />

//               {/* Pulsing center dot */}
//               <motion.div
//                 className="w-4 h-4 rounded-full
//         bg-gray-800 dark:bg-white
//         shadow-lg shadow-purple-500/40 dark:shadow-purple-500/60"
//                 animate={{ scale: [1, 1.5, 1] }}
//                 transition={{
//                   duration: 1.2,
//                   repeat: Infinity,
//                   ease: "easeInOut",
//                 }}
//               />
//             </div>

//             {/* Text */}
//             <motion.p
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               transition={{
//                 repeat: Infinity,
//                 duration: 1.5,
//                 ease: "easeInOut",
//               }}
//               className="text-lg tracking-wide
//       text-gray-700 dark:text-gray-200 transition-colors duration-300"
//             >
//               Fetching questions...
//             </motion.p>
//           </div>
//         </div>
//       ) : (
//         <div
//           className="
//     w-full max-w-2xl p-6 rounded-2xl shadow-2xl space-y-6 relative
//     bg-[#E6E6FA] dark:bg-[#17111F]
//   "
//         >
//           <div className="flex justify-between items-center"></div>

//           {score === null && (
//             <>
//               {/* Progress Bar */}
//               <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
//                 <motion.div
//                   className="h-4 bg-[#17111F] dark:bg-[#E6E6FA]"
//                   initial={{ width: 0 }}
//                   animate={{
//                     width: `${((step + 1) / questions.length) * 100}%`,
//                   }}
//                   transition={{ duration: 0.3 }}
//                 />
//               </div>

//               <div className="flex justify-between items-center text-sm text-[#17111F] dark:text-gray-200">
//                 <span>
//                   Question {step + 1} of {questions.length}
//                 </span>
//                 <span className="text-green-700 dark:text-green-400 font-semibold">
//                   Score:{" "}
//                   {
//                     answers.filter((ans, i) => {
//                       if (!ans || !questions[i]) return false;
//                       // Convert the letter (e.g., "A") to the index (0)
//                       const correctIndex = letterToIndex(questions[i].answer);
//                       // Get the actual text (e.g., "Paris")
//                       const correctOption = questions[i].options[correctIndex];
//                       // Compare text with text
//                       return ans === correctOption;
//                     }).length
//                   }
//                 </span>

//                 <span>⏱ {timeLeft}s</span>
//               </div>
//             </>
//           )}

//           {/* QUIZ */}
//           {score === null && currentQuestion ? (
//             <AnimatePresence mode="wait">
//               <motion.div
//                 key={step}
//                 initial={{ opacity: 0, x: 50 }}
//                 animate={{ opacity: 1, x: 0 }}
//                 exit={{ opacity: 0, x: -50 }}
//                 transition={{ duration: 0.4 }}
//               >
//                 <h2 className="text-lg font-semibold text-[#17111F] dark:text-gray-100 mb-4">
//                   {currentQuestion.question}
//                 </h2>

//                 <div className="grid gap-3">
//                   {currentQuestion.options.map((option, index) => {
//                     const correctIndex = letterToIndex(currentQuestion.answer);
//                     const correctOption = currentQuestion.options[correctIndex];

//                     return (
//                       <button
//                         key={option}
//                         disabled={userAnswer !== undefined}
//                         onClick={() => handleAnswer(option)}
//                         className={`
//         px-4 py-3 rounded-lg text-left border transition-all
//         text-[#17111F] dark:text-gray-100
//         ${
//           userAnswer !== undefined
//             ? option === correctOption
//               ? "bg-green-100 dark:bg-green-900/40 border-green-500"
//               : option === userAnswer
//               ? "bg-red-100 dark:bg-red-900/40 border-red-500"
//               : "border-gray-300 dark:border-gray-600"
//             : "border-gray-300 dark:border-gray-600 hover:border-[#17111F]"
//         }
//       `}
//                       >
//                         {option}
//                       </button>
//                     );
//                   })}
//                 </div>
//               </motion.div>
//             </AnimatePresence>
//           ) : score !== null ? (
//             /* RESULTS */
//             <motion.div
//               initial={{ opacity: 0, scale: 0.9 }}
//               animate={{ opacity: 1, scale: 1 }}
//               transition={{ duration: 0.5 }}
//               className="text-center space-y-6"
//             >
//               <motion.div
//                 initial={{ opacity: 0, scale: 0.95 }}
//                 animate={{ opacity: 1, scale: 1 }}
//                 transition={{ duration: 0.6, ease: "easeOut" }}
//                 className="
//           rounded-2xl px-8 py-10 shadow-2xl space-y-8
//           bg-gradient-to-br
//           from-gray-950 via-gray-900 to-gray-800
//           dark:from-[#E6E6FA] dark:via-[#d5d5f5] dark:to-[#c2c2ef]
//           text-gray-100 dark:text-[#17111F]
//         "
//               >
//                 <div className="flex flex-col items-center gap-2">
//                   <h2 className="text-xl font-extrabold tracking-tight">
//                     Performance Report
//                   </h2>
//                 </div>

//                 <div className="text-center">
//                   <p className="text-xl text-gray-300 dark:text-gray-700">
//                     You scored{" "}
//                     <span className="font-bold text-2xl text-white dark:text-[#17111F]">
//                       {score} / {questions.length}
//                     </span>
//                   </p>
//                 </div>

//                 {/* Skipped all */}
//                 {score === 0 && unansweredCount === questions.length ? (
//                   <div className="flex flex-col items-center text-yellow-400 dark:text-yellow-700 text-center gap-2 mt-4">
//                     <FaRegLaughSquint className="text-4xl" />
//                     <p className="text-lg font-medium">Did you even try? 😅</p>
//                   </div>
//                 ) : score === 0 ? (
//                   <div className="flex flex-col items-center text-red-400 dark:text-red-600 text-center gap-2 mt-4">
//                     <FaTimesCircle className="text-4xl" />
//                     <p className="text-lg font-medium">No correct answers 😢</p>
//                   </div>
//                 ) : (
//                   <div className="flex flex-col items-center gap-4">
//                     <FaCheckCircle className="text-green-400 dark:text-green-700 text-4xl" />
//                     <p className="text-lg font-semibold text-gray-200 dark:text-gray-800">
//                       Great job!
//                     </p>

//                     {score !== null && (
//                       <>
//                         {claimCooldown > 0 ? (
//                           <div className="flex flex-col items-center gap-2 text-sm sm:text-base text-center text-yellow-100 dark:text-yellow-900 bg-yellow-900/40 dark:bg-yellow-200/40 border border-yellow-600 rounded-xl p-4 w-full max-w-md shadow-lg">
//                             <p className="font-semibold">
//                               Daily CELO already claimed!
//                             </p>
//                           </div>
//                         ) : (
//                           <div className="text-lg text-gray-300 dark:text-gray-800">
//                             🎉 You earned{" "}
//                             <span className="font-bold text-white dark:text-[#17111F]">
//                               {getRewardForScore(score)} CELO
//                             </span>
//                           </div>
//                         )}
//                       </>
//                     )}

//                     {/* Wallet buttons unchanged */}
//                     {!isConnected ? (
//                       <button
//                         onClick={handleConnect}
//                         className="bg-yellow-800 hover:bg-yellow-600 text-white px-2 py-2 rounded-lg font-semibold shadow"
//                       >
//                         Connect Wallet to claim
//                       </button>
//                     ) : !isCorrectChain ? (
//                       <button
//                         onClick={handleSwitchChain}
//                         className="bg-red-500 hover:bg-red-600 text-white px-2 py-2 rounded-lg font-semibold shadow"
//                       >
//                         🌐 Switch to Celo to claim
//                       </button>
//                     ) : claimCooldown > 0 ? (
//                       <button
//                         disabled
//                         className="bg-gradient-to-r from-gray-500 to-gray-700 dark:from-gray-300 dark:to-gray-400 text-white dark:text-[#17111F] px-4 py-2 rounded-xl font-semibold shadow-inner cursor-not-allowed opacity-80 animate-pulse"
//                       >
//                         Claim again in {formatTime(claimCooldown)}
//                       </button>
//                     ) : (
//                       <button
//                         onClick={claimReward}
//                         disabled={isPending}
//                         className="bg-gradient-to-r from-farcaster to-farcaster/80 text-white px-4 py-2 rounded-lg font-semibold tracking-wide hover:opacity-90 shadow-lg transition-all duration-200"
//                       >
//                         🎁 {isPending ? "Claiming..." : "Claim Your Reward"}
//                       </button>
//                     )}
//                   </div>
//                 )}

//                 <div className="text-center cursor-pointer">
//                   <button
//                     onClick={restart}
//                     className="
//               inline-flex items-center gap-2
//               bg-gray-800 dark:bg-gray-300
//               hover:bg-gray-700 dark:hover:bg-gray-200
//               text-white dark:text-[#17111F]
//               font-semibold px-5 py-2 rounded-full shadow
//               transition-all duration-200
//             "
//                   >
//                     <FaRedoAlt />
//                     Restart Quiz
//                   </button>
//                 </div>
//               </motion.div>
//             </motion.div>
//           ) : null}
//         </div>
//       )}
//     </div>
//   );
// }

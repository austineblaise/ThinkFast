"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaHistory,
  FaTrashAlt,
  FaArrowLeft,
  FaTrophy,
  FaCalendarAlt,
  FaClock,
} from "react-icons/fa";
import Link from "next/link";

interface HistoryItem {
  score: number;
  totalQuestions: number;
  date: string;
  time: string;
  timestamp: number;
}

export default function QuizHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedData = localStorage.getItem("quizHistory");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        const sorted = parsed.sort(
          (a: HistoryItem, b: HistoryItem) => b.timestamp - a.timestamp
        );
        setHistory(sorted);
      } catch (e) {
        console.error("Error parsing history", e);
      }
    }
  }, []);

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear your entire game history?")) {
      localStorage.removeItem("quizHistory");
      setHistory([]);
    }
  };

  const getGradeColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80)
      return "text-green-600 bg-green-100 dark:bg-green-900/30 border-green-600";
    if (percentage >= 50)
      return "text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500";
    return "text-red-500 bg-red-100 dark:bg-red-900/30 border-red-500";
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#17111F]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white dark:bg-[#1F1629] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
      >
     
        <div className="px-4 py-4 bg-[#2596be] text-white relative">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaHistory className="opacity-80" /> Match History
          </h1>
          <p className="text-white/80 text-xs mt-1">
            Your past performance overview
          </p>

          <div className="absolute right-4 top-4 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20 text-center">
            <p className="text-[10px] uppercase opacity-70">Total Games</p>
            <p className="text-lg font-bold leading-none">{history.length}</p>
          </div>
        </div>

    
        <div className="p-4 max-h-[55vh] overflow-y-auto custom-scrollbar">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <FaHistory className="text-5xl opacity-20 mb-3" />
              <p className="text-base font-medium">No history yet.</p>
              <Link href="/quiz">
                <button className="mt-3 text-green-600 hover:underline text-sm">
                  Start a Quiz
                </button>
              </Link>
            </div>
          ) : (
            <AnimatePresence>
              {history.map((item, index) => (
                <motion.div
                  key={item.timestamp}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#2D2438] border border-transparent hover:border-green-500/30 transition-all shadow-sm"
                >
                  {/* Score Badge */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border ${getGradeColor(
                        item.score,
                        item.totalQuestions
                      )}`}
                    >
                      <span className="text-lg font-bold leading-none">
                        {item.score}
                      </span>
                      <span className="text-[9px] uppercase opacity-70">
                        Score
                      </span>
                    </div>

                
                    <div>
                      <div className="flex items-center gap-1 text-gray-800 dark:text-gray-200 font-semibold text-base">
                        <span>Quiz Result</span>
                        {item.score === item.totalQuestions && (
                          <FaTrophy className="text-yellow-400 text-sm" />
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <FaCalendarAlt className="w-3 h-3" /> {item.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <FaClock className="w-3 h-3" /> {item.time}
                        </span>
                      </div>
                    </div>
                  </div>

                 
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] text-gray-400 uppercase">
                      Total Qs
                    </span>
                    <p className="font-medium text-gray-600 dark:text-gray-300 text-sm">
                      {item.totalQuestions}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>


        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#17111F]/50 flex justify-between items-center">
          <Link
            href="/quiz"
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-green-600 transition"
          >
            <FaArrowLeft /> Back to Quiz
          </Link>

          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 text-red-500 hover:text-red-600 text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              <FaTrashAlt /> Clear History
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

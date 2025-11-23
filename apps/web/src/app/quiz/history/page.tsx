"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaHistory, FaTrashAlt, FaArrowLeft, FaTrophy, FaCalendarAlt, FaClock } from "react-icons/fa";
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
        // Sort by newest first (timestamp descending)
        const sorted = parsed.sort((a: HistoryItem, b: HistoryItem) => b.timestamp - a.timestamp);
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
    if (percentage >= 80) return "text-green-500 bg-green-100 dark:bg-green-900/30 border-green-500";
    if (percentage >= 50) return "text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500";
    return "text-red-500 bg-red-100 dark:bg-red-900/30 border-red-500";
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-[#17111F] transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white dark:bg-[#1F1629] rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800"
      >
        
        {/* Header */}
        <div className="p-8 bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-900 dark:to-blue-900 text-white relative overflow-hidden">
          {/* Decorative Circles */}
          <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-[-30px] left-[-20px] w-40 h-40 bg-blue-400/10 rounded-full blur-2xl" />
          
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <FaHistory className="opacity-80" /> Match History
              </h1>
              <p className="text-purple-100 mt-1 text-sm opacity-80">
                Your past performance logs
              </p>
            </div>
            
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <p className="text-xs uppercase tracking-wider opacity-70">Total Games</p>
              <p className="text-2xl font-bold">{history.length}</p>
            </div>
          </div>
        </div>

        {/* List Container */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
              <FaHistory className="text-6xl mb-4 opacity-20" />
              <p className="text-lg font-medium">No games played yet.</p>
              <Link href="/quiz">
                <button className="mt-4 text-blue-500 hover:underline">Start a Quiz</button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {history.map((item, index) => (
                  <motion.div
                    key={item.timestamp}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-[#2D2438] border border-transparent hover:border-purple-500/30 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    {/* Left Side: Score Badge */}
                    <div className="flex items-center gap-4">
                      <div className={`
                        w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2
                        ${getGradeColor(item.score, item.totalQuestions)}
                      `}>
                        <span className="text-xl font-bold leading-none">{item.score}</span>
                        <span className="text-[10px] uppercase opacity-70">Score</span>
                      </div>
                      
                      {/* Middle: Details */}
                      <div>
                        <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-semibold text-lg">
                          <span>Quiz Result</span>
                          {item.score === item.totalQuestions && (
                            <FaTrophy className="text-yellow-400" title="Perfect Score" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                          <span className="flex items-center gap-1"><FaCalendarAlt className="w-3 h-3" /> {item.date}</span>
                          <span className="flex items-center gap-1"><FaClock className="w-3 h-3" /> {item.time}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Total Qs */}
                    <div className="text-right hidden sm:block">
                      <span className="text-xs text-gray-400 uppercase">Total Qs</span>
                      <p className="font-medium text-gray-600 dark:text-gray-300">{item.totalQuestions}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#17111F]/50 flex justify-between items-center">
          <Link href="/quiz" className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-400 transition-colors font-medium">
            <FaArrowLeft /> Back to Quiz
          </Link>

          {history.length > 0 && (
            <button 
              onClick={clearHistory}
              className="flex items-center gap-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              <FaTrashAlt /> Clear History
            </button>
          )}
        </div>

      </motion.div>
    </div>
  );
}
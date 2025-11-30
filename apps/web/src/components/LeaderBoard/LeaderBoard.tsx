"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { db, leaderboardCollection } from "@/lib/firebase"; // Ensure this path is correct
import {
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  QueryConstraint,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaTrophy,
  FaMedal,
  FaUserAstronaut,
  FaClock,
  FaSearch,
  FaChevronDown,
} from "react-icons/fa";

// --- Types ---
interface LeaderboardEntry {
  id: string;
  walletAddress: string;
  score: number;
  totalQuestions: number;
  category: string;
  timeTakenMs: number;
  createdAt: any;
}

const CATEGORIES = [
  // NATURAL SCIENCES
  "All",
  "Physics",

  "Chemistry",

  "Biology",

  "Mathematics",

  "Statistics",

  "Geology",

  "Environmental Science",

  "Microbiology",

  "Biochemistry",

  "Marine Biology",

  // ENGINEERING

  "Mechanical Engineering",

  "Electrical Engineering",

  "Civil Engineering",

  "Chemical Engineering",

  "Computer Engineering",

  "Software Engineering",

  "Petroleum Engineering",

  "Aerospace Engineering",

  "Mechatronics Engineering",

  // TECHNOLOGY & COMPUTING

  "Computer Science",

  "Information Technology",

  "Cybersecurity",

  "Artificial Intelligence",

  "Data Science",

  // MEDICINE & HEALTH

  "Medicine",

  "Nursing",

  "Pharmacy",

  "Physiology",

  "Medical Laboratory Science",

  "Public Health",

  "Dentistry",

  "Veterinary Medicine",

  // BUSINESS & MANAGEMENT

  "Economics",

  "Business Administration",

  "Accounting",

  "Finance",

  "Marketing",

  "Entrepreneurship",

  "Human Resource Management",

  // SOCIAL SCIENCES

  "Political Science",

  "International Relations",

  "Sociology",

  "Psychology",

  "Mass Communication",

  "Criminology",

  // ARTS & HUMANITIES

  "English & Literary Studies",

  "History",

  "Philosophy",

  "Fine Arts",

  "Linguistics",

  "Theatre Arts",

  // AGRICULTURE

  "Agricultural Science",

  "Food Science",

  "Forestry",

  "Fisheries",

  // LAW & ADMINISTRATION

  "Law",

  "Public Administration",
];

interface SearchableCategorySelectProps {
  categories: string[];
  selectedCategory: string;
  onSelect: (category: string) => void;
}

const SearchableCategorySelect: React.FC<SearchableCategorySelectProps> = ({
  categories,
  selectedCategory,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter categories based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return categories.filter((cat) =>
      cat.toLowerCase().includes(lowerCaseSearch)
    );
  }, [categories, searchTerm]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm(""); // Optionally clear search on close
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleSelect = (category: string) => {
    onSelect(category);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-orange-500/20">
            <FaTrophy className="text-white text-3xl" />
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-zinc-800 dark:text-white tracking-tight">
              Wall of Fame
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Celebrating brilliance, accuracy, and speed
            </p>
          </div>
        </div>

        <SearchableCategorySelect
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      {/* Leaderboard Card */}
      <div className="bg-white/90 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-700/40 rounded-3xl shadow-2xl overflow-hidden">
        {/* Sticky Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/70 text-[11px] font-bold text-zinc-500 uppercase tracking-wide sticky top-0 z-10">
          <div className="col-span-2 md:col-span-1 text-center">Rank</div>
          <div className="col-span-6 md:col-span-5">Player</div>
          <div className="col-span-4 md:col-span-2 text-right">Score</div>
          <div className="hidden md:block md:col-span-2 text-right">Time</div>
          <div className="hidden md:block md:col-span-2 text-right">
            Category
          </div>
        </div>

        {/* Scrollable Rows */}
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-4 px-6 py-4 border-b dark:border-zinc-800/50 animate-pulse"
              >
                <div className="col-span-2 md:col-span-1 mx-auto bg-zinc-300/60 dark:bg-zinc-800 h-5 w-8 rounded"></div>
                <div className="col-span-6 md:col-span-5 bg-zinc-300/60 dark:bg-zinc-800 h-5 rounded w-28"></div>
                <div className="col-span-4 md:col-span-2 ml-auto bg-zinc-300/60 dark:bg-zinc-800 h-5 rounded w-12"></div>
              </div>
            ))
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
              <FaUserAstronaut className="text-5xl mb-4 opacity-50" />
              <p>No scores yet for this category.</p>
            </div>
          ) : (
            <AnimatePresence>
              {entries.map((entry, index) => {
                const rank = index + 1;

                // --- Polished Top 3 Styling ---
                const topStyles = [
                  {
                    icon: <FaMedal className="text-2xl text-yellow-500" />,
                    bg: "from-yellow-500/15",
                    border: "border-yellow-400/60",
                  },
                  {
                    icon: <FaMedal className="text-2xl text-zinc-400" />,
                    bg: "from-zinc-400/15",
                    border: "border-zinc-400/50",
                  },
                  {
                    icon: <FaMedal className="text-2xl text-orange-500" />,
                    bg: "from-orange-500/15",
                    border: "border-orange-500/60",
                  },
                ];

                const special = topStyles[rank - 1];

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.04 }}
                    className={`grid grid-cols-12 gap-4 px-6 py-5 items-center border-b dark:border-zinc-800/40 
                    ${
                      special
                        ? `bg-gradient-to-r ${special.bg} border-l-4 ${special.border}`
                        : `hover:bg-zinc-100/40 dark:hover:bg-zinc-800/40 transition`
                    }
                  `}
                  >
                    {/* Rank */}
                    <div className="col-span-2 md:col-span-1 flex justify-center">
                      {special ? (
                        special.icon
                      ) : (
                        <span className="font-bold text-zinc-400">#{rank}</span>
                      )}
                    </div>

                    {/* Player */}
                    <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm shadow-md
                      ${
                        rank === 1
                          ? "bg-yellow-500"
                          : rank === 2
                          ? "bg-zinc-400"
                          : rank === 3
                          ? "bg-orange-500"
                          : "bg-[#2596be]"
                      }
                    `}
                      >
                        <FaUserAstronaut size={14} />
                      </div>

                      <div className="flex flex-col">
                        <span className="text-sm md:text-base font-semibold text-zinc-800 dark:text-white tracking-tight">
                          {entry.walletAddress.slice(0, 6)}...
                          {entry.walletAddress.slice(-4)}
                        </span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="col-span-4 md:col-span-2 text-right">
                      <span className="text-xl font-extrabold text-[#2596be]">
                        {entry.score}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {" "}
                        / {entry.totalQuestions}
                      </span>

                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full mt-1">
                        <div
                          className="bg-[#2596be] h-1.5 rounded-full"
                          style={{
                            width: `${
                              (entry.score / entry.totalQuestions) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="hidden md:flex md:col-span-2 justify-end text-sm text-zinc-500 dark:text-zinc-400 gap-2">
                      <FaClock className="text-xs opacity-60" />
                      {Math.floor(entry.timeTakenMs / 1000 / 60)}m{" "}
                      {Math.floor(entry.timeTakenMs / 1000) % 60}s
                    </div>

                    {/* Category */}
                    <div className="hidden md:block md:col-span-2 text-right">
                      <span className="px-2 py-1 rounded-lg bg-zinc-200/60 dark:bg-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 border border-zinc-300/50 dark:border-zinc-700/60">
                        {entry.category || "General"}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Leaderboard Component ---

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // --- Helpers ---
  const formatAddress = (addr: string) => {
    if (!addr) return "Anonymous";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}m ${s}s`;
  };

  useEffect(() => {
    setLoading(true);

    const constraints: QueryConstraint[] = [];

    if (selectedCategory !== "All") {
      constraints.push(where("category", "==", selectedCategory));
    }

    constraints.push(orderBy("score", "desc"));
    constraints.push(orderBy("timeTakenMs", "asc"));
    constraints.push(limit(50));
    const q = query(leaderboardCollection, ...constraints);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LeaderboardEntry[];

        setEntries(data);
        setLoading(false);
      },
      (error) => {
        console.error("Leaderboard error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedCategory]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg shadow-orange-500/20">
            <FaTrophy className="text-white text-2xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">
              Wall of Fame
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Top performers ranked by score & speed
            </p>
          </div>
        </div>

        <SearchableCategorySelect
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/50 dark:border-white/5 rounded-3xl shadow-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-bold text-zinc-400 uppercase tracking-wider">
          <div className="col-span-2 md:col-span-1 text-center">Rank</div>
          <div className="col-span-6 md:col-span-5">Player</div>
          <div className="col-span-4 md:col-span-2 text-right">Score</div>
          <div className="hidden md:block md:col-span-2 text-right">Time</div>
          <div className="hidden md:block md:col-span-2 text-right">
            Category
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
          {loading ? (
            // Skeleton Loader
            [...Array(5)].map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-100 dark:border-zinc-800/50 animate-pulse"
              >
                <div className="col-span-2 md:col-span-1 bg-zinc-200 dark:bg-zinc-800 h-6 rounded w-8 mx-auto"></div>
                <div className="col-span-6 md:col-span-5 bg-zinc-200 dark:bg-zinc-800 h-6 rounded w-32"></div>
                <div className="col-span-4 md:col-span-2 bg-zinc-200 dark:bg-zinc-800 h-6 rounded w-12 ml-auto"></div>
              </div>
            ))
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
              <FaUserAstronaut className="text-4xl mb-4 opacity-50" />
              <p>No scores yet for this category.</p>
            </div>
          ) : (
            <AnimatePresence>
              {entries.map((entry, index) => {
                const rank = index + 1;

                // Styling for Top 3
                let rankStyle = "text-zinc-500 font-bold";
                let rankIcon = <span className="text-sm">#{rank}</span>;
                let rowBg = "hover:bg-zinc-50 dark:hover:bg-zinc-800/50";

                if (rank === 1) {
                  rankStyle = "text-yellow-500";
                  rankIcon = <FaMedal className="text-xl drop-shadow-sm" />;
                  rowBg =
                    "bg-gradient-to-r from-yellow-500/10 to-transparent border-l-4 border-yellow-400";
                } else if (rank === 2) {
                  rankStyle = "text-zinc-400";
                  rankIcon = <FaMedal className="text-xl drop-shadow-sm" />;
                  rowBg =
                    "bg-gradient-to-r from-zinc-400/10 to-transparent border-l-4 border-zinc-400";
                } else if (rank === 3) {
                  rankStyle = "text-orange-500";
                  rankIcon = <FaMedal className="text-xl drop-shadow-sm" />;
                  rowBg =
                    "bg-gradient-to-r from-orange-500/10 to-transparent border-l-4 border-orange-500";
                }

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`grid grid-cols-12 gap-4 p-4 items-center border-b border-zinc-100 dark:border-zinc-800/50 transition-colors ${rowBg}`}
                  >
                    {/* Rank */}
                    <div
                      className={`col-span-2 md:col-span-1 flex justify-center ${rankStyle}`}
                    >
                      {rankIcon}
                    </div>

                    {/* Player */}
                    <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs text-white shadow-sm
                        ${
                          rank === 1
                            ? "bg-yellow-500"
                            : rank === 2
                            ? "bg-zinc-400"
                            : rank === 3
                            ? "bg-orange-500"
                            : "bg-[#2596be]"
                        }
                      `}
                      >
                        <FaUserAstronaut />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 text-sm md:text-base font-mono">
                          {formatAddress(entry.walletAddress)}
                        </span>
                        {rank <= 3 && (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 md:hidden">
                            {rank === 1
                              ? "Champion"
                              : rank === 2
                              ? "Runner Up"
                              : "3rd Place"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="col-span-4 md:col-span-2 text-right">
                      <div className="font-black text-[#2596be] text-lg">
                        {entry.score}{" "}
                        <span className="text-xs text-zinc-400 font-normal">
                          / {entry.totalQuestions}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 rounded-full h-1.5 mt-1 dark:bg-zinc-800">
                        <div
                          className="bg-[#2596be] h-1.5 rounded-full"
                          style={{
                            width: `${
                              (entry.score / entry.totalQuestions) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="hidden md:flex md:col-span-2 justify-end items-center gap-2 text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                      <FaClock className="text-xs opacity-50" />
                      {formatTime(entry.timeTakenMs)}
                    </div>

                    <div className="hidden md:block md:col-span-2 text-right">
                      <span className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                        {entry.category || "General"}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

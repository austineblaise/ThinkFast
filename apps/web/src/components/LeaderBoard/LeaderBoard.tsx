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

// --- New Component: Searchable Category Select ---

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
    <div ref={dropdownRef} className="relative w-full md:w-64 z-10">
      {/* Current Selection / Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/70 transition-colors"
      >
        <span>Category: **{selectedCategory}**</span>
        <FaChevronDown
          className={`ml-2 h-4 w-4 transition-transform ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-full max-h-80 overflow-hidden rounded-xl shadow-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 ring-1 ring-black ring-opacity-5 focus:outline-none"
          >
            <div className="p-3 border-b dark:border-zinc-800">
              {/* Search Input */}
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-[#2596be] focus:border-[#2596be] outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Category List */}
            <div className="overflow-y-auto max-h-60 custom-scrollbar">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleSelect(cat)}
                    className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-150
                      ${
                        selectedCategory === cat
                          ? "bg-[#2596be] text-white font-bold"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }
                    `}
                  >
                    {cat}
                  </button>
                ))
              ) : (
                <div className="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400 text-center">
                  No categories found.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

  // --- Fetch Data ---
  useEffect(() => {
    setLoading(true);

    // Build Query
    const constraints: QueryConstraint[] = [];

    // Filter by Category if not "All"
    if (selectedCategory !== "All") {
      constraints.push(where("category", "==", selectedCategory));
    }

    // Order by Score (Desc), then Time (Asc) for tie-breaker
    // NOTE: You may need to create a Composite Index in Firebase Console for this to work!
    constraints.push(orderBy("score", "desc"));
    constraints.push(orderBy("timeTakenMs", "asc"));
    constraints.push(limit(50));

    const q = query(leaderboardCollection, ...constraints);

    // Real-time listener
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

        {/* Category Filter - REPLACED WITH SEARCHABLE SELECT */}
        <SearchableCategorySelect
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      {/* Leaderboard List */}
      <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/50 dark:border-white/5 rounded-3xl shadow-xl overflow-hidden">
        {/* Table Header */}
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

                    {/* Time (Desktop) */}
                    <div className="hidden md:flex md:col-span-2 justify-end items-center gap-2 text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                      <FaClock className="text-xs opacity-50" />
                      {formatTime(entry.timeTakenMs)}
                    </div>

                    {/* Category (Desktop) */}
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

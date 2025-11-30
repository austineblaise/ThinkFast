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
  FaCrown,
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

// Keeping CATEGORIES list intact as per request
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


// --- SearchableCategorySelect Component (Enhanced Design) ---

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

  // Filter categories based on search term (Logic remains)
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return categories.filter((cat) =>
      cat.toLowerCase().includes(lowerCaseSearch)
    );
  }, [categories, searchTerm]);

  // Handle outside click to close dropdown (Logic remains)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
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
    <div ref={dropdownRef} className="relative w-full md:w-64 z-20">
      {/* Current Selection / Dropdown Button - Neumorphism/Shadow Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full px-5 py-2.5 text-base font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-full shadow-lg dark:shadow-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-700/70 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2596be]"
      >
        <span className="truncate">
          Category: **{selectedCategory}**
        </span>
        <FaChevronDown
          className={`ml-2 h-4 w-4 transition-transform ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {/* Dropdown Panel - Elevated, rounded, and clean */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-3 w-full max-h-80 overflow-hidden rounded-xl shadow-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 ring-1 ring-black ring-opacity-10 focus:outline-none"
          >
            <div className="p-3 border-b dark:border-zinc-700/50">
              {/* Search Input - Tighter integration */}
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600 rounded-lg focus:ring-[#2596be] focus:border-[#2596be] outline-none transition"
                  autoFocus
                />
              </div>
            </div>

            {/* Category List - Better hover effect */}
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
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
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


// --- Leaderboard Component (Enhanced Design) ---

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // --- Helpers (Logic remains) ---
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

  // --- useEffect (Logic remains) ---
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
    // Increased max-width for more spacious layout
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Header Section - More distinct and elegant */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div className="flex items-center gap-4">
          {/* Trophy Icon with a richer gradient and shadow */}
          <div className="p-4 bg-gradient-to-br from-[#2596be] to-blue-500 rounded-2xl shadow-xl shadow-blue-500/30">
            <FaTrophy className="text-white text-3xl" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-zinc-800 dark:text-white">
              🚀 Wall of Fame
            </h2>
            <p className="text-md text-zinc-500 dark:text-zinc-400 mt-1">
              Top 50 global performers ranked by **Score** and **Speed**
            </p>
          </div>
        </div>

        <SearchableCategorySelect
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      {/* Main Leaderboard Container - Glassmorphism/Blurred effect */}
      <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/80 dark:border-zinc-800/50 rounded-3xl shadow-2xl dark:shadow-zinc-950/50 overflow-hidden">
        
        {/* Table Header - Sticky, distinct background */}
        <div className="grid grid-cols-12 gap-4 p-4 sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b border-zinc-200 dark:border-zinc-700 text-xs font-extrabold text-zinc-500 uppercase tracking-widest shadow-inner">
          <div className="col-span-1 text-center">RANK</div>
          <div className="col-span-5">PLAYER</div>
          <div className="col-span-2 text-right">SCORE</div>
          <div className="hidden lg:block lg:col-span-2 text-right">TIME</div>
          <div className="hidden lg:block lg:col-span-2 text-right">CATEGORY</div>
        </div>

        {/* Content Area - Scrollable with custom scrollbar styling */}
        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            // Skeleton Loader - Cleaner style
            [...Array(6)].map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-4 p-4 items-center border-b border-zinc-100 dark:border-zinc-800/50 animate-pulse transition-colors"
              >
                <div className="col-span-1 bg-zinc-200 dark:bg-zinc-800 h-6 rounded-full w-8 mx-auto"></div>
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
                  <div className="bg-zinc-200 dark:bg-zinc-800 h-4 rounded w-2/3"></div>
                </div>
                <div className="col-span-2 bg-zinc-200 dark:bg-zinc-800 h-6 rounded w-1/2 ml-auto"></div>
                <div className="hidden lg:block lg:col-span-2 bg-zinc-200 dark:bg-zinc-800 h-6 rounded w-1/3 ml-auto"></div>
                <div className="hidden lg:block lg:col-span-2 bg-zinc-200 dark:bg-zinc-800 h-6 rounded w-1/3 ml-auto"></div>
              </div>
            ))
          ) : entries.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
              <FaUserAstronaut className="text-6xl mb-4 opacity-50" />
              <p className="text-lg">No scores posted yet for **{selectedCategory}**.</p>
              <p className="text-sm mt-1">Be the first to climb the ranks!</p>
            </div>
          ) : (
            <AnimatePresence>
              {entries.map((entry, index) => {
                const rank = index + 1;

                // Styling for Top 3 (Modified for richer look)
                let rankStyle = "text-zinc-500 font-extrabold text-lg";
                let rankIcon = <span className="text-sm font-mono">#{rank}</span>;
                let rowBg = "hover:bg-zinc-100 dark:hover:bg-zinc-800/70";
                let nameStyle = "text-zinc-800 dark:text-zinc-200";
                let avatarColor = "bg-[#2596be]";

                if (rank === 1) {
                  rankStyle = "text-yellow-500 text-2xl drop-shadow-md";
                  rankIcon = <FaCrown className="drop-shadow-lg" />;
                  rowBg = "bg-yellow-500/10 dark:bg-yellow-900/30 border-l-4 border-yellow-500 hover:bg-yellow-500/20 dark:hover:bg-yellow-900/50";
                  nameStyle = "text-yellow-600 dark:text-yellow-400 font-extrabold";
                  avatarColor = "bg-yellow-500";
                } else if (rank === 2) {
                  rankStyle = "text-zinc-400 text-xl drop-shadow-md";
                  rankIcon = <FaMedal />;
                  rowBg = "bg-zinc-400/10 dark:bg-zinc-600/20 border-l-4 border-zinc-400 hover:bg-zinc-400/20 dark:hover:bg-zinc-600/40";
                  nameStyle = "text-zinc-600 dark:text-zinc-300 font-bold";
                  avatarColor = "bg-zinc-400";
                } else if (rank === 3) {
                  rankStyle = "text-amber-600 text-xl drop-shadow-md";
                  rankIcon = <FaMedal />;
                  rowBg = "bg-amber-600/10 dark:bg-amber-800/20 border-l-4 border-amber-600 hover:bg-amber-600/20 dark:hover:bg-amber-800/40";
                  nameStyle = "text-amber-700 dark:text-amber-400 font-bold";
                  avatarColor = "bg-amber-600";
                }

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.3 }}
                    className={`grid grid-cols-12 gap-4 p-4 items-center border-b border-zinc-100 dark:border-zinc-800/50 transition-all duration-200 ${rowBg}`}
                  >
                    {/* Rank */}
                    <div
                      className={`col-span-1 flex justify-center ${rankStyle}`}
                    >
                      {rankIcon}
                    </div>

                    {/* Player */}
                    <div className="col-span-5 flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm text-white shadow-lg ${avatarColor}`}
                      >
                        {/* Use first letter of address for avatar if no name available (e.g., A or B) */}
                        <span className="font-bold">{entry.walletAddress.charAt(2)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-sm md:text-base font-mono truncate ${nameStyle}`}>
                          {formatAddress(entry.walletAddress)}
                        </span>
                        {/* Optional rank title display on smaller screens, removed on large as rank is visible */}
                        {rank <= 3 && (
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 lg:hidden">
                            {rank === 1
                              ? "CHAMPION"
                              : rank === 2
                              ? "RUNNER UP"
                              : "BRONZE"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="col-span-2 text-right">
                      <div className="font-black text-[#2596be] dark:text-blue-400 text-xl">
                        {entry.score}
                        <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium ml-1">
                          / {entry.totalQuestions}
                        </span>
                      </div>
                      {/* Score Progress Bar - Enhanced visibility */}
                      <div className="w-full bg-zinc-200 rounded-full h-1.5 mt-1 dark:bg-zinc-700">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(entry.score / entry.totalQuestions) * 100}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="bg-[#2596be] h-1.5 rounded-full shadow-md shadow-[#2596be]/50"
                        ></motion.div>
                      </div>
                    </div>

                    {/* Time (Visible on large screens) */}
                    <div className="hidden lg:flex lg:col-span-2 justify-end items-center gap-2 text-zinc-600 dark:text-zinc-300 text-sm font-semibold">
                      <FaClock className="text-base text-zinc-400 dark:text-zinc-500" />
                      {formatTime(entry.timeTakenMs)}
                    </div>

                    {/* Category (Visible on large screens) */}
                    <div className="hidden lg:block lg:col-span-2 text-right">
                      <span className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 shadow-inner">
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
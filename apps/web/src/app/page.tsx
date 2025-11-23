"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  FaGift,
  FaPlay,
  FaStopwatch,
  FaListOl,
  FaForward,
  FaBolt,
  FaFlask,
  FaGlobeAfrica,
  FaHistory,
  FaAtom,
  FaBitcoin,
  FaLaptopCode,
  FaBrain,
  FaTrophy,
} from "react-icons/fa";
import { UserBalance } from "@/components/user-balance";
import SplashScreen from "@/components/SplashScreen";

// Animation config
const containerVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.2, delayChildren: 0.2 },
  },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// Category data
const categories = [
  { label: "Math", category: "Math", icon: FaBrain, desc: "Numbers & logic" },
  {
    label: "Science",
    category: "Science",
    icon: FaFlask,
    desc: "How the world works",
  },
  {
    label: "History",
    category: "History",
    icon: FaHistory,
    desc: "Past events memory",
  },
  {
    label: "Crypto",
    category: "Crypto",
    icon: FaBitcoin,
    desc: "Blockchain & digital money",
  },
  {
    label: "Geography",
    category: "Geography",
    icon: FaGlobeAfrica,
    desc: "Maps & cultures",
  },
  {
    label: "Physics",
    category: "Physics",
    icon: FaAtom,
    desc: "Motion & matter",
  },
  {
    label: "Biology",
    category: "Biology",
    icon: FaBrain,
    desc: "Life & genetics",
  },
  {
    label: "Chemistry",
    category: "Chemistry",
    icon: FaFlask,
    desc: "Reactions & elements",
  },
  {
    label: "Tech",
    category: "Technology",
    icon: FaLaptopCode,
    desc: "Future & coding",
  },
  {
    label: "General",
    category: "General",
    icon: FaBolt,
    desc: "Random brain teasers",
  },
];

export default function Home() {
  const router = useRouter();
  const [openModal, setOpenModal] = useState(false);

  return (
    <>
      <main
        className="min-h-screen bg-[#F7F7F7] dark:bg-[#17111F] 
      flex flex-col justify-start items-center text-black dark:text-white px-4 pb-10 relative"
      >
        {/* CENTER SECTION */}
        <motion.div
          className="flex flex-col items-center justify-center text-center w-full max-w-md
        mt-12 sm:mt-20"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Prize Pool */}
          <motion.div
            variants={itemVariants}
            className="
    bg-gradient-to-r from-purple-500/20 to-yellow-500/20
    dark:from-purple-400/10 dark:to-yellow-400/10
    backdrop-blur-xl
    border border-white/30 dark:border-gray-700/40
    px-4 py-3 rounded-2xl shadow-lg
    mb-6 mt-6 md:mt-0
  "
          >
            <p
              className="text-sm sm:text-base font-semibold 
     text-purple-800 dark:text-yellow-300 leading-relaxed text-center"
            >
              Sharpen your mind, beat the clock, and unlock instant rewards with{" "}
              <span className="font-bold">Celo MiniPay</span>.
            </p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="backdrop-blur-md bg-gradient-to-br from-yellow-400/20 to-purple-500/20
            border-2 border-yellow-400/40 dark:border-yellow-500/40 rounded-3xl p-6 w-full mb-6 
            shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <FaTrophy className="text-yellow-500 text-3xl animate-bounce" />
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-300 font-semibold mb-1">
                PRIZE POOL
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-5xl font-bold text-purple-700 dark:text-purple-200">
                  2.5
                </span>
                <div className="text-left">
                  <p className="text-2xl font-bold text-yellow-500">CELO</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Per Winner
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Title */}

          <UserBalance />

          {/* Instructions */}
          <motion.div
            variants={itemVariants}
            className="backdrop-blur-md bg-white/30 dark:bg-white/10
          border border-white/40 dark:border-gray-700 rounded-2xl p-4 sm:p-6 
          text-left w-full text-sm sm:text-base mb-6 shadow-md space-y-4"
          >
            <h2 className="text-lg sm:text-xl font-bold text-purple-700 dark:text-purple-300 mb-2">
              How to Play
            </h2>

            <div className="flex items-start gap-3">
              <FaStopwatch className="text-purple-600 dark:text-purple-300 mt-1" />
              <p>
                10 questions:{" "}
                <strong className="text-yellow-600 dark:text-yellow-400">
                  15 seconds
                </strong>{" "}
                each.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <FaListOl className="text-green-600 dark:text-green-300 mt-1" />
              <p>No going back. Think fast!</p>
            </div>

            <div className="flex items-start gap-3">
              <FaForward className="text-blue-600 dark:text-blue-300 mt-1" />
              <p>Auto-skip when timer ends.</p>
            </div>

            <div className="flex items-start gap-3">
              <FaBolt className="text-pink-600 dark:text-pink-300 mt-1" />
              <p>Timer starts immediately.</p>
            </div>
          </motion.div>

          {/* Start Button */}
          <motion.button
            variants={itemVariants}
            onClick={() => setOpenModal(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-purple-600 dark:bg-purple-400 text-white px-8 py-3 
          rounded-2xl font-bold text-lg flex items-center justify-center gap-3 
          hover:bg-purple-700 dark:hover:bg-purple-500 transition-all duration-300 shadow-lg mb-10"
          >
            <FaPlay />
            Start Quiz
          </motion.button>
        </motion.div>

        {/* MODAL - Unchanged (keeps your design) */}
        <AnimatePresence>
          {openModal && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpenModal(false)}
              />

              <motion.div
                className="fixed bottom-0 left-0 right-0 mx-auto backdrop-blur-xl 
              bg-white/40 dark:bg-black/40 border border-white/50 dark:border-gray-700 
              text-black dark:text-white rounded-t-3xl p-6 z-50 max-h-[80vh] 
              overflow-y-auto shadow-2xl"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 140 }}
              >
                <button
                  onClick={() => setOpenModal(false)}
                  className="absolute top-4 right-4 bg-white/60 dark:bg-black/60 
    backdrop-blur-md p-2 rounded-full shadow hover:scale-110 
    transition-all"
                >
                  ✕
                </button>
                <h2 className="text-xl font-bold text-center mb-5">
                  Choose your Quest
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-20">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <motion.button
                        key={cat.category}
                        onClick={() =>
                          router.push(`/quiz?category=${cat.category}`)
                        }
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-4 bg-white/70 dark:bg-white/10 
                        backdrop-blur-lg border border-gray-200 dark:border-gray-700 
                        p-4 rounded-xl shadow-sm hover:shadow-md transition"
                      >
                        <div className="bg-purple-600 dark:bg-purple-400 p-3 rounded-xl text-white shadow">
                          <Icon size={22} />
                        </div>

                        <div className="text-left">
                          <p className="font-bold text-lg">{cat.label}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {cat.desc}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </>
  );
}

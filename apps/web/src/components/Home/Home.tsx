"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";

import {
  FaFlask,
  FaAtom,
  FaBrain,
  FaBook,
  FaCalculator,
  FaGlobeAfrica,
  FaLaptopCode,
  FaBriefcase,
  FaPalette,
  FaBalanceScale,
  FaBuilding,
  FaHeartbeat,
  FaTools,
  FaChartLine,
  FaLeaf,
  FaMicroscope,
  FaGlobe,
  FaLanguage,
  FaHammer,
  FaCode,
  FaUserGraduate,
  FaLandmark,
  FaHistory,
  FaMapMarkedAlt,
  FaBolt,
  FaTrophy,
  FaStopwatch,
  FaListOl,
  FaForward,
  FaPlay,
  FaWallet,
} from "react-icons/fa";

import { UserBalance } from "@/components/user-balance";
import { WalletIcon, X } from "lucide-react";
import { ConnectButton } from "../connect-button";
import LoadingScreen from "../Loading";

// Animations
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

// ALL CATEGORIES (EXPANDED)

const categoriesList = [
  // ===== NATURAL SCIENCES =====
  {
    label: "Physics",
    category: "Physics",
    icon: FaAtom,
    desc: "Matter, motion & energy",
  },
  {
    label: "Chemistry",
    category: "Chemistry",
    icon: FaFlask,
    desc: "Elements & reactions",
  },
  {
    label: "Biology",
    category: "Biology",
    icon: FaBrain,
    desc: "Living organisms",
  },
  {
    label: "Mathematics",
    category: "Mathematics",
    icon: FaCalculator,
    desc: "Algebra, calculus & geometry",
  },
  {
    label: "Statistics",
    category: "Statistics",
    icon: FaChartLine,
    desc: "Data analysis & probability",
  },
  {
    label: "Geology",
    category: "Geology",
    icon: FaGlobe,
    desc: "Earth, rocks & minerals",
  },
  {
    label: "Environmental Science",
    category: "Environmental Science",
    icon: FaLeaf,
    desc: "Ecosystems & sustainability",
  },
  {
    label: "Microbiology",
    category: "Microbiology",
    icon: FaMicroscope,
    desc: "Microorganisms & infections",
  },
  {
    label: "Biochemistry",
    category: "Biochemistry",
    icon: FaMicroscope,
    desc: "Chemistry of living organisms",
  },
  {
    label: "Marine Biology",
    category: "Marine Biology",
    icon: FaGlobe,
    desc: "Life under the sea",
  },

  // ===== ENGINEERING =====
  {
    label: "Mechanical Engineering",
    category: "Mechanical Engineering",
    icon: FaTools,
    desc: "Machines, engines & design",
  },
  {
    label: "Electrical Engineering",
    category: "Electrical Engineering",
    icon: FaBolt,
    desc: "Electronics, circuits & power",
  },
  {
    label: "Civil Engineering",
    category: "Civil Engineering",
    icon: FaBuilding,
    desc: "Construction & infrastructure",
  },
  {
    label: "Chemical Engineering",
    category: "Chemical Engineering",
    icon: FaFlask,
    desc: "Industrial chemical processes",
  },
  {
    label: "Computer Engineering",
    category: "Computer Engineering",
    icon: FaLaptopCode,
    desc: "Hardware, chips & computing",
  },
  {
    label: "Software Engineering",
    category: "Software Engineering",
    icon: FaCode,
    desc: "Software systems & design",
  },
  {
    label: "Petroleum Engineering",
    category: "Petroleum Engineering",
    icon: FaHammer,
    desc: "Oil, gas & drilling",
  },
  {
    label: "Aerospace Engineering",
    category: "Aerospace Engineering",
    icon: FaTools,
    desc: "Aircraft & spacecraft design",
  },
  {
    label: "Mechatronics Engineering",
    category: "Mechatronics Engineering",
    icon: FaTools,
    desc: "Robotics, sensors & automation",
  },

  // ===== TECHNOLOGY & COMPUTING =====
  {
    label: "Computer Science",
    category: "Computer Science",
    icon: FaLaptopCode,
    desc: "Programming & algorithms",
  },
  {
    label: "Information Technology",
    category: "Information Technology",
    icon: FaLaptopCode,
    desc: "Networking & systems",
  },
  {
    label: "Cybersecurity",
    category: "Cybersecurity",
    icon: FaLaptopCode,
    desc: "Digital protection & security",
  },
  {
    label: "Artificial Intelligence",
    category: "Artificial Intelligence",
    icon: FaBrain,
    desc: "Machine learning & automation",
  },
  {
    label: "Data Science",
    category: "Data Science",
    icon: FaChartLine,
    desc: "Big data & insights",
  },

  // ===== MEDICINE & HEALTH =====
  {
    label: "Medicine",
    category: "Medicine",
    icon: FaHeartbeat,
    desc: "Human health & diseases",
  },
  {
    label: "Nursing",
    category: "Nursing",
    icon: FaHeartbeat,
    desc: "Patient care & support",
  },
  {
    label: "Pharmacy",
    category: "Pharmacy",
    icon: FaFlask,
    desc: "Drugs, medicines & care",
  },
  {
    label: "Physiology",
    category: "Physiology",
    icon: FaHeartbeat,
    desc: "Body systems & functions",
  },
  {
    label: "Medical Laboratory Science",
    category: "Medical Laboratory Science",
    icon: FaMicroscope,
    desc: "Diagnostics & testing",
  },
  {
    label: "Public Health",
    category: "Public Health",
    icon: FaHeartbeat,
    desc: "Community health & safety",
  },
  {
    label: "Dentistry",
    category: "Dentistry",
    icon: FaHeartbeat,
    desc: "Oral health & treatment",
  },
  {
    label: "Veterinary Medicine",
    category: "Veterinary Medicine",
    icon: FaHeartbeat,
    desc: "Animal health & care",
  },

  // ===== BUSINESS & MANAGEMENT =====
  {
    label: "Economics",
    category: "Economics",
    icon: FaChartLine,
    desc: "Markets & decision-making",
  },
  {
    label: "Business Administration",
    category: "Business Administration",
    icon: FaBriefcase,
    desc: "Management & leadership",
  },
  {
    label: "Accounting",
    category: "Accounting",
    icon: FaBook,
    desc: "Financial reporting & audits",
  },
  {
    label: "Finance",
    category: "Finance",
    icon: FaChartLine,
    desc: "Money, investments & markets",
  },
  {
    label: "Marketing",
    category: "Marketing",
    icon: FaBriefcase,
    desc: "Branding & consumer behavior",
  },
  {
    label: "Entrepreneurship",
    category: "Entrepreneurship",
    icon: FaBriefcase,
    desc: "Business creation & growth",
  },
  {
    label: "Human Resource Management",
    category: "Human Resource Management",
    icon: FaUserGraduate,
    desc: "People, culture & work",
  },

  // ===== SOCIAL SCIENCES =====
  {
    label: "Political Science",
    category: "Political Science",
    icon: FaBalanceScale,
    desc: "Governments & politics",
  },
  {
    label: "International Relations",
    category: "International Relations",
    icon: FaGlobeAfrica,
    desc: "Global diplomacy",
  },
  {
    label: "Sociology",
    category: "Sociology",
    icon: FaUserGraduate,
    desc: "Human behavior & society",
  },
  {
    label: "Psychology",
    category: "Psychology",
    icon: FaBrain,
    desc: "Human mind & behavior",
  },
  {
    label: "Mass Communication",
    category: "Mass Communication",
    icon: FaBook,
    desc: "Media, journalism & PR",
  },
  {
    label: "Criminology",
    category: "Criminology",
    icon: FaBalanceScale,
    desc: "Crime & justice",
  },

  // ===== ARTS & HUMANITIES =====
  {
    label: "English & Literary Studies",
    category: "English & Literary Studies",
    icon: FaBook,
    desc: "Language & literature",
  },
  {
    label: "History",
    category: "History",
    icon: FaHistory,
    desc: "Human past & civilizations",
  },
  {
    label: "Philosophy",
    category: "Philosophy",
    icon: FaBalanceScale,
    desc: "Ideas, logic & existence",
  },
  {
    label: "Fine Arts",
    category: "Fine Arts",
    icon: FaPalette,
    desc: "Creativity & expression",
  },
  {
    label: "Linguistics",
    category: "Linguistics",
    icon: FaLanguage,
    desc: "Languages & structure",
  },
  {
    label: "Theatre Arts",
    category: "Theatre Arts",
    icon: FaPalette,
    desc: "Drama, film & performance",
  },

  // ===== AGRICULTURE =====
  {
    label: "Agricultural Science",
    category: "Agricultural Science",
    icon: FaLeaf,
    desc: "Farming, crops & livestock",
  },
  {
    label: "Food Science",
    category: "Food Science",
    icon: FaLeaf,
    desc: "Food safety & processing",
  },
  {
    label: "Forestry",
    category: "Forestry",
    icon: FaLeaf,
    desc: "Forest conservation & resources",
  },
  {
    label: "Fisheries",
    category: "Fisheries",
    icon: FaLeaf,
    desc: "Fish farming & management",
  },

  // ===== LAW & ADMINISTRATION =====
  {
    label: "Law",
    category: "Law",
    icon: FaBalanceScale,
    desc: "Legal systems & justice",
  },
  {
    label: "Public Administration",
    category: "Public Administration",
    icon: FaLandmark,
    desc: "Government policy & management",
  },
];

export default function Home() {
  const router = useRouter();
  const [openModal, setOpenModal] = useState(false);
  const [search, setSearch] = useState("");
  const { isConnected } = useAccount();
  // FILTERED LIST FOR SEARCH
  const filteredCategories = categoriesList.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <main
        className="min-h-screen bg-[#F7F7F7] dark:bg-[#17111F] 
      flex flex-col justify-start items-center text-black dark:text-white px-4 pb-10 relative"
      >
        {/* CENTER */}
        <motion.div
          className="flex flex-col items-center justify-center text-center w-full max-w-md mt-12 sm:mt-20 mb-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* PRIZE POOL */}
          <motion.div
            variants={itemVariants}
            className="bg-gradient-to-r mt-8 md:mt-0 from-[#2596be]/20 to-yellow-500/20 
  dark:from-[#2596be]/10 dark:to-yellow-400/10 backdrop-blur-xl
  border border-white/30 dark:border-gray-700/40 px-4 py-3 rounded-2xl shadow-lg mb-6"
          >
            <p className="text-sm sm:text-base font-semibold text-[#2596be] dark:text-yellow-300">
              Test your wits on any topic, course, or subject of your choice and{" "}
              <b>win exciting rewards</b> instantly with <b>Celo MiniPay</b>!
              Challenge yourself and prove how smart you really are.
            </p>
          </motion.div>

          {/* <LoadingScreen/> */}

          {/* PRIZE CARD */}
          <motion.div
            variants={itemVariants}
            className="backdrop-blur-md bg-gradient-to-br from-yellow-400/20 to-[#2596be]/20
    border-2 border-yellow-400/40 rounded-3xl p-6 w-full mb-6 shadow-xl relative overflow-hidden"
          >
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#2596be]/10 rounded-full blur-2xl"></div>

            <div className="relative z-10">
              <FaTrophy className="text-yellow-500 text-3xl mx-auto mb-2 animate-bounce" />

              <p className="text-sm text-[#2596be] font-semibold">PRIZE POOL</p>

              <div className="flex items-center justify-center gap-2">
                <span className="text-5xl font-bold text-[#2596be]">2.5</span>
                <div>
                  <p className="text-2xl font-bold text-yellow-500">CELO</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Per Winner
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <UserBalance />

          {/* HOW TO PLAY */}
          <motion.div
            variants={itemVariants}
            className="backdrop-blur-md bg-white/30 dark:bg-white/10
    border border-white/40 rounded-2xl md:p-4 p-3  w-full mb-6 shadow-md space-y-4"
          >
            <h2 className="text-lg sm:text-xl font-bold text-[#2596be]">
              How to Play
            </h2>

            <div className="flex items-start gap-3">
              <FaStopwatch className="text-[#2596be] mt-1" />
              <p>
                10 questions, <b>15 seconds</b> each.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <FaListOl className="text-green-600 mt-1" />
              <p>No going back. Think fast!</p>
            </div>

            <div className="flex items-start gap-3">
              <FaForward className="text-blue-600 mt-1" />
              <p>Auto skip on timeout.</p>
            </div>

            <div className="flex items-start gap-3">
              <FaBolt className="text-pink-600 mt-1" />
              <p>Timer starts instantly.</p>
            </div>
          </motion.div>

          {/* START BUTTON */}
          {/* IF CONNECTED → SHOW PLAY BUTTON */}
          {isConnected ? (
            <motion.button
              variants={itemVariants}
              onClick={() => setOpenModal(true)}
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.95 }}
              className="
      relative overflow-hidden group
      bg-gradient-to-r from-[#2596be] to-[#1f82a7]
      dark:from-[#1f82a7] dark:to-[#2596be]
      text-white px-10 py-4 rounded-3xl font-bold text-lg
      flex items-center justify-center gap-3
      shadow-[0_8px_25px_rgba(37,150,190,0.35)]
      mb-10
    "
            >
              {/* Glow */}
              <span
                className="absolute inset-0 bg-white/20 dark:bg-white/10 
      opacity-0 group-hover:opacity-100 transition duration-300"
              />
              {/* Shine */}
              <span
                className="absolute -left-16 top-0 w-12 h-full bg-white/30 
      rotate-12 group-hover:translate-x-[400%] transition-transform duration-700"
              />
              {/* Icon */}
              <FaPlay className="text-white group-hover:rotate-12 transition-all duration-300" />
              {/* Text */}
              Play
            </motion.button>
          ) : (
            /* IF NOT CONNECTED → SHOW CONNECT BUTTON */
            <ConnectButton
              label="Connect Wallet to Play"
              icon={
                <WalletIcon
                  size={22}
                  className="text-white group-hover:rotate-12 transition-all duration-300"
                />
              }
            />
          )}
        </motion.div>

        {/* MODAL */}
        {/* MODAL */}
        <AnimatePresence>
          {openModal && (
            <>
              {/* Overlay */}
              <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpenModal(false)}
              />

              {/* Bottom Modal */}
              <motion.div
                className="fixed bottom-0 left-0 right-0 mx-auto
        bg-white/40 dark:bg-black/40 backdrop-blur-2xl 
        border border-white/50 dark:border-gray-700
        text-black dark:text-white
        rounded-t-3xl z-50 w-full max-h-[85vh] shadow-2xl
        overflow-hidden"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 140 }}
              >
                {/* FIXED HEADER */}
                <div
                  className="sticky top-0 z-50 bg-white/60 dark:bg-black/60 
        backdrop-blur-xl border-b border-white/40 dark:border-gray-700
        px-6 pt-6 pb-4"
                >
                  {/* Close Button */}
                  <button
                    onClick={() => setOpenModal(false)}
                    className="absolute top-4 right-4 p-2 rounded-full 
              bg-white/70 dark:bg-white/20 backdrop-blur-md 
              shadow hover:scale-110 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <h2 className="text-xl font-bold text-center mb-4">
                    Choose your Quest
                  </h2>

                  {/* Search */}
                  <input
                    type="text"
                    placeholder="Search category..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-white/80 dark:bg-white/10
            border border-gray-300 dark:border-gray-700 outline-none focus:ring-2 
            focus:ring-[#2596be] mb-3"
                  />

                  {/* CUSTOM CATEGORY (AI powered) */}

                  <div>
                    <input
                      type="text"
                      placeholder="Ask AI to create questions about anything..."
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") {
                          const value = e.currentTarget.value.trim();
                          router.push(`/quiz?category=${value}`);
                          setOpenModal(false);
                        }
                      }}
                      className="w-full px-4 py-2 rounded-xl bg-white/80 dark:bg-white/10
            border border-gray-300 dark:border-gray-700 outline-none 
            focus:ring-2 focus:ring-[#2596be]"
                    />
                  </div>
                </div>

                {/* CATEGORY LIST (scrolls) */}
                <div className="px-6 pt-4 pb-20 overflow-y-auto max-h-[calc(85vh-170px)]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredCategories.map((cat) => {
                      const Icon = cat.icon;

                      return (
                        <motion.button
                          key={cat.category}
                          onClick={() => {
                            router.push(`/quiz?category=${cat.category}`);
                            setOpenModal(false);
                          }}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="flex items-center gap-4 bg-white/70 dark:bg-white/10 
                  backdrop-blur-lg border border-gray-200 dark:border-gray-700 
                  p-4 rounded-xl shadow-sm hover:shadow-md transition"
                        >
                          <div className="bg-[#2596be] p-3 rounded-xl text-white shadow">
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
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </>
  );
}

{
  /* <ConnectButton label="Connect Wallet to Play" /> */
}
{
  /* <ConnectButton 
  label="Start Game"
  icon={<FaWallet size={22} color="yellow" />}
/> */
}

{
  /* <ConnectButton iconOnly /> */
}

{
  /* <ConnectButton icon={null} /> */
}

// <ConnectButton
//   iconOnly
//   icon={<FaWallet size={24} color="#fff" />}
// />

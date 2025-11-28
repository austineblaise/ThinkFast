"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function SplashScreen() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-[#0a0a0a] relative overflow-hidden">

      {/* --- Floating Gradient Blobs --- */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-[#0095FF] blur-[180px] opacity-20 -top-40 -left-32 animate-pulse" />
      <div className="absolute w-[600px] h-[600px] rounded-full bg-[#00E5FF] blur-[180px] opacity-20 -bottom-40 -right-32 animate-pulse" />

      {/* --- Floating Particles --- */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-[#0095FF]/40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: [0.1, 1, 0.1],
            y: [-10, 10, -10],
            x: [0, 10, -10, 0],
          }}
          transition={{
            duration: 4 + Math.random() * 3,
            repeat: Infinity,
            delay: i * 0.2,
          }}
          style={{
            top: Math.random() * 100 + "%",
            left: Math.random() * 100 + "%",
          }}
        />
      ))}

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="flex flex-col items-center gap-5 relative z-10"
      >

        {/* --- Glow Ring Behind Logo --- */}
        <div className="absolute -top-10 w-[190px] h-[190px] rounded-full bg-gradient-to-br from-[#0095FF] to-[#00E5FF] opacity-30 blur-[60px]"></div>

        {/* --- Logo Card (Glassmorphism) --- */}
        <motion.div
          initial={{ scale: 0.7 }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="backdrop-blur-xl bg-white/50 dark:bg-white/10 p-8 rounded-3xl shadow-xl border border-white/40 dark:border-white/10 relative"
        >
          <Image
            src="/ask.avif"
            alt="App Logo"
            width={85}
            height={85}
            className="object-contain rounded-xl"
          />
        </motion.div>

        {/* App Name */}
        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-black dark:text-white text-4xl font-extrabold tracking-wide drop-shadow-md"
        >
          Think Fast
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-gray-600 dark:text-gray-300 text-sm font-medium"
        >
          AI-Powered Celo MiniPay Trivia
        </motion.p>

        {/* --- Animated Loading Dots --- */}
        <motion.div
          className="flex gap-2 mt-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-[#0095FF]"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>

        {/* Loading Text */}
        <motion.p
          className="text-[#0080E5]/80 text-xs font-semibold tracking-wide mt-3"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
        >
          Loading...
        </motion.p>

      </motion.div>
    </div>
  );
}

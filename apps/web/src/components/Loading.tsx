"use client";

import React from "react";
import { FaBrain, FaInfoCircle, FaSpinner, FaCircle } from "react-icons/fa";
import { useSearchParams } from "next/navigation";

const loadingSteps = [
  "Initializing AI engine...",
  "Preparing optimized question set...",
  "Analyzing difficulty curve...",
  "Generating your personalized challenge...",
  "Almost ready...",
];

const AnimatedDot = () => (
  <FaCircle
    className="text-[#2596be] opacity-70 animate-pulse mx-1"
    size={10}
  />
);

const LoadingScreen = () => {
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);

  const searchParams = useSearchParams();
  const category = searchParams.get("category");

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % loadingSteps.length);
    }, 2300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen  transition-all duration-300">
      <div className="w-full max-w-md p-8 rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-800 relative overflow-hidden">
        {/* Soft Glow Accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2596be]/10 via-transparent to-[#2596be]/10 opacity-60"></div>

        {/* Shine sweep */}
        <div className="absolute inset-0 -translate-x-full bg-white/20 backdrop-blur-[1px] animate-[shine_2s_infinite]"></div>
        <style jsx>{`
          @keyframes shine {
            0% {
              transform: translateX(-100%);
            }
            60% {
              transform: translateX(100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
        `}</style>

        <div className="relative z-10 text-center justify-center flex flex-col items-center">
          {/* Brain Icon */}
  

          <div
            className="mb-4 px-4 py-1.5 rounded-full bg-[#2596be]/10 border border-[#2596be]/30 
       text-[#2596be] dark:text-[#5ab0d1] text-sm font-semibold 
       shadow-sm backdrop-blur-md flex items-center gap-2 animate-pulse"
          >
           
            {category ?? "Unknown"}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold tracking-tight mb-6 text-[#2596be] dark:text-[#5ab0d1]">
            Preparing Your Questions...
          </h1>

          {/* Subtle Info Box */}
          <div className="p-5 mb-8 rounded-2xl bg-[#2596be]/5 dark:bg-[#2596be]/10 border border-[#2596be]/20">
            <p className="flex items-center justify-center text-sm text-gray-700 dark:text-gray-300 mb-1">
              <FaInfoCircle className="mr-2 text-[#2596be]" />
              {/* <span className="font-semibold">Smart Fact</span> */}
            </p>

            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Each question set is{" "}
              <span className="font-semibold text-[#2596be] mr-1">
                AI-generated
              </span>
              based on your chosen category, ensuring a unique and tailored
              experience every time!
            </p>
          </div>

          {/* Current Step */}
          <div className="mt-8">
            <p className="text-base font-medium text-gray-800 dark:text-gray-200 flex items-center justify-center gap-2">
              <FaSpinner className="animate-spin text-[#2596be]" />
              {loadingSteps[currentStepIndex]}
            </p>

            {/* Dots */}
            <div className="flex justify-center items-center mt-4">
              <AnimatedDot />
              <AnimatedDot />
              <AnimatedDot />
            </div>

            {/* Footer text */}
            <p className="mt-6 text-xs italic text-gray-500 dark:text-gray-400">
              Optimizing your gameplay experience...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;

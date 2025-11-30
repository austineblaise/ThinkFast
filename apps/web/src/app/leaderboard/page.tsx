"use client";

import Leaderboard from "@/components/LeaderBoard/LeaderBoard";



export default function LeaderboardPage() {
  return (
    <div className="relative min-h-screen p-6 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      {/* Background Decor similar to QuizGame */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#2596be]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 pt-10">
        <Leaderboard />
      </div>
    </div>
  );
}
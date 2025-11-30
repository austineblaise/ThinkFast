"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaHome,
  FaCrown,
  FaGift,
  FaHistory,
} from "react-icons/fa";

export default function BottomTabs() {
  const path = usePathname();

  const tabs = [
    { href: "/", icon: FaHome, label: "Home" },
    { href: "/leaderboard", icon: FaCrown, label: "Leaderboard" },
    { href: "/quiz/history", icon: FaHistory, label: "My history" },
  ];

  return (
    <div
      className="
        fixed bottom-3 left-1/2 -translate-x-1/2
        w-[94%] max-w-md
        bg-white/60 dark:bg-black/40
        backdrop-blur-xl
        border border-white/30 dark:border-gray-700
        shadow-2xl rounded-3xl
        py-2 px-4 flex justify-between items-center
        z-50
      "
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = path === t.href;

        return (
          <Link
            href={t.href}
            key={t.href}
            className="
              flex-1 flex flex-col items-center gap-1 py-1
            "
          >
            <div
              className={`
                flex flex-col items-center transition-all duration-200
                ${active ? "scale-110" : "opacity-70 hover:opacity-100"}
              `}
            >
              <Icon
                className={`
                  text-lg transition-all duration-200
                  ${active ? "text-[#2596be] drop-shadow-[0_0_8px_rgba(168,85,247,0.7)]" : "text-gray-700 dark:text-gray-300"}
                `}
              />
              <span
                className={`
                  text-[10px] font-medium transition-all duration-200
                  ${active ? "text-[#2596be] font-semibold" : "text-gray-700 dark:text-gray-300"}
                `}
              >
                {t.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

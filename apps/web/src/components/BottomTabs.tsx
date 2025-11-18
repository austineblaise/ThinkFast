"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHome, FaCrown, FaGift, FaCalendarDay } from "react-icons/fa";

export default function BottomTabs() {
  const path = usePathname();

  const tabs = [
    { href: "/", icon: <FaHome />, label: "Home" },
    { href: "/leaderboard", icon: <FaCrown />, label: "Ranks" },
    { href: "/daily", icon: <FaCalendarDay />, label: "Daily" },
    { href: "/claim", icon: <FaGift />, label: "Claim" },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-[#1e162b] text-white border-t border-purple-800 py-3 flex justify-around  z-50">
      {tabs.map((t) => (
        <Link href={t.href} key={t.href}>
          <div className={`flex flex-col items-center text-xs ${
            path === t.href ? "text-purple-400" : "text-gray-300"
          }`}>
            {t.icon}
            <span>{t.label}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

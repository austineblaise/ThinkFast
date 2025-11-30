"use client";

import { useEffect, useState } from "react";
import { FaSun, FaMoon, FaBolt } from "react-icons/fa";
import { ConnectButton } from "@/components/connect-button";
import { Button } from "@/components/ui/button";
import { useAccount } from "wagmi";

export default function Navbar() {
  const [theme, setTheme] = useState("light");
  const { isConnected } = useAccount();

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored) {
      setTheme(stored);
      document.documentElement.classList.toggle("dark", stored === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg
      bg-white/60 dark:bg-black/40 shadow-md border-b border-white/30
      dark:border-gray-700 flex items-center justify-between
      px-4 md:px-6 py-3"
    >
      <div className="flex items-center gap-3">
        {!isConnected ? (
          <h1
            className="font-extrabold text-lg md:text-2xl tracking-wide 
            bg-gradient-to-r from-[#2596be] to-yellow-500 bg-clip-text text-transparent
            drop-shadow-sm"
          >
            Think Fast
          </h1>
        ) : (
          <div
            className="flex items-center gap-3
  bg-gradient-to-br from-[#2596be]/20 to-yellow-500/20
  border border-white/30 dark:border-gray-700/40 shadow-xl
  backdrop-blur-md"
          >
            <div
              className="w-12 flex items-center justify-center
    bg-gradient-to-br from-[#2596be] to-yellow-500
    shadow-lg relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 blur-xl"></div>

              <span
                className="relative z-10 font-extrabold text-xl text-white tracking-wide 
      drop-shadow-[0_3px_3px_rgba(0,0,0,0.25)]"
              >
                TF
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <Button asChild className="px-4 py-2 rounded-xl">
          <ConnectButton iconOnly />
        </Button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 
          transition-all duration-300 shadow flex items-center justify-center
          hover:scale-105 hover:rotate-6"
        >
          {theme === "light" ? (
            <FaMoon className="text-black text-lg md:text-xl" />
          ) : (
            <FaSun className="text-yellow-300 text-lg md:text-xl" />
          )}
        </button>
      </div>
    </nav>
  );
}

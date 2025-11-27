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
      {/* LEFT – Brand */}
      <div className="flex items-center gap-3">
        {!isConnected ? (
          // Text Version (when not connected)
          <h1
            className="font-extrabold text-lg md:text-2xl tracking-wide 
            bg-gradient-to-r from-[#2596be] to-yellow-500 bg-clip-text text-transparent
            drop-shadow-sm"
          >
            Think Fast
          </h1>
        ) : (
          // Logo Version (when connected)
          <div
            className="flex items-center gap-3
  bg-gradient-to-br from-[#2596be]/20 to-yellow-500/20
  border border-white/30 dark:border-gray-700/40 shadow-xl
  backdrop-blur-md"
          >
            {/* TF LOGO */}
            <div
              className="w-12 flex items-center justify-center
    bg-gradient-to-br from-[#2596be] to-yellow-500
    shadow-lg relative overflow-hidden"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-white/20 blur-xl"></div>

              <span
                className="relative z-10 font-extrabold text-xl text-white tracking-wide 
      drop-shadow-[0_3px_3px_rgba(0,0,0,0.25)]"
              >
                TF
              </span>
            </div>

            {/* TITLE (optional — you can remove this if you want only logo) */}
          </div>
        )}
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* Connect Button */}
        <Button asChild className="px-4 py-2 rounded-xl">
          <ConnectButton />
        </Button>

        {/* Theme Toggle */}
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

// "use client"

// import Link from "next/link"
// import Image from "next/image"
// import { usePathname } from "next/navigation"
// import { Menu, ExternalLink } from "lucide-react"

// import { Button } from "@/components/ui/button"
// import {
//   Sheet,
//   SheetContent,
//   SheetTrigger,
// } from "@/components/ui/sheet"
// import { ConnectButton } from "@/components/connect-button"

// const navLinks = [
//   { name: "Home", href: "/" },
//   { name: "Docs", href: "https://docs.celo.org", external: true },
// ]

// export function Navbar() {
//   const pathname = usePathname()

//   return (
//     <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
//       <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
//         <div className="flex items-center gap-2">
//           {/* Mobile menu button */}
//           <Sheet>
//             <SheetTrigger asChild>
//               <Button variant="ghost" size="icon" className="md:hidden">
//                 <Menu className="h-5 w-5" />
//                 <span className="sr-only">Toggle menu</span>
//               </Button>
//             </SheetTrigger>
//             <SheetContent side="left" className="w-80">
//               <div className="flex items-center gap-2 mb-8">

//                 <span className="font-bold text-lg">
//                   my-celo-app
//                 </span>
//               </div>
//               <nav className="flex flex-col gap-4">
//                 {navLinks.map((link) => (
//                   <Link
//                     key={link.href}
//                     href={link.href}
//                     target={link.external ? "_blank" : undefined}
//                     rel={link.external ? "noopener noreferrer" : undefined}
//                     className={`flex items-center gap-2 text-base font-medium transition-colors hover:text-primary ${
//                       pathname === link.href ? "text-foreground" : "text-foreground/70"
//                     }`}
//                   >
//                     {link.name}
//                     {link.external && <ExternalLink className="h-4 w-4" />}
//                   </Link>
//                 ))}
//                 <div className="mt-6 pt-6 border-t">
//                   <Button asChild className="w-full">
//                      <ConnectButton />
//                   </Button>
//                 </div>
//               </nav>
//             </SheetContent>
//           </Sheet>

//           {/* Logo */}
//           <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">

//             <span className="hidden font-bold text-xl sm:inline-block">
//               my-celo-app
//             </span>
//           </Link>
//         </div>

//         {/* Desktop navigation */}
//         <nav className="hidden md:flex items-center gap-8">
//           {navLinks.map((link) => (
//             <Link
//               key={link.href}
//               href={link.href}
//               target={link.external ? "_blank" : undefined}
//               rel={link.external ? "noopener noreferrer" : undefined}
//               className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${
//                 pathname === link.href
//                   ? "text-foreground"
//                   : "text-foreground/70"
//               }`}
//             >
//               {link.name}
//               {link.external && <ExternalLink className="h-4 w-4" />}
//             </Link>
//           ))}

//           <div className="flex items-center gap-3">
//             <ConnectButton />
//           </div>
//         </nav>
//       </div>
//     </header>
//   )
// }

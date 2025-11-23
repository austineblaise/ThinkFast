"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function SplashScreen() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-white relative overflow-hidden">

      {/* Glowing gradient background circles (Blue & Cyan) */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-[#0095FF] blur-[170px] opacity-20 -top-32 -left-24" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-[#00E5FF] blur-[170px] opacity-20 -bottom-32 -right-24" />

      {/* Main Logo + App Name */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="flex flex-col items-center gap-5"
      >
        {/* Logo Image (replacing SVG) */}
        <motion.div
          initial={{ scale: 0.6 }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="bg-white p-8 rounded-3xl shadow-2xl border border-black/5"
        >
          <Image
            src="/ask.avif" // ← CHANGE THIS TO YOUR OWN IMAGE
            alt="App Logo"
            width={90}
            height={90}
            className="object-contain"
          />
        </motion.div>

        {/* App Name */}
        <h1 className="text-black text-4xl font-extrabold tracking-wide drop-shadow-sm">
          Think Fast
        </h1>

        {/* Subtitle */}
        <p className="text-gray-600 text-sm">
          AI-Powered Celo MiniPay Trivia
        </p>

        {/* Loading animation */}
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="mt-6 text-[#00A3FF]/80 text-xs font-medium"
        >
          Loading...
        </motion.div>
      </motion.div>
    </div>
  );
}
// "use client";

// import { motion } from "framer-motion";

// export default function SplashScreen() {
//   return (
//     <div className="h-screen w-full flex items-center justify-center bg-[#0d0d0f] relative overflow-hidden">

//       {/* Glowing gradient background circles (Blue & Cyan, NO PURPLE) */}
//       <div className="absolute w-[500px] h-[500px] rounded-full bg-[#0095FF] blur-[170px] opacity-20 -top-32 -left-24" />
//       <div className="absolute w-[500px] h-[500px] rounded-full bg-[#00E5FF] blur-[170px] opacity-20 -bottom-32 -right-24" />

//       {/* Main Logo + App Name */}
//       <motion.div
//         initial={{ opacity: 0, scale: 0.7 }}
//         animate={{ opacity: 1, scale: 1 }}
//         transition={{ duration: 1.1, ease: "easeOut" }}
//         className="flex flex-col items-center gap-5"
//       >
//         {/* AI Brain Logo */}
//         <motion.div
//           initial={{ scale: 0.6 }}
//           animate={{ scale: [1, 1.1, 1] }}
//           transition={{ repeat: Infinity, duration: 2 }}
//           className="bg-[#111215] p-8 rounded-3xl shadow-2xl border border-white/10"
//         >
//           <svg
//             xmlns="http://www.w3.org/2000/svg"
//             className="w-20 h-20 text-[#00E5FF]"
//             fill="none"
//             viewBox="0 0 24 24"
//             stroke="currentColor"
//             strokeWidth="1.5"
//           >
//             <path
//               strokeLinecap="round"
//               strokeLinejoin="round"
//               d="M12 6c-1.657 0-3 1.343-3 3v1H8a2 2 0 00-2 2v1a2 2 0 002 2h1v1a3 3 0 003 3m0-14a3 3 0 013 3v1h1a2 2 0 012 2v1a2 2 0 01-2 2h-1v1a3 3 0 01-3 3m0-14V3m0 18v-3m0 0H9m3 0h3"
//             />
//           </svg>
//         </motion.div>

//         {/* App Name */}
//         <h1 className="text-white text-4xl font-extrabold tracking-wide drop-shadow">
//           Think Fast
//         </h1>

//         {/* Subtitle */}
//         <p className="text-white/60 text-sm">
//           AI-Powered Celo MiniPay Trivia
//         </p>

//         {/* Loading animation */}
//         <motion.div
//           animate={{ opacity: [0.3, 1, 0.3] }}
//           transition={{ repeat: Infinity, duration: 1.2 }}
//           className="mt-6 text-[#00E5FF]/80 text-xs"
//         >
//           Loading...
//         </motion.div>
//       </motion.div>
//     </div>
//   );
// }

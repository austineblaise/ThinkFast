"use client";

import { ConnectButton as RainbowKitConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState, ReactNode } from "react";
import { FaWallet } from "react-icons/fa";

export function ConnectButton({
  label = "Connect Wallet",
  icon = <FaWallet size={18} />,
  iconOnly = false,
}: {
  label?: string;
  icon?: ReactNode;
  iconOnly?: boolean;
}) {
  const [isMinipay, setIsMinipay] = useState(false);

  useEffect(() => {
    // @ts-ignore
    if (window.ethereum?.isMiniPay) {
      setIsMinipay(true);
    }
  }, []);

  if (isMinipay) return null;

  return (
    <RainbowKitConnectButton.Custom>
      {({ account, chain, openConnectModal }) => {
        if (!account || !chain) {
          return (
            <button
              onClick={openConnectModal}
              className={`
                relative group overflow-hidden
                ${iconOnly ? "p-3 rounded-full" : "px-5 py-3 rounded-2xl"}
                bg-gradient-to-r from-[#2596be] to-[#1f82a7]
                text-white text-lg font-semibold
                shadow-[0_8px_20px_rgba(37,150,190,0.35)]
                hover:shadow-[0_8px_25px_rgba(37,150,190,0.45)]
                transition-all duration-300
                flex items-center ${iconOnly ? "justify-center" : "gap-2"}
              `}
            >
              {/* Glow overlay */}
              <span
                className="absolute inset-0 bg-white/20 opacity-0 
                group-hover:opacity-100 transition duration-300 rounded-inherit"
              ></span>

              {/* Shine animation */}
              <span
                className="
                  absolute -left-16 top-0 h-full w-12
                  bg-white/40 opacity-40
                  rotate-12
                  group-hover:translate-x-[350%]
                  transition-transform duration-700
                "
              ></span>

              {/* Icon */}
              <span className="relative z-10 flex items-center">
                {icon}
              </span>

              {/* Label */}
              {!iconOnly && (
                <span className="relative z-10">{label}</span>
              )}
            </button>
          );
        }

        return <RainbowKitConnectButton />;
      }}
    </RainbowKitConnectButton.Custom>
  );
}




// "use client";

// import { ConnectButton as RainbowKitConnectButton } from "@rainbow-me/rainbowkit";
// import { useEffect, useState } from "react";
// import { FaWallet } from "react-icons/fa";

// export function ConnectButton() {
//   const [isMinipay, setIsMinipay] = useState(false);

//   useEffect(() => {
//     // @ts-ignore
//     if (window.ethereum?.isMiniPay) {
//       setIsMinipay(true);
//     }
//   }, []);

//   if (isMinipay) return null;

//   return (
//     <RainbowKitConnectButton.Custom>
//       {({ account, chain, openConnectModal }) => {
//         // Not Connected → Show wallet icon only
//         if (!account || !chain) {
//           return (
//             <button
//               onClick={openConnectModal}
//               className="
//                 p-3 rounded-xl  text-white 
//                 shadow-lg hover:bg-[#1f82a7] transition 
//                 flex items-center justify-center
//               "
//             >
//               <FaWallet size={20} color="#2596be" />
//             </button>
//           );
//         }

//         // Connected → Use RainbowKit’s default UI
//         return <RainbowKitConnectButton />;
//       }}
//     </RainbowKitConnectButton.Custom>
//   );
// }




// "use client";

// import { ConnectButton as RainbowKitConnectButton } from "@rainbow-me/rainbowkit";
// import { useEffect, useState } from "react";

// export function ConnectButton() {
//   const [isMinipay, setIsMinipay] = useState(false);

//   useEffect(() => {
//     // @ts-ignore
//     if (window.ethereum?.isMiniPay) {
//       setIsMinipay(true);
//     }
//   }, []);

//   if (isMinipay) {
//     return null;
//   }

//   return <RainbowKitConnectButton />;
// }

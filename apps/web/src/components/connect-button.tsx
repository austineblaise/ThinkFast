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
              <span
                className="absolute inset-0 bg-white/20 opacity-0 
                group-hover:opacity-100 transition duration-300 rounded-inherit"
              ></span>

              <span
                className="
                  absolute -left-16 top-0 h-full w-12
                  bg-white/40 opacity-40
                  rotate-12
                  group-hover:translate-x-[350%]
                  transition-transform duration-700
                "
              ></span>

              <span className="relative z-10 flex items-center">{icon}</span>

              {!iconOnly && <span className="relative z-10">{label}</span>}
            </button>
          );
        }

        return <RainbowKitConnectButton />;
      }}
    </RainbowKitConnectButton.Custom>
  );
}

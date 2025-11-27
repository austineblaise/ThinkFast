"use client";

import { ConnectButton as RainbowKitConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { FaWallet } from "react-icons/fa";

export function ConnectButton() {
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
        // Not Connected → Show wallet icon only
        if (!account || !chain) {
          return (
            <button
              onClick={openConnectModal}
              className="
                p-3 rounded-xl  text-white 
                shadow-lg hover:bg-[#1f82a7] transition 
                flex items-center justify-center
              "
            >
              <FaWallet size={20} color="#2596be" />
            </button>
          );
        }

        // Connected → Use RainbowKit’s default UI
        return <RainbowKitConnectButton />;
      }}
    </RainbowKitConnectButton.Custom>
  );
}




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

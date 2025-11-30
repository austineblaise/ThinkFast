// import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { http, createConfig } from "wagmi";
// --- CHANGE 1: Import celoSepolia ---
import { celo, celoSepolia } from "wagmi/chains";

export const config = createConfig({
  // --- CHANGE 2: Add celoSepolia to the chains array ---
  chains: [celo, celoSepolia],
  // connectors: [farcasterFrame()],
  transports: {
    // Ensure you provide a transport for both chain IDs
    [celo.id]: http(),
    // --- CHANGE 3: Add transport for celoSepolia ---
    [celoSepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
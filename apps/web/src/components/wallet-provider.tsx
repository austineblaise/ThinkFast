"use client";

import {
  RainbowKitProvider,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

import {
  injectedWallet,
  walletConnectWallet,
  metaMaskWallet,
  coinbaseWallet,
  trustWallet,
  bitgetWallet,
  rainbowWallet,
  bifrostWallet,
  bitskiWallet,
  bitverseWallet,
  bloomWallet,
  braveWallet,
  bybitWallet,
  coin98Wallet,
  coreWallet,
  dawnWallet,
  okxWallet,
  phantomWallet,
  uniswapWallet

  // 🌈 Rainbow Wallet deep-linking
} from "@rainbow-me/rainbowkit/wallets";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { WagmiProvider, createConfig, http, useConnect } from "wagmi";
import { celo, celoAlfajores } from "wagmi/chains";

// Optional UI ConnectButton
import { ConnectButton } from "./connect-button";

const connectors = connectorsForWallets(
  [
    {
     groupName: 'Recommended',
      wallets: [
        metaMaskWallet, // ⭐ MetaMask mobile=deeplink
        coinbaseWallet, // ⭐ Coinbase deeplink
        trustWallet, // ⭐ Trust Wallet deeplink
        rainbowWallet, // ⭐ Rainbow Wallet deeplink
        injectedWallet, // MiniPay + browser wallets
        walletConnectWallet, // WC fallback + QR
        bitgetWallet,
        bifrostWallet,
        bitskiWallet,
        bitverseWallet,
        bloomWallet,
        braveWallet,
        bybitWallet,
        coin98Wallet,
        coreWallet,
        dawnWallet,
        okxWallet,
        phantomWallet,
        uniswapWallet,
      ],
    },
  ],
  {
    appName: "my-celo-app",
    projectId: "aba85f408b481b322b91e2c2e7b341f3",
    // projectId: "2beca34190e412723abcf8aca3b84cdd", // WalletConnect v2
  }
);

// aba85f408b481b322b91e2c2e7b341f3
// aba85f408b481b322b91e2c2e7b341f3

const wagmiConfig: any = createConfig({
  chains: [celo, celoAlfajores],
  connectors,
  transports: {
    [celo.id]: http(),
    [celoAlfajores.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

// -------------------------
// AUTO-CONNECT MINIPAY
// -------------------------
function WalletProviderInner({ children }: { children: React.ReactNode }) {
  const { connect, connectors } = useConnect();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Auto-connect MiniPay
    if (window.ethereum?.isMiniPay) {
      const injectedConnector = connectors.find((c) => c.id === "injected");

      if (injectedConnector) {
        connect({ connector: injectedConnector });
      }
    }
  }, [connect, connectors]);

  return <>{children}</>;
}

// -------------------------
// PROVIDER WRAPPER
// -------------------------
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <WalletProviderInner>{children}</WalletProviderInner>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

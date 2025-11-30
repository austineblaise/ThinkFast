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
  trustWallet,
  bitgetWallet,
  rainbowWallet,
} from "@rainbow-me/rainbowkit/wallets";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http, useConnect } from "wagmi";
import { celo } from "wagmi/chains";

import { defineChain } from "viem";
import { useEffect } from "react";


export const celoSepolia = defineChain({
  id: 11142220,
  name: "Celo Sepolia",
  network: "celo-sepolia",
  nativeCurrency: {
    name: "Celo",
    symbol: "CELO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://forno.celo-sepolia.celo-testnet.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://celo-sepolia.blockscout.com",
    },
  },
});

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        metaMaskWallet,
        trustWallet,
        rainbowWallet,
        injectedWallet,
        walletConnectWallet,
        bitgetWallet,
      ],
    },
  ],
  {
    appName: "my-celo-app",
    projectId: "aba85f408b481b322b91e2c2e7b341f3",
  }
);

const wagmiConfig: any = createConfig({
  chains: [celoSepolia, celo],
  connectors,
  transports: {
    [celoSepolia.id]: http("https://forno.celo-sepolia.celo-testnet.org"),
    [celo.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

function WalletProviderInner({ children }: { children: React.ReactNode }) {
  const { connect, connectors } = useConnect();

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.ethereum?.isMiniPay) {
      const injectedConnector = connectors.find((c) => c.id === "injected");
      if (injectedConnector) connect({ connector: injectedConnector });
    }
  }, [connect, connectors]);

  return <>{children}</>;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
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

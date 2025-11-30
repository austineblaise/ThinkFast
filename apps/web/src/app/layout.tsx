import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { WalletProvider } from "@/components/wallet-provider";
import ClientLayout from "@/components/ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Think Fast",
  description: "AI powered, Celo Minipay game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <ClientLayout>{children}</ClientLayout>
        </WalletProvider>
      </body>
    </html>
  );
}

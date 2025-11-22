import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// import { Navbar } from '@/components/navbar';
import { WalletProvider } from "@/components/wallet-provider"

import BottomTabs from '@/components/BottomTabs';
import Navbar from '@/components/navbar';
import { Toaster } from "sonner";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'my-celo-app',
  description: 'A new Celo blockchain project',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Navbar is included on all pages */}
        <div className="relative flex min-h-screen flex-col">
          <WalletProvider>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>


            <BottomTabs />


             <Toaster
          position="bottom-center"
          richColors
          duration={2500}
        />
          </WalletProvider>
        </div>
      </body>
    </html>
  );
}

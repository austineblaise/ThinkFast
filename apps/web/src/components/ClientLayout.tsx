"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/navbar";
import BottomTabs from "@/components/BottomTabs";
import SplashScreen from "@/components/SplashScreen";
import { Toaster } from "sonner";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">{children}</main>

      <BottomTabs />

      <Toaster position="bottom-center" richColors duration={2500} />
    </div>
  );
}

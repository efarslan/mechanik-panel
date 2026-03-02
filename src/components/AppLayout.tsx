"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = pathname === "/login" || pathname === "/onboarding";

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#f8f8f6]">
      <Sidebar />
      {/* lg: sidebar 224px sabit, mobilde bottom nav için pb ekle */}
      <main className="flex-1 lg:ml-56 pb-16 lg:pb-0 min-w-0">
        {children}
      </main>
    </div>
  );
}
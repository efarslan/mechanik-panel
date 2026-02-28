"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = pathname === "/login" || pathname === "/onboarding";
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sayfa değiştiğinde mobilde sidebar'ı kapat
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [pathname]);

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Hamburger butonu */}
      <button
        onClick={() => setSidebarOpen((prev) => !prev)}
        className="fixed top-4 left-4 z-40 w-9 h-9 flex items-center justify-center bg-white border border-gray-200 rounded-md shadow hover:bg-gray-50"
        aria-label="Menüyü aç"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 text-gray-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : ""} pt-16 lg:pt-0`}>
        {children}
      </main>
    </div>
  );
}

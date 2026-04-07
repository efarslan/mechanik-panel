"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { useAuth } from "@/lib/useAuth";
import { useBusiness } from "@/context/BusinessContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuth();
  const { business, loading } = useBusiness();
  const hideSidebar = pathname === "/login" || pathname === "/onboarding";
  const isLoginPage = pathname === "/login";
  const isOnboardingPage = pathname === "/onboarding";

  useEffect(() => {
    if (user === undefined) return;

    if (isLoginPage) {
      if (!user) return; // public
      if (loading) return;
      router.replace(business ? "/dashboard" : "/onboarding");
      return;
    }

    if (isOnboardingPage) {
      if (!user) {
        router.replace("/login");
        return;
      }
      if (loading) return;
      if (business) router.replace("/dashboard");
      return;
    }

    // Protected app routes
    if (!user) {
      router.replace("/login");
      return;
    }
    if (loading) return;
    if (!business) router.replace("/onboarding");
  }, [user, loading, business, isLoginPage, isOnboardingPage, router]);

  const shouldBlockRender =
    user === undefined ||
    (!isLoginPage && !isOnboardingPage && (user === null || loading || !business)) ||
    (isOnboardingPage && (user === null || (user && loading)));

  if (shouldBlockRender) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-[3px] border-gray-200 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (hideSidebar) return <>{children}</>;

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
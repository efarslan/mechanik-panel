"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { useAuth } from "@/lib/useAuth";
import { useBusiness } from "@/context/BusinessContext";
import { useMembershipRole } from "@/lib/useMembershipRole";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const user = useAuth();
    const { business, loading } = useBusiness();
    const { status: memberStatus, loading: roleLoading } = useMembershipRole();

    const status = memberStatus as any;

    const isLoginPage = pathname === "/login" || pathname?.startsWith("/login/");
    const isSettingsPage = pathname === "/settings";
    const isPendingPage = pathname === "/pending-approval";
    const isOnboardingPage = pathname === "/onboarding";
    const hideSidebar = isLoginPage || isPendingPage || isOnboardingPage;

    useEffect(() => {
        if (isLoginPage) return;
        // Do not interfere with pending page (it manages its own routing)
        if (isPendingPage) return;

        if (user === undefined || loading || roleLoading) return;

        // Not logged in → force login
        if (!user) {
            if (pathname !== "/login") {
                router.replace("/login");
            }
            return;
        }

        // Pending/inactive users → lock to pending page
        if (status === "pending" || status === "inactive") {
            if (pathname !== "/pending-approval") {
                router.replace("/pending-approval");
            }
            return;
        }

        // No business → onboarding (business create / join flow)
        if (!business && !isOnboardingPage) {
            if (pathname !== "/onboarding") {
                router.replace("/onboarding");
            }
            return;
        }

    }, [user, loading, roleLoading, status, business, isLoginPage, isSettingsPage, isPendingPage, isOnboardingPage, pathname, router]);

    // pending-approval sayfası — AppLayout render engellemesi yok
    if (isPendingPage) return <>{children}</>;

    // Login sayfası
    if (isLoginPage) return <>{children}</>;

    // Korumalı sayfalarda yüklenme bekle
    const shouldBlockRender =
        user === undefined ||
        user === null ||
        loading ||
        roleLoading ||
        (!business && !isOnboardingPage);

    if (shouldBlockRender) {
        return (
            <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-9 h-9 border-[3px] border-gray-200 border-t-amber-400 rounded-full animate-spin" />
                    <p className="text-sm text-gray-400 font-medium">Yükleniyor...</p>
                </div>
            </div>
        );
    };

return (
    <div className="flex min-h-screen bg-[#f8f8f6]">
        {!hideSidebar && <Sidebar />}
        <main className={`flex-1 min-w-0 ${!hideSidebar ? "lg:ml-56 pb-16 lg:pb-0" : ""}`}>
            {children}
        </main>
    </div>
);
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBusiness } from "@/context/BusinessContext";
import { LayoutDashboard, Car, PlusCircle, Settings, Wrench } from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Panel",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/vehicles",
    label: "Araçlar",
    icon: Car,
    exact: false,
  },
  {
    href: "/vehicles/new",
    label: "Yeni Araç",
    icon: PlusCircle,
    exact: true,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { business } = useBusiness();

  return (
    <>
      {/* ── Desktop Sidebar — always visible ───────────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-56 flex-col bg-[#111110] z-50">

        {/* Logo / Brand */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center shrink-0">
              <Wrench className="w-3.5 h-3.5 text-[#111110]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white tracking-widest uppercase leading-none">Servis Panel</p>
              {business && (
                <p className="text-[10px] text-white/40 mt-0.5 truncate font-medium">{business.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/[0.06]" />

        {/* Nav */}
        <nav className="flex-1 px-3 pt-4 pb-3 space-y-0.5 overflow-y-auto">
          <p className="px-2 pb-2 text-[9px] font-bold text-white/25 uppercase tracking-widest">Navigasyon</p>
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-white/[0.10] text-white"
                    : "text-white/50 hover:text-white/80 hover:bg-white/[0.05]"
                }`}
              >
                {/* Active accent bar */}
                <span className={`absolute left-3 w-0.5 h-5 rounded-full bg-amber-400 transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`} />

                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-amber-400" : "text-white/30 group-hover:text-white/50"}`} />
                <span className="leading-none">{item.label}</span>

                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/[0.06]" />

        {/* Footer */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white/60">
                {business?.name?.slice(0, 1)?.toUpperCase() ?? "S"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-white/60 truncate">{business?.name ?? "İşletme"}</p>
              <p className="text-[9px] text-white/25 mt-0.5 font-medium uppercase tracking-wider">Aktif</p>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          </div>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ───────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#111110] border-t border-white/[0.06] flex">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                isActive ? "text-amber-400" : "text-white/30 hover:text-white/60"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { useBusiness } from "@/context/BusinessContext";

export default function Dashboard() {
  const user = useAuth();
  const { business, loading } = useBusiness();
  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  useEffect(() => {
    if (!loading && !business) {
      router.push("/onboarding");
    }
  }, [business, loading, router]);

  if (user === undefined || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!business) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Panel</h1>
          <p className="text-gray-500 mt-1">{business.name}</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/vehicles"
            className="group bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:border-gray-300 hover:shadow transition"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center mb-4 group-hover:bg-gray-200 transition">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 17h14v-5H5v5z" />
                <path d="M5 9h14V6H5v3z" />
                <path d="M3 4h18a1 1 0 011 1v14a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Araçlar</h2>
            <p className="text-sm text-gray-500 mt-1">
              Kayıtlı araçları görüntüle ve yönet
            </p>
          </Link>

          <Link
            href="/vehicles/new"
            className="group bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:border-gray-300 hover:shadow transition"
          >
            <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center mb-4 group-hover:bg-gray-800 transition">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Yeni araç ekle</h2>
            <p className="text-sm text-gray-500 mt-1">
              Plaka, marka, model ve sahip bilgileriyle araç kaydet
            </p>
          </Link>
        </div>

        <section className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">İşletme bilgisi</h2>
          </div>
          <div className="p-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">İşletme adı</span>
              <span className="font-medium text-gray-900">{business.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ID</span>
              <span className="font-mono text-gray-700 text-xs">{business.id}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

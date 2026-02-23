"use client";

import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { useBusiness } from "@/context/BusinessContext";

export default function Home() {
  const user = useAuth();
  const { business, loading } = useBusiness();

  if (loading || user === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 mt-1">
            {business ? business.name : "Yükleniyor..."}
          </p>
          <Link
            href="/dashboard"
            className="inline-block mt-6 bg-black text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-800"
          >
            Panele git
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500 mt-1">Devam etmek için giriş yapın.</p>
        <Link
          href="/login"
          className="inline-block mt-6 bg-black text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-800"
        >
          Giriş yap
        </Link>
      </div>
    </div>
  );
}

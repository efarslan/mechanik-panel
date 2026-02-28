"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/context/BusinessContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";

type Vehicle = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  fuelType: string;
  ownerName: string;
};

const fuelTypeMap: Record<string, string> = {
  gasoline: "Benzin",
  diesel: "Dizel",
  electric: "Elektrik",
  hybrid: "Hibrit",
  LPG: "LPG",
};

const IcPlus = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);
const IcCar = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
);
const IcChevron = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);
const IcSearch = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
  </svg>
);

export default function VehiclesPage() {
  const { business, loading } = useBusiness();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [brandLogos, setBrandLogos] = useState<Record<string, string | null>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchBrands = async () => {
      const snapshot = await getDocs(collection(db, "brands"));
      const logos: Record<string, string | null> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        logos[data.name ?? ""] = data.logoUrl ?? null;
      });
      setBrandLogos(logos);
    };
    fetchBrands();
  }, []);

  useEffect(() => {
    const fetchVehicles = async () => {
      if (!business) return;
      const q = query(collection(db, "vehicles"), where("businessId", "==", business.id));
      const snapshot = await getDocs(q);
      const list: Vehicle[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Vehicle, "id">),
      }));
      setVehicles(list);
      setLoadingVehicles(false);
    };
    fetchVehicles();
  }, [business]);

  const filteredVehicles = search.trim()
    ? vehicles.filter((v) => {
        const q = search.toLowerCase();
        return (
          v.plate.toLowerCase().includes(q) ||
          v.brand.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          v.ownerName.toLowerCase().includes(q)
        );
      })
    : vehicles;

  if (loading || loadingVehicles) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-[3px] border-gray-200 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-4">

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#111110] tracking-tight">Araçlar</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {vehicles.length > 0 ? `${vehicles.length} araç kayıtlı` : "Henüz araç eklenmedi"}
            </p>
          </div>
          <Link
            href="/vehicles/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 text-[#111110] hover:bg-amber-500 transition shadow-sm shrink-0"
          >
            <IcPlus />
            Araç Ekle
          </Link>
        </div>

        {/* ── Search ───────────────────────────────────────────────────── */}
        {vehicles.length > 0 && (
          <div className="relative">
            <IcSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Plaka, marka, model veya sahip ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition shadow-sm"
            />
          </div>
        )}

        {/* ── Vehicle List ─────────────────────────────────────────────── */}
        {vehicles.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
              <IcCar className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Henüz araç yok</p>
            <p className="text-xs text-gray-400 mt-1 mb-5">Servis geçmişi tutmak için ilk aracı ekleyin.</p>
            <Link
              href="/vehicles/new"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-400 text-[#111110] text-xs font-bold hover:bg-amber-500 transition"
            >
              <IcPlus />
              İlk Aracı Ekle
            </Link>
          </div>
        ) : filteredVehicles.length === 0 ? (
          /* No search results */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center">
            <IcSearch className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">Araç bulunamadı</p>
            <p className="text-xs text-gray-400 mt-1">"{search}" için sonuç yok.</p>
          </div>
        ) : (
          /* Vehicle cards */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {filteredVehicles.map((vehicle) => {
                const logoUrl = brandLogos[vehicle.brand] ?? null;
                return (
                  <Link
                    key={vehicle.id}
                    href={`/vehicles/${vehicle.id}`}
                    className="flex items-center gap-4 px-4 sm:px-5 py-4 hover:bg-[#fafaf9] transition-colors group"
                  >
                    {/* Brand logo */}
                    <div className="w-11 h-11 rounded-xl bg-[#f8f8f6] border border-gray-100 flex items-center justify-center shrink-0 group-hover:border-amber-100 group-hover:bg-amber-50/40 transition">
                      {logoUrl ? (
                        <img src={logoUrl} alt={vehicle.brand} className="w-8 h-8 object-contain" />
                      ) : (
                        <span className="text-gray-400 text-[11px] font-bold tracking-wide">
                          {vehicle.brand.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Plate */}
                        <span className="text-sm font-bold text-[#111110] font-mono tracking-wider">
                          {vehicle.plate}
                        </span>
                        {/* Brand + model */}
                        <span className="text-xs text-gray-500 font-medium truncate">
                          {vehicle.brand} {vehicle.model}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-gray-400">{vehicle.ownerName}</span>
                        <span className="text-gray-200">·</span>
                        <span className="text-[11px] text-gray-400">{vehicle.year}</span>
                        {vehicle.fuelType && (
                          <>
                            <span className="text-gray-200">·</span>
                            <span className="text-[11px] text-gray-400">
                              {fuelTypeMap[vehicle.fuelType] ?? vehicle.fuelType}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Chevron */}
                    <IcChevron className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
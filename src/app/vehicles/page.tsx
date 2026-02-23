"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/context/BusinessContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
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

type BrandLogo = {
  name: string;
  logoUrl?: string | null;
};

export default function VehiclesPage() {
  const { business, loading } = useBusiness();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [brandLogos, setBrandLogos] = useState<Record<string, string | null>>({});

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

      const q = query(
        collection(db, "vehicles"),
        where("businessId", "==", business.id)
      );

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

  if (loading || loadingVehicles) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-2xl mx-auto px-6 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Araçlar</h1>
          <Link
            href="/vehicles/new"
            className="inline-flex items-center justify-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-gray-800 transition shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Araç ekle
          </Link>
        </div>

        {vehicles.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <p className="text-gray-600 mb-4">Henüz kayıtlı araç yok.</p>
            <Link
              href="/vehicles/new"
              className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-medium hover:bg-gray-800"
            >
              İlk aracı ekle
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {vehicles.map((vehicle) => {
              const logoUrl = brandLogos[vehicle.brand] ?? null;
              return (
                <li key={vehicle.id}>
                  <Link
                    href={`/vehicles/${vehicle.id}`}
                    className="block bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gray-300 hover:shadow transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={vehicle.brand}
                            className="w-10 h-10 object-contain"
                          />
                        ) : (
                          <span className="text-gray-500 text-xs font-medium">
                            {vehicle.brand.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="font-semibold text-gray-900">
                              {vehicle.plate}
                            </span>
                            <span className="text-gray-500">
                              {" · "}
                              {vehicle.brand} {vehicle.model}
                            </span>
                          </div>
                          <span className="text-sm text-gray-400 shrink-0">
                            {vehicle.year}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{vehicle.ownerName}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBusiness } from "@/context/BusinessContext";
import JobDetailModal from "./JobDetailModal";

type Vehicle = {
  id: string;
  businessId: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  fuelType: string;
  engineSize?: string | null;
  chassisNo?: string | null;
  ownerName: string;
  ownerPhone?: string | null;
  notes?: string | null;
};

const fuelTypeMap: Record<string, string> = {
  gasoline: "Benzin",
  diesel: "Dizel",
  electric: "Elektrik",
  hybrid: "Hibrit",
  LPG: "LPG",
};

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

export type JobListItem = {
  id: string;
  title: string;
  status?: string | null;
  createdAt?: Timestamp | Date | string | null;
  updatedAt?: Timestamp | Date | string | null;
  vehicleId?: string;
  category?: string | null;
  mileage?: number | null;
  notes?: string | null;
  selectedQuickJobs?: {
    name: string;
    brand: string;
    quantity: number;
    unitPrice: number;
  }[];
  imageUrls?: string[];
};

function formatTrDate(value: JobListItem["createdAt"]) {
  if (!value) return "-";
  const date =
    value instanceof Timestamp
      ? value.toDate()
      : value instanceof Date
        ? value
        : typeof value === "string"
          ? new Date(value)
          : null;

  if (!date || Number.isNaN(date.getTime())) return typeof value === "string" ? value : "-";

  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status?: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "active") {
    return {
      label: "Aktif",
      className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    };
  }
  if (s === "completed" || s === "done") {
    return {
      label: "Tamamlandı",
      className: "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
    };
  }
  if (s === "cancelled" || s === "canceled") {
    return {
      label: "İptal",
      className: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    };
  }
  if (s) {
    return {
      label: status ?? "—",
      className: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    };
  }
  return {
    label: "—",
    className: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  };
}

export default function VehicleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { business, loading } = useBusiness();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loadingVehicle, setLoadingVehicle] = useState(true);
  const [copied, setCopied] = useState(false);
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [activeJob, setActiveJob] = useState<JobListItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    ownerName: "",
    ownerPhone: "",
    engineSize: "",
    chassisNo: "",
    year: "",
    fuelType: "gasoline",
    notes: "",
  });


  useEffect(() => {
    const fetchVehicle = async () => {
      if (!id || !business) return;

      const ref = doc(db, "vehicles", id as string);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        alert("Araç bulunamadı.");
        router.push("/vehicles");
        return;
      }

      const data = snap.data() as Omit<Vehicle, "id">;

      if (data.businessId !== business.id) {
        alert("Yetkisiz erişim.");
        router.push("/vehicles");
        return;
      }

      setVehicle({ id: snap.id, ...data });

      // Fetch brand logo from brands collection (match by brand name)
      try {
        const brandsRef = collection(db, "brands");
        const q = query(brandsRef, where("name", "==", data.brand));
        const brandSnap = await getDocs(q);

        if (!brandSnap.empty) {
          const brandData = brandSnap.docs[0].data() as { logoUrl?: string };
          if (brandData.logoUrl) {
            setBrandLogoUrl(brandData.logoUrl);
          }
        }
      } catch (error) {
        console.error("Brand logo fetch error:", error);
      }

      // Fetch jobs for the vehicle
      try {
        const fetchJobs = async () => {
          const jobsRef = collection(db, "jobs");
          const q = query(jobsRef, where("vehicleId", "==", snap.id));
          const jobsSnap = await getDocs(q);
          const jobsData: JobListItem[] = jobsSnap.docs.map((d) => {
            const data = d.data() as Partial<JobListItem> & {
              title?: string;
              status?: string;
              createdAt?: Timestamp | string | null;
              updatedAt?: Timestamp | string | null;
            };
            return {
              id: d.id,
              vehicleId: snap.id,
              title: data.title ?? "(Başlıksız işlem)",
              status: data.status ?? null,
              createdAt: data.createdAt ?? null,
              updatedAt: data.updatedAt ?? null,
              category: (data as any).category ?? null,
              mileage:
                typeof (data as any).mileage === "number"
                  ? (data as any).mileage
                  : (data as any).mileage
                    ? Number((data as any).mileage)
                    : null,
              notes: (data as any).notes ?? null,
              selectedQuickJobs: Array.isArray((data as any).selectedQuickJobs)
                ? ((data as any).selectedQuickJobs as JobListItem["selectedQuickJobs"])
                : [],
              imageUrls: Array.isArray((data as any).imageUrls)
                ? ((data as any).imageUrls as string[])
                : [],
            };
          });

          jobsData.sort((a, b) => {
            const aDate = (a.updatedAt ?? a.createdAt) as unknown;
            const bDate = (b.updatedAt ?? b.createdAt) as unknown;
            const aMs =
              aDate instanceof Timestamp
                ? aDate.toMillis()
                : aDate instanceof Date
                  ? aDate.getTime()
                  : typeof aDate === "string"
                    ? new Date(aDate).getTime()
                    : 0;
            const bMs =
              bDate instanceof Timestamp
                ? bDate.toMillis()
                : bDate instanceof Date
                  ? bDate.getTime()
                  : typeof bDate === "string"
                    ? new Date(bDate).getTime()
                    : 0;
            return bMs - aMs;
          });

          setJobs(jobsData);
        };
        await fetchJobs();
      } catch (error) {
        console.error("Jobs fetch error:", error);
      }

      setLoadingVehicle(false);
    };

    fetchVehicle();
  }, [id, business, router]);

  const copyId = () => {
    if (!vehicle) return;
    navigator.clipboard.writeText(vehicle.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || loadingVehicle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div
            className="inline-block w-10 h-10 border-4 border-gray-300 border-t-black rounded-full animate-spin"
            aria-hidden
          />
          <p className="mt-4 text-gray-600">Araç bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-gray-700 mb-4">Araç bulunamadı.</p>
          <Link
            href="/vehicles"
            className="inline-block bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            Araçlara dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-6xl mx-auto px-6 pt-6 flex flex-col space-y-6">
        {/* Top section: logo + brand/model/yıl + ID + Pill */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Left: logo + brand/model + ID */}
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
              {brandLogoUrl ? (
                <img
                  src={brandLogoUrl}
                  alt={`${vehicle.brand} logo`}
                  className="w-12 h-12 object-contain"
                />
              ) : (
                <span className="text-gray-400 text-xs font-medium">
                  Logo
                </span>
              )}
            </div>

            <div className="flex flex-col mt-3">
              <h1 className="text-xl font-bold text-gray-900 leading-none">
                {vehicle.brand} {vehicle.model} - {vehicle.plate}
              </h1>
              <div className="flex items-center text-sm text-gray-500" style={{ marginTop: '-2px' }}>
                <span>ID: {vehicle.id} </span>
                <button
                  type="button"
                  onClick={copyId}
                  aria-label="ID kopyala"
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition ${copied
                    ? "text-green-600 bg-green-50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  {copied ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Sahip Bilgileri Pill */}
          <section className="flex items-center gap-4 bg-white rounded-full p-4 min-w-60 w-full lg:w-auto shadow border border-gray-200 shrink lg:shrink-0">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
              </svg>
            </div>

            {/* Info */}
            <div className="flex flex-col">
              <span className="text-gray-900 font-semibold">{vehicle.ownerName}</span>
              {vehicle.ownerPhone && (
                <span className="text-gray-500 text-sm">{vehicle.ownerPhone}</span>
              )}
            </div>
          </section>
        </div>

        {/* Middle section: HStack with left and right */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Araç Bilgileri + Notlar */}
          <div className="flex flex-col space-y-6 lg:w-1/2">
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800 tracking-wide">
                  Araç bilgileri
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditForm({
                      ownerName: vehicle.ownerName || "",
                      ownerPhone: vehicle.ownerPhone || "",
                      engineSize: vehicle.engineSize || "",
                      chassisNo: vehicle.chassisNo || "",
                      year: vehicle.year?.toString() || "",
                      fuelType: vehicle.fuelType || "",
                      notes: vehicle.notes || "",
                    });
                    setIsEditOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-400 text-sm font-semibold transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                  Düzenle
                </button>
              </div>
              <div className="p-6 space-y-3 grid grid-cols-[max-content_1fr] gap-x-16">
                {/* Marka */}
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Marka</span>
                <span className="text-gray-900">{vehicle.brand}</span>

                {/* Model */}
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Model</span>
                <span className="text-gray-900">{vehicle.model}</span>

                {/* Yıl */}
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Yıl</span>
                <span className="text-gray-900">{vehicle.year}</span>

                {/* Motor */}
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Motor</span>
                <span className="text-gray-900">
                  {vehicle.engineSize} {fuelTypeMap[vehicle.fuelType] || vehicle.fuelType}
                </span>

                {/* Şasi No */}
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Şasi Numarası</span>
                <span className="text-gray-900">{vehicle.chassisNo || "-"}</span>

                {/* Notlar - span across both columns */}
                <div className="col-span-2 mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Notlar
                  </h3>
                  <p className="text-gray-800 text-sm whitespace-pre-wrap">
                    {vehicle.notes ? vehicle.notes : "Araca kayıtlı not bulunamadı."}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right: Geçmiş İşlemler */}
          <div className="w-full lg:w-1/2 space-y-4">
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800 tracking-wide">
                  Geçmiş işlemler
                </h2>
                <button
                  type="button"
                  onClick={() => router.push(`/vehicles/${vehicle.id}/new-job`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-400 text-sm font-semibold transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Ekle
                </button>
              </div>

              <div className="p-6">
                {jobs.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {jobs.map((job) => {
                      const last = job.updatedAt ?? job.createdAt;
                      const lastText = formatTrDate(last);
                      const badge = statusBadge(job.status);

                      return (
                        <li key={job.id} className="py-2">
                          <button
                            type="button"
                            onClick={() => setActiveJob(job)}
                            className="w-full text-left flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200"
                          >
                            <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-400 flex items-center justify-center shrink-0">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <path d="M9 12h6" />
                                <path d="M12 9v6" />
                                <path d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                              </svg>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {job.title}
                                  </p>
                                  {job.mileage != null && !Number.isNaN(job.mileage) && (
                                    <p className="mt-0.5 text-xs text-gray-500">
                                      {job.mileage.toLocaleString("tr-TR")} km
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${badge.className}`}
                                >
                                  {badge.label}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-gray-500">
                                Son güncelleme: <span className="text-gray-700">{lastText}</span>
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center">
                    <p className="text-sm font-medium text-gray-800">
                      Henüz işlem yok
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Bu araca ilk işlemi ekleyebilirsin.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push(`/vehicles/${vehicle.id}/new-job`)}
                      className="mt-4 inline-flex items-center gap-2 bg-yellow-100 text-yellow-400 px-4 py-2 rounded-lg hover:bg-yellow-200 text-sm font-semibold"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      İşlem ekle
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
      {/* Edit Sheet */}
      <div
        className={`fixed inset-0 z-50 flex ${isEditOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
      >
        {/* Overlay */}
        <div
          className={`fixed inset-0 bg-black/30 transition-opacity duration-300 ${isEditOpen ? "opacity-100" : "opacity-0"
            }`}
          onClick={() => setIsEditOpen(false)}
        />

        {/* Sheet */}
        <div
          className={`relative ml-auto w-full max-w-md h-full bg-white shadow-xl p-6 overflow-y-auto transform transition-transform duration-300 ease-out ${isEditOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Araç Bilgilerini Düzenle
            </h2>
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="text-gray-500 hover:text-black"
            >
              ✕
            </button>
          </div>

          {/* Edit Sheet Form */}
          {(() => {
            const currentYear = new Date().getFullYear();

            const isYearValid =
              /^\d{4}$/.test(String(editForm.year)) &&
              Number(editForm.year) >= 1930 &&
              Number(editForm.year) <= currentYear;

            const isChassisValid =
              !editForm.chassisNo || editForm.chassisNo.length === 17;

            const isEngineValid =
              !editForm.engineSize || editForm.engineSize.length <= 3;

            const isPhoneValid =
              !editForm.ownerPhone || /^\+?[0-9]{10,15}$/.test(editForm.ownerPhone);

            const isFormValid =
              editForm.ownerName.trim().length > 0 &&
              isYearValid &&
              isChassisValid &&
              isEngineValid &&
              isPhoneValid;

            return (
              <div className="space-y-4">
                {(() => {
                  const currentYear = new Date().getFullYear();

                  const isYearValid =
                    /^\d{4}$/.test(String(editForm.year)) &&
                    Number(editForm.year) >= 1930 &&
                    Number(editForm.year) <= currentYear;

                  const isChassisValid =
                    !editForm.chassisNo || editForm.chassisNo.length === 17;

                  const isEngineValid =
                    !editForm.engineSize || editForm.engineSize.length <= 3;

                  const isPhoneValid =
                    !editForm.ownerPhone || /^\+?[0-9]{10,15}$/.test(editForm.ownerPhone);

                  const isFormValid =
                    editForm.ownerName.trim().length > 0 &&
                    isYearValid &&
                    isChassisValid &&
                    isEngineValid &&
                    isPhoneValid;

                  return (
                    <>
                      {/* Araç Sahibi */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          Araç Sahibi Adı
                        </label>
                        <input
                          type="text"
                          value={editForm.ownerName}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, ownerName: e.target.value }))
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-200"
                        />
                      </div>

                      {/* Telefon */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          Telefon Numarası
                        </label>
                        <input
                          type="text"
                          value={editForm.ownerPhone}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, ownerPhone: e.target.value }))
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-200"
                        />
                        {!isPhoneValid && (
                          <div className="text-xs text-red-500 mt-1">
                            Geçerli bir telefon numarası giriniz
                          </div>
                        )}
                      </div>

                      {/* Motor Hacmi */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          Motor Hacmi
                        </label>
                        <input
                          type="text"
                          value={editForm.engineSize}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, engineSize: e.target.value }))
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-200"
                        />
                        {!isEngineValid && (
                          <div className="text-xs text-red-500 mt-1">
                            Motor hacmi en fazla 3 karakter olabilir (örn: 2.0)
                          </div>
                        )}
                      </div>

                      {/* Şasi No */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          Şasi Numarası
                        </label>
                        <input
                          type="text"
                          value={editForm.chassisNo}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, chassisNo: e.target.value }))
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-200"
                        />
                        {!isChassisValid && (
                          <div className="text-xs text-red-500 mt-1">
                            Şasi numarası 17 karakter olmalıdır
                          </div>
                        )}
                      </div>

                      {/* Model Yılı */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          Model Yılı
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          value={editForm.year}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setEditForm((prev) => ({ ...prev, year: val }));
                          }}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-200"
                        />
                        {!isYearValid && (
                          <div className="text-xs text-red-500 mt-1">
                            Geçerli bir yıl giriniz (1930 - {currentYear})
                          </div>
                        )}
                      </div>

                      {/* Yakıt Tipi */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          Yakıt Tipi
                        </label>
                        <select
                          value={editForm.fuelType}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, fuelType: e.target.value }))
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-200"
                        >
                          <option value="gasoline">Benzin</option>
                          <option value="diesel">Dizel</option>
                          <option value="electric">Elektrik</option>
                          <option value="hybrid">Hibrit</option>
                          <option value="LPG">LPG</option>
                        </select>
                      </div>

                      {/* Notlar */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          Notlar
                        </label>
                        <textarea
                          rows={3}
                          value={editForm.notes}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-200"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={!isFormValid}
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, "vehicles", vehicle.id), {
                              ownerName: editForm.ownerName.trim(),
                              ownerPhone: editForm.ownerPhone || null,
                              engineSize: editForm.engineSize || null,
                              chassisNo: editForm.chassisNo || null,
                              year: Number(editForm.year),
                              fuelType: editForm.fuelType,
                              notes: editForm.notes || null,
                              lastUpdated: new Date(),
                            });

                            setIsEditOpen(false);
                            window.location.reload();
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className={`w-full mt-4 py-2.5 rounded-lg font-semibold transition ${isFormValid
                            ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-600"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                      >
                        Kaydet
                      </button>
                    </>
                  );
                })()}
              </div>
            );
          })()}
        </div>
      </div>
      {/* Job Detail Modal */}
      {business && (
        <JobDetailModal
          job={activeJob}
          businessId={business.id}
          vehicleId={vehicle.id}
          onClose={() => setActiveJob(null)}
          onJobUpdated={(updated: JobListItem) => {
            setJobs((prev) =>
              prev.map((j) => (j.id === updated.id ? { ...j, ...updated } : j)),
            );
            setActiveJob(updated);
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  doc, getDoc, collection, query, where, getDocs,
  Timestamp, updateDoc, orderBy, limit, startAfter,
  getCountFromServer, QueryDocumentSnapshot, DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBusiness } from "@/context/BusinessContext";
import JobDetailModal from "./JobDetailModal";
import {
  Wrench, Phone, Car, Search, Filter, Plus, ChevronRight,
  Calendar, Edit, CalendarArrowUp, CalendarArrowDown,
  User, Code, Copy, Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Vehicle = {
  id: string; businessId: string; plate: string; brand: string;
  model: string; year: number; fuelType: string;
  engineSize?: string | null; chassisNo?: string | null;
  ownerName: string; ownerPhone?: string | null; notes?: string | null;
};

export type JobListItem = {
  id: string; title: string; status?: string | null;
  createdAt?: Timestamp | Date | string | null;
  updatedAt?: Timestamp | Date | string | null;
  vehicleId?: string; category?: string | null;
  mileage?: number | null; notes?: string | null; laborFee?: number | null;
  selectedQuickJobs?: { name: string; brand: string; quantity: number; unitPrice: number }[];
  imageUrls?: string[];
};

const PAGE_SIZE = 5;

const fuelTypeMap: Record<string, string> = {
  gasoline: "Benzin", diesel: "Dizel", electric: "Elektrik", hybrid: "Hibrit", LPG: "LPG",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMs(value: JobListItem["createdAt"]): number {
  if (!value) return 0;
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return new Date(value).getTime();
  return 0;
}

function formatTrDate(value: JobListItem["createdAt"]) {
  if (!value) return "-";
  const date = value instanceof Timestamp ? value.toDate() :
    value instanceof Date ? value :
    typeof value === "string" ? new Date(value) : null;
  if (!date || isNaN(date.getTime())) return "-";
  return date.toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function docToJob(d: QueryDocumentSnapshot<DocumentData>, vehicleId: string): JobListItem {
  const data = d.data() as any;
  return {
    id: d.id, vehicleId,
    title: data.title ?? "(Başlıksız işlem)",
    status: data.status ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    category: data.category ?? null,
    mileage: typeof data.mileage === "number" ? data.mileage : data.mileage ? Number(data.mileage) : null,
    notes: data.notes ?? null,
    laborFee: typeof data.laborFee === "number" ? data.laborFee : null,
    selectedQuickJobs: Array.isArray(data.selectedQuickJobs) ? data.selectedQuickJobs : [],
    imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
  };
}

type StatusKey = "active" | "completed" | "cancelled" | "all";
const STATUS_LABELS: Record<StatusKey, string> = { all: "Tümü", active: "Aktif", completed: "Tamamlandı", cancelled: "Silindi" };

function getStatusCfg(status?: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "active") return { label: "Aktif", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", pulse: true };
  if (s === "completed" || s === "done") return { label: "Tamamlandı", dot: "bg-blue-400", badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200", pulse: false };
  if (s === "cancelled" || s === "canceled") return { label: "Silindi", dot: "bg-gray-300", badge: "bg-gray-100 text-gray-500 ring-1 ring-gray-200", pulse: false };
  return { label: status ?? "—", dot: "bg-gray-300", badge: "bg-gray-100 text-gray-600 ring-1 ring-gray-200", pulse: false };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VehicleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { business, loading } = useBusiness();

  // Vehicle
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loadingVehicle, setLoadingVehicle] = useState(true);
  const [copied, setCopied] = useState(false);
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);

  // Jobs — paginated
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [totalJobCount, setTotalJobCount] = useState(0);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Job stats (separate lightweight count query)
  const [jobStats, setJobStats] = useState({ total: 0, active: 0, completed: 0 });

  // Modal / drawer
  const [activeJob, setActiveJob] = useState<JobListItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    ownerName: "", ownerPhone: "", engineSize: "",
    chassisNo: "", year: "", fuelType: "gasoline", notes: "",
  });

  // Filters
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [statusFilter, setStatusFilter] = useState<StatusKey>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ── Fetch vehicle ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchVehicle = async () => {
      if (!id || !business) return;
      const snap = await getDoc(doc(db, "vehicles", id as string));
      if (!snap.exists()) { alert("Araç bulunamadı."); router.push("/vehicles"); return; }
      const data = snap.data() as Omit<Vehicle, "id">;
      if (data.businessId !== business.id) { alert("Yetkisiz erişim."); router.push("/vehicles"); return; }
      setVehicle({ id: snap.id, ...data });

      // Brand logo
      try {
        const bSnap = await getDocs(query(collection(db, "brands"), where("name", "==", data.brand)));
        if (!bSnap.empty) {
          const bd = bSnap.docs[0].data() as { logoUrl?: string };
          if (bd.logoUrl) setBrandLogoUrl(bd.logoUrl);
        }
      } catch (e) { console.error(e); }

      setLoadingVehicle(false);
    };
    fetchVehicle();
  }, [id, business, router]);

  // ── Fetch job stats (counts only — cheap) ───────────────────────────────
  useEffect(() => {
    const fetchStats = async () => {
      if (!id) return;
      const vehicleId = id as string;
      const base = query(collection(db, "jobs"), where("vehicleId", "==", vehicleId));
      try {
        const [totalSnap, activeSnap, completedSnap] = await Promise.all([
          getCountFromServer(base),
          getCountFromServer(query(base, where("status", "==", "active"))),
          getCountFromServer(query(base, where("status", "in", ["completed", "done"]))),
        ]);
        setJobStats({
          total: totalSnap.data().count,
          active: activeSnap.data().count,
          completed: completedSnap.data().count,
        });
        setTotalJobCount(totalSnap.data().count);
      } catch (e) { console.error(e); }
    };
    fetchStats();
  }, [id]);

  // ── Fetch first page of jobs ─────────────────────────────────────────────
  // Re-runs whenever vehicleId OR sortDir changes — resets pagination from scratch
  const fetchFirstPage = useCallback(async () => {
    if (!id) return;
    setLoadingJobs(true);
    setJobs([]);
    setLastDoc(null);
    setHasMore(false);
    try {
      const q = query(
        collection(db, "jobs"),
        where("vehicleId", "==", id as string),
        orderBy("createdAt", sortDir),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const docs = snap.docs;
      setJobs(docs.map((d) => docToJob(d, id as string)));
      setLastDoc(docs[docs.length - 1] ?? null);
      setHasMore(docs.length === PAGE_SIZE);
    } catch (e) { console.error(e); }
    setLoadingJobs(false);
  }, [id, sortDir]); // ← sortDir added as dependency

  useEffect(() => { fetchFirstPage(); }, [fetchFirstPage]);

  // ── Load more ────────────────────────────────────────────────────────────
  const loadMore = async () => {
    if (!id || !lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "jobs"),
        where("vehicleId", "==", id as string),
        orderBy("createdAt", sortDir), // ← same direction as current sort
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const docs = snap.docs;
      setJobs((prev) => [...prev, ...docs.map((d) => docToJob(d, id as string))]);
      setLastDoc(docs[docs.length - 1] ?? null);
      setHasMore(docs.length === PAGE_SIZE);
    } catch (e) { console.error(e); }
    setLoadingMore(false);
  };

  // ── Client-side filter/sort (on loaded jobs) ─────────────────────────────
  const filteredJobs = useMemo(() => {
    let list = [...jobs];

    if (statusFilter !== "all") {
      list = list.filter((j) => {
        const s = (j.status ?? "").toLowerCase();
        if (statusFilter === "active") return s === "active";
        if (statusFilter === "completed") return s === "completed" || s === "done";
        if (statusFilter === "cancelled") return s === "cancelled" || s === "canceled";
        return true;
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((j) => j.title.toLowerCase().includes(q) || (j.notes ?? "").toLowerCase().includes(q));
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((j) => toMs(j.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000;
      list = list.filter((j) => toMs(j.createdAt) <= to);
    }
    // Order comes from Firestore (sortDir drives the server query).
    // Only re-sort here when filters reduce the list to avoid stale order.
    list.sort((a, b) => {
      const aMs = toMs(a.createdAt);
      const bMs = toMs(b.createdAt);
      return sortDir === "desc" ? bMs - aMs : aMs - bMs;
    });
    return list;
  }, [jobs, statusFilter, search, dateFrom, dateTo, sortDir]);

  const activeFiltersCount = [statusFilter !== "all", !!dateFrom, !!dateTo].filter(Boolean).length;
  const isFiltering = search.trim() || activeFiltersCount > 0;

  const copyId = () => {
    if (!vehicle) return;
    navigator.clipboard.writeText(vehicle.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading / not found ───────────────────────────────────────────────────
  if (loading || loadingVehicle) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-[3px] border-gray-200 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-gray-600 text-sm">Araç bulunamadı.</p>
          <Link href="/vehicles" className="inline-block bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-700 transition">
            Araçlara dön
          </Link>
        </div>
      </div>
    );
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition bg-gray-50 focus:bg-white";
  const labelCls = "block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5";
  const errorCls = "text-[11px] text-rose-500 mt-1";

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-4">

        {/* ── Breadcrumb ────────────────────────────────────────────────── */}
        <nav className="flex items-center gap-1.5 text-xs">
          <Link href="/vehicles" className="text-gray-400 hover:text-gray-700 transition font-medium">Araçlar</Link>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <span className="text-gray-700 font-semibold">{vehicle.plate}</span>
        </nav>

        {/* ── Hero Card ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-300" />
          <div className="p-5 sm:p-7">
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
              {/* Logo */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#f8f8f6] border border-gray-100 flex items-center justify-center shrink-0 shadow-inner">
                {brandLogoUrl ? (
                  <img src={brandLogoUrl} alt={vehicle.brand} className="w-12 h-12 sm:w-14 sm:h-14 object-contain" />
                ) : (
                  <Car className="w-8 h-8 text-gray-300" />
                )}
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#111110] tracking-tight leading-tight">
                      {vehicle.brand} {vehicle.model}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[#111110] text-white text-sm font-bold tracking-widest font-mono">
                        {vehicle.plate}
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg font-medium">{vehicle.year}</span>
                      {vehicle.engineSize && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg font-medium">{vehicle.engineSize}</span>}
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg font-medium">{fuelTypeMap[vehicle.fuelType] ?? vehicle.fuelType}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm({ ownerName: vehicle.ownerName || "", ownerPhone: vehicle.ownerPhone || "", engineSize: vehicle.engineSize || "", chassisNo: vehicle.chassisNo || "", year: vehicle.year?.toString() || "", fuelType: vehicle.fuelType || "", notes: vehicle.notes || "" });
                      setIsEditOpen(true);
                    }}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 transition"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Düzenle
                  </button>
                </div>

                {/* Info chips */}
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide leading-none mb-0.5">Araç Sahibi</p>
                      <p className="text-xs font-semibold text-gray-800 leading-none">{vehicle.ownerName}</p>
                    </div>
                  </div>
                  {vehicle.ownerPhone && (
                    <a href={`tel:${vehicle.ownerPhone}`} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 hover:border-blue-200 hover:bg-blue-50 transition group">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition">
                        <Phone className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide leading-none mb-0.5">Telefon</p>
                        <p className="text-xs font-semibold text-gray-800 leading-none group-hover:text-blue-700 transition">{vehicle.ownerPhone}</p>
                      </div>
                    </a>
                  )}
                  {vehicle.chassisNo && (
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                      <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Code className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide leading-none mb-0.5">Şasi No</p>
                        <p className="text-xs font-mono font-semibold text-gray-700 leading-none">{vehicle.chassisNo}</p>
                      </div>
                    </div>
                  )}
                  <button type="button" onClick={copyId} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 hover:bg-gray-100 transition group">
                    <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide leading-none mb-0.5">Araç ID</p>
                      <p className={`text-xs font-mono font-semibold leading-none transition ${copied ? "text-emerald-600" : "text-gray-500 group-hover:text-gray-700"}`}>
                        {copied ? "Kopyalandı!" : `#${vehicle.id.slice(0, 8)}…`}
                      </p>
                    </div>
                  </button>
                </div>

                {vehicle.notes && (
                  <p className="mt-4 text-xs text-gray-500 italic bg-amber-50/50 border border-amber-100 rounded-xl px-4 py-2.5 leading-relaxed">
                    {vehicle.notes}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="border-t border-gray-100 grid grid-cols-3">
            {[
              { label: "Toplam İşlem", value: jobStats.total, cls: "text-[#111110]" },
              { label: "Aktif", value: jobStats.active, cls: "text-emerald-600" },
              { label: "Tamamlanan", value: jobStats.completed, cls: "text-blue-600" },
            ].map((s, i) => (
              <div key={s.label} className={`px-4 py-4 text-center ${i < 2 ? "border-r border-gray-100" : ""}`}>
                <p className={`text-xl font-bold tabular-nums ${s.cls}`}>{s.value}</p>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Job List Card ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Header */}
          <div className="px-5 sm:px-6 pt-5 pb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#111110]">Servis Geçmişi</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isFiltering
                  ? `${filteredJobs.length} sonuç (${jobs.length} yüklendi / ${totalJobCount} toplam)`
                  : `${jobs.length} / ${totalJobCount} işlem yüklendi`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/vehicles/${vehicle.id}/new-job`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 text-[#111110] hover:bg-amber-500 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni İşlem
            </button>
          </div>

          {/* Toolbar */}
          <div className="px-5 sm:px-6 pb-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Yüklenen işlemlerde ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:bg-white transition"
                />
              </div>
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                className="h-8 flex items-center gap-1.5 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition whitespace-nowrap"
              >
                {sortDir === "desc" ? <CalendarArrowDown className="w-3.5 h-3.5" /> : <CalendarArrowUp className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{sortDir === "desc" ? "Yeniden eskiye" : "Eskiden yeniye"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowFilters((p) => !p)}
                className={`relative h-8 flex items-center gap-1.5 px-3 rounded-xl border text-xs font-medium transition whitespace-nowrap ${showFilters || activeFiltersCount > 0 ? "border-amber-300 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filtrele</span>
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-[9px] font-bold text-[#111110] flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-xl p-0.5">
                  {(["all", "active", "completed", "cancelled"] as StatusKey[]).map((s) => (
                    <button key={s} type="button" onClick={() => setStatusFilter(s)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${statusFilter === s ? "bg-[#111110] text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-200" />
                  <span className="text-gray-300">—</span>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-200" />
                </div>
                {activeFiltersCount > 0 && (
                  <button type="button" onClick={() => { setStatusFilter("all"); setDateFrom(""); setDateTo(""); }}
                    className="text-[11px] text-rose-400 hover:text-rose-600 transition font-medium underline underline-offset-2 ml-auto">
                    Temizle
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* Job rows */}
          {loadingJobs ? (
            <div className="py-16 flex items-center justify-center gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-medium">İşlemler yükleniyor...</span>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="py-16 text-center">
              {jobs.length === 0 ? (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <Wrench className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Henüz işlem yok</p>
                  <p className="text-xs text-gray-400">Bu araç için ilk servisi kayıt edin.</p>
                  <button type="button" onClick={() => router.push(`/vehicles/${vehicle.id}/new-job`)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 text-[#111110] text-xs font-bold hover:bg-amber-500 transition mt-1">
                    <Plus className="w-3.5 h-3.5" />İlk İşlemi Ekle
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <Search className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Sonuç bulunamadı</p>
                  <p className="text-xs text-gray-400">Arama veya filtre kriterlerini değiştirin.</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-50">
                {filteredJobs.map((job, idx) => {
                  const cfg = getStatusCfg(job.status);
                  const lastDate = job.updatedAt ?? job.createdAt;
                  const partsTotal = (job.selectedQuickJobs ?? []).reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0);
                  const labor = typeof job.laborFee === "number" ? job.laborFee : 0;
                  const jobTotal = partsTotal + labor;
                  const itemCount = (job.selectedQuickJobs ?? []).length;

                  return (
                    <button key={job.id} type="button" onClick={() => setActiveJob(job)}
                      className="w-full text-left group flex items-center gap-4 px-5 sm:px-6 py-4 hover:bg-[#fafaf9] transition-colors">
                      <span className="w-5 text-[11px] text-gray-300 font-medium tabular-nums text-center shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot} ${cfg.pulse ? "animate-pulse" : ""}`} />
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-100 group-hover:border-amber-200 transition">
                        <Wrench className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[#111110] truncate">{job.title}</span>
                          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[11px] text-gray-400">{formatTrDate(lastDate)}</span>
                          {job.mileage != null && !isNaN(job.mileage) && (
                            <span className="text-[11px] text-gray-400">· {job.mileage.toLocaleString("tr-TR")} km</span>
                          )}
                          {itemCount > 0 && <span className="text-[11px] text-gray-400">· {itemCount} kalem</span>}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {jobTotal > 0 && <span className="text-sm font-bold text-gray-800 tabular-nums">{jobTotal.toLocaleString("tr-TR")} ₺</span>}
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ── Load more ───────────────────────────────────────────── */}
              {hasMore && !isFiltering && (
                <div className="px-5 sm:px-6 py-4 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-60"
                  >
                    {loadingMore ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Yükleniyor...</>
                    ) : (
                      <>{`${jobs.length} / ${totalJobCount} işlem yüklendi — Daha fazla göster`}</>
                    )}
                  </button>
                </div>
              )}

              {/* "Tüm işlemler yüklendi" note when filtered */}
              {isFiltering && hasMore && (
                <div className="px-5 py-3 border-t border-gray-50 text-center">
                  <p className="text-[11px] text-gray-400">
                    Arama yalnızca yüklenen {jobs.length} işlemde yapılıyor.{" "}
                    <button type="button" onClick={loadMore} className="text-amber-600 font-semibold hover:underline">
                      Daha fazla yükle
                    </button>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Edit Drawer ───────────────────────────────────────────────────── */}
      <div className={`fixed inset-0 z-50 ${isEditOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <div className={`fixed inset-0 bg-black/25 backdrop-blur-sm transition-opacity duration-300 ${isEditOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setIsEditOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-out ${isEditOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#111110]">Araç Bilgilerini Düzenle</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">{vehicle.plate} · {vehicle.brand} {vehicle.model}</p>
            </div>
            <button type="button" onClick={() => setIsEditOpen(false)} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition text-sm">✕</button>
          </div>
          {(() => {
            const cy = new Date().getFullYear();
            const isYearValid = /^\d{4}$/.test(String(editForm.year)) && Number(editForm.year) >= 1930 && Number(editForm.year) <= cy;
            const isChassisValid = !editForm.chassisNo || editForm.chassisNo.length === 17;
            const isEngineValid = editForm.fuelType === "electric" || /^\d\.\d{1,2}$/.test(editForm.engineSize);
            const isPhoneValid = !editForm.ownerPhone || /^\d{10}$/.test(editForm.ownerPhone);
            const isFormValid = editForm.ownerName.trim().length > 0 && isYearValid && isChassisValid && isEngineValid && isPhoneValid;
            return (
              <div className="p-6 space-y-4">
                <div>
                  <label className={labelCls}>Araç Sahibi</label>
                  <input type="text" value={editForm.ownerName} onChange={(e) => setEditForm((p) => ({ ...p, ownerName: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Telefon</label>
                  <input type="text" inputMode="numeric" maxLength={10} value={editForm.ownerPhone}
                    onChange={(e) => setEditForm((p) => ({ ...p, ownerPhone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} className={inputCls} />
                  {!isPhoneValid && <p className={errorCls}>10 haneli numara giriniz</p>}
                </div>
                <div>
                  <label className={labelCls}>Motor Hacmi</label>
                  <input type="text" inputMode="decimal" value={editForm.engineSize} disabled={editForm.fuelType === "electric"}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "").slice(0, 3);
                      if (!raw) { setEditForm((p) => ({ ...p, engineSize: "" })); return; }
                      if (raw.length < 2) { setEditForm((p) => ({ ...p, engineSize: raw })); return; }
                      setEditForm((p) => ({ ...p, engineSize: `${raw.slice(0, 1)}.${raw.slice(1)}` }));
                    }}
                    className={`${inputCls} ${editForm.fuelType === "electric" ? "opacity-50 cursor-not-allowed" : ""}`} />
                  {!isEngineValid && <p className={errorCls}>Geçerli format: X.YY (örn: 1.6)</p>}
                </div>
                <div>
                  <label className={labelCls}>Şasi Numarası</label>
                  <input type="text" maxLength={17} value={editForm.chassisNo}
                    onChange={(e) => setEditForm((p) => ({ ...p, chassisNo: e.target.value.replace(/\s+/g, "").toUpperCase().slice(0, 17) }))} className={`${inputCls} font-mono`} />
                  {!isChassisValid && <p className={errorCls}>Tam 17 karakter olmalıdır ({editForm.chassisNo.length}/17)</p>}
                </div>
                <div>
                  <label className={labelCls}>Model Yılı</label>
                  <input type="text" inputMode="numeric" maxLength={4} value={editForm.year}
                    onChange={(e) => setEditForm((p) => ({ ...p, year: e.target.value.replace(/\D/g, "").slice(0, 4) }))} className={inputCls} />
                  {!isYearValid && <p className={errorCls}>Geçerli yıl giriniz (1930–{cy})</p>}
                </div>
                <div>
                  <label className={labelCls}>Yakıt Tipi</label>
                  <select value={editForm.fuelType} onChange={(e) => setEditForm((p) => ({ ...p, fuelType: e.target.value, engineSize: e.target.value === "electric" ? "" : p.engineSize }))} className={`${inputCls} appearance-none`}>
                    <option value="gasoline">Benzin</option>
                    <option value="diesel">Dizel</option>
                    <option value="electric">Elektrik</option>
                    <option value="hybrid">Hibrit</option>
                    <option value="LPG">LPG</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Notlar</label>
                  <textarea rows={3} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} className={`${inputCls} resize-none`} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Vazgeç</button>
                  <button type="button" disabled={!isFormValid}
                    onClick={async () => {
                      try {
                        await updateDoc(doc(db, "vehicles", vehicle.id), {
                          ownerName: editForm.ownerName.trim(),
                          ownerPhone: editForm.ownerPhone || null,
                          engineSize: editForm.fuelType === "electric" ? null : editForm.engineSize || null,
                          chassisNo: editForm.chassisNo || null,
                          year: Number(editForm.year),
                          fuelType: editForm.fuelType,
                          notes: editForm.notes || null,
                          lastUpdated: new Date(),
                        });
                        setIsEditOpen(false);
                        window.location.reload();
                      } catch (err) { console.error(err); }
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${isFormValid ? "bg-[#111110] text-white hover:bg-gray-800" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                    Kaydet
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Job Detail Modal ──────────────────────────────────────────────── */}
      {business && (
        <JobDetailModal
          job={activeJob}
          businessId={business.id}
          vehicleId={vehicle.id}
          onClose={() => setActiveJob(null)}
          onJobUpdated={(updated: JobListItem) => {
            setJobs((prev) => prev.map((j) => (j.id === updated.id ? { ...j, ...updated } : j)));
            setActiveJob(updated);
          }}
        />
      )}
    </div>
  );
}
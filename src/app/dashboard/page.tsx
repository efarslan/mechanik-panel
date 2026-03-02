"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { useBusiness } from "@/context/BusinessContext";
import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  Car,
  CircleAlert,
  Clock4,
  Filter,
  Search,
  Wrench,
  TrendingUp,
  RotateCcw,
  ChevronRight,
  X,
} from "lucide-react";
import JobDetailModal from "../vehicles/[id]/JobDetailModal";
import type { JobListItem } from "../vehicles/[id]/page";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type VehicleLite = {
  id: string;
  plate?: string; brand?: string; model?: string;
  ownerName?: string; ownerPhone?: string | null;
};

type DashboardJob = JobListItem & { businessId?: string | null };
type StatusKey = "all" | "active" | "completed";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMs(value: DashboardJob["createdAt"]): number {
  if (!value) return 0;
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return new Date(value).getTime();
  return 0;
}

function toDate(value: DashboardJob["createdAt"]): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatTrDate(value: DashboardJob["createdAt"]) {
  if (!value) return "-";
  const date = value instanceof Timestamp ? value.toDate()
    : value instanceof Date ? value
    : typeof value === "string" ? new Date(value) : null;
  if (!date || isNaN(date.getTime())) return "-";
  return date.toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatTry(amount: number) {
  return amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 0) return `${days}g önce`;
  if (hours > 0) return `${hours}sa önce`;
  return "Az önce";
}

function getStatusCfg(status?: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "active" || s === "") return { key: "active" as const, label: "Aktif", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", pulse: true };
  if (s === "completed" || s === "done") return { key: "completed" as const, label: "Tamamlandı", dot: "bg-blue-400", badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200", pulse: false };
  if (s === "cancelled" || s === "canceled") return { key: "cancelled" as const, label: "Silindi", dot: "bg-gray-300", badge: "bg-gray-100 text-gray-600 ring-1 ring-gray-200", pulse: false };
  return { key: "all" as const, label: status ?? "—", dot: "bg-gray-300", badge: "bg-gray-100 text-gray-600 ring-1 ring-gray-200", pulse: false };
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111110] text-white text-xs rounded-xl px-3 py-2 shadow-xl">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.value > 100 ? formatTry(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, accent, valueColor }: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; accent: string; valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className={`text-2xl font-bold tabular-nums leading-none ${valueColor ?? "text-[#111110]"}`}>{value}</p>
      <p className="text-[11px] text-gray-400">{sub}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = useAuth();
  const { business, loading } = useBusiness();
  const router = useRouter();

  // ── All original state preserved exactly ──────────────────────────────────
  const [recentJobs, setRecentJobs] = useState<DashboardJob[]>([]);
  const [vehiclesById, setVehiclesById] = useState<Record<string, VehicleLite>>({});
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [indexHint, setIndexHint] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusKey>("active");
  const [showFilters, setShowFilters] = useState(false);
  const [activeJob, setActiveJob] = useState<JobListItem | null>(null);

  const [reportJobs, setReportJobs] = useState<DashboardJob[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => { if (user === null) router.push("/login"); }, [user, router]);
  useEffect(() => { if (!loading && !business) router.push("/onboarding"); }, [business, loading, router]);

  // ── fetchRecentJobs — original logic untouched ────────────────────────────
  const fetchRecentJobs = useCallback(async () => {
    if (!business) return;
    setLoadingJobs(true);
    setJobsError(null);
    setIndexHint(null);
    try {
      const clauses: any[] = [where("businessId", "==", business.id)];
      if (statusFilter === "active") clauses.push(where("status", "==", "active"));
      if (statusFilter === "completed") clauses.push(where("status", "in", ["completed", "done"]));

      const snap = await getDocs(
        query(collection(db, "jobs"), ...clauses, orderBy("createdAt", "desc"), limit(60)),
      );

      const list: DashboardJob[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          businessId: data.businessId ?? null,
          vehicleId: data.vehicleId ?? null,
          title: data.title ?? "(Başlıksız işlem)",
          status: data.status ?? null,
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null,
          laborFee: typeof data.laborFee === "number" ? data.laborFee : data.laborFee ? Number(data.laborFee) : null,
          selectedQuickJobs: Array.isArray(data.selectedQuickJobs) ? data.selectedQuickJobs : [],
          imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
          mileage: typeof data.mileage === "number" ? data.mileage : data.mileage ? Number(data.mileage) : null,
          notes: data.notes ?? null,
          category: data.category ?? null,
        };
      });
      setRecentJobs(list);
    } catch (e: any) {
      console.error(e);
      setRecentJobs([]);
      const msg = typeof e?.message === "string" ? e.message : "İşler yüklenemedi.";
      setJobsError(msg);
      if (typeof msg === "string" && msg.toLowerCase().includes("index")) {
        setIndexHint("Firestore composite index gerekli görünüyor. Hata mesajındaki linkten index oluşturup 1-2 dk bekleyin.");
      }
      try {
        const snap = await getDocs(query(collection(db, "jobs"), orderBy("createdAt", "desc"), limit(120)));
        const list: DashboardJob[] = snap.docs
          .map((d) => {
            const data = d.data() as any;
            return {
              id: d.id, businessId: data.businessId ?? null, vehicleId: data.vehicleId ?? null,
              title: data.title ?? "(Başlıksız işlem)", status: data.status ?? null,
              createdAt: data.createdAt ?? null, updatedAt: data.updatedAt ?? null,
              laborFee: typeof data.laborFee === "number" ? data.laborFee : data.laborFee ? Number(data.laborFee) : null,
              selectedQuickJobs: Array.isArray(data.selectedQuickJobs) ? data.selectedQuickJobs : [],
              imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
              mileage: typeof data.mileage === "number" ? data.mileage : data.mileage ? Number(data.mileage) : null,
              notes: data.notes ?? null, category: data.category ?? null,
            };
          })
          .filter((j) => j.businessId === business.id);
        setRecentJobs(list);
      } catch (e2) { console.error(e2); }
    } finally {
      setLoadingJobs(false);
    }
  }, [business, statusFilter]);

  useEffect(() => { if (business) fetchRecentJobs(); }, [business, fetchRecentJobs]);

  // ── fetchReport — original logic untouched ────────────────────────────────
  const fetchReport = useCallback(async () => {
    if (!business) return;
    setLoadingReport(true);
    setReportError(null);
    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      const fromTs = Timestamp.fromDate(from);

      const snap = await getDocs(
        query(
          collection(db, "jobs"),
          where("businessId", "==", business.id),
          where("createdAt", ">=", fromTs),
          orderBy("createdAt", "asc"),
          limit(500),
        ),
      );

      const list: DashboardJob[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id, businessId: data.businessId ?? null, vehicleId: data.vehicleId ?? null,
          title: data.title ?? "(Başlıksız işlem)", status: data.status ?? null,
          createdAt: data.createdAt ?? null, updatedAt: data.updatedAt ?? null,
          laborFee: typeof data.laborFee === "number" ? data.laborFee : data.laborFee ? Number(data.laborFee) : null,
          selectedQuickJobs: Array.isArray(data.selectedQuickJobs) ? data.selectedQuickJobs : [],
          imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
          mileage: typeof data.mileage === "number" ? data.mileage : data.mileage ? Number(data.mileage) : null,
          notes: data.notes ?? null, category: data.category ?? null,
        };
      });
      setReportJobs(list);
    } catch (e: any) {
      console.error(e);
      const msg = typeof e?.message === "string" ? e.message : "Rapor verisi yüklenemedi.";
      setReportError(msg);
    } finally {
      setLoadingReport(false);
    }
  }, [business]);

  useEffect(() => { if (business) fetchReport(); }, [business, fetchReport]);

  // ── Vehicle fetch — original logic untouched ──────────────────────────────
  useEffect(() => {
    const run = async () => {
      if (!business) return;
      const ids = Array.from(new Set(
        recentJobs.filter((j) => j.businessId === business.id).map((j) => j.vehicleId).filter(Boolean) as string[]
      )).slice(0, 30);
      if (!ids.length) { setVehiclesById({}); return; }
      try {
        const snaps = await Promise.all(
          chunk(ids, 10).map((c) => getDocs(query(collection(db, "vehicles"), where(documentId(), "in", c))))
        );
        const next: Record<string, VehicleLite> = {};
        for (const s of snaps) for (const d of s.docs) {
          const data = d.data() as any;
          next[d.id] = { id: d.id, plate: data.plate, brand: data.brand, model: data.model, ownerName: data.ownerName, ownerPhone: data.ownerPhone ?? null };
        }
        setVehiclesById(next);
      } catch (e) { console.error(e); }
    };
    run();
  }, [business, recentJobs]);

  // ── Derived — original logic untouched ────────────────────────────────────
  const scopedJobs = useMemo(() => {
    if (!business) return [];
    return recentJobs.filter((j) => j.businessId === business.id);
  }, [business, recentJobs]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...scopedJobs];
    if (statusFilter !== "all") list = list.filter((j) => getStatusCfg(j.status).key === statusFilter);
    if (q) {
      list = list.filter((j) => {
        const v = j.vehicleId ? vehiclesById[j.vehicleId] : undefined;
        return [j.title, v?.plate, v?.brand, v?.model, v?.ownerName, v?.ownerPhone ?? undefined]
          .filter(Boolean).join(" ").toLowerCase().includes(q);
      });
    }
    list.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
    return list;
  }, [scopedJobs, search, statusFilter, vehiclesById]);

  const kpis = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    const active = scopedJobs.filter((j) => getStatusCfg(j.status).key === "active");
    const completed = scopedJobs.filter((j) => getStatusCfg(j.status).key === "completed");
    const completedThisWeek = completed.filter((j) => toMs(j.createdAt) >= weekAgo);
    const activeValue = active.reduce((sum, j) => {
      const labor = Number(j.laborFee) || 0;
      const parts = (j.selectedQuickJobs ?? []).reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
      return sum + labor + parts;
    }, 0);
    const staleActive = active.filter((j) => now - toMs(j.createdAt) >= 7 * 86400000);
    return { activeCount: active.length, completedThisWeekCount: completedThisWeek.length, activeValue, staleActiveCount: staleActive.length };
  }, [scopedJobs]);

  const alerts = useMemo(() => {
    const now = Date.now();
    const active = scopedJobs.filter((j) => getStatusCfg(j.status).key === "active");
    const stale = active.map((j) => ({ job: j, ageMs: now - toMs(j.createdAt) }))
      .filter((x) => x.ageMs >= 7 * 86400000).sort((a, b) => b.ageMs - a.ageMs).slice(0, 6);
    const missingPhone = active.filter((j) => { const v = j.vehicleId ? vehiclesById[j.vehicleId] : undefined; return !!v && !v.ownerPhone; }).slice(0, 6);
    return { stale, missingPhone };
  }, [scopedJobs, vehiclesById]);

  const handleJobUpdated = (updated: JobListItem) => {
    setRecentJobs((prev) => prev.map((j) => (j.id === updated.id ? { ...j, ...updated } : j)));
    setActiveJob(updated);
  };

  // ── reportSeries — original logic untouched ───────────────────────────────
  const reportSeries = useMemo(() => {
    const days: { key: string; label: string; count: number; revenue: number }[] = [];
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
      days.push({ key, label, count: 0, revenue: 0 });
    }
    const byKey = new Map(days.map((d) => [d.key, d]));
    for (const j of reportJobs) {
      const s = (j.status ?? "").toLowerCase();
      if (s === "cancelled" || s === "canceled") continue;
      const d = toDate(j.createdAt);
      if (!d) continue;
      const dayKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
      const bucket = byKey.get(dayKey);
      if (!bucket) continue;
      bucket.count += 1;
      const labor = Number(j.laborFee) || 0;
      const parts = (j.selectedQuickJobs ?? []).reduce((sum, it: any) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
      bucket.revenue += labor + parts;
    }
    const maxCount = Math.max(1, ...days.map((d) => d.count));
    const maxRevenue = Math.max(1, ...days.map((d) => d.revenue));
    const totalRevenue = days.reduce((s, d) => s + d.revenue, 0);
    const totalJobs = days.reduce((s, d) => s + d.count, 0);
    return { days, maxCount, maxRevenue, totalRevenue, totalJobs };
  }, [reportJobs]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (user === undefined || loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-[3px] border-gray-200 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Panel yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!business) return null;

  const alertCount = alerts.stale.length + alerts.missingPhone.length;

  // ── Recharts tick formatter ────────────────────────────────────────────────
  const tickEvery = Math.ceil(reportSeries.days.length / 6);

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-5">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{business.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-[#111110] tracking-tight">Panel</h1>
            <p className="text-xs text-gray-400 mt-0.5">Aktif işleri takip edin ve güncel durumu görün.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={fetchRecentJobs} disabled={loadingJobs}
              className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition flex items-center justify-center" title="Yenile">
              <RotateCcw className={`w-4 h-4 ${loadingJobs ? "animate-spin" : ""}`} />
            </button>
            <Link href="/vehicles/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 text-[#111110] hover:bg-amber-500 transition shadow-sm">
              <Car className="w-3.5 h-3.5" />
              Yeni Araç
            </Link>
            <Link href="/vehicles"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#111110] text-white hover:bg-gray-800 transition">
              Araçlar
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* ── KPI Strip ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Aktif İşler" value={kpis.activeCount} sub="Devam eden işler"
            icon={Wrench} accent="bg-emerald-50 text-emerald-600" />
          <KpiCard label="Bu Hafta Tamamlanan" value={kpis.completedThisWeekCount} sub="Son 7 günde biten"
            icon={BadgeCheck} accent="bg-blue-50 text-blue-600" />
          <KpiCard label="Aktif İş Tutarı" value={formatTry(kpis.activeValue)} sub="İşçilik + parça"
            icon={TrendingUp} accent="bg-amber-50 text-amber-600" />
          <KpiCard label="Geciken İşler" value={kpis.staleActiveCount} sub="7+ gündür açık"
            icon={Clock4}
            accent={kpis.staleActiveCount > 0 ? "bg-rose-50 text-rose-600" : "bg-gray-50 text-gray-400"}
            valueColor={kpis.staleActiveCount > 0 ? "text-rose-600" : "text-[#111110]"} />
        </div>

        {/* ── Main grid: job list + right rail ───────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">

          {/* Job list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-sm font-bold text-[#111110]">İş Listesi</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{filteredJobs.length} kayıt · Satıra tıklayarak detay açın</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setShowFilters(v => !v)}
                    className={`h-8 w-8 rounded-xl border flex items-center justify-center transition ${showFilters ? "border-amber-300 bg-amber-50 text-amber-600" : "border-gray-200 text-gray-400 hover:bg-gray-50"}`}>
                    <Filter className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-0.5">
                    {([{ key: "active" as const, label: "Aktif" }, { key: "completed" as const, label: "Tamam" }, { key: "all" as const, label: "Tümü" }]).map((t) => (
                      <button key={t.key} type="button" onClick={() => setStatusFilter(t.key)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${statusFilter === t.key ? "bg-white text-[#111110] shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="İş, plaka, sahip, marka..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-8 py-2 text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:bg-white transition" />
                {search && (
                  <button type="button" onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {showFilters && (indexHint || true) && (
                <div className="mt-2.5 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5 space-y-1.5">
                  {indexHint && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">{indexHint}</p>}
                  <p className="text-xs text-gray-400">Liste Firestore üzerinde işletme + durum filtresiyle çekilir. Arama istemci tarafında çalışır.</p>
                </div>
              )}
            </div>

            {/* Rows */}
            {loadingJobs ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-400 text-sm">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-amber-400 rounded-full animate-spin" />
                <span>Yükleniyor...</span>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="py-16 text-center px-6">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                  <Wrench className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-700">İş bulunamadı</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">{search ? `"${search}" için sonuç yok.` : "Henüz aktif iş bulunmuyor."}</p>
                <div className="flex items-center justify-center gap-2">
                  <Link href="/vehicles" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111110] text-white text-xs font-bold hover:bg-gray-800 transition">
                    Araçlara Git <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link href="/vehicles/new" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                    Yeni Araç
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredJobs.slice(0, 15).map((j) => {
                  const v = j.vehicleId ? vehiclesById[j.vehicleId] : undefined;
                  const status = getStatusCfg(j.status);
                  const partsTotal = (j.selectedQuickJobs ?? []).reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
                  const total = partsTotal + (Number(j.laborFee) || 0);
                  const isStale = status.key === "active" && Date.now() - toMs(j.createdAt) >= 7 * 86400000;

                  return (
                    <div key={j.id} className="group px-5 sm:px-6 py-3.5 hover:bg-[#fafaf9] transition-colors cursor-pointer"
                      onClick={() => setActiveJob(j)}>
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot} ${status.pulse ? "animate-pulse" : ""}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-[#111110] truncate">{j.title}</span>
                            {isStale && <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-200">Gecikiyor</span>}
                            <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.badge}`}>{status.label}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {v?.plate && <span className="text-[11px] font-mono font-semibold text-gray-600">{v.plate}</span>}
                            {(v?.brand || v?.model) && <span className="text-[11px] text-gray-400">· {v?.brand} {v?.model}</span>}
                            {v?.ownerName && <span className="text-[11px] text-gray-400">· {v.ownerName}</span>}
                            <span className="text-[11px] text-gray-400">· {relativeTime(toMs(j.createdAt))}</span>
                            {total > 0 && <span className="text-[11px] font-semibold text-gray-700 tabular-nums">· {formatTry(total)}</span>}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {j.vehicleId && (
                            <Link href={`/vehicles/${j.vehicleId}`} onClick={(e) => e.stopPropagation()}
                              className="h-7 px-2.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 flex items-center gap-1 transition">
                              <Car className="w-3 h-3" /> Araç
                            </Link>
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {filteredJobs.length > 15 && (
              <div className="px-5 sm:px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-400">İlk 15 kayıt</p>
                <Link href="/vehicles" className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition">Tümünü gör →</Link>
              </div>
            )}

            {jobsError && (
              <div className="px-5 sm:px-6 py-4 border-t border-gray-100">
                <div className="rounded-xl bg-rose-50 ring-1 ring-rose-100 p-3 text-xs text-rose-700">
                  <span className="font-semibold">Hata: </span>{jobsError}
                </div>
              </div>
            )}
          </div>

          {/* Right rail */}
          <div className="space-y-4">
            {/* Alerts */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111110]">Uyarılar</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Öncelikli durumlar</p>
                </div>
                {alertCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{alertCount}</span>
                )}
              </div>
              <div className="p-4 space-y-3">
                {alertCount === 0 ? (
                  <div className="flex items-center gap-2 py-1">
                    <BadgeCheck className="w-4 h-4 text-emerald-500" />
                    <p className="text-xs text-gray-500">Kritik uyarı yok.</p>
                  </div>
                ) : (
                  <>
                    {alerts.stale.length > 0 && (
                      <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Clock4 className="w-3.5 h-3.5 text-rose-600" />
                          <span className="text-xs font-bold text-rose-800">7+ gün açık ({alerts.stale.length})</span>
                        </div>
                        <div className="space-y-1.5">
                          {alerts.stale.map(({ job, ageMs }) => {
                            const v = job.vehicleId ? vehiclesById[job.vehicleId] : undefined;
                            return (
                              <Link key={job.id} href={job.vehicleId ? `/vehicles/${job.vehicleId}` : "/vehicles"}
                                className="flex items-center justify-between gap-2 rounded-lg bg-white/80 hover:bg-white px-2.5 py-2 transition group/a">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-gray-800 truncate">{job.title}</p>
                                  <p className="text-[10px] text-gray-400">{v?.plate ?? "—"} · {Math.floor(ageMs / 86400000)} gün</p>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover/a:text-gray-500 shrink-0 transition" />
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {alerts.missingPhone.length > 0 && (
                      <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <CircleAlert className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-xs font-bold text-amber-900">Telefon eksik ({alerts.missingPhone.length})</span>
                        </div>
                        <div className="space-y-1.5">
                          {alerts.missingPhone.map((job) => {
                            const v = job.vehicleId ? vehiclesById[job.vehicleId] : undefined;
                            return (
                              <Link key={job.id} href={job.vehicleId ? `/vehicles/${job.vehicleId}` : "/vehicles"}
                                className="flex items-center justify-between gap-2 rounded-lg bg-white/80 hover:bg-white px-2.5 py-2 transition group/a">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-gray-800 truncate">{v?.plate ?? "Araç"}</p>
                                  <p className="text-[10px] text-gray-400">{v?.ownerName ?? "—"}</p>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover/a:text-gray-500 shrink-0 transition" />
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-[#111110]">Hızlı Aksiyonlar</h3>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { href: "/vehicles", label: "Araç Listesi", sub: "Tüm araçları görüntüle" },
                  { href: "/vehicles/new", label: "Yeni Araç Ekle", sub: "Yeni müşteri kaydı" },
                ].map((item) => (
                  <Link key={item.href} href={item.href}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 hover:border-amber-200 hover:bg-amber-50/30 transition group/q">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                      <p className="text-[11px] text-gray-400">{item.sub}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover/q:text-amber-500 transition shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Business info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-[#111110]">İşletme</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400">Ad</span>
                  <span className="text-xs font-semibold text-gray-800 truncate">{business.name}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400">ID</span>
                  <span className="text-[10px] font-mono text-gray-500 truncate">{business.id.slice(0, 16)}…</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400">Yüklenen kayıt</span>
                  <span className="text-xs font-semibold text-gray-800">{scopedJobs.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Reporting Section ───────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#111110]">Raporlama</h2>
              <p className="text-xs text-gray-400 mt-0.5">Son 30 günlük iş adedi ve tahmini ciro</p>
            </div>
            <button type="button" onClick={fetchReport} disabled={loadingReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition">
              <RotateCcw className={`w-3.5 h-3.5 ${loadingReport ? "animate-spin" : ""}`} />
              Yenile
            </button>
          </div>

          <div className="p-5 sm:p-6">
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 p-4">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Toplam İş</p>
                <p className="text-2xl font-bold text-emerald-800 tabular-nums mt-1">{reportSeries.totalJobs}</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Son 30 gün</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-100 p-4">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Tahmini Ciro</p>
                <p className="text-xl font-bold text-amber-800 tabular-nums mt-1">{formatTry(reportSeries.totalRevenue)}</p>
                <p className="text-[11px] text-amber-600 mt-0.5">Son 30 gün</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100 p-4">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Günlük Ort. İş</p>
                <p className="text-2xl font-bold text-blue-800 tabular-nums mt-1">
                  {reportSeries.totalJobs > 0 ? (reportSeries.totalJobs / 30).toFixed(1) : "0"}
                </p>
                <p className="text-[11px] text-blue-600 mt-0.5">İş/gün</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-100 p-4">
                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Ort. İş Tutarı</p>
                <p className="text-xl font-bold text-purple-800 tabular-nums mt-1">
                  {reportSeries.totalJobs > 0 ? formatTry(reportSeries.totalRevenue / reportSeries.totalJobs) : "—"}
                </p>
                <p className="text-[11px] text-purple-600 mt-0.5">İş başına</p>
              </div>
            </div>

            {loadingReport ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-400 text-sm">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-amber-400 rounded-full animate-spin" />
                <span>Rapor hazırlanıyor...</span>
              </div>
            ) : reportError ? (
              <div className="rounded-xl bg-rose-50 ring-1 ring-rose-100 p-4 text-sm text-rose-800">
                <span className="font-semibold">Rapor yüklenemedi: </span>
                <span className="text-xs">{reportError}</span>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">

                {/* İş Adedi — Area Chart */}
                <div className="rounded-2xl border border-gray-100 bg-[#fafaf9] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#111110]">Günlük İş Adedi</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Son 30 gün</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-100 px-2.5 py-1 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[11px] font-semibold text-emerald-700">İş adedi</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={reportSeries.days} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }}
                        tickLine={false} axisLine={false}
                        interval={tickEvery - 1} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                        allowDecimals={false} />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Area type="monotone" dataKey="count" name="İş" stroke="#10b981" strokeWidth={2}
                        fill="url(#colorCount)" dot={false} activeDot={{ r: 4, fill: "#10b981" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Ciro — Bar Chart */}
                <div className="rounded-2xl border border-gray-100 bg-[#fafaf9] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#111110]">Günlük Ciro</h3>
                      <p className="text-xs text-gray-400 mt-0.5">İşçilik + parça (iptal hariç)</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-100 px-2.5 py-1 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-[11px] font-semibold text-amber-700">Ciro ₺</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={reportSeries.days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                      barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }}
                        tickLine={false} axisLine={false}
                        interval={tickEvery - 1} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar dataKey="revenue" name="Ciro" radius={[3, 3, 0, 0]}
                        fill="#fbbf24" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Combined view */}
                <div className="rounded-2xl border border-gray-100 bg-[#fafaf9] p-5 lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#111110]">Birleşik Görünüm</h3>
                      <p className="text-xs text-gray-400 mt-0.5">İş adedi ve ciro karşılaştırması</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-[11px] text-gray-500">İş adedi</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                        <span className="text-[11px] text-gray-500">Ciro (÷1000 ₺)</span>
                      </div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      data={reportSeries.days.map(d => ({ ...d, revenueK: Math.round(d.revenue / 1000) }))}
                      margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                      barCategoryGap="25%" barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }}
                        tickLine={false} axisLine={false} interval={tickEvery - 1} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar dataKey="count" name="İş" radius={[3, 3, 0, 0]} fill="#10b981" />
                      <Bar dataKey="revenueK" name="Ciro (k₺)" radius={[3, 3, 0, 0]} fill="#fbbf24" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <p className="text-[11px] text-gray-400 mt-4">
              Son 30 günde oluşturulan işlerden hesaplanır. Büyük veri setlerinde limit (500) nedeniyle kısmi olabilir.
            </p>
          </div>
        </section>
      </div>

      {/* Job Detail Modal */}
      {business && activeJob && activeJob.vehicleId && (
        <JobDetailModal
          job={activeJob}
          businessId={business.id}
          vehicleId={activeJob.vehicleId}
          onClose={() => setActiveJob(null)}
          onJobUpdated={handleJobUpdated}
        />
      )}
    </div>
  );
}
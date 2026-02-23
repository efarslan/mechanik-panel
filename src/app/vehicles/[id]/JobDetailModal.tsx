"use client";

import { useEffect, useState } from "react";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "@/lib/firebase";
import type { JobListItem } from "./page";

type JobQuickItem = NonNullable<JobListItem["selectedQuickJobs"]>[number];

type JobDetailModalProps = {
  job: JobListItem | null;
  businessId: string;
  vehicleId: string;
  onClose: () => void;
  onJobUpdated: (job: JobListItem) => void;
};

const quickJobs: Record<string, string[]> = {
  Bakım: ["Yağ Değişimi", "Yağ Filtresi", "Hava Filtresi", "Polen Filtresi", "Yakıt Filtresi"],
  "Motor / Mekanik": [
    "Triger Kayışı Değişimi",
    "V Kayışı Değişimi",
    "Su Pompası",
    "Enjektör Servisi",
    "Turbo",
    "Motor Takozu",
  ],
  "Şanzıman / Debriyaj": ["Debriyaj Seti Değişimi", "Şanzıman Yağı Değişimi", "Volan Değişimi"],
  "Alt Takım": ["Amortisör", "Salıncak", "Z Rot", "Rot Başı", "Rot Kolu"],
  "Fren Sistemi": ["Fren Balatası", "Fren Diski", "Fren Hidroliği Değişimi", "Fren Kaliperi"],
  "Elektrik Sistemi": ["Akü", "Marş Motoru", "Alternatör", "Buji Değişimi"],
  "Soğutma Sistemi": ["Radyatör Değişimi", "Termostat Değişimi", "Hortum Değişimi", "Antifriz Değişimi"],
  "Egzoz Sistemi": [
    "DPF Temizliği",
    "Katalitik Konvertör Temizliği",
    "Oksijen Sensörü Değişimi",
    "Manifold Contası",
    "Susturucu",
  ],
  Diğer: [],
};

const allQuickJobNames: string[] = Array.from(
  new Set(
    Object.values(quickJobs)
      .flat()
      .filter(Boolean),
  ),
);

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

type StatusKey = "active" | "cancelled" | "completed" | "done" | string;

function getStatusConfig(status?: string | null): {
  label: string;
  dot: string;
  badge: string;
} {
  const s = (status ?? "").toLowerCase();
  if (s === "active") return { label: "Aktif", dot: "bg-emerald-500", badge: "text-emerald-700 bg-emerald-50 ring-emerald-200" };
  if (s === "completed" || s === "done") return { label: "Tamamlandı", dot: "bg-gray-400", badge: "text-gray-600 bg-gray-100 ring-gray-200" };
  if (s === "cancelled" || s === "canceled") return { label: "İptal Edildi", dot: "bg-rose-400", badge: "text-rose-700 bg-rose-50 ring-rose-200" };
  return { label: status ?? "—", dot: "bg-blue-400", badge: "text-blue-700 bg-blue-50 ring-blue-200" };
}

export default function JobDetailModal({
  job,
  businessId,
  vehicleId,
  onClose,
  onJobUpdated,
}: JobDetailModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", notes: "" });
  const [items, setItems] = useState<JobQuickItem[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const storage = getStorage();

  useEffect(() => {
    if (!job) {
      setIsEditMode(false);
      setEditForm({ title: "", notes: "" });
      setItems([]);
      setImages([]);
      setNewFiles([]);
      setFileError(null);
      setShowCompleteConfirm(false);
      setShowDeleteConfirm(false);
      return;
    }
    setIsEditMode(false);
    setEditForm({ title: job.title ?? "", notes: job.notes ?? "" });
    setItems(Array.isArray(job.selectedQuickJobs) ? [...job.selectedQuickJobs] : []);
    setImages(Array.isArray(job.imageUrls) ? [...job.imageUrls] : []);
    setNewFiles([]);
    setFileError(null);
    setShowCompleteConfirm(false);
    setShowDeleteConfirm(false);
  }, [job?.id]);

  if (!job) return null;

  const s = (job.status ?? "").toLowerCase();
  const isCompleted = s === "completed" || s === "done";
  const isCancelled = s === "cancelled" || s === "canceled";
  const isActive = s === "active" || s === "";
  const statusConfig = getStatusConfig(job.status);

  const handleSetStatus = async (nextStatus: "active" | "cancelled") => {
    if (!job || isCompleted) return;
    const current = (job.status ?? "active").toLowerCase();
    if (current === nextStatus) return;
    try {
      setSaving(true);
      const updatedAt = new Date();
      await updateDoc(doc(db, "jobs", job.id), { status: nextStatus, updatedAt });
      onJobUpdated({ ...job, status: nextStatus, updatedAt });
    } catch (error) {
      console.error("Set status error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!job || isCompleted) return;
    const trimmedTitle = editForm.title.trim();
    if (!trimmedTitle) return;
    try {
      setSaving(true);
      const uploadedImageUrls: string[] = [];
      for (const file of newFiles) {
        const storageRef = ref(
          storage,
          `businesses/${businessId}/vehicles/${vehicleId}/jobs/${job.id}/${Date.now()}-${file.name}`,
        );
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        uploadedImageUrls.push(downloadUrl);
      }
      const finalImageUrls = [...images, ...uploadedImageUrls];
      const payload: Partial<JobListItem> & { updatedAt: Date } = {
        title: trimmedTitle,
        notes: editForm.notes || null,
        selectedQuickJobs: items,
        imageUrls: finalImageUrls,
        updatedAt: new Date(),
      };
      await updateDoc(doc(db, "jobs", job.id), payload);
      const updated: JobListItem = { ...job, ...payload, selectedQuickJobs: items, imageUrls: finalImageUrls };
      setImages(finalImageUrls);
      setNewFiles([]);
      setFileError(null);
      setIsEditMode(false);
      onJobUpdated(updated);
    } catch (error) {
      console.error("Job update error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!job || isCompleted) return;
    try {
      setSaving(true);
      const payload = { status: "completed", updatedAt: new Date() };
      await updateDoc(doc(db, "jobs", job.id), payload);
      const updated: JobListItem = { ...job, status: "completed", updatedAt: payload.updatedAt };
      setIsEditMode(false);
      setShowCompleteConfirm(false);
      onJobUpdated(updated);
    } catch (error) {
      console.error("Mark completed error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => onClose();

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-2xl w-full mx-0 sm:mx-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-5 pt-4 pb-3 rounded-t-3xl sm:rounded-t-2xl">
          {/* Drag handle on mobile */}
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3 sm:hidden" />

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                {/* Live status dot */}
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusConfig.dot} ${isActive ? "animate-pulse" : ""}`} />
                <h2 className="text-sm font-semibold text-gray-900 truncate">{job.title}</h2>
              </div>
              <div className="text-[11px] text-gray-400 space-x-2 pl-4">
                {job.createdAt && <span>Oluşturuldu: {formatTrDate(job.createdAt)}</span>}
                {job.updatedAt && <span>· Güncellendi: {formatTrDate(job.updatedAt)}</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex-shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition text-sm"
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>

          {/* Action bar — only for non-completed jobs */}
          {!isCompleted ? (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {/* Delete / restore button */}
              {!isCancelled ? (
                !showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 bg-white text-gray-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    İşlemi Sil
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-full pl-3 pr-1 py-1">
                    <span className="text-[11px] font-medium text-rose-800">Silinsin mi?</span>
                    <button
                      type="button"
                      onClick={() => handleSetStatus("cancelled")}
                      disabled={saving}
                      className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 disabled:opacity-60 transition"
                    >
                      {saving ? "..." : "Evet, Sil"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2 py-1 rounded-full text-gray-500 text-[11px] font-medium hover:bg-gray-100 transition"
                    >
                      Vazgeç
                    </button>
                  </div>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => handleSetStatus("active")}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 bg-white text-gray-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 transition-all"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                  Geri Al
                </button>
              )}

              {/* Divider */}
              <span className="w-px h-5 bg-gray-200" />

              {/* Edit toggle */}
              <button
                type="button"
                onClick={() => setIsEditMode((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  isEditMode
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                {isEditMode ? "Düzenlemeyi Kapat" : "Düzenle"}
              </button>

              {/* Complete button */}
              {!showCompleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowCompleteConfirm(true)}
                  disabled={saving}
                  className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm shadow-emerald-200"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Tamamlandı Olarak İşaretle
                </button>
              ) : (
                <div className="ml-auto flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full pl-3 pr-1 py-1">
                  <span className="text-[11px] font-medium text-emerald-800">Emin misiniz?</span>
                  <button
                    type="button"
                    onClick={handleMarkCompleted}
                    disabled={saving}
                    className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 disabled:opacity-60 transition"
                  >
                    {saving ? "..." : "Evet, Tamamla"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCompleteConfirm(false)}
                    className="px-2 py-1 rounded-full text-gray-500 text-[11px] font-medium hover:bg-gray-100 transition"
                  >
                    Vazgeç
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Completed state banner */
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-gray-500">Bu işlem tamamlandı — düzenlenemez.</span>
              <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ${statusConfig.badge}`}>
                {statusConfig.label}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-6">
          {/* Summary */}
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Özet</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 text-sm">
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-gray-400 uppercase mb-0.5">Başlık</span>
                <span className="text-gray-900 font-medium">{job.title}</span>
              </div>
              {job.notes && (
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-gray-400 uppercase mb-0.5">Notlar</span>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{job.notes}</p>
                </div>
              )}
            </div>
          </section>

          {/* Line items (readonly) */}
          {items.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Parça / İş Kalemleri</h3>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-[1.5fr_1fr_auto_auto_auto] gap-3 px-4 py-2 text-[10px] font-semibold text-gray-400 bg-gray-50 uppercase tracking-wide">
                  <span>İşlem</span><span>Marka</span>
                  <span className="text-right">Adet</span>
                  <span className="text-right">Birim</span>
                  <span className="text-right">Toplam</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((item, index) => {
                    const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
                    return (
                      <div key={`${item.name}-${index}`} className="grid grid-cols-[1.5fr_1fr_auto_auto_auto] gap-3 px-4 py-2.5 text-xs items-center">
                        <span className="font-medium text-gray-900">{item.name}</span>
                        <span className="text-gray-500 truncate">{item.brand || "—"}</span>
                        <span className="text-right text-gray-600">{item.quantity ?? 0}</span>
                        <span className="text-right text-gray-600">{item.unitPrice ? `${item.unitPrice.toLocaleString("tr-TR")} ₺` : "—"}</span>
                        <span className="text-right font-semibold text-gray-900">{lineTotal ? `${lineTotal.toLocaleString("tr-TR")} ₺` : "—"}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Total row */}
                {items.length > 0 && (
                  <div className="grid grid-cols-[1.5fr_1fr_auto_auto_auto] gap-3 px-4 py-2.5 bg-gray-50 border-t border-gray-200">
                    <span className="col-span-4 text-[11px] font-semibold text-gray-500 uppercase text-right">Genel Toplam</span>
                    <span className="text-right text-sm font-bold text-gray-900">
                      {items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0).toLocaleString("tr-TR")} ₺
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Images (readonly) */}
          {images.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Görseller</h3>
              <div className="grid grid-cols-3 gap-2">
                {images.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 cursor-zoom-in aspect-video"
                    onClick={() => setPreviewImage(url)}
                  >
                    <img src={url} alt={`Görsel ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Edit form */}
          {isEditMode && !isCompleted && (
            <section className="space-y-4 border-t border-dashed border-gray-200 pt-5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                <h3 className="text-xs font-semibold text-gray-700">Düzenleme Modu</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Başlık</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Notlar</label>
                  <textarea
                    rows={3}
                    value={editForm.notes}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300 transition resize-none"
                  />
                </div>

                {/* Editable items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Parça / İş Kalemleri</label>
                    <button
                      type="button"
                      onClick={() => setItems((prev) => [...prev, { name: "", brand: "", quantity: 1, unitPrice: 0 }])}
                      className="text-[11px] font-semibold text-yellow-700 hover:text-yellow-800 flex items-center gap-1"
                    >
                      <span className="text-base leading-none">+</span> Kalem Ekle
                    </button>
                  </div>
                  {items.length > 0 ? (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <div className="min-w-[680px]">
                          <div className="grid grid-cols-[1.5fr_1fr_80px_90px_80px_32px] gap-2 px-4 py-2 text-[10px] font-semibold text-gray-400 bg-gray-50 uppercase tracking-wide">
                            <span>İşlem</span><span>Marka</span>
                            <span className="text-right">Adet</span>
                            <span className="text-right">Birim ₺</span>
                            <span className="text-right">Toplam</span>
                            <span />
                          </div>
                          <div className="divide-y divide-gray-100">
                            {items.map((item, index) => {
                              const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
                              return (
                                <div key={`${index}-${item.name}`} className="grid grid-cols-[1.5fr_1fr_80px_90px_80px_32px] gap-2 px-4 py-2 text-xs items-center">
                                  <select
                                    value={item.name}
                                    onChange={(e) => { const next = [...items]; next[index] = { ...next[index], name: e.target.value }; setItems(next); }}
                                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-300"
                                  >
                                    <option value="">Seçin...</option>
                                    {allQuickJobNames.map((name) => <option key={name} value={name}>{name}</option>)}
                                  </select>
                                  <input
                                    placeholder="Marka"
                                    value={item.brand}
                                    onChange={(e) => { const next = [...items]; next[index] = { ...next[index], brand: e.target.value }; setItems(next); }}
                                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-300"
                                  />
                                  <input
                                    type="number" min={0}
                                    value={item.quantity ?? 0}
                                    onChange={(e) => { const next = [...items]; next[index] = { ...next[index], quantity: Number(e.target.value || 0) }; setItems(next); }}
                                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-yellow-300"
                                  />
                                  <input
                                    type="number" min={0}
                                    value={item.unitPrice ?? 0}
                                    onChange={(e) => { const next = [...items]; next[index] = { ...next[index], unitPrice: Number(e.target.value || 0) }; setItems(next); }}
                                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-yellow-300"
                                  />
                                  <span className="text-right font-medium text-gray-800">{lineTotal ? `${lineTotal.toLocaleString("tr-TR")} ₺` : "—"}</span>
                                  <button
                                    type="button"
                                    onClick={() => setItems((prev) => prev.filter((_: JobQuickItem, i: number) => i !== index))}
                                    aria-label="Sil"
                                    className="flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition text-sm"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Henüz kalem eklenmedi.</p>
                  )}
                </div>

                {/* Editable images */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Görseller</label>
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((url, index) => (
                      <div key={`existing-${index}-${url}`} className="relative rounded-xl overflow-hidden border border-gray-200 cursor-zoom-in aspect-video" onClick={() => setPreviewImage(url)}>
                        <img src={url} alt={`Görsel ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setImages((prev) => prev.filter((_: string, i: number) => i !== index)); }}
                          className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {newFiles.map((file, index) => {
                      const preview = URL.createObjectURL(file);
                      return (
                        <div key={`new-${index}-${file.name}`} className="relative rounded-xl overflow-hidden border border-yellow-200 cursor-zoom-in aspect-video ring-1 ring-yellow-300" onClick={() => setPreviewImage(preview)}>
                          <img src={preview} alt={file.name} className="w-full h-full object-cover" />
                          <div className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full">YENİ</div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setNewFiles((prev) => prev.filter((_: File, i: number) => i !== index)); }}
                            className="absolute top-1 right-1 bg-black/60 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                    {/* Upload zone — hidden when limit reached */}
                    {images.length + newFiles.length < 5 && (
                    <label className="relative flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-yellow-300 hover:bg-yellow-50 transition group">
                      <svg className="w-5 h-5 text-gray-300 group-hover:text-yellow-400 transition mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.083 11.096" />
                      </svg>
                      <span className="text-[10px] text-gray-400 group-hover:text-yellow-600 font-medium">Ekle</span>
                      <input
                        type="file" accept="image/*" multiple className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files) return;
                          const maxSize = 5 * 1024 * 1024;
                          const maxPhotos = 5;
                          const currentTotal = images.length + newFiles.length;
                          if (currentTotal >= maxPhotos) {
                            setFileError(`En fazla ${maxPhotos} görsel eklenebilir.`);
                            return;
                          }
                          const valid: File[] = [];
                          for (let i = 0; i < files.length; i++) {
                            if (currentTotal + valid.length >= maxPhotos) {
                              setFileError(`En fazla ${maxPhotos} görsel eklenebilir.`);
                              break;
                            }
                            const file = files[i];
                            if (!file.type.startsWith("image/")) { setFileError("Sadece görsel dosyaları yüklenebilir."); return; }
                            if (file.size > maxSize) { setFileError("Her dosya max. 5MB olabilir."); return; }
                            valid.push(file);
                          }
                          if (valid.length > 0) setFileError(null);
                          setNewFiles((prev) => [...prev, ...valid]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    )}
                  </div>
                  {fileError && <p className="text-[11px] text-red-500">{fileError}</p>}
                  {images.length + newFiles.length >= 5 && (
                    <p className="text-[11px] text-gray-400">Maksimum 5 görsel limitine ulaşıldı.</p>
                  )}
                </div>

                {/* Save / cancel */}
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!job) { setIsEditMode(false); return; }
                      setEditForm({ title: job.title ?? "", notes: job.notes ?? "" });
                      setItems(Array.isArray(job.selectedQuickJobs) ? [...job.selectedQuickJobs] : []);
                      setImages(Array.isArray(job.imageUrls) ? [...job.imageUrls] : []);
                      setNewFiles([]);
                      setFileError(null);
                      setIsEditMode(false);
                    }}
                    className="flex-1 text-center py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    disabled={!editForm.title.trim() || saving}
                    onClick={handleSave}
                    className="flex-1 bg-gray-900 text-white py-2.5 px-4 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {saving ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Image preview */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setPreviewImage(null)}>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative max-w-3xl w-[92vw] max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Önizleme" className="max-w-full max-h-[92vh] object-contain rounded-2xl shadow-2xl" />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition"
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
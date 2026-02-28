"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "@/lib/firebase";
import { useBusiness } from "@/context/BusinessContext";

const jobList = [
  "Bakım",
  "Motor / Mekanik",
  "Şanzıman / Debriyaj",
  "Alt Takım",
  "Fren Sistemi",
  "Elektrik Sistemi",
  "Soğutma Sistemi",
  "Egzoz Sistemi",
];


const quickJobs: Record<string, string[]> = {
  "Bakım": ["Yağ Değişimi", "Yağ Filtresi", "Hava Filtresi", "Polen Filtresi", "Yakıt Filtresi"],
  "Motor / Mekanik": ["Triger Kayışı Değişimi", "V Kayışı Değişimi", "Su Pompası", "Enjektör Servisi", "Turbo", "Motor Takozu"],
  "Şanzıman / Debriyaj": ["Debriyaj Seti Değişimi", "Şanzıman Yağı Değişimi", "Volan Değişimi"],
  "Alt Takım": ["Amortisör", "Salıncak", "Z Rot", "Rot Başı", "Rot Kolu"],
  "Fren Sistemi": ["Fren Balatası", "Fren Diski", "Fren Hidroliği Değişimi", "Fren Kaliperi"],
  "Elektrik Sistemi": ["Akü", "Marş Motoru", "Alternatör", "Buji Değişimi"],
  "Soğutma Sistemi": ["Radyatör Değişimi", "Termostat Değişimi", "Hortum Değişimi", "Antifriz Değişimi"],
  "Egzoz Sistemi": ["DPF Temizliği", "Katalitik Konvertör Temizliği", "Oksijen Sensörü Değişimi", "Manifold Contası", "Susturucu"],
};

type QuickJobItem = { name: string; brand: string; quantity: number; unitPrice: number };

function SectionHeader({ step, title, subtitle }: { step: number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <span className="w-6 h-6 rounded-full bg-amber-400 text-[#111110] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {step}
      </span>
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition";

export default function NewJobPage() {
  const { id } = useParams();
  const router = useRouter();
  const { business } = useBusiness();
  const storage = getStorage();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");
  const [laborFee, setLaborFee] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedQuickJobs, setSelectedQuickJobs] = useState<QuickJobItem[]>([]);

  const formatMileage = (value: string) => {
    const numeric = value.replace(/\D/g, "");
    if (!numeric) return "";
    return Number(numeric).toLocaleString("tr-TR");
  };

  const addQuickJob = (jobName: string) => {
    setSelectedQuickJobs((prev) => {
      if (prev.some((j) => j.name === jobName)) return prev;
      return [...prev, { name: jobName, brand: "", quantity: 1, unitPrice: 0 }];
    });
  };

  const removeQuickJob = (index: number) => {
    setSelectedQuickJobs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuickJob = (index: number, field: keyof QuickJobItem, value: string | number) => {
    setSelectedQuickJobs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;
    const maxSize = 5 * 1024 * 1024;
    const maxFileCount = 5;
    const remainingSlots = maxFileCount - selectedFiles.length;
    if (remainingSlots <= 0) { setFileError("En fazla 5 görsel yükleyebilirsiniz."); return; }
    const valid: File[] = [];
    for (let i = 0; i < files.length; i++) {
      if (valid.length >= remainingSlots) break;
      const file = files[i];
      if (!file.type.startsWith("image/")) { setFileError("Sadece görsel dosyaları yüklenebilir."); return; }
      if (file.size > maxSize) { setFileError("Her dosya maksimum 5MB olabilir."); return; }
      valid.push(file);
    }
    setFileError(null);
    setSelectedFiles((prev) => [...prev, ...valid]);
  };

  // Computed totals
  const partsTotal = selectedQuickJobs.reduce((s, j) => s + j.quantity * j.unitPrice, 0);
  const laborFeeNum = Number(laborFee.replace(/\./g, "").replace(",", ".")) || 0;
  const grandTotal = partsTotal + laborFeeNum;

  const canSubmit = title.trim() && mileage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) { alert("İşletme bulunamadı."); return; }
    if (!canSubmit) { alert("Başlık ve kilometre zorunludur."); return; }
    setSaving(true);
    try {
      const uploadedImageUrls: string[] = [];
      for (const file of selectedFiles) {
        const storageRef = ref(storage, `businesses/${business.id}/vehicles/${id}/jobs/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file);
        uploadedImageUrls.push(await getDownloadURL(storageRef));
      }
      await addDoc(collection(db, "jobs"), {
        businessId: business.id,
        vehicleId: id,
        title,
        mileage: Number(mileage.replace(/\./g, "")),
        laborFee: laborFee ? Number(laborFee.replace(/\./g, "")) : 0,
        notes: notes || null,
        selectedQuickJobs,
        imageUrls: uploadedImageUrls,
        status: "active",
        createdAt: serverTimestamp(),
      });
      router.push(`/vehicles/${id}`);
    } catch (err) {
      console.error(err);
      alert("İşlem eklenirken hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 space-y-4">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Yeni İşlem</h1>
            <p className="text-xs text-gray-400 mt-0.5">Araç için servis kaydı oluşturun</p>
          </div>
          <Link
            href={`/vehicles/${id}`}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition text-sm shadow-sm"
          >
            ✕
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Section 1: Temel Bilgiler ───────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionHeader step={1} title="Temel Bilgiler" subtitle="İşlem başlığı ve araç kilometresi" />

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  İşlem Başlığı <span className="text-red-400 normal-case font-normal">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Örn: Periyodik bakım, Fren kontrolü..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Kilometre <span className="text-red-400 normal-case font-normal">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="150.000"
                      value={mileage}
                      onChange={(e) => setMileage(formatMileage(e.target.value))}
                      className={`${inputCls} pr-8`}
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">km</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    İşçilik Ücreti <span className="text-gray-400 normal-case font-normal">(opsiyonel)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={laborFee}
                      onChange={(e) => {
                        const numeric = e.target.value.replace(/\D/g, "");
                        setLaborFee(numeric ? Number(numeric).toLocaleString("tr-TR") : "");
                      }}
                      className={`${inputCls} pr-6`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">₺</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Notlar <span className="text-gray-400 normal-case font-normal">(opsiyonel)</span>
                </label>
                <textarea
                  placeholder="İşlem hakkında not ekleyin..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          </div>

          {/* ── Section 2: Parça / İş Kalemleri ───────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionHeader
              step={2}
              title="Parça / İş Kalemleri"
              subtitle="Kategori seçerek hızlı ekleyin veya elle girin"
            />

            {/* Category pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {jobList.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(category === cat ? "" : cat)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    category === cat
                      ? "bg-amber-400 border-amber-400 text-[#111110] shadow-sm"
                      : "bg-white border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Quick job chips for selected category */}
            {category && quickJobs[category] && (
              <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Hızlı Seçim</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickJobs[category].map((q) => {
                    const isSelected = selectedQuickJobs.some((j) => j.name === q);
                    return (
                      <button
                        key={q}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedQuickJobs((prev) => prev.filter((j) => j.name !== q));
                          } else {
                            addQuickJob(q);
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                          isSelected
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                        {q}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected items table */}
            {selectedQuickJobs.length > 0 ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_90px_90px_90px_32px] gap-2 px-4 py-2 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  <span>İşlem / Marka</span>
                  <span className="text-right">Adet</span>
                  <span className="text-right">Birim ₺</span>
                  <span className="text-right">Toplam</span>
                  <span />
                </div>
                <div className="divide-y divide-gray-100">
                  {selectedQuickJobs.map((job, index) => {
                    const lineTotal = job.quantity * job.unitPrice;
                    return (
                      <div key={index} className="px-4 py-3 space-y-2">
                        {/* Name row — editable if manually added (empty name) */}
                        <div className="flex items-center justify-between gap-2">
                          {job.name ? (
                            <span className="text-xs font-semibold text-gray-900">{job.name}</span>
                          ) : (
                            <input
                              placeholder="İşlem adı *"
                              value={job.name}
                              onChange={(e) => updateQuickJob(index, "name", e.target.value)}
                              className="flex-1 border border-amber-200 bg-amber-50/50 rounded-lg px-2.5 py-1.5 text-xs font-semibold placeholder-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeQuickJob(index)}
                            className="w-5 h-5 rounded-full text-gray-300 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-sm transition shrink-0"
                          >
                            ×
                          </button>
                        </div>
                        {/* Input row */}
                        <div className="grid grid-cols-[1fr_90px_90px_90px_32px] gap-2 items-center">
                          <input
                            placeholder="Marka (opsiyonel)"
                            value={job.brand}
                            onChange={(e) => updateQuickJob(index, "brand", e.target.value)}
                            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-300 w-full"
                          />
                          <input
                            type="number" min={0}
                            value={job.quantity}
                            onChange={(e) => updateQuickJob(index, "quantity", Number(e.target.value))}
                            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-300 w-full"
                          />
                          <input
                            type="number" min={0}
                            value={job.unitPrice}
                            onChange={(e) => updateQuickJob(index, "unitPrice", Number(e.target.value))}
                            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-300 w-full"
                          />
                          <span className="text-xs text-right font-semibold text-gray-800 tabular-nums">
                            {lineTotal > 0 ? `${lineTotal.toLocaleString("tr-TR")} ₺` : "—"}
                          </span>
                          <span />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subtotals */}
                <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 space-y-1.5">
                  {partsTotal > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Parça / Malzeme</span>
                      <span className="font-medium tabular-nums">{partsTotal.toLocaleString("tr-TR")} ₺</span>
                    </div>
                  )}
                  {laborFeeNum > 0 && (
                    <div className="flex justify-between text-xs text-amber-700">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l5.654-4.654" />
                        </svg>
                        İşçilik
                      </span>
                      <span className="font-medium tabular-nums">{laborFeeNum.toLocaleString("tr-TR")} ₺</span>
                    </div>
                  )}
                  {grandTotal > 0 && (
                    <div className="flex justify-between items-center pt-1.5 border-t border-gray-200">
                      <span className="text-xs font-bold text-gray-900">Genel Toplam</span>
                      <span className="text-sm font-bold text-gray-900 tabular-nums">{grandTotal.toLocaleString("tr-TR")} ₺</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                Kategori seçerek veya yukarıdan hızlı işlem ekleyin.
              </div>
            )}

            {/* Manual add button */}
            <button
              type="button"
              onClick={() => setSelectedQuickJobs((prev) => [...prev, { name: "", brand: "", quantity: 1, unitPrice: 0 }])}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-gray-200 text-xs font-medium text-gray-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Kalem Ekle
            </button>
          </div>

          {/* ── Section 3: Görseller ───────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionHeader
              step={3}
              title="Görseller"
              subtitle={`Opsiyonel • ${selectedFiles.length}/5 görsel • Maks. 5MB`}
            />

            {/* Drop zone */}
            <div
              className={`relative rounded-xl border-2 border-dashed transition-all ${
                selectedFiles.length >= 5
                  ? "border-gray-100 bg-gray-50 opacity-50 pointer-events-none"
                  : isDragging
                    ? "border-amber-400 bg-amber-50"
                    : "border-gray-200 bg-gray-50 hover:border-amber-300 hover:bg-amber-50/50 cursor-pointer"
              }`}
              onDragOver={(e) => { e.preventDefault(); if (selectedFiles.length < 5) setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileChange(e.dataTransfer.files);
              }}
            >
              <label className="flex flex-col items-center justify-center py-6 cursor-pointer">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition ${isDragging ? "bg-amber-100" : "bg-gray-100"}`}>
                  <svg className={`w-5 h-5 transition ${isDragging ? "text-amber-500" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-600">Görselleri sürükleyin veya seçin</p>
                <p className="text-[11px] text-gray-400 mt-0.5">PNG, JPG, WEBP • Max 5MB</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={selectedFiles.length >= 5}
                  onChange={(e) => { handleFileChange(e.target.files); e.target.value = ""; }}
                />
              </label>
            </div>

            {fileError && (
              <p className="mt-2 text-[11px] text-red-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>
                {fileError}
              </p>
            )}

            {/* Preview grid */}
            {selectedFiles.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                    <button
                      type="button"
                      onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Footer actions ─────────────────────────────────────────── */}
          <div className="flex gap-3 pb-4">
            <Link
              href={`/vehicles/${id}`}
              className="flex-1 text-center py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition bg-white"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed bg-gray-900 text-white hover:bg-gray-700"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Kaydediliyor...
                </span>
              ) : (
                "İşlemi Kaydet"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
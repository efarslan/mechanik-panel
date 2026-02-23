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
  "Diğer",
];

const quickJobs: Record<string, string[]> = {
  "Bakım": [
    "Yağ Değişimi",
    "Yağ Filtresi",
    "Hava Filtresi",
    "Polen Filtresi",
    "Yakıt Filtresi",
  ],
  "Motor / Mekanik": [
    "Triger Kayışı Değişimi",
    "V Kayışı Değişimi",
    "Su Pompası",
    "Enjektör Servisi",
    "Turbo",
    "Motor Takozu",
  ],
  "Şanzıman / Debriyaj": [
    "Debriyaj Seti Değişimi",
    "Şanzıman Yağı Değişimi",
    "Volan Değişimi",
  ],
  "Alt Takım": [
    "Amortisör",
    "Salıncak",
    "Z Rot",
    "Rot Başı",
    "Rot Kolu",
  ],
  "Fren Sistemi": [
    "Fren Balatası",
    "Fren Diski",
    "Fren Hidroliği Değişimi",
    "Fren Kaliperi",
  ],
  "Elektrik Sistemi": [
    "Akü",
    "Marş Motoru",
    "Alternatör",
    "Buji Değişimi",
  ],
  "Soğutma Sistemi": [
    "Radyatör Değişimi",
    "Termostat Değişimi",
    "Hortum Değişimi",
    "Antifriz Değişimi",
  ],
  "Egzoz Sistemi": [
    "DPF Temizliği",
    "Katalitik Konvertör Temizliği",
    "Oksijen Sensörü Değişimi",
    "Manifold Contası",
    "Susturucu",
  ],
};

export default function NewJobPage() {
  const { id } = useParams();
  const router = useRouter();
  const { business } = useBusiness();
  const storage = getStorage();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const formatMileage = (value: string) => {
    const numeric = value.replace(/\D/g, "");
    if (!numeric) return "";
    return Number(numeric).toLocaleString("tr-TR");
  };

  const [selectedQuickJobs, setSelectedQuickJobs] = useState<
    {
      name: string;
      brand: string;
      quantity: number;
      unitPrice: number;
    }[]
  >([]);

  const addQuickJob = (jobName: string) => {
    setSelectedQuickJobs((prev) => {
      if (prev.some((j) => j.name === jobName)) return prev;

      return [
        ...prev,
        {
          name: jobName,
          brand: "",
          quantity: 1,
          unitPrice: 0,
        },
      ];
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    const maxFileCount = 5;

    const currentCount = selectedFiles.length;
    const remainingSlots = maxFileCount - currentCount;

    if (remainingSlots <= 0) {
      setFileError("En fazla 5 görsel yükleyebilirsiniz.");
      return;
    }

    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      if (validFiles.length >= remainingSlots) break;

      const file = files[i];

      if (!file.type.startsWith("image/")) {
        setFileError("Sadece görsel dosyaları yüklenebilir.");
        return;
      }

      if (file.size > maxSize) {
        setFileError("Her bir dosya maksimum 5MB olabilir.");
        return;
      }

      validFiles.push(file);
    }

    setFileError(null);
    setSelectedFiles((prev) => [...prev, ...validFiles]);

    // aynı dosyayı tekrar seçebilmek için input reset
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!business) {
      alert("İşletme bulunamadı.");
      return;
    }

    if (!title || !mileage) {
      alert("Başlık ve kilometre zorunludur.");
      return;
    }

    setSaving(true);
    try {
      const uploadedImageUrls: string[] = [];

      for (const file of selectedFiles) {
        const storageRef = ref(
          storage,
          `businesses/${business.id}/vehicles/${id}/jobs/${Date.now()}-${file.name}`
        );

        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        uploadedImageUrls.push(downloadUrl);
      }

      await addDoc(collection(db, "jobs"), {
        businessId: business.id,
        vehicleId: id,
        title,
        category,
        mileage: Number(mileage.replace(/\./g, "")),
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

  const inputBase =
    "w-full border rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent border-gray-300";

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-xl mx-auto px-6 pt-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-900">Yeni işlem</h1>
            <p className="text-sm text-gray-500 mt-0.5">Araç için yeni bir işlem kaydı oluşturun.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İşlem başlığı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Örn: Periyodik bakım"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputBase}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`${inputBase} bg-white appearance-none`}
              >
                <option value="">Kategori seçin</option>
                {jobList.map((job) => (
                  <option key={job} value={job}>
                    {job}
                  </option>
                ))}
              </select>
            </div>

            
            {category && quickJobs[category] && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700 mb-3">Hızlı seçim</p>
                <div className="flex flex-wrap gap-2">
                  {quickJobs[category].map((q) => {
                    const isSelected = selectedQuickJobs.some((j) => j.name === q);

                    return (
                      <button
                        type="button"
                        key={q}
                        onClick={() => addQuickJob(q)}
                        className={`px-3 py-1.5 text-sm rounded-lg font-medium transition border ${
                          isSelected
                            ? "bg-black text-white border-black"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {q}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedQuickJobs.length > 0 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Seçilen işlemler
                </label>
                {selectedQuickJobs.map((job, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="font-semibold text-gray-900 mb-3">{job.name}</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Marka</label>
                        <input
                          placeholder="Marka"
                          value={job.brand}
                          onChange={(e) => {
                            const updated = [...selectedQuickJobs];
                            updated[index].brand = e.target.value;
                            setSelectedQuickJobs(updated);
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Adet</label>
                        <input
                          type="number"
                          placeholder="Adet"
                          value={job.quantity}
                          onChange={(e) => {
                            const updated = [...selectedQuickJobs];
                            updated[index].quantity = Number(e.target.value);
                            setSelectedQuickJobs(updated);
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Birim fiyat</label>
                        <input
                          type="number"
                          placeholder="Fiyat"
                          value={job.unitPrice}
                          onChange={(e) => {
                            const updated = [...selectedQuickJobs];
                            updated[index].unitPrice = Number(e.target.value);
                            setSelectedQuickJobs(updated);
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedQuickJobs(selectedQuickJobs.filter((_, i) => i !== index));
                      }}
                      className="mt-3 text-sm text-red-600 hover:text-red-700"
                    >
                      Kaldır
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kilometre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Örn: 150.000"
                value={mileage}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setMileage(formatMileage(raw));
                }}
                className={inputBase}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notlar <span className="text-gray-400">(opsiyonel)</span>
              </label>
              <textarea
                placeholder="İşlem hakkında not"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={`${inputBase} resize-none`}
              />
            </div>

            <div
              className={`relative border-2 border-dashed rounded-xl p-5 transition ${
                selectedFiles.length >= 5
                  ? "border-gray-200 bg-gray-100 cursor-not-allowed opacity-70"
                  : isDragging
                  ? "border-black bg-gray-100 cursor-pointer"
                  : "border-gray-300 bg-gray-50 hover:border-black cursor-pointer"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                if (selectedFiles.length >= 5) return;
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (selectedFiles.length >= 5) return;
                const dt = e.dataTransfer;
                if (dt?.files) {
                  const event = {
                    target: { files: dt.files, value: "" },
                  } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleFileChange(event);
                }
              }}
            >
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                📷 Görsel ekle <span className="text-gray-400 font-normal">(opsiyonel)</span>
              </label>

              <div className="flex flex-col items-center justify-center text-center pointer-events-none">
                <div className="text-gray-600 text-sm">
                  Görselleri seçmek için tıklayın veya sürükleyip bırakın
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Sadece görsel dosyaları • Maksimum 5MB (her dosya) • {`${selectedFiles.length}/5`} görsel
                </div>
              </div>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                disabled={selectedFiles.length >= 5}
              />

              {fileError && (
                <p className="text-xs text-red-600 mt-3">{fileError}</p>
              )}

              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {selectedFiles.map((file, index) => {
                    const previewUrl = URL.createObjectURL(file);

                    return (
                      <div key={index} className="relative group">
                        <img
                          src={previewUrl}
                          alt={file.name}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFiles(
                              selectedFiles.filter((_, i) => i !== index)
                            );
                          }}
                          className="absolute top-1 right-1 bg-black text-white text-xs rounded-full w-6 h-6 flex items-center justify-center opacity-90 hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-3">
              <Link
                href={`/vehicles/${id}`}
                className="flex-1 text-center py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                İptal
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-black text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Kaydediliyor..." : "İşlemi kaydet"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

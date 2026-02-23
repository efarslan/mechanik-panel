"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/context/BusinessContext";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import BrandSelect from "@/components/BrandSelect";
import ModelSelect from "@/components/ModelSelect";
import FuelTypeSelect from "@/components/FuelTypeSelect";

type FuelType =
  | "gasoline"
  | "diesel"
  | "lpg"
  | "electric"
  | "hybrid";

const MIN_YEAR = 1900;
const currentYear = new Date().getFullYear();
const MAX_YEAR = currentYear + 1;

type Brand = {
  id: string;
  name: string;
  logoUrl?: string | null;
};

type FormErrors = {
  plate?: string;
  brand?: string;
  model?: string;
  year?: string;
  fuelType?: string;
  engineSize?: string;
  ownerName?: string;
  ownerPhone?: string;
};

export default function NewVehiclePage() {
  const { business, loading } = useBusiness();
  const router = useRouter();

  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("gasoline");
  const [engineSize, setEngineSize] = useState("");
  const [chassisNo, setChassisNo] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchBrands = async () => {
      const snapshot = await getDocs(collection(db, "brands"));
      const brandList: Brand[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name ?? "",
          logoUrl: data.logoUrl ?? null,
        };
      });
      setBrands(brandList.sort((a, b) => a.name.localeCompare(b.name)));
    };
    fetchBrands();
  }, []);

  useEffect(() => {
    const fetchModels = async () => {
      if (!brand) {
        setModels([]);
        return;
      }
      const snapshot = await getDocs(
        collection(db, "brands", brand, "models")
      );
      const modelList = snapshot.docs.map((doc) => doc.data().name ?? "").filter(Boolean);
      setModels(modelList.sort());
      setModel("");
    };
    fetchModels();
  }, [brand]);

  function validate(): FormErrors {
    const e: FormErrors = {};
    const plateTrim = plate.replace(/\s+/g, "");
    if (!plateTrim) e.plate = "Plaka zorunludur.";
    if (!brand) e.brand = "Marka seçiniz.";
    if (!model) e.model = "Model seçiniz.";
    if (!year) {
      e.year = "Model yılı zorunludur.";
    } else {
      const y = Number(year);
      if (Number.isNaN(y) || y < MIN_YEAR || y > MAX_YEAR) {
        e.year = `Yıl ${MIN_YEAR} ile ${MAX_YEAR} arasında olmalıdır.`;
      }
    }
    if (!ownerName?.trim()) e.ownerName = "Araç sahibi adı zorunludur.";
    if (fuelType !== "electric" && !engineSize?.trim()) {
      e.engineSize = "Motor hacmi zorunludur.";
    }
    if (ownerPhone?.trim() && !/^[\d\s+()-]+$/.test(ownerPhone)) {
      e.ownerPhone = "Geçerli bir telefon numarası girin.";
    }
    return e;
  }

  const handleBlur = (field: keyof FormErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validate());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      plate: true,
      brand: true,
      model: true,
      year: true,
      ownerName: true,
      engineSize: true,
      ownerPhone: true,
    });
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!business) {
      alert("İşletme bulunamadı.");
      return;
    }

    const selectedBrand = brands.find((b) => b.id === brand);
    const brandName = selectedBrand?.name ?? brand;

    try {
      setSaving(true);
      const docRef = await addDoc(collection(db, "vehicles"), {
        businessId: business.id,
        plate: plate.replace(/\s+/g, "").toUpperCase(),
        brand: brandName,
        model,
        year: Number(year),
        fuelType,
        engineSize: fuelType === "electric" ? null : engineSize || null,
        chassisNo: chassisNo?.trim() || null,
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone?.trim() || null,
        notes: notes?.trim() || null,
        createdAt: serverTimestamp(),
      });
      router.push(`/vehicles/${docRef.id}`);
    } catch (err) {
      console.error(err);
      alert("Araç eklenirken hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-gray-700">İşletme bulunamadı.</p>
      </div>
    );
  }

  const inputBase =
    "w-full border rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent";
  const inputError = "border-red-500 focus:ring-red-500";

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-xl mx-auto px-6 pt-6">

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-900">Yeni araç ekle</h1>
            <p className="text-sm text-gray-500 mt-0.5">Zorunlu alanları doldurun.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plaka <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="34 ABC 123"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                onBlur={() => handleBlur("plate")}
                className={`${inputBase} ${errors.plate ? inputError : "border-gray-300"}`}
              />
              {touched.plate && errors.plate && (
                <p className="mt-1 text-sm text-red-600">{errors.plate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marka <span className="text-red-500">*</span>
              </label>
              <BrandSelect
                brands={brands}
                value={brand}
                onChange={(id) => {
                  setBrand(id);
                  setModel("");
                }}
                error={errors.brand}
                touched={touched.brand}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model <span className="text-red-500">*</span>
              </label>
              <ModelSelect
                models={models}
                value={model}
                onChange={(m) => setModel(m)}
                error={errors.model}
                touched={touched.model}
                disabled={!brand}
                placeholder="Model seçin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model yılı <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={MIN_YEAR}
                max={MAX_YEAR}
                placeholder={`${MIN_YEAR} - ${MAX_YEAR}`}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                onBlur={() => handleBlur("year")}
                className={`${inputBase} ${errors.year ? inputError : "border-gray-300"}`}
              />
              {touched.year && errors.year && (
                <p className="mt-1 text-sm text-red-600">{errors.year}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Yakıt türü
              </label>
              <FuelTypeSelect value={fuelType} onChange={setFuelType} />
            </div>

            {fuelType !== "electric" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motor hacmi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Örn: 1.6"
                  value={engineSize}
                  onChange={(e) => setEngineSize(e.target.value)}
                  onBlur={() => handleBlur("engineSize")}
                  className={`${inputBase} ${errors.engineSize ? inputError : "border-gray-300"}`}
                />
                {touched.engineSize && errors.engineSize && (
                  <p className="mt-1 text-sm text-red-600">{errors.engineSize}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şasi no <span className="text-gray-400">(opsiyonel)</span>
              </label>
              <input
                type="text"
                placeholder="Şasi numarası"
                value={chassisNo}
                onChange={(e) => setChassisNo(e.target.value)}
                className={`${inputBase} border-gray-300`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Araç sahibi adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ad soyad"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                onBlur={() => handleBlur("ownerName")}
                className={`${inputBase} ${errors.ownerName ? inputError : "border-gray-300"}`}
              />
              {touched.ownerName && errors.ownerName && (
                <p className="mt-1 text-sm text-red-600">{errors.ownerName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sahip telefon <span className="text-gray-400">(opsiyonel)</span>
              </label>
              <input
                type="tel"
                placeholder="555 123 45 67"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                onBlur={() => handleBlur("ownerPhone")}
                className={`${inputBase} ${errors.ownerPhone ? inputError : "border-gray-300"}`}
              />
              {touched.ownerPhone && errors.ownerPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.ownerPhone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notlar <span className="text-gray-400">(opsiyonel)</span>
              </label>
              <textarea
                placeholder="Araç hakkında not"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={`${inputBase} border-gray-300 resize-none`}
              />
            </div>

            <div className="pt-2 flex gap-3">
              <Link
                href="/vehicles"
                className="flex-1 text-center py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                İptal
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-black text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Kaydediliyor..." : "Araç oluştur"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

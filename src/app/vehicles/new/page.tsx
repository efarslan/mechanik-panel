"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/context/BusinessContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import BrandSelect from "@/components/BrandSelect";
import ModelSelect from "@/components/ModelSelect";
import FuelTypeSelect from "@/components/FuelTypeSelect";

type FuelType = "gasoline" | "diesel" | "lpg" | "electric" | "hybrid";

const MIN_YEAR = 1930;
const currentYear = new Date().getFullYear();
const MAX_YEAR = currentYear + 1;

type Brand = { id: string; name: string; logoUrl?: string | null };
type FormErrors = {
  plate?: string; brand?: string; model?: string; year?: string;
  fuelType?: string; engineSize?: string; ownerName?: string; ownerPhone?: string; chassisNo?: string;
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const IcChevron = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

// Step header with number badge
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
const inputErrCls = "border-rose-300 bg-rose-50/30 focus:ring-rose-200 focus:border-rose-300";
const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 text-[11px] text-rose-500 flex items-center gap-1">
      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      {msg}
    </p>
  );
}

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
      const list: Brand[] = snapshot.docs.map((doc) => {
        const d = doc.data();
        return { id: doc.id, name: d.name ?? "", logoUrl: d.logoUrl ?? null };
      });
      setBrands(list.sort((a, b) => a.name.localeCompare(b.name)));
    };
    fetchBrands();
  }, []);

  useEffect(() => {
    const fetchModels = async () => {
      if (!brand) { setModels([]); return; }
      const snapshot = await getDocs(collection(db, "brands", brand, "models"));
      const list = snapshot.docs.map((doc) => doc.data().name ?? "").filter(Boolean);
      setModels(list.sort());
      setModel("");
    };
    fetchModels();
  }, [brand]);

  function validate(): FormErrors {
    const e: FormErrors = {};

    // Plate — Türk plaka formatı: 2 rakam + 1-3 harf + 2-4 rakam (boşluksuz)
    const rawPlate = plate.replace(/\s+/g, "").toUpperCase();
    if (!rawPlate) {
      e.plate = "Plaka zorunludur.";
    } else if (!/^\d{2}[A-Z]{1,3}\d{2,4}$/.test(rawPlate)) {
      e.plate = "Geçerli plaka giriniz. (Örn: 34ABC123)";
    }

    if (!brand) e.brand = "Marka seçiniz.";
    if (!model) e.model = "Model seçiniz.";

    // Year — tam sayı ve aralık kontrolü
    if (!year) {
      e.year = "Model yılı zorunludur.";
    } else if (!/^\d{4}$/.test(year.trim())) {
      e.year = "4 haneli yıl giriniz.";
    } else {
      const y = Number(year);
      if (y < MIN_YEAR || y > MAX_YEAR) e.year = `Yıl ${MIN_YEAR}–${MAX_YEAR} arasında olmalıdır.`;
    }

    // Engine size — max 4 char
    if (fuelType !== "electric") {
      if (!engineSize?.trim()) {
        e.engineSize = "Motor hacmi zorunludur.";
      } else if (!/^\d\.\d{1,2}$/.test(engineSize.trim())) {
        e.engineSize = "Ondalıklı formatta giriniz. (Örn: 1.6, 2.0, 1.33)";
      }
    }

    // Chassis / VIN — opsiyonel ama girilmişse 17 karakter ve alfanumerik (I, O, Q hariç)
    const vinTrim = chassisNo?.trim().toUpperCase();
    if (vinTrim) {
      if (vinTrim.length !== 17) {
        e.chassisNo = "Şasi numarası tam 17 karakter olmalıdır.";
      } else if (/[IOQ]/.test(vinTrim)) {
        e.chassisNo = "Şasi numarasında I, O ve Q harfleri kullanılamaz.";
      } else if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vinTrim)) {
        e.chassisNo = "Şasi numarası yalnızca harf ve rakam içermelidir.";
      }
    }

    if (!ownerName?.trim()) e.ownerName = "Araç sahibi adı zorunludur.";

    // Phone — Türkiye: 05XX veya +905XX, 10-13 rakam
    const rawPhone = ownerPhone?.trim().replace(/[\s()-]/g, "");
    if (rawPhone) {
      if (!/^(\+90|0)?[5][0-9]{9}$/.test(rawPhone)) {
        e.ownerPhone = "Geçerli telefon numarası giriniz. (Örn: 0555 123 45 67)";
      }
    }

    return e;
  }

  const handleBlur = (field: keyof FormErrors) => {
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors(validate());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = { plate: true, brand: true, model: true, year: true, ownerName: true, engineSize: true, ownerPhone: true, chassisNo: true };
    setTouched(allTouched);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!business) { alert("İşletme bulunamadı."); return; }
    const selectedBrand = brands.find((b) => b.id === brand);
    try {
      setSaving(true);
      const docRef = await addDoc(collection(db, "vehicles"), {
        businessId: business.id,
        plate: plate.replace(/\s+/g, "").toUpperCase(),
        brand: selectedBrand?.name ?? brand,
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
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-[3px] border-gray-200 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
        <p className="text-gray-500 text-sm">İşletme bulunamadı.</p>
      </div>
    );
  }

  const hasErrors = Object.keys(errors).some((k) => touched[k] && errors[k as keyof FormErrors]);

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-16">
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-6 space-y-4">

        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs mb-1">
              <Link href="/vehicles" className="text-gray-400 hover:text-gray-700 transition font-medium">Araçlar</Link>
              <IcChevron className="w-3 h-3 text-gray-300" />
              <span className="text-gray-700 font-semibold">Yeni Araç</span>
            </nav>
            <h1 className="text-lg font-bold text-[#111110]">Araç Ekle</h1>
          </div>
          <Link
            href="/vehicles"
            className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition text-sm shadow-sm"
          >
            ✕
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Section 1: Araç Bilgileri ─────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionHeader step={1} title="Araç Bilgileri" subtitle="Plaka, marka, model ve teknik detaylar" />

            <div className="space-y-4">
              {/* Plate */}
              <div>
                <label className={labelCls}>Plaka <span className="text-rose-400 normal-case font-normal">*</span></label>
                <input
                  type="text"
                  placeholder="34 ABC 123"
                  value={plate}
                  maxLength={8}
                  onChange={(e) => {
                    const formatted = e.target.value
                      .replace(/\s+/g, "")        // remove all spaces
                      .toUpperCase()
                      .slice(0, 8);               // max 8 characters
                    setPlate(formatted);
                  }}
                  onBlur={() => handleBlur("plate")}
                  className={`${inputCls} font-mono tracking-widest ${touched.plate && errors.plate ? inputErrCls : ""}`}
                />
                {touched.plate && <FieldError msg={errors.plate} />}
              </div>

              {/* Brand + Model — side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Marka <span className="text-rose-400 normal-case font-normal">*</span></label>
                  <BrandSelect
                    brands={brands}
                    value={brand}
                    onChange={(id) => { setBrand(id); setModel(""); }}
                    error={errors.brand}
                    touched={touched.brand}
                  />
                  {touched.brand && <FieldError msg={errors.brand} />}
                </div>
                <div>
                  <label className={labelCls}>Model <span className="text-rose-400 normal-case font-normal">*</span></label>
                  <ModelSelect
                    models={models}
                    value={model}
                    onChange={setModel}
                    error={errors.model}
                    touched={touched.model}
                    disabled={!brand}
                    placeholder={brand ? "Model seçin" : "Önce marka seçin"}
                  />
                  {touched.model && <FieldError msg={errors.model} />}
                </div>
              </div>

              {/* Year + Fuel side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Model Yılı <span className="text-rose-400 normal-case font-normal">*</span></label>
                  <input
                    // type="number"
                    // min={MIN_YEAR}
                    // max={MAX_YEAR}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder={`${MIN_YEAR}–${MAX_YEAR}`}
                    value={year}
                    // onChange={(e) => setYear(e.target.value)}
                    onChange={(e) => {
                      const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setYear(onlyDigits);
                    }}
                    onBlur={() => handleBlur("year")}
                    className={`${inputCls} ${touched.year && errors.year ? inputErrCls : ""}`}
                  />
                  {touched.year && <FieldError msg={errors.year} />}
                </div>
                <div>
                  <label className={labelCls}>Yakıt Türü</label>
                  <FuelTypeSelect value={fuelType} onChange={setFuelType} />
                </div>
              </div>

              {/* Engine size — hidden for electric */}
              {fuelType !== "electric" && (
                <div>
                  <label className={labelCls}>Motor Hacmi <span className="text-rose-400 normal-case font-normal">*</span></label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Örn: 1.6"
                    value={engineSize}
                    onChange={(e) => {
                      const raw = e.target.value;

                      // If user cleared input
                      if (!raw) {
                        setEngineSize("");
                        return;
                      }

                      // Keep only digits
                      let digits = raw.replace(/\D/g, "").slice(0, 3);

                      if (!digits) {
                        setEngineSize("");
                        return;
                      }

                      // If only 1 digit → do NOT force dot yet (better UX for editing)
                      if (digits.length === 1) {
                        setEngineSize(digits);
                        return;
                      }

                      // Format as X.XX
                      const intPart = digits.slice(0, 1);
                      const decimalPart = digits.slice(1);

                      setEngineSize(`${intPart}.${decimalPart}`);
                    }}
                    onBlur={() => handleBlur("engineSize")}
                    className={`${inputCls} ${touched.engineSize && errors.engineSize ? inputErrCls : ""}`}
                  />
                  {touched.engineSize && <FieldError msg={errors.engineSize} />}
                </div>
              )}

              {/* Chassis — optional */}
              <div>
                <label className={labelCls}>
                  Şasi No <span className="text-gray-400 normal-case font-normal">(opsiyonel)</span>
                </label>
                <input
                  type="text"
                  placeholder="17 haneli şasi numarası"
                  value={chassisNo}
                  onChange={(e) => setChassisNo(e.target.value.toUpperCase())}
                  onBlur={() => handleBlur("chassisNo")}
                  maxLength={17}
                  className={`${inputCls} font-mono text-xs tracking-wider ${touched.chassisNo && errors.chassisNo ? inputErrCls : ""}`}
                />
                {touched.chassisNo && <FieldError msg={errors.chassisNo} />}
                {!errors.chassisNo && chassisNo.trim().length > 0 && chassisNo.trim().length < 17 && (
                  <p className="mt-1.5 text-[11px] text-gray-400">{chassisNo.trim().length}/17 karakter</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Section 2: Araç Sahibi ────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionHeader step={2} title="Araç Sahibi" subtitle="İletişim ve kimlik bilgileri" />

            <div className="space-y-4">
              {/* Owner name */}
              <div>
                <label className={labelCls}>Ad Soyad <span className="text-rose-400 normal-case font-normal">*</span></label>
                <input
                  type="text"
                  placeholder="Araç sahibinin adı"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  onBlur={() => handleBlur("ownerName")}
                  className={`${inputCls} ${touched.ownerName && errors.ownerName ? inputErrCls : ""}`}
                />
                {touched.ownerName && <FieldError msg={errors.ownerName} />}
              </div>

              {/* Phone */}
              <div>
                <label className={labelCls}>
                  Telefon <span className="text-gray-400 normal-case font-normal">(opsiyonel)</span>
                </label>
                <input
                  type="tel"
                  placeholder="555 123 45 67"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  onBlur={() => handleBlur("ownerPhone")}
                  className={`${inputCls} ${touched.ownerPhone && errors.ownerPhone ? inputErrCls : ""}`}
                />
                {touched.ownerPhone && <FieldError msg={errors.ownerPhone} />}
              </div>
            </div>
          </div>

          {/* ── Section 3: Notlar ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionHeader
              step={3}
              title="Notlar"
              subtitle="Araç hakkında ek bilgi — opsiyonel"
            />
            <textarea
              placeholder="Özel durum, dikkat edilmesi gereken bir şey..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* ── Footer ───────────────────────────────────────────────── */}
          {hasErrors && (
            <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-medium">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
              Lütfen zorunlu alanları doldurun.
            </div>
          )}

          <div className="flex gap-3 pb-4">
            <Link
              href="/vehicles"
              className="flex-1 text-center py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition bg-white"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-[#111110] text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Kaydediliyor...
                </span>
              ) : "Araç Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useBusiness } from "@/context/BusinessContext";
import { useMembershipRole } from "@/lib/useMembershipRole";
import { addDoc, collection, doc, setDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Sparkles, Building2, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAuth();
  const { business, loading } = useBusiness();
  const { status, loading: roleLoading } = useMembershipRole();

  const [step, setStep] = useState<"choice" | "create" | "join">("choice");
  const [businessName, setBusinessName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [joining, setJoining] = useState(false);

  const generateInviteCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let raw = "";
    for (let i = 0; i < 8; i += 1) {
      raw += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  };

  const safeNavigate = (path: string) => {
    router.replace(path);
    // Fallback: if client-side navigation is interrupted, force a hard redirect.
    window.setTimeout(() => {
      if (window.location.pathname !== path) {
        window.location.assign(path);
      }
    }, 350);
  };

  useEffect(() => {
    if (!loading && !roleLoading && business) {
      if (status === "pending") {
        router.replace("/pending-approval");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [loading, roleLoading, business, status, router]);

  const handleJoinBusiness = async () => {
    if (!user || !inviteCodeInput.trim()) return;
    try {
      setJoining(true);
      const normalized = inviteCodeInput.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (normalized.length !== 8) {
        alert("Davet kodu 8 karakter olmalıdır (XXXX-XXXX).");
        return;
      }
      const code = `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}`;
      const q = query(collection(db, "businesses"), where("inviteCode", "==", code));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        alert("Geçersiz davet kodu.");
        return;
      }
      const businessDoc = snapshot.docs[0];
      const businessId = businessDoc.id;
      await setDoc(doc(db, "businesses", businessId, "members", user.uid), {
        userId: user.uid,
        role: "technician",
        status: "pending",
        email: user.email ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      safeNavigate("/pending-approval");
    } catch (e) {
      console.error(e);
      alert("Davet kodu ile katılım sırasında hata oluştu.");
    } finally {
      setJoining(false);
    }
  };

  const handleCreateBusiness = async () => {
    if (!user || !businessName.trim()) return;
    try {
      setCreating(true);
      const inviteCode = generateInviteCode();
      const businessRef = await addDoc(collection(db, "businesses"), {
        name: businessName.trim(),
        ownerId: user.uid,
        inviteCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, "businesses", businessRef.id, "members", user.uid), {
        userId: user.uid,
        role: "owner",
        status: "active",
        email: user.email ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      safeNavigate("/dashboard");
    } catch (e) {
      console.error(e);
      alert("İşletme oluşturulamadı");
    } finally {
      setCreating(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f4f0] px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          </span>
          <h1 className="text-sm font-bold text-[#111110]">
            {step === "choice" && "Başlayalım"}
            {step === "create" && "İşletme Oluştur"}
            {step === "join"   && "Davet Kodu ile Katıl"}
          </h1>
        </div>

        <div className="p-8">

          {/* ── Choice ── */}
          {step === "choice" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 mb-4">
                Devam etmek için bir işletme oluşturun ya da mevcut birine katılın.
              </p>

              <button
                onClick={() => setStep("create")}
                className="w-full text-left border border-gray-100 rounded-xl p-4 hover:border-amber-300 hover:bg-amber-50/40 transition group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:bg-amber-100 group-hover:border-amber-200 transition">
                    <Building2 className="w-4 h-4 text-gray-400 group-hover:text-amber-600 transition" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#111110]">İşletme Oluştur</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      Yeni bir işletme kur ve ekip üyelerini davet et
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-amber-400 ml-auto shrink-0 transition" />
                </div>
              </button>

              <button
                onClick={() => setStep("join")}
                className="w-full text-left border border-gray-100 rounded-xl p-4 hover:border-amber-300 hover:bg-amber-50/40 transition group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:bg-amber-100 group-hover:border-amber-200 transition">
                    <UserPlus className="w-4 h-4 text-gray-400 group-hover:text-amber-600 transition" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#111110]">Davet Kodu ile Katıl</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      Mevcut bir işletmeye davet kodu ile eriş
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-amber-400 ml-auto shrink-0 transition" />
                </div>
              </button>
            </div>
          )}

          {/* ── Create ── */}
          {step === "create" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-gray-400">İşletme adı</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Örn: Oto Servis"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition"
                />
              </div>

              <button
                onClick={handleCreateBusiness}
                disabled={creating || !businessName.trim()}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#111110] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-gray-800 transition disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Oluşturuluyor…
                  </>
                ) : (
                  <>
                    <Building2 className="w-3.5 h-3.5" />
                    Oluştur
                  </>
                )}
              </button>

              <button
                onClick={() => setStep("choice")}
                className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-gray-700 transition pt-1"
              >
                <ChevronLeft className="w-3 h-3" />
                Geri
              </button>
            </div>
          )}

          {/* ── Join ── */}
          {step === "join" && (
            <div className="space-y-3">
              <div className="rounded-xl bg-[#fafaf8] border border-gray-100 px-3.5 py-3 text-[11px] text-gray-400 leading-relaxed">
                Davet kodunu işletme yöneticinizden alabilirsiniz.
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-gray-400">Davet kodu</label>
                <input
                  type="text"
                  value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
              placeholder="AB12-CD34"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono tracking-[0.35em] uppercase focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition"
                />
              </div>

              <button
                onClick={handleJoinBusiness}
                disabled={joining || !inviteCodeInput.trim()}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#111110] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-gray-800 transition disabled:opacity-50"
              >
                {joining ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Katılıyor…
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    Katıl
                  </>
                )}
              </button>

              <button
                onClick={() => setStep("choice")}
                className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-gray-700 transition pt-1"
              >
                <ChevronLeft className="w-3 h-3" />
                Geri
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
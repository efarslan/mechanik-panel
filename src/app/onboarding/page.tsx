"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/context/BusinessContext";
import { signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function Onboarding() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const user = useAuth();
  const { business, loading } = useBusiness();
  const router = useRouter();

  useEffect(() => {
    if (user === undefined || loading) return;

    if (user === null) {
      router.replace("/login");
      return;
    }

    if (business === undefined) return;

    if (business) {
      router.replace("/dashboard");
    }
  }, [user, loading, business, router]);

  const createBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("İşletme adı zorunludur.");
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      const newBusinessRef = await addDoc(collection(db, "businesses"), {
        name: name.trim(),
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });
      // Owner icin otomatik member kaydi olustur.
      await setDoc(doc(db, "businesses", newBusinessRef.id, "members", user.uid), {
        userId: user.uid,
        role: "owner",
        status: "active",
        email: user.email ?? null,
        createdAt: serverTimestamp(),
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Oluşturulurken hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">İşletme oluştur</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Devam etmek için bir işletme adı girin.
          </p>
        </div>

        <form onSubmit={createBusiness} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İşletme adı
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Oto Servis"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  await signOut(auth);
                  router.replace("/login");
                } catch (err) {
                  setError("Çıkış yapılırken hata oluştu.");
                }
              }}
              className="flex-1 text-center py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-black text-white py-2.5 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-60"
            >
              {saving ? "Oluşturuluyor..." : "Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

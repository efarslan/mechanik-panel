"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useMembershipRole } from "@/lib/useMembershipRole";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
    collectionGroup,
    query,
    where,
    limit,
    getDocs,
    deleteDoc,
    doc,
} from "firebase/firestore";
import { Clock, LogOut, X } from "lucide-react";

export default function PendingApprovalPage() {
    const router = useRouter();
    const user = useAuth();
    const { status, loading } = useMembershipRole();

    // Redirect unauthenticated users to login
    useEffect(() => {
        if (user === null) {
            router.replace("/login");
        }
    }, [user, router]);

    const [businessName, setBusinessName] = useState<string | null>(null);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    // İşletme adını çek (pending üyenin member doc'unun parent'ı)
    useEffect(() => {
        if (!user) return;
        const fetch = async () => {
            try {
                const q = query(
                    collectionGroup(db, "members"),
                    where("userId", "==", user.uid),
                    where("status", "==", "pending"),
                    limit(1)
                );
                const snap = await getDocs(q);
                if (snap.empty) return;
                const businessRef = snap.docs[0].ref.parent.parent;
                if (!businessRef) return;
                const { getDoc } = await import("firebase/firestore");
                const bSnap = await getDoc(businessRef);
                if (bSnap.exists()) {
                    setBusinessName((bSnap.data() as { name: string }).name);
                }
            } catch {
                // sessizce devam
            }
        };
        fetch();
    }, [user]);

    // Status değişince yönlendir
   useEffect(() => {
    if (loading) return;

    if (status === "active") {
        router.replace("/dashboard");
        return;
    }

    // pending veya null → burada kal
}, [status, loading, router]);
    // Daveti iptal et
    const handleCancelRequest = async () => {
        if (!user) return;
        setCancelling(true);
        try {
            const q = query(
                collectionGroup(db, "members"),
                where("userId", "==", user.uid),
                where("status", "==", "pending"),
                limit(1)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                await deleteDoc(doc(db, snap.docs[0].ref.path));
            }
            await signOut(auth);
            router.replace("/login");
        } catch {
            setCancelling(false);
            setShowCancelConfirm(false);
        }
    };

    // Yükleniyor
    if (user === undefined || loading) {
        return (
            <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-9 h-9 border-[3px] border-gray-200 border-t-amber-400 rounded-full animate-spin" />
                    <p className="text-sm text-gray-400 font-medium">Yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center max-w-sm w-full space-y-5">

                {/* İkon */}
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-500" />
                </div>

                {/* Başlık & Açıklama */}
                <div className="space-y-1.5">
                    <p className="text-base font-bold text-gray-900">Onay Bekleniyor</p>
                    {businessName && (
                        <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 inline-block">
                            {businessName}
                        </p>
                    )}
                    <p className="text-xs text-gray-500 leading-relaxed pt-1">
                        İşletme yöneticisi başvurunu henüz onaylamamış olabilir.
                        Onay durumunu kontrol etmek için sayfayı yenileyebilirsin.
                        Onaylandıktan sonra otomatik olarak erişim sağlanacaktır.
                    </p>
                </div>

                {/* Ayırıcı */}
                <div className="border-t border-gray-100" />

                {/* Butonlar */}
                {!showCancelConfirm ? (
                    <div className="space-y-2">
                        {/* Daveti İptal Et */}
                        <button
                            type="button"
                            onClick={() => setShowCancelConfirm(true)}
                            className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition flex items-center justify-center gap-2"
                        >
                            <X className="w-3.5 h-3.5" />
                            Daveti İptal Et
                        </button>
                    </div>
                ) : (
                    /* Onay Diyaloğu */
                    <div className="space-y-3">
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left">
                            <p className="text-xs font-semibold text-rose-800">Emin misin?</p>
                            <p className="text-xs text-rose-700/80 mt-0.5 leading-relaxed">
                                Başvurun silinecek ve çıkış yapacaksın. Tekrar katılmak için yeni bir davet kodu gerekecek.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowCancelConfirm(false)}
                                disabled={cancelling}
                                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                Geri Dön
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelRequest}
                                disabled={cancelling}
                                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 transition disabled:opacity-50"
                            >
                                {cancelling ? "İptal ediliyor..." : "Evet, İptal Et"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Çıkış yap (küçük link) */}
                {!showCancelConfirm && (
                    <button
                        type="button"
                        onClick={async () => {
                            await signOut(auth);
                            router.replace("/login");
                        }}
                        className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition"
                    >
                        <LogOut className="w-3 h-3" />
                        Çıkış Yap
                    </button>
                )}
            </div>
        </div>
    );
}
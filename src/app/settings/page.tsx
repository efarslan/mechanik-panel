"use client";

import { useEffect, useMemo, useState } from "react";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { sendEmailVerification, sendPasswordResetEmail, signOut, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { useAuth } from "@/lib/useAuth";
import { db, auth } from "@/lib/firebase";
import { useBusiness } from "@/context/BusinessContext";
import { useMembershipRole, type MemberRole } from "@/lib/useMembershipRole";
import { useRouter } from "next/navigation";
import {
    Copy,
    Globe,
    KeyRound,
    LogOut,
    Pencil,
    Save,
    ShieldCheck,
    Sparkles,
    Users,
    MailPlus,
    Trash2,
} from "lucide-react";

export default function SettingsPage() {
    const user = useAuth();
    const { business, loading: businessLoading } = useBusiness();
    const router = useRouter();
    const { role, loading: roleLoading } = useMembershipRole();

    const [nameDraft, setNameDraft] = useState("");
    const [editingName, setEditingName] = useState(false);
    const [savingName, setSavingName] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);
    const [nameSuccess, setNameSuccess] = useState<string | null>(null);

    const [resetLoading, setResetLoading] = useState(false);
    const [resetStatus, setResetStatus] = useState<string | null>(null);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyStatus, setVerifyStatus] = useState<string | null>(null);

    const [emailDraft, setEmailDraft] = useState(user?.email ?? "");
    const [emailPassword, setEmailPassword] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
    useEffect(() => {
        if (user?.email) {
            setEmailDraft(user.email);
        }
    }, [user]);
    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser || !user?.email) return;

        setEmailError(null);
        setEmailSuccess(null);

        const newEmail = emailDraft.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            setEmailError("Geçerli bir e-posta girin.");
            return;
        }

        try {
            setEmailLoading(true);

            const credential = EmailAuthProvider.credential(user.email, emailPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);

            await updateEmail(auth.currentUser, newEmail);

            setEmailSuccess("E-posta başarıyla güncellendi.");
            setEmailPassword("");
        } catch (e: any) {
            console.error(e);

            if (e.code === "auth/wrong-password") {
                setEmailError("Şifre hatalı.");
            }
            else if (e.code === "auth/operation-not-allowed") {
                setEmailError("Yeni e-posta adresi eskisi doğrulanmadan değiştirilemez. Lütfen gelen kutunu kontrol et ve doğruladıktan sonra tekrar dene.");
            }
            else if (e.code === "auth/email-already-in-use") {
                setEmailError("Bu e-posta başka bir hesap tarafından kullanılıyor.");
            }
            else {
                setEmailError("E-posta güncellenemedi.");
            }
        } finally {
            setEmailLoading(false);
        }
    };

    type MemberRow = {
        userId: string;
        email: string | null;
        role: MemberRole;
        status: string;
    };
    type InviteRow = {
        id: string;
        email: string;
        role: MemberRole;
        status: string;
    };

    type MemberDocData = {
        email?: string | null;
        role?: MemberRole | string;
        status?: string;
    };

    type InviteDocData = {
        email?: string;
        role?: MemberRole | string;
        status?: string;
    };

    const [membersLoading, setMembersLoading] = useState(false);
    const [members, setMembers] = useState<MemberRow[]>([]);
    const [invitesLoading, setInvitesLoading] = useState(false);
    const [invites, setInvites] = useState<InviteRow[]>([]);

    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<MemberRole>("technician");
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

    const canManageStaff = role === "owner" || role === "manager";

    useEffect(() => {
        if (!business) return;
        setNameDraft(business.name ?? "");
    }, [business]);

    const displayEmail = user?.email ?? "—";
    const userIdShort = user?.uid ? user.uid.slice(0, 16) + "…" : "—";
    const businessIdShort = business ? business.id.slice(0, 16) + "…" : "—";

    const canSaveName = useMemo(() => {
        const v = nameDraft.trim();
        if (!business) return false;
        if (!v) return false;
        if (v === business.name) return false;
        return true;
    }, [business, nameDraft]);

    const handleSaveName = async () => {
        if (!business) return;
        setNameError(null);
        setNameSuccess(null);
        const next = nameDraft.trim();
        if (!next) {
            setNameError("İşletme adı boş olamaz.");
            return;
        }

        try {
            setSavingName(true);
            await updateDoc(doc(db, "businesses", business.id), {
                name: next,
            });
            setNameSuccess("İşletme adı güncellendi.");
            setEditingName(false);
        } catch (e) {
            console.error(e);
            setNameError("Güncellenirken hata oluştu. Tekrar deneyin.");
        } finally {
            setSavingName(false);
        }
    };

    const handleResetPassword = async () => {
        if (!user?.email) {
            setResetStatus("Şifre sıfırlama için e-posta bulunamadı.");
            return;
        }
        setResetStatus(null);
        try {
            setResetLoading(true);
            await sendPasswordResetEmail(auth, user.email);
            setResetStatus("Şifre sıfırlama e-postası gönderildi.");
        } catch (e) {
            console.error(e);
            setResetStatus("Şifre sıfırlama e-postası gönderilemedi.");
        } finally {
            setResetLoading(false);
        }
    };

    const handleResendVerification = async () => {
        if (!auth.currentUser) return;
        setVerifyLoading(true);
        setVerifyStatus(null);
        try {
            await sendEmailVerification(auth.currentUser);
            setVerifyStatus("Doğrulama e-postası gönderildi.");
            await auth.currentUser.reload();
        } catch (e) {
            console.error(e);
            setVerifyStatus("Doğrulama e-postası gönderilemedi.");
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            router.replace("/login");
        } catch (e) {
            console.error(e);
            alert("Çıkış yapılamadı.");
        }
    };

    const roleOptionsForInvite: MemberRole[] = useMemo(() => {
        if (role === "owner") return ["manager", "technician", "viewer"];
        if (role === "manager") return ["technician", "viewer"];
        return [];
    }, [role]);

    useEffect(() => {
        const run = async () => {
            if (!business) return;
            if (!canManageStaff) return;
            if (!user || user.emailVerified === false) return; // sadece doğrulanmış kullanıcıya yönetim

            setMembersLoading(true);
            try {
                const snap = await getDocs(collection(db, "businesses", business.id, "members"));
                const list: MemberRow[] = snap.docs
                    .map((d) => {
                        const data = d.data() as MemberDocData;
                        return {
                            userId: d.id,
                            email: data.email ?? null,
                            role: (data.role ?? "viewer") as MemberRole,
                            status: data.status ?? "active",
                        };
                    })
                    .filter((m) => (m.status ?? "active") === "active");
                setMembers(list);
            } catch (e) {
                console.error(e);
                setMembers([]);
            } finally {
                setMembersLoading(false);
            }

            setInvitesLoading(true);
            try {
                const snap = await getDocs(collection(db, "businesses", business.id, "invites"));
                const list: InviteRow[] = snap.docs.map((d) => {
                    const data = d.data() as InviteDocData;
                    return {
                        id: d.id,
                        email: data.email ?? "",
                        role: (data.role ?? "viewer") as MemberRole,
                        status: data.status ?? "invited",
                    };
                });
                setInvites(list.filter((i) => i.status === "invited"));
            } catch (e) {
                console.error(e);
                setInvites([]);
            } finally {
                setInvitesLoading(false);
            }
        };

        run();
    }, [business, canManageStaff, user]);

    const refreshMembersAndInvites = async () => {
        if (!business) return;
        setMembersLoading(true);
        setInvitesLoading(true);
        try {
            const [mSnap, iSnap] = await Promise.all([
                getDocs(collection(db, "businesses", business.id, "members")),
                getDocs(collection(db, "businesses", business.id, "invites")),
            ]);
            const listM: MemberRow[] = mSnap.docs
                .map((d) => {
                    const data = d.data() as MemberDocData;
                    return {
                        userId: d.id,
                        email: data.email ?? null,
                        role: (data.role ?? "viewer") as MemberRole,
                        status: data.status ?? "active",
                    };
                })
                .filter((m) => (m.status ?? "active") === "active");
            const listI: InviteRow[] = iSnap.docs.map((d) => {
                const data = d.data() as InviteDocData;
                return {
                    id: d.id,
                    email: data.email ?? "",
                    role: (data.role ?? "viewer") as MemberRole,
                    status: data.status ?? "invited",
                };
            });

            setMembers(listM);
            setInvites(listI.filter((i) => i.status === "invited"));
        } catch (e) {
            console.error(e);
        } finally {
            setMembersLoading(false);
            setInvitesLoading(false);
        }
    };

    const handleInviteStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteError(null);
        setInviteSuccess(null);

        if (!business) return;
        if (!user?.email) return;
        if (!canManageStaff) return;

        const email = inviteEmail.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setInviteError("Geçerli bir e-posta girin.");
            return;
        }
        if (!roleOptionsForInvite.includes(inviteRole)) {
            setInviteError("Seçilen rol için yetkiniz yok.");
            return;
        }

        try {
            setInviteSuccess(null);
            setInviteError(null);

            // mevcut member veya invite kontrolü
            const membersSnap = await getDocs(
                query(
                    collection(db, "businesses", business.id, "members"),
                    where("email", "==", email),
                    where("status", "==", "active"),
                ),
            );
            if (!membersSnap.empty) {
                setInviteError("Bu e-posta zaten işletmede aktif bir çalışan.");
                return;
            }

            const invitesSnap = await getDocs(
                query(
                    collection(db, "businesses", business.id, "invites"),
                    where("email", "==", email),
                    where("status", "==", "invited"),
                ),
            );
            if (!invitesSnap.empty) {
                setInviteError("Bu e-posta için bekleyen bir davet zaten var.");
                return;
            }

            await addDoc(collection(db, "businesses", business.id, "invites"), {
                email,
                role: inviteRole,
                status: "invited",
                invitedAt: serverTimestamp(),
                invitedBy: user.uid,
            });

            setInviteSuccess("Davet oluşturuldu. E-posta ile giriş yapan kullanıcı otomatik olarak eklenir.");
            setInviteEmail("");
            // roller secimi kalabilir
            await refreshMembersAndInvites();
        } catch (err) {
            console.error(err);
            setInviteError("Davet oluşturulurken hata oluştu.");
        }
    };

    const handleRemoveMember = async (member: MemberRow) => {
        if (!business) return;
        if (!canManageStaff) return;
        if (member.role === "owner") return;

        try {
            await deleteDoc(doc(db, "businesses", business.id, "members", member.userId));
            await refreshMembersAndInvites();
        } catch (e) {
            console.error(e);
            alert("Çalışan kaldırılırken hata oluştu.");
        }
    };

    const handleUpdateMemberRole = async (member: MemberRow, nextRole: MemberRole) => {
        if (!business) return;
        if (!canManageStaff) return;
        if (member.role === "owner") return;
        if (role === "manager" && nextRole !== "technician" && nextRole !== "viewer") return;

        try {
            await updateDoc(doc(db, "businesses", business.id, "members", member.userId), {
                role: nextRole,
            });
            await refreshMembersAndInvites();
        } catch (e) {
            console.error(e);
            alert("Rol güncellenirken hata oluştu.");
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        if (!business) return;
        if (!canManageStaff) return;
        try {
            await deleteDoc(doc(db, "businesses", business.id, "invites", inviteId));
            await refreshMembersAndInvites();
        } catch (e) {
            console.error(e);
            alert("Davet silinirken hata oluştu.");
        }
    };

    if (user === undefined || businessLoading || roleLoading) {
        return (
            <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-9 h-9 border-[3px] border-gray-200 border-t-amber-400 rounded-full animate-spin" />
                    <p className="text-sm text-gray-400 font-medium">Ayarlar yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (!business) {
        return (
            <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                    <p className="text-sm font-semibold text-gray-900">İşletme bulunamadı</p>
                    <p className="text-xs text-gray-500 mt-1">Onboarding adımını tamamlayın.</p>
                    <button
                        type="button"
                        onClick={() => router.replace("/onboarding")}
                        className="mt-4 inline-flex items-center gap-2 bg-[#111110] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition"
                    >
                        Onboarding’e git
                        <Sparkles className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8f8f6] pb-20">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-4">
                {/* Header */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-300" />
                    <div className="p-5 sm:p-7 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-[#111110] tracking-tight">
                                Ayarlar
                            </h1>
                            <p className="text-xs text-gray-400 mt-1.5">
                                Hesap, işletme ve güvenlik tercihlerinizi yönetin.
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <p className="text-xs font-semibold text-gray-700">Güvenli giriş aktif</p>
                        </div>
                    </div>
                </div>

                {/* Account card */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-amber-600" />
                            <h2 className="text-sm font-bold text-[#111110]">Hesap</h2>
                        </div>
                        <span className="text-[11px] font-semibold text-gray-400">Firebase Auth</span>
                    </div>

                    <div className="p-5 space-y-3">
                        {!user?.emailVerified && (
                            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                    <MailPlus className="w-4 h-4 text-amber-700" />
                                    <p className="text-xs font-bold text-amber-900">E-posta doğrulanmadı</p>
                                </div>
                                <p className="text-[11px] text-amber-800/70">
                                    Bazı yönetim işlemleri doğrulama tamamlanana kadar kısıtlıdır.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleResendVerification}
                                    disabled={verifyLoading}
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 text-[#111110] px-4 py-2.5 text-xs font-bold hover:bg-amber-500 transition disabled:opacity-60"
                                >
                                    {verifyLoading ? "Gönderiliyor..." : "Doğrulama mailini tekrar gönder"}
                                </button>
                                {verifyStatus && <p className="text-[11px] text-emerald-700">{verifyStatus}</p>}
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-gray-500">E-posta</span>
                            <span className="text-xs font-semibold text-gray-900 truncate">{displayEmail}</span>
                        </div>

                        <form onSubmit={handleUpdateEmail} className="mt-2 space-y-2">
                            <div className="flex flex-col gap-2">
                                <input
                                    type="email"
                                    value={emailDraft}
                                    onChange={(e) => setEmailDraft(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200"
                                    placeholder="Yeni e-posta"
                                />
                                <input
                                    type="password"
                                    value={emailPassword}
                                    onChange={(e) => setEmailPassword(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200"
                                    placeholder="Mevcut şifreniz"
                                />
                            </div>

                            {emailError && <p className="text-xs text-rose-600">{emailError}</p>}
                            {emailSuccess && <p className="text-xs text-emerald-600">{emailSuccess}</p>}

                            <button
                                type="submit"
                                disabled={emailLoading}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#111110] text-white px-3 py-2 text-xs font-bold hover:bg-gray-800 transition disabled:opacity-60"
                            >
                                {emailLoading ? "Güncelleniyor..." : "E-postayı güncelle"}
                            </button>
                        </form>

                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-gray-500">Kullanıcı UID</span>
                            <span className="text-xs font-mono text-gray-700 truncate">{userIdShort}</span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-gray-500">Kopyala</span>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard?.writeText(user?.uid ?? "");
                                }}
                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                            >
                                <Copy className="w-3.5 h-3.5 text-gray-400" />
                                UID
                            </button>
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={handleResetPassword}
                                disabled={resetLoading}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 text-[#111110] px-4 py-2.5 text-xs font-bold hover:bg-amber-500 transition disabled:opacity-60"
                            >
                                <KeyRound className="w-3.5 h-3.5" />
                                {resetLoading ? "Gönderiliyor..." : "Şifre sıfırlama e-postası"}
                            </button>
                            {resetStatus && (
                                <p className={`mt-2 text-xs ${resetStatus.includes("gönderildi") ? "text-emerald-600" : "text-rose-600"}`}>
                                    {resetStatus}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* Business card */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-600" />
                            <h2 className="text-sm font-bold text-[#111110]">İşletme</h2>
                        </div>
                        <span className="text-[11px] font-semibold text-gray-400">{businessIdShort}</span>
                    </div>

                    <div className="p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-gray-500">İşletme adı</span>
                            {!editingName ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-900">{business.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNameDraft(business.name);
                                            setEditingName(true);
                                            setNameError(null);
                                            setNameSuccess(null);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 transition"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                        Düzenle
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1 max-w-[220px]">
                                    <input
                                        value={nameDraft}
                                        onChange={(e) => setNameDraft(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition"
                                        placeholder="İşletme adı"
                                    />
                                </div>
                            )}
                        </div>

                        {editingName && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingName(false);
                                        setNameDraft(business.name);
                                        setNameError(null);
                                        setNameSuccess(null);
                                    }}
                                    className="flex-1 inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                                    disabled={savingName}
                                >
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveName}
                                    disabled={!canSaveName || savingName}
                                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#111110] text-white px-3 py-2.5 text-xs font-bold hover:bg-gray-800 transition disabled:opacity-60"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    {savingName ? "Kaydediliyor..." : "Kaydet"}
                                </button>
                            </div>
                        )}

                        {nameError && <p className="text-xs text-rose-600">{nameError}</p>}
                        {nameSuccess && <p className="text-xs text-emerald-600">{nameSuccess}</p>}
                    </div>
                </section>

                {/* Staff & Roles */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-amber-600" />
                            <h2 className="text-sm font-bold text-[#111110]">Çalışanlar & Roller</h2>
                        </div>
                        <span className="text-[11px] font-semibold text-gray-400">
                            {role ? `Rol: ${role}` : "Rol: —"}
                        </span>
                    </div>

                    <div className="p-5 space-y-4">
                        {!canManageStaff ? (
                            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-xs text-gray-600">
                                Çalışan yönetimi için yetkiniz bulunmuyor.
                            </div>
                        ) : !user?.emailVerified ? (
                            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900">
                                E-posta doğrulaması tamamlanmadan çalışan yönetimi kısıtlıdır.
                            </div>
                        ) : (
                            <>
                                <form onSubmit={handleInviteStaff} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                                    <div className="flex items-center gap-3 flex-col sm:flex-row">
                                        <div className="flex-1 w-full">
                                            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                                Çalışan E-posta
                                            </label>
                                            <input
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition"
                                                placeholder="ornek@email.com"
                                            />
                                        </div>
                                        <div className="w-full sm:w-44">
                                            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                                Rol
                                            </label>
                                            <select
                                                value={inviteRole}
                                                onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition"
                                            >
                                                {roleOptionsForInvite.map((r) => (
                                                    <option key={r} value={r}>
                                                        {r === "manager" ? "Manager" : r === "technician" ? "Teknisyen" : "Viewer"}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {inviteError && <p className="text-xs text-rose-600">{inviteError}</p>}
                                    {inviteSuccess && <p className="text-xs text-emerald-600">{inviteSuccess}</p>}

                                    <button
                                        type="submit"
                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#111110] text-white px-4 py-2.5 text-xs font-bold hover:bg-gray-800 transition"
                                        disabled={!inviteEmail.trim() || !roleOptionsForInvite.length}
                                    >
                                        <MailPlus className="w-3.5 h-3.5" />
                                        Davet oluştur
                                    </button>
                                </form>

                                {/* Members */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-bold text-[#111110]">Aktif çalışanlar</p>
                                        {membersLoading ? (
                                            <p className="text-[11px] text-gray-400">Yükleniyor...</p>
                                        ) : (
                                            <p className="text-[11px] text-gray-400">{members.length} kişi</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {members.map((m) => (
                                            <div
                                                key={m.userId}
                                                className="rounded-2xl border border-gray-100 bg-white p-4 flex items-center justify-between gap-3"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-gray-900 truncate">
                                                        {m.email ?? m.userId}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">Kullanıcı: {m.userId.slice(0, 10)}…</p>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={m.role}
                                                        onChange={(e) => handleUpdateMemberRole(m, e.target.value as MemberRole)}
                                                        disabled={m.role === "owner"}
                                                        className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition disabled:opacity-50"
                                                    >
                                                        {(role === "owner"
                                                            ? (["owner", "manager", "technician", "viewer"] as MemberRole[])
                                                            : (["technician", "viewer"] as MemberRole[])
                                                        ).map((r) => (
                                                            <option key={r} value={r}>
                                                                {r === "owner" ? "Owner" : r === "manager" ? "Manager" : r === "technician" ? "Teknisyen" : "Viewer"}
                                                            </option>
                                                        ))}
                                                    </select>

                                                    {m.role !== "owner" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveMember(m)}
                                                            className="h-9 w-9 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition disabled:opacity-50 inline-flex items-center justify-center"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {members.length === 0 && (
                                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
                                                Aktif çalışan yok.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Invites */}
                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-bold text-[#111110]">Bekleyen davetler</p>
                                        {invitesLoading ? (
                                            <p className="text-[11px] text-gray-400">Yükleniyor...</p>
                                        ) : (
                                            <p className="text-[11px] text-gray-400">{invites.length} davet</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {invites.map((i) => (
                                            <div
                                                key={i.id}
                                                className="rounded-2xl border border-gray-100 bg-white p-4 flex items-center justify-between gap-3"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-gray-900 truncate">
                                                        {i.email}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                                        Rol:{" "}
                                                        {i.role === "manager" ? "Manager" : i.role === "technician" ? "Teknisyen" : "Viewer"}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCancelInvite(i.id)}
                                                    className="h-9 w-9 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition inline-flex items-center justify-center"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {invites.length === 0 && (
                                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
                                                Bekleyen davet yok.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </section>

                {/* Logout */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5">
                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-2.5 text-xs font-bold hover:bg-rose-100 transition"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            Çıkış yap
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}


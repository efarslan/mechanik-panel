"use client";

import { useEffect, useMemo, useState } from "react";
import {
    addDoc,
    collection,
    doc,
    onSnapshot,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";
import {
    sendEmailVerification,
    sendPasswordResetEmail,
    signOut,
} from "firebase/auth";
import { useAuth } from "@/lib/useAuth";
import { db, auth } from "@/lib/firebase";
import { useBusiness } from "@/context/BusinessContext";
import { useMembershipRole, type MemberRole } from "@/lib/useMembershipRole";
import { useRouter } from "next/navigation";
import {
    Copy,
    Check,
    Globe,
    KeyRound,
    LogOut,
    Pencil,
    Save,
    Sparkles,
    Users,
    MailPlus,
    Trash2,
    X,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    Crown,
    UserCheck,
    Wrench,
    Eye,
    RefreshCw,
    ShieldAlert,
    UserX,
    Clock,
    UserPlus,
} from "lucide-react";

// ─── Role helpers ────────────────────────────────────────────────────────────
const ROLE_META: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
    owner: { label: "Owner", color: "text-amber-700 bg-amber-50 border-amber-200", Icon: Crown },
    manager: { label: "Manager", color: "text-violet-700 bg-violet-50 border-violet-200", Icon: UserCheck },
    technician: { label: "Teknisyen", color: "text-sky-700 bg-sky-50 border-sky-200", Icon: Wrench },
    viewer: { label: "Viewer", color: "text-gray-600 bg-gray-50 border-gray-200", Icon: Eye },
};

function RoleBadge({ role }: { role: string }) {
    const meta = ROLE_META[role] ?? ROLE_META.viewer;
    const { label, color, Icon } = meta;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${color}`}>
            <Icon className="w-3 h-3" />
            {label}
        </span>
    );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastVariant = "success" | "error" | "info";
function Toast({ message, variant, onDismiss }: { message: string; variant: ToastVariant; onDismiss: () => void }) {
    const styles: Record<ToastVariant, string> = {
        success: "bg-emerald-50 border-emerald-200 text-emerald-800",
        error: "bg-rose-50 border-rose-200 text-rose-800",
        info: "bg-blue-50 border-blue-200 text-blue-800",
    };
    const Icons: Record<ToastVariant, React.ElementType> = {
        success: CheckCircle2,
        error: AlertCircle,
        info: AlertCircle,
    };
    const Icon = Icons[variant];
    return (
        <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs font-medium ${styles[variant]}`}>
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1">{message}</span>
            <button type="button" onClick={onDismiss} className="opacity-50 hover:opacity-100 transition">
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({
    title,
    description,
    confirmLabel,
    onConfirm,
    onCancel,
    loading,
}: {
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
                onClick={onCancel}
            />
            {/* Dialog */}
            <div className="relative bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-sm p-6 space-y-4">
                <div className="flex items-start gap-3">
                    <span className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                    </span>
                    <div>
                        <p className="text-sm font-bold text-[#111110]">{title}</p>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-60"
                    >
                        Vazgeç
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 rounded-xl bg-rose-600 text-white px-4 py-2.5 text-xs font-bold hover:bg-rose-700 transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        {loading ? "Yenileniyor…" : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}


function Section({
    icon: Icon,
    title,
    badge,
    children,
}: {
    icon: React.ElementType;
    title: string;
    badge?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-amber-600" />
                    </span>
                    <h2 className="text-sm font-bold text-[#111110]">{title}</h2>
                </div>
                {badge && <span className="text-[11px] font-semibold text-gray-400">{badge}</span>}
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}

// ─── Field row ────────────────────────────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-400 font-medium shrink-0">{label}</span>
            <div className="text-xs font-semibold text-gray-800 text-right min-w-0">{children}</div>
        </div>
    );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type MemberRow = {
    userId: string;
    email: string | null;
    role: MemberRole | "owner";
    status: string;
};
type MemberDocData = { email?: string | null; role?: MemberRole | string; status?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const INVITE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateInviteCode(): string {
    let raw = "";
    for (let i = 0; i < 8; i += 1) {
        raw += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
    }
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const user = useAuth();
    const { business, loading: businessLoading, refreshBusiness } = useBusiness();
    const router = useRouter();
    const { role, loading: roleLoading } = useMembershipRole();

    // Business name editing
    const [nameDraft, setNameDraft] = useState("");
    const [editingName, setEditingName] = useState(false);
    const [savingName, setSavingName] = useState(false);
    const [nameMsg, setNameMsg] = useState<{ text: string; ok: boolean } | null>(null);

    // Copy states
    const [copied, setCopied] = useState(false);
    const [uidCopied, setUidCopied] = useState(false);

    // Auth actions
    const [resetLoading, setResetLoading] = useState(false);
    const [resetMsg, setResetMsg] = useState<{ text: string; ok: boolean } | null>(null);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyMsg, setVerifyMsg] = useState<{ text: string; ok: boolean } | null>(null);

    // Staff management
    const [membersLoading, setMembersLoading] = useState(false);
    const [members, setMembers] = useState<MemberRow[]>([]);
    const [pendingMembers, setPendingMembers] = useState<MemberRow[]>([]);
    const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});
    const [savingRoles, setSavingRoles] = useState(false);

    // Invite code refresh
    const [showRefreshModal, setShowRefreshModal] = useState(false);
    const [refreshingCode, setRefreshingCode] = useState(false);
    const [refreshCodeMsg, setRefreshCodeMsg] = useState<{ text: string; ok: boolean } | null>(null);
    const [inviteCodeValue, setInviteCodeValue] = useState("");
    const [newBusinessName, setNewBusinessName] = useState("");
    const [creatingBusiness, setCreatingBusiness] = useState(false);

    const canManageStaff = role === "owner" || role === "manager";

    useEffect(() => {
        if (business) setNameDraft(business.name ?? "");
    }, [business]);
    useEffect(() => {
        setInviteCodeValue(business?.inviteCode ?? "");
    }, [business?.inviteCode]);

    const canSaveName = useMemo(() => {
        const v = nameDraft.trim();
        return !!business && !!v && v !== business.name;
    }, [business, nameDraft]);

    // ── Handlers ────────────────────────────────────────────────────────────
    const handleSaveName = async () => {
        if (!business || role !== "owner") return;
        const next = nameDraft.trim();
        if (!next) { setNameMsg({ text: "İşletme adı boş olamaz.", ok: false }); return; }
        try {
            setSavingName(true);
            setNameMsg(null);
            await updateDoc(doc(db, "businesses", business.id), { name: next });
            setNameMsg({ text: "İşletme adı güncellendi.", ok: true });
            setEditingName(false);
        } catch { setNameMsg({ text: "Güncellenirken hata oluştu.", ok: false }); }
        finally { setSavingName(false); }
    };

    const handleResetPassword = async () => {
        if (!user?.email) return;
        try {
            setResetLoading(true); setResetMsg(null);
            await sendPasswordResetEmail(auth, user.email);
            setResetMsg({ text: "Şifre sıfırlama e-postası gönderildi.", ok: true });
        } catch { setResetMsg({ text: "E-posta gönderilemedi.", ok: false }); }
        finally { setResetLoading(false); }
    };

    const handleResendVerification = async () => {
        if (!auth.currentUser) return;
        try {
            setVerifyLoading(true); setVerifyMsg(null);
            await sendEmailVerification(auth.currentUser);
            setVerifyMsg({ text: "Doğrulama e-postası gönderildi.", ok: true });
            await auth.currentUser.reload();
        } catch { setVerifyMsg({ text: "E-posta gönderilemedi.", ok: false }); }
        finally { setVerifyLoading(false); }
    };

    const handleSignOut = async () => {
        try { await signOut(auth); router.replace("/login"); }
        catch { alert("Çıkış yapılamadı."); }
    };

    const handleCreateBusiness = async () => {
        const name = newBusinessName.trim();
        if (!user || !name) return;
        try {
            setCreatingBusiness(true);
            const inviteCode = generateInviteCode();
            const businessRef = await addDoc(collection(db, "businesses"), {
                name,
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
            refreshBusiness();
            setNewBusinessName("");
            router.replace("/dashboard");
            router.refresh();
        } catch {
            alert("İşletme oluşturulurken hata oluştu.");
        } finally {
            setCreatingBusiness(false);
        }
    };

    useEffect(() => {
        if (!business || !canManageStaff || !user?.emailVerified) return;
        setMembersLoading(true);
        const unsub = onSnapshot(
            collection(db, "businesses", business.id, "members"),
            (snap) => {
                const all = snap.docs.map((d) => {
                    const data = d.data() as MemberDocData;
                    return {
                        userId: d.id,
                        email: data.email ?? null,
                        role: (data.role ?? "technician") as MemberRole,
                        status: data.status ?? "active",
                    };
                });
                setMembers(all.filter((m) => m.status === "active"));
                setPendingMembers(all.filter((m) => m.status === "pending"));
                setMembersLoading(false);
            },
            (err) => {
                console.error(err);
                setMembersLoading(false);
            },
        );
        return () => unsub();
    }, [business, canManageStaff, user]);

    const handleRefreshInviteCode = async () => {
        if (!business || role !== "owner") return;
        try {
            setRefreshingCode(true);
            setRefreshCodeMsg(null);
            const newCode = generateInviteCode();
            await updateDoc(doc(db, "businesses", business.id), { inviteCode: newCode });
            setInviteCodeValue(newCode);
            setRefreshCodeMsg({ text: "Davet kodu yenilendi.", ok: true });
            setShowRefreshModal(false);
        } catch {
            setRefreshCodeMsg({ text: "Kod yenilenirken hata oluştu.", ok: false });
            setShowRefreshModal(false);
        } finally {
            setRefreshingCode(false);
        }
    };

    const handleRemoveMember = async (m: MemberRow) => {
        if (!business || !canManageStaff || m.role === "owner") return;
        try {
            await updateDoc(doc(db, "businesses", business.id, "members", m.userId), {
                status: "inactive",
                updatedAt: serverTimestamp(),
                deactivatedAt: serverTimestamp(),
                deactivatedBy: user?.uid ?? null,
            });
        } catch { alert("Çalışan kaldırılırken hata oluştu."); }
    };

    const handleApproveMember = async (m: MemberRow) => {
        if (!business || !canManageStaff) return;
        try {
            await updateDoc(doc(db, "businesses", business.id, "members", m.userId), {
                status: "active",
                updatedAt: serverTimestamp(),
                approvedAt: serverTimestamp(),
                approvedBy: user?.uid ?? null,
            });
        } catch { alert("Onaylanırken hata oluştu."); }
    };

    const handleRejectMember = async (m: MemberRow) => {
        if (!business || !canManageStaff) return;
        try {
            await updateDoc(doc(db, "businesses", business.id, "members", m.userId), {
                status: "inactive",
                updatedAt: serverTimestamp(),
                rejectedAt: serverTimestamp(),
                rejectedBy: user?.uid ?? null,
            });
        } catch { alert("Reddedilirken hata oluştu."); }
    };

    const handleSaveRoles = async () => {
        if (!business) return;
        try {
            setSavingRoles(true);
            await Promise.all(
                Object.entries(pendingRoles).map(([uid, r]) =>
                    updateDoc(doc(db, "businesses", business.id, "members", uid), {
                        role: r,
                        updatedAt: serverTimestamp(),
                        updatedBy: user?.uid ?? null,
                    }),
                ),
            );
            setPendingRoles({});
        } catch (e) { console.error(e); }
        finally { setSavingRoles(false); }
    };

    // ── Loading / guards ─────────────────────────────────────────────────────
    if (user === undefined || businessLoading || roleLoading) {
        return (
            <div className="min-h-screen bg-[#f5f4f0] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-[3px] border-gray-200 border-t-amber-400 animate-spin" />
                    <p className="text-xs text-gray-400 font-semibold tracking-wide">Yükleniyor…</p>
                </div>
            </div>
        );
    }

    if (!business) {
        return (
            <div className="min-h-screen bg-[#f5f4f0] flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center max-w-sm w-full">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-amber-600" />
                    </div>
                    <p className="text-sm font-bold text-gray-900">İşletme oluştur</p>
                    <p className="text-xs text-gray-500 mt-1.5">
                        Devam etmek için hesabınıza bağlı bir işletme oluşturun.
                    </p>
                    <div className="mt-5 space-y-3 text-left">
                        <label className="block text-xs font-semibold text-gray-600">İşletme adı</label>
                        <input
                            type="text"
                            value={newBusinessName}
                            onChange={(e) => setNewBusinessName(e.target.value)}
                            placeholder="Örn: Oto Servis"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                        />
                        <button
                            type="button"
                            disabled={creatingBusiness || !newBusinessName.trim()}
                            onClick={handleCreateBusiness}
                            className="w-full inline-flex items-center justify-center gap-2 bg-[#111110] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-800 transition disabled:opacity-60"
                        >
                            {creatingBusiness ? "Oluşturuluyor..." : "İşletmeyi Oluştur"}
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="w-full inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-50 transition"
                        >
                            Çıkış Yap
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const hasPendingRoles = Object.keys(pendingRoles).length > 0;

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#f5f4f0] pb-24">
            {/* ── Confirm modal ── */}
            {showRefreshModal && (
                <ConfirmModal
                    title="Davet kodunu yenile"
                    description="Mevcut kod geçersiz hale gelir. Bu kodu paylaştıysanız yeni kodu tekrar göndermeniz gerekir. Devam etmek istediğinize emin misiniz?"
                    confirmLabel="Yenile"
                    onConfirm={handleRefreshInviteCode}
                    onCancel={() => setShowRefreshModal(false)}
                    loading={refreshingCode}
                />
            )}
            <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 space-y-4">

                {/* ── Page header ── */}
                <div className="mb-2">
                    <h1 className="text-2xl font-extrabold text-[#111110] tracking-tight">Ayarlar</h1>
                    <p className="text-xs text-gray-400 mt-1">Hesap, işletme ve ekip tercihlerinizi yönetin.</p>
                </div>

                {/* ── Email not verified banner ── */}
                {!user?.emailVerified && (
                    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                            <MailPlus className="w-4 h-4 text-amber-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-amber-900">E-posta doğrulanmadı</p>
                            <p className="text-[11px] text-amber-800/70 mt-0.5">
                                Bazı yönetim işlemleri e-posta doğrulanana kadar kısıtlıdır.
                            </p>
                            {verifyMsg && (
                                <p className={`text-[11px] mt-1.5 font-semibold ${verifyMsg.ok ? "text-emerald-700" : "text-rose-700"}`}>
                                    {verifyMsg.text}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={verifyLoading}
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-400 text-[#111110] px-3 py-2 text-[11px] font-bold hover:bg-amber-500 transition disabled:opacity-60"
                        >
                            {verifyLoading ? "…" : <><MailPlus className="w-3 h-3" /> Gönder</>}
                        </button>
                    </div>
                )}

                {/* ── Account section ── */}
                <Section icon={Globe} title="Hesap" badge="Firebase Auth">
                    <div className="space-y-0.5">
                        <FieldRow label="E-posta">
                            <span className="flex items-center gap-2">
                                {user?.email ?? "—"}
                                {user?.emailVerified && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                                        <CheckCircle2 className="w-2.5 h-2.5" /> Doğrulandı
                                    </span>
                                )}
                            </span>
                        </FieldRow>
                        <FieldRow label="Kullanıcı ID">
                            <button
                                type="button"
                                onClick={() => { navigator.clipboard?.writeText(user?.uid ?? ""); setUidCopied(true); setTimeout(() => setUidCopied(false), 1500); }}
                                className="flex items-center gap-1.5 font-mono text-gray-600 hover:text-amber-600 transition group">
                                <span className="font-mono text-gray-600"> {user?.uid ?? "—"} </span>
                                {uidCopied ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Copy className="w-3 h-3 text-gray-300 group-hover:text-amber-400 shrink-0 transition" />}
                            </button>
                        </FieldRow>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={handleResetPassword}
                            disabled={resetLoading}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#111110] text-white px-4 py-2.5 text-xs font-bold hover:bg-gray-800 transition disabled:opacity-60"
                        >
                            <KeyRound className="w-3.5 h-3.5" />
                            {resetLoading ? "Gönderiliyor…" : "Şifre Sıfırlama E-postası Gönder"}
                        </button>
                        {resetMsg && (
                            <Toast
                                message={resetMsg.text}
                                variant={resetMsg.ok ? "success" : "error"}
                                onDismiss={() => setResetMsg(null)}
                            />
                        )}
                    </div>
                </Section>

                {/* ── Business section ── */}
                <Section icon={Sparkles} title="İşletme" badge={`ID: ${business.id}`}>
                    <div className="space-y-0.5">
                        <FieldRow label="İşletme Adı">
                            {!editingName ? (
                                <div className="flex items-center gap-2">
                                    <span>{business.name}</span>
                                    {role === "owner" && (
                                        <button
                                            type="button"
                                            onClick={() => { setNameDraft(business.name); setEditingName(true); setNameMsg(null); }}
                                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-500 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50 transition"
                                        >
                                            <Pencil className="w-3 h-3" /> Düzenle
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 w-full justify-end">
                                    <input
                                        value={nameDraft}
                                        onChange={(e) => setNameDraft(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setEditingName(false); setNameDraft(business.name); } }}
                                        autoFocus
                                        className="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition w-44"
                                        placeholder="İşletme adı"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => { setEditingName(false); setNameDraft(business.name); setNameMsg(null); }}
                                        className="h-9 w-9 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition inline-flex items-center justify-center"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveName}
                                        disabled={!canSaveName || savingName}
                                        className="h-9 px-3 rounded-xl bg-[#111110] text-white text-xs font-bold hover:bg-gray-800 transition disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        {savingName ? "…" : "Kaydet"}
                                    </button>
                                </div>
                            )}
                        </FieldRow>
                    </div>

                    {nameMsg && (
                        <div className="mt-3">
                            <Toast message={nameMsg.text} variant={nameMsg.ok ? "success" : "error"} onDismiss={() => setNameMsg(null)} />
                        </div>
                    )}
                </Section>

                {/* ── Staff & Roles section ── */}
                <Section icon={Users} title="Çalışanlar & Roller" badge={role ? <RoleBadge role={role} /> : undefined}>
                    {!canManageStaff ? (
                        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-xs text-gray-500 text-center">
                            Çalışan yönetimi için yetkiniz bulunmuyor.
                        </div>
                    ) : !user?.emailVerified ? (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800 text-center">
                            E-posta doğrulaması tamamlanmadan çalışan yönetimi kısıtlıdır.
                        </div>
                    ) : (
                        <div className="space-y-5">

                            {/* Invite code */}
                            <div className="rounded-xl bg-[#fafaf8] border border-gray-100 p-3.5 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Davet Kodu</p>
                                        <p className="text-sm font-bold text-gray-900 mt-0.5 font-mono tracking-wide">{inviteCodeValue || "—"}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { navigator.clipboard?.writeText(inviteCodeValue ?? ""); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                                        aria-label="Kopyala"
                                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition ${copied ? "border-emerald-400 bg-emerald-50 text-emerald-600" : "border-gray-200 bg-white text-gray-400 hover:border-amber-300 hover:text-amber-600"}`}
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>

                                {role === "owner" && (
                                    <button
                                        type="button"
                                        onClick={() => setShowRefreshModal(true)}
                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white text-gray-500 px-4 py-2 text-[11px] font-semibold hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 transition"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        Kodu Yenile
                                    </button>
                                )}

                                {refreshCodeMsg && (
                                    <Toast
                                        message={refreshCodeMsg.text}
                                        variant={refreshCodeMsg.ok ? "success" : "error"}
                                        onDismiss={() => setRefreshCodeMsg(null)}
                                    />
                                )}
                            </div>

                            {/* Pending member requests */}
                            {(pendingMembers.length > 0) && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-[#111110]">Bekleyen Başvurular</p>
                                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 text-[10px] font-bold text-[#111110]">
                                                {pendingMembers.length}
                                            </span>
                                        </div>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                            <Clock className="w-2.5 h-2.5" /> Onay bekliyor
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {pendingMembers.map((m) => (
                                            <div key={m.userId} className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 flex items-center justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-gray-900 truncate">
                                                        {m.email ?? m.userId}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate">{m.userId}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRejectMember(m)}
                                                        className="w-8 h-8 rounded-xl border border-rose-100 bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition inline-flex items-center justify-center"
                                                        aria-label="Reddet"
                                                    >
                                                        <UserX className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleApproveMember(m)}
                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-3 py-1.5 text-[11px] font-bold hover:bg-emerald-700 transition"
                                                        aria-label="Onayla"
                                                    >
                                                        <UserPlus className="w-3.5 h-3.5" />
                                                        Onayla
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Active members */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-[#111110]">Aktif Çalışanlar</p>
                                    {membersLoading
                                        ? <span className="text-[11px] text-gray-400">Yükleniyor…</span>
                                        : <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{members.length}</span>
                                    }
                                </div>

                                {members.length === 0 && !membersLoading ? (
                                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center text-xs text-gray-400">
                                        Henüz aktif çalışan yok.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {members.map((m) => {
                                            const currentRole = pendingRoles[m.userId] ?? m.role;
                                            const isDirty = !!(pendingRoles[m.userId] && pendingRoles[m.userId] !== m.role);
                                            return (
                                                <div
                                                    key={m.userId}
                                                    className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 transition ${isDirty ? "border-amber-200 bg-amber-50/40" : "border-gray-100 bg-white"}`}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-semibold text-gray-900 truncate">
                                                            {m.email ?? m.userId}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate">{m.userId}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {m.role === "owner" ? (
                                                            <RoleBadge role="owner" />
                                                        ) : (
                                                            <select
                                                                value={currentRole}
                                                                onChange={(e) => setPendingRoles((p) => ({ ...p, [m.userId]: e.target.value }))}
                                                                className="h-8 rounded-xl border border-gray-200 bg-white px-2.5 text-[11px] font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-200 transition"
                                                            >
                                                                {(role === "owner"
                                                                    ? (["manager", "technician", "viewer"] as MemberRole[])
                                                                    : (["technician", "viewer"] as MemberRole[])
                                                                ).map((r) => (
                                                                    <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                        {m.role !== "owner" && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveMember(m)}
                                                                className="w-8 h-8 rounded-xl border border-rose-100 bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition inline-flex items-center justify-center"
                                                                aria-label="Çalışanı kaldır"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {hasPendingRoles && (
                                    <div className="flex items-center justify-between gap-3 pt-1">
                                        <p className="text-[11px] text-amber-700 font-semibold">
                                            {Object.keys(pendingRoles).length} kaydedilmemiş değişiklik
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPendingRoles({})}
                                                className="text-[11px] font-semibold text-gray-500 hover:text-gray-700 transition"
                                            >
                                                Geri al
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveRoles}
                                                disabled={savingRoles}
                                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#111110] text-white px-3.5 py-2 text-[11px] font-bold hover:bg-gray-800 transition disabled:opacity-60"
                                            >
                                                <Save className="w-3 h-3" />
                                                {savingRoles ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    )}
                </Section>

                {/* ── Sign out ── */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5">
                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 px-4 py-2.5 text-xs font-bold hover:bg-rose-100 transition"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            Çıkış Yap
                        </button>
                    </div>
                </section>

            </div>
        </div>
    );
}
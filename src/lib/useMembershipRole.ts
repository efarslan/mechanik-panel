"use client";
import { useEffect, useState } from "react";
import {
    collectionGroup,
    doc,
    getDoc,
    limit,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import { useBusiness } from "@/context/BusinessContext";

export type MemberRole = "owner" | "manager" | "technician" | "viewer";

type MemberState = {
    role: MemberRole | null;
    status: "active" | "pending" | "inactive" | "unknown" | null;
    loading: boolean;
};

type MemberDocData = {
    status?: MemberState["status"];
    role?: MemberRole;
};

export function useMembershipRole(): MemberState {
    const user = useAuth();
    const { business, loading: businessLoading } = useBusiness();
    const [role, setRole]     = useState<MemberRole | null>(null);
    const [status, setStatus] = useState<MemberState["status"]>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsub: (() => void) | null = null;

        const run = async () => {
            if (user === undefined || businessLoading) return;

            if (!user || !business) {
                if (!user) {
                    setRole(null);
                    setStatus(null);
                    setLoading(false);
                    return;
                }

                setLoading(true);
                // business bagli degilken de pending/inactive durumu canli takip et
                const q = query(
                    collectionGroup(db, "members"),
                    where("userId", "==", user.uid),
                    limit(5),
                );
                unsub = onSnapshot(
                    q,
                    (snap) => {
                        if (snap.empty) {
                            setRole(null);
                            setStatus(null);
                            setLoading(false);
                            return;
                        }
                        const rows = snap.docs.map((d) => d.data() as MemberDocData);

                        const hasActive = rows.find((r) => (r.status ?? "active") === "active");
                        const hasPending = rows.find((r) => r.status === "pending");
                        const hasInactive = rows.find((r) => r.status === "inactive");

                        if (hasActive) {
                            setRole((hasActive.role ?? null) as MemberRole | null);
                            setStatus("active");
                        } else if (hasPending) {
                            setRole(null);
                            setStatus("pending");
                        } else if (hasInactive) {
                            setRole(null);
                            setStatus("inactive");
                        } else {
                            setRole(null);
                            setStatus("unknown");
                        }
                        setLoading(false);
                    },
                    () => {
                        setRole(null);
                        setStatus(null);
                        setLoading(false);
                    },
                );
                return;
            }

            // Owner fallback — member doc yoksa oluştur
            if (user.uid === business.ownerId) {
                try {
                    const ownerSnap = await getDoc(
                        doc(db, "businesses", business.id, "members", user.uid),
                    );
                    if (!ownerSnap.exists()) {
                        await setDoc(
                            doc(db, "businesses", business.id, "members", user.uid),
                            {
                                userId: user.uid,
                                role: "owner",
                                status: "active",
                                email: user.email ?? null,
                                createdAt: serverTimestamp(),
                            },
                            { merge: true },
                        );
                    }
                } catch {
                    // Sessizce devam
                }
                setRole("owner");
                setStatus("active");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                unsub = onSnapshot(
                    doc(db, "businesses", business.id, "members", user.uid),
                    (snap) => {
                        if (!snap.exists()) {
                            setRole(null);
                            setStatus(null);
                            setLoading(false);
                            return;
                        }

                        const data = snap.data() as MemberDocData;
                        const memberStatus: MemberState["status"] = data.status ?? "active";

                        if (memberStatus === "pending") {
                            setRole(null);
                            setStatus("pending");
                            setLoading(false);
                            return;
                        }

                        if (memberStatus === "inactive") {
                            setRole(null);
                            setStatus("inactive");
                            setLoading(false);
                            return;
                        }

                        if (memberStatus !== "active") {
                            setRole(null);
                            setStatus("unknown");
                            setLoading(false);
                            return;
                        }

                        setStatus("active");
                        setRole((data.role ?? null) as MemberRole | null);
                        setLoading(false);
                    },
                    () => {
                        setRole(null);
                        setStatus(null);
                        setLoading(false);
                    },
                );
            } catch {
                setRole(null);
                setStatus(null);
                setLoading(false);
            }
        };

        run();
        return () => {
            if (unsub) unsub();
        };
    }, [user, business, businessLoading]);

    return { role, status, loading };
}
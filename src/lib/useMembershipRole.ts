"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import { useBusiness } from "@/context/BusinessContext";

export type MemberRole = "owner" | "manager" | "technician" | "viewer";

type MemberState = {
  role: MemberRole | null;
  loading: boolean;
};

type MemberDocData = {
  status?: string;
  role?: string;
};

export function useMembershipRole(): MemberState {
  const user = useAuth();
  const { business, loading: businessLoading } = useBusiness();
  const [role, setRole] = useState<MemberRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (user === undefined || businessLoading) return;

      if (!user || !business) {
        setRole(null);
        setLoading(false);
        return;
      }

      // Owner fallback (member doc yoksa bile sahipliği business.ownerId'den anlayabiliyoruz)
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
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const snap = await getDoc(doc(db, "businesses", business.id, "members", user.uid));
        if (!snap.exists()) {
          setRole(null);
          return;
        }
        const data = snap.data() as MemberDocData;
        const status = (data.status ?? "active").toString();
        if (status !== "active") {
          setRole(null);
          return;
        }
        const r = (data.role ?? null) as MemberRole | null;
        setRole(r);
      } catch {
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [user, business, businessLoading]);

  return { role, loading };
}


"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  collectionGroup,
  deleteDoc,
  doc,
  setDoc,
  limit,
  serverTimestamp,
} from "firebase/firestore";

type Business = {
  id: string;
  name: string;
  ownerId: string;
};

type BusinessContextType = {
  business: Business | null;
  loading: boolean;
};

type InviteData = {
  email?: string;
  role?: string;
  status?: string;
};

const BusinessContext = createContext<BusinessContextType>({
  business: null,
  loading: true,
});

export function BusinessProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBusiness = async () => {
      // user henüz yüklenmediyse hiçbir şey yapma
      if (user === undefined) return;

      // user yoksa (login değilse)
      if (user === null) {
        setBusiness(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      // 1) Invite'i varsa otomatik accept et
      try {
        if (user.email) {
          const emailLower = user.email.toLowerCase();
          const invitesSnap = await getDocs(
            query(
              collectionGroup(db, "invites"),
              where("email", "==", emailLower),
              where("status", "==", "invited"),
              limit(5),
            ),
          );

          await Promise.all(
            invitesSnap.docs.map(async (invDoc) => {
              const inviteData = invDoc.data() as InviteData;
              const businessId = invDoc.ref.parent.parent?.id;
              if (!businessId) return;

              await Promise.all([
                // create member
                (async () => {
                  const role = inviteData.role ?? "viewer";
                  await setDoc(
                    doc(db, "businesses", businessId, "members", user.uid),
                    {
                      userId: user.uid,
                      role,
                      status: "active",
                      email: user.email ?? null,
                      createdAt: serverTimestamp(),
                    },
                    { merge: true },
                  );
                })(),
                // delete invite
                deleteDoc(invDoc.ref),
              ]);
            }),
          );
        }
      } catch {
        // invite kabul edilemese bile business aramaya devam ediyoruz
      }

      // 2) Owner ise hızlıca getir
      const ownedSnap = await getDocs(
        query(collection(db, "businesses"), where("ownerId", "==", user.uid), limit(3)),
      );

      if (!ownedSnap.empty) {
        const docSnap = ownedSnap.docs[0];
        setBusiness({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Business, "id">),
        });
        setLoading(false);
        return;
      }

      // 3) Member ise members tablosundan business'i bul
      const membersSnap = await getDocs(
        query(
          collectionGroup(db, "members"),
          where("userId", "==", user.uid),
          where("status", "==", "active"),
          limit(3),
        ),
      );

      if (!membersSnap.empty) {
        const businessId = membersSnap.docs[0].ref.parent.parent?.id;
        if (businessId) {
          const bSnap = await getDoc(doc(db, "businesses", businessId));
          if (bSnap.exists()) {
            setBusiness({
              id: bSnap.id,
              ...(bSnap.data() as Omit<Business, "id">),
            });
          } else {
            setBusiness(null);
          }
        } else {
          setBusiness(null);
        }
      } else {
        setBusiness(null);
      }

      setLoading(false);
    };

    fetchBusiness();
  }, [user]);

  return (
    <BusinessContext.Provider value={{ business, loading }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  return useContext(BusinessContext);
}
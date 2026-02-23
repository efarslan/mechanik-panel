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
      if (!user) {
        setBusiness(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const q = query(
        collection(db, "businesses"),
        where("ownerId", "==", user.uid)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setBusiness({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Business, "id">),
        });
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
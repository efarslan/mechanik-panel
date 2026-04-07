"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const didInitialReloadRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      // Bu bilgiyi sadece email doğrulanmamışken tazelemek için reload çağrısı yapıyoruz.
      // İlk mount sonrası gereksiz reload spam'i önlemek için basit bir flag var.
      if (!u) return;
      if (u.emailVerified) return;
      if (didInitialReloadRef.current) return;
      didInitialReloadRef.current = true;

      try {
        await u.reload();
        setUser(auth.currentUser);
      } catch {
        // sessizce devam
      }
    });

    return () => unsubscribe();
  }, []);

  return user;
}
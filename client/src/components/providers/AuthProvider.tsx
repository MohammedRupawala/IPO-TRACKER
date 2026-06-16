"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

/**
 * Hydrates the auth state from localStorage on initial mount.
 * This resolves the SSR/localStorage mismatch by marking hydration complete
 * after the client-side store rehydrates from the persisted storage.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    // Zustand persist rehydrates synchronously from localStorage on mount.
    // Mark as hydrated so layout guards can safely read auth state.
    setHydrated(true);
  }, [setHydrated]);

  return <>{children}</>;
}

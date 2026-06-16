import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type UserRole = "user" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isHydrated: boolean;

  // Actions
  setAuth: (user: AuthUser) => void;
  clearAuth: () => void;
  setHydrated: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isHydrated: false,

      setAuth: (user: AuthUser) =>
        set({ user, isAuthenticated: true }),

      clearAuth: () =>
        set({ user: null, isAuthenticated: false }),

      setHydrated: (val: boolean) =>
        set({ isHydrated: val }),
    }),
    {
      name: "ipo-auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

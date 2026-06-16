"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, LayoutDashboard, LogOut, Shield } from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/store/authStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import apiClient from "@/lib/axios";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated, clearAuth } = useAuthStore();

  // Auth guard — wait for hydration before checking
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isHydrated, isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      // Best-effort: tell server to clear cookies
      await apiClient.post("/api/users/signout").catch(() => null);
    } finally {
      clearAuth();
      toast.success("Signed out successfully");
      router.push("/login");
    }
  };

  // Show skeleton while rehydrating
  if (!isHydrated || !isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="space-y-3 text-center">
          <Skeleton className="mx-auto h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* ── Top Navigation ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          {/* Brand */}
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 transition-transform group-hover:scale-105">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-900">IPO Tracker</span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden items-center gap-1 sm:flex">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-slate-600 hover:text-slate-900"
                id="nav-dashboard-link"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            {user.role === "admin" && (
              <Link href="/admin">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-slate-600 hover:text-slate-900"
                  id="nav-admin-link"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <div className="leading-none">
                <p className="text-xs font-medium text-slate-900">{user.name}</p>
                <p className="text-[10px] text-slate-400">{user.email}</p>
              </div>
              {user.role === "admin" && (
                <Badge variant="default" className="h-5 text-[10px] px-1.5">
                  Admin
                </Badge>
              )}
            </div>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2 text-slate-500 hover:text-red-600"
              id="logout-btn"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Page Content ───────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 animate-fade-in">
        {children}
      </main>
    </div>
  );
}

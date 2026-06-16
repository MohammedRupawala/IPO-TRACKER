"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, LayoutDashboard, Shield, LogOut, ShieldX } from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/store/authStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import apiClient from "@/lib/axios";

function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 ring-8 ring-red-50/50">
          <ShieldX className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Access Restricted</h1>
        <p className="mb-6 text-slate-500">
          You don&apos;t have permission to access this area. This section is reserved for
          system administrators only.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
        <p className="mt-6 text-xs text-slate-400">
          Error 403 — Forbidden
        </p>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated, clearAuth } = useAuthStore();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isHydrated, isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      await apiClient.post("/api/users/signout").catch(() => null);
    } finally {
      clearAuth();
      toast.success("Signed out successfully");
      router.push("/login");
    }
  };

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

  // Role guard — show 403 without redirecting
  if (user.role !== "admin") {
    return <ForbiddenPage />;
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
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 transition-transform group-hover:scale-105">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-900">IPO Tracker</span>
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1">
              <Shield className="h-3.5 w-3.5 text-slate-600" />
              <span className="text-xs font-semibold text-slate-600">Admin Portal</span>
            </div>
          </div>

          <nav className="hidden items-center gap-1 sm:flex">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-slate-600 hover:text-slate-900"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/admin">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-slate-900"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <div className="leading-none">
                <p className="text-xs font-medium text-slate-900">{user.name}</p>
              </div>
              <Badge variant="default" className="h-5 text-[10px] px-1.5">
                Admin
              </Badge>
            </div>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2 text-slate-500 hover:text-red-600"
              id="admin-logout-btn"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 animate-fade-in">
        {children}
      </main>
    </div>
  );
}

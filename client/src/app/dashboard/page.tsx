"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Users, TrendingUp } from "lucide-react";
import type { Member } from "@/store/ipoStore";

import { useIPOStore } from "@/store/ipoStore";
import { useAuthStore } from "@/store/authStore";
import { MemberCard } from "@/components/dashboard/MemberCard";
import { AddMemberDialog } from "@/components/dashboard/AddMemberDialog";
import { AllotmentTable } from "@/components/dashboard/AllotmentTable";
import { Separator } from "@/components/ui/separator";
import apiClient from "@/lib/axios";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { allotments, isLoadingAllotments, fetchAllotments } = useIPOStore();
  const [members, setMembers] = useState<Member[]>([]);

  // Derive unique members from allotment data
  const uniqueMembers = useMemo<Member[]>(() => {
    const seen = new Set<string>();
    const result: Member[] = [];

    for (const row of allotments) {
      if (!seen.has(row.pan_num)) {
        seen.add(row.pan_num);
        result.push({
          id: row.allotment_id,
          name: row.member_friendly_name,
          pan_no: row.pan_num,
          dob: null,
        });
      }
    }
    return result;
  }, [allotments]);

  // Fetch member list separately for richer info
  const refreshAll = useCallback(() => {
    fetchAllotments();
    apiClient
      .get<{ success: boolean; data: Member[] }>("/api/users/list-members")
      .then((res) => setMembers(res.data.data))
      .catch(() => {
        setMembers([]);
      });
  }, [fetchAllotments]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Use dedicated members list if available, otherwise derive from allotments
  const displayMembers = members.length > 0 ? members : uniqueMembers;

  const allottedCount = allotments.filter((a) => a.status === "Allotted").length;
  const awaitedCount = allotments.filter((a) => a.status === "Awaited").length;

  return (
    <div className="space-y-8">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track your IPO allotment status across all family members.
        </p>
      </div>

      {/* ── Quick Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Total Records",
            value: allotments.length,
            color: "text-slate-900",
          },
          {
            label: "Allotted",
            value: allottedCount,
            color: "text-green-700",
          },
          {
            label: "Awaited",
            value: awaitedCount,
            color: "text-amber-700",
          },
          {
            label: "Members Tracked",
            value: displayMembers.length,
            color: "text-slate-900",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm"
          >
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <Separator />

      {/* ── Members Panel ────────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">
              Family Members
              {displayMembers.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({displayMembers.length})
                </span>
              )}
            </h2>
          </div>
          <AddMemberDialog onSuccess={refreshAll} />
        </div>

        {displayMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Users className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="mb-1 text-sm font-medium text-slate-900">No members yet</h3>
            <p className="mb-4 max-w-xs text-xs text-slate-500">
              Add family PANs to start tracking allotment status for each member.
            </p>
            <AddMemberDialog onSuccess={refreshAll} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayMembers.map((member) => (
              <MemberCard key={member.pan_no} member={member} onDeleteSuccess={refreshAll} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

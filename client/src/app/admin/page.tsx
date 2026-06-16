"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users,
  CreditCard,
  TrendingUp,
  Plus,
  Zap,
  Loader2,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { useIPOStore } from "@/store/ipoStore";
import type { AdminMember } from "@/store/ipoStore";
import { AllotmentTable } from "@/components/dashboard/AllotmentTable";
import { AdminMetricCard } from "@/components/dashboard/AdminMetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { extractErrorMessage } from "@/lib/axios";
import { maskPAN, formatDateOnly } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── IPO Form Schema ──────────────────────────────────────────────────────────
const ipoSchema = z.object({
  name: z.string().min(1, "IPO name is required").max(255, "Name too long"),
  value: z.string().min(1, "IPO value/code is required").max(255, "Value too long"),
});
type IPOFormData = z.infer<typeof ipoSchema>;

export default function AdminPage() {
  const {
    ipos,
    registrarIPOs,
    adminMembers,
    adminMembersTotal,
    isLoadingAdminMembers,
    isLoadingIPOs,
    isLoadingRegistrarIPOs,
    fetchIPOs,
    fetchRegistrarIPOs,
    fetchAdminMembers,
    selectedMemberAllotments,
    isLoadingMemberAllotments,
    fetchMemberAllotments,
    addIPO,
    triggerSync,
    deleteIPO,
  } = useIPOStore();

  const [membersPage, setMembersPage] = useState(1);
  const [selectedAdminMember, setSelectedAdminMember] = useState<AdminMember | null>(null);
  const [selectedIPOId, setSelectedIPOId] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddingIPO, setIsAddingIPO] = useState(false);
  const [deleteConfirmIPO, setDeleteConfirmIPO] = useState<{ id: string; name: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<IPOFormData>({ resolver: zodResolver(ipoSchema) });

  useEffect(() => {
    fetchIPOs();
    fetchRegistrarIPOs();
  }, [fetchIPOs, fetchRegistrarIPOs]);

  useEffect(() => {
    fetchAdminMembers(membersPage, 10);
  }, [fetchAdminMembers, membersPage]);

  useEffect(() => {
    if (selectedAdminMember) {
      fetchMemberAllotments(selectedAdminMember.pan_no);
    }
  }, [selectedAdminMember, fetchMemberAllotments]);

  // ── Compute Metrics ──────────────────────────────────────────────────────
  const uniqueOwners = new Set(adminMembers.map((m) => m.owner_name)).size;
  const uniquePANs = new Set(adminMembers.map((m) => m.pan_no)).size;

  // ── Handle IPO Submit ────────────────────────────────────────────────────
  const handleAddIPO = async (data: IPOFormData) => {
    setIsAddingIPO(true);
    try {
      const newIPO = await addIPO({ name: data.name, value: data.value });
      toast.success("IPO added successfully", {
        description: `"${newIPO.name}" has been added to the registry.`,
      });
      reset();
      fetchIPOs();
    } catch (error) {
      toast.error("Failed to add IPO", {
        description: extractErrorMessage(error),
      });
    } finally {
      setIsAddingIPO(false);
    }
  };

  // ── Handle IPO Delete ────────────────────────────────────────────────────
  const handleDeleteIPO = async (ipoId: string, ipoName: string) => {
    try {
      await deleteIPO(ipoId);
      toast.success("IPO deleted successfully");
      fetchIPOs();
      fetchAdminMembers(membersPage, 10);
      if (selectedIPOId === ipoId) {
        setSelectedIPOId("");
      }
    } catch (error) {
      // Error is already handled by store toast / interceptor
    }
  };

  // ── Handle Sync Trigger ──────────────────────────────────────────────────
  const handleTriggerSync = async () => {
    if (!selectedIPOId) {
      toast.error("Please select an IPO first");
      return;
    }
    setIsSyncing(true);
    try {
      await triggerSync(selectedIPOId);
      toast.success("Allotment sync initiated", {
        description:
          "Allotment processing initialized. Workers are asynchronously executing checks.",
      });
    } catch (error) {
      toast.error("Sync failed", {
        description: extractErrorMessage(error),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Portal</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage IPOs, trigger allotment syncs, and monitor global platform activity.
        </p>
      </div>

      {/* ── Metric Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminMetricCard
          label="Platform Users"
          value={isLoadingAdminMembers ? "—" : uniqueOwners}
          icon={Users}
          description="Unique account owners tracked"
          colorClass="bg-blue-50 text-blue-700"
        />
        <AdminMetricCard
          label="Total PAN Records"
          value={isLoadingAdminMembers ? "—" : uniquePANs}
          icon={CreditCard}
          description="Unique PANs in the system"
          colorClass="bg-purple-50 text-purple-700"
        />
        <AdminMetricCard
          label="Registered IPOs"
          value={isLoadingIPOs ? "—" : ipos.length}
          icon={TrendingUp}
          description="IPOs in the registry"
          colorClass="bg-emerald-50 text-emerald-700"
        />
      </div>

      <Separator />

      {/* ── Operations Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* IPO Registry Form */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <Plus className="h-4 w-4 text-slate-700" />
              </div>
              <div>
                <CardTitle className="text-base">Add New IPO</CardTitle>
                <CardDescription className="text-xs">
                  Register an IPO to enable allotment tracking
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(handleAddIPO)}
              id="add-ipo-form"
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="registrar-ipo-select">Select IPO from Registrar</Label>
                <Select
                  onValueChange={(val) => {
                    const selected = registrarIPOs.find(r => r.value === val);
                    if (selected) {
                      setValue("name", selected.name);
                      setValue("value", selected.value);
                    }
                  }}
                >
                  <SelectTrigger id="registrar-ipo-select" className="w-full">
                    <SelectValue placeholder={
                      isLoadingRegistrarIPOs ? "Loading live IPOs..." : "Choose an IPO..."
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {registrarIPOs.map((ipo) => (
                      <SelectItem key={ipo.value} value={ipo.value}>
                        {ipo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.value ? (
                  <p className="text-xs text-red-500">{errors.value.message}</p>
                ) : (
                  <p className="text-xs text-slate-400">
                    Select an IPO currently active on the registrar's portal
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isAddingIPO}
                id="add-ipo-submit-btn"
              >
                {isAddingIPO ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding IPO…
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add IPO to Registry
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Registered IPO Registry List */}
        <Card className="shadow-sm flex flex-col h-full">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Registered IPOs</CardTitle>
                <CardDescription className="text-xs">
                  Active IPOs registered for allotment tracking
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2 pr-1">
            {ipos.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No IPOs registered yet.</p>
            ) : (
              ipos.map((ipo) => (
                <div
                  key={ipo.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">{ipo.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Code: {ipo.value}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteConfirmIPO({ id: ipo.id, name: ipo.name })}
                    className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors p-0 shrink-0"
                    aria-label={`Delete ${ipo.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Sync Control Toolbar */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                <Zap className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-base">Trigger Allotment Sync</CardTitle>
                <CardDescription className="text-xs">
                  Dispatch async workers to scrape the registrar for all PANs
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sync-ipo-select">Select IPO</Label>
              <Select
                onValueChange={setSelectedIPOId}
                value={selectedIPOId}
              >
                <SelectTrigger id="sync-ipo-select" className="w-full">
                  <SelectValue placeholder={
                    isLoadingIPOs ? "Loading IPOs…" : ipos.length === 0 ? "No IPOs registered yet" : "Choose an IPO…"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {ipos.map((ipo) => (
                    <SelectItem key={ipo.id} value={ipo.id}>
                      {ipo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
              <p className="text-xs text-amber-700">
                <strong>Warning:</strong> This will dispatch scraping tasks for all
                registered PANs in the system. Workers run asynchronously in the background.
              </p>
            </div>

            <Button
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleTriggerSync}
              disabled={isSyncing || !selectedIPOId}
              id="trigger-sync-btn"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Dispatching Workers…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Trigger Global Allotment Sync
                </>
              )}
            </Button>

            {/* Refresh global data */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fetchAdminMembers(membersPage, 10)}
              disabled={isLoadingAdminMembers}
              id="refresh-admin-members-btn"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingAdminMembers ? "animate-spin" : ""}`} />
              Refresh Global Members
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* ── Platform Members ────────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Platform Members</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              All registered family members across the platform. Click on a member to view their allotment tracking history.
            </p>
          </div>
        </div>

        {isLoadingAdminMembers ? (
          <div className="space-y-2 p-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : adminMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-slate-200/60 bg-white rounded-xl shadow-sm">
            <Users className="h-8 w-8 text-slate-400 mb-2" />
            <h3 className="text-sm font-medium text-slate-900">No members registered yet</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Family members will appear here once registered by users.
            </p>
          </div>
        ) : (
          <div>
            <div className="rounded-xl border border-slate-200/60 bg-white overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Account Owner</TableHead>
                    <TableHead>Member Name</TableHead>
                    <TableHead>PAN</TableHead>
                    <TableHead>DOB</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminMembers.map((member) => (
                    <TableRow 
                      key={member.id} 
                      onClick={() => setSelectedAdminMember(member)}
                      className="cursor-pointer hover:bg-slate-50/50 transition-colors"
                    >
                      <TableCell className="font-medium text-slate-700 text-xs">
                        {member.owner_name ?? "—"}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        {member.name}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs tracking-widest text-slate-600">
                          {maskPAN(member.pan_no)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {member.dob ? formatDateOnly(member.dob) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Members Pagination */}
            {Math.ceil(adminMembersTotal / 10) > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMembersPage((p) => Math.max(1, p - 1))}
                  disabled={membersPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-slate-500">
                  Page {membersPage} of {Math.ceil(adminMembersTotal / 10)}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMembersPage((p) => Math.min(Math.ceil(adminMembersTotal / 10), p + 1))}
                  disabled={membersPage === Math.ceil(adminMembersTotal / 10)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      <Dialog open={!!deleteConfirmIPO} onOpenChange={(open) => !open && setDeleteConfirmIPO(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-semibold">Delete IPO Registry?</DialogTitle>
            <DialogDescription className="text-slate-500 text-sm mt-1">
              Are you sure you want to delete <strong>{deleteConfirmIPO?.name}</strong>? This action is permanent and will cascade-delete all student/user allotment results tracked for this IPO.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmIPO(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (deleteConfirmIPO) {
                  await handleDeleteIPO(deleteConfirmIPO.id, deleteConfirmIPO.name);
                  setDeleteConfirmIPO(null);
                }
              }}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedAdminMember}
        onOpenChange={(open) => {
          if (!open) setSelectedAdminMember(null);
        }}
      >
        <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-slate-900 font-semibold text-lg">
              Allotment Status — {selectedAdminMember?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs mt-0.5">
              PAN: <span className="font-mono tracking-widest font-semibold">{selectedAdminMember ? maskPAN(selectedAdminMember.pan_no) : ""}</span>
              {selectedAdminMember?.dob && ` • DOB: ${formatDateOnly(selectedAdminMember.dob)}`}
              {selectedAdminMember?.owner_name && ` • Owner: ${selectedAdminMember.owner_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pt-2">
            <AllotmentTable
              data={selectedMemberAllotments}
              isLoading={isLoadingMemberAllotments}
              onRefresh={() => selectedAdminMember && fetchMemberAllotments(selectedAdminMember.pan_no)}
              showOwner={false}
              compact={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { User, CreditCard, Trash2, Loader2 } from "lucide-react";
import { maskPAN, formatDateOnly } from "@/lib/utils";
import type { Member } from "@/store/ipoStore";
import { useIPOStore } from "@/store/ipoStore";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AllotmentTable } from "./AllotmentTable";

interface MemberCardProps {
  member: Member;
  onDeleteSuccess?: () => void;
}

export function MemberCard({ member, onDeleteSuccess }: MemberCardProps) {
  const deleteMember = useIPOStore((s) => s.deleteMember);
  const allotments = useIPOStore((s) => s.allotments);
  const isLoadingAllotments = useIPOStore((s) => s.isLoadingAllotments);
  const fetchAllotments = useIPOStore((s) => s.fetchAllotments);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleConfirmDelete = async () => {
    setIsConfirmOpen(false);
    setIsDeleting(true);
    try {
      await deleteMember(member.id);
      toast.success("Member deleted successfully");
      onDeleteSuccess?.();
    } catch {
      // Error is handled by store toast / response interceptors
    } finally {
      setIsDeleting(false);
    }
  };

  const initials = member.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const memberAllotments = allotments.filter(
    (a) => a.pan_num.toUpperCase() === member.pan_no.toUpperCase()
  );

  return (
    <>
      <div 
        onClick={() => setIsDetailsOpen(true)}
        className="group flex items-start justify-between gap-3 rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-slate-300 hover:bg-slate-50/30 cursor-pointer"
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Avatar */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 ring-2 ring-white">
            {initials || <User className="h-4 w-4" />}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{member.name}</p>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              <CreditCard className="h-3 w-3 shrink-0" />
              <span className="font-mono tracking-wide">{maskPAN(member.pan_no)}</span>
            </div>
            {member.dob && (
              <p className="mt-0.5 text-xs text-slate-400">
                DOB: {formatDateOnly(member.dob)}
              </p>
            )}
          </div>
        </div>

        {/* Delete button (hidden by default, shown on hover) */}
        {member.id && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsConfirmOpen(true);
            }}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-slate-50 p-1.5 rounded-lg transition-all disabled:opacity-50 shrink-0"
            aria-label={`Delete ${member.name}`}
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-slate-900 font-semibold text-lg">
              Allotment Status — {member.name}
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs mt-0.5">
              PAN: <span className="font-mono tracking-widest font-semibold">{maskPAN(member.pan_no)}</span>
              {member.dob && ` • DOB: ${formatDateOnly(member.dob)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pt-2">
            <AllotmentTable
              data={memberAllotments}
              isLoading={isLoadingAllotments}
              onRefresh={fetchAllotments}
              showOwner={false}
              compact={true}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-semibold">Delete family member?</DialogTitle>
            <DialogDescription className="text-slate-500 text-sm mt-1">
              Are you sure you want to delete <strong>{member.name}</strong> ({maskPAN(member.pan_no)})? This member's tracking data and allotment statuses will no longer appear on your dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}



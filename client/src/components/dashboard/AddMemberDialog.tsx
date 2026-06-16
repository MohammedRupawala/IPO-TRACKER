"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIPOStore } from "@/store/ipoStore";
import { extractErrorMessage } from "@/lib/axios";

const addMemberSchema = z.object({
  name: z.string().min(1, "Member name is required").max(100, "Name too long"),
  panNo: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "PAN must be in format: ABCDE1234F (all uppercase)")
    .transform((v) => v.toUpperCase()),
  dob: z.string().optional(),
});

type AddMemberFormData = z.infer<typeof addMemberSchema>;

interface AddMemberDialogProps {
  onSuccess?: () => void;
}

export function AddMemberDialog({ onSuccess }: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { addMember, fetchAllotments } = useIPOStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddMemberFormData>({
    resolver: zodResolver(addMemberSchema),
  });

  const onSubmit = async (data: AddMemberFormData) => {
    setIsLoading(true);
    try {
      await addMember({
        name: data.name,
        panNo: data.panNo,
        dob: data.dob || undefined,
      });

      toast.success("Member added successfully", {
        description: `${data.name} has been added to your portfolio tracker.`,
      });

      reset();
      setOpen(false);
      // Refresh allotments to show new records
      fetchAllotments();
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to add member", {
        description: extractErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) reset();
    setOpen(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" id="add-member-btn">
          <Plus className="h-4 w-4" />
          Add Member
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add family member</DialogTitle>
          <DialogDescription>
            Add a PAN to track allotment status for this member across all IPOs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} id="add-member-form" className="space-y-4 py-2">
          {/* Member Name */}
          <div className="space-y-1.5">
            <Label htmlFor="member-name">Member name</Label>
            <Input
              id="member-name"
              placeholder="e.g. Wife, Father, John"
              {...register("name")}
              className={errors.name ? "border-red-300 focus-visible:ring-red-300" : ""}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* PAN Number */}
          <div className="space-y-1.5">
            <Label htmlFor="pan-number">PAN number</Label>
            <Input
              id="pan-number"
              placeholder="ABCDE1234F"
              maxLength={10}
              className={`font-mono tracking-widest uppercase ${errors.panNo ? "border-red-300 focus-visible:ring-red-300" : ""}`}
              {...register("panNo")}
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
                register("panNo").onChange(e);
              }}
            />
            {errors.panNo ? (
              <p className="text-xs text-red-500">{errors.panNo.message}</p>
            ) : (
              <p className="text-xs text-slate-400">10-character PAN format: ABCDE1234F</p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <Label htmlFor="member-dob">
              Date of birth{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="member-dob"
              type="date"
              {...register("dob")}
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-member-form"
            disabled={isLoading}
            id="add-member-submit-btn"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding…
              </>
            ) : (
              "Add member"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

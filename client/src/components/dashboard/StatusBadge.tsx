import type { AllotmentStatus } from "@/store/ipoStore";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: AllotmentStatus;
  className?: string;
}

const statusConfig: Record<
  AllotmentStatus,
  { label: string; variant: "allotted" | "awaited" | "not-allotted" | "not-applied"; dot: string }
> = {
  Allotted: {
    label: "Allotted",
    variant: "allotted",
    dot: "bg-green-500",
  },
  Awaited: {
    label: "Awaited",
    variant: "awaited",
    dot: "bg-amber-500",
  },
  "Not-Allotted": {
    label: "Not Allotted",
    variant: "not-allotted",
    dot: "bg-red-500",
  },
  "Not-Applied": {
    label: "Not Applied",
    variant: "not-applied",
    dot: "bg-slate-400",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig["Awaited"];

  return (
    <Badge variant={config.variant} className={cn("gap-1.5 font-medium", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </Badge>
  );
}

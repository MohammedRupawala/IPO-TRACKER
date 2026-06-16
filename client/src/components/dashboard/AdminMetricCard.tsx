import type { LucideIcon } from "lucide-react";

interface AdminMetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  colorClass?: string;
}

export function AdminMetricCard({
  label,
  value,
  icon: Icon,
  description,
  colorClass = "bg-slate-100 text-slate-700",
}: AdminMetricCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        {description && (
          <p className="mt-0.5 text-xs text-slate-400">{description}</p>
        )}
      </div>
    </div>
  );
}

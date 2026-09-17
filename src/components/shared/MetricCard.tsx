import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  label: string;
  value: string;
  variation?: number | null;
  icon?: ReactNode;
  iconTone?: "brand" | "success" | "danger" | "purple" | "orange";
  hint?: string;
  loading?: boolean;
}

const tones: Record<string, string> = {
  brand: "bg-brand/15 text-brand",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  purple: "bg-purple-500/15 text-purple-500",
  orange: "bg-warning/15 text-warning",
};

export function MetricCard({ label, value, variation, icon, iconTone = "brand", hint, loading }: MetricCardProps) {
  const positive = (variation ?? 0) >= 0;
  return (
    <div className="rounded-[16px] border border-border bg-surface p-5 shadow-card transition hover:border-border-strong">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-faint">{label}</span>
        {icon ? (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tones[iconTone])}>
            {icon}
          </span>
        ) : null}
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-8 w-32" />
      ) : (
        <div className="mt-2 text-[26px] font-semibold tracking-tight text-foreground">{value}</div>
      )}

      <div className="mt-1.5 flex items-center gap-1.5">
        {loading ? (
          <Skeleton className="h-4 w-16" />
        ) : variation !== undefined && variation !== null ? (
          <>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                positive ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
              )}
            >
              {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(variation).toFixed(1).replace(".", ",")}%
            </span>
            <span className="text-[11px] text-faint">vs mês anterior</span>
          </>
        ) : hint ? (
          <span className="text-[11px] text-faint">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}
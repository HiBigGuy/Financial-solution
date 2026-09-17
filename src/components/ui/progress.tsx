import * as React from "react";
import { cn } from "@/lib/utils";

export const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number; max?: number; barColor?: string }
>(({ className, value = 0, max = 100, barColor, ...props }, ref) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      ref={ref}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-surface-3", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          backgroundColor: barColor ?? "var(--brand)",
        }}
      />
    </div>
  );
});
Progress.displayName = "Progress";
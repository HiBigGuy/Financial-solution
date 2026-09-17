import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartCardShellProps {
  title: string;
  subtitle?: string;
  badge?: { text: string; tone?: "success" | "danger" };
  children: ReactNode;
  className?: string;
}

export function ChartCardShell({ title, subtitle, badge, children, className }: ChartCardShellProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          {subtitle ? (
            <p className="mt-0.5 text-[11px] text-faint">{subtitle}</p>
          ) : null}
        </div>
        {badge ? (
          <span
            className={cn(
              "inline-flex shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold",
              badge.tone === "danger"
                ? "bg-danger/15 text-danger"
                : "bg-success/15 text-success"
            )}
          >
            {badge.text}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  );
}
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compactMoney, ChartTooltip } from "./chart-utils";
import { cn } from "@/lib/utils";

interface AreaEvolutionProps {
  data: Array<{ label: string; value: number }>;
  color?: string;
  badge?: string;
  badgeTone?: "success" | "danger";
  height?: number;
  formatValue?: (v: number) => string;
}

export function AreaEvolution({
  data,
  color = "var(--brand)",
  badge,
  badgeTone = "success",
  height = 260,
  formatValue,
}: AreaEvolutionProps) {
  const gradId = `grad-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
  const hasData = data.some((d) => d.value !== 0);

  return (
    <div className="relative" style={{ height }}>
      {badge ? (
        <span
          className={cn(
            "absolute right-0 top-0 z-10 inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-semibold",
            badgeTone === "success" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
          )}
        >
          {badge}
        </span>
      ) : null}
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.32} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={54}
              tickFormatter={(v) => compactMoney(Number(v))}
            />
            <Tooltip
              content={<ChartTooltip valueFormatter={formatValue} />}
              cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              name="Patrimônio"
              stroke={color}
              strokeWidth={2.2}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-[12px] text-faint">
          Sem dados para exibir
        </div>
      )}
    </div>
  );
}
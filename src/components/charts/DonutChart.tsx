import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { compactMoney, ChartTooltip } from "./chart-utils";
import { cn } from "@/lib/utils";

export interface DonutDatum {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  centerLabel?: string;
  centerValue?: string;
  height?: number;
  maxLegend?: number;
}

export function DonutChart({ data, centerLabel, centerValue, height = 220, maxLegend = 6 }: DonutChartProps) {
  const shown = data.slice(0, maxLegend);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={
                <ChartTooltip
                  valueFormatter={(v: number) => compactMoney(Number(v))}
                />
              }
            />
            <Pie
              data={shown}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="92%"
              paddingAngle={shown.length > 1 ? 2 : 0}
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            >
              {shown.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue ? (
            <span className="text-lg font-semibold tabular-nums text-foreground">{centerValue}</span>
          ) : null}
          {centerLabel ? <span className="text-[11px] text-faint">{centerLabel}</span> : null}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-2.5">
        {shown.map((d) => (
          <div key={d.name} className="flex items-center justify-between gap-3 text-[12px]">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="truncate text-muted">{d.name}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2 tabular-nums">
              {total > 0 ? (
                <span className={cn("text-[11px] text-faint", d.name.length > 16 && "hidden sm:inline")}>
                  {((d.value / total) * 100).toFixed(0).replace(".", ",")}%
                </span>
              ) : null}
              <span className="font-semibold text-foreground">{compactMoney(d.value)}</span>
            </div>
          </div>
        ))}
        {data.length > maxLegend ? (
          <div className="pt-1 text-[11px] text-faint">+ {data.length - maxLegend} categorias</div>
        ) : null}
        {data.length === 0 ? (
          <div className="text-[12px] text-faint">Nenhum dado para exibir</div>
        ) : null}
      </div>
    </div>
  );
}
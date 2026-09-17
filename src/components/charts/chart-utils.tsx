import type { ReactNode } from "react";

/** Formatter compacto de moeda para eixos (R$ 12,4 mi) */
export const compactMoney = (v: number) => {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}k`;
  return `${sign}R$ ${abs.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: unknown;
    value?: unknown;
    color?: string;
    stroke?: string;
    fill?: string;
  }>;
  label?: unknown;
  labelFormatter?: (label: unknown) => ReactNode;
  valueFormatter?: (v: number) => string;
  rows?: Array<{ title: string; value: string }>;
}

/** Tooltip customizado — herda o tema via classes Tailwind (vars CSS) */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  rows: extraRows,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5 shadow-pop">
      <div className="mb-1.5 text-[11px] font-medium text-faint">
        {labelFormatter ? labelFormatter(label) : String(label ?? "")}
      </div>
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color ?? entry.stroke ?? entry.fill }}
            />
            <span className="capitalize text-muted">{String(entry.name ?? "")}:</span>
            <span className="font-semibold tabular-nums text-foreground">
              {valueFormatter ? valueFormatter(Number(entry.value)) : String(entry.value)}
            </span>
          </div>
        ))}
        {extraRows?.map((r, i) => (
          <div key={`x${i}`} className="mt-1 flex items-center justify-between gap-4 border-t border-border pt-1 text-[12px]">
            <span className="text-muted">{r.title}</span>
            <span className="font-semibold tabular-nums text-foreground">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartLegendItem({ color, label, value, pct }: { color: string; label: ReactNode; value: string; pct?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12px]">
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate text-muted">{label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {pct ? <span className="text-[11px] text-faint tabular-nums">{pct}</span> : null}
        <span className="font-semibold tabular-nums text-foreground">{value}</span>
      </div>
    </div>
  );
}
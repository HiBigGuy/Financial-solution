import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compactMoney, ChartTooltip } from "./chart-utils";

interface BarsCompareProps {
  data: Array<{ label: string; receitas: number; despesas: number }>;
  height?: number;
}

export function BarsCompare({ data, height = 260 }: BarsCompareProps) {
  const hasData = data.some((d) => d.receitas !== 0 || d.despesas !== 0);

  return (
    <div style={{ height }}>
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }} barGap={5}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} dy={6} />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={54}
              tickFormatter={(v) => compactMoney(Number(v))}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-2)", radius: 8 }}
              content={<ChartTooltip valueFormatter={(v: number) => compactMoney(Number(v))} />}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            />
            <Bar dataKey="receitas" name="Receitas" fill="var(--success)" radius={[6, 6, 0, 0]} maxBarSize={20} />
            <Bar dataKey="despesas" name="Despesas" fill="var(--danger)" radius={[6, 6, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-[12px] text-faint">
          Sem dados para exibir
        </div>
      )}
    </div>
  );
}
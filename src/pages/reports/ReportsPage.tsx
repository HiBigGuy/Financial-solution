import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { useRows } from "@/hooks/use-rows";
import type { Transaction, Category, Card } from "@/lib/types";
import { brl, fmtDateShort, fmtMonthKey, lastNMonths, monthKey } from "@/lib/format";
import { aggregateByMonth } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { BarsCompare } from "@/components/charts/BarsCompare";
import { ChartCardShell } from "@/components/charts/ChartCardShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PERIOD_OPTIONS = lastNMonths(24, new Date()).slice(-24);

export function ReportsPage() {
  const [from, setFrom] = useState(() => lastNMonths(6)[0].key);
  const [to, setTo] = useState(() => lastNMonths(6)[5].key);
  const [categoryId, setCategoryId] = useState("all");

  const txs = useRows<Transaction>("transactions", { orderBy: { column: "date", ascending: true } });
  const cats = useRows<Category>("categories", {});
  const cardsRes = useRows<Card>("cards", {});

  const catMap = useMemo(() => new Map(cats.data.map((c) => [c.id, c])), [cats.data]);
  const cardsName = useMemo(() => new Map(cardsRes.data.map((c) => [c.id, c.name])), [cardsRes.data]);

  const filtered = useMemo(() => {
    return txs.data.filter((t) => {
      const k = monthKey(t.date);
      if (k < from || k > to) return false;
      if (categoryId !== "all" && t.category_id !== categoryId) return false;
      return true;
    });
  }, [txs.data, from, to, categoryId]);

  const monthsInRange = useMemo(() => {
    const agg = aggregateByMonth(filtered, 0);
    void agg;
    const keys: string[] = [];
    const d = new Date(from + "-01T12:00:00");
    const end = new Date(to + "-01T12:00:00");
    while (d <= end) {
      keys.push(monthKey(d));
      d.setMonth(d.getMonth() + 1);
    }
    return keys;
  }, [filtered, from, to]);

  const byMonth = useMemo(() => {
    const map = new Map(monthsInRange.map((k) => [k, { income: 0, expense: 0 }]));
    for (const t of filtered) {
      const r = map.get(monthKey(t.date));
      if (!r) continue;
      if (t.type === "income") r.income += t.amount;
      else r.expense += t.amount;
    }
    return monthsInRange.map((k) => {
      const r = map.get(k)!;
      return {
        label: fmtMonthKey(k).split(" ")[0].slice(0, 3),
        key: k,
        receitas: r.income,
        despesas: r.expense,
      };
    });
  }, [filtered, monthsInRange]);

  const byYear = useMemo(() => {
    const map = new Map<number, { income: number; expense: number }>();
    for (const t of filtered) {
      const y = new Date(t.date + "T12:00:00").getFullYear();
      const r = map.get(y) ?? { income: 0, expense: 0 };
      if (t.type === "income") r.income += t.amount;
      else r.expense += t.amount;
      map.set(y, r);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, r]) => ({ label: String(year), receitas: r.income, despesas: r.expense }));
  }, [filtered]);

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; color: string; value: number }>();
    for (const t of filtered) {
      if (t.type !== "expense") continue;
      const c = t.category_id ? catMap.get(t.category_id) : undefined;
      const key = t.category_id ?? "none";
      const cur = map.get(key) ?? {
        name: c?.name ?? "Sem categoria",
        color: c?.color ?? "#64748b",
        value: 0,
      };
      cur.value += t.amount;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [filtered, catMap]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  const loading = txs.loading || cats.loading;

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast.message("Nada para exportar no período selecionado");
      return;
    }
    const rows = [
      ["Data", "Tipo", "Descrição", "Valor", "Categoria", "Cartão", "Recorrência", "Tags"].join(";"),
      ...filtered.map((t) =>
        [
          t.date,
          t.type === "income" ? "Receita" : "Despesa",
          `"${t.description.replace(/"/g, '""')}"`,
          t.type === "income" ? t.amount.toFixed(2).replace(".", ",") : (-t.amount).toFixed(2).replace(".", ","),
          `"${(t.category_id ? catMap.get(t.category_id)?.name : "") ?? ""}"`,
          `"${t.card_id ? cardsName.get(t.card_id) ?? "" : ""}"`,
          t.recurrence,
          `"${(t.tags ?? []).join(", ")}"`,
        ].join(";")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financex-relatorio-${from}-a-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  const print = () => {
    if (filtered.length === 0) {
      toast.message("Nada para imprimir no período");
      return;
    }
    window.print();
  };

  const maxCat = Math.max(1, ...byCategory.map((c) => c.value));

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Comparativos mensais, anuais e exportação"
        actions={
          <>
            <Button variant="outline" onClick={exportCSV}>
              <FileSpreadsheet className="h-4 w-4" /> CSV
            </Button>
            <Button onClick={print}>
              <Printer className="h-4 w-4" /> PDF
            </Button>
          </>
        }
      />

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-52">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-faint">De</label>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((m) => (
                <SelectItem key={m.key} value={m.key}>{fmtMonthKey(m.key)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-52">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-faint">Até</label>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((m) => (
                <SelectItem key={m.key} value={m.key}>{fmtMonthKey(m.key)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-faint">Categoria</label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {cats.data.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Receitas" value={brl(totals.income)} icon={<Download className="h-4 w-4" />} iconTone="success" loading={loading} />
        <MetricCard label="Despesas" value={brl(totals.expense)} icon={<Download className="h-4 w-4" />} iconTone="danger" loading={loading} />
        <MetricCard
          label="Saldo do período"
          value={brl(totals.net)}
          loading={loading}
          icon={<Download className="h-4 w-4" />}
          iconTone={totals.net >= 0 ? "success" : "danger"}
        />
      </div>

      {/* Area de impressão (PDF) */}
      <div className="report-print-area">
        <div className="mb-4 hidden print:block">
          <h2 className="text-xl font-semibold">Relatório FinanceX</h2>
          <p className="text-sm text-muted">de {fmtMonthKey(from)} até {fmtMonthKey(to)}</p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCardShell title="Receitas vs Despesas" subtitle="Mês a mês">
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : filtered.length > 0 ? (
              <BarsCompare data={byMonth} height={280} />
            ) : (
              <EmptyState title="Nenhum dado no período" description="Ajuste o intervalo das datas." />
            )}
          </ChartCardShell>

          <ChartCardShell title="Ano a ano" subtitle="Comparativo anual">
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : byYear.length > 0 ? (
              <BarsCompare data={byYear} height={280} />
            ) : (
              <EmptyState title="Sem comparativo anual" description="Dados de anos diferentes aparecerão aqui." />
            )}
          </ChartCardShell>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Despesas por categoria */}
          <ChartCardShell title="Dispesa por categoria" subtitle="Distribuição das despesas">
            {byCategory.length === 0 ? (
              <EmptyState title="Sem despesas no período" />
            ) : (
              <div className="space-y-3 pt-1">
                {byCategory.slice(0, 8).map((c) => (
                  <div key={c.name}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="inline-flex items-center gap-2 text-muted">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                      <span className="font-semibold tabular-nums text-foreground">{brl(c.value)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(c.value / maxCat) * 100}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ChartCardShell>

          {/* Resumo por mês */}
          <ChartCardShell title="Resumo mensal" subtitle="Saldo de cada mês no período">
            {byMonth.length === 0 ? (
              <EmptyState title="Sem dados" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-faint">
                      <th className="py-2 pr-3 font-medium">Mês</th>
                      <th className="py-2 pr-3 text-right font-medium">Receitas</th>
                      <th className="py-2 pr-3 text-right font-medium">Despesas</th>
                      <th className="py-2 text-right font-medium">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byMonth.map((m) => (
                      <tr key={m.key} className="border-t border-border/60">
                        <td className="py-2 pr-3 font-medium capitalize text-foreground">{fmtMonthKey(m.key)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-success">{brl(m.receitas)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-danger">{brl(m.despesas)}</td>
                        <td className={cn("py-2 text-right font-semibold tabular-nums", m.receitas - m.despesas >= 0 ? "text-foreground" : "text-danger")}>
                          {brl(m.receitas - m.despesas)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCardShell>
        </div>

        {/* Lista detalhada (mostrada no print) */}
        <div className="mt-4 hidden print:block">
          <h3 className="mb-2 text-base font-semibold">Lançamentos do período</h3>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left">
                <th className="py-1.5">Data</th>
                <th className="py-1.5">Descrição</th>
                <th className="py-1.5">Categoria</th>
                <th className="py-1.5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="py-1">{fmtDateShort(t.date)}</td>
                  <td className="py-1">{t.description}</td>
                  <td className="py-1">{t.category_id ? catMap.get(t.category_id)?.name ?? "—" : "—"}</td>
                  <td className={cn("py-1 text-right tabular-nums", t.type === "income" ? "text-success" : "")}>
                    {t.type === "income" ? "+" : "-"}{brl(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Plus, Wallet } from "lucide-react";
import { useRows } from "@/hooks/use-rows";
import type { Transaction, Category, Investment } from "@/lib/types";
import { brl, brlCompact, INVESTMENT_LABELS, signedPct } from "@/lib/format";
import {
  aggregateByMonth,
  cumulativeNet,
  currentMonthTotals,
  currentMonthVariation,
  distributionByType,
  totalWealth,
  variationPct,
} from "@/lib/calculations";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { AreaEvolution } from "@/components/charts/AreaEvolution";
import { DonutChart } from "@/components/charts/DonutChart";
import { BarsCompare } from "@/components/charts/BarsCompare";
import { ChartCardShell } from "@/components/charts/ChartCardShell";

export function DashboardPage() {
  const tx = useRows<Transaction>("transactions", {
    orderBy: { column: "date" },
  });
  const cats = useRows<Category>("categories", {});
  const inv = useRows<Investment>("investments", {});

  const loading = tx.loading || cats.loading || inv.loading;

  // Categorias padrão para nomear agrupamentos (mesmo sem join)
  const catMap = new Map(cats.data.map((c) => [c.id, c.name]));
  void catMap;

  const months = aggregateByMonth(tx.data);
  const current = currentMonthTotals(months);
  const variation = currentMonthVariation(months);

  const cumulative = cumulativeNet(months);
  const evolution = months.map((m, i) => ({ label: m.short, value: cumulative[i] }));

  const firstNet = cumulative[0] ?? 0;
  const lastNet = cumulative.at(-1) ?? 0;
  const badgePct = variationPct(lastNet, firstNet);

  const distribution = distributionByType(inv.data);
  const totalInvested = inv.data.reduce((s, i) => s + i.quantity * i.avg_price, 0);
  const currentInvested = inv.data.reduce((s, i) => s + i.quantity * i.current_price, 0);
  const rent = variationPct(currentInvested, totalInvested);

  const bars6 = months.slice(-6).map((m) => ({
    label: m.short,
    receitas: m.income,
    despesas: m.expense,
  }));

  const wealth = totalWealth(inv.data, months);
  const hasTxs = tx.data.length > 0;
  const hasInv = inv.data.length > 0;

  return (
    <div>
      <PageHeader
        title="Visão Geral"
        description="Resumo da sua vida financeira"
        actions={
          <Link to="/transacoes">
            <Button>
              <Plus className="h-4 w-4" />
              Nova transação
            </Button>
          </Link>
        }
      />

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Saldo do Mês"
          value={brl(current.net)}
          variation={variation.net}
          icon={<Wallet className="h-4 w-4" />}
          iconTone="brand"
          loading={loading}
        />
        <MetricCard
          label="Receitas"
          value={brl(current.income)}
          variation={variation.income}
          icon={<ArrowDownLeft className="h-4 w-4" />}
          iconTone="success"
          loading={loading}
        />
        <MetricCard
          label="Despesas"
          value={brl(current.expense)}
          variation={variation.expense}
          icon={<ArrowUpRight className="h-4 w-4" />}
          iconTone="danger"
          loading={loading}
        />
        <MetricCard
          label="Patrimônio"
          value={brl(wealth)}
          variation={rent}
          icon={<PiggyBank className="h-4 w-4" />}
          iconTone="purple"
          loading={loading}
        />
      </div>

      {/* Evolução patrimonial + Distribuição */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCardShell
          className="xl:col-span-2"
          title="Evolução Patrimonial"
          subtitle="Últimos 12 meses"
          badge={
            hasTxs
              ? { text: `${signedPct(badgePct)} no ano`, tone: badgePct >= 0 ? "success" : "danger" }
              : undefined
          }
        >
          {loading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : hasTxs ? (
            <AreaEvolution data={evolution} formatValue={(v) => brl(v)} />
          ) : (
            <EmptyState
              title="Sem movimentações ainda"
              description="Cadastre sua primeira receita ou despesa em Transações para ver sua evolução patrimonial."
              action={
                <Link to="/transacoes">
                  <Button size="sm">
                    <Plus className="h-4 w-4" /> Nova transação
                  </Button>
                </Link>
              }
            />
          )}
        </ChartCardShell>

        <ChartCardShell title="Distribuição" subtitle="Por categoria de investimento">
          {loading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : hasInv ? (
            <DonutChart
              data={distribution.map((d) => ({
                name:
                  INVESTMENT_LABELS[d.type as keyof typeof INVESTMENT_LABELS] ??
                  d.type,
                value: d.value,
                color: d.color,
              }))}
              centerValue={currentInvested > 0 ? brlCompact(currentInvested) : undefined}
              centerLabel="investido"
            />
          ) : (
            <EmptyState
              title="Sem investimentos"
              description="Cadastre ativos em Investimentos para ver a distribuição."
              action={
                <Link to="/investimentos">
                  <Button size="sm">Ver investimentos</Button>
                </Link>
              }
            />
          )}
        </ChartCardShell>
      </div>

      {/* Receitas vs Despesas */}
      <div className="mt-4">
        <ChartCardShell title="Receitas vs Despesas" subtitle="Últimos 6 meses">
          {loading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : hasTxs ? (
            <BarsCompare data={bars6} />
          ) : (
            <EmptyState
              title="Sem dados comparativos"
              description="Os últimos 6 meses aparecerão aqui conforme você lança suas transações."
            />
          )}
        </ChartCardShell>
      </div>
    </div>
  );
}
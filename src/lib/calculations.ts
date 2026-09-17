import type { Transaction, MonthData, Investment } from "./types";
import { monthKey, lastNMonths, INVESTMENT_COLORS } from "./format";

/** Agrupa transações por mês; retorna array de 12 meses zerados + dados reais */
export function aggregateByMonth(
  txs: Transaction[],
  months = 12
): MonthData[] {
  const periods = lastNMonths(months);
  const map = new Map<string, MonthData>(
    periods.map((p) => [
      p.key,
      { key: p.key, label: p.label, short: p.short, date: p.date, income: 0, expense: 0, net: 0 },
    ])
  );

  for (const tx of txs) {
    const mk = monthKey(tx.date);
    const row = map.get(mk);
    if (!row) continue;
    if (tx.type === "income") {
      row.income += tx.amount;
    } else {
      row.expense += tx.amount;
    }
    row.net = row.income - row.expense;
  }

  return Array.from(map.values());
}

/** Saldo acumulado (evolução patrimonial via renda - despesas) */
export function cumulativeNet(monthly: MonthData[]): number[] {
  let cum = 0;
  return monthly.map((m) => {
    cum += m.net;
    return cum;
  });
}

/** Variação percentual entre dois valores */
export function variationPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Soma receitas e despesas do mês atual (segundo `key`) */
export function currentMonthTotals(
  monthly: MonthData[]
): { income: number; expense: number; net: number } {
  const current = monthly.at(-1);
  return current
    ? { income: current.income, expense: current.expense, net: current.net }
    : { income: 0, expense: 0, net: 0 };
}

/** Variação do mês atual vs anterior */
export function currentMonthVariation(monthly: MonthData[]) {
  if (monthly.length < 2) return { income: 0, expense: 0, net: 0 };
  const curr = monthly.at(-1)!;
  const prev = monthly.at(-2)!;
  return {
    income: variationPct(curr.income, prev.income),
    expense: variationPct(curr.expense, prev.expense),
    net: variationPct(curr.net, prev.net),
  };
}

/** Distribuição por tipo de investimento (para donut) */
export function distributionByType(investments: Investment[]) {
  const map = new Map<string, number>();
  for (const inv of investments) {
    const val = inv.quantity * inv.current_price;
    map.set(inv.type, (map.get(inv.type) ?? 0) + val);
  }
  return Array.from(map.entries())
    .map(([type, value]) => ({
      type,
      value,
      color: INVESTMENT_COLORS[type as keyof typeof INVESTMENT_COLORS] ?? "#64748b",
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** Patrimônio total = soma valor atual dos investimentos + saldo acumulado */
export function totalWealth(
  investments: Investment[],
  monthly: MonthData[]
): number {
  const invested = investments.reduce(
    (sum, i) => sum + i.quantity * i.current_price,
    0
  );
  const cumNet = monthly.reduce((s, m) => s + m.net, 0);
  return invested + cumNet;
}

/** Gasto do mês atual por categoria (para gráfico) */
export function expenseByCategory(
  txs: Transaction[],
  categories: { id: string; name: string; color: string }[],
  mk?: string
): { name: string; value: number; color: string }[] {
  const target = mk ?? monthKey(new Date());
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();

  for (const tx of txs) {
    if (tx.type !== "expense" || monthKey(tx.date) !== target) continue;
    const cid = tx.category_id ?? "outro";
    totals.set(cid, (totals.get(cid) ?? 0) + tx.amount);
  }

  return Array.from(totals.entries())
    .map(([cid, value]) => ({
      name: catMap.get(cid)?.name ?? "Sem categoria",
      value,
      color: catMap.get(cid)?.color ?? "#64748b",
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** Cálculo de fatura atual para um cartão (período entre closing_day anterior e atual) */
export function invoicePeriod(
  closingDay: number,
  ref = new Date()
): { from: string; to: string } {
  const today = ref.getDate();
  const year = ref.getFullYear();
  const month = ref.getMonth();

  if (today >= closingDay) {
    // estamos entre closingDay deste mês e o próximo → fatura deste mês
    // periodo: desde closingDay (do mês anterior +1) até closingDay deste
    const from = new Date(year, month - 1, closingDay + 1);
    const to = new Date(year, month, closingDay);
    return { from: monthKey(from) + "-01", to: to.toISOString().slice(0, 10) };
  }
  // antes do closingDay → fatura ainda aberta do mês passado
  const from = new Date(year, month - 2, closingDay + 1);
  const to = new Date(year, month - 1, closingDay);
  return { from: monthKey(from) + "-01", to: to.toISOString().slice(0, 10) };
}
import type { InvestmentType } from "./types";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const COMPACT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const INT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const brl = (v: number) => BRL.format(v);
export const brlCompact = (v: number) => (Math.abs(v) >= 1_000 ? COMPACT.format(v) : BRL.format(v));
export const brlShort = (v: number) => INT.format(v);
export const brlNum = (v: number) => NUM.format(v);

export const pct = (v: number, digits = 1) =>
  `${v.toFixed(digits).replace(".", ",")}%`;

export const signedPct = (v: number) =>
  `${v >= 0 ? "+" : ""}${pct(v)}`;

export const signedBrl = (v: number) =>
  `${v >= 0 ? "+" : ""}${brl(v)}`;

export const PCT_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const MONTH_NAMES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const MONTH_FULL = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export const parseDate = (iso: string) => new Date(iso + "T12:00:00");

export const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR").format(parseDate(iso));

export const fmtDateShort = (iso: string) => {
  const d = parseDate(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${MONTH_NAMES[d.getMonth()]}`;
};

export const monthKey = (d: Date | string): string => {
  const date = typeof d === "string" ? parseDate(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const fmtMonthKey = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_FULL[m - 1]} ${y}`;
};

export const fmtMonthShort = (key: string) => {
  const [, m] = key.split("-").map(Number);
  return MONTH_NAMES[m - 1];
};

export const addMonths = (d: Date, n: number) => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
};

export const lastNMonths = (
  n: number,
  from = new Date()
): { key: string; label: string; date: Date; short: string }[] => {
  const result: { key: string; label: string; date: Date; short: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = addMonths(from, -i);
    const mk = monthKey(d);
    result.push({
      key: mk,
      label: fmtMonthKey(mk),
      date: d,
      short: fmtMonthShort(mk),
    });
  }
  return result;
};

export const monthDiff = (a: string, b: string) => {
  const dA = parseDate(a + "-01");
  const dB = parseDate(b + "-01");
  return (
    (dB.getFullYear() - dA.getFullYear()) * 12 +
    (dB.getMonth() - dA.getMonth())
  );
};

export const TODAY_ISO = () => monthKey(new Date()) + "-15";
export const NOW_ISO = new Date().toISOString().slice(0, 10);

export const INVESTMENT_LABELS: Record<InvestmentType, string> = {
  acao: "Ações",
  fii: "FIIs",
  tesouro: "Tesouro Direto",
  "renda-fixa": "Renda Fixa",
  cripto: "Criptomoedas",
};

export const INVESTMENT_COLORS: Record<InvestmentType, string> = {
  acao: "#3b82f6",
  fii: "#22c55e",
  tesouro: "#8b5cf6",
  "renda-fixa": "#f97316",
  cripto: "#ec4899",
};
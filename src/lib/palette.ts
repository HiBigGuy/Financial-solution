/** Paleta de cores padronizada para categorias e gráficos (idêntica ao Figma) */
export const CATEGORY_COLORS = [
  "#3b82f6", // azul
  "#22c55e", // verde
  "#8b5cf6", // roxo
  "#f97316", // laranja
  "#ec4899", // rosa
  "#14b8a6", // teal
  "#eab308", // amarelo
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f43f5e", // rose
  "#a855f7", // purple
  "#64748b", // slate
] as const;

export const CATEGORY_BG: Record<string, string> = {
  acao: "bg-blue-500/15",
  fii: "bg-green-500/15",
  tesouro: "bg-purple-500/15",
  "renda-fixa": "bg-orange-500/15",
  cripto: "bg-pink-500/15",
};

export const SELECT_ITEMS = [
  { value: "acao", label: "Ações" },
  { value: "fii", label: "FIIs" },
  { value: "tesouro", label: "Tesouro Direto" },
  { value: "renda-fixa", label: "Renda Fixa" },
  { value: "cripto", label: "Criptomoedas" },
] as const;

export const KIND_LABELS: Record<string, string> = {
  salary: "Salário",
  freela: "Freela",
  extra: "Extra",
};
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  TrendingUp,
  Target,
  FileBarChart,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";

export const NAV_ITEMS: {
  to: string;
  label: string;
  icon: LucideIcon;
  title: string;
  description?: string;
}[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    title: "Visão Geral",
    description: "Resumo da sua vida financeira",
  },
  {
    to: "/transacoes",
    label: "Transações",
    icon: ArrowLeftRight,
    title: "Transações",
    description: "Receitas e despesas",
  },
  {
    to: "/salario",
    label: "Salário",
    icon: Wallet,
    title: "Salário",
    description: "Fontes de renda",
  },
  {
    to: "/cartoes",
    label: "Cartões",
    icon: CreditCard,
    title: "Cartões",
    description: "Crédito e débito",
  },
  {
    to: "/investimentos",
    label: "Investimentos",
    icon: TrendingUp,
    title: "Investimentos",
    description: "Ativos e rentabilidade",
  },
  {
    to: "/metas",
    label: "Metas",
    icon: Target,
    title: "Metas",
    description: "Objetivos financeiros",
  },
  {
    to: "/relatorios",
    label: "Relatórios",
    icon: FileBarChart,
    title: "Relatórios",
    description: "Comparativos e exportação",
  },
];
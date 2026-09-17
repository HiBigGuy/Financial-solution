import { Link } from "react-router-dom";
import {
  ArrowRight,
  CreditCard,
  FileBarChart,
  LineChart,
  Lock,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/layout/Sidebar";

const FEATURES = [
  {
    icon: Wallet,
    title: "Salário e rendas",
    desc: "Cadastre fontes fixas, freelas e extras com histórico mês a mês.",
  },
  {
    icon: CreditCard,
    title: "Cartões sob controle",
    desc: "Acompanhe faturas, limite disponível e categorização de gastos por cartão.",
  },
  {
    icon: TrendingUp,
    title: "Investimentos",
    desc: "Ações, FIIs, tesouro, renda fixa e cripto com rentabilidade e distribuição.",
  },
  {
    icon: Target,
    title: "Metas",
    desc: "Reserva de emergência, viagens e compras com barra de progresso.",
  },
  {
    icon: FileBarChart,
    title: "Relatórios",
    desc: "Comparativos mês a mês, ano a ano e exportação em CSV/PDF.",
  },
  {
    icon: Lock,
    title: "Seus dados com você",
    desc: "Conta autenticada, com políticas RLS garantindo que só você acessa.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-app text-foreground">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <Link
          to="/login"
          className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-brand px-4 text-[13px] font-semibold text-white transition hover:brightness-110"
        >
          Entrar
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-2 lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[12px] font-medium text-muted">
            <LineChart className="h-3.5 w-3.5 text-brand" />
            Gestão financeira pessoal
          </span>
          <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            Seu dinheiro no controle, com um{" "}
            <span className="bg-gradient-to-r from-brand to-purple-400 bg-clip-text text-transparent">
              painel único
            </span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
            Vault reúne salário, cartões, investimentos, metas e relatórios em
            uma interface escura e limpa — feita para uso pessoal, sem ruído.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-6 text-[14px] font-semibold text-white transition hover:brightness-110"
            >
              Começar agora <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex h-11 items-center rounded-xl border border-border px-6 text-[14px] font-medium text-foreground transition hover:bg-surface-2"
            >
              Fazer login
            </Link>
          </div>
        </div>

        {/* Mock de dashboard */}
        <div
          className="relative rounded-2xl border border-border bg-surface p-5 shadow-card"
          aria-hidden="true"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-faint">Visão Geral</p>
              <p className="text-[15px] font-semibold">Evolução Patrimonial</p>
            </div>
            <span className="inline-flex rounded-lg bg-success/15 px-2 py-1 text-[11px] font-semibold text-success">
              +32,0% no ano
            </span>
          </div>
          <div className="flex items-end gap-1.5" style={{ height: 130 }}>
            {[38, 44, 40, 52, 58, 54, 66, 72, 68, 80, 88, 96].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-gradient-to-t from-brand/25 to-brand/60 transition hover:to-brand/90"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[10px] text-faint">
            {["mai", "jun", "jul", "ago", "set", "out", "nov", "dez", "jan", "fev", "mar", "abr"].map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Tudo o que você precisa, sem excessos
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-[14px] text-muted">
          Focado em uso pessoal: cada módulo resolve um problema real do dia a dia.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-surface p-6 transition hover:-translate-y-0.5 hover:border-border-strong"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-border bg-surface/60 px-8 py-14 text-center shadow-card">
          <LogoMark />
          <h2 className="max-w-md text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            Coloque suas finanças no piloto automático da clareza
          </h2>
          <Link
            to="/login"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-7 text-[14px] font-semibold text-white transition hover:brightness-110"
          >
            Criar minha conta <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-[12px] text-faint sm:flex-row sm:px-8">
          <span>Vault © 2026 — projeto pessoal open source (MIT).</span>
          <span>Feito com React, Recharts e Supabase.</span>
        </div>
      </footer>
    </div>
  );
}
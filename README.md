# FinanceX — Gestão Financeira Pessoal

Sistema **single-user** de gestão financeira pessoal com tema escuro, painel
visual (dashboard), fluxo completo de lançamentos e módulos de salário, cartões,
investimentos, metas e relatórios.

> Projeto pessoal open source (MIT). Dados protegidos por autenticação do
> Supabase + políticas RLS — só você acessa o que é seu.

## ✨ Funcionalidades

| Módulo | O que faz |
|---|---|
| **Dashboard** | Cards de resumo (saldo, receitas, despesas, patrimônio), evolução patrimonial de 12 meses, distribuição por categoria de investimento, receitas vs despesas (6 meses) |
| **Transações** | CRUD completo de receitas/despesas: categoria, cartão, tags, recorrência fixa/parcelada, busca e filtros |
| **Salário** | Fontes de renda (fixo, freela, extra), estimativa mensal, histórico e evolução da renda |
| **Cartões** | Crédito/débito, fatura atual (cálculo por dia de fechamento), limite disponível, categorização de gastos |
| **Investimentos** | Ações, FIIs, Tesouro, renda fixa e cripto — com rentabilidade e donut de distribuição |
| **Metas** | Valor alvo, aportes, prazo e barra de progresso |
| **Relatórios** | Filtros por período/categoria, comparativos mês a mês e ano a ano, exportação **CSV** e **PDF** |
| **Perfil/backup** | Edição de nome, exportação completa dos dados em JSON |

## 🧰 Stack

- **React 18 + TypeScript + Vite**
- **TailwindCSS v4** + componentes padrão **shadcn/ui** (Radix primitives)
- **Recharts** (área, donut, barras)
- **React Router v7**
- **Supabase** (Postgres + Auth + RLS)
- **GitHub Actions + GitHub Pages** (deploy)

Decisões técnicas detalhadas em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
e o schema SQL em [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

## 🚀 Como rodar localmente

### 1. Pré-requisitos

- Node.js 20+
- Uma conta no [Supabase](https://supabase.com) (grátis)

### 2. Criar o projeto Supabase

1. No Supabase, crie um projeto novo.
2. Abra **SQL Editor** e execute todo o conteúdo de
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   Ele cria tabelas, índices e as políticas RLS.
3. Em **Authentication → Providers**, mantenha **Email** habilitado.
   - Recomendado: desative a *confirmação de email* em
     **Authentication → Settings** para login imediato no primeiro acesso.
4. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.

### 3. Configurar o app

```bash
cp .env.example .env
```

Preencha:

```bash
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
VITE_BASE=/            # "/" em dev; "/Financial-solution/" para GH Pages
```

### 4. Rodar

```bash
npm install
npm run dev        # http://localhost:5173
```

Abra no navegador, crie sua conta (ou use o link mágico) e comece a lançar
transações. O app começa **vazio** — use Transações → "Categorias" →
"Carregar padrão" para criar categorias rapidamente.

## ☁️ Deploy no GitHub (GitHub Pages)

O workflow `.github/workflows/deploy.yml` já:
- roda `lint` + `typecheck` + `build` a cada push na `main`;
- publica o `dist/` no GitHub Pages.

### Configurar uma vez

1. Habilite o GitHub Pages **Settings → Pages → Source → GitHub Actions**.
2. (Opcional) Ajuste o `VITE_BASE` no workflow para o nome do seu repositório,
   e a URL duplicada em `public/sitemap.xml` / `public/robots.txt` / `index.html`.
3. Push para `main`. O site ficará em `https://SEU-USUARIO.github.io/SEU-REPO/`.

> **Nota sobre o `.env`:** as variáveis são usadas no momento do build. Como o
> workflow não recebe `VITE_SUPABASE_URL`/`ANON_KEY`, o frontend compila com as
> chaves ausentes e exibe a tela de "Supabase não configurado". Para injetar as
> chaves no build, adicione secrets no repositório
> (**Settings → Secrets → Actions**) e passe as variáveis no job `build`.

## 🛠 Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | typecheck + build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | checagem de tipos |
| `npm run preview` | serve o build gerado |

## 🖥️ Screenshots

*Adicione prints do dashboard, salário e relatórios aqui após o primeiro deploy.*

## 📄 Licença

[MIT](LICENSE) © 2026 HiBigGuy.
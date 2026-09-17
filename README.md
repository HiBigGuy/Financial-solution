# Vault — Gestão Financeira Pessoal

Sistema **web** de gestão financeira pessoal com tema escuro, painel visual e
módulos de salário, cartões, investimentos, metas, transações e relatórios.

> 🖥️ **Acesse em:** https://hibigguy.github.io/Financial-solution/

## Como funciona

Vault é um **sistema único e centralizado hospedado na web** — não é um app
que roda "na sua máquina". Você só precisa de um navegador:

1. Acesse o site e **crie sua conta** (e-mail e senha, ou login por *magic link*
   enviado ao e-mail).
2. Faça login e comece a **lançar suas transações** e **preencher os módulos**.
3. Todos os dados ficam salvos **na nuvem (Supabase)**, sincronizados em qualquer
   dispositivo, acessíveis a qualquer hora.

A conta de cada pessoa é **isolada**: ninguém enxerga os dados do outro — seu
dinheiro fica só com você, protegido por autenticação e políticas de segurança
(RLS) no banco de dados.

> O app já nasce **vazio**. Para montar sua organização rapidamente, abra
> **Transações → Categorias → "Carregar padrão"** e as categorias mais comuns
> (moradia, alimentação, transporte, lazer…) são criadas para você.

## Funcionalidades

### Dashboard
O centro de controle da sua vida financeira:
- **4 cards de resumo**: saldo em conta, receitas do mês, despesas do mês e
  patrimônio (investimentos + saldo), cada um com variação sobre o período
  anterior.
- **Evolução patrimonial** dos últimos 12 meses num gráfico de área, com
  indicador de crescimento no ano.
- **Distribuição de investimentos** por tipo (ações, FIIs, Tesouro…) num donut.
- **Receitas vs. despesas** dos últimos 6 meses em barras comparativas.

### Transações
Registro completo de receitas e despesas:
- Descrição, valor, data, **categoria**, **cartão** (opcional) e **tags**.
- **Recorrência**: lançamentos fixos mensais ou **parcelados** (ex.: compra em
  12x), que você gerencia ao abrir o lançamento.
- **Busca** por texto e **filtros** por tipo, categoria, cartão, período e tag.
- **Gestão de categorias**: crie as suas ou carregue as padrão, cada uma com cor.

### Salário
- Cadastre suas **fontes de renda**: salário fixo, freelas, renda extra — cada
  uma com valor, frequência (mensal, quinzenal, semanal, pontual) e status
  ativo/inativo.
- Veja a **estimativa mensal** de renda e o **histórico de evolução** da sua
  renda ao longo dos meses.

### Cartões
- Cadastre cartões de **crédito e débito**, com bandeira, final, **limite** e
  **dia de fechamento e vencimento**.
- Acompanhe a **fatura atual** calculada automaticamente, o **limite disponível**
  e a categorização dos gastos do cartão.

### Investimentos
- Controle ativos de **ações, FIIs, Tesouro, renda fixa e cripto** com
  quantidade, preço médio e preço atual.
- Acompanhe a **posição atual** (`quantidade × preço`), o **investido** e a
  **rentabilidade** de cada ativo e do total.
- Visualize a **distribuição** do patrimônio investido por classe.

### Metas
- Defina **objetivos**: valor alvo, valor já aportado e prazo.
- Acompanhe a **barra de progresso** e faça **aportes rápidos** direto na lista.

### Relatórios
- Analise **mês a mês** e **ano a ano** (comparativo com períodos anteriores).
- **Filtre** por período e categoria, e resuma receitas, despesas, saldo e
  patrimônio.
- **Exporte os resultados**: planilha **CSV** (compatível com Excel/Sheets, com
  BOM) ou **PDF** (impressão otimizada para papel).

### Perfil e backup
- Edite seu nome de exibição.
- **Exporte todos os seus dados em JSON** de um clique (sidebar → ícone de
  download), guardando uma cópia de segurança.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Estilo | TailwindCSS v4 + shadcn/ui (Radix) |
| Gráficos | Recharts |
| Roteamento | React Router v7 |
| Backend/banco | Supabase (Postgres + Auth + RLS) |
| Deploy | GitHub Actions + GitHub Pages |

Detalhes técnicos e decisões de arquitetura: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
Schema e políticas de segurança do banco: [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

## Deploy

Qualquer push na branch `main` dispara o workflow `.github/workflows/deploy.yml`,
que roda lint, typecheck e build e publica automaticamente no GitHub Pages.

## 📄 Licença

[MIT](LICENSE) © 2026 HiBigGuy.
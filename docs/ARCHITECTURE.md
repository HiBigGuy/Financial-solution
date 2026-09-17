# Vault — Arquitetura

> Documento com as decisões técnicas e a justificativa de cada escolha.

## Stack final

| Camada | Tecnologia | Justificativa |
|---|---|---|
| UI | React 18 + TypeScript + Vite | SPA rápida, ecossistema maduro, tipagem forte para cálculos financeiros |
| Estilo | TailwindCSS v4 + componentes no padrão shadcn/ui | Fidelidade ao design do Figma (tokens, dark space `#0B0F14`), utilitários + a11y dos primitives Radix |
| Gráficos | Recharts | Area/Donut/Bar responsivos, leve, integra bem com tema via CSS vars |
| Roteamento | React Router v7 (BrowserRouter) | Landing `/` indexável + rotas internas protegidas; fallback SPA `404.html` para GitHub Pages |
| Backend | **Supabase** (Postgres + Auth + RLS) | BaaS completo sem servidor próprio nas contas grátis; auth e banco gerenciados, políticas RLS garantem isolamento mesmo em uso pessoal |
| Persistência | Postgres via `@supabase/supabase-js` | Schema versionado em `supabase/migrations`, query declarativa |
| Deploy | **GitHub Pages** via GitHub Actions | Frontend é 100% estático (SPA + Supabase). Mais simples e gratuito, sem contas externas |
| Fontes | Inter Variable (`@fontsource`) | Tipografia moderna da referência, self-hosted (sem dependência de CDN) |

### Por que GitHub Pages + Supabase (e não Vercel/Netlify + Next.js)?

O frontend é uma SPA estática que fala diretamente com o Supabase pelo client SDK.
Não existe backend próprio para hospedar. Nesse cenário, GitHub Pages é o deploy
mais simples possível: repositório → workflow → site público, sem contas extras.
Caso no futuro seja necessário server-side (ex.: webhooks, jobs), basta trocar o
front que o schema e a estrutura se mantêm.

## Estrutura de pastas

```
├── .github/workflows/deploy.yml     # CI: lint + typecheck + build + deploy Pages
├── public/                          # SEO + fallback SPA (robots, sitemap, 404)
├── src/
│   ├── components/
│   │   ├── ui/                      # primitives (button, dialog, select, card…)
│   │   ├── layout/                  # Sidebar, Topbar, AppLayout, tema
│   │   ├── charts/                  # wrappers de gráficos + tooltip/legenda
│   │   └── shared/                  # MetricCard, EmptyState, ConfirmDialog…
│   ├── features/auth/               # AuthContext + ProtectedRoute + Login
│   ├── pages/
│   │   ├── landing/                 # landing pública (SEO)
│   │   ├── dashboard/               # visão geral
│   │   ├── salary/                  # fontes de renda
│   │   ├── cards/                   # cartões e faturas
│   │   ├── investments/             # ativos e distribuição
│   │   ├── goals/                   # metas
│   │   ├── reports/                 # relatórios + exportação
│   │   └── transactions/            # CRUD de lançamentos + categorias
│   ├── hooks/use-rows.ts            # fetch genérico do Supabase
│   ├── lib/                         # supabase client, format (pt-BR), cálculos
│   └── styles/global.css            # tokens de tema (dark/light)
├── supabase/migrations/             # schema SQL versionado
└── docs/
```

## Dados e relacionamentos

- `profiles` — 1:1 com `auth.users` (nome exibido na sidebar).
- `categories` — 1:N com `transactions` (via `category_id`); `kind` separa
  receitas/despesas.
- `cards` — 1:N com `transactions` (`card_id`, on delete set null).
- `income_sources` — fontes de renda (salário/freela/extra) usadas para a
  estimativa mensal; o **realizado** vem das `transactions(type=income)`.
- `investments` — ativos com `quantity`, `avg_price`, `current_price`; o valor
  calculado é `quantity × price`.
- `goals` — valor alvo, valor atual, prazo.
- RLS: todas as tabelas usam `auth.uid()` como dono; políticas garantem que um
  usuário só enxerga os próprios registros.

Datas são armazenadas como `date` (ISO `YYYY-MM-DD`) e valores como `numeric(14,2)`.
Agregações (mês a mês, variação %, fatura do cartão) ficam em `src/lib/calculations.ts`.

## Camada bancária (Open Finance) e IA

Implementada em fases. **Fase 1 (schema)** já está na migration
[`supabase/migrations/0002_banking.sql`](../supabase/migrations/0002_banking.sql),
executada no Supabase — inclusive as extensões `pg_cron` e `pg_net`.

- `bank_connections` — conexões Open Finance do provedor (Pluggy). Guarda apenas
  `item_id`, instituição, status e datas de sincronização. **Nunca** armazena
  senha/credencial bancária.
- `bank_accounts` — contas e cartões retornados pelo provedor (`external_id`,
  saldo, limite, moeda), com vínculo opcional a um `cards` do app.
- `categorization_corrections` — histórico de correções de categoria usadas como
  *few-shot* para a IA melhorar as sugestões.
- `insights` — resumos textuais gerados pela IA (semanal/mensal) exibidos no
  Dashboard.
- `transactions` ganhou `source` (`manual`/`open_finance`), `external_id`
  (com índice único `(user_id, external_id)` para **sincronização idempotente**),
  `account_id`, `category_source` (`manual`/`ai`), `ai_suggested_category_id` e
  `ai_confidence`.

RLS segue o mesmo padrão (`auth.uid() = user_id`) nas novas tabelas.

### Fase 2 (Edge Functions)

As funções Deno estão implementadas em `supabase/functions/` e devem ser
publicadas no Supabase, sem servidor próprio:
`pluggy-connect` (geração do connect token do widget), `pluggy-item` (persiste o
consentimento), `sync-accounts`, `sync-transactions` (upsert com dedup + chamada
de IA Gemini), `categorize` (Gemini) e `insights`.

Secrets (configurar em **Supabase → Project Settings → Edge Functions → Secrets**;
**nunca** no frontend): `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`,
`GEMINI_API_KEY`, `GEMINI_MODEL` (opcional; padrão `gemini-2.0-flash-lite`), `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET`.

O deploy pode ser feito com a CLI do Supabase, uma função por vez:

```bash
supabase functions deploy pluggy-connect
supabase functions deploy pluggy-item
supabase functions deploy sync-accounts
supabase functions deploy sync-transactions
supabase functions deploy categorize
supabase functions deploy insights
```

Depois do deploy, o frontend deve chamar as funções usando o cliente Supabase
autenticado. A chave `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser exposta ao
navegador.

Quando uma transação importada não tem categoria, o sistema tenta primeiro o
Gemini. Se a API falhar, atingir a cota ou não retornar uma categoria válida,
entra o fallback local por regras e palavras-chave (por exemplo, Uber/99,
iFood e farmácia), sem custo adicional. As regras escolhem entre as categorias
já cadastradas pelo usuário.

O agendamento da sincronização (a cada 6h) usa `pg_cron` + `pg_net` — há um
template comentado no fim da migration `0002`; basta preencher o `PROJECT_REF` e
o segredo após publicar as funções.

## Tema

O tema escuro é o padrão (fundo `#0B0F14`). Tudo é controlado por CSS variables
em `src/styles/global.css`: `:root` define o claro e `.dark` o escuro. O toggle da
sidebar grava em `localStorage` e um script inline no `index.html` aplica o tema
antes do CSS carregar (sem FOUC). Os gráficos Recharts consomem as mesmas vars.

## Segurança

- Variáveis sensíveis em `.env` (nunca commitar — `.gitignore` protege).
- Só a chave **publishable** (antiga *anon key*) fica no cliente — ela é pública
  por natureza e respeita o RLS. A **secret/service key** e os secrets de
  integração (Pluggy/Anthropic) ficam **exclusivamente** nas Edge Functions.
- Sanitização básica de inputs; validação de valores > 0 nos formulários.
- HTTPS garantido pelo GitHub Pages + Supabase.

## SEO

- Landing `/` com meta tags, Open Graph e Twitter Card.
- `public/robots.txt` bloqueia as rotas internas (`/dashboard`, `/salario`, …).
- `public/sitemap.xml` lista somente a rota pública.
- Rotas internas renderizadas somente após autenticação (sem conteúdo indexável).
-- Vault — Camada bancária (Open Finance) + IA
-- Fase 1: schema, RLS e preparação do agendamento (pg_cron/pg_net).
-- As Edge Functions (Pluggy + Anthropic) são a Fase 2.
--
-- Idempotente: pode ser re-executada com segurança.

-- ============================================================
-- EXTENSÕES (agendamento serverless)
-- ============================================================
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ============================================================
-- UPDATED_AT automático
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- BANK CONNECTIONS (conexões Open Finance)
-- NUNCA armazena senha/credencial bancária — só o item_id do provedor.
-- ============================================================
create table if not exists public.bank_connections (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  provider           text not null default 'pluggy',
  item_id            text not null unique,
  institution_id     text,
  institution_name   text,
  institution_logo   text,
  status             text not null default 'connecting'
                     check (status in ('connecting', 'connected', 'updating', 'waiting_consent', 'error', 'login_error')),
  consent_expires_at timestamptz,
  last_sync_at       timestamptz,
  last_sync_status   text check (last_sync_status in ('success', 'partial', 'error')),
  last_error         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ============================================================
-- BANK ACCOUNTS (contas/cartões retornados pelo provedor)
-- ============================================================
create table if not exists public.bank_accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.bank_connections(id) on delete cascade,
  external_id   text not null,
  name          text,
  type          text not null default 'checking'
                check (type in ('checking', 'savings', 'credit', 'investment', 'other')),
  subtype       text,
  currency      text not null default 'BRL',
  balance       numeric(14,2) not null default 0,
  credit_limit  numeric(14,2),
  card_id       uuid references public.cards(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (connection_id, external_id)
);

-- ============================================================
-- CATEGORIZATION CORRECTIONS (few-shot / aprendizado da IA)
-- ============================================================
create table if not exists public.categorization_corrections (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  description_raw        text not null,
  merchant               text,
  amount                 numeric(14,2),
  suggested_category_id  uuid references public.categories(id) on delete set null,
  chosen_category_id     uuid references public.categories(id) on delete set null,
  created_at             timestamptz not null default now()
);

-- ============================================================
-- INSIGHTS (resumos gerados pela IA)
-- ============================================================
create table if not exists public.insights (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  period       text not null default 'week' check (period in ('week', 'month')),
  period_start date not null,
  content      text not null,
  created_at   timestamptz not null default now(),
  unique (user_id, period, period_start)
);

-- ============================================================
-- ALTERAÇÕES EM TRANSAÇÕES
-- origem manual/open_finance + id externo (dedup de sincronização)
-- ============================================================
alter table public.transactions
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'open_finance')),
  add column if not exists external_id text,
  add column if not exists account_id uuid references public.bank_accounts(id) on delete set null,
  add column if not exists category_source text not null default 'manual'
    check (category_source in ('manual', 'ai')),
  add column if not exists ai_suggested_category_id uuid references public.categories(id) on delete set null,
  add column if not exists ai_confidence numeric(4,3);

-- Dedup: uma transação importada não pode ser gravada duas vezes
create unique index if not exists uq_tx_user_external
  on public.transactions(user_id, external_id)
  where external_id is not null;

-- ============================================================
-- ALTERAÇÕES EM CATEGORIAS
-- ============================================================
alter table public.categories
  add column if not exists is_system boolean not null default false;

-- ============================================================
-- RLS (multi-tenant: cada usuário só acessa o próprio dado)
-- ============================================================
alter table public.bank_connections            enable row level security;
alter table public.bank_accounts               enable row level security;
alter table public.categorization_corrections  enable row level security;
alter table public.insights                    enable row level security;

drop policy if exists bank_connections_own on public.bank_connections;
create policy bank_connections_own on public.bank_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists bank_accounts_own on public.bank_accounts;
create policy bank_accounts_own on public.bank_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists cat_corrections_own on public.categorization_corrections;
create policy cat_corrections_own on public.categorization_corrections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists insights_own on public.insights;
create policy insights_own on public.insights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
drop trigger if exists trg_bank_connections_updated on public.bank_connections;
create trigger trg_bank_connections_updated
  before update on public.bank_connections
  for each row execute function public.set_updated_at();

drop trigger if exists trg_bank_accounts_updated on public.bank_accounts;
create trigger trg_bank_accounts_updated
  before update on public.bank_accounts
  for each row execute function public.set_updated_at();

-- ============================================================
-- ÍNDICES
-- ============================================================
create index if not exists idx_conn_user            on public.bank_connections(user_id);
create index if not exists idx_accounts_user        on public.bank_accounts(user_id);
create index if not exists idx_accounts_connection  on public.bank_accounts(connection_id);
create index if not exists idx_tx_account           on public.transactions(account_id);
create index if not exists idx_corrections_user     on public.categorization_corrections(user_id);
create index if not exists idx_insights_user        on public.insights(user_id, period_start);

-- ============================================================
-- AGENDAMENTO (Fase 2) — habilite após publicar as Edge Functions
-- Substitua <PROJECT_REF> e o segredo. O job chama a função de sync
-- a cada 6h usando pg_net (HTTP), sem servidor externo.
-- ============================================================
-- select cron.schedule(
--   'vault-sync-open-finance',
--   '0 */6 * * *',
--   $$
--   select net.http_post(
--     url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-transactions',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer <CRON_SECRET>'
--     ),
--     body    := '{}'::jsonb
--   );
--   $$
-- );

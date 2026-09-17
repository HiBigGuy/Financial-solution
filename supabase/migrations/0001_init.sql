-- FinanceX — Schema Supabase
-- Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor)

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  email      text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  kind       text not null check (kind in ('income', 'expense')),
  color      text not null default '#3b82f6',
  icon       text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INCOME SOURCES (salário, freela, extra)
-- ============================================================
create table if not exists public.income_sources (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  kind       text not null check (kind in ('salario', 'freela', 'extra')),
  amount     numeric(14,2) not null default 0,
  frequency  text not null default 'monthly'
             check (frequency in ('monthly', 'fifteen', 'weekly', 'one-time')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CARDS
-- ============================================================
create table if not exists public.cards (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  brand        text,
  type         text not null default 'credit'
               check (type in ('credit', 'debit')),
  last4        text,
  limit_amount numeric(14,2) not null default 0,
  closing_day  int check (closing_day between 1 and 31),
  due_day      int check (due_day between 1 and 31),
  color        text not null default '#3b82f6',
  created_at   timestamptz not null default now()
);

-- ============================================================
-- TRANSACTIONS (receitas & despesas)
-- ============================================================
create table if not exists public.transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  type             text not null check (type in ('income', 'expense')),
  description      text not null,
  amount           numeric(14,2) not null,
  category_id      uuid references public.categories(id) on delete set null,
  card_id          uuid references public.cards(id) on delete set null,
  tags             text[] not null default '{}',
  date             date not null default current_date,
  recurrence       text not null default 'none'
                   check (recurrence in ('none', 'fixed', 'installments')),
  installment_no   int,
  installment_total int,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- INVESTMENTS
-- ============================================================
create table if not exists public.investments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  type          text not null
                check (type in ('acao', 'fii', 'tesouro', 'renda-fixa', 'cripto')),
  quantity      numeric(14,8) not null default 1,
  avg_price     numeric(14,2) not null default 0,
  current_price numeric(14,2) not null default 0,
  acquired_at   date not null default current_date,
  notes         text,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- GOALS
-- ============================================================
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0,
  due_date      date,
  category      text not null default 'other',
  color         text not null default '#8b5cf6',
  created_at    timestamptz not null default now()
);

-- ============================================================
-- RLS (Row Level Security)
-- Garante que cada usuário só vê seus próprios dados
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.income_sources  enable row level security;
alter table public.cards           enable row level security;
alter table public.transactions    enable row level security;
alter table public.investments     enable row level security;
alter table public.goals           enable row level security;

-- Policies: CRUD somente para o próprio usuário (multi-tenant com isolamento via RLS)
-- Idempotente: drop policy antes de recriar para permitir re-execução com segurança
drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own"    on public.profiles        for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "categories_own" on public.categories;
create policy "categories_own"  on public.categories      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "sources_own" on public.income_sources;
create policy "sources_own"     on public.income_sources  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "cards_own" on public.cards;
create policy "cards_own"       on public.cards           for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "tx_own" on public.transactions;
create policy "tx_own"          on public.transactions    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "inv_own" on public.investments;
create policy "inv_own"         on public.investments     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "goals_own" on public.goals;
create policy "goals_own"       on public.goals           for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- INDEXES para performance
-- ============================================================
create index if not exists idx_tx_user_date      on public.transactions(user_id, date);
create index if not exists idx_tx_category        on public.transactions(category_id);
create index if not exists idx_tx_card            on public.transactions(card_id);
create index if not exists idx_cat_user           on public.categories(user_id);
create index if not exists idx_sources_user       on public.income_sources(user_id);
create index if not exists idx_cards_user         on public.cards(user_id);
create index if not exists idx_inv_user           on public.investments(user_id);
create index if not exists idx_goals_user         on public.goals(user_id);
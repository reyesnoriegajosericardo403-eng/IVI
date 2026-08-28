-- ============================================================
-- Migración: 0003_investments_liabilities
-- Fecha: 2026-08-28
-- Descripción: Posiciones de inversión y pasivos/deudas.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

create table if not exists public.investments (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  ticker text not null,
  name text not null,
  asset_class text not null check (asset_class in ('stock', 'etf', 'fibra', 'cetes', 'bond', 'fund', 'crypto', 'other')),
  quantity numeric not null,
  avg_cost_price numeric not null,
  currency text not null,
  amount_invested numeric not null,
  purchase_date timestamptz not null,
  broker text,
  fees numeric,
  dividends_received numeric,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists investments_user_id_idx on public.investments (user_id);

alter table public.investments enable row level security;
create policy "investments_select_own" on public.investments for select using (auth.uid() = user_id);
create policy "investments_insert_own" on public.investments for insert with check (auth.uid() = user_id);
create policy "investments_update_own" on public.investments for update using (auth.uid() = user_id);
create policy "investments_delete_own" on public.investments for delete using (auth.uid() = user_id);

create trigger investments_set_timestamps
  before insert or update on public.investments
  for each row execute function public.set_sync_timestamps();

create table if not exists public.liabilities (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('credit_card', 'student_loan', 'personal_loan', 'mortgage', 'other')),
  institution text not null,
  balance numeric not null,
  interest_rate numeric,
  min_payment numeric,
  due_date timestamptz,
  monthly_payment numeric,
  start_date timestamptz,
  estimated_payoff_date timestamptz,
  currency text not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists liabilities_user_id_idx on public.liabilities (user_id);

alter table public.liabilities enable row level security;
create policy "liabilities_select_own" on public.liabilities for select using (auth.uid() = user_id);
create policy "liabilities_insert_own" on public.liabilities for insert with check (auth.uid() = user_id);
create policy "liabilities_update_own" on public.liabilities for update using (auth.uid() = user_id);
create policy "liabilities_delete_own" on public.liabilities for delete using (auth.uid() = user_id);

create trigger liabilities_set_timestamps
  before insert or update on public.liabilities
  for each row execute function public.set_sync_timestamps();

-- ============================================================
-- ROLLBACK:
--
-- drop trigger if exists liabilities_set_timestamps on public.liabilities;
-- drop table if exists public.liabilities;
-- drop trigger if exists investments_set_timestamps on public.investments;
-- drop table if exists public.investments;
-- ============================================================

-- ============================================================
-- Migración: 0002_budgets_goals
-- Fecha: 2026-08-28
-- Descripción: Presupuesto por categoría y metas financieras.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

create table if not exists public.budgets (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id text not null,
  monthly_amount numeric not null,
  currency text not null,
  threshold_attention integer not null default 70,
  threshold_warning integer not null default 90,
  threshold_exceeded integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, category_id)
);

create index if not exists budgets_user_id_idx on public.budgets (user_id);

alter table public.budgets enable row level security;
create policy "budgets_select_own" on public.budgets for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.budgets for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on public.budgets for update using (auth.uid() = user_id);
create policy "budgets_delete_own" on public.budgets for delete using (auth.uid() = user_id);

create trigger budgets_set_timestamps
  before insert or update on public.budgets
  for each row execute function public.set_sync_timestamps();

create table if not exists public.goals (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  target_amount numeric not null,
  current_amount numeric not null default 0,
  currency text not null,
  target_date timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists goals_user_id_idx on public.goals (user_id);

alter table public.goals enable row level security;
create policy "goals_select_own" on public.goals for select using (auth.uid() = user_id);
create policy "goals_insert_own" on public.goals for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on public.goals for update using (auth.uid() = user_id);
create policy "goals_delete_own" on public.goals for delete using (auth.uid() = user_id);

create trigger goals_set_timestamps
  before insert or update on public.goals
  for each row execute function public.set_sync_timestamps();

-- ============================================================
-- ROLLBACK:
--
-- drop trigger if exists goals_set_timestamps on public.goals;
-- drop table if exists public.goals;
-- drop trigger if exists budgets_set_timestamps on public.budgets;
-- drop table if exists public.budgets;
-- ============================================================

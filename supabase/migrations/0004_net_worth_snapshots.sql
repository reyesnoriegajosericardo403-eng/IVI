-- ============================================================
-- Migración: 0004_net_worth_snapshots
-- Fecha: 2026-08-28
-- Descripción: Historial de patrimonio neto (un registro por día)
--   para tendencias 1d/7d/30d/1a. El patrimonio SIEMPRE se puede
--   recalcular desde accounts/investments/liabilities — este
--   snapshot es una caché de auditoría, no la única fuente de
--   verdad del número (spec sección 83).
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

create table if not exists public.net_worth_snapshots (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  snapshot_date date not null,
  assets numeric not null,
  liabilities numeric not null,
  net_worth numeric not null,
  currency text not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, snapshot_date)
);

create index if not exists net_worth_snapshots_user_date_idx on public.net_worth_snapshots (user_id, snapshot_date);

alter table public.net_worth_snapshots enable row level security;
create policy "net_worth_snapshots_select_own" on public.net_worth_snapshots for select using (auth.uid() = user_id);
create policy "net_worth_snapshots_insert_own" on public.net_worth_snapshots for insert with check (auth.uid() = user_id);
create policy "net_worth_snapshots_update_own" on public.net_worth_snapshots for update using (auth.uid() = user_id);
create policy "net_worth_snapshots_delete_own" on public.net_worth_snapshots for delete using (auth.uid() = user_id);

create trigger net_worth_snapshots_set_timestamps
  before insert or update on public.net_worth_snapshots
  for each row execute function public.set_sync_timestamps();

-- ============================================================
-- ROLLBACK:
--
-- drop trigger if exists net_worth_snapshots_set_timestamps on public.net_worth_snapshots;
-- drop table if exists public.net_worth_snapshots;
-- ============================================================

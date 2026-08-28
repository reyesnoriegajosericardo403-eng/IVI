-- ============================================================
-- Migración: 0001_core_profiles_accounts_transactions
-- Fecha: 2026-08-28
-- Descripción: Fundamento del backend — perfiles de usuario,
--   cuentas y transacciones. Primera pieza de la fuente única de
--   verdad (spec sección 71) para VALU Finance AI.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

-- Necesario para gen_random_uuid() (usado por los triggers de
-- auditoría en la migración 0005). Supabase normalmente ya la trae
-- habilitada, pero se declara explícitamente por si no es el caso.
create extension if not exists pgcrypto;

-- Función compartida: el servidor es SIEMPRE la autoridad sobre
-- updated_at (nunca se confía en el reloj del dispositivo del
-- cliente para resolver conflictos de sincronización — spec 77).
-- created_at sí se respeta si el cliente lo manda (puede ser una
-- fecha pasada si el registro se creó offline y se sincronizó
-- después), pero nunca se sobreescribe una vez existe.
create or replace function public.set_sync_timestamps()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if TG_OP = 'INSERT' then
    if new.created_at is null then
      new.created_at = now();
    end if;
  else
    new.created_at = old.created_at;
  end if;
  return new;
end;
$$;

-- ---------- profiles ----------
-- Un registro por usuario autenticado. Se crea automáticamente al
-- registrarse (spec sección 38: nunca pedir al usuario que configure
-- la base de datos a mano).
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  primary_currency text not null default 'MXN',
  theme_preference text not null default 'system',
  budget_threshold_attention integer not null default 70,
  budget_threshold_warning integer not null default 90,
  budget_threshold_exceeded integer not null default 100,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);
-- No hay policy de insert/delete manual: el trigger de abajo crea el
-- perfil, y borrar la cuenta de auth.users borra el perfil en cascada.

create trigger profiles_set_timestamps
  before insert or update on public.profiles
  for each row execute function public.set_sync_timestamps();

-- Crea el perfil automáticamente cuando alguien se registra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- accounts ----------
create table if not exists public.accounts (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  institution text,
  type text not null check (type in ('cash', 'bank', 'credit_card', 'investment', 'savings')),
  currency text not null,
  balance numeric not null,
  is_liability boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists accounts_user_id_idx on public.accounts (user_id);
create index if not exists accounts_updated_at_idx on public.accounts (user_id, updated_at);

alter table public.accounts enable row level security;
create policy "accounts_select_own" on public.accounts for select using (auth.uid() = user_id);
create policy "accounts_insert_own" on public.accounts for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on public.accounts for update using (auth.uid() = user_id);
create policy "accounts_delete_own" on public.accounts for delete using (auth.uid() = user_id);

create trigger accounts_set_timestamps
  before insert or update on public.accounts
  for each row execute function public.set_sync_timestamps();

-- ---------- transactions ----------
create table if not exists public.transactions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('expense', 'income', 'transfer', 'saving', 'investment_buy', 'investment_sell')),
  amount numeric not null,
  currency text not null,
  category_id text not null,
  subcategory_id text not null,
  merchant text,
  account_id uuid references public.accounts (id) on delete set null,
  to_account_id uuid references public.accounts (id) on delete set null,
  occurred_at timestamptz not null, -- fecha financiera del movimiento (campo "date" en el cliente)
  notes text,
  origin text not null check (origin in ('voice', 'manual', 'import', 'broker', 'automatic')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_occurred_at_idx on public.transactions (user_id, occurred_at desc);
create index if not exists transactions_updated_at_idx on public.transactions (user_id, updated_at);

alter table public.transactions enable row level security;
create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions for update using (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions for delete using (auth.uid() = user_id);

create trigger transactions_set_timestamps
  before insert or update on public.transactions
  for each row execute function public.set_sync_timestamps();

-- ============================================================
-- ROLLBACK (ejecutar manualmente si es necesario revertir):
--
-- drop trigger if exists transactions_set_timestamps on public.transactions;
-- drop table if exists public.transactions;
-- drop trigger if exists accounts_set_timestamps on public.accounts;
-- drop table if exists public.accounts;
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop function if exists public.handle_new_user();
-- drop trigger if exists profiles_set_timestamps on public.profiles;
-- drop table if exists public.profiles;
-- drop function if exists public.set_sync_timestamps();
-- ============================================================

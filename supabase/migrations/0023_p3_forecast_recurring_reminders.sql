-- ============================================================
-- Migración: 0023_p3_forecast_recurring_reminders
-- Fecha: 2026-10-04
-- Descripción: P3 — "previsto vs. real", movimientos recurrentes, avisos y deudas ampliadas.
--   1) transactions: status (posted | forecast | skipped | paused), planned_date, confirmed_at, recurring_rule_id,
--      liability_id. Un movimiento existente queda como 'posted' (real), así NADA de lo que ya tienes cambia.
--   2) liabilities: direction (owe | owed_to_me), counterparty, status, settled_at y los datos de un plan de cuotas.
--   3) recurring_rules: la regla ("Renta cada día 5") que genera los movimientos previstos.
--   4) reminders: una serie de avisos (una vez o repetida).
--   5) reminder_occurrences: cada vez concreta de un aviso; lleva copiado lo que el servidor necesita para
--      mandar la notificación sin juntar tablas (título, intentos). NUNCA lleva montos ni saldos.
--   Es seguro correrla más de una vez (usa "if not exists" / "drop policy if exists").
--   La app sigue funcionando aunque esta migración todavía no se haya corrido: las columnas nuevas solo se mandan
--   cuando tienen valor y las tablas nuevas se sincronizan aparte (si no existen, se reintenta más tarde).
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

-- ---------- 1) transactions ----------
alter table public.transactions add column if not exists status text not null default 'posted';
alter table public.transactions add column if not exists planned_date timestamptz;
alter table public.transactions add column if not exists confirmed_at timestamptz;
alter table public.transactions add column if not exists recurring_rule_id uuid;
alter table public.transactions add column if not exists liability_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_status_check') then
    alter table public.transactions add constraint transactions_status_check
      check (status in ('posted', 'forecast', 'skipped', 'paused'));
  end if;
end $$;

-- Para listar rápido los previstos de una persona y para no regenerar los de una regla.
create index if not exists transactions_user_status_idx on public.transactions (user_id, status) where status <> 'posted';
create index if not exists transactions_rule_idx on public.transactions (user_id, recurring_rule_id) where recurring_rule_id is not null;

-- ---------- 2) liabilities ----------
alter table public.liabilities add column if not exists direction text not null default 'owe';
alter table public.liabilities add column if not exists counterparty text;
alter table public.liabilities add column if not exists status text not null default 'active';
alter table public.liabilities add column if not exists settled_at timestamptz;
alter table public.liabilities add column if not exists installment_count integer;
alter table public.liabilities add column if not exists installment_amount numeric;
alter table public.liabilities add column if not exists installment_start_date date;
alter table public.liabilities add column if not exists installments_paid integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'liabilities_direction_check') then
    alter table public.liabilities add constraint liabilities_direction_check check (direction in ('owe', 'owed_to_me'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'liabilities_status_check') then
    alter table public.liabilities add constraint liabilities_status_check check (status in ('active', 'settled'));
  end if;
end $$;

-- ---------- 3) recurring_rules ----------
create table if not exists public.recurring_rules (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('transaction', 'goal_contribution')),
  name text not null check (char_length(name) between 1 and 120),
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  recurrence jsonb not null,
  amount numeric not null check (amount > 0),
  currency text not null,
  tx_type text check (tx_type in ('expense', 'income', 'transfer', 'saving')),
  category_id text,
  subcategory_id text,
  merchant text,
  account_id uuid,
  to_account_id uuid,
  goal_id uuid,
  paused_at timestamptz,
  ended_at timestamptz,
  generated_until date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists recurring_rules_user_updated_idx on public.recurring_rules (user_id, updated_at);

alter table public.recurring_rules enable row level security;
drop policy if exists "recurring_rules_select_own" on public.recurring_rules;
drop policy if exists "recurring_rules_insert_own" on public.recurring_rules;
drop policy if exists "recurring_rules_update_own" on public.recurring_rules;
drop policy if exists "recurring_rules_delete_own" on public.recurring_rules;
create policy "recurring_rules_select_own" on public.recurring_rules for select using (auth.uid() = user_id);
create policy "recurring_rules_insert_own" on public.recurring_rules for insert with check (auth.uid() = user_id);
create policy "recurring_rules_update_own" on public.recurring_rules for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recurring_rules_delete_own" on public.recurring_rules for delete using (auth.uid() = user_id);

drop trigger if exists recurring_rules_set_timestamps on public.recurring_rules;
create trigger recurring_rules_set_timestamps
  before insert or update on public.recurring_rules
  for each row execute function public.set_sync_timestamps();

-- ---------- 4) reminders ----------
create table if not exists public.reminders (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('custom', 'rule', 'goal', 'liability', 'card_cutoff', 'card_due')),
  title text not null check (char_length(title) between 1 and 120),
  note text,
  source_type text check (source_type in ('rule', 'goal', 'liability', 'account')),
  source_id uuid,
  recurrence jsonb,
  date date,
  time_of_day text not null default '09:00' check (time_of_day ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  advance_days jsonb not null default '[]'::jsonb,
  max_attempts integer not null default 1 check (max_attempts between 1 and 3),
  attempt_interval_minutes integer not null default 120 check (attempt_interval_minutes between 60 and 1440),
  push boolean not null default true,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  generated_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists reminders_user_updated_idx on public.reminders (user_id, updated_at);
create index if not exists reminders_source_idx on public.reminders (user_id, source_type, source_id);

alter table public.reminders enable row level security;
drop policy if exists "reminders_select_own" on public.reminders;
drop policy if exists "reminders_insert_own" on public.reminders;
drop policy if exists "reminders_update_own" on public.reminders;
drop policy if exists "reminders_delete_own" on public.reminders;
create policy "reminders_select_own" on public.reminders for select using (auth.uid() = user_id);
create policy "reminders_insert_own" on public.reminders for insert with check (auth.uid() = user_id);
create policy "reminders_update_own" on public.reminders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reminders_delete_own" on public.reminders for delete using (auth.uid() = user_id);

drop trigger if exists reminders_set_timestamps on public.reminders;
create trigger reminders_set_timestamps
  before insert or update on public.reminders
  for each row execute function public.set_sync_timestamps();

-- ---------- 5) reminder_occurrences ----------
create table if not exists public.reminder_occurrences (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  reminder_id uuid not null,
  event_date date not null,
  offset_days integer not null default 0 check (offset_days between 0 and 60),
  scheduled_for timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'confirmed', 'not_occurred', 'skipped', 'dismissed', 'cancelled', 'paused')),
  attempts_made integer not null default 0 check (attempts_made >= 0),
  max_attempts integer not null default 1 check (max_attempts between 1 and 3),
  attempt_interval_minutes integer not null default 120 check (attempt_interval_minutes between 60 and 1440),
  next_attempt_at timestamptz,
  last_sent_at timestamptz,
  resolved_at timestamptz,
  postponed_count integer not null default 0,
  title text not null,
  push boolean not null default true,
  source_type text,
  source_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists reminder_occurrences_user_updated_idx on public.reminder_occurrences (user_id, updated_at);
create index if not exists reminder_occurrences_reminder_idx on public.reminder_occurrences (user_id, reminder_id);
-- El servidor (cada hora) busca solo lo que ya toca avisar.
create index if not exists reminder_occurrences_due_idx on public.reminder_occurrences (next_attempt_at)
  where status in ('pending', 'sent') and deleted_at is null and push;

alter table public.reminder_occurrences enable row level security;
drop policy if exists "reminder_occurrences_select_own" on public.reminder_occurrences;
drop policy if exists "reminder_occurrences_insert_own" on public.reminder_occurrences;
drop policy if exists "reminder_occurrences_update_own" on public.reminder_occurrences;
drop policy if exists "reminder_occurrences_delete_own" on public.reminder_occurrences;
create policy "reminder_occurrences_select_own" on public.reminder_occurrences for select using (auth.uid() = user_id);
create policy "reminder_occurrences_insert_own" on public.reminder_occurrences for insert with check (auth.uid() = user_id);
create policy "reminder_occurrences_update_own" on public.reminder_occurrences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reminder_occurrences_delete_own" on public.reminder_occurrences for delete using (auth.uid() = user_id);

drop trigger if exists reminder_occurrences_set_timestamps on public.reminder_occurrences;
create trigger reminder_occurrences_set_timestamps
  before insert or update on public.reminder_occurrences
  for each row execute function public.set_sync_timestamps();

-- ============================================================
-- ROLLBACK:
--
-- drop table if exists public.reminder_occurrences;
-- drop table if exists public.reminders;
-- drop table if exists public.recurring_rules;
-- alter table public.liabilities
--   drop column if exists direction, drop column if exists counterparty, drop column if exists status,
--   drop column if exists settled_at, drop column if exists installment_count, drop column if exists installment_amount,
--   drop column if exists installment_start_date, drop column if exists installments_paid;
-- alter table public.transactions
--   drop column if exists status, drop column if exists planned_date, drop column if exists confirmed_at,
--   drop column if exists recurring_rule_id, drop column if exists liability_id;
-- ============================================================

-- ============================================================
-- Migración: 0024_credit_card_dates
-- Fecha: 2026-10-04
-- Descripción: Tarjeta de crédito — fecha de corte, fecha límite de pago, límite de crédito, pago mínimo (el que dice tu
--   estado de cuenta) y preferencias de aviso. Solo se llenan en cuentas de tipo credit_card; una cuenta normal las deja
--   en null. Los avisos de corte y de pago viven en `reminders` (migración 0023) con id determinista por tarjeta.
--   Es seguro correrla más de una vez. La app sigue funcionando sin ella: las columnas solo se mandan si tienen valor.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

alter table public.accounts add column if not exists card_cutoff_day smallint;
alter table public.accounts add column if not exists card_due_day smallint;
alter table public.accounts add column if not exists credit_limit numeric;
alter table public.accounts add column if not exists card_min_payment numeric;
alter table public.accounts add column if not exists card_alerts jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'accounts_card_cutoff_day_check') then
    alter table public.accounts add constraint accounts_card_cutoff_day_check check (card_cutoff_day is null or card_cutoff_day between 1 and 31);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'accounts_card_due_day_check') then
    alter table public.accounts add constraint accounts_card_due_day_check check (card_due_day is null or card_due_day between 1 and 31);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'accounts_credit_limit_check') then
    alter table public.accounts add constraint accounts_credit_limit_check check (credit_limit is null or credit_limit > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'accounts_card_min_payment_check') then
    alter table public.accounts add constraint accounts_card_min_payment_check check (card_min_payment is null or card_min_payment >= 0);
  end if;
end $$;

-- ============================================================
-- ROLLBACK:
--
-- alter table public.accounts
--   drop column if exists card_cutoff_day, drop column if exists card_due_day, drop column if exists credit_limit,
--   drop column if exists card_min_payment, drop column if exists card_alerts;
-- ============================================================

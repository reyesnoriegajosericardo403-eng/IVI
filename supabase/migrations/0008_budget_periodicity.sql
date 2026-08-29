-- ============================================================
-- Migración: 0008_budget_periodicity
-- Fecha: 2026-08-29
-- Descripción: Guarda cómo se calculó el monto mensual de cada
--   presupuesto (periodicidad, frecuencia, días personalizados, monto
--   base) para poder reabrir el formulario con los mismos controles.
--   monthly_amount sigue siendo la única cifra que el resto de la app
--   necesita leer — estas columnas son solo metadatos de edición.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

alter table public.budgets add column if not exists periodicity text check (periodicity in ('day', 'week', 'month'));
alter table public.budgets add column if not exists frequency text check (frequency in ('all_days', 'weekdays', 'weekends', 'custom', 'one_time'));
alter table public.budgets add column if not exists custom_days_per_week integer;
alter table public.budgets add column if not exists base_amount numeric;

-- ============================================================
-- ROLLBACK:
--
-- alter table public.budgets drop column if exists base_amount;
-- alter table public.budgets drop column if exists custom_days_per_week;
-- alter table public.budgets drop column if exists frequency;
-- alter table public.budgets drop column if exists periodicity;
-- ============================================================

-- ============================================================
-- Migración: 0010_account_colors_transport_budget_targets
-- Fecha: 2026-09-01
-- Descripción: Cuentas con color e indicador de "tarjeta de
--   transporte" (para preseleccionar cargos de transporte público),
--   y presupuesto con cuenta destino (ingresos) / cuentas excluidas
--   (gastos, opcional) — para que registrar por voz o manual sepa de
--   qué cuenta sale o a cuál entra el dinero.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

alter table public.accounts add column if not exists color text;
alter table public.accounts add column if not exists is_transport_card boolean not null default false;

alter table public.budgets add column if not exists target_account_id uuid references public.accounts (id) on delete set null;
alter table public.budgets add column if not exists excluded_account_ids uuid[] not null default '{}';

-- ============================================================
-- ROLLBACK:
--
-- alter table public.budgets drop column if exists excluded_account_ids;
-- alter table public.budgets drop column if exists target_account_id;
-- alter table public.accounts drop column if exists is_transport_card;
-- alter table public.accounts drop column if exists color;
-- ============================================================

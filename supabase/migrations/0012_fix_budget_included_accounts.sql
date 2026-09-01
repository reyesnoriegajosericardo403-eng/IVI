-- ============================================================
-- Migración: 0012_fix_budget_included_accounts
-- Fecha: 2026-09-02
-- Descripción: Corrige la migración 0011 para que funcione sin importar
--   si la 0010 (que crea excluded_account_ids) ya se había aplicado o
--   no en este proyecto — deja la base en el estado final correcto
--   (columna included_account_ids) sin importar el punto de partida.
--   Segura de correr más de una vez.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

do $$
begin
  -- Ya existe la columna vieja (de exclusión) -> se renombra.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'budgets' and column_name = 'excluded_account_ids'
  ) then
    alter table public.budgets rename column excluded_account_ids to included_account_ids;
  end if;

  -- Ni la vieja ni la nueva existían (la 0010 nunca se corrió aquí) ->
  -- se crea la columna nueva directamente.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'budgets' and column_name = 'included_account_ids'
  ) then
    alter table public.budgets add column included_account_ids uuid[] not null default '{}';
  end if;
end $$;

-- El resto de columnas de la 0010 también quedan garantizadas por si esa
-- migración nunca se corrió en este proyecto.
alter table public.accounts add column if not exists color text;
alter table public.accounts add column if not exists is_transport_card boolean not null default false;
alter table public.budgets add column if not exists target_account_id uuid references public.accounts (id) on delete set null;

-- ============================================================
-- ROLLBACK:
--
-- alter table public.budgets rename column included_account_ids to excluded_account_ids;
-- ============================================================

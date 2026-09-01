-- ============================================================
-- Migración: 0011_budget_included_accounts
-- Fecha: 2026-09-01
-- Descripción: La columna de cuentas del presupuesto pasa de ser una
--   lista de EXCLUSIÓN a una lista de INCLUSIÓN — en vez de marcar qué
--   tarjetas nunca usas para un gasto, ahora se selecciona con cuáles sí
--   pagas normalmente esa categoría/subcategoría (spec: "seleccionar las
--   cuentas con las que normalmente pagas eso"). Vacía/null sigue
--   significando "cualquier cuenta activa es válida", igual que antes.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

alter table public.budgets rename column excluded_account_ids to included_account_ids;

-- ============================================================
-- ROLLBACK:
--
-- alter table public.budgets rename column included_account_ids to excluded_account_ids;
-- ============================================================

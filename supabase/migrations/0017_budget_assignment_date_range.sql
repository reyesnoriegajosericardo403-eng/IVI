-- ============================================================
-- Migración: 0017_budget_assignment_date_range
-- Fecha: 2026-09-27
-- Descripción: Rediseño de Presupuesto según especificación v2 ("Plan de
--   gastos") + imagen de referencia — el calendario ahora asigna
--   presupuestos a un RANGO de fechas elegido a mano (ej. "28 sep – 30
--   sep"), no solo a un día/semana/mes exacto.
--
--   - budget_assignments: start_date/end_date (fechas locales inclusivas)
--     son la nueva fuente de verdad del rango que cubre la asignación.
--     Nullable a propósito: las asignaciones ya guardadas (solo con
--     period_key) siguen resolviéndose bien porque el cliente deriva su
--     rango de period_key cuando estas columnas vienen vacías
--     (getAssignmentRange en src/utils/budgetPeriods.ts) — no hace falta
--     backfill para no tocar datos de nadie a ciegas.
--   - budget_templates: icon (nombre de Ionicons) para los chips e
--     íconos del calendario — nullable, sin ícono elegido el cliente usa
--     uno por default según el tipo de plantilla.
--
--   Aditiva y reversible: agrega columnas nuevas nullable, no toca ninguna
--   fila ni columna existente.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

alter table public.budget_assignments
  add column if not exists start_date date,
  add column if not exists end_date date;

create index if not exists budget_assignments_range_idx on public.budget_assignments (user_id, start_date, end_date);

alter table public.budget_templates
  add column if not exists icon text;

-- ============================================================
-- ROLLBACK:
--
-- alter table public.budget_templates drop column if exists icon;
-- drop index if exists public.budget_assignments_range_idx;
-- alter table public.budget_assignments drop column if exists end_date;
-- alter table public.budget_assignments drop column if exists start_date;
-- ============================================================

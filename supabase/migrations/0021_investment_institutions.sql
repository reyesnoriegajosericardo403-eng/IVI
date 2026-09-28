-- ============================================================
-- Migración: 0021_investment_institutions
-- Fecha: 2026-09-28
-- Descripción: Inversiones organizadas por institución → producto.
--   - `broker` (ya existía) guarda el id de la institución del catálogo
--     (src/data/institutions.ts), p.ej. 'gbm'.
--   - `product`: id del producto dentro de la institución, p.ej.
--     'gbm_trading_usa'.
--   - `annual_rate`, `term_days`, `maturity_date`: datos que necesitan los
--     modelos de ahorro diario, inversión a plazo y CETES.
--   - Corrige un bug real: el check de asset_class no incluía 'cash', así
--     que las posiciones de Liquidez nunca podían sincronizarse. Se agrega
--     también 'savings' (ahorro con rendimiento: Cajitas, Smart Cash...).
--   Todo es aditivo: las posiciones existentes quedan intactas y se
--   muestran en "Otras inversiones" hasta que el usuario las mueva.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

alter table public.investments drop constraint if exists investments_asset_class_check;
alter table public.investments add constraint investments_asset_class_check
  check (asset_class in ('stock', 'etf', 'fibra', 'cetes', 'bond', 'fund', 'crypto', 'cash', 'savings', 'other'));

alter table public.investments add column if not exists product text;
alter table public.investments add column if not exists annual_rate numeric;
alter table public.investments add column if not exists term_days integer;
alter table public.investments add column if not exists maturity_date date;

-- ============================================================
-- ROLLBACK:
--
-- alter table public.investments drop column if exists maturity_date;
-- alter table public.investments drop column if exists term_days;
-- alter table public.investments drop column if exists annual_rate;
-- alter table public.investments drop column if exists product;
-- alter table public.investments drop constraint if exists investments_asset_class_check;
-- alter table public.investments add constraint investments_asset_class_check
--   check (asset_class in ('stock', 'etf', 'fibra', 'cetes', 'bond', 'fund', 'crypto', 'other'));
-- (antes de revertir, mover filas 'cash'/'savings' a 'other')
-- ============================================================

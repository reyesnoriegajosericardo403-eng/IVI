-- ============================================================
-- Migración: 0007_investment_realized_pnl
-- Fecha: 2026-08-29
-- Descripción: Guarda la ganancia o pérdida ya realizada de cada
--   posición (al vender una parte), calculada solo con los propios
--   datos del usuario — nunca con precios de mercado inventados.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

alter table public.investments add column if not exists realized_pnl numeric;

-- ============================================================
-- ROLLBACK:
--
-- alter table public.investments drop column if exists realized_pnl;
-- ============================================================

-- ============================================================
-- Migración: 0006_liability_notes
-- Fecha: 2026-08-29
-- Descripción: Agrega una nota libre a cada deuda, para recordatorios
--   de cuándo se debe pagar o cualquier detalle que el usuario quiera
--   anotar (además de la fecha de vencimiento, que ya existía).
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

alter table public.liabilities add column if not exists notes text;

-- ============================================================
-- ROLLBACK:
--
-- alter table public.liabilities drop column if exists notes;
-- ============================================================

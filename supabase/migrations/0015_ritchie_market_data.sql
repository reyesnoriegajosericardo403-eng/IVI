-- ============================================================
-- Migración: 0015_ritchie_market_data
-- Fecha: 2026-09-17
-- Descripción: Memoria persistente de RITCHIE (proyecto separado en este
--   mismo monorepo, servidor Python en Render — no la app VALU). Guarda
--   velas diarias (OHLCV) de cualquier activo que RITCHIE haya conseguido
--   alguna vez, sea de una fuente en línea (Yahoo/Stooq/Alpha Vantage) o de
--   un CSV que la persona subió a mano cuando ninguna fuente respondía.
--
--   No es información personal de ningún usuario — es historial de mercado,
--   el mismo dato sin importar quién pregunte — así que NO sigue el patrón
--   de auth.users/RLS-por-usuario del resto de este archivo de migraciones.
--   Se protege con RLS activado pero SIN políticas para anon/authenticated:
--   nadie puede leer ni escribir desde el cliente. El único que entra es el
--   servidor de RITCHIE, autenticado con la service_role key (que Supabase
--   deja saltarse RLS por diseño). Así la tabla vive en el mismo proyecto
--   de Supabase que ya existe para VALU sin exponer nada nuevo al público.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

create table if not exists public.ritchie_market_data (
  symbol text not null,
  session_date date not null,
  open double precision,
  high double precision,
  low double precision,
  close double precision not null,
  adj_close double precision,
  volume double precision,
  source text not null default 'desconocida',
  updated_at timestamptz not null default now(),
  primary key (symbol, session_date)
);

create index if not exists ritchie_market_data_symbol_idx
  on public.ritchie_market_data (symbol, session_date);

alter table public.ritchie_market_data enable row level security;
-- A propósito: cero políticas. anon/authenticated no pueden tocar esta
-- tabla ni para leer; solo la service_role key (uso exclusivo del servidor
-- de RITCHIE) puede, porque ese rol ignora RLS por completo.

-- ============================================================
-- ROLLBACK:
--
-- drop table if exists public.ritchie_market_data;
-- ============================================================

-- ============================================================
-- Migración: 0022_category_mappings
-- Fecha: 2026-10-03
-- Descripción: "Lo que VALU aprendió de ti" (mapeo personal de palabras → categoría) viaja con la cuenta.
--   Hasta ahora vivía solo en el dispositivo: al reinstalar la app o abrir otro teléfono se perdía.
--   Un renglón por palabra aprendida por persona (llave: user_id + keyword), así dos dispositivos que
--   aprenden la misma palabra nunca duplican: gana la corrección más reciente (updated_at lo fija el
--   servidor, como en las demás tablas).
--   Es la capa PERSONAL de la red de palabras del motor local; el vocabulario común (público) no vive aquí,
--   viaja dentro de la app (src/data/keywordPacks). Solo el dueño ve y escribe sus palabras (RLS).
--   Los borrados son suaves (deleted_at) para que el borrado llegue a los demás dispositivos.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

create table if not exists public.category_mappings (
  user_id uuid not null references auth.users (id) on delete cascade,
  keyword text not null check (char_length(keyword) between 2 and 60),
  category_id text not null,
  subcategory_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, keyword)
);

create index if not exists category_mappings_user_updated_idx on public.category_mappings (user_id, updated_at);

alter table public.category_mappings enable row level security;
create policy "category_mappings_select_own" on public.category_mappings for select using (auth.uid() = user_id);
create policy "category_mappings_insert_own" on public.category_mappings for insert with check (auth.uid() = user_id);
create policy "category_mappings_update_own" on public.category_mappings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "category_mappings_delete_own" on public.category_mappings for delete using (auth.uid() = user_id);

create trigger category_mappings_set_timestamps
  before insert or update on public.category_mappings
  for each row execute function public.set_sync_timestamps();

-- ============================================================
-- ROLLBACK:
--
-- drop table if exists public.category_mappings;
-- ============================================================

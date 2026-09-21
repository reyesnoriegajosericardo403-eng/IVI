-- Catálogo de estilos visuales publicables.
--
-- La apariencia de la app es dato, no código: cada fila describe un estilo
-- completo (colores y tokens de superficie, en claro y en oscuro) que la app
-- descarga al abrir. Eso permite publicar un estilo nuevo — o corregir uno ya
-- publicado, usando el mismo id que trae la app — sin sacar una versión nueva.
--
-- Lo que un estilo NO puede cambiar: navegación, funciones ni información.
-- Solo la estética.

create table if not exists public.ui_themes (
  id text primary key,
  name text not null,
  description text not null default '',
  -- permanent: siempre disponible.
  -- temporary: se ofrece hasta expires_at y luego devuelve al usuario a su
  --            último estilo permanente.
  -- archived:  deja de ofrecerse pero no se borra, para poder revivirlo.
  status text not null default 'permanent' check (status in ('permanent', 'temporary', 'archived')),
  version text not null default '1.0',
  -- { "light": { "colors": {...}, "surface": {...} }, "dark": { ... } }
  -- Son PARCIALES: solo hace falta declarar lo que cambia respecto del estilo
  -- base, así un tema mal escrito no puede dejar la app ilegible.
  tokens jsonb not null default '{}'::jsonb,
  preview_light text,
  preview_dark text,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ui_themes enable row level security;

-- Catálogo de solo lectura: cualquiera con sesión puede leerlo.
create policy "ui_themes_select_authenticated"
  on public.ui_themes for select
  to authenticated
  using (true);

-- A propósito NO hay policies de insert/update/delete: publicar un estilo se
-- hace desde el panel de Supabase o con la clave de servicio, nunca desde la
-- app. Así ningún cliente puede cambiarle la apariencia a los demás.

create trigger ui_themes_set_timestamps
  before insert or update on public.ui_themes
  for each row execute function public.set_sync_timestamps();

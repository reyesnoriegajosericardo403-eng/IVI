-- ============================================================
-- Migración: 0019_background_custom_uri_sync
-- Fecha: 2026-09-27
-- Descripción: Revierte la decisión de 0018 de dejar la foto propia
--   ("Mis fotos") fuera de la sincronización remota.
--
--   Motivo (reporte directo del usuario): un PWA instalado en iOS/iPadOS
--   borra por completo el almacenamiento local del sitio cuando se quita
--   el ícono de la pantalla de inicio — no es un simple caché. Una foto
--   que solo vive en `localStorage`/AsyncStorage desaparece para siempre
--   en cuanto eso pasa, incluso si el usuario vuelve a instalar la PWA e
--   inicia sesión con la misma cuenta. La única forma de que sobreviva
--   "pase lo que pase" es que viaje con el resto del perfil a Supabase.
--
--   Se guarda como texto (data: URI en base64, ya reescalada a un tamaño
--   manejable en app/appearance.tsx antes de llegar aquí) dentro de la
--   misma fila de `profiles`, reutilizando el mecanismo de subida con
--   reintentos que ya tiene el resto del perfil (profileDirty + runSync)
--   en vez de un bucket de Storage aparte — más simple, y el tamaño ya
--   comprimido (unos cientos de KB) no es un problema para una columna de
--   texto en Postgres.
--
--   Aditiva y reversible: solo agrega una columna nueva nullable.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

alter table public.profiles
  add column if not exists background_custom_uri text;

-- ============================================================
-- ROLLBACK:
--
-- alter table public.profiles
--   drop column if exists background_custom_uri;
-- ============================================================

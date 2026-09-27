-- ============================================================
-- Migración: 0018_appearance_palette_background
-- Fecha: 2026-09-27
-- Descripción: Sistema de apariencia "Vidrio líquido" (spec: paletas de
--   acento seleccionables + fondo fijo/catálogo/foto propia). Se guardan
--   en el perfil para que la elección viaje entre dispositivos, igual que
--   ya pasa con visual_style/theme_preference.
--
--   La foto PROPIA del usuario (background_custom_uri) es intencionalmente
--   NO una URL remota sincronizable en esta pasada — vive como URI local
--   del dispositivo, así que no se guarda aquí; solo sus AJUSTES
--   (oscuridad, desenfoque, punto focal) si el usuario la tiene activa.
--   Guardarlos igual permite que, al reinstalar o re-elegir la misma foto,
--   los ajustes no se pierdan.
--
--   Aditiva y reversible: solo agrega columnas nuevas nullable.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

alter table public.profiles
  add column if not exists accent_palette_id text,
  add column if not exists background_mode text check (background_mode in ('none', 'catalog', 'custom')),
  add column if not exists background_catalog_image_id text,
  add column if not exists background_focal_x_mobile numeric,
  add column if not exists background_focal_y_mobile numeric,
  add column if not exists background_focal_x_desktop numeric,
  add column if not exists background_focal_y_desktop numeric,
  add column if not exists background_darkness numeric,
  add column if not exists background_blur_amount numeric;

-- ============================================================
-- ROLLBACK:
--
-- alter table public.profiles
--   drop column if exists background_blur_amount,
--   drop column if exists background_darkness,
--   drop column if exists background_focal_y_desktop,
--   drop column if exists background_focal_x_desktop,
--   drop column if exists background_focal_y_mobile,
--   drop column if exists background_focal_x_mobile,
--   drop column if exists background_catalog_image_id,
--   drop column if exists background_mode,
--   drop column if exists accent_palette_id;
-- ============================================================

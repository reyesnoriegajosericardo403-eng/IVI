-- Estilo visual elegido por cada usuario.
--
-- Va en el perfil (y no en el dispositivo) para que la elección lo siga entre
-- sus dispositivos, igual que ya pasa con claro/oscuro. Son independientes:
-- el estilo define la estética, theme_preference define claro u oscuro.
alter table public.profiles
  add column if not exists visual_style text;

-- Último estilo PERMANENTE que tuvo puesto: si eligió uno temporal y este
-- caduca, regresa aquí en vez de quedarse sin estilo.
alter table public.profiles
  add column if not exists last_permanent_visual_style text;

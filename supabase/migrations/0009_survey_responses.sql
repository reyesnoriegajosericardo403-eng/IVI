-- ============================================================
-- Migración: 0009_survey_responses
-- Fecha: 2026-08-31
-- Descripción: Respuestas de la encuesta de bienvenida (6 preguntas)
--   que se aplica una sola vez, durante el onboarding, antes de que
--   la persona vea el dashboard. Sirve para conocer a los usuarios
--   (edad, ocupación, objetivo, experiencia, cómo llegaron, su mayor
--   reto) y así mejorar la app. Es de solo escritura desde el
--   cliente — nunca se lee de vuelta dentro de la app; para revisar
--   las respuestas de todos los usuarios, el dueño del proyecto entra
--   al Table Editor de Supabase directamente.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

create table if not exists public.survey_responses (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  age text,
  occupation text,
  goal text,
  experience text,
  discovery text,
  challenge text,
  platform text,
  created_at timestamptz not null default now()
);

create index if not exists survey_responses_user_id_idx on public.survey_responses (user_id);

alter table public.survey_responses enable row level security;
create policy "survey_responses_select_own" on public.survey_responses for select using (auth.uid() = user_id);
create policy "survey_responses_insert_own" on public.survey_responses for insert with check (auth.uid() = user_id);
-- Sin policy de update/delete: la encuesta se responde una sola vez y no
-- se edita — igual que audit_log, es de solo lectura una vez escrita.

-- ============================================================
-- ROLLBACK:
--
-- drop table if exists public.survey_responses;
-- ============================================================

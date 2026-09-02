-- ============================================================
-- Migración: 0013_survey_sex_column
-- Fecha: 2026-09-02
-- Descripción: Agrega la respuesta de "sexo" a la encuesta de
--   bienvenida (Hombre/Mujer/Prefiero no decirlo), recogida ahora en
--   el paso de perfil junto con la edad. La edad ya no es un rango de
--   la encuesta (18-24, 25-34...) sino el número real que la persona
--   eligió, y de paso decide qué tono de encuesta/anuncio ve (0-22
--   casual, 23-100 formal) — ver src/data/onboardingSurvey.ts.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

alter table public.survey_responses add column if not exists sex text;

-- ============================================================
-- ROLLBACK:
--
-- alter table public.survey_responses drop column if exists sex;
-- ============================================================


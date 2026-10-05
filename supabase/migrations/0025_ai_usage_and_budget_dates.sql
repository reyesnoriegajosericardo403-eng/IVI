-- ============================================================
-- Migración: 0025_ai_usage_and_budget_dates
-- Fecha: 2026-10-05
-- Descripción:
--   1. ai_usage: cuántas consultas a la IA integrada hizo cada persona cada día (para la cuota diaria de la
--      función ai-agent). Solo números: nunca el contenido de la conversación. La persona puede leer su propio
--      conteo; nadie desde la app puede escribirlo (solo la función, con la llave de servicio, vía ai_usage_add).
--   2. budgets: columnas day_of_month, day_of_week y one_time_date, que hasta hoy solo vivían en el dispositivo
--      (las partidas de plantilla y las excepciones ya las tenían desde la 0014).
-- Es segura de correr más de una vez y no borra nada.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  requests integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_usage' and policyname = 'ai_usage_select_own') then
    create policy "ai_usage_select_own" on public.ai_usage for select using (auth.uid() = user_id);
  end if;
end $$;

-- Suma una consulta (y sus tokens) al día de la persona y devuelve cuántas lleva. Solo la función ai-agent la llama.
create or replace function public.ai_usage_add(p_user uuid, p_day date, p_in integer, p_out integer)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.ai_usage as u (user_id, day, requests, input_tokens, output_tokens, updated_at)
  values (p_user, p_day, 1, greatest(coalesce(p_in, 0), 0), greatest(coalesce(p_out, 0), 0), now())
  on conflict (user_id, day) do update
    set requests = u.requests + 1,
        input_tokens = u.input_tokens + greatest(coalesce(p_in, 0), 0),
        output_tokens = u.output_tokens + greatest(coalesce(p_out, 0), 0),
        updated_at = now()
  returning requests;
$$;

revoke all on function public.ai_usage_add(uuid, date, integer, integer) from public;
revoke all on function public.ai_usage_add(uuid, date, integer, integer) from anon, authenticated;
grant execute on function public.ai_usage_add(uuid, date, integer, integer) to service_role;

-- Mismo tipo que en template_budget_lines (0014), sin restricciones extra para no frenar nunca la sincronización.
alter table public.budgets add column if not exists day_of_month integer;
alter table public.budgets add column if not exists day_of_week integer;
alter table public.budgets add column if not exists one_time_date date;

-- ============================================================
-- ROLLBACK:
--
-- drop function if exists public.ai_usage_add(uuid, date, integer, integer);
-- drop table if exists public.ai_usage;
-- alter table public.budgets drop column if exists day_of_month, drop column if exists day_of_week, drop column if exists one_time_date;
-- ============================================================

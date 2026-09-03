-- ============================================================
-- Migración: 0014_budget_templates
-- Fecha: 2026-09-03
-- Descripción: Presupuestos con nombre ("plantillas") que se aplican a
--   periodos específicos del calendario (spec: "puedes armar un
--   presupuesto... para tus días en clases... pero aparte puedes armar
--   un presupuesto para cuando estés en vacaciones... se pueden cargar
--   los presupuestos ya creados en el periodo que tú quieras").
--
--   Cuatro tablas:
--   - budget_templates: la plantilla en sí (nombre, tipo semana/mes/día,
--     color con el que se pinta en el calendario). La plantilla marcada
--     is_default es "Mi presupuesto", a la que se migró lo que ya
--     existía en `budgets`, y es la que aplica en cualquier periodo sin
--     plantilla asignada.
--   - template_budget_lines: los renglones (monto por concepto) de cada
--     plantilla — mismas columnas que `budgets`, agrupadas por plantilla.
--   - budget_assignments: qué plantilla está cargada en qué periodo.
--     period_key es "month:2026-09", "week:2026-09-07" (lunes de esa
--     semana) o "day:2026-09-15".
--   - period_budget_overrides: el ajuste de UN renglón para UN periodo,
--     cuando la persona lo editó ahí sin querer cambiar la plantilla
--     completa. monthly_amount null significa "este renglón no aplica en
--     este periodo" (por eso la columna acepta null a propósito).
--
--   La tabla `budgets` NO se toca ni se borra: sigue siendo el esquema
--   anterior y la fuente de los eventos de un día que ya existían.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

-- ---------- budget_templates ----------
create table if not exists public.budget_templates (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('week', 'month', 'day')),
  color text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists budget_templates_user_id_idx on public.budget_templates (user_id);
create index if not exists budget_templates_updated_at_idx on public.budget_templates (user_id, updated_at);

alter table public.budget_templates enable row level security;
create policy "budget_templates_select_own" on public.budget_templates for select using (auth.uid() = user_id);
create policy "budget_templates_insert_own" on public.budget_templates for insert with check (auth.uid() = user_id);
create policy "budget_templates_update_own" on public.budget_templates for update using (auth.uid() = user_id);
create policy "budget_templates_delete_own" on public.budget_templates for delete using (auth.uid() = user_id);

create trigger budget_templates_set_timestamps
  before insert or update on public.budget_templates
  for each row execute function public.set_sync_timestamps();

-- ---------- template_budget_lines ----------
create table if not exists public.template_budget_lines (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid not null references public.budget_templates (id) on delete cascade,
  category_id text not null,
  monthly_amount numeric not null,
  currency text not null,
  periodicity text,
  frequency text,
  custom_days_per_week integer,
  base_amount numeric,
  day_of_month integer,
  day_of_week integer,
  one_time_date date,
  target_account_id uuid,
  included_account_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists template_budget_lines_user_id_idx on public.template_budget_lines (user_id);
create index if not exists template_budget_lines_template_idx on public.template_budget_lines (template_id);
create index if not exists template_budget_lines_updated_at_idx on public.template_budget_lines (user_id, updated_at);

alter table public.template_budget_lines enable row level security;
create policy "template_budget_lines_select_own" on public.template_budget_lines for select using (auth.uid() = user_id);
create policy "template_budget_lines_insert_own" on public.template_budget_lines for insert with check (auth.uid() = user_id);
create policy "template_budget_lines_update_own" on public.template_budget_lines for update using (auth.uid() = user_id);
create policy "template_budget_lines_delete_own" on public.template_budget_lines for delete using (auth.uid() = user_id);

create trigger template_budget_lines_set_timestamps
  before insert or update on public.template_budget_lines
  for each row execute function public.set_sync_timestamps();

-- ---------- budget_assignments ----------
create table if not exists public.budget_assignments (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid not null references public.budget_templates (id) on delete cascade,
  period_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists budget_assignments_user_id_idx on public.budget_assignments (user_id);
create index if not exists budget_assignments_period_idx on public.budget_assignments (user_id, period_key);
create index if not exists budget_assignments_updated_at_idx on public.budget_assignments (user_id, updated_at);

alter table public.budget_assignments enable row level security;
create policy "budget_assignments_select_own" on public.budget_assignments for select using (auth.uid() = user_id);
create policy "budget_assignments_insert_own" on public.budget_assignments for insert with check (auth.uid() = user_id);
create policy "budget_assignments_update_own" on public.budget_assignments for update using (auth.uid() = user_id);
create policy "budget_assignments_delete_own" on public.budget_assignments for delete using (auth.uid() = user_id);

create trigger budget_assignments_set_timestamps
  before insert or update on public.budget_assignments
  for each row execute function public.set_sync_timestamps();

-- ---------- period_budget_overrides ----------
create table if not exists public.period_budget_overrides (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  assignment_id uuid not null references public.budget_assignments (id) on delete cascade,
  category_id text not null,
  -- null a propósito: significa "este renglón no aplica en este periodo".
  monthly_amount numeric,
  periodicity text,
  frequency text,
  custom_days_per_week integer,
  base_amount numeric,
  day_of_month integer,
  day_of_week integer,
  one_time_date date,
  target_account_id uuid,
  included_account_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists period_budget_overrides_user_id_idx on public.period_budget_overrides (user_id);
create index if not exists period_budget_overrides_assignment_idx on public.period_budget_overrides (assignment_id);
create index if not exists period_budget_overrides_updated_at_idx on public.period_budget_overrides (user_id, updated_at);

alter table public.period_budget_overrides enable row level security;
create policy "period_budget_overrides_select_own" on public.period_budget_overrides for select using (auth.uid() = user_id);
create policy "period_budget_overrides_insert_own" on public.period_budget_overrides for insert with check (auth.uid() = user_id);
create policy "period_budget_overrides_update_own" on public.period_budget_overrides for update using (auth.uid() = user_id);
create policy "period_budget_overrides_delete_own" on public.period_budget_overrides for delete using (auth.uid() = user_id);

create trigger period_budget_overrides_set_timestamps
  before insert or update on public.period_budget_overrides
  for each row execute function public.set_sync_timestamps();

-- ============================================================
-- ROLLBACK:
--
-- drop table if exists public.period_budget_overrides;
-- drop table if exists public.budget_assignments;
-- drop table if exists public.template_budget_lines;
-- drop table if exists public.budget_templates;
-- ============================================================

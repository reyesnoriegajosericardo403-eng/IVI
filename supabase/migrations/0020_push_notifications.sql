-- ============================================================
-- Migración: 0020_push_notifications
-- Fecha: 2026-09-28
-- Descripción: Notificaciones push reales al celular (Web Push de la
--   PWA instalada en iOS 16.4+ / Android). Tres tablas:
--   - push_subscriptions: un renglón por dispositivo/navegador donde el
--     usuario activó avisos. Solo la función push-notify (service role)
--     escribe aquí: así un mismo teléfono que cambia de cuenta se
--     reasigna sin chocar con RLS, y nadie puede registrar el endpoint
--     de otra persona.
--   - notification_settings: qué avisos quiere cada usuario y a qué hora,
--     en su zona horaria. La escribe el propio usuario (RLS).
--   - notification_log: bitácora de idempotencia — un aviso con la misma
--     dedupe_key jamás se envía dos veces, aunque el cron corra de más.
--   Nunca se guarda el contenido del aviso ni montos: solo tipo y llave.
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz,
  failure_count integer not null default 0
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
-- Solo lectura para el dueño (para mostrar "este dispositivo tiene avisos
-- activos"); insertar/editar/borrar lo hace únicamente la función.
create policy "push_subscriptions_select_own" on public.push_subscriptions for select using (auth.uid() = user_id);

create table if not exists public.notification_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default true,
  debt_due boolean not null default true,
  daily_log_reminder boolean not null default false,
  daily_reminder_hour smallint not null default 21 check (daily_reminder_hour between 0 and 23),
  timezone text not null default 'America/Mexico_City',
  updated_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;
create policy "notification_settings_select_own" on public.notification_settings for select using (auth.uid() = user_id);
create policy "notification_settings_insert_own" on public.notification_settings for insert with check (auth.uid() = user_id);
create policy "notification_settings_update_own" on public.notification_settings for update using (auth.uid() = user_id);
create policy "notification_settings_delete_own" on public.notification_settings for delete using (auth.uid() = user_id);

create table if not exists public.notification_log (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  dedupe_key text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

alter table public.notification_log enable row level security;
create policy "notification_log_select_own" on public.notification_log for select using (auth.uid() = user_id);

-- ============================================================
-- ROLLBACK:
--
-- drop table if exists public.notification_log;
-- drop table if exists public.notification_settings;
-- drop table if exists public.push_subscriptions;
-- ============================================================

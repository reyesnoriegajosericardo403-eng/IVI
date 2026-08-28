-- ============================================================
-- Migración: 0005_audit_log
-- Fecha: 2026-08-28
-- Descripción: Historial de auditoría para operaciones sensibles
--   (spec sección 84). El cliente registra sus propias entradas al
--   editar saldos; además, esta migración añade triggers del lado
--   del servidor que registran cambios de saldo en accounts y
--   liabilities automáticamente, por si el cliente no lo hizo
--   (offline, error de red a media sincronización, etc.).
-- Rollback: ver bloque comentado al final del archivo.
-- ============================================================

create table if not exists public.audit_log (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null check (entity_type in ('account', 'transaction', 'budget', 'goal', 'investment', 'liability')),
  entity_id uuid not null,
  action text not null check (action in ('create', 'update', 'delete')),
  summary text not null,
  previous_value numeric,
  new_value numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists audit_log_user_id_idx on public.audit_log (user_id, created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id);

alter table public.audit_log enable row level security;
create policy "audit_log_select_own" on public.audit_log for select using (auth.uid() = user_id);
create policy "audit_log_insert_own" on public.audit_log for insert with check (auth.uid() = user_id);
-- Sin policy de update/delete: el registro de auditoría es de solo
-- lectura una vez escrito (principio de no destrucción, spec 85).

create trigger audit_log_set_timestamps
  before insert or update on public.audit_log
  for each row execute function public.set_sync_timestamps();

-- ---------- Auditoría automática de cambios de saldo ----------
create or replace function public.audit_balance_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  entity text;
  label text;
begin
  if TG_TABLE_NAME = 'accounts' then
    entity := 'account';
    label := new.name;
  else
    entity := 'liability';
    label := new.institution;
  end if;

  if new.balance is distinct from old.balance then
    insert into public.audit_log (id, user_id, entity_type, entity_id, action, summary, previous_value, new_value)
    values (
      gen_random_uuid(),
      new.user_id,
      entity,
      new.id,
      'update',
      format('Saldo de "%s": %s → %s', label, old.balance, new.balance),
      old.balance,
      new.balance
    );
  end if;
  return new;
end;
$$;

create trigger accounts_audit_balance
  after update on public.accounts
  for each row execute function public.audit_balance_change();

create trigger liabilities_audit_balance
  after update on public.liabilities
  for each row execute function public.audit_balance_change();

-- ============================================================
-- ROLLBACK:
--
-- drop trigger if exists liabilities_audit_balance on public.liabilities;
-- drop trigger if exists accounts_audit_balance on public.accounts;
-- drop function if exists public.audit_balance_change();
-- drop trigger if exists audit_log_set_timestamps on public.audit_log;
-- drop table if exists public.audit_log;
-- ============================================================

import { isSupabaseConfigured, supabase } from '@/services/supabase/client';
import { pushRemoteProfile } from '@/services/supabase/profileRepository';
import { repositoryByTable } from '@/services/supabase/repositories';
import { useAppStore } from '@/store/useAppStore';
import type { SyncTable } from './types';

// Las 12 tablas de SyncTable, completas — un olvido aquí es una fuga
// silenciosa de una sola vía: pushPendingChanges() sí sube cualquier tabla
// (usa repositoryByTable directo desde la cola), pero pullRemoteChanges()
// solo trae de vuelta las que estén en esta lista. Encontrado en auditoría
// 2026-09-27: faltaban las 4 tablas de presupuestos con nombre —
// funcionaban al escribir, pero un segundo dispositivo (o una
// reinstalación) nunca veía esos cambios de vuelta.
const ALL_TABLES: SyncTable[] = [
  'accounts',
  'transactions',
  'budgets',
  'budget_templates',
  'template_budget_lines',
  'budget_assignments',
  'period_budget_overrides',
  'goals',
  'investments',
  'liabilities',
  'net_worth_snapshots',
  'audit_log',
];

async function getUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export interface SyncResult {
  ranAsWorking: boolean;
  pushed: number;
  pushFailed: number;
  pulled: number;
  error?: string;
}

// Empuja la cola de cambios pendientes hacia Supabase. Cada entrada que
// falla se queda en la cola para reintentarse en el próximo ciclo — nunca
// se descarta un cambio del usuario por un error de red (spec 74, 85).
async function pushPendingChanges(userId: string): Promise<{ pushed: number; failed: number }> {
  const { pendingSync, clearSyncQueueEntries } = useAppStore.getState();
  const succeeded: string[] = [];
  let failed = 0;

  for (const entry of pendingSync) {
    if (!entry.payload) continue;
    try {
      const repo = repositoryByTable[entry.table];
      await repo.upsert(userId, entry.payload);
      succeeded.push(entry.id);
    } catch {
      failed += 1;
    }
  }

  if (succeeded.length > 0) clearSyncQueueEntries(succeeded);
  return { pushed: succeeded.length, failed };
}

// El perfil es una fila singleton (no una lista como el resto de tablas),
// así que no pasa por `pendingSync`/`repositoryByTable` — pero SÍ necesita
// el mismo trato de reintento automático: antes de esto, un cambio de
// perfil (nombre, foto de fondo, paleta...) se subía una sola vez sin
// reintentos vía `usePushProfileOnChange`, y si esa subida fallaba en
// silencio, la próxima sesión traía de vuelta el perfil viejo de Supabase y
// "borraba" el cambio (bug reportado: nombre y foto volvían a como estaban
// antes tras cerrar la app). Ahora corre en cada ciclo de runSync() —igual
// que pushPendingChanges— y solo limpia `profileDirty` si de verdad se
// confirmó en el servidor.
async function pushProfileIfDirty(userId: string): Promise<void> {
  const { profile, profileDirty, markProfileSynced } = useAppStore.getState();
  if (!profileDirty) return;
  try {
    await pushRemoteProfile(userId, profile);
    // Puede haber cambiado de nuevo MIENTRAS se subía — solo se marca
    // sincronizado si sigue siendo el mismo perfil que se acaba de subir,
    // para no perder una edición hecha a mitad de la subida.
    if (useAppStore.getState().profile === profile) markProfileSynced();
  } catch {
    // Se queda profileDirty=true — el próximo ciclo (60s, o al reabrir la
    // app) lo vuelve a intentar. Nunca se descarta un cambio por un error
    // de red, mismo criterio que pushPendingChanges.
  }
}

// Camino de emergencia SIN el candado `syncInFlight` de runSync() —
// deliberado: un celular real puede terminar el proceso de un PWA por
// completo al quitarlo de "apps activas" (no solo pasarlo a segundo
// plano), y eso puede borrar hasta el almacenamiento local del propio
// dispositivo (spec 2026-09-27, reporte del usuario: "cuando lo quito de
// apps activas se borra todo"). Contra eso ningún reintento posterior
// sirve — lo único que puede salvar el cambio es que la subida a Supabase
// ya haya salido ANTES de que el proceso muera. Se dispara en cuanto la
// pestaña se oculta (visibilitychange), no cada 60s ni tras esperar a que
// termine un runSync() ya en curso — subir el mismo perfil dos veces en
// paralelo es inofensivo (upsert), así que no hace falta el candado.
export async function pushProfileNow(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const userId = await getUserId();
  if (!userId) return;
  await pushProfileIfDirty(userId);
}

// Trae los cambios del backend hechos desde otros dispositivos y los
// fusiona localmente con "el más reciente gana" por updated_at.
async function pullRemoteChanges(userId: string): Promise<number> {
  const { lastSyncedAt, mergeRemoteRecords, setLastSyncedAt } = useAppStore.getState();
  const syncStartedAt = new Date().toISOString();
  let pulled = 0;

  for (const table of ALL_TABLES) {
    const repo = repositoryByTable[table];
    const records = await repo.list(userId, lastSyncedAt ?? undefined);
    if (records.length > 0) {
      mergeRemoteRecords(table, records);
      pulled += records.length;
    }
  }

  setLastSyncedAt(syncStartedAt);
  return pulled;
}

let syncInFlight = false;

// Punto de entrada único: empuja primero (para que las ediciones locales
// no se pisen con una lectura vieja) y luego trae lo nuevo del servidor.
// Si Supabase no está configurado o no hay sesión, no hace nada — la app
// sigue funcionando en modo local (spec 20). El perfil sube ANTES que la
// cola de entidades (cuentas/transacciones/etc.): es la parte más urgente
// (spec 2026-09-27, foto/nombre perdidos) y suele ser un payload pequeño —
// si el proceso muere a medio runSync(), que sea la cola grande la que se
// quede sin subir, no el perfil.
export async function runSync(): Promise<SyncResult> {
  if (syncInFlight) return { ranAsWorking: false, pushed: 0, pushFailed: 0, pulled: 0 };
  if (!isSupabaseConfigured) return { ranAsWorking: false, pushed: 0, pushFailed: 0, pulled: 0 };

  syncInFlight = true;
  try {
    const userId = await getUserId();
    if (!userId) return { ranAsWorking: false, pushed: 0, pushFailed: 0, pulled: 0 };

    await pushProfileIfDirty(userId);
    const { pushed, failed } = await pushPendingChanges(userId);
    const pulled = await pullRemoteChanges(userId);

    return { ranAsWorking: true, pushed, pushFailed: failed, pulled };
  } catch (err) {
    return {
      ranAsWorking: true,
      pushed: 0,
      pushFailed: 0,
      pulled: 0,
      error: err instanceof Error ? err.message : 'Error desconocido de sincronización',
    };
  } finally {
    syncInFlight = false;
  }
}

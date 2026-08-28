import { isSupabaseConfigured, supabase } from '@/services/supabase/client';
import { repositoryByTable } from '@/services/supabase/repositories';
import { useAppStore } from '@/store/useAppStore';
import type { SyncTable } from './types';

const ALL_TABLES: SyncTable[] = [
  'accounts',
  'transactions',
  'budgets',
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
// sigue funcionando en modo local (spec 20).
export async function runSync(): Promise<SyncResult> {
  if (syncInFlight) return { ranAsWorking: false, pushed: 0, pushFailed: 0, pulled: 0 };
  if (!isSupabaseConfigured) return { ranAsWorking: false, pushed: 0, pushFailed: 0, pulled: 0 };

  syncInFlight = true;
  try {
    const userId = await getUserId();
    if (!userId) return { ranAsWorking: false, pushed: 0, pushFailed: 0, pulled: 0 };

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

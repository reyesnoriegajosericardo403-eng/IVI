import { useEffect } from 'react';

import { runSync } from './SyncEngine';

const SYNC_INTERVAL_MS = 60_000;

// Sincroniza al abrir la app y cada minuto mientras sigue abierta. No hace
// nada si Supabase no está configurado o no hay sesión — es seguro
// montarlo siempre, incluso en modo local (spec 49, 50, 76).
export function useSyncEngine() {
  useEffect(() => {
    runSync();
    const interval = setInterval(runSync, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}

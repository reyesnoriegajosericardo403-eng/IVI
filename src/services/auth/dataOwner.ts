import { useEffect } from 'react';

import { useAppStore } from '@/store/useAppStore';

// En un dispositivo compartido, los datos de la persona anterior no deben acabar en la cuenta de quien entra después
// (ni mostrarse ni subirse a su nube). Se recuerda de quién son los datos locales; si inicia sesión otra cuenta, se
// borran antes de sincronizar. Si los datos eran del modo local (sin cuenta), se adoptan: es el flujo de «ya usaba
// VALU y ahora creo mi cuenta».
const KEY = 'valu.data.owner';

export type OwnerDecision = 'adopt' | 'keep' | 'wipe';

export function decideOwner(storedOwner: string | null, userId: string): OwnerDecision {
  if (!storedOwner) return 'adopt';
  return storedOwner === userId ? 'keep' : 'wipe';
}

function readOwner(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  } catch {
    return null;
  }
}

function writeOwner(userId: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, userId);
  } catch {
    // sin almacenamiento: no se puede proteger; se queda como antes
  }
}

export function useDataOwnerGuard(userId: string | null | undefined): void {
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  useEffect(() => {
    if (!userId || !hasHydrated) return;
    const decision = decideOwner(readOwner(), userId);
    if (decision === 'wipe') useAppStore.getState().resetAll();
    if (decision !== 'keep') writeOwner(userId);
  }, [userId, hasHydrated]);
}

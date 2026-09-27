import { useEffect, useRef, useState } from 'react';

import { fetchRemoteProfile } from '@/services/supabase/profileRepository';
import { runSync } from '@/services/sync/SyncEngine';
import { useAppStore } from '@/store/useAppStore';

// Cuando alguien inicia sesión, reconcilia el perfil local con el remoto:
// si ya completó onboarding en otro dispositivo (o en un intento anterior
// en este mismo navegador), adopta ese perfil; si completó onboarding
// localmente sin haber iniciado sesión antes (primer uso offline), marca el
// perfil como pendiente de subir — `runSync()` (llamado aquí mismo y cada
// 60s por useSyncEngine) lo sube con reintentos, nunca en un intento único
// que pueda perderse en silencio. Expone `ready` para que quien decida a
// dónde navegar (app/index.tsx) espere a saber el estado REAL antes de
// decidir — nunca confía en el estado local a ciegas, que puede venir de un
// intento de registro anterior con otra cuenta en el mismo navegador.
export function useProfileReconciliation(userId: string | null): { ready: boolean } {
  const [readyForUserId, setReadyForUserId] = useState<string | null>(null);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    if (startedFor.current === userId) return;
    startedFor.current = userId;

    (async () => {
      try {
        const remote = await fetchRemoteProfile(userId);
        const { profile, adoptRemoteProfile, markProfileDirty } = useAppStore.getState();

        if (remote?.onboardingComplete) {
          adoptRemoteProfile(remote);
        } else if (profile.onboardingComplete) {
          markProfileDirty();
          runSync();
        }
      } finally {
        setReadyForUserId(userId);
      }
    })();
  }, [userId]);

  return { ready: userId === null || readyForUserId === userId };
}

// Mientras hay sesión, cualquier cambio posterior de perfil (tema, moneda,
// nombre, foto de fondo...) queda marcado `profileDirty` por el store — este
// hook solo dispara un runSync() de inmediato para que la confirmación
// llegue rápido, en vez de esperar hasta el próximo tick de 60s. runSync()
// es quien de verdad sube el cambio y lo reintenta si falla (SyncEngine.ts,
// pushProfileIfDirty) — este hook nunca toca Supabase directamente.
export function usePushProfileOnChange(userId: string | null) {
  const profileDirty = useAppStore((s) => s.profileDirty);

  useEffect(() => {
    if (!userId || !profileDirty) return;
    runSync();
  }, [userId, profileDirty]);
}

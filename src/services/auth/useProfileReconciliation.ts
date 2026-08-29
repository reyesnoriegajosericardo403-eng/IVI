import { useEffect, useRef, useState } from 'react';

import { fetchRemoteProfile, pushRemoteProfile } from '@/services/supabase/profileRepository';
import { useAppStore } from '@/store/useAppStore';

// Cuando alguien inicia sesión, reconcilia el perfil local con el remoto:
// si ya completó onboarding en otro dispositivo (o en un intento anterior
// en este mismo navegador), adopta ese perfil; si completó onboarding
// localmente sin haber iniciado sesión antes (primer uso offline), sube
// ese perfil al servidor. Expone `ready` para que quien decida a dónde
// navegar (app/index.tsx) espere a saber el estado REAL antes de decidir
// — nunca confía en el estado local a ciegas, que puede venir de un
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
        const { profile, completeOnboarding } = useAppStore.getState();

        if (remote?.onboardingComplete) {
          completeOnboarding(remote);
        } else if (profile.onboardingComplete) {
          await pushRemoteProfile(userId, profile);
        }
      } finally {
        setReadyForUserId(userId);
      }
    })();
  }, [userId]);

  return { ready: userId === null || readyForUserId === userId };
}

// Mientras hay sesión, cualquier cambio posterior de perfil (tema,
// moneda, nombre) se sube también — se omite el primer disparo para no
// pisar el perfil recién reconciliado con el estado previo a iniciar
// sesión.
export function usePushProfileOnChange(userId: string | null) {
  const profile = useAppStore((s) => s.profile);
  const skippedFirst = useRef(false);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    if (lastUserId.current !== userId) {
      lastUserId.current = userId;
      skippedFirst.current = false;
      return;
    }
    if (!skippedFirst.current) {
      skippedFirst.current = true;
      return;
    }
    pushRemoteProfile(userId, profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, profile]);
}

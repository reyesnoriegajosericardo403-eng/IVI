import { useEffect, useRef } from 'react';

import { fetchRemoteProfile, pushRemoteProfile } from '@/services/supabase/profileRepository';
import { useAppStore } from '@/store/useAppStore';

// Cuando alguien inicia sesión, reconcilia el perfil local con el remoto:
// si ya completó onboarding en otro dispositivo, adopta ese perfil; si
// completó onboarding localmente sin haber iniciado sesión antes (primer
// uso offline), sube ese perfil al servidor. Corre una sola vez por
// sesión iniciada, no en cada render (spec 76).
export function useProfileReconciliation(userId: string | null) {
  const reconciledFor = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || reconciledFor.current === userId) return;
    reconciledFor.current = userId;

    (async () => {
      const remote = await fetchRemoteProfile(userId);
      const { profile, completeOnboarding } = useAppStore.getState();

      if (remote?.onboardingComplete) {
        completeOnboarding(remote);
      } else if (profile.onboardingComplete) {
        await pushRemoteProfile(userId, profile);
      }
    })();
  }, [userId]);
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

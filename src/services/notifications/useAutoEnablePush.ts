import { useEffect } from 'react';
import { Platform } from 'react-native';

import { webPushNotificationProvider as provider } from '@/providers/notifications/webPushNotificationProvider';

import { markPushAsked, pushAlreadyAsked, pushOptedOut } from './pushPreference';

// Avisos activados por defecto. Los navegadores solo dejan pedir el permiso
// dentro de un toque del usuario, así que se pide en el primer toque tras
// iniciar sesión (una sola vez). Si el permiso ya estaba concedido pero la
// suscripción se perdió, se renueva sin preguntar. Si el usuario los apagó, se respeta.
export function useAutoEnablePush(userId: string | null | undefined) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !userId || typeof window === 'undefined') return;
    if (!provider.getSupport(true).supported || pushOptedOut()) return;

    let cancelled = false;
    let listening = false;
    const onFirstTouch = () => {
      window.removeEventListener('pointerup', onFirstTouch, true);
      listening = false;
      if (cancelled) return;
      markPushAsked();
      void provider.enable();
    };

    void (async () => {
      if (await provider.isSubscribed().catch(() => false)) return;
      if (cancelled) return;
      const permission = provider.getPermission();
      if (permission === 'granted') {
        void provider.enable();
      } else if (permission === 'default' && !pushAlreadyAsked()) {
        window.addEventListener('pointerup', onFirstTouch, true);
        listening = true;
      }
    })();

    return () => {
      cancelled = true;
      if (listening) window.removeEventListener('pointerup', onFirstTouch, true);
    };
  }, [userId]);
}

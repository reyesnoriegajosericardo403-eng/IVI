// Mantiene al día lo que P3 genera por adelantado (previstos de reglas recurrentes y ocurrencias de avisos).
// Corre al abrir la app, cada 10 minutos y cada vez que la app vuelve a primer plano — así un aviso o un pago previsto
// nunca depende de que la persona haya abierto una pantalla concreta. Es idempotente (ver store.runMaterialization).
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { useAppStore } from '@/store/useAppStore';

const INTERVAL_MS = 10 * 60_000;

export function useMaterialization(): void {
  const hasHydrated = useAppStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    const run = () => {
      try {
        useAppStore.getState().runMaterialization();
      } catch {
        // Nunca debe tirar la app: se reintenta en la siguiente vuelta.
      }
    };
    run();
    const timer = setInterval(run, INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') run();
    };
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      sub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
  }, [hasHydrated]);
}

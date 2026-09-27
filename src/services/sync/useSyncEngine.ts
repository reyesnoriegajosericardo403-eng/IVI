import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { pushProfileNow, runSync } from './SyncEngine';

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

  // Un PWA instalado puede TERMINAR el proceso por completo al quitarlo de
  // "apps activas" (celular/iPad) — no solo pasarlo a segundo plano — y
  // eso puede borrar hasta el almacenamiento local del dispositivo (spec
  // 2026-09-27: "cuando lo quito de apps activas se borra todo"). Contra
  // eso, esperar al próximo tick de 60s no sirve — para cuando ese tick
  // llegara, el proceso ya pudo haber muerto. La única defensa real es
  // intentar subir lo pendiente en el PRIMER momento en que el sistema
  // avisa que la app se va a segundo plano — 'hidden' en web (más
  // confiable que 'beforeunload' en móvil, que casi nunca dispara a
  // tiempo) y el AppState de React Native en iOS/Android nativo.
  useEffect(() => {
    if (Platform.OS === 'web') {
      const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') pushProfileNow();
      };
      // 'pagehide' es redundante con 'visibilitychange' en la mayoría de
      // navegadores, pero Safari/WebKit en iOS tiene historial de no
      // disparar 'visibilitychange' de forma confiable cuando el PWA
      // instalado se quita de "apps activas" (a diferencia de solo
      // pasarlo a segundo plano) — con los dos, si uno falla el otro
      // puede alcanzar a disparar el envío de emergencia a tiempo.
      const onPageHide = () => pushProfileNow();
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('pagehide', onPageHide);
      return () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pagehide', onPageHide);
      };
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') pushProfileNow();
    });
    return () => sub.remove();
  }, []);
}

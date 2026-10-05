import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase, supabaseAnonPublicKey, supabaseProjectUrl } from '@/services/supabase/client';

import { setPushOptedOut } from '@/services/notifications/pushPreference';

import type { NotificationPermission, NotificationProvider, NotificationSupport } from '../types';

// Web Push para la PWA. En iPhone solo funciona con VALU instalada en la
// pantalla de inicio (iOS 16.4+); en Android funciona en Chrome instalada o
// no. La suscripción la guarda la función push-notify, nunca el cliente
// directo (ver supabase/migrations/0020_push_notifications.sql).

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPadOS se presenta como Mac con pantalla táctil.
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);
}

function browserSupportsPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function callFunction(action: string, extra: Record<string, unknown> = {}, withSession = true): Promise<any> {
  const baseUrl = (supabaseProjectUrl ?? '').replace(/\/+$/, '');
  let bearer = supabaseAnonPublicKey ?? '';
  if (withSession) {
    const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    const token = data.session?.access_token;
    if (!token) throw new Error('Inicia sesión para activar los avisos.');
    bearer = token;
  }
  const res = await fetch(`${baseUrl}/functions/v1/push-notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}`, apikey: supabaseAnonPublicKey ?? '' },
    body: JSON.stringify({ action, ...extra }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 404 && !body?.error) throw new Error('La función de avisos aún no está desplegada en el servidor.');
    throw new Error(body?.error ?? `Error del servidor (${res.status}).`);
  }
  return body;
}

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

export const webPushNotificationProvider: NotificationProvider = {
  name: 'web-push',

  getSupport(isSignedIn: boolean): NotificationSupport {
    if (Platform.OS !== 'web') return { supported: false, reason: 'native_pending' };
    if (!isSupabaseConfigured) return { supported: false, reason: 'no_backend' };
    if (isIos() && !isStandalone()) return { supported: false, reason: 'ios_needs_install' };
    if (!browserSupportsPush()) return { supported: false, reason: 'unsupported_browser' };
    if (!isSignedIn) return { supported: false, reason: 'signed_out' };
    return { supported: true };
  },

  getPermission(): NotificationPermission {
    if (!browserSupportsPush()) return 'default';
    return Notification.permission as NotificationPermission;
  },

  async isSubscribed(): Promise<boolean> {
    if (!browserSupportsPush()) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return Boolean(sub) && Notification.permission === 'granted';
  },

  async enable() {
    try {
      // Pedir permiso va primero y sin await previo: Safari solo lo acepta
      // si ocurre dentro del mismo toque del usuario.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return {
          ok: false as const,
          error:
            permission === 'denied'
              ? 'Bloqueaste los avisos. Actívalos en Ajustes del teléfono → VALU → Notificaciones.'
              : 'No se concedió el permiso de avisos.',
        };
      }
      const { publicKey } = await callFunction('config', {}, false);
      if (!publicKey) return { ok: false as const, error: 'El servidor todavía no tiene configuradas las llaves de avisos.' };

      const reg = await getRegistration();
      let sub = await reg.pushManager.getSubscription();
      const expectedKey = urlBase64ToUint8Array(publicKey);
      // Si la suscripción existente es de otras llaves VAPID, se renueva.
      const currentKey = sub?.options.applicationServerKey
        ? new Uint8Array(sub.options.applicationServerKey as ArrayBuffer)
        : null;
      if (sub && currentKey && currentKey.join(',') !== expectedKey.join(',')) {
        await sub.unsubscribe();
        sub = null;
      }
      if (!sub) {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: expectedKey as BufferSource });
      }
      await callFunction('subscribe', {
        subscription: sub.toJSON(),
        userAgent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setPushOptedOut(false);
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : 'No se pudieron activar los avisos.' };
    }
  },

  async disable() {
    setPushOptedOut(true);
    if (!browserSupportsPush()) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => {});
    await callFunction('unsubscribe', { endpoint }).catch(() => {});
  },

  async sendTest() {
    // Un push recién suscrito a veces falla en el primer intento (el servicio
    // de Apple/Google tarda en reconocer la suscripción): se reintenta solo.
    let lastError = 'No se pudo enviar el aviso de prueba.';
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1500));
      try {
        const result = await callFunction('test');
        if (result?.ok) return { ok: true as const, delivered: Number(result.delivered) || 0 };
        lastError = 'El servidor no pudo entregar el aviso a ningún dispositivo.';
      } catch (e) {
        lastError = e instanceof Error ? e.message : lastError;
        if (/sesión|desplegada|llaves/i.test(lastError)) break;
      }
    }
    return { ok: false as const, error: lastError };
  },
};

// push-notify: todo lo de notificaciones push de VALU en una sola función.
//
// Acciones (POST { action }):
//   - "config"      → devuelve la llave pública VAPID (dato público, sin sesión).
//   - "subscribe"   → registra ESTE dispositivo para el usuario de la sesión.
//   - "unsubscribe" → da de baja este dispositivo.
//   - "test"        → manda un aviso de prueba a todos los dispositivos del usuario.
//   - "cron"        → corre los recordatorios programados. Solo con el
//                     encabezado x-cron-secret correcto (lo llama pg_cron cada hora).
//
// Seguridad: igual que delete-account, NUNCA se confía en un user_id que
// venga en el cuerpo — siempre se resuelve a partir del token de sesión.
// Se despliega con verify_jwt apagado (`--no-verify-jwt`) porque "config"
// y "cron" no traen sesión de usuario; las acciones de usuario validan el
// token a mano, abajo.
//
// Privacidad: los avisos nunca incluyen montos ni saldos — se ven en la
// pantalla bloqueada del teléfono, donde cualquiera alrededor los lee.
//
// Secretos (Supabase → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (p.ej. mailto:tu@correo.com), CRON_SECRET.
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY ya vienen puestos por Supabase.
//
// Despliegue: npx supabase functions deploy push-notify --no-verify-jwt

import { sendWebPush, type PushSubscriptionKeys, type VapidKeys } from '../_shared/webpush.ts';
import {
  afterAttempt,
  attemptDedupeKey,
  buildMessage,
  decideOccurrence,
  DUE_TOLERANCE_MS,
  localHourOf,
  pushTag,
  type OccurrenceRow,
} from '../_shared/reminderCron.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } });
}

interface Env {
  url: string;
  anonKey: string;
  serviceKey: string;
  vapid: VapidKeys | null;
  cronSecret: string | null;
}

function readEnv(): Env | null {
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return null;
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:soporte@valu.app';
  return {
    url: url.replace(/\/+$/, ''),
    anonKey,
    serviceKey,
    vapid: publicKey && privateKey ? { publicKey, privateKey, subject } : null,
    cronSecret: Deno.env.get('CRON_SECRET') ?? null,
  };
}

// PostgREST con la llave de servicio — solo del lado del servidor.
async function rest(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${env.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.serviceKey,
      Authorization: `Bearer ${env.serviceKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

async function restJson<T>(env: Env, path: string): Promise<T[]> {
  const res = await rest(env, path);
  if (!res.ok) throw new Error(`REST ${path.split('?')[0]} → ${res.status}`);
  return (await res.json()) as T[];
}

async function resolveUserId(env: Env, req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const res = await fetch(`${env.url}/auth/v1/user`, { headers: { Authorization: authHeader, apikey: env.anonKey } });
  if (!res.ok) return null;
  const who = await res.json().catch(() => null);
  return typeof who?.id === 'string' ? who.id : null;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

interface SubscriptionRow extends PushSubscriptionKeys {
  id: string;
  user_id: string;
  failure_count: number;
}

interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

// Envía a todos los dispositivos de un usuario y limpia los que el
// navegador ya dio de baja. Devuelve cuántos se entregaron.
async function deliver(env: Env, subs: SubscriptionRow[], payload: PushPayload): Promise<number> {
  if (!env.vapid) return 0;
  let delivered = 0;
  for (const sub of subs) {
    try {
      const result = await sendWebPush(sub, payload, env.vapid, { topic: payload.tag, urgency: 'normal' });
      if (result.ok) {
        delivered++;
        await rest(env, `push_subscriptions?id=eq.${sub.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ last_success_at: new Date().toISOString(), failure_count: 0 }),
        });
      } else if (result.gone || sub.failure_count >= 9) {
        await rest(env, `push_subscriptions?id=eq.${sub.id}`, { method: 'DELETE' });
      } else {
        await rest(env, `push_subscriptions?id=eq.${sub.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ failure_count: sub.failure_count + 1 }),
        });
      }
    } catch {
      // Un dispositivo roto no debe impedir que los demás reciban el aviso.
    }
  }
  return delivered;
}

// Registra el aviso ANTES de enviarlo: si ya existía esa llave, no se manda.
// Preferimos perder un aviso a duplicarlo (mismo criterio que el contrato
// de idempotencia de docs/03_fase2_contratos_v1.md §5).
async function claimOnce(env: Env, userId: string, kind: string, dedupeKey: string): Promise<boolean> {
  const res = await rest(env, 'notification_log?on_conflict=user_id,dedupe_key', {
    method: 'POST',
    headers: { Prefer: 'return=representation,resolution=ignore-duplicates' },
    body: JSON.stringify({ user_id: userId, kind, dedupe_key: dedupeKey }),
  });
  if (!res.ok) return false;
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0;
}

// Como claimOnce, pero distingue "ya estaba registrado" de "falló la llamada": un fallo de red NO debe contarse como
// "ya se mandó", porque entonces el aviso se perdería para siempre.
async function claimAttempt(env: Env, userId: string, kind: string, dedupeKey: string): Promise<'claimed' | 'duplicate' | 'error'> {
  const res = await rest(env, 'notification_log?on_conflict=user_id,dedupe_key', {
    method: 'POST',
    headers: { Prefer: 'return=representation,resolution=ignore-duplicates' },
    body: JSON.stringify({ user_id: userId, kind, dedupe_key: dedupeKey }),
  });
  if (!res.ok) return 'error';
  const rows = await res.json().catch(() => null);
  if (!Array.isArray(rows)) return 'error';
  return rows.length > 0 ? 'claimed' : 'duplicate';
}

async function releaseClaim(env: Env, userId: string, dedupeKey: string): Promise<void> {
  await rest(env, `notification_log?user_id=eq.${userId}&dedupe_key=eq.${encodeURIComponent(dedupeKey)}`, { method: 'DELETE' }).catch(() => undefined);
}

// Fecha y hora local del usuario, en su zona horaria.
function localNow(timeZone: string, now: Date): { ymd: string; hour: number; midnightUtcIso: string } {
  let tz = timeZone;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
  } catch {
    tz = 'America/Mexico_City';
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  const y = Number(parts.year);
  const m = Number(parts.month);
  const d = Number(parts.day);
  const hour = Number(parts.hour);
  const asUtc = Date.UTC(y, m - 1, d, hour, Number(parts.minute));
  const offsetMs = Math.round((asUtc - now.getTime()) / 60000) * 60000;
  const midnightUtc = Date.UTC(y, m - 1, d) - offsetMs;
  return { ymd: `${parts.year}-${parts.month}-${parts.day}`, hour, midnightUtcIso: new Date(midnightUtc).toISOString() };
}

function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / 86400000);
}

interface SettingsRow {
  user_id: string;
  debt_due: boolean;
  daily_log_reminder: boolean;
  daily_reminder_hour: number;
  timezone: string;
}

interface LiabilityRow {
  id: string;
  user_id: string;
  institution: string;
  due_date: string;
}

const DEBT_OFFSETS = new Set([3, 1, 0]);

// Avisos programados (P3): recordatorios propios, pagos recurrentes, corte y pago de tarjeta... Cada ocurrencia lleva copiado lo
// que hace falta (título, intentos), así que no hay que juntar tablas. Ver _shared/reminderCron.ts para las reglas.
async function runReminders(
  env: Env,
  settings: SettingsRow[],
  subsByUser: Map<string, SubscriptionRow[]>,
  now: Date,
  stats: Record<string, number>
): Promise<void> {
  const users = settings.filter((s) => subsByUser.has(s.user_id));
  if (users.length === 0) return;
  const dueIso = new Date(now.getTime() + DUE_TOLERANCE_MS).toISOString();
  let rows: OccurrenceRow[];
  try {
    rows = await restJson<OccurrenceRow>(
      env,
      `reminder_occurrences?user_id=in.(${users.map((u) => u.user_id).join(',')})&status=in.(pending,sent)&deleted_at=is.null&push=eq.true` +
        `&next_attempt_at=lte.${encodeURIComponent(dueIso)}&order=next_attempt_at.asc&limit=200&select=*`
    );
  } catch {
    return; // la migración 0023 todavía no se corrió: no hay avisos que mandar (y no debe romper lo demás)
  }
  const tzByUser = new Map(users.map((u) => [u.user_id, u.timezone]));
  const nowMs = now.getTime();
  for (const o of rows) {
    const decision = decideOccurrence(o, nowMs, localHourOf(tzByUser.get(o.user_id) ?? 'America/Mexico_City', now));
    if (!decision.send) {
      if (decision.expire) {
        // demasiado viejo para sonar: deja de insistir por push (sigue visible dentro de la app)
        await rest(env, `reminder_occurrences?id=eq.${o.id}&status=in.(pending,sent)`, { method: 'PATCH', body: JSON.stringify({ next_attempt_at: null }) });
        stats.reminderExpired++;
      }
      continue;
    }
    const key = attemptDedupeKey(o);
    const claim = await claimAttempt(env, o.user_id, 'reminder', key);
    if (claim === 'error') {
      stats.reminderErrors++;
      continue; // se reintenta en la próxima corrida
    }
    if (claim === 'claimed') {
      const msg = buildMessage(o);
      const delivered = await deliver(env, subsByUser.get(o.user_id) ?? [], { title: msg.title, body: msg.body, url: '/avisos', tag: pushTag(o) });
      if (delivered === 0) {
        await releaseClaim(env, o.user_id, key); // no llegó a ningún dispositivo: que se reintente, no que se pierda
        stats.reminderErrors++;
        continue;
      }
      stats.reminderSent++;
    } else {
      stats.skippedDuplicates++; // ya se mandó (el estado se había quedado atrás): solo se pone al día, sin volver a sonar
    }
    // Solo si la ocurrencia sigue abierta: si la persona la confirmó mientras tanto, no se pisa.
    await rest(env, `reminder_occurrences?id=eq.${o.id}&status=in.(pending,sent)`, { method: 'PATCH', body: JSON.stringify(afterAttempt(o, nowMs)) });
  }
}

async function runCron(env: Env): Promise<Record<string, number>> {
  const stats = { users: 0, debtSent: 0, dailySent: 0, skippedDuplicates: 0, reminderSent: 0, reminderErrors: 0, reminderExpired: 0 };
  const settings = await restJson<SettingsRow>(env, 'notification_settings?enabled=eq.true&select=*');
  if (settings.length === 0) return stats;

  const ids = settings.map((s) => s.user_id);
  const inList = `(${ids.join(',')})`;
  const subs = await restJson<SubscriptionRow>(env, `push_subscriptions?user_id=in.${inList}&select=id,user_id,endpoint,p256dh,auth,failure_count`);
  const subsByUser = new Map<string, SubscriptionRow[]>();
  for (const s of subs) subsByUser.set(s.user_id, [...(subsByUser.get(s.user_id) ?? []), s]);

  const debtUsers = settings.filter((s) => s.debt_due && subsByUser.has(s.user_id)).map((s) => s.user_id);
  // Solo deudas que TÚ debes y siguen vivas. Las columnas status/direction vienen de la migración 0023: si todavía no se corrió,
  // la consulta con filtro falla y se usa la de antes (así el aviso de pagos no se cae en el entretiempo).
  let liabilities: LiabilityRow[] = [];
  if (debtUsers.length) {
    const base = `liabilities?user_id=in.(${debtUsers.join(',')})&deleted_at=is.null&due_date=not.is.null&select=id,user_id,institution,due_date`;
    try {
      liabilities = await restJson<LiabilityRow>(env, `${base}&status=eq.active&direction=eq.owe`);
    } catch {
      liabilities = await restJson<LiabilityRow>(env, base);
    }
  }

  const now = new Date();
  await runReminders(env, settings, subsByUser, now, stats);
  for (const s of settings) {
    const userSubs = subsByUser.get(s.user_id);
    if (!userSubs?.length) continue;
    stats.users++;
    const local = localNow(s.timezone, now);

    // Deudas por vencer: 3 días antes, 1 día antes y el mismo día — solo
    // en horario razonable (9:00-21:59 local), nunca de madrugada.
    if (s.debt_due && local.hour >= 9 && local.hour <= 21) {
      for (const l of liabilities.filter((x) => x.user_id === s.user_id)) {
        const dueYmd = l.due_date.slice(0, 10);
        const days = daysBetween(local.ymd, dueYmd);
        if (!DEBT_OFFSETS.has(days)) continue;
        const claimed = await claimOnce(env, s.user_id, 'debt_due', `debt:${l.id}:${dueYmd}:${days}`);
        if (!claimed) {
          stats.skippedDuplicates++;
          continue;
        }
        const when = days === 0 ? 'vence hoy' : days === 1 ? 'vence mañana' : `vence en ${days} días`;
        stats.debtSent += await deliver(env, userSubs, {
          title: `Tu pago de ${l.institution} ${when}`,
          body: 'Ábrelo en VALU para revisar el monto y registrar el pago.',
          url: '/patrimonio',
          tag: `debt-${l.id}`,
        });
      }
    }

    // Recordatorio diario: solo si hoy todavía no registró nada.
    if (s.daily_log_reminder && local.hour === s.daily_reminder_hour) {
      const today = await restJson<{ id: string }>(
        env,
        `transactions?user_id=eq.${s.user_id}&deleted_at=is.null&created_at=gte.${encodeURIComponent(local.midnightUtcIso)}&select=id&limit=1`
      );
      if (today.length === 0) {
        const claimed = await claimOnce(env, s.user_id, 'daily_log', `daily:${local.ymd}`);
        if (claimed) {
          stats.dailySent += await deliver(env, userSubs, {
            title: '¿Ya registraste tus gastos de hoy?',
            body: 'Toma 10 segundos: dilo por voz y VALU lo acomoda.',
            url: '/capture?autostart=1',
            tag: 'daily-log',
          });
        } else {
          stats.skippedDuplicates++;
        }
      }
    }
  }
  return stats;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const env = readEnv();
  if (!env) return json({ error: 'Configuración incompleta del proyecto de Supabase.' }, 500);

  const body = await req.json().catch(() => ({}));
  const action = typeof body?.action === 'string' ? body.action : '';

  if (action === 'config') {
    return json({ publicKey: env.vapid?.publicKey ?? null });
  }

  if (action === 'cron') {
    const provided = req.headers.get('x-cron-secret') ?? '';
    if (!env.cronSecret || !safeEqual(provided, env.cronSecret)) return json({ error: 'No autorizado' }, 401);
    if (!env.vapid) return json({ error: 'Faltan las llaves VAPID en los secretos de la función.' }, 500);
    try {
      return json({ ok: true, ...(await runCron(env)) });
    } catch (e) {
      return json({ error: 'Falló la corrida de recordatorios', detail: String(e) }, 500);
    }
  }

  const userId = await resolveUserId(env, req);
  if (!userId) return json({ error: 'Sesión inválida o expirada. Vuelve a iniciar sesión.' }, 401);

  if (action === 'subscribe') {
    const sub = body?.subscription;
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;
    if (typeof endpoint !== 'string' || !endpoint.startsWith('https://') || typeof p256dh !== 'string' || typeof auth !== 'string') {
      return json({ error: 'Suscripción inválida.' }, 400);
    }
    // on_conflict=endpoint: si este teléfono ya estaba registrado (incluso
    // con otra cuenta), se reasigna a quien tiene la sesión ahora.
    const res = await rest(env, 'push_subscriptions?on_conflict=endpoint', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        user_agent: typeof body?.userAgent === 'string' ? body.userAgent.slice(0, 300) : null,
        updated_at: new Date().toISOString(),
        failure_count: 0,
      }),
    });
    if (!res.ok) return json({ error: 'No se pudo registrar el dispositivo.', detail: await res.text() }, 502);
    // Crea las preferencias por defecto la primera vez (sin pisar las existentes).
    const timezone = typeof body?.timezone === 'string' ? body.timezone.slice(0, 64) : 'America/Mexico_City';
    await rest(env, 'notification_settings?on_conflict=user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ user_id: userId, timezone }),
    });
    return json({ ok: true });
  }

  if (action === 'unsubscribe') {
    const endpoint = body?.endpoint;
    if (typeof endpoint !== 'string') return json({ error: 'Falta el endpoint.' }, 400);
    await rest(env, `push_subscriptions?user_id=eq.${userId}&endpoint=eq.${encodeURIComponent(endpoint)}`, { method: 'DELETE' });
    return json({ ok: true });
  }

  if (action === 'test') {
    if (!env.vapid) return json({ error: 'Faltan las llaves VAPID en los secretos de la función.' }, 500);
    const subs = await restJson<SubscriptionRow>(env, `push_subscriptions?user_id=eq.${userId}&select=id,user_id,endpoint,p256dh,auth,failure_count`);
    if (subs.length === 0) return json({ error: 'Este usuario no tiene dispositivos registrados.' }, 404);
    const delivered = await deliver(env, subs, {
      title: 'VALU',
      body: '¡Listo! Así te llegarán tus avisos.',
      url: '/',
      tag: 'test',
    });
    return json({ ok: delivered > 0, delivered, devices: subs.length });
  }

  return json({ error: 'Acción desconocida.' }, 400);
});

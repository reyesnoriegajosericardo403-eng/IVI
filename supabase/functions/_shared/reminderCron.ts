// Lógica PURA (sin red, sin Deno) de los avisos programados que manda push-notify cada hora. Vive aparte para poder
// probarla en Node (scripts/golden/push-avisos.cjs) con relojes, zonas horarias y reintentos simulados.
//
// Reglas (docs/memoria-proyecto/10-p3-...):
//  - Una ocurrencia está "por mandar" si sigue abierta (pending | sent), tiene push y su próximo intento ya llegó.
//  - El servidor corre cada hora, así que "ya llegó" tolera 10 minutos de adelanto: un intento a las 11:00:03 que se
//    repite 2 h después debe salir en la corrida de las 13:00:01, no esperar a las 14:00.
//  - Los avisos previos ("faltan 3 días") suenan UNA vez; solo el del día del evento reintenta (hasta max_attempts).
//  - Los reintentos no suenan de madrugada (22:00-06:59 hora del usuario): esperan a la primera corrida de las 7.
//  - Un aviso con más de 48 h de atraso ya no se manda por push (sigue visible dentro de la app).
//  - Los avisos NUNCA llevan montos ni saldos: se leen en la pantalla bloqueada.

export const DUE_TOLERANCE_MS = 10 * 60_000;
export const STALE_PUSH_MS = 48 * 3600_000;
export const QUIET_FROM_HOUR = 22;
export const QUIET_UNTIL_HOUR = 7;

export interface OccurrenceRow {
  id: string;
  user_id: string;
  reminder_id: string;
  event_date: string; // AAAA-MM-DD
  offset_days: number;
  scheduled_for: string;
  status: string;
  attempts_made: number;
  max_attempts: number;
  attempt_interval_minutes: number;
  next_attempt_at: string | null;
  postponed_count: number | null;
  title: string;
  push: boolean;
}

export type SkipReason = 'not_open' | 'no_push' | 'no_next_attempt' | 'not_yet' | 'stale' | 'quiet_hours';

export type Decision = { send: true } | { send: false; reason: SkipReason; expire?: boolean };

export function isQuietHour(localHour: number): boolean {
  return localHour >= QUIET_FROM_HOUR || localHour < QUIET_UNTIL_HOUR;
}

// ¿Toca mandar esta ocurrencia ahora? `localHour` es la hora (0-23) en la zona del usuario.
export function decideOccurrence(o: OccurrenceRow, nowMs: number, localHour: number): Decision {
  if (o.status !== 'pending' && o.status !== 'sent') return { send: false, reason: 'not_open' };
  if (!o.push) return { send: false, reason: 'no_push' };
  if (!o.next_attempt_at) return { send: false, reason: 'no_next_attempt' };
  const due = Date.parse(o.next_attempt_at);
  if (!Number.isFinite(due)) return { send: false, reason: 'no_next_attempt' };
  if (due > nowMs + DUE_TOLERANCE_MS) return { send: false, reason: 'not_yet' };
  if (nowMs - due > STALE_PUSH_MS) return { send: false, reason: 'stale', expire: true };
  if (o.attempts_made > 0 && isQuietHour(localHour)) return { send: false, reason: 'quiet_hours' };
  return { send: true };
}

export interface OccurrenceUpdate {
  status: 'sent';
  attempts_made: number;
  last_sent_at: string;
  next_attempt_at: string | null;
}

// Estado de la ocurrencia DESPUÉS de mandar un intento (o de darlo por mandado si ya estaba registrado).
export function afterAttempt(o: OccurrenceRow, nowMs: number): OccurrenceUpdate {
  const attempts = o.attempts_made + 1;
  const maxAttempts = o.offset_days > 0 ? 1 : Math.max(1, Math.min(3, o.max_attempts));
  const interval = Math.max(60, Math.min(1440, o.attempt_interval_minutes)) * 60_000;
  return {
    status: 'sent',
    attempts_made: attempts,
    last_sent_at: new Date(nowMs).toISOString(),
    next_attempt_at: attempts < maxAttempts ? new Date(nowMs + interval).toISOString() : null,
  };
}

// Llave de idempotencia de UN intento concreto: aunque el cron corra de más o el estado se rebobine, el mismo intento
// del mismo aviso (y de la misma vez que se pospuso) jamás se manda dos veces.
export function attemptDedupeKey(o: OccurrenceRow): string {
  return `occ:${o.id}:${o.postponed_count ?? 0}:${o.attempts_made + 1}`;
}

export function pushTag(o: Pick<OccurrenceRow, 'id'>): string {
  return `occ-${o.id.replace(/-/g, '').slice(0, 28)}`; // el "Topic" de Web Push admite 32 caracteres
}

// Texto del aviso. Solo el título que escribió la persona + cuánto falta; jamás montos.
export function buildMessage(o: OccurrenceRow): { title: string; body: string } {
  const name = o.title.trim().slice(0, 80) || 'Aviso';
  const n = o.attempts_made + 1;
  if (o.offset_days > 0) {
    const when = o.offset_days === 1 ? 'Mañana' : `En ${o.offset_days} días`;
    return { title: `${when}: ${name}`, body: 'Ábrelo en VALU para verlo o posponerlo.' };
  }
  if (n === 1) return { title: `Hoy: ${name}`, body: 'Ábrelo en VALU y confirma que ya lo hiciste.' };
  const max = Math.max(1, Math.min(3, o.max_attempts));
  return { title: `Sigue pendiente: ${name}`, body: `Aún no lo confirmas (aviso ${n} de ${max}). Ábrelo en VALU.` };
}

// ---------- Zona horaria ----------

export function localHourOf(timeZone: string, now: Date): number {
  let tz = timeZone;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
  } catch {
    tz = 'America/Mexico_City';
  }
  const hour = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(now)
    .find((p) => p.type === 'hour')?.value;
  return Number(hour ?? 0);
}

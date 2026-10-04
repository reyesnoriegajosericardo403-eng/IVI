// Pruebas de la lógica de avisos del servidor (supabase/functions/_shared/reminderCron.ts): cuándo toca mandar, reintentos,
// horas de silencio, avisos viejos, idempotencia y que NUNCA se filtre un monto. Incluye una simulación hora por hora del cron.
//   node scripts/golden/push-avisos.cjs [--show]
require('./ts-hook.cjs');
const assert = require('assert');
const C = require('../../supabase/functions/_shared/reminderCron.ts');

let ok = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); ok++; if (process.argv.includes('--show')) console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name, '\n     ', String(e.stack || e.message).split('\n').slice(0, 3).join('\n      ')); }
};
const H = 3600_000;
const T0 = Date.parse('2026-10-10T15:00:00.000Z'); // 09:00 en CDMX (UTC-6)
const occ = (extra = {}) => ({
  id: '11111111-2222-4333-8444-555555555555', user_id: 'u1', reminder_id: 'r1', event_date: '2026-10-10', offset_days: 0, scheduled_for: new Date(T0).toISOString(),
  status: 'pending', attempts_made: 0, max_attempts: 3, attempt_interval_minutes: 120, next_attempt_at: new Date(T0).toISOString(), postponed_count: 0, title: 'Pago de la tarjeta', push: true, ...extra,
});

// ---------- decisión ----------
t('toca mandar cuando llegó su hora', () => assert.deepStrictEqual(C.decideOccurrence(occ(), T0, 9), { send: true }));
t('tolera 10 minutos de adelanto del cron (el intento de las 11:00:03 sale en la corrida de las 13:00:01)', () => {
  assert.strictEqual(C.decideOccurrence(occ({ next_attempt_at: new Date(T0 + 3000).toISOString() }), T0 - 1000, 9).send, true);
  assert.strictEqual(C.decideOccurrence(occ({ next_attempt_at: new Date(T0 + 11 * 60_000).toISOString() }), T0, 9).send, false);
});
t('no manda lo que todavía no es hora, lo cerrado, lo sin push ni lo sin próximo intento', () => {
  assert.strictEqual(C.decideOccurrence(occ({ next_attempt_at: new Date(T0 + H).toISOString() }), T0, 9).reason, 'not_yet');
  for (const status of ['confirmed', 'not_occurred', 'skipped', 'dismissed', 'cancelled', 'paused']) assert.strictEqual(C.decideOccurrence(occ({ status }), T0, 9).reason, 'not_open');
  assert.strictEqual(C.decideOccurrence(occ({ push: false }), T0, 9).reason, 'no_push');
  assert.strictEqual(C.decideOccurrence(occ({ next_attempt_at: null }), T0, 9).reason, 'no_next_attempt');
  assert.strictEqual(C.decideOccurrence(occ({ next_attempt_at: 'basura' }), T0, 9).reason, 'no_next_attempt');
});
t('un aviso con más de 48 h de atraso ya no suena y se marca para dejar de insistir', () => {
  const d = C.decideOccurrence(occ(), T0 + 49 * H, 9);
  assert.deepStrictEqual(d, { send: false, reason: 'stale', expire: true });
  assert.strictEqual(C.decideOccurrence(occ(), T0 + 47 * H, 9).send, true);
});
t('el PRIMER aviso suena a la hora que eligió la persona, aunque sea de madrugada; los reintentos esperan a las 7', () => {
  assert.strictEqual(C.decideOccurrence(occ(), T0, 3).send, true);
  assert.strictEqual(C.decideOccurrence(occ({ attempts_made: 1 }), T0, 3).reason, 'quiet_hours');
  assert.strictEqual(C.decideOccurrence(occ({ attempts_made: 1 }), T0, 22).reason, 'quiet_hours');
  assert.strictEqual(C.decideOccurrence(occ({ attempts_made: 1 }), T0, 7).send, true);
  assert.strictEqual(C.decideOccurrence(occ({ attempts_made: 1 }), T0, 21).send, true);
});

// ---------- después de un intento ----------
t('con 3 intentos: el 1º y el 2º programan el siguiente (+2 h); el 3º cierra', () => {
  let o = occ();
  const a = C.afterAttempt(o, T0);
  assert.deepStrictEqual({ s: a.status, n: a.attempts_made, next: a.next_attempt_at }, { s: 'sent', n: 1, next: new Date(T0 + 2 * H).toISOString() });
  o = { ...o, ...a };
  const b = C.afterAttempt(o, T0 + 2 * H);
  assert.strictEqual(b.attempts_made, 2);
  assert.strictEqual(b.next_attempt_at, new Date(T0 + 4 * H).toISOString());
  const c = C.afterAttempt({ ...o, ...b }, T0 + 4 * H);
  assert.deepStrictEqual({ n: c.attempts_made, next: c.next_attempt_at }, { n: 3, next: null });
});
t('un solo intento: queda sent y sin próximo intento', () => assert.strictEqual(C.afterAttempt(occ({ max_attempts: 1 }), T0).next_attempt_at, null));
t('un aviso previo ("faltan 3 días") suena UNA vez aunque max_attempts diga 3', () => {
  const a = C.afterAttempt(occ({ offset_days: 3, max_attempts: 3 }), T0);
  assert.strictEqual(a.next_attempt_at, null);
});
t('un max_attempts o intervalo corruptos se acotan (1..3 intentos; 60..1440 min)', () => {
  assert.strictEqual(C.afterAttempt(occ({ max_attempts: 99 }), T0).next_attempt_at !== null, true);
  const x = C.afterAttempt(occ({ max_attempts: 99, attempt_interval_minutes: 1 }), T0);
  assert.strictEqual(Date.parse(x.next_attempt_at) - T0, 60 * 60_000);
  assert.strictEqual(C.afterAttempt(occ({ max_attempts: 0 }), T0).next_attempt_at, null);
});

// ---------- idempotencia ----------
t('la llave de idempotencia cambia por intento y por cada vez que se pospone, y es estable', () => {
  const k = C.attemptDedupeKey(occ());
  assert.strictEqual(k, C.attemptDedupeKey(occ()));
  assert.notStrictEqual(k, C.attemptDedupeKey(occ({ attempts_made: 1 })));
  assert.notStrictEqual(k, C.attemptDedupeKey(occ({ postponed_count: 1 })));
  assert.strictEqual(C.attemptDedupeKey(occ({ postponed_count: null })), k);
});
t('el topic de Web Push cabe en 32 caracteres y solo usa caracteres permitidos', () => {
  const tag = C.pushTag(occ());
  assert(tag.length <= 32 && /^[A-Za-z0-9_-]+$/.test(tag), tag);
});

// ---------- mensajes ----------
t('los mensajes no llevan montos, solo el título de la persona y cuánto falta', () => {
  const day = C.buildMessage(occ());
  assert.strictEqual(day.title, 'Hoy: Pago de la tarjeta');
  assert.strictEqual(C.buildMessage(occ({ offset_days: 1 })).title, 'Mañana: Pago de la tarjeta');
  assert.strictEqual(C.buildMessage(occ({ offset_days: 3 })).title, 'En 3 días: Pago de la tarjeta');
  const retry = C.buildMessage(occ({ attempts_made: 1 }));
  assert(retry.title.startsWith('Sigue pendiente') && retry.body.includes('2 de 3'), JSON.stringify(retry));
  for (const m of [day, retry]) assert(!/\$|\d{3,}/.test(m.title + m.body.replace('2 de 3', '')), 'sin montos');
});
t('un título larguísimo o vacío no rompe el aviso', () => {
  assert(C.buildMessage(occ({ title: 'x'.repeat(5000) })).title.length < 100);
  assert.strictEqual(C.buildMessage(occ({ title: '   ' })).title, 'Hoy: Aviso');
});

// ---------- zonas horarias ----------
t('hora local por zona (CDMX UTC-6 en octubre, Tijuana, Madrid, zona inválida cae a CDMX)', () => {
  const at = new Date('2026-10-10T15:00:00Z');
  assert.strictEqual(C.localHourOf('America/Mexico_City', at), 9);
  assert.strictEqual(C.localHourOf('America/Tijuana', at), 8);
  assert.strictEqual(C.localHourOf('Europe/Madrid', at), 17);
  assert.strictEqual(C.localHourOf('Marte/Olympus', at), 9);
  assert.strictEqual(C.localHourOf('America/Mexico_City', new Date('2026-10-10T06:00:00Z')), 0, 'medianoche es 0, no 24');
});

// ---------- simulación del cron, hora por hora ----------
// Cada corrida cae con un retraso distinto (jitter) para comprobar que no se pierde ni se duplica nada.
function simulate(startOcc, { hours, tz = 'America/Mexico_City', failDeliveryAt = [], confirmAtMs = null, jitter = (i) => (i % 7) * 20_000 }) {
  const sent = [];
  const log = new Set();
  let o = { ...startOcc };
  for (let i = 0; i < hours; i++) {
    const nowMs = T0 - 2 * H + i * H + jitter(i);
    if (confirmAtMs !== null && nowMs >= confirmAtMs) o = { ...o, status: 'confirmed', next_attempt_at: null };
    const d = C.decideOccurrence(o, nowMs, C.localHourOf(tz, new Date(nowMs)));
    if (!d.send) { if (d.expire) o = { ...o, next_attempt_at: null }; continue; }
    const key = C.attemptDedupeKey(o);
    const isDup = log.has(key);
    if (!isDup) {
      log.add(key);
      if (failDeliveryAt.includes(i)) { log.delete(key); continue; } // no llegó a ningún dispositivo: se libera y se reintenta
      sent.push({ i, at: nowMs, n: o.attempts_made + 1 });
    }
    o = { ...o, ...C.afterAttempt(o, nowMs) };
  }
  return { sent, o };
}
t('simulación: 3 intentos, cada ~2 h, exactamente 3 envíos y luego silencio', () => {
  const r = simulate(occ(), { hours: 48 });
  assert.deepStrictEqual(r.sent.map((x) => x.n), [1, 2, 3]);
  assert.strictEqual(r.o.next_attempt_at, null);
  const gaps = r.sent.slice(1).map((x, i) => Math.round((x.at - r.sent[i].at) / H));
  assert.deepStrictEqual(gaps, [2, 2]);
});
t('simulación: si se confirma tras el 1er aviso, no hay más envíos', () => {
  const r = simulate(occ(), { hours: 48, confirmAtMs: T0 + 30 * 60_000 });
  assert.deepStrictEqual(r.sent.map((x) => x.n), [1]);
});
t('simulación: una entrega que falla se reintenta en la hora siguiente y NO gasta un intento', () => {
  const r = simulate(occ(), { hours: 48, failDeliveryAt: [2] });
  assert.deepStrictEqual(r.sent.map((x) => x.n), [1, 2, 3]);
  assert.strictEqual(r.sent[0].i, 3, 'salió una hora después');
});
t('simulación: reintentos que caerían de madrugada esperan a las 7:00 locales', () => {
  // primer aviso 21:00 hora local → reintentos a las 23:00 y 01:00 caen en silencio → salen a las 7:00
  const at = Date.parse('2026-10-11T03:00:00Z'); // 21:00 CDMX
  const o = occ({ scheduled_for: new Date(at).toISOString(), next_attempt_at: new Date(at).toISOString() });
  const sent = [];
  let cur = o;
  for (let i = 0; i < 30; i++) {
    const nowMs = at - H + i * H + 30_000;
    const hour = C.localHourOf('America/Mexico_City', new Date(nowMs));
    const d = C.decideOccurrence(cur, nowMs, hour);
    if (!d.send) continue;
    sent.push({ n: cur.attempts_made + 1, hour });
    cur = { ...cur, ...C.afterAttempt(cur, nowMs) };
  }
  assert.deepStrictEqual(sent.map((x) => x.n), [1, 2, 3]);
  assert.strictEqual(sent[0].hour, 21);
  assert(sent[1].hour >= 7 && sent[1].hour < 22, `2º a las ${sent[1].hour}`);
  assert(sent[2].hour >= 7 && sent[2].hour < 22, `3º a las ${sent[2].hour}`);
});
t('simulación: el cron caído 3 días no manda una avalancha de avisos viejos', () => {
  const r = simulate(occ(), { hours: 3, jitter: () => 0 });
  const late = C.decideOccurrence(occ(), T0 + 72 * H, 12);
  assert.strictEqual(late.send, false);
  assert.strictEqual(r.sent.length, 1);
});
t('simulación: un aviso pospuesto 1 h reinicia los intentos (llave nueva) y vuelve a sonar una vez', () => {
  const first = simulate(occ({ max_attempts: 1 }), { hours: 6 });
  assert.strictEqual(first.sent.length, 1);
  const postponed = { ...first.o, status: 'pending', attempts_made: 0, postponed_count: 1, next_attempt_at: new Date(T0 + 8 * H).toISOString() };
  const r = simulate(postponed, { hours: 24 });
  assert.strictEqual(r.sent.length, 1);
});

console.log(`\nAvisos (servidor): ${ok} OK, ${fail} fallan`);
process.exit(fail ? 1 : 0);

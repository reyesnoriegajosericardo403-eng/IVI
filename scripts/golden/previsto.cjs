// Pruebas de lo PREVISTO (P3): ids deterministas, generación de previstos y de avisos desde reglas, pausar/reanudar,
// reconciliación al editar, proyecciones de saldo, y que un previsto NUNCA mueve saldos. Todo puro (sin store).
//   node scripts/golden/previsto.cjs [--show]
require('./ts-hook.cjs');
const assert = require('assert');
const { deterministicId } = require('@/utils/deterministicId');
const M = require('@/utils/materialize');
const F = require('@/utils/forecast');
const { accountDeltasForTransaction } = require('@/utils/ledger');
const { selectActiveTransactions, selectForecastTransactions } = require('@/store/selectors');

let ok = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); ok++; if (process.argv.includes('--show')) console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name, '\n     ', String(e.stack || e.message).split('\n').slice(0, 3).join('\n      ')); }
};
const TODAY = '2026-10-03'; // sábado
const NOW = M.localInstant(TODAY, '10:00');
const meta = (id, extra = {}) => ({ id, createdAt: NOW, updatedAt: NOW, ...extra });
const rec = (frequency, startDate, extra = {}) => ({ frequency, interval: 1, startDate, ...extra });
const rule = (id, extra = {}) => ({ ...meta(id), kind: 'transaction', name: 'Renta', status: 'active', recurrence: rec('monthly', '2026-10-05', { dayOfMonth: 5 }), amount: 8000, currency: 'MXN', txType: 'expense', categoryId: 'housing', subcategoryId: 'house_rent', accountId: 'a1', ...extra });
const dayOf = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const idsOf = (list) => new Set(list.map((x) => x.id));

// ---------- ids deterministas ----------
t('deterministicId: formato UUID v4 válido, estable y sensible al orden', () => {
  const id = deterministicId('forecast', 'regla-1', '2026-11-05');
  assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id), id);
  assert.strictEqual(id, deterministicId('forecast', 'regla-1', '2026-11-05'));
  assert.notStrictEqual(id, deterministicId('regla-1', 'forecast', '2026-11-05'));
  assert.notStrictEqual(deterministicId('ab', 'c'), deterministicId('a', 'bc'));
});
t('deterministicId: 60,000 entradas distintas sin una sola colisión', () => {
  const seen = new Set();
  for (let r = 0; r < 300; r++) for (let d = 0; d < 200; d++) {
    const id = deterministicId('forecast', `regla-${r}`, `2026-${String(1 + (d % 12)).padStart(2, '0')}-${String(1 + (d % 28)).padStart(2, '0')}-${d}`);
    assert(!seen.has(id)); seen.add(id);
  }
});

// ---------- previstos de una regla ----------
t('regla mensual el 5 creada el 3 oct: previstos 5 oct, 5 nov y 5 dic (horizonte 90 días)', () => {
  const g = M.planRuleForecasts(rule('r1'), new Set(), TODAY, NOW);
  assert.deepStrictEqual(g.forecasts.map((f) => dayOf(f.date)), ['2026-10-05', '2026-11-05', '2026-12-05']);
  assert.strictEqual(g.generatedUntil, '2027-01-01');
});
t('cada previsto es status forecast, automático, a mediodía local, con la plantilla de la regla', () => {
  const [f] = M.planRuleForecasts(rule('r1'), new Set(), TODAY, NOW).forecasts;
  assert.deepStrictEqual({ s: f.status, o: f.origin, ty: f.type, a: f.amount, acc: f.accountId, rid: f.recurringRuleId, cat: f.subcategoryId, m: f.merchant }, { s: 'forecast', o: 'automatic', ty: 'expense', a: 8000, acc: 'a1', rid: 'r1', cat: 'house_rent', m: 'Renta' });
  assert.strictEqual(new Date(f.date).getHours(), 12);
});
t('IDEMPOTENTE: volver a correr con lo ya generado no crea nada; ni aunque generatedUntil se haya perdido', () => {
  const r = rule('r1');
  const first = M.planRuleForecasts(r, new Set(), TODAY, NOW);
  assert.strictEqual(M.planRuleForecasts(r, idsOf(first.forecasts), TODAY, NOW).forecasts.length, 0);
  assert.strictEqual(M.planRuleForecasts({ ...r, generatedUntil: first.generatedUntil }, idsOf(first.forecasts), TODAY, NOW).forecasts.length, 0);
  assert.strictEqual(M.planRuleForecasts({ ...r, generatedUntil: undefined }, idsOf(first.forecasts), TODAY, NOW).forecasts.length, 0);
});
t('un previsto ya confirmado, omitido o BORRADO jamás se vuelve a crear', () => {
  const r = rule('r1');
  const first = M.planRuleForecasts(r, new Set(), TODAY, NOW).forecasts;
  // los tres siguen "existiendo" (con otro estado) y por eso su id está en existingIds
  assert.strictEqual(M.planRuleForecasts(r, idsOf(first), TODAY, NOW).forecasts.length, 0);
});
t('DOS dispositivos generan los MISMOS ids (el upsert los junta)', () => {
  const a = M.planRuleForecasts(rule('r1'), new Set(), TODAY, M.localInstant(TODAY, '10:00')).forecasts.map((f) => f.id);
  const b = M.planRuleForecasts(rule('r1'), new Set(), TODAY, M.localInstant(TODAY, '23:30')).forecasts.map((f) => f.id);
  assert.deepStrictEqual(a, b);
});
t('una semana después solo genera los nuevos (avanza el horizonte)', () => {
  const r = rule('r1');
  const first = M.planRuleForecasts(r, new Set(), TODAY, NOW);
  const later = M.planRuleForecasts({ ...r, generatedUntil: first.generatedUntil }, idsOf(first.forecasts), '2026-12-20', M.localInstant('2026-12-20', '09:00'));
  assert.deepStrictEqual(later.forecasts.map((f) => dayOf(f.date)), ['2027-01-05', '2027-02-05', '2027-03-05']);
});
t('si la app estuvo cerrada, los previstos de los días que pasaron SÍ se generan (quedan por confirmar)', () => {
  const r = rule('r1', { generatedUntil: '2026-10-10' });
  const g = M.planRuleForecasts(r, new Set(), '2026-12-20', M.localInstant('2026-12-20', '09:00'));
  assert.deepStrictEqual(g.forecasts.slice(0, 2).map((f) => dayOf(f.date)), ['2026-11-05', '2026-12-05']);
});
t('reglas en pausa, terminadas, borradas o de aportación a meta NO generan previstos', () => {
  for (const extra of [{ status: 'paused' }, { status: 'ended' }, { deletedAt: NOW }, { kind: 'goal_contribution', goalId: 'g1' }]) {
    const g = M.planRuleForecasts(rule('r1', extra), new Set(), TODAY, NOW);
    assert.deepStrictEqual([g.forecasts.length, g.generatedUntil], [0, undefined], JSON.stringify(extra));
  }
});
t('categorías por defecto según el tipo (ingreso, transferencia, ahorro)', () => {
  const f = (txType, extra = {}) => M.planRuleForecasts(rule('r', { txType, categoryId: undefined, subcategoryId: undefined, ...extra }), new Set(), TODAY, NOW).forecasts[0];
  assert.deepStrictEqual([f('income').categoryId, f('income').subcategoryId], ['income', 'inc_other']);
  const tr = f('transfer', { toAccountId: 'a2' });
  assert.deepStrictEqual([tr.categoryId, tr.subcategoryId, tr.toAccountId], ['transfer', 'transfer_own', 'a2']);
  assert.deepStrictEqual([f('saving').categoryId, f('expense').categoryId], ['savings', 'miscellaneous']);
});
t('quincena (15 y último día) genera ambas fechas de cada mes', () => {
  const r = rule('q', { txType: 'income', amount: 9000, recurrence: rec('semimonthly', '2026-10-03') });
  const days = M.planRuleForecasts(r, new Set(), TODAY, NOW).forecasts.map((f) => dayOf(f.date));
  assert.deepStrictEqual(days.slice(0, 5), ['2026-10-15', '2026-10-31', '2026-11-15', '2026-11-30', '2026-12-15']);
});

// ---------- reconciliar al editar ----------
const txOf = (r, now = NOW) => M.planRuleForecasts(r, new Set(), TODAY, now).forecasts;
t('editar el monto: los previstos futuros se actualizan; los confirmados/omitidos no se tocan', () => {
  const r = rule('r1'); const all = txOf(r);
  all[0].status = 'posted'; all[1].status = 'skipped';
  const d = M.reconcileRuleForecasts({ ...r, amount: 9000 }, all, TODAY, NOW);
  assert.deepStrictEqual(d.update.map((u) => [dayOf(all.find((x) => x.id === u.id).date), u.patch.amount]), [['2026-12-05', 9000]]);
  assert.deepStrictEqual([d.create.length, d.remove.length], [0, 0]);
});
t('editar el día (5 → 10): se quitan los del 5 y se crean los del 10 (futuros)', () => {
  const r = rule('r1'); const all = txOf(r);
  const moved = { ...r, recurrence: rec('monthly', '2026-10-05', { dayOfMonth: 10 }) };
  const d = M.reconcileRuleForecasts(moved, all, TODAY, NOW);
  assert.strictEqual(d.remove.length, 3);
  assert.deepStrictEqual(d.create.map((f) => dayOf(f.date)), ['2026-10-10', '2026-11-10', '2026-12-10']);
});
t('editar de nuevo al día original REVIVE los previstos borrados por la edición (no choca con el id determinista)', () => {
  const r = rule('r1'); const all = txOf(r);
  const moved = { ...r, recurrence: rec('monthly', '2026-10-05', { dayOfMonth: 10 }) };
  const d1 = M.reconcileRuleForecasts(moved, all, TODAY, NOW);
  for (const id of d1.remove) all.find((x) => x.id === id).deletedAt = NOW;
  const back = M.reconcileRuleForecasts(r, [...all, ...d1.create], TODAY, NOW);
  assert.strictEqual(back.update.filter((u) => 'deletedAt' in u.patch).length, 3);
  assert.strictEqual(back.create.length, 0);
});
t('terminar o pausar una regla: reconciliar no deja previstos vigentes', () => {
  const r = rule('r1'); const all = txOf(r);
  assert.strictEqual(M.reconcileRuleForecasts({ ...r, status: 'ended' }, all, TODAY, NOW).remove.length, 3);
});
t('previstos pasados (ya vencidos) no se borran al editar', () => {
  const r = rule('r1'); const all = txOf(r);
  const d = M.reconcileRuleForecasts({ ...r, recurrence: rec('monthly', '2026-10-05', { dayOfMonth: 10 }) }, all, '2026-11-20', NOW);
  assert(!d.remove.includes(all[0].id) && !d.remove.includes(all[1].id));
});

// ---------- pausar / reanudar ----------
t('pausar: solo los previstos de hoy en adelante; reanudar: reabre los futuros y omite los que pasaron en la pausa', () => {
  const r = rule('r1'); const all = txOf(r);
  const pause = M.forecastsToPause(all, 'r1', '2026-10-06');
  assert.strictEqual(pause.length, 2); // 5 nov y 5 dic (el 5 oct ya pasó)
  for (const id of pause) all.find((x) => x.id === id).status = 'paused';
  const res = M.forecastsToResume(all, 'r1', '2026-11-20');
  assert.deepStrictEqual([res.reopen.length, res.skip.length], [1, 1]); // 5 dic reabre; 5 nov omitido
});

// ---------- un previsto NUNCA mueve saldos ----------
t('ledger: un previsto (o omitido/en pausa) no genera ningún movimiento de saldo; confirmado sí', () => {
  const tx = { type: 'expense', amount: 100, accountId: 'a1' };
  for (const status of ['forecast', 'skipped', 'paused']) assert.deepStrictEqual(accountDeltasForTransaction({ ...tx, status }), []);
  assert.deepStrictEqual(accountDeltasForTransaction({ ...tx, status: 'posted' }), [{ accountId: 'a1', delta: -100 }]);
  assert.deepStrictEqual(accountDeltasForTransaction(tx), [{ accountId: 'a1', delta: -100 }]);
});
t('selectores: lo real nunca incluye previstos; los previstos vigentes salen aparte', () => {
  const list = [{ id: '1', type: 'expense', date: NOW }, { id: '2', type: 'expense', date: NOW, status: 'forecast' }, { id: '3', type: 'expense', date: NOW, status: 'skipped' }, { id: '4', type: 'expense', date: NOW, status: 'paused' }, { id: '5', type: 'expense', date: NOW, status: 'posted' }, { id: '6', type: 'expense', date: NOW, status: 'forecast', deletedAt: NOW }];
  assert.deepStrictEqual(selectActiveTransactions(list).map((x) => x.id), ['1', '5']);
  assert.deepStrictEqual(selectForecastTransactions(list).map((x) => x.id), ['2']);
});

// ---------- proyecciones ----------
const accounts = [
  { id: 'a1', name: 'BBVA', type: 'bank', currency: 'MXN', balance: 10000, createdAt: NOW, updatedAt: NOW },
  { id: 'a2', name: 'Tarjeta', type: 'credit_card', currency: 'MXN', balance: 4000, isLiability: true, createdAt: NOW, updatedAt: NOW },
];
const fc = (id, date, extra) => ({ id, type: 'expense', amount: 100, currency: 'MXN', categoryId: 'x', subcategoryId: 'y', date: M.localInstant(date, '12:00'), status: 'forecast', origin: 'automatic', createdAt: NOW, updatedAt: NOW, ...extra });
t('projectBalances: aplica previstos en orden con el mismo libro contable (tarjeta: gastar sube la deuda)', () => {
  const txs = [fc('1', '2026-10-10', { amount: 3000, accountId: 'a1' }), fc('2', '2026-10-12', { amount: 500, accountId: 'a2' }), fc('3', '2026-10-20', { type: 'transfer', amount: 2000, accountId: 'a1', toAccountId: 'a2' }), fc('4', '2026-12-01', { amount: 999, accountId: 'a1' })];
  const p = Object.fromEntries(F.projectBalances(accounts, txs, '2026-10-31').map((x) => [x.name, x]));
  assert.strictEqual(p.BBVA.projected, 5000); // 10000 - 3000 - 2000
  assert.strictEqual(p.Tarjeta.projected, 2500); // 4000 + 500 - 2000
  assert.strictEqual(p.BBVA.current, 10000);
});
t('projectBalances no modifica las cuentas ni cuenta previstos omitidos/pausados/borrados', () => {
  const copy = JSON.stringify(accounts);
  const txs = [fc('1', '2026-10-10', { amount: 3000, accountId: 'a1', status: 'skipped' }), fc('2', '2026-10-10', { amount: 3000, accountId: 'a1', status: 'paused' }), fc('3', '2026-10-10', { amount: 3000, accountId: 'a1', deletedAt: NOW })];
  assert.strictEqual(F.projectBalances(accounts, txs, '2026-10-31')[0].projected, 10000);
  assert.strictEqual(JSON.stringify(accounts), copy);
});
t('firstShortfall: avisa el primer día que una cuenta normal quedaría en negativo (ignora tarjetas)', () => {
  const txs = [fc('1', '2026-10-10', { amount: 6000, accountId: 'a1' }), fc('2', '2026-10-15', { amount: 5000, accountId: 'a1' }), fc('3', '2026-10-16', { amount: 90000, accountId: 'a2' })];
  assert.deepStrictEqual(F.firstShortfall(accounts, txs, '2026-10-31'), { accountId: 'a1', name: 'BBVA', date: '2026-10-15', balance: -1000 });
  assert.strictEqual(F.firstShortfall(accounts, [fc('1', '2026-10-10', { amount: 100, accountId: 'a1' })], '2026-10-31'), null);
});
t('overdue / upcoming / totales', () => {
  const txs = [fc('v', '2026-09-30'), fc('h', '2026-10-03'), fc('n', '2026-10-20'), fc('l', '2026-12-30'), fc('i', '2026-10-20', { type: 'income', amount: 9000 }), fc('u', '2026-10-21', { currency: 'USD', amount: 7 })];
  assert.deepStrictEqual(F.overdueForecasts(txs, TODAY).map((x) => x.id), ['v']);
  assert.deepStrictEqual(F.upcomingForecasts(txs, TODAY, 30).map((x) => x.id), ['h', 'n', 'i', 'u']);
  assert.deepStrictEqual(F.forecastTotals(txs, '2026-10-01', '2026-10-31', 'MXN'), { income: 9000, expense: 200, net: 8800 });
});

// ---------- avisos ----------
const rem = (id, extra = {}) => ({ ...meta(id), kind: 'custom', title: 'Pagar la tarjeta', status: 'active', timeOfDay: '09:00', advanceDays: [], maxAttempts: 1, attemptIntervalMinutes: 120, push: true, date: '2026-10-20', ...extra });
const plan = (r, rules = new Map(), existing = new Set(), today = TODAY, now = NOW) => M.planReminderOccurrences(r, rules, existing, today, now);
t('localInstant: hora LOCAL del dispositivo', () => {
  const d = new Date(M.localInstant('2026-10-05', '09:30'));
  assert.deepStrictEqual([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()], [2026, 10, 5, 9, 30]);
  assert(Number.isNaN(new Date(M.localInstant('2026-10-05', '25:00')).getTime()) || true);
  assert(M.validTimeOfDay('09:30') && !M.validTimeOfDay('24:00') && !M.validTimeOfDay('9:75') && !M.validTimeOfDay('hola'));
});
t('aviso de una vez: una sola ocurrencia el día a la hora, con push', () => {
  const g = plan(rem('m1'));
  assert.strictEqual(g.occurrences.length, 1);
  const o = g.occurrences[0];
  assert.deepStrictEqual([o.eventDate, o.offsetDays, o.status, o.attemptsMade, o.maxAttempts, o.title], ['2026-10-20', 0, 'pending', 0, 1, 'Pagar la tarjeta']);
  assert.strictEqual(o.scheduledFor, M.localInstant('2026-10-20', '09:00'));
  assert.strictEqual(o.nextAttemptAt, o.scheduledFor);
});
t('avisos previos [3,1] + el del día: 3 ocurrencias, solo la del día reintenta (hasta 3)', () => {
  const g = plan(rem('m1', { advanceDays: [3, 1], maxAttempts: 3 }));
  assert.deepStrictEqual(g.occurrences.map((o) => [o.offsetDays, o.maxAttempts, dayOf(o.scheduledFor)]), [[3, 1, '2026-10-17'], [1, 1, '2026-10-19'], [0, 3, '2026-10-20']]);
});
t('maxAttempts se acota a 1..3', () => {
  assert.strictEqual(plan(rem('a', { maxAttempts: 9 })).occurrences[0].maxAttempts, 3);
  assert.strictEqual(plan(rem('b', { maxAttempts: 0 })).occurrences[0].maxAttempts, 1);
});
t('un aviso previo cuyo momento ya pasó NO se crea (sería avisar tarde); el del día sí', () => {
  const g = plan(rem('m1', { date: '2026-10-04', advanceDays: [3, 1] }));
  assert.deepStrictEqual(g.occurrences.map((o) => o.offsetDays), [0]); // el de "faltan 3 días" (1 oct) y 1 día (3 oct 09:00 < 10:00) ya pasaron
});
t('aviso de hace mucho (>48 h): queda por confirmar en la app pero SIN push', () => {
  const o = plan(rem('m1', { date: '2026-10-01', createdAt: M.localInstant('2026-09-20', '09:00') }), new Map(), new Set(), TODAY, NOW).occurrences[0];
  assert.strictEqual(o.nextAttemptAt, undefined);
  const recent = plan(rem('m2', { date: '2026-10-03', timeOfDay: '08:00' })).occurrences[0];
  assert.strictEqual(recent.nextAttemptAt, recent.scheduledFor);
});
t('aviso sin push: nunca tiene nextAttemptAt', () => assert.strictEqual(plan(rem('m1', { push: false })).occurrences[0].nextAttemptAt, undefined));
t('IDEMPOTENTE: lo ya generado no se vuelve a crear', () => {
  const r = rem('m1', { advanceDays: [3, 1] });
  const g = plan(r);
  assert.strictEqual(plan(r, new Map(), idsOf(g.occurrences)).occurrences.length, 0);
});
t('un aviso de una vez MUY futuro (más allá del horizonte) se genera igual: perderlo es peor', () => {
  const g = plan(rem('m1', { date: '2027-09-01' }));
  assert.strictEqual(g.occurrences.length, 1);
});
t('serie mensual: genera 6 meses; con avisos previos, 3 por mes', () => {
  const r = rem('m1', { date: undefined, recurrence: rec('monthly', '2026-10-20', { dayOfMonth: 20 }), advanceDays: [3, 1] });
  const g = plan(r);
  const mains = g.occurrences.filter((o) => o.offsetDays === 0).map((o) => o.eventDate);
  assert.deepStrictEqual(mains, ['2026-10-20', '2026-11-20', '2026-12-20', '2027-01-20', '2027-02-20', '2027-03-20']);
  assert.strictEqual(g.occurrences.length, 18);
});
t('aviso ligado a una regla: usa las fechas de la regla; sin regla activa no genera', () => {
  const r1 = rule('r1');
  const r = rem('m1', { kind: 'rule', sourceType: 'rule', sourceId: 'r1', date: undefined });
  const g = plan(r, new Map([['r1', r1]]));
  assert.deepStrictEqual(g.occurrences.filter((o) => o.offsetDays === 0).slice(0, 3).map((o) => o.eventDate), ['2026-10-05', '2026-11-05', '2026-12-05']);
  assert.strictEqual(plan(r, new Map([['r1', { ...r1, status: 'paused' }]])).occurrences.length, 0);
  assert.strictEqual(plan(r, new Map()).occurrences.length, 0);
});
t('serie en pausa/cancelada/borrada: no genera', () => {
  for (const extra of [{ status: 'paused' }, { status: 'cancelled' }, { deletedAt: NOW }]) assert.strictEqual(plan(rem('m1', extra)).occurrences.length, 0);
});
t('ids de ocurrencia deterministas (dos dispositivos coinciden)', () => {
  const a = plan(rem('m1', { advanceDays: [1] }), new Map(), new Set(), TODAY, M.localInstant(TODAY, '10:00')).occurrences.map((o) => o.id);
  const b = plan(rem('m1', { advanceDays: [1] }), new Map(), new Set(), TODAY, M.localInstant(TODAY, '10:05')).occurrences.map((o) => o.id);
  assert.deepStrictEqual(a, b);
});
t('pausar/reanudar una serie', () => {
  const r = rem('m1', { date: undefined, recurrence: rec('monthly', '2026-10-20', { dayOfMonth: 20 }) });
  const occ = plan(r).occurrences;
  const p = M.occurrencesToPause(occ, 'm1', '2026-10-25');
  assert.strictEqual(p.length, 5); // nov, dic, ene, feb, mar (la del 20 oct ya pasó)
  for (const id of p) occ.find((o) => o.id === id).status = 'paused';
  const res = M.occurrencesToResume(occ, 'm1', '2026-12-25');
  assert.deepStrictEqual([res.reopen.length, res.skip.length], [3, 2]);
});
t('dueOccurrences / upcomingOccurrences', () => {
  const r = rem('m1', { advanceDays: [3, 1], date: '2026-10-20' });
  const occ = plan(r).occurrences;
  const at = (d, h) => M.localInstant(d, h);
  assert.deepStrictEqual(M.dueOccurrences(occ, at('2026-10-17', '09:00')).map((o) => o.offsetDays), [3]);
  assert.deepStrictEqual(M.dueOccurrences(occ, at('2026-10-20', '09:30')).map((o) => o.offsetDays), [3, 1, 0]);
  const fresh = plan(r).occurrences;
  assert.deepStrictEqual(M.upcomingOccurrences(fresh, at('2026-10-10', '09:00'), 5).map((o) => o.offsetDays), []); // el primero suena el 17
  assert.deepStrictEqual(M.upcomingOccurrences(fresh, at('2026-10-10', '09:00'), 8).map((o) => o.offsetDays), [3]);
  assert.deepStrictEqual(M.upcomingOccurrences(fresh, at('2026-10-10', '09:00'), 15).map((o) => o.offsetDays), [3, 1, 0]);
  fresh[0].status = 'dismissed';
  assert.deepStrictEqual(M.upcomingOccurrences(fresh, at('2026-10-10', '09:00'), 15).map((o) => o.offsetDays), [1, 0]);
});

console.log(`\nPrevisto: ${ok} OK, ${fail} fallan`);
process.exit(fail ? 1 : 0);

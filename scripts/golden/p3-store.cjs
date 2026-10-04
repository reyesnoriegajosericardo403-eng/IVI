// Pruebas de P3 con el store REAL: lo previsto no mueve saldos, confirmar los mueve una sola vez, reglas recurrentes
// (crear / pausar / reanudar / terminar), avisos con intentos, y que todo sea idempotente.
//   node scripts/golden/p3-store.cjs [--show]
require('./ts-hook.cjs');
const Module = require('module');
const path = require('path');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === '@react-native-async-storage/async-storage') return path.join(__dirname, 'stub-async-storage.cjs');
  if (/^(expo|react-native|@expo)/.test(request)) return path.join(__dirname, 'stub-native.cjs');
  return origResolve.call(this, request, ...rest);
};
const assert = require('assert');
const { useAppStore } = require('@/store/useAppStore');
const S = () => useAppStore.getState();

let ok = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); ok++; if (process.argv.includes('--show')) console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name, '\n     ', String(e.stack || e.message).split('\n').slice(0, 4).join('\n      ')); }
};

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const noon = (iso) => new Date(`${iso}T12:00:00`).toISOString();
const TODAY = ymd(new Date());

const setup = () => {
  S().resetAll();
  S().addAccount({ name: 'BBVA', type: 'bank', currency: 'MXN', balance: 10000 });
  S().addAccount({ name: 'Nu', type: 'savings', currency: 'MXN', balance: 2000 });
  S().addAccount({ name: 'Tarjeta', type: 'credit_card', currency: 'MXN', balance: 3000, isLiability: true });
  S().addGoal({ name: 'Viaje', targetAmount: 20000, currentAmount: 1000, currency: 'MXN' });
};
const acc = (n) => S().accounts.find((a) => a.name === n);
const bal = (n) => acc(n).balance;
const fcs = (ruleId) => S().transactions.filter((x) => !x.deletedAt && x.status === 'forecast' && (!ruleId || x.recurringRuleId === ruleId));
const live = (list) => list.filter((x) => !x.deletedAt);
const rec = (frequency, startDate, extra = {}) => ({ frequency, interval: 1, startDate, ...extra });
const rentDraft = (extra = {}) => ({ kind: 'transaction', name: 'Renta', amount: 8000, currency: 'MXN', txType: 'expense', categoryId: 'housing', subcategoryId: 'house_rent', accountId: acc('BBVA').id, recurrence: rec('monthly', TODAY, { dayOfMonth: new Date().getDate() }), ...extra });
const occsOf = (reminderId) => live(S().reminderOccurrences).filter((o) => o.reminderId === reminderId);

// ---------- previstos ----------
setup();
t('un previsto NO mueve saldos al crearse', () => {
  const before = bal('BBVA');
  const tx = S().addForecast({ type: 'expense', amount: 500, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_restaurant', accountId: acc('BBVA').id, date: noon(plusDays(5)), origin: 'manual' });
  assert.strictEqual(tx.status, 'forecast');
  assert.strictEqual(bal('BBVA'), before);
});
t('confirmar un previsto de fecha futura se registra hoy y mueve el saldo UNA sola vez', () => {
  const tx = fcs()[0];
  const before = bal('BBVA');
  assert.strictEqual(S().confirmForecast(tx.id).ok, true);
  assert.strictEqual(bal('BBVA'), before - 500);
  assert.strictEqual(S().transactions.find((x) => x.id === tx.id).status, 'posted');
  assert.strictEqual(S().confirmForecast(tx.id).ok, false, 'confirmar dos veces debe fallar');
  assert.strictEqual(bal('BBVA'), before - 500, 'el segundo intento no movió nada');
});
t('confirmar con otro monto y otra cuenta usa los valores nuevos', () => {
  const tx = S().addForecast({ type: 'expense', amount: 100, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_restaurant', accountId: acc('BBVA').id, date: noon(plusDays(2)), origin: 'manual' });
  const b = bal('BBVA'), n = bal('Nu');
  assert.strictEqual(S().confirmForecast(tx.id, { amount: 150, accountId: acc('Nu').id }).ok, true);
  assert.strictEqual(bal('BBVA'), b);
  assert.strictEqual(bal('Nu'), n - 150);
});
t('"no ocurrió" no mueve saldos y se puede reabrir; un previsto omitido no se confirma', () => {
  const tx = S().addForecast({ type: 'expense', amount: 700, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_restaurant', accountId: acc('BBVA').id, date: noon(plusDays(1)), origin: 'manual' });
  const b = bal('BBVA');
  assert.strictEqual(S().skipForecast(tx.id).ok, true);
  assert.strictEqual(bal('BBVA'), b);
  assert.strictEqual(S().confirmForecast(tx.id).ok, false);
  assert.strictEqual(S().reopenForecast(tx.id).ok, true);
  assert.strictEqual(S().transactions.find((x) => x.id === tx.id).status, 'forecast');
  assert.strictEqual(S().reopenForecast(tx.id).ok, false, 'reabrir algo que no está omitido falla');
});
t('posponer cambia la fecha pero conserva plannedDate; no acepta fechas pasadas', () => {
  const tx = S().addForecast({ type: 'expense', amount: 90, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_restaurant', accountId: acc('BBVA').id, date: noon(plusDays(1)), origin: 'manual' });
  assert.strictEqual(S().postponeForecast(tx.id, plusDays(-1)).ok, false);
  assert.strictEqual(S().postponeForecast(tx.id, plusDays(4)).ok, true);
  const cur = S().transactions.find((x) => x.id === tx.id);
  assert.strictEqual(cur.date.slice(0, 10) >= plusDays(3), true);
  assert(cur.plannedDate);
});
t('no se puede confirmar con fecha futura ni con monto inválido', () => {
  const tx = S().addForecast({ type: 'expense', amount: 60, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_restaurant', accountId: acc('BBVA').id, date: noon(plusDays(3)), origin: 'manual' });
  assert.strictEqual(S().confirmForecast(tx.id, { date: plusDays(2) }).ok, false);
  assert.strictEqual(S().confirmForecast(tx.id, { amount: -5 }).ok, false);
  assert.strictEqual(S().confirmForecast(tx.id, { amount: NaN }).ok, false);
  assert.strictEqual(S().transactions.find((x) => x.id === tx.id).status, 'forecast');
});
t('previsto en tarjeta de crédito: confirmarlo SUBE la deuda', () => {
  const tx = S().addForecast({ type: 'expense', amount: 400, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_restaurant', accountId: acc('Tarjeta').id, date: noon(plusDays(1)), origin: 'manual' });
  const b = bal('Tarjeta');
  S().confirmForecast(tx.id);
  assert.strictEqual(bal('Tarjeta'), b + 400);
});
t('un previsto de una cuenta que se borró no se puede confirmar', () => {
  S().addAccount({ name: 'Temp', type: 'cash', currency: 'MXN', balance: 10 });
  const tx = S().addForecast({ type: 'expense', amount: 5, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_restaurant', accountId: acc('Temp').id, date: noon(plusDays(1)), origin: 'manual' });
  S().deleteAccount(acc('Temp').id);
  assert.strictEqual(S().confirmForecast(tx.id).ok, false);
});

// ---------- reglas recurrentes ----------
setup();
let rule;
t('createRule: crea regla + previstos futuros + aviso; los saldos no cambian', () => {
  const b = bal('BBVA');
  const r = S().createRule(rentDraft());
  assert.strictEqual(r.ok, true, r.error);
  rule = r.rule;
  assert(fcs(rule.id).length >= 3, `previstos: ${fcs(rule.id).length}`);
  assert.strictEqual(bal('BBVA'), b);
  const rem = live(S().reminders).find((x) => x.sourceId === rule.id);
  assert(rem, 'debe crear su aviso');
  assert(occsOf(rem.id).length >= 3);
});
t('runMaterialization es idempotente: correrlo 3 veces no duplica previstos ni avisos', () => {
  const f = fcs(rule.id).length, o = live(S().reminderOccurrences).length;
  for (let i = 0; i < 3; i++) S().runMaterialization();
  assert.strictEqual(fcs(rule.id).length, f);
  assert.strictEqual(live(S().reminderOccurrences).length, o);
  const ids = S().transactions.map((x) => x.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'ids únicos');
});
t('el previsto de hoy se puede confirmar y su aviso del día se cierra', () => {
  const todayFc = fcs(rule.id).find((x) => x.date.slice(0, 10) === TODAY);
  assert(todayFc, 'hay previsto hoy');
  const b = bal('BBVA');
  assert.strictEqual(S().confirmForecast(todayFc.id).ok, true);
  assert.strictEqual(bal('BBVA'), b - 8000);
  const rem = live(S().reminders).find((x) => x.sourceId === rule.id);
  const o = occsOf(rem.id).find((x) => x.eventDate === TODAY && x.offsetDays === 0);
  assert.strictEqual(o.status, 'confirmed');
  S().runMaterialization();
  assert.strictEqual(S().transactions.filter((x) => x.recurringRuleId === rule.id && x.date.slice(0, 10) === TODAY && !x.deletedAt).length, 1, 'no se regenera el confirmado');
});
t('pausar la regla: sus previstos futuros quedan pausados y no se generan más; reanudar los vuelve', () => {
  assert.strictEqual(S().pauseRule(rule.id).ok, true);
  assert.strictEqual(fcs(rule.id).length, 0);
  S().runMaterialization();
  assert.strictEqual(fcs(rule.id).length, 0, 'pausada no genera');
  const rem = live(S().reminders).find((x) => x.sourceId === rule.id);
  assert(occsOf(rem.id).every((o) => o.status !== 'pending' || o.eventDate <= TODAY), 'sin avisos pendientes futuros');
  assert.strictEqual(S().resumeRule(rule.id).ok, true);
  assert(fcs(rule.id).length >= 2);
  assert.strictEqual(S().pauseRule(rule.id).ok && S().pauseRule(rule.id).ok, false, 'pausar dos veces falla');
  S().resumeRule(rule.id);
});
t('updateRule: cambiar el monto actualiza los previstos abiertos pero no el ya confirmado', () => {
  const posted = S().transactions.filter((x) => x.recurringRuleId === rule.id && x.status === 'posted');
  assert.strictEqual(S().updateRule(rule.id, { amount: 9000 }).ok, true);
  assert(fcs(rule.id).every((x) => x.amount === 9000));
  assert(S().transactions.filter((x) => x.recurringRuleId === rule.id && x.status === 'posted').every((x, i) => x.amount === posted[i].amount));
});
t('updateRule con datos inválidos se rechaza sin cambiar nada', () => {
  const before = JSON.stringify(S().recurringRules.find((r) => r.id === rule.id));
  assert.strictEqual(S().updateRule(rule.id, { amount: -1 }).ok, false);
  assert.strictEqual(S().updateRule(rule.id, { accountId: 'no-existe' }).ok, false);
  assert.strictEqual(JSON.stringify(S().recurringRules.find((r) => r.id === rule.id)), before);
});
t('endRule: se quitan los previstos futuros, queda ended y no genera más', () => {
  assert.strictEqual(S().endRule(rule.id).ok, true);
  assert.strictEqual(fcs(rule.id).length, 0);
  assert.strictEqual(S().recurringRules.find((r) => r.id === rule.id).status, 'ended');
  S().runMaterialization();
  assert.strictEqual(fcs(rule.id).length, 0);
  assert.strictEqual(S().transactions.filter((x) => x.recurringRuleId === rule.id && x.status === 'posted').length, 1, 'lo ya confirmado se conserva');
});
t('createRule inválido (sin cuenta / monto 0 / transferencia a la misma cuenta) no deja nada a medias', () => {
  const before = { r: S().recurringRules.length, t: S().transactions.length, m: S().reminders.length };
  assert.strictEqual(S().createRule(rentDraft({ accountId: 'x' })).ok, false);
  assert.strictEqual(S().createRule(rentDraft({ amount: 0 })).ok, false);
  assert.strictEqual(S().createRule(rentDraft({ txType: 'transfer', toAccountId: acc('BBVA').id })).ok, false);
  assert.deepStrictEqual({ r: S().recurringRules.length, t: S().transactions.length, m: S().reminders.length }, before);
});
t('regla sin aviso (remind:false) genera previstos pero ningún aviso', () => {
  const before = S().reminders.length;
  const r = S().createRule(rentDraft({ name: 'Netflix', amount: 199 }), { remind: false });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(S().reminders.length, before);
  assert(fcs(r.rule.id).length >= 3);
});
t('deleteRule borra la regla y sus previstos abiertos, no los confirmados', () => {
  const r = S().createRule(rentDraft({ name: 'Gym', amount: 500 }));
  const first = fcs(r.rule.id).find((x) => x.date.slice(0, 10) === TODAY);
  S().confirmForecast(first.id);
  assert.strictEqual(S().deleteRule(r.rule.id).ok, true);
  assert.strictEqual(fcs(r.rule.id).length, 0);
  assert.strictEqual(S().transactions.filter((x) => x.recurringRuleId === r.rule.id && x.status === 'posted' && !x.deletedAt).length, 1);
  assert(!S().recurringRules.some((x) => x.id === r.rule.id && !x.deletedAt));
});
t('regla de transferencia: previsto es transferencia, confirmar mueve ambas cuentas', () => {
  const r = S().createRule(rentDraft({ name: 'Ahorro', amount: 300, txType: 'transfer', toAccountId: acc('Nu').id, categoryId: undefined, subcategoryId: undefined }), { remind: false });
  assert.strictEqual(r.ok, true, r.error);
  const f = fcs(r.rule.id).find((x) => x.date.slice(0, 10) === TODAY);
  const b = bal('BBVA'), n = bal('Nu');
  assert.strictEqual(S().confirmForecast(f.id).ok, true);
  assert.strictEqual(bal('BBVA'), b - 300);
  assert.strictEqual(bal('Nu'), n + 300);
});

// ---------- aportación periódica a meta ----------
setup();
t('regla de aportación a meta: confirmar el aviso aporta a la meta una sola vez', () => {
  const goal = S().goals[0];
  const r = S().createRule({ kind: 'goal_contribution', name: 'Ahorro viaje', amount: 250, currency: 'MXN', goalId: goal.id, recurrence: rec('weekly', TODAY) });
  assert.strictEqual(r.ok, true, r.error);
  const rem = live(S().reminders).find((x) => x.sourceId === r.rule.id);
  const o = occsOf(rem.id).find((x) => x.eventDate === TODAY && x.offsetDays === 0);
  assert(o, 'aviso de hoy');
  const before = S().goals[0].currentAmount;
  assert.strictEqual(S().confirmOccurrence(o.id).ok, true);
  assert.strictEqual(S().goals[0].currentAmount, before + 250);
  assert.strictEqual(S().confirmOccurrence(o.id).ok, false, 'doble toque no duplica');
  assert.strictEqual(S().goals[0].currentAmount, before + 250);
});
t('aportación a una meta que ya no existe falla y NO cierra el aviso', () => {
  const g = S().addGoal({ name: 'Moto', targetAmount: 5000, currentAmount: 0, currency: 'MXN' });
  const goal = S().goals.find((x) => x.name === 'Moto');
  const r = S().createRule({ kind: 'goal_contribution', name: 'Moto', amount: 100, currency: 'MXN', goalId: goal.id, recurrence: rec('weekly', TODAY) });
  S().deleteGoal(goal.id);
  const rem = live(S().reminders).find((x) => x.sourceId === r.rule.id);
  const o = occsOf(rem.id).find((x) => x.eventDate === TODAY && x.offsetDays === 0);
  const res = S().confirmOccurrence(o.id);
  assert.strictEqual(res.ok, false);
  assert(['pending', 'sent'].includes(S().reminderOccurrences.find((x) => x.id === o.id).status));
});

// ---------- avisos propios ----------
setup();
t('createReminder: válido crea la serie y sus ocurrencias; inválido se rechaza', () => {
  assert.strictEqual(S().createReminder({ title: '' }).ok, false);
  assert.strictEqual(S().createReminder({ title: 'Pagar luz' }).ok, false, 'sin fecha');
  assert.strictEqual(S().createReminder({ title: 'Pagar luz', date: plusDays(5), maxAttempts: 9 }).ok, false);
  assert.strictEqual(S().createReminder({ title: 'Pagar luz', date: plusDays(5), timeOfDay: '25:00' }).ok, false);
  const r = S().createReminder({ title: 'Pagar luz', date: plusDays(5), advanceDays: [3, 1], maxAttempts: 3, attemptIntervalMinutes: 100 });
  assert.strictEqual(r.ok, true, r.error);
  assert.strictEqual(r.reminder.attemptIntervalMinutes % 60, 0, 'el intervalo se normaliza a múltiplo de 60');
  const occs = occsOf(r.reminder.id);
  assert.deepStrictEqual(occs.map((o) => o.offsetDays).sort(), [0, 1, 3]);
  assert(occs.every((o) => o.title === 'Pagar luz' && o.push === true));
  const main = occs.find((o) => o.offsetDays === 0);
  assert.strictEqual(main.maxAttempts, 3);
  const pre = occs.filter((o) => o.offsetDays > 0);
  assert(pre.every((o) => o.maxAttempts === 1), 'los avisos previos son de un solo intento');
});
t('el aviso de una sola vez jamás se duplica al regenerar', () => {
  const n = live(S().reminderOccurrences).length;
  S().runMaterialization(); S().runMaterialization();
  assert.strictEqual(live(S().reminderOccurrences).length, n);
});
t('"ya ocurrió" cierra la ocurrencia y los avisos previos; no se puede repetir', () => {
  const rem = live(S().reminders)[0];
  const main = occsOf(rem.id).find((o) => o.offsetDays === 0);
  assert.strictEqual(S().confirmOccurrence(main.id).ok, true);
  assert.strictEqual(S().reminderOccurrences.find((o) => o.id === main.id).status, 'confirmed');
  assert(occsOf(rem.id).filter((o) => o.offsetDays > 0).every((o) => o.status === 'dismissed'));
  assert.strictEqual(S().confirmOccurrence(main.id).ok, false);
});
t('"no ocurrió" y "omitir esta vez" cierran la ocurrencia', () => {
  const a = S().createReminder({ title: 'Seguro', date: plusDays(2) }).reminder;
  const b = S().createReminder({ title: 'Agua', date: plusDays(3) }).reminder;
  const oa = occsOf(a.id)[0], ob = occsOf(b.id)[0];
  assert.strictEqual(S().markOccurrenceNotHappened(oa.id).ok, true);
  assert.strictEqual(S().skipOccurrence(ob.id).ok, true);
  assert.strictEqual(S().reminderOccurrences.find((o) => o.id === oa.id).status, 'not_occurred');
  assert.strictEqual(S().reminderOccurrences.find((o) => o.id === ob.id).status, 'skipped');
});
t('posponer una ocurrencia mueve su próximo intento y cuenta el aplazamiento', () => {
  const rem = S().createReminder({ title: 'Dentista', date: TODAY, timeOfDay: '08:00' }).reminder;
  const o = occsOf(rem.id)[0];
  assert.strictEqual(S().postponeOccurrence(o.id, { minutes: 60 }).ok, true);
  const cur = S().reminderOccurrences.find((x) => x.id === o.id);
  assert.strictEqual(cur.postponedCount, 1);
  assert(new Date(cur.nextAttemptAt).getTime() > Date.now() + 50 * 60 * 1000, 'sonará en ~1 hora');
  assert.strictEqual(S().postponeOccurrence(o.id, { untilIso: new Date(Date.now() - 1000).toISOString() }).ok, false, 'no se puede posponer al pasado');
  assert.strictEqual(S().postponeOccurrence(o.id, { minutes: -5 }).ok, false);
});
t('pausar / reanudar / cancelar un aviso', () => {
  const rem = S().createReminder({ title: 'Predial', date: plusDays(10), advanceDays: [2] }).reminder;
  assert.strictEqual(S().pauseReminder(rem.id).ok, true);
  assert(occsOf(rem.id).every((o) => o.status === 'paused'));
  assert.strictEqual(S().resumeReminder(rem.id).ok, true);
  assert(occsOf(rem.id).every((o) => o.status === 'pending'));
  assert.strictEqual(S().cancelReminder(rem.id).ok, true);
  assert(occsOf(rem.id).every((o) => o.status === 'cancelled'));
  S().runMaterialization();
  assert(occsOf(rem.id).every((o) => o.status === 'cancelled'), 'cancelado no revive');
});
t('serie con recurrencia: genera ocurrencias por adelantado, sin duplicados', () => {
  const rem = S().createReminder({ title: 'Corte de tarjeta', kind: 'card_cutoff', recurrence: rec('monthly', TODAY, { dayOfMonth: 15 }), advanceDays: [2] }).reminder;
  const occs = occsOf(rem.id).filter((o) => o.offsetDays === 0);
  assert(occs.length >= 3);
  assert.strictEqual(new Set(occs.map((o) => o.eventDate)).size, occs.length);
  assert(occs.every((o) => o.eventDate.endsWith('-15')));
  const n = live(S().reminderOccurrences).length;
  S().runMaterialization();
  assert.strictEqual(live(S().reminderOccurrences).length, n);
});

// ---------- cola de sincronización ----------
t('las tablas nuevas entran a la cola de sincronización con su nombre correcto', () => {
  setup();
  S().createRule(rentDraft());
  S().createReminder({ title: 'Pagar luz', date: plusDays(5) });
  const tables = new Set(S().pendingSync.map((q) => q.table));
  for (const need of ['recurring_rules', 'reminders', 'reminder_occurrences', 'transactions']) assert(tables.has(need), `falta ${need}: ${[...tables]}`);
  assert(S().pendingSync.every((q) => q.payload || q.op === 'delete'));
});
t('resetAll deja todo P3 en blanco', () => {
  S().resetAll();
  assert.deepStrictEqual([S().recurringRules.length, S().reminders.length, S().reminderOccurrences.length], [0, 0, 0]);
});

console.log(`\nStore P3: ${ok} OK, ${fail} fallan`);
process.exit(fail ? 1 : 0);

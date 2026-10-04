// Tarjeta de crédito (P3-TC) — lo PURO: calendario de corte y pago, estado de cuenta calculado, estado del pago y avisos.
//   node scripts/golden/tarjeta.cjs [--show]
require('./ts-hook.cjs');
const assert = require('assert');
const C = require('@/utils/creditCard');

let ok = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); ok++; if (process.argv.includes('--show')) console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name, '\n     ', String(e.stack || e.message).split('\n').slice(0, 4).join('\n      ')); }
};
const meta = { id: 'x', createdAt: 'x', updatedAt: 'x' };
const card = (balance, extra = {}) => ({ ...meta, id: 'card', name: 'Oro', type: 'credit_card', currency: 'MXN', balance, isLiability: true, cardCutoffDay: 5, cardDueDay: 25, ...extra });
let n = 0;
const tx = (day, type, amount, extra = {}) => ({ ...meta, id: `t${++n}`, type, amount, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_restaurant', accountId: 'card', date: `${day}T12:00:00`, origin: 'manual', ...extra });
const pay = (day, amount, extra = {}) => ({ ...meta, id: `p${++n}`, type: 'transfer', amount, currency: 'MXN', categoryId: 'transfer', subcategoryId: 'transfer_own', accountId: 'bank', toAccountId: 'card', date: `${day}T12:00:00`, origin: 'manual', ...extra });

// ---------- calendario ----------
t('último y próximo corte: el día del corte ya cuenta como cerrado', () => {
  assert.deepStrictEqual([C.lastCutoff(5, '2026-10-04'), C.nextCutoff(5, '2026-10-04')], ['2026-09-05', '2026-10-05']);
  assert.deepStrictEqual([C.lastCutoff(5, '2026-10-05'), C.nextCutoff(5, '2026-10-05')], ['2026-10-05', '2026-11-05']);
  assert.deepStrictEqual([C.lastCutoff(5, '2026-10-06'), C.nextCutoff(5, '2026-10-06')], ['2026-10-05', '2026-11-05']);
});
t('corte 31 y 30: se ajusta al último día del mes (febrero, bisiesto, abril)', () => {
  assert.deepStrictEqual([C.lastCutoff(31, '2026-02-15'), C.nextCutoff(31, '2026-02-15')], ['2026-01-31', '2026-02-28']);
  assert.deepStrictEqual([C.lastCutoff(31, '2028-02-15'), C.nextCutoff(31, '2028-02-15')], ['2028-01-31', '2028-02-29']);
  assert.deepStrictEqual([C.lastCutoff(30, '2026-03-10'), C.nextCutoff(30, '2026-03-10')], ['2026-02-28', '2026-03-30']);
  assert.strictEqual(C.nextCutoff(31, '2026-04-10'), '2026-04-30');
});
t('cambio de año: corte en diciembre y enero', () => {
  assert.deepStrictEqual([C.lastCutoff(20, '2027-01-10'), C.nextCutoff(20, '2027-01-10')], ['2026-12-20', '2027-01-20']);
  assert.strictEqual(C.nextCutoff(15, '2026-12-31'), '2027-01-15');
  assert.strictEqual(C.lastCutoff(15, '2027-01-01'), '2026-12-15');
});
t('fecha límite: el primer día de ese número DESPUÉS del corte (mismo mes o el siguiente)', () => {
  assert.strictEqual(C.dueDateFor('2026-10-05', 25), '2026-10-25');
  assert.strictEqual(C.dueDateFor('2026-10-25', 15), '2026-11-15');
  assert.strictEqual(C.dueDateFor('2026-10-05', 5), '2026-11-05', 'mismo número: el mes siguiente');
  assert.strictEqual(C.dueDateFor('2026-12-20', 10), '2027-01-10');
  assert.strictEqual(C.dueDateFor('2026-01-31', 31), '2026-02-28');
  assert.strictEqual(C.dueDateFor('2026-01-20', 31), '2026-01-31');
  assert.strictEqual(C.dueDateFor('2028-01-31', 30), '2028-02-29');
});
t('ciclo completo: fechas y cuántos días faltan', () => {
  const c = C.cardCycle({ cutoffDay: 5, dueDay: 25 }, '2026-10-20');
  assert.deepStrictEqual({ ...c }, { lastCutoff: '2026-10-05', lastDue: '2026-10-25', nextCutoff: '2026-11-05', nextDue: '2026-11-25', daysToLastDue: 5, daysToNextCutoff: 16 });
});
t('para CUALQUIER día de corte/pago y cualquier "hoy" del año: último ≤ hoy < próximo, y pago siempre después del corte (barrido de 4 años)', () => {
  for (let cut = 1; cut <= 31; cut += 3) for (let due = 1; due <= 31; due += 4) {
    for (let d = new Date(2026, 0, 1); d < new Date(2029, 0, 1); d.setDate(d.getDate() + 11)) {
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const c = C.cardCycle({ cutoffDay: cut, dueDay: due }, today);
      assert(c.lastCutoff <= today && today < c.nextCutoff, `${cut}/${due} ${today}: ${JSON.stringify(c)}`);
      assert(c.lastDue > c.lastCutoff && c.nextDue > c.nextCutoff, `pago antes del corte ${JSON.stringify(c)}`);
      assert(c.nextCutoff.slice(8) === String(Math.min(cut, new Date(+c.nextCutoff.slice(0, 4), +c.nextCutoff.slice(5, 7), 0).getDate())).padStart(2, '0'), `día de corte ${cut} → ${c.nextCutoff}`);
    }
  }
});

// ---------- estado de cuenta ----------
// hoy 2026-10-20, corte 5, pago 25. Saldo al cierre del 5-oct: 3000 previos + 1000 + 800 = 4800.
const base = () => [tx('2026-09-20', 'expense', 1000), tx('2026-10-01', 'expense', 800), tx('2026-10-10', 'expense', 600), pay('2026-10-12', 2000)];
t('estado de cuenta: reconstruye el saldo al corte desde el saldo de hoy y los movimientos posteriores', () => {
  const st = C.cardStatement(card(3400), base(), '2026-10-05', 5);
  assert.deepStrictEqual({ b: st.balanceAtCutoff, c: st.charges, cr: st.credits, from: st.periodStart }, { b: 4800, c: 1800, cr: 0, from: '2026-09-06' });
});
t('lo que se debe pagar: saldo al corte menos lo pagado después; estado "pendiente" antes del límite', () => {
  const d = C.cardDue(card(3400), base(), '2026-10-20');
  assert.deepStrictEqual({ s: d.statementBalance, paid: d.paidSinceCutoff, rem: d.remaining, st: d.status, due: d.dueDate, days: d.daysToDue }, { s: 4800, paid: 2000, rem: 2800, st: 'pending', due: '2026-10-25', days: 5 });
});
t('pagando el resto queda "paid"; después del límite la fecha que importa pasa al siguiente corte', () => {
  const txs = [...base(), pay('2026-10-21', 2800)];
  const d = C.cardDue(card(600), txs, '2026-10-22');
  assert.deepStrictEqual({ rem: d.remaining, st: d.status, due: d.dueDate }, { rem: 0, st: 'paid', due: '2026-10-25' });
  const later = C.cardDue(card(600), txs, '2026-10-26');
  assert.deepStrictEqual({ st: later.status, due: later.dueDate }, { st: 'paid', due: '2026-11-25' });
});
t('sin pagar y pasada la fecha límite: "vencido"', () => {
  const d = C.cardDue(card(5400), [tx('2026-09-20', 'expense', 1000), tx('2026-10-01', 'expense', 800), tx('2026-10-10', 'expense', 600)], '2026-10-27');
  assert.deepStrictEqual({ st: d.status, due: d.dueDate, days: d.daysToDue, rem: d.remaining }, { st: 'overdue', due: '2026-10-25', days: -2, rem: 4800 });
});
t('compras DESPUÉS del corte no entran al pago de este estado (van al siguiente)', () => {
  const d = C.cardDue(card(4800 + 999), [tx('2026-09-20', 'expense', 1000), tx('2026-10-01', 'expense', 800), tx('2026-10-15', 'expense', 999)], '2026-10-20');
  assert.strictEqual(d.remaining, 4800);
});
t('una compra el MISMO día del corte entra a ese estado', () => {
  const d = C.cardDue(card(3000 + 500), [tx('2026-10-05', 'expense', 500)], '2026-10-20');
  assert.strictEqual(d.statementBalance, 3500);
});
t('un reembolso baja la deuda como un pago; un pago antes del corte no cuenta como "pagado después"', () => {
  const txs = [pay('2026-10-01', 1000), tx('2026-10-08', 'income', 300, { categoryId: 'income', subcategoryId: 'inc_reimbursement' })];
  const d = C.cardDue(card(1500), txs, '2026-10-20'); // al corte: 1500 + 300 = 1800 (el pago del 1-oct ya está dentro)
  assert.deepStrictEqual({ s: d.statementBalance, paid: d.paidSinceCutoff, rem: d.remaining }, { s: 1800, paid: 300, rem: 1500 });
});
t('saldo a favor o sin deuda al corte: "nada que pagar", nunca un monto negativo', () => {
  const d = C.cardDue(card(-200), [], '2026-10-20');
  assert.deepStrictEqual({ s: d.statementBalance, rem: d.remaining, st: d.status }, { s: 0, rem: 0, st: 'nothing_to_pay' });
});
t('los previstos y los movimientos borrados NO cuentan', () => {
  const txs = [...base(), tx('2026-10-02', 'expense', 9999, { status: 'forecast' }), tx('2026-10-03', 'expense', 7777, { deletedAt: 'x' })];
  assert.strictEqual(C.cardDue(card(3400), txs, '2026-10-20').statementBalance, 4800);
});
t('utilización y crédito disponible con límite; sin límite no hay cifras inventadas', () => {
  const d = C.cardDue(card(3400, { creditLimit: 10000 }), base(), '2026-10-20');
  assert.deepStrictEqual([d.utilization, d.availableCredit], [0.34, 6600]);
  assert.strictEqual(C.cardDue(card(3400), base(), '2026-10-20').utilization, undefined);
});
t('sin fechas configuradas no hay estado (null)', () => assert.strictEqual(C.cardDue(card(100, { cardCutoffDay: undefined }), [], '2026-10-20'), null));
t('el mismo estado de cuenta, sea cual sea el orden en que se registraron los movimientos', () => {
  const a = C.cardDue(card(3400), base(), '2026-10-20');
  const b = C.cardDue(card(3400), [...base()].reverse(), '2026-10-20');
  assert.deepStrictEqual(a, b);
});

// ---------- validación y avisos ----------
t('validación: días 1..31, límite > 0, mínimo ≥ 0, avisos acotados', () => {
  assert.strictEqual(C.validateCardSettings({ cutoffDay: 5, dueDay: 25 }), null);
  for (const bad of [{ cutoffDay: 0, dueDay: 25 }, { cutoffDay: 32, dueDay: 25 }, { cutoffDay: 5, dueDay: 2.5 }, { cutoffDay: 5 }, { cutoffDay: '5', dueDay: 25 }, { cutoffDay: 5, dueDay: 25, creditLimit: 0 }, { cutoffDay: 5, dueDay: 25, minPayment: -1 },
    { cutoffDay: 5, dueDay: 25, alerts: { push: true, timeOfDay: '25:00', cutoffAdvance: [], dueAdvance: [], dueAttempts: 3 } },
    { cutoffDay: 5, dueDay: 25, alerts: { push: true, timeOfDay: '09:00', cutoffAdvance: [1, 2, 3, 4, 5, 6], dueAdvance: [], dueAttempts: 3 } },
    { cutoffDay: 5, dueDay: 25, alerts: { push: true, timeOfDay: '09:00', cutoffAdvance: [], dueAdvance: [0], dueAttempts: 3 } },
    { cutoffDay: 5, dueDay: 25, alerts: { push: true, timeOfDay: '09:00', cutoffAdvance: [], dueAdvance: [], dueAttempts: 4 } }]) assert(C.validateCardSettings(bad), JSON.stringify(bad));
});
t('avisos: dos series (corte y pago) con título sin montos, por defecto 5 y 2 días antes + 3 intentos el día límite', () => {
  const [cut, due] = C.cardReminderSpecs({ name: 'Oro' }, { cutoffDay: 5, dueDay: 25 }, '2026-10-04');
  assert.deepStrictEqual([cut.kind, due.kind], ['card_cutoff', 'card_due']);
  assert.deepStrictEqual([cut.recurrence.dayOfMonth, due.recurrence.dayOfMonth], [5, 25]);
  assert.deepStrictEqual([due.advanceDays, due.maxAttempts, cut.advanceDays, cut.maxAttempts], [[5, 2], 3, [1], 1]);
  for (const s of [cut, due]) assert(!/\d/.test(s.title) && s.title.includes('Oro'), s.title);
});
t('avisos con preferencias propias (sin push, otra hora, 1 intento)', () => {
  const [, due] = C.cardReminderSpecs({ name: 'Oro' }, { cutoffDay: 5, dueDay: 25, alerts: { push: false, timeOfDay: '08:00', cutoffAdvance: [], dueAdvance: [7], dueAttempts: 1 } }, '2026-10-04');
  assert.deepStrictEqual([due.push, due.timeOfDay, due.advanceDays, due.maxAttempts], [false, '08:00', [7], 1]);
});
t('titulares: hoy, mañana, faltan N días, vencido, pagado', () => {
  const mk = (over) => ({ status: 'pending', daysToDue: 3, ...over });
  assert.strictEqual(C.cardHeadline(mk({ daysToDue: 0 })), 'Hoy es tu fecha límite de pago');
  assert.strictEqual(C.cardHeadline(mk({ daysToDue: 1 })), 'Mañana es tu fecha límite de pago');
  assert.strictEqual(C.cardHeadline(mk()), 'Faltan 3 días para tu fecha límite de pago');
  assert.strictEqual(C.cardHeadline(mk({ status: 'overdue', daysToDue: -4 })), 'Tu fecha límite de pago pasó hace 4 días');
  assert.strictEqual(C.cardHeadline(mk({ status: 'paid' })), 'Ya cubriste el pago de este corte');
});

console.log(`\nTarjeta de crédito (puro): ${ok} OK, ${fail} fallan`);
process.exit(fail ? 1 : 0);

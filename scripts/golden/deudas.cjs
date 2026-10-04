// Pruebas de deudas ampliadas y dividendos (P3): quién debe a quién, pagos, saldar, cuotas y patrimonio — puro y con el store real.
//   node scripts/golden/deudas.cjs [--show]
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
const D = require('@/utils/debts');
const { computeNetWorth, upcomingLiabilityReminders } = require('@/utils/finance');
const { useAppStore } = require('@/store/useAppStore');
const S = () => useAppStore.getState();

let ok = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); ok++; if (process.argv.includes('--show')) console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name, '\n     ', String(e.stack || e.message).split('\n').slice(0, 4).join('\n      ')); }
};
const meta = { id: 'x', createdAt: 'now', updatedAt: 'now' };
const liab = (extra = {}) => ({ ...meta, type: 'personal_loan', institution: 'Banco', balance: 1000, currency: 'MXN', ...extra });

// ---------- puro ----------
t('split: separa lo que debo, lo que me deben y lo saldado; ignora lo borrado', () => {
  const r = D.splitLiabilities([liab({ id: 'a' }), liab({ id: 'b', direction: 'owed_to_me' }), liab({ id: 'c', status: 'settled' }), liab({ id: 'd', deletedAt: 'x' })]);
  assert.deepStrictEqual([r.owe.length, r.owedToMe.length, r.settled.length], [1, 1, 1]);
});
t('patrimonio: lo que me deben es ACTIVO, lo saldado no cuenta, lo que debo es pasivo', () => {
  const nw = computeNetWorth([], [], [liab({ balance: 1000 }), liab({ balance: 300, direction: 'owed_to_me' }), liab({ balance: 50, status: 'settled' })], 'MXN');
  assert.deepStrictEqual({ a: nw.assets, l: nw.liabilities, n: nw.netWorth }, { a: 300, l: 1000, n: -700 });
});
t('recordatorios de pago: no incluyen lo saldado ni lo que me deben', () => {
  const ref = new Date('2026-10-04T12:00:00');
  const r = upcomingLiabilityReminders([liab({ id: 'a', dueDate: '2026-10-06' }), liab({ id: 'b', dueDate: '2026-10-06', status: 'settled' }), liab({ id: 'c', dueDate: '2026-10-06', direction: 'owed_to_me' })], 14, ref);
  assert.deepStrictEqual(r.map((x) => x.liabilityId), ['a']);
});
t('cuotas: progreso, próxima fecha (fin de mes ajustado) y atraso', () => {
  const l = { installmentCount: 6, installmentAmount: 500, installmentStartDate: '2026-01-31', installmentsPaid: 1 };
  const p = D.installmentProgress(l, '2026-02-10');
  assert.deepStrictEqual({ paid: p.paid, rem: p.remaining, next: p.nextDate, over: p.overdue, d: p.daysUntilNext }, { paid: 1, rem: 5, next: '2026-02-28', over: false, d: 18 });
  assert.strictEqual(D.installmentProgress(l, '2026-03-05').overdue, true);
  assert.strictEqual(D.installmentProgress({ ...l, installmentsPaid: 6 }, '2026-10-04').nextDate, null);
  assert.strictEqual(D.installmentProgress({}, '2026-10-04'), null);
  assert.strictEqual(D.installmentProgress({ ...l, installmentsPaid: 99 }, '2026-10-04').paid, 6, 'se acota al total');
});
t('validación de la deuda: saldo, cuotas incompletas, pagadas > total', () => {
  assert(D.validateLiabilityDraft({ institution: '', balance: 10 }));
  assert(D.validateLiabilityDraft({ institution: 'X', balance: -1 }));
  assert(D.validateLiabilityDraft({ institution: 'X', balance: 10, installmentCount: 3 }), 'faltan monto y fecha');
  assert(D.validateLiabilityDraft({ institution: 'X', balance: 10, installmentCount: 3, installmentAmount: 5, installmentStartDate: '2026-01-01', installmentsPaid: 4 }));
  assert.strictEqual(D.validateLiabilityDraft({ institution: 'X', balance: 10, installmentCount: 3, installmentAmount: 5, installmentStartDate: '2026-01-01' }), null);
});
t('validación del pago: monto, tope, moneda, cuenta de crédito, ya saldada', () => {
  const l = liab({ balance: 500 });
  const acc = { id: 'a', currency: 'MXN', balance: 100 };
  assert(D.validateLiabilityPayment(l, 0, acc, true));
  assert(D.validateLiabilityPayment(l, NaN, acc, true));
  assert(D.validateLiabilityPayment(l, 501, acc, true), 'más de lo que debe');
  assert(D.validateLiabilityPayment(l, 100, { ...acc, currency: 'USD' }, true));
  assert(D.validateLiabilityPayment(l, 100, { ...acc, isLiability: true }, true));
  assert(D.validateLiabilityPayment(l, 100, undefined, true));
  assert(D.validateLiabilityPayment({ ...l, status: 'settled' }, 100, acc, true));
  assert.strictEqual(D.validateLiabilityPayment(l, 500, acc, true), null, 'pagar exactamente el saldo');
  assert.strictEqual(D.validateLiabilityPayment(l, 100, undefined, false), null, 'sin cuenta = solo ajustar');
  assert.strictEqual(D.validateLiabilityPayment({ ...l, direction: 'owed_to_me' }, 100, { ...acc, isLiability: true }, true) === null, true, 'cobrar a una cuenta que no es de pasivo');
});
t('aplicar un pago: baja el saldo, cuotas avanzan, próxima fecha, y al llegar a 0 queda saldada', () => {
  const l = liab({ balance: 3000, installmentCount: 6, installmentAmount: 500, installmentStartDate: '2026-01-15', installmentsPaid: 0 });
  const e1 = D.applyPayment(l, 1000, 'T');
  assert.deepStrictEqual({ b: e1.balance, p: e1.installmentsPaid, d: e1.dueDate, s: e1.status }, { b: 2000, p: 2, d: '2026-03-15', s: undefined });
  const e2 = D.applyPayment(liab({ balance: 100 }), 100, 'T');
  assert.deepStrictEqual({ b: e2.balance, s: e2.status, at: e2.settledAt }, { b: 0, s: 'settled', at: 'T' });
  assert.strictEqual(D.applyPayment(liab({ balance: 0.3 }), 0.1 + 0.2, 'T').balance, 0, 'sin residuos de punto flotante');
  assert.strictEqual(D.applyPayment(l, 3000, 'T').installmentsPaid, 6);
  assert.strictEqual(D.applyPayment(l, 250, 'T').installmentsPaid, 0, 'un pago menor a una cuota no completa ninguna');
});

// ---------- con el store real ----------
const setup = () => {
  S().resetAll();
  S().addAccount({ name: 'BBVA', type: 'bank', currency: 'MXN', balance: 5000 });
  S().addAccount({ name: 'Tarjeta', type: 'credit_card', currency: 'MXN', balance: 2000, isLiability: true });
  S().addLiability({ institution: 'Banco Azteca', type: 'personal_loan', balance: 3000, currency: 'MXN', installmentCount: 6, installmentAmount: 500, installmentStartDate: '2026-10-15', installmentsPaid: 0 });
  S().addLiability({ institution: 'Juan', counterparty: 'Juan', type: 'other', direction: 'owed_to_me', balance: 800, currency: 'MXN' });
};
const acc = (n) => S().accounts.find((a) => a.name === n);
const lb = (n) => S().liabilities.find((l) => l.institution === n);
setup();
t('store: pagar una cuota baja la deuda, saca el dinero de la cuenta y registra el gasto en "deudas"', () => {
  const r = S().payLiability(lb('Banco Azteca').id, { amount: 500, accountId: acc('BBVA').id });
  assert.strictEqual(r.ok, true, r.error);
  assert.strictEqual(lb('Banco Azteca').balance, 2500);
  assert.strictEqual(lb('Banco Azteca').installmentsPaid, 1);
  assert.strictEqual(acc('BBVA').balance, 4500);
  const tx = S().transactions.find((x) => x.id === r.transactionId);
  assert.deepStrictEqual({ ty: tx.type, c: tx.categoryId, s: tx.subcategoryId, lid: tx.liabilityId }, { ty: 'expense', c: 'debt', s: 'debt_personal', lid: lb('Banco Azteca').id });
  assert.strictEqual(lb('Banco Azteca').dueDate, '2026-11-15', 'la próxima cuota es la fecha de pago');
});
t('store: un pago inválido no cambia NADA (ni saldo, ni cuenta, ni movimientos)', () => {
  const before = JSON.stringify([S().liabilities, S().accounts, S().transactions.length]);
  assert.strictEqual(S().payLiability(lb('Banco Azteca').id, { amount: 99999, accountId: acc('BBVA').id }).ok, false);
  assert.strictEqual(S().payLiability(lb('Banco Azteca').id, { amount: -5, accountId: acc('BBVA').id }).ok, false);
  assert.strictEqual(S().payLiability(lb('Banco Azteca').id, { amount: 10, accountId: acc('Tarjeta').id }).ok, false, 'no se paga con tarjeta');
  assert.strictEqual(S().payLiability(lb('Banco Azteca').id, { amount: 10, accountId: 'no-existe' }).ok, false);
  assert.strictEqual(S().payLiability(lb('Banco Azteca').id, { amount: 10, date: '2999-01-01' }).ok, false, 'fecha futura');
  assert.strictEqual(S().payLiability('no-existe', { amount: 10 }).ok, false);
  assert.strictEqual(JSON.stringify([S().liabilities, S().accounts, S().transactions.length]), before);
});
t('store: pagar sin cuenta solo ajusta la deuda (ya se pagó por otro lado)', () => {
  const n = S().transactions.length, b = acc('BBVA').balance;
  assert.strictEqual(S().payLiability(lb('Banco Azteca').id, { amount: 500 }).ok, true);
  assert.strictEqual(S().transactions.length, n);
  assert.strictEqual(acc('BBVA').balance, b);
  assert.strictEqual(lb('Banco Azteca').balance, 2000);
});
t('store: liquidar el saldo completo la deja saldada, con fecha, y ya no se puede pagar', () => {
  const r = S().payLiability(lb('Banco Azteca').id, { amount: 2000, accountId: acc('BBVA').id });
  assert.strictEqual(r.ok, true, r.error);
  const l = lb('Banco Azteca');
  assert.deepStrictEqual({ b: l.balance, s: l.status, p: l.installmentsPaid }, { b: 0, s: 'settled', p: 6 });
  assert(l.settledAt);
  assert.strictEqual(S().payLiability(l.id, { amount: 1, accountId: acc('BBVA').id }).ok, false);
});
t('store: cobrar lo que te deben es un ingreso a tu cuenta y baja lo que te deben', () => {
  const b = acc('BBVA').balance;
  const r = S().payLiability(lb('Juan').id, { amount: 300, accountId: acc('BBVA').id });
  assert.strictEqual(r.ok, true, r.error);
  assert.strictEqual(acc('BBVA').balance, b + 300);
  assert.strictEqual(lb('Juan').balance, 500);
  const tx = S().transactions.find((x) => x.id === r.transactionId);
  assert.deepStrictEqual({ ty: tx.type, c: tx.categoryId }, { ty: 'income', c: 'income' });
});
t('store: saldar sin movimiento y reabrir', () => {
  assert.strictEqual(S().settleLiability(lb('Juan').id).ok, true);
  assert.deepStrictEqual({ b: lb('Juan').balance, s: lb('Juan').status }, { b: 0, s: 'settled' });
  assert.strictEqual(S().settleLiability(lb('Juan').id).ok, false);
  assert.strictEqual(S().reopenLiability(lb('Juan').id, 0).ok, false);
  assert.strictEqual(S().reopenLiability(lb('Juan').id, 200).ok, true);
  assert.deepStrictEqual({ b: lb('Juan').balance, s: lb('Juan').status, at: lb('Juan').settledAt }, { b: 200, s: 'active', at: undefined });
  assert.strictEqual(S().reopenLiability(lb('Juan').id, 200).ok, false, 'ya no está saldada');
});
t('store: el pago queda en la auditoría y en la cola de sincronización', () => {
  assert(S().auditLog.some((e) => e.entityType === 'liability' && /Pago|Cobro/.test(e.summary)));
  assert(S().pendingSync.some((q) => q.table === 'liabilities'));
});

// ---------- dividendos ----------
t('store: dividendo = ingreso en la cuenta + suma a lo recibido; validaciones', () => {
  S().resetAll();
  S().addAccount({ name: 'Broker', type: 'investment', currency: 'MXN', balance: 100 });
  S().addAccount({ name: 'Tarjeta', type: 'credit_card', currency: 'MXN', balance: 0, isLiability: true });
  S().addInvestment({ ticker: 'FUNO11', name: 'FUNO', assetClass: 'fibra', quantity: 10, avgCostPrice: 20, currency: 'MXN', amountInvested: 200, purchaseDate: '2026-01-01' });
  const inv = () => S().investments[0];
  const broker = () => S().accounts.find((a) => a.name === 'Broker');
  assert.strictEqual(S().registerDividend(inv().id, { amount: 0 }).ok, false);
  assert.strictEqual(S().registerDividend(inv().id, { amount: 5, accountId: S().accounts[1].id }).ok, false, 'no a una tarjeta');
  assert.strictEqual(S().registerDividend('x', { amount: 5 }).ok, false);
  const r = S().registerDividend(inv().id, { amount: 12.5, accountId: broker().id });
  assert.strictEqual(r.ok, true, r.error);
  assert.strictEqual(broker().balance, 112.5);
  assert.strictEqual(inv().dividendsReceived, 12.5);
  const tx = S().transactions.find((x) => x.id === r.transactionId);
  assert.deepStrictEqual({ s: tx.subcategoryId, t: tx.type, m: tx.merchant }, { s: 'inc_dividends', t: 'income', m: 'FUNO11' });
  S().registerDividend(inv().id, { amount: 7.5 }); // sin cuenta: solo anota
  assert.strictEqual(inv().dividendsReceived, 20);
  assert.strictEqual(broker().balance, 112.5);
});

console.log(`\nDeudas y dividendos: ${ok} OK, ${fail} fallan`);
process.exit(fail ? 1 : 0);

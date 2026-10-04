// SELLADO 2 de P3 en el chat: otro conjunto de frases, escrito DESPUÉS de corregir lo que falló en el primero. Se corre una vez y
// se anota; si se corrige algo, queda contaminado.   node scripts/golden/p3-chat-sellado2.cjs
require('./ts-hook.cjs');
const Module = require('module');
const path = require('path');
const orig = Module._resolveFilename;
Module._resolveFilename = function (r, ...rest) { if (/^(expo|react-native|@expo|@react-native)/.test(r)) return path.join(__dirname, 'stub-native.cjs'); if (r === '@react-native-async-storage/async-storage') return path.join(__dirname, 'stub-async-storage.cjs'); return orig.call(this, r, ...rest); };
const { planFromText } = require('@/ai/planner');

const meta = (id) => ({ id, createdAt: 'x', updatedAt: 'x' });
const acc = (id, name, type, balance, extra = {}) => ({ ...meta(id), name, type, currency: 'MXN', balance, ...extra });
const ctx = {
  accounts: [acc('a-bbva', 'BBVA', 'bank', 10000), acc('a-nu', 'Nu', 'savings', 2000), acc('a-cash', 'Efectivo', 'cash', 300), acc('a-tc', 'Tarjeta Oro', 'credit_card', 3000, { isLiability: true })],
  goals: [{ ...meta('g-viaje'), name: 'Viaje', targetAmount: 20000, currentAmount: 3500, currency: 'MXN' }, { ...meta('g-laptop'), name: 'Laptop', targetAmount: 30000, currentAmount: 0, currency: 'MXN' }],
  liabilities: [{ ...meta('l-coppel'), institution: 'Coppel', type: 'personal_loan', balance: 3000, currency: 'MXN' }, { ...meta('l-juan'), institution: 'Juan', type: 'other', direction: 'owed_to_me', balance: 800, currency: 'MXN' }],
  investments: [{ ...meta('i-funo'), ticker: 'FUNO11', name: 'FUNO', assetClass: 'fibra', quantity: 10, avgCostPrice: 20, currency: 'MXN', amountInvested: 200, purchaseDate: '2026-01-01' }, { ...meta('i-aapl'), ticker: 'AAPL', name: 'Apple', assetClass: 'stock', quantity: 1, avgCostPrice: 100, currency: 'MXN', amountInvested: 100, purchaseDate: '2026-01-01' }],
  forecasts: [
    { ...meta('f-renta'), type: 'expense', amount: 8000, currency: 'MXN', categoryId: 'housing', subcategoryId: 'house_rent', merchant: 'Renta', accountId: 'a-bbva', date: '2026-10-03T18:00:00.000Z', status: 'forecast', recurringRuleId: 'r-renta', origin: 'automatic' },
    { ...meta('f-netflix'), type: 'expense', amount: 199, currency: 'MXN', categoryId: 'entertainment', subcategoryId: 'ent_streaming', merchant: 'Netflix', accountId: 'a-bbva', date: '2026-10-12T18:00:00.000Z', status: 'forecast', recurringRuleId: 'r-netflix', origin: 'automatic' },
    { ...meta('f-luz'), type: 'expense', amount: 450, currency: 'MXN', categoryId: 'housing', subcategoryId: 'house_utilities', merchant: 'Luz', accountId: 'a-bbva', date: '2026-10-08T18:00:00.000Z', status: 'forecast', origin: 'manual' },
  ],
  recurringRules: [
    { ...meta('r-renta'), kind: 'transaction', name: 'Renta', status: 'active', recurrence: { frequency: 'monthly', interval: 1, startDate: '2026-10-03', dayOfMonth: 3 }, amount: 8000, currency: 'MXN', txType: 'expense', accountId: 'a-bbva' },
    { ...meta('r-netflix'), kind: 'transaction', name: 'Netflix', status: 'active', recurrence: { frequency: 'monthly', interval: 1, startDate: '2026-10-12', dayOfMonth: 12 }, amount: 199, currency: 'MXN', txType: 'expense', accountId: 'a-bbva' },
    { ...meta('r-gym'), kind: 'transaction', name: 'Gimnasio', status: 'paused', recurrence: { frequency: 'monthly', interval: 1, startDate: '2026-10-20', dayOfMonth: 20 }, amount: 500, currency: 'MXN', txType: 'expense', accountId: 'a-bbva' },
  ],
  reminders: [{ ...meta('rem-predial'), kind: 'custom', title: 'Pagar predial', date: '2026-10-20', timeOfDay: '09:00', advanceDays: [], maxAttempts: 1, attemptIntervalMinutes: 120, push: true, status: 'active' }],
  templateBudgetLines: [], recentTransactions: [], primaryCurrency: 'MXN', today: '2026-10-04',
};
const summarize = (o) => {
  if (o.kind === 'single') return { kind: 'single', type: o.step.action.type, args: o.step.action.args };
  if (o.kind === 'clarification') return { kind: 'clar', type: o.pending.type, field: o.pending.missing[0].field };
  if (o.kind === 'plan') return { kind: 'plan', type: o.steps.map((s) => s.action.type).join('+') };
  return { kind: o.kind };
};
// [frase, tipo esperado | 'clar:<tipo>:<campo>' | 'reply' | 'none', comprobación opcional(args)]
const C = [
  ['recuérdame el 12 de noviembre renovar la licencia', 'add_reminder', (a) => a.date === '2026-11-12' && /licencia/i.test(a.title)],
  ['avísame cada quincena que haga mi declaración', 'add_reminder', (a) => a.recurrence?.frequency === 'semimonthly'],
  ['ponme una alarma para pagar el gas el 22 a las 7 de la mañana', 'add_reminder', (a) => a.date === '2026-10-22' && a.timeOfDay === '07:00'],
  ['borra el aviso de predial', 'cancel_reminder', (a) => a.reminderId === 'rem-predial'],
  ['mañana me llegan 2500 de un reembolso en BBVA', 'add_forecast', (a) => a.transactionType === 'income' && a.amount === 2500],
  ['el 19 tengo que pagar 650 del celular con Nu', 'add_forecast', (a) => a.date === '2026-10-19' && a.accountId === 'a-nu'],
  ['voy a pagar 1200 de mecánico el miércoles desde BBVA', 'add_forecast', (a) => a.amount === 1200 && a.date === '2026-10-07'],
  ['cada mes me cobran 129 de iCloud en BBVA', 'add_recurring', (a) => a.amount === 129 && a.recurrence.frequency === 'monthly'],
  ['cada semana pago 300 de despensa con Efectivo', 'add_recurring', (a) => a.recurrence.frequency === 'weekly' && a.accountId === 'a-cash'],
  ['el 1 de cada mes me depositan 20000 de sueldo en BBVA', 'add_recurring', (a) => a.transactionType === 'income' && a.recurrence.dayOfMonth === 1],
  ['cada quincena aporta 400 a mi meta Viaje', 'add_recurring_contribution', (a) => a.recurrence.frequency === 'semimonthly' && a.amount === 400],
  ['pausa el pago de la renta', 'pause_recurring', (a) => a.ruleId === 'r-renta'],
  ['reactiva el gimnasio', 'resume_recurring', (a) => a.ruleId === 'r-gym'],
  ['da de baja Netflix', 'end_recurring', (a) => a.ruleId === 'r-netflix'],
  ['actualiza la renta a 8500', 'update_recurring_amount', (a) => a.amount === 8500 && a.ruleId === 'r-renta'],
  ['ya pagué la renta de este mes', 'confirm_forecast', (a) => a.forecastId === 'f-renta'],
  ['no me cobraron la renta', 'none'],
  ['pospón la luz para el lunes', 'postpone_forecast', (a) => a.newDate === '2026-10-05'],
  ['omite la renta de este mes', 'skip_forecast', (a) => a.forecastId === 'f-renta'],
  ['abonó Juan 200 en Nu', 'pay_liability', (a) => a.owedToMe === true && a.accountId === 'a-nu'],
  ['pagué 1500 a Coppel con BBVA', 'pay_liability', (a) => a.amount === 1500],
  ['salda la deuda de Coppel', 'settle_liability', (a) => a.liabilityId === 'l-coppel'],
  ['me cayeron 60 de dividendos de FUNO11 en BBVA', 'register_dividend', (a) => a.amount === 60],
  ['quiero registrar un dividendo de 33 de Apple en Nu', 'register_dividend', (a) => a.investmentId === 'i-aapl'],
  ['pagué 400 de luz', 'none'],
  ['transfiere 300 de Nu a BBVA el lunes', 'none'],
  ['agrega 500 a mi cuenta Nu', 'add_transaction'],
  ['borra la deuda Coppel', 'delete_liability'],
  ['presupuesta 3000 para comida', 'set_budget_line'],
  ['cuánto me falta para mi meta Viaje', 'none'],
  ['avísame', 'clar:add_reminder:name'],
  ['qué recordatorios tengo', 'none'],
];
let ok = 0;
const bad = [];
for (const [text, want, check] of C) {
  const s = summarize(planFromText(text, ctx));
  let pass;
  if (want.startsWith('clar:')) { const [, ty, f] = want.split(':'); pass = s.kind === 'clar' && s.type === ty && s.field === f; }
  else if (want === 'reply' || want === 'none') pass = s.kind === want;
  else pass = s.kind === 'single' && s.type === want && (!check || check(s.args));
  if (pass) ok++; else bad.push({ text, want, got: s });
}
console.log(`SELLADO 2 chat P3: ${ok}/${C.length} (${((ok / C.length) * 100).toFixed(1)}%)`);
for (const b of bad) console.log('  ✗', JSON.stringify(b.text), '→ esperaba', b.want, '· obtuvo', JSON.stringify(b.got).slice(0, 200));

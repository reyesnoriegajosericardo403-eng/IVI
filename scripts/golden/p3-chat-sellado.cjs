// SELLADO de P3 en el chat: frases escritas DESPUÉS de dejar la versión de desarrollo en verde y SIN ajustar el reconocedor
// a ellas. Se corre una vez y se anota el resultado; si se corrigen fallas, el conjunto queda "contaminado" (se dice en la
// documentación) y la medición honesta pasa a otro conjunto nuevo.   node scripts/golden/p3-chat-sellado.cjs
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
  ['ponme un recordatorio de pagar la tarjeta el 25', 'add_reminder', (a) => a.date === '2026-10-25' && /tarjeta/i.test(a.title)],
  ['no me dejes olvidar el cumpleaños de mi mamá el 30 de octubre', 'add_reminder', (a) => a.date === '2026-10-30'],
  ['avísame el 1 de noviembre que renueve el seguro del carro', 'add_reminder', (a) => a.date === '2026-11-01' && /seguro/i.test(a.title)],
  ['recuérdame todos los lunes sacar la basura', 'add_reminder', (a) => a.recurrence?.frequency === 'weekly' && a.recurrence.weekdays?.[0] === 1],
  ['elimina el recordatorio de predial', 'cancel_reminder', (a) => a.reminderId === 'rem-predial'],
  ['quítame el aviso del predial', 'cancel_reminder', (a) => a.reminderId === 'rem-predial'],
  ['el 15 me cae la quincena, 9500 en Nu', 'add_forecast', (a) => a.transactionType === 'income' && a.amount === 9500 && a.date === '2026-10-15'],
  ['pasado mañana voy a pagar 1800 del recibo de internet con Nu', 'add_forecast', (a) => a.amount === 1800 && a.date === '2026-10-06' && a.accountId === 'a-nu'],
  ['el 28 vence mi tarjeta, voy a pagar 4000 desde BBVA', 'add_forecast', (a) => a.amount === 4000 && a.date === '2026-10-28'],
  ['el lunes cobro 3000 de un freelance en Nu', 'add_forecast', (a) => a.transactionType === 'income' && a.date === '2026-10-05'],
  ['mensualmente pago 350 de internet con BBVA', 'add_recurring', (a) => a.amount === 350 && a.recurrence.frequency === 'monthly'],
  ['cada 15 días me pagan 4500 en Nu', 'add_recurring', (a) => a.transactionType === 'income' && a.recurrence.interval === 15],
  ['cada año pago 2400 del seguro del carro con BBVA el 3 de marzo', 'add_recurring', (a) => a.recurrence.frequency === 'yearly' && a.recurrence.month === 3 && a.recurrence.dayOfMonth === 3],
  ['el último día del mes me depositan 15000 en BBVA', 'add_recurring', (a) => a.transactionType === 'income' && a.recurrence.dayOfMonth === 31],
  ['todos los meses aparto 1000 para mi meta Laptop', 'add_recurring_contribution', (a) => a.goalId === 'g-laptop' && a.amount === 1000],
  ['cada mes ahorro 500 en mi meta Viaje', 'add_recurring_contribution', (a) => a.goalId === 'g-viaje'],
  ['suspende Netflix', 'pause_recurring', (a) => a.ruleId === 'r-netflix'],
  ['quiero cancelar Netflix', 'end_recurring', (a) => a.ruleId === 'r-netflix'],
  ['Netflix ahora cuesta 249', 'update_recurring_amount', (a) => a.amount === 249],
  ['ya no voy a pagar el gimnasio', 'end_recurring', (a) => a.ruleId === 'r-gym'],
  ['retoma Netflix', 'reply'],
  ['vuelve a activar el gimnasio', 'resume_recurring', (a) => a.ruleId === 'r-gym'],
  ['listo, ya pagué Netflix', 'reply'],
  ['ya se pagó la renta', 'confirm_forecast', (a) => a.forecastId === 'f-renta'],
  ['la renta no se pagó', 'skip_forecast', (a) => a.forecastId === 'f-renta'],
  ['cambia la luz para el 12 de octubre', 'postpone_forecast', (a) => a.forecastId === 'f-luz' && a.newDate === '2026-10-12'],
  ['aplaza Netflix al 15', 'postpone_forecast', (a) => a.newDate === '2026-10-15'],
  ['le pagué 700 a Coppel con Nu', 'pay_liability', (a) => a.amount === 700 && a.accountId === 'a-nu'],
  ['le abono 400 a Coppel desde BBVA', 'pay_liability', (a) => a.amount === 400 && a.accountId === 'a-bbva'],
  ['Juan me devolvió 500 a BBVA', 'pay_liability', (a) => a.owedToMe === true && a.amount === 500],
  ['ya terminé de pagar Coppel', 'settle_liability', (a) => a.liabilityId === 'l-coppel'],
  ['ya me pagó todo Juan', 'settle_liability', (a) => a.liabilityId === 'l-juan'],
  ['pagué el mínimo de Coppel 500', 'clar:pay_liability:account'],
  ['me depositaron 90 de dividendos de FUNO11 en Nu', 'register_dividend', (a) => a.investmentId === 'i-funo' && a.amount === 90],
  ['recibí dividendo de Apple 12 en BBVA', 'register_dividend', (a) => a.investmentId === 'i-aapl' && a.amount === 12],
  ['pago 500 de gasolina', 'none'],
  ['el viernes voy a transferir 500 a Nu', 'none'],
  ['paga 300 a Coppel', 'clar:pay_liability:account'],
  ['cuánto debo de Coppel', 'none'],
  ['qué pagos tengo este mes', 'none'],
  ['pausa la música', 'none'],
  ['cancela mi cuenta Nu', 'delete_account'],
  ['aporta 1000 a mi meta Laptop', 'contribute_to_goal'],
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
console.log(`SELLADO chat P3: ${ok}/${C.length} (${((ok / C.length) * 100).toFixed(1)}%)`);
for (const b of bad) console.log('  ✗', JSON.stringify(b.text), '→ esperaba', b.want, '· obtuvo', JSON.stringify(b.got).slice(0, 200));

// Acciones de P3 en el chat (reconocimiento local + catálogo + plan con ids virtuales + ejecución con el store real).
//   node scripts/golden/p3-chat.cjs [--show]
// Hoy de las pruebas: domingo 2026-10-04.
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
const { planFromText, previewPlan, answerClarification } = require('@/ai/planner');
const { resolveCandidate } = require('@/ai/actionCatalog');
const { simulateStep, substituteVirtualIds, virtualIdFor } = require('@/ai/virtualIds');

let ok = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); ok++; if (process.argv.includes('--show')) console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name, '\n     ', String(e.stack || e.message).split('\n').slice(0, 4).join('\n      ')); }
};

const meta = (id) => ({ id, createdAt: 'x', updatedAt: 'x' });
const TODAY = '2026-10-04';
const acc = (id, name, type, balance, extra = {}) => ({ ...meta(id), name, type, currency: 'MXN', balance, ...extra });
const ctx = () => ({
  accounts: [acc('a-bbva', 'BBVA', 'bank', 10000), acc('a-nu', 'Nu', 'savings', 2000), acc('a-cash', 'Efectivo', 'cash', 300), acc('a-tc', 'Tarjeta Oro', 'credit_card', 3000, { isLiability: true })],
  goals: [{ ...meta('g-viaje'), name: 'Viaje', targetAmount: 20000, currentAmount: 3500, currency: 'MXN' }, { ...meta('g-laptop'), name: 'Laptop', targetAmount: 30000, currentAmount: 0, currency: 'MXN' }],
  liabilities: [
    { ...meta('l-coppel'), institution: 'Coppel', type: 'personal_loan', balance: 3000, currency: 'MXN', installmentCount: 6, installmentAmount: 500, installmentStartDate: '2026-10-15', installmentsPaid: 0 },
    { ...meta('l-juan'), institution: 'Juan', type: 'other', direction: 'owed_to_me', balance: 800, currency: 'MXN' },
  ],
  investments: [{ ...meta('i-funo'), ticker: 'FUNO11', name: 'FUNO', assetClass: 'fibra', quantity: 10, avgCostPrice: 20, currency: 'MXN', amountInvested: 200, purchaseDate: '2026-01-01' }, { ...meta('i-aapl'), ticker: 'AAPL', name: 'Apple', assetClass: 'stock', quantity: 1, avgCostPrice: 100, currency: 'MXN', amountInvested: 100, purchaseDate: '2026-01-01' }],
  forecasts: [
    { ...meta('f-renta'), type: 'expense', amount: 8000, currency: 'MXN', categoryId: 'housing', subcategoryId: 'house_rent', merchant: 'Renta', accountId: 'a-bbva', date: '2026-10-03T18:00:00.000Z', status: 'forecast', recurringRuleId: 'r-renta', origin: 'automatic' },
    { ...meta('f-renta2'), type: 'expense', amount: 8000, currency: 'MXN', categoryId: 'housing', subcategoryId: 'house_rent', merchant: 'Renta', accountId: 'a-bbva', date: '2026-11-03T18:00:00.000Z', status: 'forecast', recurringRuleId: 'r-renta', origin: 'automatic' },
    { ...meta('f-netflix'), type: 'expense', amount: 199, currency: 'MXN', categoryId: 'entertainment', subcategoryId: 'ent_streaming', merchant: 'Netflix', accountId: 'a-bbva', date: '2026-10-12T18:00:00.000Z', status: 'forecast', recurringRuleId: 'r-netflix', origin: 'automatic' },
    { ...meta('f-luz'), type: 'expense', amount: 450, currency: 'MXN', categoryId: 'housing', subcategoryId: 'house_utilities', merchant: 'Luz', accountId: 'a-bbva', date: '2026-10-08T18:00:00.000Z', status: 'forecast', origin: 'manual' },
  ],
  recurringRules: [
    { ...meta('r-renta'), kind: 'transaction', name: 'Renta', status: 'active', recurrence: { frequency: 'monthly', interval: 1, startDate: '2026-10-03', dayOfMonth: 3 }, amount: 8000, currency: 'MXN', txType: 'expense', accountId: 'a-bbva' },
    { ...meta('r-netflix'), kind: 'transaction', name: 'Netflix', status: 'active', recurrence: { frequency: 'monthly', interval: 1, startDate: '2026-10-12', dayOfMonth: 12 }, amount: 199, currency: 'MXN', txType: 'expense', accountId: 'a-bbva' },
    { ...meta('r-gym'), kind: 'transaction', name: 'Gimnasio', status: 'paused', recurrence: { frequency: 'monthly', interval: 1, startDate: '2026-10-20', dayOfMonth: 20 }, amount: 500, currency: 'MXN', txType: 'expense', accountId: 'a-bbva' },
  ],
  reminders: [{ ...meta('rem-predial'), kind: 'custom', title: 'Pagar predial', date: '2026-10-20', timeOfDay: '09:00', advanceDays: [], maxAttempts: 1, attemptIntervalMinutes: 120, push: true, status: 'active' }],
  templateBudgetLines: [], recentTransactions: [], primaryCurrency: 'MXN', today: TODAY,
});

// Devuelve { kind, type, args, clar } resumido de una frase.
const run = (text, c = ctx()) => {
  const o = planFromText(text, c);
  if (o.kind === 'single') return { kind: 'single', type: o.step.action.type, args: o.step.action.args, summary: o.step.summary };
  if (o.kind === 'plan') return { kind: 'plan', steps: o.steps.map((s) => ({ type: s.action.type, args: s.action.args })) };
  if (o.kind === 'clarification') return { kind: 'clarification', field: o.pending.missing[0].field, slot: o.pending.missing[0].slot, type: o.pending.type, reply: o.reply, pending: o.pending };
  if (o.kind === 'reply') return { kind: 'reply', reply: o.reply };
  return { kind: 'none' };
};
const expectAction = (text, type, check) => t(`«${text}» → ${type}`, () => {
  const r = run(text);
  assert.strictEqual(r.kind, 'single', JSON.stringify(r));
  assert.strictEqual(r.type, type, JSON.stringify(r));
  if (check) check(r.args, r);
});
const expectClar = (text, type, field) => t(`«${text}» → pregunta ${field}`, () => {
  const r = run(text);
  assert.strictEqual(r.kind, 'clarification', JSON.stringify(r));
  assert.deepStrictEqual([r.type, r.field], [type, field], r.reply);
});
const expectNot = (text, notTypes) => t(`«${text}» NO es P3`, () => {
  const r = run(text);
  const types = r.kind === 'single' ? [r.type] : r.kind === 'plan' ? r.steps.map((s) => s.type) : [];
  for (const ty of types) assert(!notTypes.includes(ty), `no debía ser ${ty}: ${JSON.stringify(r)}`);
});
const P3 = ['add_forecast', 'confirm_forecast', 'skip_forecast', 'postpone_forecast', 'add_recurring', 'add_recurring_contribution', 'update_recurring_amount', 'pause_recurring', 'resume_recurring', 'end_recurring', 'add_reminder', 'cancel_reminder', 'pay_liability', 'settle_liability', 'register_dividend'];

// ---------- avisos ----------
expectAction('recuérdame pagar la luz el 15', 'add_reminder', (a) => assert.deepStrictEqual([a.title, a.date, a.timeOfDay], ['Pagar la luz', '2026-10-15', '09:00']));
expectAction('recuérdame pagar el predial el 20 a las 8', 'add_reminder', (a) => assert.deepStrictEqual([a.date, a.timeOfDay], ['2026-10-20', '08:00']));
expectAction('avísame 3 días antes de pagar la renta el 10 de noviembre', 'add_reminder', (a) => assert.deepStrictEqual([a.date, a.advanceDays], ['2026-11-10', [3]]));
expectAction('recuérdame cada mes pagar el agua', 'add_reminder', (a) => assert.deepStrictEqual([a.recurrence.frequency, a.date], ['monthly', undefined]));
expectAction('recuérdame mañana llamar al doctor', 'add_reminder', (a) => assert.deepStrictEqual([a.title, a.date], ['Llamar al doctor', '2026-10-05']));
expectAction('avísame el viernes que pague el seguro e insiste hasta 3 veces', 'add_reminder', (a) => assert.deepStrictEqual([a.date, a.maxAttempts], ['2026-10-09', 3]));
expectAction('quita el aviso de predial', 'cancel_reminder', (a) => assert.strictEqual(a.reminderId, 'rem-predial'));
expectAction('cancela el recordatorio de pagar predial', 'cancel_reminder');
expectClar('recuérdame pagar la luz', 'add_reminder', 'date');

// ---------- previstos nuevos ----------
expectAction('mañana pago la luz 450 de BBVA', 'add_forecast', (a) => assert.deepStrictEqual([a.date, a.amount, a.accountId, a.transactionType], ['2026-10-05', 450, 'a-bbva', 'expense']));
expectAction('el viernes me depositan 12000 en BBVA', 'add_forecast', (a) => assert.deepStrictEqual([a.date, a.amount, a.transactionType], ['2026-10-09', 12000, 'income']));
expectAction('el 15 tengo que pagar 3000 de la tarjeta con Nu', 'add_forecast', (a) => assert.deepStrictEqual([a.date, a.amount, a.accountId], ['2026-10-15', 3000, 'a-nu']));
expectClar('el 15 tengo que pagar 3000 de internet', 'add_forecast', 'account');
expectNot('el 15 tengo que pagar internet', P3);

// ---------- recurrentes nuevos ----------
expectAction('cada mes pago 199 de Spotify con BBVA', 'add_recurring', (a) => assert.deepStrictEqual([a.name, a.amount, a.recurrence.frequency, a.accountId], ['Spotify', 199, 'monthly', 'a-bbva']));
expectAction('cada quincena me depositan 12000 en BBVA', 'add_recurring', (a) => assert.deepStrictEqual([a.transactionType, a.amount, a.recurrence.frequency], ['income', 12000, 'semimonthly']));
expectAction('todos los viernes pago 500 de gasolina con Efectivo', 'add_recurring', (a) => assert.deepStrictEqual([a.recurrence.frequency, a.recurrence.weekdays, a.accountId], ['weekly', [5], 'a-cash']));
expectAction('el 20 de cada mes pago 1200 de internet con Nu', 'add_recurring', (a) => assert.deepStrictEqual([a.recurrence.dayOfMonth, a.recurrence.startDate, a.amount], [20, '2026-10-20', 1200]));
expectAction('cada semana aporta 200 a mi meta Viaje', 'add_recurring_contribution', (a) => assert.deepStrictEqual([a.goalId, a.amount, a.recurrence.frequency], ['g-viaje', 200, 'weekly']));
expectClar('cada mes pago 199 de Spotify', 'add_recurring', 'account');
expectNot('cada vez que gasto mucho me siento mal', P3);

// ---------- gestionar recurrentes ----------
expectAction('pausa Netflix', 'pause_recurring', (a) => assert.strictEqual(a.ruleId, 'r-netflix'));
expectAction('pausa el pago recurrente de la renta', 'pause_recurring', (a) => assert.strictEqual(a.ruleId, 'r-renta'));
expectAction('reanuda el gimnasio', 'resume_recurring', (a) => assert.strictEqual(a.ruleId, 'r-gym'));
expectAction('ya no pago Netflix', 'end_recurring', (a) => assert.strictEqual(a.ruleId, 'r-netflix'));
expectAction('cancela la suscripción de Netflix', 'end_recurring');
expectAction('la renta subió a 9000', 'update_recurring_amount', (a) => assert.deepStrictEqual([a.ruleId, a.amount], ['r-renta', 9000]));
t('pausar algo que ya está en pausa se explica y no propone nada', () => { const r = run('pausa el gimnasio'); assert.strictEqual(r.kind, 'reply'); assert(/pausa/.test(r.reply), r.reply); });
t('reanudar algo que no está en pausa se explica', () => { const r = run('reanuda Netflix'); assert.strictEqual(r.kind, 'reply'); });

// ---------- previstos existentes ----------
expectAction('ya pagué la renta', 'confirm_forecast', (a) => assert.deepStrictEqual([a.forecastId, a.amount], ['f-renta', undefined]));
expectAction('ya pagué la renta, fueron 8100', 'confirm_forecast', (a) => assert.deepStrictEqual([a.forecastId, a.amount], ['f-renta', 8100]));
expectAction('no pagué la renta este mes', 'skip_forecast', (a) => assert.strictEqual(a.forecastId, 'f-renta'));
expectAction('pospón la luz al 10 de octubre', 'postpone_forecast', (a) => assert.deepStrictEqual([a.forecastId, a.newDate], ['f-luz', '2026-10-10']));
t('confirmar un previsto que todavía no llega se explica', () => { const r = run('ya pagué la luz'); assert.strictEqual(r.kind, 'reply'); assert(/todavía no llega/.test(r.reply), r.reply); });

// ---------- deudas y dividendos ----------
expectAction('pagué 500 a Coppel desde BBVA', 'pay_liability', (a) => assert.deepStrictEqual([a.liabilityId, a.amount, a.accountId, a.owedToMe], ['l-coppel', 500, 'a-bbva', false]));
expectAction('abona 1000 a Coppel con Nu', 'pay_liability', (a) => assert.deepStrictEqual([a.amount, a.accountId], [1000, 'a-nu']));
expectClar('abona 1000 a Coppel', 'pay_liability', 'account');
expectAction('Juan me pagó 300 en BBVA', 'pay_liability', (a) => assert.deepStrictEqual([a.liabilityId, a.owedToMe, a.accountId], ['l-juan', true, 'a-bbva']));
expectAction('ya liquidé Coppel', 'settle_liability', (a) => assert.strictEqual(a.liabilityId, 'l-coppel'));
expectAction('me llegó un dividendo de 120 de FUNO11 en BBVA', 'register_dividend', (a) => assert.deepStrictEqual([a.investmentId, a.amount, a.accountId], ['i-funo', 120, 'a-bbva']));
expectClar('cobré dividendos de AAPL 45', 'register_dividend', 'account');
t('pagar más de lo que se debe pregunta el monto', () => { const r = run('pagué 9000 a Coppel desde BBVA'); assert.strictEqual(r.kind, 'clarification'); assert.strictEqual(r.field, 'amount'); });
t('pagar una deuda con una tarjeta de crédito se rechaza', () => { const r = run('pagué 500 a Coppel con Tarjeta Oro'); assert(r.kind === 'reply' || r.kind === 'clarification', JSON.stringify(r)); assert.notStrictEqual(r.type, 'pay_liability'); });

// ---------- lo que NO debe volverse P3 (no se pisa lo de antes) ----------
expectNot('transfiere 500 de BBVA a Nu', P3);
expectNot('aporta 300 a mi meta Viaje', P3);
expectNot('cambia el vencimiento de Coppel al 20 de octubre', P3);
expectNot('pon la fecha de mi meta Viaje para el 15 de diciembre', P3);
expectNot('agrega la deuda Elektra 2500', P3);
expectNot('gasté 200 en tacos', P3);
expectNot('cuánto gasté este mes', P3);
expectNot('mueve 500 de BBVA a Nu el viernes', P3);
expectNot('retira 500 de mi meta Viaje', P3);
expectNot('actualiza el saldo de Coppel a 2000', P3);

// ---------- aclaraciones de P3 (se contestan sin reiniciar) ----------
t('aclaración: «cada mes pago 199 de Spotify» → «BBVA» completa el pago recurrente', () => {
  const r = run('cada mes pago 199 de Spotify');
  const o = answerClarification(r.pending, 'BBVA', ctx());
  assert.strictEqual(o.kind, 'single');
  assert.strictEqual(o.step.action.type, 'add_recurring');
  assert.strictEqual(o.step.action.args.accountId, 'a-bbva');
});
t('aclaración: «recuérdame pagar la luz» → «el 15 de octubre» completa el aviso', () => {
  const r = run('recuérdame pagar la luz');
  const o = answerClarification(r.pending, 'el 15 de octubre', ctx());
  assert.strictEqual(o.kind, 'single');
  assert.strictEqual(o.step.action.args.date, '2026-10-15');
});
t('aclaración: «abona 1000 a Coppel» → «sin cuenta» solo ajusta la deuda', () => {
  const r = run('abona 1000 a Coppel');
  const o = answerClarification(r.pending, 'sin cuenta', ctx());
  assert.strictEqual(o.kind, 'single');
  assert.strictEqual(o.step.action.args.accountId, undefined);
});

// ---------- ids virtuales y planes ----------
t('virtualIdFor: estable por tipo y nombre (sin acentos ni mayúsculas); solo para lo que se crea', () => {
  assert.strictEqual(virtualIdFor('add_account', { name: 'Ahorro Ñandú' }), 'virtual:account:ahorro nandu');
  assert.strictEqual(virtualIdFor('add_account', { name: '  ahorro   ÑANDU ' }), 'virtual:account:ahorro nandu');
  assert.strictEqual(virtualIdFor('add_goal', { name: 'Casa' }), 'virtual:goal:casa');
  assert.strictEqual(virtualIdFor('add_liability', { institution: 'Elektra' }), 'virtual:liability:elektra');
  assert.strictEqual(virtualIdFor('delete_goal', { name: 'x' }), null);
  assert.strictEqual(virtualIdFor('add_account', {}), null);
});
t('substituteVirtualIds: cambia ids anidados, avisa de los que faltan y no toca lo demás', () => {
  const r = substituteVirtualIds({ a: 'virtual:account:nu', b: ['x', 'virtual:goal:casa'], c: { d: 'virtual:account:otro', e: 5 } }, { 'virtual:account:nu': 'REAL1', 'virtual:goal:casa': 'REAL2' });
  assert.deepStrictEqual(r.args, { a: 'REAL1', b: ['x', 'REAL2'], c: { d: 'virtual:account:otro', e: 5 } });
  assert.deepStrictEqual(r.unresolved, ['virtual:account:otro']);
});
t('plan: «crea la cuenta Ahorro2 con 500 y transfiere 200 de BBVA a Ahorro2» arma 2 pasos y el 2º usa el id virtual', () => {
  const r = run('crea la cuenta Ahorro2 con 500 y transfiere 200 de BBVA a Ahorro2');
  assert.strictEqual(r.kind, 'plan', JSON.stringify(r));
  assert.deepStrictEqual(r.steps.map((s) => s.type), ['add_account', 'transfer_between_accounts']);
  assert.strictEqual(r.steps[1].args.toAccountId, 'virtual:account:ahorro2');
  const pv = previewPlan(r.steps.map((s) => ({ action: s, summary: '' })), ctx());
  assert(!pv.effects.some((e) => String(e.id).startsWith('virtual:')), 'los efectos solo cuentan lo que ya existe');
});
t('plan: tras borrar una meta, otro paso sobre esa meta falla al armar el plan', () => {
  const r = run('borra la meta Laptop y aporta 100 a mi meta Laptop');
  assert(r.kind === 'reply' || r.kind === 'clarification', JSON.stringify(r));
});
t('plan: dos aportes seguidos validan contra el saldo ya aportado (retirar más de lo que hay tras aportar)', () => {
  const r = run('retira 3000 de mi meta Viaje y luego retira 1000 de mi meta Viaje');
  assert(r.kind === 'clarification' || r.kind === 'reply', JSON.stringify(r)); // 3500 - 3000 = 500 < 1000
});
t('simulateStep: pagar una deuda baja su saldo en la copia y no toca el contexto original', () => {
  const c = ctx();
  const c2 = simulateStep(c, 'pay_liability', { liabilityId: 'l-coppel', amount: 3000 });
  assert.strictEqual(c.liabilities[0].balance, 3000);
  assert.deepStrictEqual([c2.liabilities[0].balance, c2.liabilities[0].status], [0, 'settled']);
});

// ---------- extremo a extremo con el store real ----------
const { useAppStore } = require('@/store/useAppStore');
const S = () => useAppStore.getState();
const storeCtx = () => ({
  accounts: S().accounts, goals: S().goals, liabilities: S().liabilities, investments: S().investments, templateBudgetLines: S().templateBudgetLines,
  forecasts: S().transactions.filter((x) => x.status === 'forecast' && !x.deletedAt), recurringRules: S().recurringRules, reminders: S().reminders,
  recentTransactions: S().transactions.slice(0, 20), primaryCurrency: 'MXN', today: new Date().toISOString().slice(0, 10),
});
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const sendPlan = (text) => {
  const o = planFromText(text, storeCtx());
  const steps = o.kind === 'single' ? [o.step] : o.kind === 'plan' ? o.steps : null;
  assert(steps, `no armó acciones: ${JSON.stringify(o).slice(0, 300)}`);
  const plan = { id: `p-${Math.random().toString(36).slice(2)}`, contractVersion: 1, steps: steps.map((s, i) => ({ id: `s${i}-${Math.random().toString(36).slice(2)}`, type: s.action.type, args: s.action.args, summary: s.summary, status: 'proposed', createdAt: 'x' })), status: 'proposed', effects: [], warnings: [], createdAt: 'x' };
  const conv = S().startConversation();
  S().addChatMessage({ conversationId: conv, role: 'assistant', text: 'plan', plan });
  const id = S().chatMessages[S().chatMessages.length - 1].id;
  return { id, result: S().aiApplyPlan(id) };
};
const setup = () => {
  S().resetAll();
  S().addAccount({ name: 'BBVA', type: 'bank', currency: 'MXN', balance: 10000 });
  S().addAccount({ name: 'Nu', type: 'savings', currency: 'MXN', balance: 2000 });
  S().addGoal({ name: 'Viaje', targetAmount: 20000, currentAmount: 3000, currency: 'MXN' });
  S().addLiability({ institution: 'Coppel', type: 'personal_loan', balance: 3000, currency: 'MXN' });
  S().addInvestment({ ticker: 'FUNO11', name: 'FUNO', assetClass: 'fibra', quantity: 10, avgCostPrice: 20, currency: 'MXN', amountInvested: 200, purchaseDate: '2026-01-01' });
};
const bal = (n) => S().accounts.find((a) => a.name === n).balance;

setup();
t('E2E: «crea la cuenta Ahorro2 con 500 y transfiere 200 de BBVA a Ahorro2» → la cuenta nueva recibe los 200 (id virtual → real)', () => {
  const { result } = sendPlan('crea la cuenta Ahorro2 con 500 y transfiere 200 de BBVA a Ahorro2');
  assert.deepStrictEqual([result.ok, result.status], [true, 'applied'], JSON.stringify(result));
  assert.strictEqual(bal('Ahorro2'), 700);
  assert.strictEqual(bal('BBVA'), 9800);
  const tx = S().transactions.find((x) => x.type === 'transfer');
  assert.strictEqual(tx.toAccountId, S().accounts.find((a) => a.name === 'Ahorro2').id, 'el destino es el id REAL, no el virtual');
  assert(!JSON.stringify(S().transactions).includes('virtual:'));
});
t('E2E: crear una meta y aportar a ella en el mismo mensaje', () => {
  const { result } = sendPlan('crea la meta Moto de 40000 y aporta 500 a mi meta Moto');
  assert.deepStrictEqual([result.ok, result.status], [true, 'applied'], JSON.stringify(result));
  assert.strictEqual(S().goals.find((g) => g.name === 'Moto').currentAmount, 500);
});
t('E2E: previsto por chat NO mueve saldos; confirmarlo por chat sí, una sola vez', () => {
  const day = ymd(inDays(3));
  const before = bal('BBVA');
  const text = `el ${day.slice(8)} de ${['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][+day.slice(5, 7) - 1]} tengo que pagar 600 de luz con BBVA`;
  const { result } = sendPlan(text);
  assert.deepStrictEqual([result.ok, result.status], [true, 'applied'], `${text} ${JSON.stringify(result)}`);
  assert.strictEqual(bal('BBVA'), before, 'un previsto no mueve el saldo');
  const fc = S().transactions.find((x) => x.status === 'forecast' && x.amount === 600);
  assert(fc, 'quedó el previsto');
  // volverlo "de hoy" para poder confirmarlo
  S().postponeForecast(fc.id, ymd(new Date()));
  const { result: r2 } = sendPlan('ya pagué la luz');
  assert.deepStrictEqual([r2.ok, r2.status], [true, 'applied'], JSON.stringify(r2));
  assert.strictEqual(bal('BBVA'), before - 600);
});
t('E2E: pagar una deuda por chat baja la deuda y la cuenta; pagarla toda la salda', () => {
  const { result } = sendPlan('pagué 1000 a Coppel desde BBVA');
  assert.deepStrictEqual([result.ok, result.status], [true, 'applied'], JSON.stringify(result));
  assert.strictEqual(S().liabilities.find((l) => l.institution === 'Coppel').balance, 2000);
  const { result: r2 } = sendPlan('ya liquidé Coppel');
  assert.strictEqual(r2.ok, true, JSON.stringify(r2));
  assert.strictEqual(S().liabilities.find((l) => l.institution === 'Coppel').status, 'settled');
});
t('E2E: dividendo por chat entra a la cuenta y suma a lo recibido', () => {
  const before = bal('Nu');
  const { result } = sendPlan('me llegó un dividendo de 75 de FUNO11 en Nu');
  assert.strictEqual(result.ok, true, JSON.stringify(result));
  assert.strictEqual(bal('Nu'), before + 75);
  assert.strictEqual(S().investments[0].dividendsReceived, 75);
});
t('E2E: pago recurrente por chat crea la regla con sus previstos y aviso; pausarlo los quita', () => {
  const { result } = sendPlan('cada mes pago 199 de Spotify con BBVA');
  assert.strictEqual(result.ok, true, JSON.stringify(result));
  const rule = S().recurringRules.find((r) => r.name === 'Spotify');
  assert(rule, 'regla creada');
  assert(S().transactions.filter((x) => x.recurringRuleId === rule.id && x.status === 'forecast').length >= 3);
  const { result: r2 } = sendPlan('pausa Spotify');
  assert.strictEqual(r2.ok, true, JSON.stringify(r2));
  assert.strictEqual(S().recurringRules.find((r) => r.id === rule.id).status, 'paused');
  assert.strictEqual(S().transactions.filter((x) => x.recurringRuleId === rule.id && x.status === 'forecast').length, 0);
});
t('E2E: aviso por chat se crea; doble toque sobre el mismo plan no lo duplica', () => {
  const day = ymd(inDays(10));
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const { id, result } = sendPlan(`recuérdame pagar el seguro el ${+day.slice(8)} de ${months[+day.slice(5, 7) - 1]}`);
  assert.strictEqual(result.ok, true, JSON.stringify(result));
  const n = S().reminders.length;
  assert.strictEqual(S().aiApplyPlan(id).ok, false);
  assert.strictEqual(S().reminders.length, n);
  assert(S().reminders.some((r) => r.title === 'Pagar el seguro'));
});
t('E2E: un paso que depende de otro que falló no corre y no deja ids virtuales', () => {
  const o = planFromText('crea la cuenta Ahorro3 con 100 y transfiere 50 de BBVA a Ahorro3', storeCtx());
  assert.strictEqual(o.kind, 'plan');
  S().deleteAccount(S().accounts.find((a) => a.name === 'BBVA').id); // el origen desaparece antes de confirmar
  const steps = o.steps.map((s, i) => ({ id: `z${i}`, type: s.action.type, args: s.action.args, summary: s.summary, status: 'proposed', createdAt: 'x' }));
  const conv = S().startConversation();
  S().addChatMessage({ conversationId: conv, role: 'assistant', text: 'plan', plan: { id: 'pz', contractVersion: 1, steps, status: 'proposed', effects: [], warnings: [], createdAt: 'x' } });
  const mid = S().chatMessages[S().chatMessages.length - 1].id;
  const r = S().aiApplyPlan(mid);
  assert.strictEqual(r.status, 'partially_applied');
  assert(!JSON.stringify(S().transactions).includes('virtual:'));
});

console.log(`\nChat P3: ${ok} OK, ${fail} fallan`);
process.exit(fail ? 1 : 0);

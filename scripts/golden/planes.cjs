// Pruebas del planificador multi-acción (src/ai/planner.ts) y de las aclaraciones. Puro: no toca la app ni el store.
//   node scripts/golden/planes.cjs [--show]
require('./ts-hook.cjs');
const assert = require('assert');
const { planFromText, answerClarification, previewPlan, splitPlanSegments } = require('@/ai/planner');
const { resolveAddTransaction } = require('@/ai/actionCatalog');

const NOW = '2026-10-03T00:00:00.000Z';
const base = { createdAt: NOW, updatedAt: NOW, version: 1 };
const acc = (id, name, type, balance, extra = {}) => ({ ...base, id, name, type, balance, currency: 'MXN', ...extra });
const ctx = {
  accounts: [acc('a1', 'BBVA', 'bank', 5000), acc('a2', 'Nu', 'savings', 1200), acc('a3', 'Morralla', 'cash', 300), acc('a4', 'Liverpool', 'credit_card', -2000, { isLiability: true })],
  goals: [{ ...base, id: 'g1', name: 'Viaje', targetAmount: 20000, currentAmount: 3000, currency: 'MXN', targetDate: '2026-12-01' }],
  liabilities: [
    { ...base, id: 'l1', institution: 'Banorte', type: 'credit_card', balance: 8000, currency: 'MXN', dueDate: '2026-10-20' },
    { ...base, id: 'l2', institution: 'Liverpool', type: 'credit_card', balance: 2500, currency: 'MXN' },
  ],
  templateBudgetLines: [],
  recentTransactions: [],
  primaryCurrency: 'MXN',
  today: '2026-10-03', // sábado; las pruebas de fechas no dependen del calendario real
};
const oneAccount = { ...ctx, accounts: [ctx.accounts[0]] };

const types = (o) => (o.kind === 'plan' ? o.steps.map((s) => s.action.type) : o.kind === 'single' ? [o.step.action.type] : []);
let ok = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); ok++; if (process.argv.includes('--show')) console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name, '\n     ', e.message.split('\n')[0]); }
};

// ---- partir en instrucciones ----
t('un mensaje simple no se parte', () => assert.deepStrictEqual(splitPlanSegments('transfiere 500 de BBVA a Nu'), ['transfiere 500 de BBVA a Nu']));
t('parte con "y" solo si sigue un verbo de acción', () => assert.strictEqual(splitPlanSegments('transfiere 500 de BBVA a Nu y registra 200 de tacos en BBVA').length, 2));
t('no parte nombres con "y" ("Ahorros y Metas")', () => assert.strictEqual(splitPlanSegments('crea la cuenta Ahorros y Metas con 100').length, 1));
t('parte con coma + luego', () => assert.strictEqual(splitPlanSegments('aporta 300 a mi meta Viaje, luego transfiere 500 de BBVA a Nu').length, 2));
t('parte por salto de línea y punto y coma', () => assert.strictEqual(splitPlanSegments('aporta 300 a mi meta Viaje\ntransfiere 500 de BBVA a Nu; registra 90 de café en BBVA').length, 3));
t('no parte montos compuestos ("cincuenta y cinco")', () => assert.strictEqual(splitPlanSegments('registra cincuenta y cinco pesos de tacos').length, 1));

// ---- un solo paso: igual que antes ----
t('una transferencia sola sigue siendo single', () => assert.deepStrictEqual(types(planFromText('transfiere 500 de BBVA a Nu', ctx)), ['transfer_between_accounts']));
t('lo que no es acción sigue siendo none (lo contesta el copiloto)', () => assert.strictEqual(planFromText('cuánto gasté en comida este mes', ctx).kind, 'none'));
t('"gasté 200 en tacos" solo NO se vuelve acción (aún; ver pendientes)', () => assert.strictEqual(planFromText('gasté 200 en tacos', ctx).kind, 'none'));
t('"¿qué pasa de enero a febrero?" no es transferencia', () => assert.strictEqual(planFromText('¿qué pasa de enero a febrero?', ctx).kind, 'none'));

// ---- planes ----
t('transferencia + gasto → plan de 2 pasos en orden', () => {
  const o = planFromText('transfiere 500 de BBVA a Nu y registra 200 de tacos en BBVA', ctx);
  assert.strictEqual(o.kind, 'plan');
  assert.deepStrictEqual(types(o), ['transfer_between_accounts', 'add_transaction']);
  assert.strictEqual(o.steps[1].action.args.subcategoryId, 'food_fastfood');
  assert.strictEqual(o.steps[1].action.args.accountId, 'a1');
});
t('aporte a meta + transferencia', () => assert.deepStrictEqual(types(planFromText('aporta 300 a mi meta Viaje y luego transfiere 500 de BBVA a Nu', ctx)), ['contribute_to_goal', 'transfer_between_accounts']));
t('tres pasos', () => assert.strictEqual(planFromText('transfiere 500 de BBVA a Nu; aporta 300 a mi meta Viaje; registra 90 de café en Morralla', ctx).steps.length, 3));
t('cada paso trae resumen armado por código con cuentas reales', () => {
  const o = planFromText('transfiere 500 de BBVA a Nu y aporta 300 a mi meta Viaje', ctx);
  assert(o.steps[0].summary.includes('"BBVA"') && o.steps[0].summary.includes('"Nu"'), o.steps[0].summary);
});
t('con una sola cuenta normal se usa esa para el gasto', () => {
  const o = planFromText('registra 200 de tacos y registra 90 de café', oneAccount);
  assert.strictEqual(o.kind, 'plan');
  assert(o.steps.every((s) => s.action.args.accountId === 'a1'));
});
t('instrucción no entendida: se avisa y no entra al plan', () => {
  const o = planFromText('transfiere 500 de BBVA a Nu y aporta 300 a mi meta Viaje y baila la macarena', ctx);
  assert.strictEqual(o.kind, 'plan');
  assert.strictEqual(o.steps.length, 2);
});
t('demasiadas instrucciones se rechazan', () => {
  const o = planFromText(Array(8).fill('aporta 10 a mi meta Viaje').join('; '), ctx);
  assert.strictEqual(o.kind, 'reply');
});
t('un corte equivocado vuelve al mensaje completo', () => {
  const o = planFromText('crea la cuenta Ahorros y Metas con 100', ctx);
  assert(o.kind === 'single' && o.step.action.args.name.includes('Metas'), JSON.stringify(o));
});

// ---- aclaraciones (§2) ----
t('falta el monto de una transferencia entre cuentas reales → pregunta', () => {
  const o = planFromText('transfiere de BBVA a Nu', ctx);
  assert.strictEqual(o.kind, 'clarification');
  assert.strictEqual(o.pending.missing[0].field, 'amount');
});
t('responder el monto completa la misma acción (no reinicia)', () => {
  const o = planFromText('transfiere de BBVA a Nu', ctx);
  const r = answerClarification(o.pending, '700', ctx);
  assert(r.kind === 'single' && r.step.action.args.amount === 700 && r.step.action.args.fromAccountName === 'BBVA');
});
t('falta la cuenta de un gasto y el mensaje trae otro paso → pregunta conservando el resuelto', () => {
  const o = planFromText('registra 200 de tacos y transfiere 500 de BBVA a Nu', ctx);
  assert.strictEqual(o.kind, 'clarification');
  assert.strictEqual(o.pending.missing[0].field, 'account');
  assert.strictEqual(o.pending.resolvedSteps.length, 1);
  assert(o.reply.includes('BBVA'), o.reply); // lista las cuentas disponibles
});
t('al contestar la cuenta queda el plan con el orden ORIGINAL', () => {
  const o = planFromText('registra 200 de tacos y transfiere 500 de BBVA a Nu', ctx);
  const r = answerClarification(o.pending, 'en mi BBVA', ctx);
  assert.strictEqual(r.kind, 'plan');
  assert.deepStrictEqual(r.steps.map((s) => s.action.type), ['add_transaction', 'transfer_between_accounts']);
});
t('un nombre mal escrito (respuesta corta) se vuelve a preguntar', () => {
  const o = planFromText('registra 200 de tacos y transfiere 500 de BBVA a Nu', ctx);
  const r = answerClarification(o.pending, 'bbvva', ctx);
  assert.strictEqual(r.kind, 'clarification');
});
t('cambiar de tema NO cuenta como respuesta', () => {
  const o = planFromText('transfiere de BBVA a Nu', ctx);
  assert.strictEqual(answerClarification(o.pending, 'cuánto gasté en comida este mes en total y por categoría', ctx), null);
});
t('"cancela" cierra la pregunta sin aplicar nada', () => {
  const o = planFromText('transfiere de BBVA a Nu', ctx);
  assert.strictEqual(answerClarification(o.pending, 'mejor no', ctx).kind, 'reply');
});
t('meta nueva sin monto → pregunta el objetivo', () => assert.strictEqual(planFromText('crea la meta Laptop', ctx).pending.missing[0].slot, 'targetAmount'));
t('aportar sin monto a una meta que existe → pregunta; a una que no existe → nada', () => {
  assert.strictEqual(planFromText('aporta a mi meta Viaje', ctx).kind, 'clarification');
  assert.strictEqual(planFromText('aporta a mi meta Fantasma', ctx).kind, 'none');
});

// ---- efectos agregados y avisos (§4) ----
t('saldos resultantes tras aplicar los pasos en orden', () => {
  const o = planFromText('transfiere 500 de BBVA a Nu y registra 200 de tacos en BBVA y aporta 300 a mi meta Viaje', ctx);
  const p = previewPlan(o.steps, ctx);
  const get = (id) => p.effects.find((e) => e.id === id);
  assert.strictEqual(get('a1').after, 4300); // 5000 - 500 - 200
  assert.strictEqual(get('a2').after, 1700);
  assert.strictEqual(get('g1').after, 3300);
});
t('avisa si una cuenta quedaría en negativo', () => {
  const o = planFromText('transfiere 6000 de BBVA a Nu y aporta 10 a mi meta Viaje', ctx);
  const p = previewPlan(o.steps, ctx);
  assert(p.warnings.some((w) => w.includes('BBVA') && w.includes('paso 1')), JSON.stringify(p.warnings));
});
t('avisa de pasos idénticos', () => {
  const o = planFromText('aporta 300 a mi meta Viaje y luego aporta 300 a mi meta Viaje', ctx);
  assert(previewPlan(o.steps, ctx).warnings.some((w) => w.includes('idénticos')));
});
t('una tarjeta de crédito no dispara aviso de negativo', () => {
  const o = planFromText('registra 100 de tacos en Liverpool y aporta 10 a mi meta Viaje', ctx);
  assert.strictEqual(previewPlan(o.steps, ctx).warnings.length, 0);
});
t('previsualizar no modifica el contexto', () => {
  const before = JSON.stringify(ctx);
  previewPlan(planFromText('transfiere 500 de BBVA a Nu y aporta 300 a mi meta Viaje', ctx).steps, ctx);
  assert.strictEqual(JSON.stringify(ctx), before);
});

// ---- acciones nuevas y fechas (P2.3) ----
t('retirar de una meta que existe', () => {
  const o = planFromText('retira 500 de mi meta Viaje', ctx);
  assert(o.kind === 'single' && o.step.action.type === 'withdraw_from_goal' && o.step.action.args.amount === 500, JSON.stringify(o));
  assert(o.step.summary.includes('quedaría en $2,500'), o.step.summary);
});
t('retirar más de lo que tiene la meta → pregunta cuánto, no inventa', () => {
  const o = planFromText('retira 5000 de mi meta Viaje', ctx);
  assert.strictEqual(o.kind, 'clarification');
  assert(o.reply.includes('solo tiene $3,000'), o.reply);
  assert.strictEqual(answerClarification(o.pending, '800', ctx).step.action.args.amount, 800);
});
t('"quita 500 de la meta" retira; "quita la meta" la borra', () => {
  assert.strictEqual(planFromText('quita 500 de la meta Viaje', ctx).step.action.type, 'withdraw_from_goal');
  assert.strictEqual(planFromText('quita la meta Viaje', ctx).step.action.type, 'delete_goal');
});
t('aportar y luego retirar en un plan: la meta termina bien en la vista previa', () => {
  const o = planFromText('aporta 300 a mi meta Viaje y luego retira 100 de mi meta Viaje', ctx);
  assert.deepStrictEqual(types(o), ['contribute_to_goal', 'withdraw_from_goal']);
  assert.strictEqual(previewPlan(o.steps, ctx).effects.find((e) => e.id === 'g1').after, 3200);
});
t('cambiar la fecha de una meta (la siguiente ocurrencia)', () => {
  const o = planFromText('cambia la fecha de mi meta Viaje al 15 de enero', ctx);
  assert(o.kind === 'single' && o.step.action.type === 'update_goal_date' && o.step.action.args.targetDate === '2027-01-15', JSON.stringify(o));
  assert(o.step.summary.includes('01-12-2026') && o.step.summary.includes('15-01-2027'), o.step.summary);
});
t('una fecha de meta que ya pasó se pregunta de nuevo', () => {
  const o = planFromText('cambia la fecha de mi meta Viaje al 5 de septiembre de 2026', ctx);
  assert.strictEqual(o.kind, 'clarification');
  assert.strictEqual(o.pending.missing[0].field, 'date');
  assert.strictEqual(answerClarification(o.pending, 'para el 20 de diciembre', ctx).step.action.args.targetDate, '2026-12-20');
});
t('vencimiento de una deuda existente; el número de la fecha NO es el saldo', () => {
  const o = planFromText('cambia el vencimiento de la deuda Banorte al 25 de octubre', ctx);
  assert(o.kind === 'single' && o.step.action.type === 'update_liability_due_date' && o.step.action.args.dueDate === '2026-10-25', JSON.stringify(o));
  assert.strictEqual(planFromText('la deuda Banorte vence el 25', ctx).step.action.args.dueDate, '2026-10-25');
});
t('dos deudas con su fecha cada una: se parte en dos pasos (cada lado completo); jamás cruza fechas', () => {
  const o = planFromText('cambia el vencimiento de Banorte al día 25 y la deuda Liverpool vence el 30', ctx);
  assert.strictEqual(o.kind, 'plan');
  assert.deepStrictEqual(o.steps.map((s) => [s.action.args.institution, s.action.args.dueDate]), [['Banorte', '2026-10-25'], ['Liverpool', '2026-10-30']]);
});
t('dos deudas pero UNA sola fecha: no adivina cuál es de cuál', () => {
  const o = planFromText('cambia el vencimiento de Banorte y Liverpool al 25 de octubre', ctx);
  assert(o.kind === 'reply' && o.reply.includes('más de una deuda'), JSON.stringify(o));
});
t('meta nueva con monto y fecha: el nombre no se come el monto ni la fecha', () => {
  const o = planFromText('crea la meta Laptop de 20000 para el 15 de diciembre', ctx);
  assert(o.kind === 'single' && o.step.action.args.name === 'Laptop' && o.step.action.args.targetAmount === 20000 && o.step.action.args.targetDate === '2026-12-15', JSON.stringify(o));
});
t('un gasto de AYER dentro de un plan queda con su fecha', () => {
  const o = planFromText('registra 200 de tacos ayer en BBVA y transfiere 500 de BBVA a Nu', ctx);
  assert.strictEqual(o.kind, 'plan');
  assert(o.steps[0].summary.includes('ayer'), o.steps[0].summary);
  assert(o.steps[0].action.args.date.startsWith('2026-10-02') || o.steps[0].action.args.date.startsWith('2026-10-03'), o.steps[0].action.args.date); // mediodía local de ayer en ISO
  assert.strictEqual(o.steps[1].action.type, 'transfer_between_accounts');
});
t('una fecha futura en un movimiento real se pregunta (no se registra como si ya hubiera pasado)', () => {
  const r = resolveAddTransaction({ transactionType: 'expense', amount: 200, accountNameHint: 'BBVA', date: '2026-10-09' }, ctx);
  assert(!r.ok && r.clarification && r.clarification.missing[0].field === 'date', JSON.stringify(r));
  const a = answerClarification({ contractVersion: 1, ...r.clarification, status: 'open' }, 'ayer', ctx);
  assert(a.kind === 'single' && a.step.action.args.date.startsWith('2026-10-02'), JSON.stringify(a));
});
t('un movimiento de hoy no lleva fecha aparte (es "ahora")', () => {
  const r = resolveAddTransaction({ transactionType: 'expense', amount: 200, accountNameHint: 'BBVA', date: '2026-10-03' }, ctx);
  assert(r.ok && r.action.args.date === undefined);
});
t('agrégale/sácale a una cuenta con fecha pasada la guarda', () => {
  const o = planFromText('sácale 200 a mi Morralla ayer', ctx);
  assert(o.kind === 'single' && o.step.action.args.date, JSON.stringify(o));
});

console.log(`\nPlanificador: ${ok} OK, ${fail} fallan`);
process.exit(fail ? 1 : 0);

// Tarjeta de crédito (P3-TC) con el STORE real: avisos de corte y pago con id determinista, cambios de fecha, pago de la tarjeta,
// cierre automático del aviso SOLO cuando el saldo lo cubre, y reapertura si ese pago se borra.
//   node scripts/golden/tarjeta-store.cjs [--show]
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
const { cardReminderId, cardDue } = require('@/utils/creditCard');
const S = () => useAppStore.getState();

let ok = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); ok++; if (process.argv.includes('--show')) console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name, '\n     ', String(e.stack || e.message).split('\n').slice(0, 4).join('\n      ')); }
};
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const noon = (iso) => new Date(`${iso}T12:00:00`).toISOString();
const TODAY = ymd(new Date());
// corte hace 10 días, pago dentro de 5 → el estado cerrado vence en 5 días
const CUT = inDays(-10).getDate();
const DUE = inDays(5).getDate();

const setup = () => {
  S().resetAll();
  S().addAccount({ name: 'BBVA', type: 'bank', currency: 'MXN', balance: 20000 });
  S().addAccount({ name: 'Oro', type: 'credit_card', currency: 'MXN', balance: 0, isLiability: true });
};
const acc = (n) => S().accounts.find((a) => a.name === n);
const oro = () => S().accounts.find((a) => a.type === 'credit_card' && !a.deletedAt) ?? S().accounts.find((a) => a.type === 'credit_card');
const live = (list) => list.filter((x) => !x.deletedAt);
const remOf = (key) => S().reminders.find((r) => r.id === cardReminderId(oro().id, key));
const occs = (key) => live(S().reminderOccurrences).filter((o) => o.reminderId === cardReminderId(oro().id, key));
const openOccs = (key) => occs(key).filter((o) => ['pending', 'sent'].includes(o.status));
const spend = (amount, daysAgo) => S().addTransaction({ type: 'expense', amount, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_restaurant', accountId: oro().id, date: noon(ymd(inDays(-daysAgo))), origin: 'manual' });

setup();
t('setCardSettings: valida, rechaza una cuenta que no es tarjeta y no cambia nada si falla', () => {
  assert.strictEqual(S().setCardSettings(acc('BBVA').id, { cutoffDay: 5, dueDay: 25 }).ok, false);
  assert.strictEqual(S().setCardSettings(oro().id, { cutoffDay: 0, dueDay: 25 }).ok, false);
  assert.strictEqual(S().setCardSettings('no-existe', { cutoffDay: 5, dueDay: 25 }).ok, false);
  assert.strictEqual(S().reminders.length, 0);
  assert.strictEqual(oro().cardCutoffDay, undefined);
});
t('con fechas: se crean EXACTAMENTE dos avisos (corte y pago) con id determinista y sus ocurrencias', () => {
  const r = S().setCardSettings(oro().id, { cutoffDay: CUT, dueDay: DUE, creditLimit: 30000 });
  assert.strictEqual(r.ok, true, r.error);
  assert.strictEqual(S().reminders.length, 2);
  assert.deepStrictEqual([remOf('cutoff').kind, remOf('due').kind], ['card_cutoff', 'card_due']);
  assert.deepStrictEqual([remOf('due').maxAttempts, remOf('due').advanceDays], [3, [5, 2]]);
  assert(remOf('due').title.includes('Oro') && !/\d/.test(remOf('due').title));
  assert.deepStrictEqual([oro().cardCutoffDay, oro().cardDueDay, oro().creditLimit], [CUT, DUE, 30000]);
  const dueDays = [...new Set(openOccs('due').map((o) => o.offsetDays))].sort();
  assert.deepStrictEqual(dueDays, [0, 2, 5]);
  assert(openOccs('due').filter((o) => o.offsetDays === 0).length >= 5, 'al menos 5 meses por adelantado');
  assert.deepStrictEqual([...new Set(openOccs('cutoff').map((o) => o.offsetDays))].sort(), [0, 1]);
});
t('todos los avisos de pago caen en el día límite elegido (o el último del mes) y los de corte en el de corte', () => {
  for (const o of openOccs('due').filter((x) => x.offsetDays === 0)) {
    const last = new Date(+o.eventDate.slice(0, 4), +o.eventDate.slice(5, 7), 0).getDate();
    assert.strictEqual(+o.eventDate.slice(8), Math.min(DUE, last), o.eventDate);
  }
  for (const o of openOccs('cutoff').filter((x) => x.offsetDays === 0)) {
    const last = new Date(+o.eventDate.slice(0, 4), +o.eventDate.slice(5, 7), 0).getDate();
    assert.strictEqual(+o.eventDate.slice(8), Math.min(CUT, last), o.eventDate);
  }
});
t('IDEMPOTENTE: repetir setCardSettings y runMaterialization no duplica avisos ni ocurrencias', () => {
  const r0 = S().reminders.length, o0 = S().reminderOccurrences.length;
  for (let i = 0; i < 3; i++) { S().setCardSettings(oro().id, { cutoffDay: CUT, dueDay: DUE, creditLimit: 30000 }); S().runMaterialization(); S().refreshCards(); }
  assert.strictEqual(S().reminders.length, r0);
  assert.strictEqual(S().reminderOccurrences.length, o0);
  const ids = S().reminderOccurrences.map((o) => o.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});
t('el aviso sale del servidor con lo necesario: push, intentos y título copiados en cada ocurrencia', () => {
  const o = openOccs('due').find((x) => x.offsetDays === 0);
  assert.deepStrictEqual([o.push, o.maxAttempts, o.title], [true, 3, remOf('due').title]);
  assert(S().pendingSync.some((q) => q.table === 'reminders' && q.recordId === remOf('due').id));
  assert(S().pendingSync.some((q) => q.table === 'accounts' && q.recordId === oro().id));
});
t('cambiar el día de pago: el aviso sigue siendo el MISMO y las ocurrencias futuras se acomodan sin duplicar', () => {
  const id = remOf('due').id;
  const newDue = DUE === 20 ? 21 : 20;
  assert.strictEqual(S().setCardSettings(oro().id, { cutoffDay: CUT, dueDay: newDue }).ok, true);
  assert.strictEqual(remOf('due').id, id);
  assert.strictEqual(S().reminders.length, 2);
  const days = openOccs('due').filter((o) => o.offsetDays === 0 && o.eventDate > TODAY).map((o) => +o.eventDate.slice(8));
  assert(days.length >= 5 && days.every((d) => d === newDue || d >= 28), days.join(','));
  assert(!openOccs('due').some((o) => o.offsetDays === 0 && o.eventDate > TODAY && +o.eventDate.slice(8) === DUE && DUE < 28), 'no quedan avisos de la fecha vieja');
  S().setCardSettings(oro().id, { cutoffDay: CUT, dueDay: DUE }); // se vuelve a como estaba
});
t('renombrar la tarjeta actualiza el título de sus avisos', () => {
  S().updateAccount(oro().id, { name: 'Oro Plus' });
  assert(remOf('due').title.includes('Oro Plus') && remOf('cutoff').title.includes('Oro Plus'));
  S().updateAccount(oro().id, { name: 'Oro' });
});
t('preferencias propias: sin push, una vez, otra hora', () => {
  assert.strictEqual(S().setCardSettings(oro().id, { cutoffDay: CUT, dueDay: DUE, alerts: { push: false, timeOfDay: '08:00', cutoffAdvance: [], dueAdvance: [7], dueAttempts: 1 } }).ok, true);
  assert.deepStrictEqual([remOf('due').push, remOf('due').timeOfDay, remOf('due').advanceDays, remOf('due').maxAttempts], [false, '08:00', [7], 1]);
  assert(openOccs('due').every((o) => o.push === false || o.eventDate <= TODAY), 'las ocurrencias futuras copian la preferencia');
  S().setCardSettings(oro().id, { cutoffDay: CUT, dueDay: DUE });
  assert.strictEqual(remOf('due').push, true);
});

// ---------- pago de la tarjeta y cierre automático ----------
t('payCard: validaciones (tarjeta con tarjeta, monto, más de lo que se debe, sin saldo)', () => {
  assert.strictEqual(S().payCard(oro().id, { amount: 100, fromAccountId: acc('BBVA').id }).ok, false, 'sin saldo por pagar');
  spend(1000, 20); // compra ANTES del corte
  assert.strictEqual(oro().balance, 1000);
  assert.strictEqual(S().payCard(oro().id, { amount: 0, fromAccountId: acc('BBVA').id }).ok, false);
  assert.strictEqual(S().payCard(oro().id, { amount: 5000, fromAccountId: acc('BBVA').id }).ok, false);
  assert.strictEqual(S().payCard(oro().id, { amount: 100, fromAccountId: oro().id }).ok, false);
  assert.strictEqual(S().payCard(oro().id, { amount: 100, fromAccountId: 'x' }).ok, false);
  assert.strictEqual(S().payCard(oro().id, { amount: 100, fromAccountId: acc('BBVA').id, date: ymd(inDays(2)) }).ok, false, 'fecha futura');
  assert.strictEqual(acc('BBVA').balance, 20000);
});
t('antes de pagar: el estado está pendiente y NADA se ha cerrado', () => {
  const d = cardDue(oro(), S().transactions, TODAY);
  assert.deepStrictEqual([d.status, d.remaining, d.daysToDue], ['pending', 1000, 5]);
  assert(openOccs('due').some((o) => o.offsetDays === 0));
});
t('un pago PARCIAL baja la deuda pero NO cierra el aviso', () => {
  const r = S().payCard(oro().id, { amount: 400, fromAccountId: acc('BBVA').id });
  assert.strictEqual(r.ok, true, r.error);
  assert.deepStrictEqual([oro().balance, acc('BBVA').balance], [600, 19600]);
  assert.strictEqual(cardDue(oro(), S().transactions, TODAY).remaining, 600);
  const nearest = openOccs('due').filter((o) => o.eventDate === ymd(inDays(5)));
  assert(nearest.length > 0, 'el aviso del día límite sigue abierto');
});
t('compras NUEVAS después del corte no reabren ni cierran nada del estado anterior', () => {
  spend(300, 1);
  assert.strictEqual(cardDue(oro(), S().transactions, TODAY).remaining, 600);
  assert(openOccs('due').some((o) => o.eventDate === ymd(inDays(5))));
});
let fullPayment;
t('pagar lo que falta (600) cierra SOLO el aviso de ese estado, con autoSettled, y deja los de los meses siguientes', () => {
  const r = S().payCard(oro().id, { amount: 600, fromAccountId: acc('BBVA').id });
  assert.strictEqual(r.ok, true, r.error);
  fullPayment = r.transactionId;
  assert.strictEqual(cardDue(oro(), S().transactions, TODAY).status, 'paid');
  const thisDue = occs('due').filter((o) => o.eventDate === ymd(inDays(5)));
  assert(thisDue.length > 0 && thisDue.every((o) => ['confirmed', 'dismissed'].includes(o.status) && o.autoSettled === true && !o.nextAttemptAt), JSON.stringify(thisDue.map((o) => o.status)));
  assert(openOccs('due').some((o) => o.eventDate > ymd(inDays(5))), 'los meses siguientes siguen programados');
});
t('si se BORRA ese pago, el aviso se REABRE (nunca se pasa un pago)', () => {
  S().deleteTransaction(fullPayment);
  assert.strictEqual(cardDue(oro(), S().transactions, TODAY).status, 'pending');
  const thisDue = occs('due').filter((o) => o.eventDate === ymd(inDays(5)) && o.offsetDays === 0);
  assert(thisDue.every((o) => o.status === 'pending' && !o.autoSettled && o.nextAttemptAt && o.attemptsMade === 0), JSON.stringify(thisDue));
});
t('un «ya pagué» MANUAL no se reabre nunca, aunque el saldo no cuadre (pagó por fuera)', () => {
  const o = occs('due').find((x) => x.eventDate === ymd(inDays(5)) && x.offsetDays === 0);
  assert.strictEqual(S().confirmOccurrence(o.id).ok, true);
  S().payCard(oro().id, { amount: 100, fromAccountId: acc('BBVA').id });
  S().refreshCards();
  assert.strictEqual(S().reminderOccurrences.find((x) => x.id === o.id).status, 'confirmed');
});
t('una tarjeta sin saldo al corte no deja avisos de pago pendientes de ese estado', () => {
  S().resetAll();
  S().addAccount({ name: 'Oro', type: 'credit_card', currency: 'MXN', balance: 0, isLiability: true });
  S().setCardSettings(oro().id, { cutoffDay: CUT, dueDay: DUE });
  const thisDue = occs('due').filter((o) => o.eventDate === ymd(inDays(5)));
  assert(thisDue.length > 0 && thisDue.every((o) => ['confirmed', 'dismissed'].includes(o.status)), JSON.stringify(thisDue.map((o) => o.status)));
});


// ---------- chat ----------
const { planFromText } = require('@/ai/planner');
const { answerQuestion } = require('@/ai/localCopilot');
const storeCtx = () => ({ accounts: S().accounts, goals: S().goals, liabilities: S().liabilities, investments: S().investments, templateBudgetLines: S().templateBudgetLines, forecasts: [], recurringRules: S().recurringRules, reminders: S().reminders, recentTransactions: [], primaryCurrency: 'MXN', today: TODAY });
const sendPlan = (text) => {
  const o = planFromText(text, storeCtx());
  assert(o.kind === 'single', `${text} → ${JSON.stringify(o).slice(0, 200)}`);
  const plan = { id: `p-${Math.random().toString(36).slice(2)}`, contractVersion: 1, steps: [{ id: 's0', type: o.step.action.type, args: o.step.action.args, summary: o.step.summary, status: 'proposed', createdAt: 'x' }], status: 'proposed', effects: [], warnings: [], createdAt: 'x' };
  S().addChatMessage({ conversationId: S().startConversation(), role: 'assistant', text: 'plan', plan });
  const id = S().chatMessages[S().chatMessages.length - 1].id;
  return S().aiApplyPlan(id);
};
t('chat: «mi tarjeta Oro corta el 5 y paga el 25» fija las fechas y crea los avisos (sin partir el mensaje)', () => {
  setup();
  const r = sendPlan('mi tarjeta Oro corta el 5 y paga el 25');
  assert.deepStrictEqual([r.ok, r.status], [true, 'applied'], JSON.stringify(r));
  assert.deepStrictEqual([oro().cardCutoffDay, oro().cardDueDay], [5, 25]);
  assert.strictEqual(S().reminders.length, 2);
});
t('chat: cambiar solo una fecha conserva lo demás (límite, preferencias de aviso)', () => {
  S().setCardSettings(oro().id, { cutoffDay: 5, dueDay: 25, creditLimit: 30000, alerts: { push: false, timeOfDay: '08:00', cutoffAdvance: [], dueAdvance: [7], dueAttempts: 1 } });
  const r = sendPlan('mi tarjeta Oro paga el 28');
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual([oro().cardCutoffDay, oro().cardDueDay, oro().creditLimit, oro().cardAlerts.dueAttempts], [5, 28, 30000, 1]);
});
t('chat: sin decir cuál tarjeta con DOS tarjetas pregunta; con una sola la usa', () => {
  S().addAccount({ name: 'Nu Crédito', type: 'credit_card', currency: 'MXN', balance: 0, isLiability: true });
  const two = planFromText('mi tarjeta corta el 5 y paga el 25', storeCtx());
  assert.strictEqual(two.kind, 'clarification');
  assert.strictEqual(two.pending.missing[0].field, 'account');
  setup();
  assert.strictEqual(planFromText('mi tarjeta corta el 5 y paga el 25', storeCtx()).kind, 'single');
});
t('chat: dar un solo día pregunta el otro y se contesta con el número', () => {
  setup();
  const o = planFromText('mi tarjeta Oro corta el 5', storeCtx());
  assert.strictEqual(o.kind, 'clarification');
  const { answerClarification } = require('@/ai/planner');
  const a = answerClarification(o.pending, 'el 25', storeCtx());
  assert.strictEqual(a.kind, 'single');
  assert.deepStrictEqual([a.step.action.args.cutoffDay, a.step.action.args.dueDay], [5, 25]);
});
t('chat: días imposibles (0, 32) no pasan', () => {
  setup();
  for (const phrase of ['mi tarjeta Oro corta el 0 y paga el 25', 'mi tarjeta Oro corta el 5 y paga el 32']) {
    const o = planFromText(phrase, storeCtx());
    assert(o.kind !== 'single', `${phrase} → ${JSON.stringify(o).slice(0, 160)}`);
  }
});
t('chat: no confunde un pago o un gasto con las fechas de la tarjeta', () => {
  setup();
  for (const phrase of ['pago la tarjeta Oro el 25', 'gasté 500 con mi tarjeta Oro', 'transfiere 1000 de BBVA a Oro']) {
    const o = planFromText(phrase, storeCtx());
    const types = o.kind === 'single' ? [o.step.action.type] : [];
    assert(!types.includes('set_card_dates'), `${phrase} → ${types}`);
  }
});
t('preguntas: «cuándo pago mi tarjeta» responde con las fechas, el pendiente y lo que falta', () => {
  setup();
  S().setCardSettings(oro().id, { cutoffDay: CUT, dueDay: DUE });
  spend(1000, 20);
  const ctxCopilot = { profile: { primaryCurrency: 'MXN' }, transactions: S().transactions, accounts: S().accounts, investments: [], liabilities: [], budgets: [], goals: [] };
  const a = answerQuestion('¿cuándo es la fecha límite de pago de mi tarjeta?', ctxCopilot);
  assert(/Oro/.test(a) && /1,?000/.test(a) && /en 5 días/.test(a), a);
  S().clearCardSettings(oro().id);
  assert(/todavía no me dices sus fechas/.test(answerQuestion('cuándo corta mi tarjeta', { ...ctxCopilot, accounts: S().accounts })));
});

// ---------- quitar / borrar ----------
t('quitar las fechas o borrar la tarjeta cancela sus avisos y sus ocurrencias abiertas; volver a ponerlas los revive (mismo id)', () => {
  setup();
  S().setCardSettings(oro().id, { cutoffDay: CUT, dueDay: DUE });
  const id = remOf('due').id;
  assert.strictEqual(S().clearCardSettings(oro().id).ok, true);
  assert(S().reminders.filter((r) => r.kind.startsWith('card_')).every((r) => r.status === 'cancelled'));
  assert.strictEqual(openOccs('due').length + openOccs('cutoff').length, 0);
  S().runMaterialization();
  assert.strictEqual(openOccs('due').length, 0, 'cancelado no revive solo');
  S().setCardSettings(oro().id, { cutoffDay: CUT, dueDay: DUE });
  assert.strictEqual(remOf('due').id, id);
  assert.strictEqual(remOf('due').status, 'active');
  assert(openOccs('due').length > 0);
  S().deleteAccount(oro().id);
  assert(S().reminders.filter((r) => r.kind.startsWith('card_')).every((r) => r.status === 'cancelled'));
  assert.strictEqual(openOccs('due').length, 0);
});
t('dos dispositivos que configuran la MISMA tarjeta producen los mismos ids (nada se duplica al sincronizar)', () => {
  setup();
  const cardId = oro().id;
  S().setCardSettings(cardId, { cutoffDay: 10, dueDay: 28 });
  const ids = S().reminders.map((r) => r.id).sort();
  assert.deepStrictEqual(ids, [cardReminderId(cardId, 'cutoff'), cardReminderId(cardId, 'due')].sort());
  const occIds = S().reminderOccurrences.map((o) => o.id).sort();
  S().resetAll(); // "otro dispositivo": misma tarjeta (mismo id), misma configuración
  useAppStore.setState({ accounts: [{ id: cardId, createdAt: 'x', updatedAt: 'x', name: 'Oro', type: 'credit_card', currency: 'MXN', balance: 0, isLiability: true }] });
  S().setCardSettings(cardId, { cutoffDay: 10, dueDay: 28 });
  assert.deepStrictEqual(S().reminders.map((r) => r.id).sort(), ids, 'mismos avisos');
  assert.deepStrictEqual(S().reminderOccurrences.map((o) => o.id).sort(), occIds, 'mismas ocurrencias');
});

// ---------- que la tarjeta nueva no rompa lo anterior ----------
t('una cuenta normal y una tarjeta SIN fechas no generan avisos ni cambian nada', () => {
  setup();
  S().addTransaction({ type: 'expense', amount: 50, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_restaurant', accountId: oro().id, date: new Date().toISOString(), origin: 'manual' });
  S().runMaterialization();
  assert.strictEqual(S().reminders.length, 0);
  assert.strictEqual(oro().balance, 50);
});

console.log(`\nTarjeta de crédito (store): ${ok} OK, ${fail} fallan`);
process.exit(fail ? 1 : 0);

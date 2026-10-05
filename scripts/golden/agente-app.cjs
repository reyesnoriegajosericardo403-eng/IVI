// El agente de IA dentro de la app, con una IA FALSA que actúa como el modelo: herramientas que leen los datos reales del
// store, propuestas validadas con el catálogo (y categorías del motor local), planes con ids virtuales, aclaraciones,
// memoria, límite de pasos, respaldo al motor local cuando no hay IA y captura por voz híbrida.
//   node scripts/golden/agente-app.cjs
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

// La conexión con la función ai-agent se reemplaza por una IA falsa programable.
let fakeAi = null;
const transportCalls = [];
const mock = (request, exports) => {
  const file = Module._resolveFilename(request, module);
  require.cache[file] = { id: file, filename: file, loaded: true, exports, children: [], paths: [] };
};
const { AgentError } = require('@/ai/agent/protocol');
mock('@/ai/agent/transport', {
  agentChat: async (payload) => { transportCalls.push(payload); if (!fakeAi) throw new AgentError('not_configured', 'sin clave'); return fakeAi(payload); },
  agentStatus: async () => ({ configured: true, allowed: true }),
  agentTest: async () => ({}),
  forgetAgentStatus: () => {},
});

const { useAppStore } = require('@/store/useAppStore');
const { runAgentTurn, resolveProposal, buildSystemPrompt } = require('@/ai/agent/agentLoop');
const { historyFromMessages } = require('@/ai/agent/history');
const { runTool, AGENT_TOOLS } = require('@/ai/agent/tools');
const { createAgentActionProvider, snapshotForAgent, forgetAgentFailure } = require('@/providers/agent/agentActionProvider');
const { hybridInterpreterProvider } = require('@/providers/agent/hybridInterpreter');
const { buildValidationContext } = require('@/ai/validationContext');
const S = () => useAppStore.getState();

let ok = 0, fail = 0;
const queue = [];
const t = (name, fn) => queue.push([name, fn]);

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const noon = (iso) => new Date(`${iso}T12:00:00`).toISOString();
const TODAY = ymd(new Date());

function setup() {
  S().resetAll();
  S().addAccount({ name: 'BBVA', type: 'bank', currency: 'MXN', balance: 10000 });
  S().addAccount({ name: 'Efectivo', type: 'cash', currency: 'MXN', balance: 800 });
  S().addAccount({ name: 'Tarjeta Oro', type: 'credit_card', currency: 'MXN', balance: 3000, isLiability: true });
  S().addGoal({ name: 'Viaje', targetAmount: 20000, currentAmount: 5000, currency: 'MXN', targetDate: `${+TODAY.slice(0, 4) + 1}${TODAY.slice(4)}` });
  const efectivo = acc('Efectivo').id;
  const bbva = acc('BBVA').id;
  S().addTransaction({ type: 'expense', amount: 120, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_fastfood', merchant: 'Tacos El Güero', accountId: efectivo, date: noon(TODAY), origin: 'manual' });
  S().addTransaction({ type: 'expense', amount: 300, currency: 'MXN', categoryId: 'transport', subcategoryId: 'trans_uber', merchant: 'Uber', accountId: bbva, date: noon(TODAY), origin: 'manual' });
  S().addTransaction({ type: 'income', amount: 15000, currency: 'MXN', categoryId: 'income', subcategoryId: 'inc_salary', merchant: 'Sueldo', accountId: bbva, date: noon(TODAY), origin: 'manual' });
}
const acc = (n) => S().accounts.find((a) => a.name === n && !a.deletedAt);
const ctxFromStore = () => ({
  profile: S().profile, transactions: S().transactions.filter((x) => !x.deletedAt && (!x.status || x.status === 'posted')),
  accounts: S().accounts.filter((a) => !a.deletedAt), investments: [], liabilities: S().liabilities.filter((l) => !l.deletedAt),
  budgets: [], goals: S().goals.filter((g) => !g.deletedAt), templateBudgetLines: [],
  forecasts: S().transactions.filter((x) => !x.deletedAt && x.status === 'forecast'), recurringRules: S().recurringRules, reminders: S().reminders,
});

// IA falsa: una lista de respuestas, una por paso. Cada respuesta puede ser función del payload recibido.
function script(steps) {
  let i = 0;
  const seen = [];
  const fn = async (payload) => {
    seen.push(JSON.parse(JSON.stringify(payload)));
    const step = steps[Math.min(i, steps.length - 1)];
    i++;
    const out = typeof step === 'function' ? step(payload) : step;
    return { provider: 'gemini', providerLabel: 'Gemini (Google)', model: 'gemini-test', text: out.text ?? '', toolCalls: out.toolCalls ?? [], raw: { provider: 'gemini', model: 'gemini-test', content: { parts: [] } }, finishReason: 'STOP', quota: { used: i, limit: 150, remaining: 150 - i } };
  };
  fn.seen = seen;
  return fn;
}
const call = (name, args = {}, id) => ({ id: id ?? `vx_${name}`, name, args });
const turn = (text, call, extra = {}) => {
  const data = snapshotForAgent(TODAY);
  return runAgentTurn({ text, history: [], data, validation: buildValidationContext(ctxFromStore()), call, ...extra });
};
const lastToolResults = (seen) => {
  const msgs = seen[seen.length - 1].messages;
  return msgs.filter((m) => m.role === 'tool').flatMap((m) => m.results);
};

// ---------------------------------------------------------------- herramientas
t('herramientas: definiciones válidas para los proveedores (objeto con propiedades, nombres simples)', () => {
  assert(AGENT_TOOLS.length >= 10);
  for (const tool of AGENT_TOOLS) {
    assert(/^[a-z_]+$/.test(tool.name), tool.name);
    assert.strictEqual(tool.parameters.type, 'object');
    assert(tool.parameters.properties && Object.keys(tool.parameters.properties).length > 0, `${tool.name} sin propiedades (Gemini las exige)`);
  }
});
t('resumen_financiero usa los números reales (patrimonio, gasto e ingreso del mes)', () => {
  setup();
  const r = runTool('resumen_financiero', {}, snapshotForAgent(TODAY)).content;
  assert.strictEqual(r.este_mes.gastado, 420);
  assert.strictEqual(r.este_mes.ingresos, 15000);
  assert.strictEqual(r.patrimonio.pasivos, 3000);
  assert.strictEqual(r.fecha_de_hoy, TODAY);
  assert.strictEqual(r.presupuesto, 'sin presupuesto definido');
});
t('buscar_movimientos filtra por texto, tipo y cuenta, con totales', () => {
  setup();
  const d = snapshotForAgent(TODAY);
  const uber = runTool('buscar_movimientos', { texto: 'uber' }, d).content;
  assert.deepStrictEqual([uber.cantidad, uber.total_gastos, uber.movimientos[0].comercio, uber.movimientos[0].cuenta], [1, 300, 'Uber', 'BBVA']);
  const ingresos = runTool('buscar_movimientos', { tipo: 'ingreso' }, d).content;
  assert.deepStrictEqual([ingresos.cantidad, ingresos.total_ingresos], [1, 15000]);
  const efectivo = runTool('buscar_movimientos', { cuenta: 'efectivo' }, d).content;
  assert.strictEqual(efectivo.cantidad, 1);
  const comida = runTool('buscar_movimientos', { texto: 'comida' }, d).content;
  assert.strictEqual(comida.cantidad, 1, 'busca también por nombre de categoría');
});
t('gastos_por_categoria ordena y calcula porcentajes', () => {
  setup();
  const r = runTool('gastos_por_categoria', {}, snapshotForAgent(TODAY)).content;
  assert.strictEqual(r.total, 420);
  assert.strictEqual(r.categorias[0].monto, 300);
  assert.strictEqual(r.categorias[0].porcentaje, 71.4);
});
t('ver_metas calcula lo que falta y el aporte mensual necesario', () => {
  setup();
  const m = runTool('ver_metas', {}, snapshotForAgent(TODAY)).content.metas[0];
  assert.deepStrictEqual([m.nombre, m.falta, m.avance_pct], ['Viaje', 15000, 25]);
  assert(m.aporte_mensual_necesario > 1000 && m.aporte_mensual_necesario <= 15000, String(m.aporte_mensual_necesario));
});
t('ver_tarjetas con fechas: fecha límite y pago para no generar intereses', () => {
  setup();
  S().setCardSettings(acc('Tarjeta Oro').id, { cutoffDay: 5, dueDay: 25 });
  const card = runTool('ver_tarjetas', {}, snapshotForAgent(TODAY)).content.tarjetas[0];
  assert.deepStrictEqual([card.nombre, card.dia_corte, card.dia_pago], ['Tarjeta Oro', 5, 25]);
  assert(typeof card.fecha_limite === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(card.fecha_limite));
  assert('pago_para_no_generar_intereses' in card);
});
t('ver_proximos ve previstos y avisa si una cuenta quedaría en negativo', () => {
  setup();
  S().addForecast({ type: 'expense', amount: 1000, currency: 'MXN', categoryId: 'housing', subcategoryId: 'house_rent', merchant: 'Renta', accountId: acc('Efectivo').id, date: noon(plusDays(3)) });
  const r = runTool('ver_proximos', { dias: 7 }, snapshotForAgent(TODAY)).content;
  assert.strictEqual(r.previstos.length, 1);
  assert.strictEqual(r.total_gastos_previstos, 1000);
  assert.match(r.alerta_saldo, /Efectivo/);
});
t('una herramienta desconocida no rompe nada', () => {
  setup();
  assert.match(runTool('borrar_todo', {}, snapshotForAgent(TODAY)).content.error, /No existe/);
});

// ---------------------------------------------------------------- bucle
t('pregunta: la IA consulta una herramienta, recibe los números reales y contesta', async () => {
  setup();
  const progress = [];
  const ai = script([
    { toolCalls: [call('gastos_por_categoria', {})] },
    (p) => {
      const res = p.messages.find((m) => m.role === 'tool').results[0].content;
      return { text: `Gastaste ${res.total} este mes; lo que más fue ${res.categorias[0].nombre}.` };
    },
  ]);
  const r = await turn('¿en qué gasté más?', ai, { onProgress: (l) => progress.push(l) });
  assert.match(r.interpreted.reply, /Gastaste 420/);
  assert.deepStrictEqual(r.toolsUsed, ['gastos_por_categoria']);
  assert.deepStrictEqual(progress, ['Sumando por categoría']);
  assert.strictEqual(ai.seen[0].tools.length, AGENT_TOOLS.length);
  assert.match(ai.seen[0].system, /Hoy es/);
  assert.strictEqual(ai.seen[1].messages[1].role, 'assistant', 'se devuelve la respuesta original de la IA');
  assert.ok(ai.seen[1].messages[1].raw);
});
t('registrar: la IA propone un gasto; la app elige la categoría con el motor local y pide confirmar', async () => {
  setup();
  const ai = script([{ toolCalls: [call('proponer_acciones', { acciones: [{ type: 'add_transaction', transactionType: 'expense', amount: 230, concepto: 'tacos', accountNameHint: 'efectivo' }], mensaje: 'Listo, lo anoto.' })] }]);
  const r = await turn('gasté 230 en tacos en efectivo', ai);
  const a = r.interpreted.action;
  assert(a, JSON.stringify(r.interpreted));
  assert.strictEqual(a.type, 'add_transaction');
  assert.deepStrictEqual([a.args.amount, a.args.categoryId, a.args.subcategoryId, a.args.accountName, a.args.merchant], [230, 'food', 'food_fastfood', 'Efectivo', 'tacos']);
  assert.match(r.interpreted.reply, /^Listo, lo anoto\. Mantén presionado para confirmar\./);
  assert.strictEqual(ai.seen.length, 1, 'una propuesta válida termina el turno');
  // La propuesta nunca toca los datos: solo al confirmar.
  assert.strictEqual(S().transactions.filter((x) => !x.deletedAt).length, 3);
});
t('plan: crear una cuenta y transferirle dinero en el mismo mensaje (id virtual)', async () => {
  setup();
  const ai = script([{ toolCalls: [call('proponer_acciones', { acciones: [
    { type: 'add_account', name: 'Nu', accountTypeHint: 'ahorro', balance: 0 },
    { type: 'transfer_between_accounts', fromAccountNameHint: 'BBVA', toAccountNameHint: 'Nu', amount: 500 },
  ] })] }]);
  const r = await turn('abre una cuenta Nu y pásale 500 desde BBVA', ai);
  assert(r.interpreted.plan, JSON.stringify(r.interpreted));
  assert.strictEqual(r.interpreted.plan.steps.length, 2);
  assert.match(String(r.interpreted.plan.steps[1].action.args.toAccountId), /^virtual:account:/);
});
t('falta un dato: se le pregunta a la persona (aclaración que el motor local contesta después)', async () => {
  setup();
  const ai = script([{ toolCalls: [call('proponer_acciones', { acciones: [{ type: 'add_transaction', transactionType: 'expense', concepto: 'gasolina', accountNameHint: 'BBVA' }] })] }]);
  const r = await turn('pon lo de la gasolina', ai);
  assert(r.interpreted.clarification, JSON.stringify(r.interpreted));
  assert.strictEqual(r.interpreted.clarification.missing[0].field, 'amount');
});
t('propuesta imposible: se le explica a la IA y ella responde (sin aplicar nada)', async () => {
  setup();
  const ai = script([
    { toolCalls: [call('proponer_acciones', { acciones: [{ type: 'transfer_between_accounts', fromAccountNameHint: 'BBVA', toAccountNameHint: 'BBVA', amount: 50 }] })] },
    (p) => ({ text: `No puedo: ${JSON.stringify(p.messages[p.messages.length - 1].results[0].content).slice(0, 40)}` }),
  ]);
  const r = await turn('transfiere 50 de BBVA a BBVA', ai);
  assert.match(r.interpreted.reply, /^No puedo/);
  assert(!r.interpreted.action && !r.interpreted.plan);
  assert.strictEqual(ai.seen.length, 2);
});
t('tipo de acción inventado: se rechaza y se le pide corregir', async () => {
  setup();
  const ai = script([
    { toolCalls: [call('proponer_acciones', { acciones: [{ type: 'hackear_banco', amount: 1 }] })] },
    { text: 'Eso no lo puedo hacer.' },
  ]);
  const r = await turn('haz algo raro', ai);
  assert.strictEqual(r.interpreted.reply, 'Eso no lo puedo hacer.');
  assert.match(JSON.stringify(ai.seen[1].messages), /No reconocí esas acciones|No pude armar/);
});
t('memoria: la IA guarda un dato y queda en "lo que VALU recuerda"', async () => {
  setup();
  const ai = script([{ toolCalls: [call('recordar', { dato: 'Cobra cada quincena (15 y último día)' })] }, { text: 'Anotado.' }]);
  const r = await turn('te cuento que cobro cada quincena', ai, { onRemember: (x) => S().addAgentMemory(x) });
  assert.strictEqual(r.interpreted.reply, 'Anotado.');
  assert.deepStrictEqual(S().agentMemory.map((m) => m.text), ['Cobra cada quincena (15 y último día)']);
  assert.match(buildSystemPrompt(snapshotForAgent(TODAY)), /Cobra cada quincena/, 'la memoria entra en el siguiente turno');
  assert.strictEqual(S().addAgentMemory('cobra cada quincena (15 y último día)'), false, 'no duplica');
});
t('límite de pasos: el último paso obliga a contestar con texto', async () => {
  setup();
  const ai = script([(p) => (p.toolChoice === 'none' ? { text: 'Resumen final.' } : { toolCalls: [call('ver_cuentas', {})] })]);
  const r = await turn('analiza todo', ai, { maxSteps: 3 });
  assert.strictEqual(r.interpreted.reply, 'Resumen final.');
  assert.deepStrictEqual(ai.seen.map((p) => p.toolChoice), ['auto', 'auto', 'none']);
});
t('historial: empieza con la persona, une mensajes seguidos y anota el estado de lo propuesto', () => {
  const msgs = [
    { id: '1', conversationId: 'c', role: 'assistant', text: 'Hola', createdAt: 'x' },
    { id: '2', conversationId: 'c', role: 'user', text: 'gasté 50', createdAt: 'x' },
    { id: '3', conversationId: 'c', role: 'assistant', text: 'Va', createdAt: 'x', action: { id: 'a', type: 'add_transaction', args: {}, summary: 'Agregar gasto de $50', status: 'applied', createdAt: 'x' } },
  ];
  const h = historyFromMessages(msgs);
  assert.match(h[2].text, /Agregar gasto de \$50 · estado: applied/);
  return (async () => {
    setup();
    const ai = script([{ text: 'ok' }]);
    await runAgentTurn({ text: 'y ahora?', history: [{ role: 'assistant', text: 'Hola' }, { role: 'user', text: 'a' }, { role: 'user', text: 'b' }], data: snapshotForAgent(TODAY), validation: buildValidationContext(ctxFromStore()), call: ai });
    assert.deepStrictEqual(ai.seen[0].messages, [{ role: 'user', text: 'a\nb\ny ahora?' }]);
  })();
});
t('resolveProposal: más de 6 acciones se rechaza', () => {
  setup();
  const many = Array.from({ length: 7 }, () => ({ type: 'contribute_to_goal', goalNameHint: 'Viaje', amount: 10 }));
  assert.strictEqual(resolveProposal(many, buildValidationContext(ctxFromStore())).kind, 'reply');
});

// ---------------------------------------------------------------- proveedor del chat (con respaldo local)
t('chat con IA: respuesta marcada como IA, con modelo y herramientas usadas', async () => {
  setup();
  forgetAgentFailure();
  fakeAi = script([{ toolCalls: [call('ver_cuentas', {})] }, { text: 'Tienes 3 cuentas.' }]);
  const provider = createAgentActionProvider();
  const r = await provider.interpretMessage('¿qué cuentas tengo?', ctxFromStore(), {});
  assert.strictEqual(r.reply, 'Tienes 3 cuentas.');
  assert.deepStrictEqual([r.meta.engine, r.meta.label, r.meta.tools], ['ai', 'Gemini · gemini-test', ['ver_cuentas']]);
});
t('sin clave de IA: contesta el motor local, explica por qué y no reintenta durante un minuto', async () => {
  setup();
  forgetAgentFailure();
  fakeAi = null; // la IA falsa lanza not_configured
  transportCalls.length = 0;
  const provider = createAgentActionProvider();
  const r = await provider.interpretMessage('cuánto gasté este mes', ctxFromStore(), {});
  assert.strictEqual(r.meta.engine, 'local');
  assert.match(r.meta.notice, /GEMINI_API_KEY/);
  assert(r.reply.length > 0);
  const r2 = await provider.interpretMessage('y la semana?', ctxFromStore(), {});
  assert.strictEqual(r2.meta.engine, 'local');
  assert.strictEqual(transportCalls.length, 1, 'no vuelve a intentar con la configuración rota');
});
t('responder una aclaración pendiente no gasta IA', async () => {
  setup();
  forgetAgentFailure();
  fakeAi = script([{ text: 'no debería llamarse' }]);
  transportCalls.length = 0;
  const provider = createAgentActionProvider();
  const pending = { type: 'add_transaction', candidate: { transactionType: 'expense', accountNameHint: 'BBVA' }, missing: [{ field: 'amount', slot: 'amount', prompt: '¿Cuánto?' }] };
  const r = await provider.interpretMessage('350', ctxFromStore(), { pending });
  assert.strictEqual(transportCalls.length, 0);
  assert(r.action || r.plan || r.handledClarification, JSON.stringify(r));
});

// ---------------------------------------------------------------- captura híbrida
t('captura: si el motor local entiende todo, no se llama a la IA', async () => {
  fakeAi = script([{ text: '{}' }]);
  transportCalls.length = 0;
  const r = await hybridInterpreterProvider.parseCaptureText('gasté 85 en uber');
  assert.deepStrictEqual([r.amount, r.categoryId, transportCalls.length], [85, 'transport', 0]);
});
t('captura: si el motor local no sabe la categoría, la IA la completa (sin perder el monto local)', async () => {
  fakeAi = script([{ text: '{"type":"expense","amount":999,"currency":"MXN","categoryId":"food","subcategoryId":"food_fastfood","merchant":"zumbalanga"}' }]);
  transportCalls.length = 0;
  const r = await hybridInterpreterProvider.parseCaptureText('gasté 140 en zumbalanga');
  assert.strictEqual(transportCalls.length, 1);
  assert.deepStrictEqual([r.amount, r.categoryId, r.subcategoryId], [140, 'food', 'food_fastfood']);
  assert.deepStrictEqual(r.missing, []);
});
t('captura: si la IA falla, queda lo del motor local', async () => {
  fakeAi = null;
  const r = await hybridInterpreterProvider.parseCaptureText('gasté 140 en zumbalanga');
  assert.strictEqual(r.amount, 140);
  assert(r.missing.includes('category'));
});

t('modelos retirados guardados de antes se ignoran (el servidor elige el vigente)', () => {
  delete require.cache[Module._resolveFilename('@/ai/agent/transport', module)];
  const real = require('../../src/ai/agent/transport.ts');
  assert.strictEqual(real.usableModel('gemini-2.0-flash'), undefined);
  assert.strictEqual(real.usableModel('gemini-1.5-pro'), undefined);
  assert.strictEqual(real.usableModel('  '), undefined);
  assert.strictEqual(real.usableModel('gemini-3.5-flash'), 'gemini-3.5-flash');
  assert.strictEqual(real.usableModel('claude-haiku-4-5-20251001'), 'claude-haiku-4-5-20251001');
});

(async () => {
  for (const [name, fn] of queue) {
    try { await fn(); ok++; } catch (e) { fail++; console.log('  ✗', name, '\n     ', String(e.stack || e.message).split('\n').slice(0, 5).join('\n      ')); }
  }
  console.log(`Agente de IA (app): ${ok} OK, ${fail} fallan`);
  process.exit(fail ? 1 : 0);
})();

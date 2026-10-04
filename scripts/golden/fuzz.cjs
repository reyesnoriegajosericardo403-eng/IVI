// Pruebas adversariales (fuzz + rendimiento) de lo que recibe TEXTO LIBRE de la persona: fechas, planificador, reconocimiento
// de comandos del chat y captura. Buscan dos cosas: (1) que NADA lance una excepción con entradas raras y (2) que ninguna
// expresión regular se ponga cuadrática/exponencial con textos largos (congelaría la pantalla).
//   node scripts/golden/fuzz.cjs [--seed N] [--rounds N]
require('./ts-hook.cjs');
const assert = require('assert');
const D = require('@/ai/dates');
const { planFromText, splitPlanSegments, previewPlan } = require('@/ai/planner');
const { detectChatIntent } = require('@/ai/chatIntentParser');
const P = require('@/ai/localParser');
const { findRecurrence } = require('@/ai/recurrenceText');

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? Number(argv[i + 1]) : d; };
let seed = opt('seed', 20261004);
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];

const NOW = new Date(2026, 9, 3, 15, 30);
const base = { createdAt: 'x', updatedAt: 'x', version: 1 };
const ctx = {
  accounts: [
    { ...base, id: 'a1', name: 'BBVA', type: 'bank', balance: 5000, currency: 'MXN' },
    { ...base, id: 'a2', name: 'Nu', type: 'savings', balance: 1200, currency: 'MXN' },
    { ...base, id: 'a3', name: 'Morralla', type: 'cash', balance: 300, currency: 'MXN' },
    { ...base, id: 'a4', name: 'Oro', type: 'credit_card', balance: 900, currency: 'MXN', isLiability: true, cardCutoffDay: 5, cardDueDay: 25 },
  ],
  goals: [{ ...base, id: 'g1', name: 'Viaje', targetAmount: 20000, currentAmount: 3000, currency: 'MXN' }],
  liabilities: [{ ...base, id: 'l1', institution: 'Banorte', type: 'credit_card', balance: 8000, currency: 'MXN', dueDate: '2026-10-20' }],
  // P3: previstos, pagos recurrentes, avisos e inversiones para que las frases de P3 resuelvan contra algo real
  investments: [{ ...base, id: 'i1', ticker: 'FUNO11', name: 'FUNO', assetClass: 'fibra', quantity: 1, avgCostPrice: 1, currency: 'MXN', amountInvested: 1, purchaseDate: '2026-01-01' }],
  forecasts: [{ ...base, id: 'f1', type: 'expense', amount: 8000, currency: 'MXN', categoryId: 'housing', subcategoryId: 'house_rent', merchant: 'Renta', accountId: 'a1', date: '2026-10-05T18:00:00.000Z', status: 'forecast', recurringRuleId: 'r1', origin: 'automatic' }],
  recurringRules: [{ ...base, id: 'r1', kind: 'transaction', name: 'Renta', status: 'active', recurrence: { frequency: 'monthly', interval: 1, startDate: '2026-10-05', dayOfMonth: 5 }, amount: 8000, currency: 'MXN', txType: 'expense', accountId: 'a1' }],
  reminders: [{ ...base, id: 'm1', kind: 'custom', title: 'Pagar predial', date: '2026-10-20', timeOfDay: '09:00', advanceDays: [], maxAttempts: 1, attemptIntervalMinutes: 120, push: true, status: 'active' }],
  templateBudgetLines: [], recentTransactions: [], primaryCurrency: 'MXN', today: '2026-10-03',
};

const WORDS = ['transfiere', 'pasa', 'aporta', 'retira', 'registra', 'gasté', 'pagué', 'de', 'a', 'en', 'y', 'luego', 'mi', 'meta', 'cuenta', 'deuda', 'BBVA', 'Nu', 'Morralla', 'Viaje', 'Banorte',
  'ayer', 'hoy', 'mañana', 'el', 'viernes', 'lunes', '15', 'marzo', 'de', 'octubre', '500', '1,200.50', '$300', 'mil', 'pesos', 'a las', '5', 'pm', 'hace', '3', 'días', 'semana', 'pasada', 'vence', 'fecha', 'cambia',
  'tacos', 'luz', 'renta', '/', '-', ',', '.', ';', '\n', '2026', '1/2', 'kilo', 'cada', 'mes', 'quincena', 'domingo', 'enero', 'dic', 'una', 'cinco', 'treinta', 'y', 'media', 'cuarto', 'menos',
  'recuérdame', 'avísame', 'cada', 'todos los', 'mensual', 'quincenal', 'pausa', 'reanuda', 'termina', 'ya pagué', 'no pagué', 'pospón', 'dividendo', 'FUNO11', 'Renta', 'Pagar predial', 'insiste', 'hasta', 'veces', 'antes', 'abona', 'liquidé', 'me depositan', 'tengo que pagar', 'voy a pagar', 'tarjeta', 'Oro', 'corta', 'cierra', 'paga', 'fecha límite', 'corte'];
const RARE = ['', ' ', '\u0000', '😀', 'ñandú', 'ÁÉÍÓÚ', '٣٤٥', '𝟙𝟚𝟛', '‮', 'İstanbul', 'ǅ', '\ud800', 'a'.repeat(200), '9'.repeat(40), '-0', '1e999', '0x10', 'NaN', 'Infinity', '$', '$$$', '(((', '[[[', '\\', '*', '+', '?'];
const randomText = () => {
  const n = 1 + Math.floor(rnd() * 24);
  const out = [];
  for (let i = 0; i < n; i++) out.push(rnd() < 0.08 ? pick(RARE) : pick(WORDS));
  return out.join(rnd() < 0.9 ? ' ' : '');
};

let ok = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); ok++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n     ', String(e.stack || e).split('\n').slice(0, 4).join('\n      ')); }
};

// ---- 1) nada lanza excepciones ----
const ROUNDS = opt('rounds', 6000);
t(`${ROUNDS} textos al azar: ninguna función lanza`, () => {
  for (let i = 0; i < ROUNDS; i++) {
    const s = randomText();
    try {
      D.findDateMentions(s, NOW, { prefer: pick(['past', 'future', 'auto']) });
      D.findTimeMentions(s);
      D.extractPeriod(s, NOW, { prefer: pick(['past', 'future', 'auto']) });
      splitPlanSegments(s);
      const o = planFromText(s, ctx);
      if (o.kind === 'plan') previewPlan(o.steps, ctx);
      detectChatIntent(s, ctx, NOW);
      findRecurrence(s, NOW);
      P.parseCaptureText(s, NOW);
    } catch (e) { e.message = `${e.message}\n   entrada: ${JSON.stringify(s)}`; throw e; }
  }
});

// ---- 2) los resultados son coherentes ----
t('fechas devueltas siempre válidas (AAAA-MM-DD reales) y con posiciones dentro del texto', () => {
  for (let i = 0; i < 4000; i++) {
    const s = randomText();
    for (const m of D.findDateMentions(s, NOW, { prefer: pick(['past', 'future', 'auto']) })) {
      assert(/^\d{4}-\d{2}-\d{2}$/.test(m.iso), `${s} → ${m.iso}`);
      const [y, mo, d] = m.iso.split('-').map(Number);
      const dt = new Date(y, mo - 1, d);
      assert(dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d, `fecha imposible ${m.iso} en «${s}»`);
      assert(m.start >= 0 && m.end <= s.length && m.start < m.end, `posiciones ${m.start}-${m.end} en «${s}»`);
      assert(s.slice(m.start, m.end) === m.text, 'texto no coincide');
    }
    for (const m of D.findTimeMentions(s)) assert(m.hour >= 0 && m.hour <= 23 && m.minute >= 0 && m.minute <= 59, `hora ${m.hour}:${m.minute} en «${s}»`);
  }
});
t('el monto de una captura nunca es NaN/negativo/infinito', () => {
  for (let i = 0; i < 4000; i++) {
    const s = randomText();
    const r = P.parseCaptureText(s, NOW);
    assert(r.amount === null || (Number.isFinite(r.amount) && r.amount >= 0), `${JSON.stringify(s)} → ${r.amount}`);
  }
});
t('un plan nunca trae más de 6 pasos ni pasos sin resumen; la vista previa no produce NaN', () => {
  for (let i = 0; i < 3000; i++) {
    const s = Array.from({ length: 1 + Math.floor(rnd() * 4) }, () => `${pick(['transfiere', 'aporta', 'retira', 'registra'])} ${pick(['500', '90', '1,200', 'mil'])} ${pick(['de BBVA a Nu', 'a mi meta Viaje', 'de mi meta Viaje', 'de café en Morralla', 'de luz en BBVA'])}`).join(pick([' y ', '; ', ' luego ', ', ']));
    const o = planFromText(s, ctx);
    if (o.kind === 'plan') {
      assert(o.steps.length >= 2 && o.steps.length <= 6, `${o.steps.length} pasos en «${s}»`);
      assert(o.steps.every((x) => typeof x.summary === 'string' && x.summary.length > 0));
      const p = previewPlan(o.steps, ctx);
      for (const e of p.effects) assert(Number.isFinite(e.before) && Number.isFinite(e.after), `NaN en «${s}»`);
    }
  }
});

t('frases de P3 combinadas al azar: nunca lanzan y todo paso de un plan lleva resumen y argumentos', () => {
  const FR = ['recuérdame pagar la luz el 15', 'cada mes pago 199 de Spotify con BBVA', 'pausa Renta', 'ya pagué la renta', 'no pagué la renta', 'pospón la renta al 20', 'pagué 500 a Banorte desde BBVA', 'ya liquidé Banorte', 'me llegó un dividendo de 10 de FUNO11 en Nu',
    'mañana pago 300 de agua con BBVA', 'cada quincena me depositan 9000 en Nu', 'quita el aviso de predial', 'la renta subió a 9000', 'crea la cuenta Ahorro9 con 100', 'mi tarjeta Oro corta el 7 y paga el 27', 'cuándo pago mi tarjeta', 'aporta 50 a mi meta Viaje', 'transfiere 100 de BBVA a Nu'];
  for (let i = 0; i < 2500; i++) {
    const s = Array.from({ length: 1 + Math.floor(rnd() * 4) }, () => pick(FR)).join(pick([' y ', '; ', ' luego ', ', ']));
    const o = planFromText(s, ctx);
    if (o.kind === 'plan') {
      assert(o.steps.length >= 2 && o.steps.length <= 6, `${o.steps.length} pasos en «${s}»`);
      for (const st of o.steps) assert(st.summary && st.action.args && typeof st.action.type === 'string', `paso sin resumen en «${s}»`);
      const p = previewPlan(o.steps, ctx);
      for (const e of p.effects) assert(Number.isFinite(e.before) && Number.isFinite(e.after), `NaN en «${s}»`);
    }
  }
});

// ---- 3) rendimiento con textos largos y hostiles (cada llamada debe tardar poco) ----
const LIMIT_MS = 150;
const hostile = {
  'palabras repetidas (5,000)': 'de BBVA a '.repeat(500),
  'una sola palabra enorme': 'a'.repeat(20000),
  'dígitos enormes': '9'.repeat(5000),
  'preposiciones': 'de a de a de a '.repeat(600),
  '"y" encadenadas': 'transfiere 5 de BBVA a Nu y '.repeat(300),
  'comas': ', , , , '.repeat(1500),
  'espacios': ' '.repeat(20000),
  'fechas repetidas': 'el 15 de marzo y el 3 de oct y hace 3 días '.repeat(200),
  'horas repetidas': 'a las 5 pm a las 6 am a las 7:30 '.repeat(300),
  'meses': 'de enero de febrero de marzo '.repeat(500),
  'metas': 'meta Viaje meta Laptop meta Moto '.repeat(400),
  'acentos': 'á é í ó ú ñ '.repeat(2000),
  'saltos de línea': 'aporta 5 a mi meta Viaje\n'.repeat(500),
  // P3
  'cada mes repetido': 'cada mes pago 500 de renta '.repeat(300),
  'recuérdame repetido': 'recuérdame pagar la luz el 15 a las 9 '.repeat(250),
  'el N de cada mes': 'el 5 de cada mes el 6 de cada mes '.repeat(300),
  'ya pagué': 'ya pagué la renta, fueron 8100 '.repeat(250),
  'días antes': '3 días antes de 2 días antes de '.repeat(300),
  'cada cada': 'cada cada cada cada '.repeat(1000),
  'todos los': 'todos los lunes y martes y jueves y '.repeat(300),
  'dividendos': 'dividendo de FUNO11 en BBVA 12 '.repeat(300),
  'tarjeta corta paga': 'mi tarjeta Oro corta el 5 y paga el 25 '.repeat(250),
  'fecha límite': 'fecha de corte fecha límite de pago '.repeat(300),
};
for (const [name, text] of Object.entries(hostile)) {
  for (const [fn, f] of Object.entries({
    findDateMentions: (s) => D.findDateMentions(s, NOW), findTimeMentions: (s) => D.findTimeMentions(s), extractPeriod: (s) => D.extractPeriod(s, NOW),
    findRecurrence: (s) => findRecurrence(s, NOW), splitPlanSegments: (s) => splitPlanSegments(s), planFromText: (s) => planFromText(s, ctx), detectChatIntent: (s) => detectChatIntent(s, ctx, NOW), parseCaptureText: (s) => P.parseCaptureText(s, NOW),
  })) {
    t(`${fn} · ${name} (${text.length} car.) < ${LIMIT_MS} ms`, () => {
      const t0 = process.hrtime.bigint();
      f(text);
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      assert(ms < LIMIT_MS, `${ms.toFixed(0)} ms`);
    });
  }
}
console.log(`\nFuzz: ${ok} OK, ${fail} fallan`);
process.exit(fail ? 1 : 0);

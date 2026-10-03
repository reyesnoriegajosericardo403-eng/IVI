// Genera scripts/golden/golden-set.json (determinista: misma salida siempre).
//   node scripts/golden/build-golden.cjs
const fs = require('fs');
const path = require('path');
const LEX = require('./lexicon.cjs');
const H = require('./handwritten.cjs');

// ---- PRNG determinista ----
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260930);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

// ---- número -> palabras (independiente del parser) ----
const U = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const T = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const C = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
function words(n) {
  if (n < 30) return U[n];
  if (n < 100) return T[Math.floor(n / 10)] + (n % 10 ? ' y ' + U[n % 10] : '');
  if (n === 100) return 'cien';
  if (n < 1000) return C[Math.floor(n / 100)] + (n % 100 ? ' ' + words(n % 100) : '');
  const m = Math.floor(n / 1000);
  return (m === 1 ? 'mil' : words(m) + ' mil') + (n % 1000 ? ' ' + words(n % 1000) : '');
}

// rangos de monto realistas por categoría
const RANGE = {
  miscellaneous: [80, 2500], housing: [150, 9000], food: [20, 900], entertainment: [60, 1200], lifestyle: [100, 3000],
  health: [60, 1800], transport: [8, 1500], debt: [300, 6000], education: [30, 4000],
};
const USD_SUBS = new Set(['ent_streaming', 'misc_software', 'misc_cloud', 'edu_courses']);

const TEMPLATES = [
  (a, i) => `pagué ${a} de ${i}`,
  (a, i) => `gasté ${a} pesos en ${i}`,
  (a, i) => `${i} ${a} pesos`,
  (a, i) => `compré ${i} por ${a}`,
  (a, i) => `${a} de ${i}`,
  (a, i) => `me cobraron ${a} por ${i}`,
  (a, i) => `fui por ${i} y fueron ${a} pesos`,
  (a, i) => `${i}, ${a}`,
  (a, i) => `hoy pagué ${i} ${a}`,
  (a, i) => `se me fueron ${a} en ${i}`,
  (a, i) => `${i} ${a}`,
  (a, i) => `pagué ${i} que fueron ${a} pesos`,
];

function amountText(value, usd) {
  const cur = usd ? ' dólares' : '';
  const style = rnd();
  if (usd) return { text: `${value}${cur}`, value };
  if (style < 0.5) return { text: String(value), value };
  if (style < 0.62 && value >= 1000) return { text: '$' + value.toLocaleString('en-US'), value };
  if (style < 0.7) { const v = value + 0.5; return { text: String(v), value: v }; }
  if (style < 0.78 && value >= 100) { const v = Math.round(value / 5) * 5; return { text: `$${v}`, value: v }; }
  const v = Math.max(5, Math.round(value / 5) * 5);
  return { text: words(v) + (rnd() < 0.5 ? ' pesos' : ''), value: v };
}

// Frases donde DOS subcategorías son igual de razonables: se acepta cualquiera de las dos.
const AMBIG = {
  'pan dulce': ['food_supermarket'], bolillos: ['food_supermarket'], 'jugo de naranja': ['food_supermarket'],
  garrafón: ['food_supermarket'], 'agua de garrafón': ['food_supermarket'], 'comida corrida': ['food_fastfood'],
  pensión: ['sav_retirement'], tanda: ['debt_other'], regalo: ['life_celebration'], 'regalo de cumpleaños': ['life_celebration'],
  'regalo de boda': ['life_gifts'], 'cuota del club': ['house_maintenance'], 'recarga de celular': ['house_phone'],
  'un teclado': ['misc_electronics'], 'tienda naturista': ['health_supplements'], proteína: ['health_supplements'],
  'comida del día de las madres': ['food_restaurant'], 'cena de navidad': ['food_restaurant'], 'palomitas del cine': ['food_snacks'],
  'clase de crossfit': ['health_specialists'], 'terapia de pareja': ['life_self_improvement'],
  caseta: ['house_security'], 'caseta de vigilancia': ['trans_tolls'], 'mensualidad del gym': ['ent_subscriptions'],
  'suscripción mensual': ['misc_software', 'ent_streaming'], membresía: ['life_social_clubs'], suscripción: ['misc_software', 'ent_streaming'],
  hobbies: ['ent_other'], 'mi hobby': ['ent_other'], 'compras en liverpool': ['misc_clothing'],
  urgencias: ['health_hospital'], 'examen de certificación': ['edu_exams'], titulación: ['edu_exams'],
  'cosas en la tienda': ['food_supermarket'], 'un frappé': ['food_juice_bar'], 'chai latte': ['food_coffee'],
};
const PREFIX = { misc: 'miscellaneous', sav: 'savings', house: 'housing', food: 'food', ent: 'entertainment', life: 'lifestyle', health: 'health', inc: 'income', trans: 'transport', debt: 'debt', inv: 'investments', edu: 'education', transfer: 'transfer', tax: 'taxes_fees', fee: 'taxes_fees' };
const catOf = (sub) => PREFIX[sub.split('_')[0]];
const cases = [];
let n = 0;
function add(suite, text, expect, extra = {}) {
  n++;
  const id = `${suite}-${String(n).padStart(4, '0')}`;
  // 70% desarrollo (se puede mirar para mejorar), 30% reserva (solo para la nota final)
  const h = (n * 2654435761) >>> 0;
  cases.push({ id, suite, split: h % 10 < 7 ? 'dev' : 'holdout', text, expect, ...extra });
}

// A) clasificación de gastos por subcategoría
let k = 0;
// Etiquetas que cambiaron porque el catálogo ganó una subcategoría MÁS correcta (P1b): se corrige la
// etiqueta humana, no el resultado esperado del motor.
const RELABEL = { predial: ['taxes_fees', 'tax_property'] };
for (const [cat0, sub0, items] of LEX) {
  for (const item of items) {
    const [cat, sub] = RELABEL[item] || [cat0, sub0];
    const [lo, hi] = RANGE[cat] || RANGE[cat0];
    const usd = USD_SUBS.has(sub) && rnd() < 0.25;
    const raw = usd ? int(5, 120) : int(lo, hi);
    const a = amountText(raw, usd);
    const tpl = TEMPLATES[(k++ + int(0, 3)) % TEMPLATES.length];
    const exp = { type: 'expense', amount: a.value, currency: usd ? 'USD' : 'MXN', categoryId: cat, subcategoryId: sub, missing: [] };
    if (AMBIG[item]) { exp.altSubcategoryIds = AMBIG[item]; exp.altCategoryIds = AMBIG[item].map(catOf); }
    add('clasificacion', tpl(a.text, item).replace(/pesos pesos/, 'pesos'), exp);
  }
}

// B) tipos de movimiento
for (const [text, e] of H.TIPOS) add('tipos', text, { missing: [], ...e });

// C) "gas"
for (const [text, e] of H.GAS) {
  const amount = Number((text.match(/\d+/g) || []).slice(-1)[0]);
  const exp = { ...e, type: 'expense' };
  if (e.categoryId === null) exp.missing = ['category'];
  add('gas', text, exp);
}

// D) errores de dictado/tecleo
for (const [text, sub, opt = {}] of H.TYPOS) {
  const amount = Number(text.match(/\d+/g).slice(-1)[0]);
  const cat = catOf(sub);
  const exp = { type: 'expense', amount, categoryId: cat, subcategoryId: sub, missing: [] };
  if (opt.alt) { exp.altSubcategoryIds = opt.alt; exp.altCategoryIds = opt.alt.map(catOf); }
  add('typos', text, exp, opt.known ? { known: opt.known } : {});
}

// E) sin pista de categoría: hay que preguntar
for (const [text, amount] of H.SIN_CATEGORIA) {
  add('sin_categoria', text, { type: 'expense', amount, categoryId: null, subcategoryId: null, missing: ['category'] });
}

// F) formas de decir el monto
for (const [text, amount, cur] of H.MONTOS) add('monto', text, { amount, currency: cur || 'MXN' });

// G) varios números en la misma frase
for (const [text, amount, sub] of H.MULTI_NUMERO) {
  const cat = LEX.find(([, s]) => s === sub)[0];
  add('multi_numero', text, { amount, categoryId: cat, subcategoryId: sub });
}

// H) separar varios movimientos dictados de golpe
for (const [text, segs] of H.SEGMENTOS) add('segmentos', text, { segments: segs });

// I) ajuste de saldo de una cuenta
for (const [text, e] of H.AJUSTES) add('ajuste_cuenta', text, { adjustment: e });

// K) detector de conceptos (modalidades: repartido, deudas, recurrente, a plazos, deducible...)
for (const [text, tags] of require('./conceptos.cjs')) add('conceptos', text, { concepts: tags });

// J) frases NUEVAS e independientes (ver fresh.cjs): fresco_1 se usa para iterar, fresco_2 está SELLADO.
const F = require('./fresh.cjs');
function addFresh(suite, split, list) {
  for (const [text, amount, sub, opt = {}] of list) {
    n++;
    const exp = { amount, categoryId: sub ? catOf(sub) : null, subcategoryId: sub, missing: sub ? [] : ['category'] };
    if (opt.type) exp.type = opt.type; else exp.type = 'expense';
    if (opt.alt) { exp.altSubcategoryIds = opt.alt; exp.altCategoryIds = opt.alt.map(catOf); }
    cases.push({ id: `${suite}-${String(n).padStart(4, '0')}`, suite, split, text, expect: exp, ...(opt.known ? { known: opt.known } : {}) });
  }
}
addFresh('fresco_1', 'fresh1', F.FRESH1);
addFresh('fresco_2', 'sealed', F.FRESH2);
const F2 = require('./fresh2.cjs');
addFresh('fresco_3', 'fresh3', F2.FRESH3);
addFresh('fresco_4', 'sealed2', F2.FRESH4);
const F3 = require('./fresh3.cjs');
addFresh('fresco_5', 'sealed3', F3.FRESH5);

const out = path.join(__dirname, 'golden-set.json');
fs.writeFileSync(out, JSON.stringify({ version: 1, generated: '2026-10-03', cases }, null, 1) + '\n');
const by = {};
for (const c of cases) by[c.suite] = (by[c.suite] || 0) + 1;
console.log('casos:', cases.length, by, '| dev:', cases.filter((c) => c.split === 'dev').length, 'reserva:', cases.filter((c) => c.split === 'holdout').length, 'fresco1:', cases.filter((c) => c.split === 'fresh1').length, 'sellado:', cases.filter((c) => c.split === 'sealed').length, 'fresco3:', cases.filter((c) => c.split === 'fresh3').length, 'sellado2:', cases.filter((c) => c.split === 'sealed2').length, 'sellado3:', cases.filter((c) => c.split === 'sealed3').length);

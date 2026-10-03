// Revisa el catálogo: palabras repetidas entre subcategorías y palabras sueltas peligrosas.
require('./ts-hook.cjs');
const { DEFAULT_CATEGORIES } = require('../../src/data/categories.ts');
const { normalize } = require('../../src/ai/localParser.ts');
const NON_EXPENSE = new Set(['income', 'savings', 'investments']);
const map = new Map();
for (const c of DEFAULT_CATEGORIES) for (const s of c.subcategories) for (const k of s.keywords) {
  const n = normalize(k); const key = (NON_EXPENSE.has(c.id) ? c.id : 'expense') + '|' + n;
  if (!map.has(key)) map.set(key, []); map.get(key).push(s.id);
}
console.log('--- repetidas dentro del mismo tipo (gana la primera del catálogo) ---');
for (const [k, v] of map) if (v.length > 1) console.log(k.split('|')[1].padEnd(22), v.join(' | '));
const COMMON = new Set('el la los las un una unos unas de del y o con por para que se su mi tu al lo le les es en a ha no si ya mas muy hoy ayer algo todo toda cada esto eso esta este fue son era voy van dia dias mes año vez pago'.split(' '));
console.log('--- palabras comunes o muy cortas usadas como clave ---');
for (const c of DEFAULT_CATEGORIES) for (const s of c.subcategories) for (const k of s.keywords) {
  const n = normalize(k);
  if (n.length <= 3 || COMMON.has(n)) console.log(n.padEnd(10), s.id);
}

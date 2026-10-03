// Prueba de robustez (metamórfica): si a una frase del golden se le agrega ruido que NO cambia lo que se
// compró ("oye", "hoy", "con tarjeta", "en efectivo", "el otro día"...), la subcategoría debe seguir igual.
// Un cambio delata una palabra clave demasiado ambiciosa (se "roba" frases que no son suyas).
//   node scripts/golden/robustez.cjs [--show]
require('./ts-hook.cjs');
const P = require('../../src/ai/localParser.ts');
const { cases } = require('./golden-set.json');
const show = process.argv.includes('--show');
const base = cases.filter((c) => (c.suite === 'clasificacion' || c.suite.startsWith('fresco_')) && c.expect.type !== 'income' && !c.known && c.expect.subcategoryId && (c.expect.type || 'expense') === 'expense');
const NOISE = [
  ['prefijo "oye"', (t) => 'oye ' + t], ['prefijo "hoy"', (t) => 'hoy ' + t], ['prefijo "ahorita"', (t) => 'ahorita ' + t], ['sufijo "por favor"', (t) => t + ' por favor'], ['sufijo "ayer"', (t) => t + ' ayer'],
  ['sufijo "con tarjeta"', (t) => t + ' con tarjeta'], ['sufijo "en efectivo"', (t) => t + ' en efectivo'], ['sufijo "por transferencia"', (t) => t + ' por transferencia'], ['sufijo "con mi tarjeta de crédito"', (t) => t + ' con mi tarjeta de crédito'], ['sufijo "con la nu"', (t) => t + ' con la tarjeta nu'],
  ['sufijo "a meses sin intereses"', (t) => t + ' a meses sin intereses'], ['sufijo "el otro día"', (t) => t + ' el otro día'],
];
let tot = 0, bad = 0; const byNoise = {}; const examples = [];
for (const c of base) {
  const r0 = P.parseCaptureText(c.text);
  const ok0 = r0.subcategoryId === c.expect.subcategoryId || (c.expect.altSubcategoryIds || []).includes(r0.subcategoryId);
  if (!ok0) continue; // solo frases que ya pasan
  for (const [name, f] of NOISE) {
    tot++;
    const r = P.parseCaptureText(f(c.text));
    if (r.subcategoryId !== r0.subcategoryId) { bad++; byNoise[name] = (byNoise[name] || 0) + 1; if (examples.length < 40) examples.push(`${name}: «${f(c.text)}» → ${r.subcategoryId} (antes ${r0.subcategoryId})`); }
  }
}
console.log(`Pruebas: ${tot} · cambian de subcategoría: ${bad} (${(100 * bad / tot).toFixed(2)}%)`);
console.log(byNoise);
if (show) console.log(examples.join('\n'));
process.exitCode = bad ? 1 : 0;

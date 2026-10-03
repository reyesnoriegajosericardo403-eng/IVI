// Explica qué palabra clave decidió la categoría de una frase.  node scripts/golden/why.cjs "frase"
require('./ts-hook.cjs');
const { DEFAULT_CATEGORIES } = require('../../src/data/categories.ts');
const { normalize, parseCaptureText } = require('../../src/ai/localParser.ts');
const text = process.argv.slice(2).join(' ');
const n = ' ' + normalize(text) + ' ';
console.log(JSON.stringify(parseCaptureText(text)));
for (const c of DEFAULT_CATEGORIES) for (const s of c.subcategories) for (const k of s.keywords) {
  const nk = normalize(k);
  if (nk.length > 2 && n.includes(' ' + nk + ' ')) console.log(`  coincide: «${k}» → ${c.id}/${s.id}`);
}

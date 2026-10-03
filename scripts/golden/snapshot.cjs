// Foto de lo que responde el motor para TODAS las frases del golden set (sirve para comprobar que un
// refactor de rendimiento no cambia ninguna respuesta):  node snapshot.cjs > out.json
require('./ts-hook.cjs');
const P = require('../../src/ai/localParser.ts');
const { cases } = require('./golden-set.json');
const out = {};
for (const c of cases) if (!['segmentos', 'ajuste_cuenta'].includes(c.suite)) { const r = P.parseCaptureText(c.text); out[c.id] = [r.type, r.amount, r.currency, r.categoryId, r.subcategoryId, r.merchant ?? null, r.missing.join(',')]; }
console.log(JSON.stringify(out));

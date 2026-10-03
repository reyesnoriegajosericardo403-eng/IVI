// Mide cuánto tarda el motor por frase y cuánto pesa el catálogo.
//   node scripts/golden/bench.cjs
require('./ts-hook.cjs');
const P = require('../../src/ai/localParser.ts');
const { DEFAULT_CATEGORIES: D } = require('../../src/data/categories.ts');
const { cases } = require('./golden-set.json');
const texts = cases.filter((c) => c.suite === 'clasificacion' || c.suite.startsWith('fresco')).map((c) => c.text);
let kw = 0, bytes = 0; for (const c of D) for (const s of c.subcategories) { kw += s.keywords.length; for (const k of s.keywords) bytes += Buffer.byteLength(k) + 4; }
let t0 = process.hrtime.bigint(); P.parseCaptureText('café 50'); let t1 = process.hrtime.bigint();
const first = Number(t1 - t0) / 1e6;
for (let i = 0; i < 3; i++) for (const t of texts) P.parseCaptureText(t); // calentar
t0 = process.hrtime.bigint();
const N = 5; for (let i = 0; i < N; i++) for (const t of texts) P.parseCaptureText(t);
t1 = process.hrtime.bigint();
const per = Number(t1 - t0) / 1e6 / (N * texts.length);
// peor caso: texto sin coincidencias (recorre todo el índice + difuso)
const miss = 'zzxqv wkjh plmn qwerty asdfgh 123'; t0 = process.hrtime.bigint(); for (let i = 0; i < 200; i++) P.parseCaptureText(miss); t1 = process.hrtime.bigint();
const worst = Number(t1 - t0) / 1e6 / 200;
console.log(JSON.stringify({ palabrasClave: kw, kbCrudo: +(bytes / 1024).toFixed(1), primeraFrase_ms: +first.toFixed(1), porFrase_ms: +per.toFixed(3), peorCaso_ms: +worst.toFixed(3) }));

// Corre el golden set contra el motor local REAL (src/ai/localParser.ts).
//   node scripts/golden/run-golden.cjs [--split dev|holdout|all|fresh1|sealed|fresh3|sealed2|sealed3] [--suite nombre] [--fail] [--md]
require('./ts-hook.cjs');
const P = require('../../src/ai/localParser.ts');
const { cases } = require('./golden-set.json');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const split = opt('split', 'all');
const only = opt('suite', null);
const showFail = args.includes('--fail');
const md = args.includes('--md');

const GOLDEN_NOW = new Date(2026, 9, 3, 15, 30);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const norm = (s) => String(s).trim();

function evaluate(c) {
  const e = c.expect;
  if (c.suite === 'segmentos') {
    const got = P.splitCaptureSegments(c.text).map(norm);
    return { ok: eq(got, e.segments.map(norm)), got, fields: { segments: eq(got, e.segments.map(norm)) } };
  }
  if (c.suite === 'conceptos') {
    const got = [...require('../../src/ai/concepts.ts').detectConcepts(c.text)].sort();
    const want = [...e.concepts].sort();
    return { ok: eq(got, want), got, fields: { concepts: eq(got, want) } };
  }
  if (c.suite === 'ajuste_cuenta') {
    const got = P.detectAccountAdjustment(c.text);
    const want = e.adjustment;
    let ok;
    if (want === null) ok = got === null;
    else ok = !!got && got.direction === want.direction && P.normalize(got.accountNameHint).includes(P.normalize(want.hintContains));
    return { ok, got, fields: { adjustment: ok } };
  }
  // Los casos de fechas dependen de "hoy": el golden fija el día (sábado 2026-10-03) para que nunca cambie con el calendario.
  const r = P.parseCaptureText(c.text, GOLDEN_NOW);
  const fields = {};
  for (const k of Object.keys(e)) {
    if (k === 'altSubcategoryIds' || k === 'altCategoryIds') continue;
    if (k === 'subcategoryId' && e.altSubcategoryIds && e.altSubcategoryIds.includes(r.subcategoryId)) { fields[k] = true; continue; }
    if (k === 'categoryId' && e.altCategoryIds && e.altCategoryIds.includes(r.categoryId)) { fields[k] = true; continue; }
    if (k === 'missing') fields.missing = eq([...r.missing].sort(), [...e.missing].sort());
    else if (k === 'amount') fields.amount = r.amount === e.amount;
    else if (k === 'date') fields.date = (r.dateIso ?? null) === e.date;
    else if (k === 'futureDate') fields.futureDate = (r.futureDate ?? null) === e.futureDate;
    else fields[k] = r[k] === e[k];
  }
  return { ok: Object.values(fields).every(Boolean), got: r, fields };
}

const allRows = cases.filter((c) => ((split === 'all' && ['dev', 'holdout'].includes(c.split)) || c.split === split) && (!only || c.suite === only)).map((c) => ({ c, ...evaluate(c) }));
// "Límites conocidos": casos que NO se arreglan a propósito (se documentan y no cuentan en el %).
const knownRows = allRows.filter((r) => r.c.known);
const rows = allRows.filter((r) => !r.c.known);

const pct = (a, b) => (b ? (100 * a / b).toFixed(1) + '%' : '-');
const suites = [...new Set(rows.map((r) => r.c.suite))];
const lines = [];
const total = rows.length, passed = rows.filter((r) => r.ok).length;
lines.push(`Casos evaluados: ${total} (${split}${only ? ', ' + only : ''}) — pasan completos: ${passed} (${pct(passed, total)})`);
lines.push('');
lines.push('| Suite | Casos | Pasan | % |');
lines.push('|---|---:|---:|---:|');
for (const s of suites) {
  const rs = rows.filter((r) => r.c.suite === s);
  const ok = rs.filter((r) => r.ok).length;
  lines.push(`| ${s} | ${rs.length} | ${ok} | ${pct(ok, rs.length)} |`);
}
const cl = rows.filter((r) => r.c.suite === 'clasificacion');
if (cl.length) {
  lines.push('');
  lines.push(`Clasificación — subcategoría correcta: ${pct(cl.filter((r) => r.fields.subcategoryId).length, cl.length)} · categoría correcta: ${pct(cl.filter((r) => r.fields.categoryId).length, cl.length)} · monto correcto: ${pct(cl.filter((r) => r.fields.amount).length, cl.length)} · tipo: ${pct(cl.filter((r) => r.fields.type).length, cl.length)}`);
  const noCat = cl.filter((r) => r.got.categoryId === null).length;
  const wrong = cl.filter((r) => r.got.categoryId !== null && !r.fields.subcategoryId).length;
  lines.push(`Clasificación — sin respuesta (pregunta al usuario): ${pct(noCat, cl.length)} · respuesta equivocada con seguridad: ${pct(wrong, cl.length)}`);
}
if (knownRows.length) lines.push('', `Límites conocidos (no cuentan en el %): ${knownRows.length} — ` + knownRows.map((r) => `«${r.c.text}»${r.ok ? ' (ya pasa)' : ''}`).join(', '));
console.log(lines.join('\n'));

if (showFail) {
  console.log('\n--- FALLAS ---');
  for (const r of rows.filter((x) => !x.ok)) {
    const e = r.c.expect;
    let want, got;
    if (r.c.suite === 'segmentos') { want = JSON.stringify(e.segments); got = JSON.stringify(r.got); }
    else if (r.c.suite === 'conceptos') { want = JSON.stringify(e.concepts); got = JSON.stringify(r.got); }
    else if (r.c.suite === 'ajuste_cuenta') { want = JSON.stringify(e.adjustment); got = JSON.stringify(r.got); }
    else {
      const bad = Object.keys(r.fields).filter((k) => !r.fields[k]);
      want = bad.map((k) => `${k}=${e[k]}`).join(' ');
      got = bad.map((k) => `${k}=${k === 'missing' ? JSON.stringify(r.got.missing) : r.got[k]}`).join(' ');
    }
    console.log(`[${r.c.id}] «${r.c.text.replace(/\n/g, '⏎')}»\n    esperado: ${want}\n    obtenido: ${got}`);
  }
}
if (md) process.exitCode = 0;
// Puerta de calidad: `--min 100` hace que el comando falle (código 1) si pasa menos de ese %. Sirve para `npm test`/CI
// con el conjunto de regresión (`all`); los conjuntos sellados no se usan con puerta (se corren una sola vez).
const minIdx = process.argv.indexOf('--min');
if (minIdx > -1) {
  const min = Number(process.argv[minIdx + 1]);
  const pass = rows.filter((r) => r.ok).length;
  const real = (100 * pass) / Math.max(1, rows.length);
  if (real < min) { console.log(`\n✗ ${real.toFixed(1)}% < mínimo ${min}%`); process.exitCode = 1; }
}

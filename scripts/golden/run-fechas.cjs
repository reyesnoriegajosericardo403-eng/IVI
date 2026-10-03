// Corre los casos del módulo de fechas.   node scripts/golden/run-fechas.cjs [--sealed] [--fail]
//   (sin banderas: el conjunto DEV, con el que se construyó; con --sealed: el SELLADO, que se corre UNA sola vez)
require('./ts-hook.cjs');
const D = require('@/ai/dates');
const sealed = process.argv.includes('--sealed');
const showFail = process.argv.includes('--fail') || sealed;
const { DEV, TIMES, PERIODS } = sealed ? require('./fechas-sellado.cjs') : require('./fechas.cjs');
const NOW = '2026-10-03';
const at = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 15, 30); };

let ok = 0, bad = 0;
const fails = [];
for (const [text, want, opts = {}] of DEV) {
  const m = D.extractDate(text, at(opts.now || NOW), { prefer: opts.prefer || 'past' });
  const got = m ? m.iso : null;
  if (got === want) ok++; else { bad++; fails.push(`[fecha] «${text}» ${opts.prefer || 'past'}${opts.now ? ' now=' + opts.now : ''}\n    esperado: ${want}\n    obtenido: ${got}${m ? ' («' + m.text + '»)' : ''}`); }
}
for (const [text, want] of (TIMES || [])) {
  const m = D.extractTime(text);
  const got = m ? `${String(m.hour).padStart(2, '0')}:${String(m.minute).padStart(2, '0')}` : null;
  if (got === want) ok++; else { bad++; fails.push(`[hora] «${text}»\n    esperado: ${want}\n    obtenido: ${got}`); }
}
for (const [text, from, to, kind, opts = {}] of (PERIODS || [])) {
  const m = D.extractPeriod(text, at(NOW), { prefer: opts.prefer || 'auto' });
  const got = m ? `${m.from}..${m.to} ${m.kind}` : null;
  const want = from ? `${from}..${to} ${kind}` : null;
  if (got === want) ok++; else { bad++; fails.push(`[periodo] «${text}»\n    esperado: ${want}\n    obtenido: ${got}`); }
}
const total = ok + bad;
console.log(`${sealed ? 'SELLADO' : 'DEV'}: ${ok}/${total} (${(100 * ok / total).toFixed(1)}%)`);
if (showFail && fails.length) console.log('\n--- FALLAS ---\n' + fails.join('\n'));
process.exitCode = !sealed && bad ? 1 : 0;

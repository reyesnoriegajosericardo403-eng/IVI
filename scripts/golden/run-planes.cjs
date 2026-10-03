// Corre el conjunto SELLADO del planificador (una sola vez).   node scripts/golden/run-planes.cjs
require('./ts-hook.cjs');
const { planFromText, previewPlan } = require('@/ai/planner');
const CASES = require('./planes-sellado.cjs');
const NOW = '2026-10-03';
const base = { createdAt: 'x', updatedAt: 'x', version: 1 };
const acc = (id, name, type, balance, extra = {}) => ({ ...base, id, name, type, balance, currency: 'MXN', ...extra });
const ctx = {
  accounts: [acc('a1', 'BBVA', 'bank', 5000), acc('a2', 'Nu', 'savings', 1200), acc('a3', 'Morralla', 'cash', 300), acc('a4', 'Santander', 'bank', 800), acc('a5', 'Liverpool', 'credit_card', -2000, { isLiability: true })],
  goals: [
    { ...base, id: 'g1', name: 'Viaje', targetAmount: 20000, currentAmount: 3000, currency: 'MXN', targetDate: '2026-12-01' },
    { ...base, id: 'g2', name: 'Laptop', targetAmount: 30000, currentAmount: 500, currency: 'MXN' },
    { ...base, id: 'g3', name: 'Moto', targetAmount: 40000, currentAmount: 0, currency: 'MXN' },
  ],
  liabilities: [
    { ...base, id: 'l1', institution: 'Banorte', type: 'credit_card', balance: 8000, currency: 'MXN', dueDate: '2026-10-20' },
    { ...base, id: 'l2', institution: 'Coppel', type: 'personal_loan', balance: 3000, currency: 'MXN' },
    { ...base, id: 'l3', institution: 'Elektra', type: 'personal_loan', balance: 1500, currency: 'MXN' },
  ],
  templateBudgetLines: [], recentTransactions: [], primaryCurrency: 'MXN', today: NOW,
};
const localDay = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const argsOk = (got, want) => Object.entries(want).every(([k, v]) => {
  if (k === 'date') return v === 'yesterday' ? !!got.date && localDay(got.date) === '2026-10-02' : got.date === v;
  return got[k] === v;
});
function check(o, e) {
  if (e.kind === 'none') return o.kind === 'none';
  if (e.kind === 'single') return o.kind === 'single' && o.step.action.type === e.type && argsOk(o.step.action.args, e.args || {});
  if (e.kind === 'plan') return o.kind === 'plan' && JSON.stringify(o.steps.map((s) => s.action.type)) === JSON.stringify(e.types) && (e.args || []).every((a, i) => argsOk(o.steps[i].action.args, a));
  if (e.kind === 'clarification') return o.kind === 'clarification' && o.pending.missing[0].field === e.field;
  return o.kind === e.kind;
}
let ok = 0; const fails = []; const byKind = {};
for (const [text, e] of CASES) {
  const o = planFromText(text, ctx);
  const pass = check(o, e);
  const k = e.kind; byKind[k] = byKind[k] || [0, 0]; byKind[k][1]++;
  if (pass) { ok++; byKind[k][0]++; }
  else fails.push(`«${text}»\n    esperado: ${JSON.stringify(e)}\n    obtenido: ${o.kind}${o.kind === 'single' ? ' ' + o.step.action.type + ' ' + JSON.stringify(o.step.action.args) : o.kind === 'plan' ? ' [' + o.steps.map((s) => s.action.type).join(', ') + ']' : o.kind === 'clarification' ? ' ask ' + o.pending.missing[0].field : o.kind === 'reply' ? ' ' + o.reply.slice(0, 80) : ''}`);
}
console.log(`SELLADO planificador: ${ok}/${CASES.length} (${(100 * ok / CASES.length).toFixed(1)}%) · ` + Object.entries(byKind).map(([k, [a, b]]) => `${k} ${a}/${b}`).join(' · '));
if (fails.length) console.log('\n--- FALLAS ---\n' + fails.join('\n'));

// Revisa que NINGUNA subcategoría quede huérfana (sin concepto de presupuesto) salvo las marcadas
// excludedFromBudget a propósito, y que cada concepto/ingreso apunte a ids que existen.
require('./ts-hook.cjs');
const { DEFAULT_CATEGORIES: D } = require('../../src/data/categories.ts');
const B = require('../../src/data/budgetConcepts.ts');
const subs = new Map(); for (const c of D) for (const s of c.subcategories) subs.set(s.id, { cat: c.id, s });
let bad = 0;
const covered = new Set();
for (const k of [...B.BUDGET_CONCEPTS, ...B.INCOME_CONCEPTS]) for (const m of k.matches) {
  const cat = D.find((c) => c.id === m.categoryId);
  if (!cat) { console.log('concepto con categoría inexistente', k.id, m.categoryId); bad++; continue; }
  for (const id of m.subcategoryIds ?? cat.subcategories.map((s) => s.id)) {
    if (!subs.has(id)) { console.log('concepto con subcategoría inexistente', k.id, id); bad++; } else covered.add(id);
  }
}
for (const [id, { cat, s }] of subs) if (!covered.has(id) && !s.excludedFromBudget && cat !== 'transfer') { console.log('HUÉRFANA', id); bad++; }
const ids = [...subs.keys()]; const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
if (dup.length) { console.log('ids duplicados', dup); bad++; }
console.log(bad ? `PROBLEMAS: ${bad}` : `OK — ${D.length} categorías, ${subs.size} subcategorías, sin huérfanas`);
process.exitCode = bad ? 1 : 0;

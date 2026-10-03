require('./ts-hook.cjs');
const { DEFAULT_CATEGORIES } = require('../../src/data/categories.ts');
let total = 0;
for (const c of DEFAULT_CATEGORIES) {
  console.log(`\n## ${c.id} (${c.name})`);
  for (const s of c.subcategories) { total += s.keywords.length; console.log(`  ${s.id} [${s.name}] kw=${s.keywords.length}: ${s.keywords.slice(0,6).join(', ')}`); }
}
console.log('\nTOTAL keywords', total);

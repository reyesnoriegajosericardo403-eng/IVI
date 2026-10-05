// P4: ayuda contextual + auditoría de privacidad.
//   node scripts/golden/ayuda.cjs
// 1) La ayuda no promete lo que la app no hace: pantallas que existen, ejemplos de chat que el planificador entiende.
// 2) La auditoría de privacidad: todo destino externo y todo punto de red está inventariado; todas las tablas con datos
//    personales tienen seguridad por filas y se borran con la cuenta; el modo «ocultar nombres» oculta de verdad.
require('./ts-hook.cjs');
const Module = require('module');
const path = require('path');
const fs = require('fs');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === '@react-native-async-storage/async-storage') return path.join(__dirname, 'stub-async-storage.cjs');
  if (/^(expo|react-native|@expo)/.test(request)) return path.join(__dirname, 'stub-native.cjs');
  return origResolve.call(this, request, ...rest);
};
const assert = require('assert');
const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) { if (!['node_modules', 'dist', '.git'].includes(e.name)) walk(p, out); }
    else if (/\.(ts|tsx|js|cjs)$/.test(e.name)) out.push(p);
  }
  return out;
};

let ok = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); ok++; } catch (e) { fail++; console.log('  ✗', name, '\n     ', String(e.stack || e.message).split('\n').slice(0, 4).join('\n      ')); }
};

const { HELP_TOPICS, searchHelp, getHelpTopic } = require('@/help/helpTopics');
const { DATA_FLOWS, ALL_HOSTS } = require('@/help/dataFlows');
const { planFromText } = require('@/ai/planner');

// ---------- Ayuda ----------
t('ids de ayuda únicos y con contenido', () => {
  const ids = HELP_TOPICS.map((x) => x.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  for (const x of HELP_TOPICS) {
    assert(x.title && x.summary && x.steps.length >= 2, x.id);
    assert(x.keywords.length >= 2, `${x.id} sin palabras clave`);
  }
});
t('cada tema apunta a una pantalla que existe', () => {
  for (const x of HELP_TOPICS) assert(fs.existsSync(path.join(root, x.route)), `${x.id}: no existe ${x.route}`);
});
t('cada ayuda usada en una pantalla existe, y cada tema se usa en alguna', () => {
  const files = [...walk('app'), ...walk('src/components')];
  const used = new Set();
  for (const f of files) {
    const s = read(f);
    for (const m of s.matchAll(/<HelpButton topic="([^"]+)"/g)) used.add(m[1]);
    for (const m of s.matchAll(/<ScreenHeader help="([^"]+)"/g)) used.add(m[1]);
  }
  const ids = new Set(HELP_TOPICS.map((x) => x.id));
  for (const u of used) assert(ids.has(u), `la pantalla usa el tema inexistente «${u}»`);
  // inicio y captura no llevan botón propio (Inicio no tiene cabecera común; Captura es pantalla completa): se alcanzan desde /ayuda
  for (const id of ids) if (!['inicio', 'captura'].includes(id)) assert(used.has(id), `el tema «${id}» no aparece en ninguna pantalla`);
});
t('el menú de cuenta enlaza a /ayuda y existe app/ayuda.tsx', () => {
  assert(/go\('\/ayuda'\)/.test(read('src/components/AccountDropdown.tsx')));
  assert(fs.existsSync(path.join(root, 'app/ayuda.tsx')));
});
t('la búsqueda encuentra por palabra clave y sin acentos', () => {
  assert(searchHelp('tarjeta').some((x) => x.id === 'tarjetas'));
  assert(searchHelp('NOTIFICACION').some((x) => x.id === 'notificaciones'));
  assert.strictEqual(searchHelp('zzzxxqq').length, 0);
  assert.strictEqual(searchHelp('').length, HELP_TOPICS.length);
  assert.strictEqual(getHelpTopic('chat').id, 'chat');
});

const meta = (id) => ({ id, createdAt: 'x', updatedAt: 'x' });
const acc = (id, name, type, balance, extra = {}) => ({ ...meta(id), name, type, currency: 'MXN', balance, ...extra });
const ctx = () => ({
  accounts: [acc('a-bbva', 'BBVA', 'bank', 10000), acc('a-cash', 'Efectivo', 'cash', 300), acc('a-tc', 'Tarjeta Oro', 'credit_card', 3000, { isLiability: true })],
  goals: [{ ...meta('g-viaje'), name: 'Viaje', targetAmount: 20000, currentAmount: 3500, currency: 'MXN' }, { ...meta('g-laptop'), name: 'Laptop', targetAmount: 30000, currentAmount: 0, currency: 'MXN' }],
  liabilities: [{ ...meta('l-coppel'), institution: 'Coppel', type: 'personal_loan', balance: 3000, currency: 'MXN' }],
  investments: [{ ...meta('i-funo'), ticker: 'FUNO11', name: 'FUNO', assetClass: 'fibra', quantity: 10, avgCostPrice: 20, currency: 'MXN', amountInvested: 200, purchaseDate: '2026-01-01' }],
  forecasts: [{ ...meta('f-renta'), type: 'expense', amount: 8000, currency: 'MXN', categoryId: 'housing', subcategoryId: 'house_rent', merchant: 'Renta', accountId: 'a-bbva', date: '2026-10-03T18:00:00.000Z', status: 'forecast', recurringRuleId: 'r-renta', origin: 'automatic' }],
  recurringRules: [
    { ...meta('r-gym'), kind: 'transaction', name: 'Gimnasio', status: 'active', recurrence: { frequency: 'monthly', interval: 1, startDate: '2026-10-20', dayOfMonth: 20 }, amount: 500, currency: 'MXN', txType: 'expense', accountId: 'a-bbva' },
  ],
  reminders: [{ ...meta('rem-predial'), kind: 'custom', title: 'Pagar predial', date: '2026-10-20', timeOfDay: '09:00', advanceDays: [], maxAttempts: 1, attemptIntervalMinutes: 120, push: true, status: 'active' }],
  templateBudgetLines: [], recentTransactions: [], primaryCurrency: 'MXN', today: '2026-10-04',
});
t('los ejemplos de chat «acción» de la ayuda se entienden', () => {
  for (const topic of HELP_TOPICS) {
    for (const ex of topic.examples ?? []) {
      if (ex.kind !== 'accion') continue;
      const o = planFromText(ex.text, ctx());
      assert(['single', 'plan', 'clarification'].includes(o.kind), `«${ex.text}» (${topic.id}) → ${o.kind}`);
    }
  }
});

// ---------- Privacidad: destinos externos ----------
const extra = new Set(['supabase.co', 'localhost']);
t('ai-relay solo permite destinos inventariados', () => {
  const hosts = [...read('supabase/functions/ai-relay/index.ts').matchAll(/'([a-z0-9.-]+\.[a-z]+)',/g)].map((m) => m[1]).filter((h) => h.includes('.'));
  assert(hosts.length >= 4);
  for (const h of hosts) assert(ALL_HOSTS.includes(h), `ai-relay permite ${h} y no está en dataFlows`);
});
t('market-data solo llama a destinos inventariados', () => {
  const s = read('supabase/functions/market-data/index.ts');
  const hosts = [...s.matchAll(/fetch\(\s*[`'"]https:\/\/([a-z0-9.-]+)/g)].map((m) => m[1]);
  assert(hosts.length >= 3, 'no se encontraron las llamadas');
  for (const h of hosts) assert(ALL_HOSTS.includes(h), `market-data llama a ${h} y no está en dataFlows`);
});
t('los clientes de IA solo apuntan a destinos inventariados', () => {
  for (const f of fs.readdirSync(path.join(root, 'src/providers/llm/clients'))) {
    const s = read(`src/providers/llm/clients/${f}`);
    for (const m of s.matchAll(/https:\/\/([a-z0-9.-]+)/g)) assert(ALL_HOSTS.includes(m[1]), `${f} apunta a ${m[1]}`);
  }
});
t('todo punto de red del código está auditado (una llamada nueva obliga a revisar la privacidad)', () => {
  const AUDITED = new Set([
    'public/sw.js', // solo mismo origen (caché de la app)
    'src/providers/llm/relayFetch.ts', // IA propia → relevo/proveedor
    'src/providers/market/relayMarketDataProvider.ts', // símbolos → market-data
    'src/providers/notifications/webPushNotificationProvider.ts', // suscripción push → push-notify
    'src/services/auth/deleteAccount.ts', // borrar cuenta
    'src/services/supabase/profileRepository.ts', // perfil → tu Supabase
    'supabase/functions/_shared/webpush.ts', // entrega a Apple/Google/Mozilla
    'supabase/functions/ai-relay/index.ts',
    'supabase/functions/delete-account/index.ts',
    'supabase/functions/market-data/index.ts',
    'supabase/functions/push-notify/index.ts',
  ]);
  const found = [];
  for (const f of [...walk('src'), ...walk('app'), ...walk('supabase/functions'), 'public/sw.js']) {
    if (/(^|[^.\w])fetch\(|XMLHttpRequest|navigator\.sendBeacon|new WebSocket\(/.test(read(f))) found.push(f);
  }
  for (const f of found) assert(AUDITED.has(f), `punto de red nuevo sin auditar: ${f}. Agrégalo a src/help/dataFlows.ts y a esta lista.`);
});
t('no hay analítica ni rastreadores de terceros', () => {
  const pkg = JSON.parse(read('package.json'));
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join(' ');
  assert(!/analytics|sentry|mixpanel|amplitude|segment|posthog|firebase|appsflyer|adjust|bugsnag|datadog|facebook|admob/i.test(deps), deps.match(/\S*(analytics|sentry|mixpanel|amplitude|segment|posthog|firebase)\S*/i)?.[0]);
  const html = fs.existsSync(path.join(root, 'public/index.html')) ? read('public/index.html') : '';
  assert(!/googletagmanager|google-analytics|connect\.facebook|hotjar|clarity\.ms/i.test(html));
});

// ---------- Privacidad: base de datos ----------
t('toda tabla con datos de la persona tiene RLS y se borra en cascada con la cuenta', () => {
  const EXEMPT = { ui_themes: 'catálogo compartido de estilos, solo lectura' };
  const dir = path.join(root, 'supabase/migrations');
  let tables = 0;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql'))) {
    const s = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of s.matchAll(/create table (?:if not exists )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\n\);/gi)) {
      const [, name, body] = m;
      tables++;
      assert(new RegExp(`alter table (?:public\\.)?${name} enable row level security`, 'i').test(s), `${name} sin RLS`);
      if (EXEMPT[name]) continue;
      assert(/references auth\.users[^,]*on delete cascade/i.test(body), `${name} no se borra con la cuenta`);
    }
  }
  assert(tables >= 20, `solo se vieron ${tables} tablas`);
});

// ---------- Privacidad: exportar y ocultar nombres ----------
t('«Exportar mis datos» incluye todas las entidades guardadas', () => {
  const s = read('src/utils/exportData.ts');
  for (const k of ['accounts', 'transactions', 'budgets', 'goals', 'investments', 'liabilities', 'recurringRules', 'reminders', 'reminderOccurrences', 'customCategoryMappings', 'conversations', 'chatMessages', 'templateBudgetLines', 'budgetAssignments', 'periodBudgetOverrides', 'budgetTemplates', 'netWorthHistory', 'auditLog']) {
    assert(new RegExp(`state\\.${k}\\b`).test(s), `la exportación omite ${k}`);
  }
});
t('«ocultar nombres a mi IA» oculta contraparte, comercio y personas; sin él, no cambia nada', () => {
  const { buildFinancialContextSummary, buildActionContextSummary } = require('@/providers/llm/financialContext');
  const c = {
    ...ctx(),
    profile: { primaryCurrency: 'MXN', budgetThresholds: { warn: 0.8, critical: 1 } },
    budgets: [], transactions: [{ ...meta('t1'), type: 'expense', amount: 90, currency: 'MXN', categoryId: 'food', merchant: 'Tacos Doña Lupe', date: '2026-10-01T00:00:00.000Z', accountId: 'a-cash', status: 'posted' }],
    liabilities: [
      { ...meta('l1'), institution: 'Juan Pérez', type: 'other', direction: 'owed_to_me', counterparty: 'Juan Pérez', balance: 800, currency: 'MXN' },
      { ...meta('l2'), institution: 'Coppel', type: 'personal_loan', balance: 3000, currency: 'MXN' },
    ],
  };
  const hidden = JSON.stringify(buildFinancialContextSummary(c, true)) + JSON.stringify(buildActionContextSummary(c, true));
  assert(!/Juan|Lupe/.test(hidden), 'se coló un nombre');
  assert(/Coppel/.test(hidden), 'las instituciones financieras no deben ocultarse');
  const shown = JSON.stringify(buildFinancialContextSummary(c, false));
  assert(/Juan Pérez/.test(shown) && /Tacos Doña Lupe/.test(shown));
});
t('el resumen que ve la IA no incluye notas ni texto libre', () => {
  const s = read('src/providers/llm/financialContext.ts');
  assert(!/\.notes\b/.test(s), 'financialContext no debe leer notes');
});

t('dispositivo compartido: otra cuenta borra los datos locales; la misma o el modo local los conserva/adopta', () => {
  const { decideOwner } = require('@/services/auth/dataOwner');
  assert.strictEqual(decideOwner(null, 'u1'), 'adopt');
  assert.strictEqual(decideOwner('u1', 'u1'), 'keep');
  assert.strictEqual(decideOwner('u1', 'u2'), 'wipe');
  const layout = read('app/_layout.tsx');
  assert(layout.indexOf('useDataOwnerGuard(userId)') < layout.indexOf('useSyncEngine()'), 'la guarda debe ir antes de sincronizar');
});

t('cerrar sesión da de baja los avisos de este teléfono antes de cerrar la sesión', () => {
  const s = read('src/services/auth/actions.ts');
  const i = s.indexOf('export async function signOut');
  const body = s.slice(i, i + 300);
  assert(body.indexOf('unsubscribeThisDevice()') > 0 && body.indexOf('unsubscribeThisDevice()') < body.indexOf('auth.signOut()'));
});

console.log(`Ayuda y privacidad: ${ok} OK, ${fail} fallan`);
process.exit(fail ? 1 : 0);

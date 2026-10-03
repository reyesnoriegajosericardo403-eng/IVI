// Pruebas de la capa PERSONAL del catálogo: el mapeo "palabra → categoría" que cada persona le enseña a VALU y que
// ahora viaja con su cuenta (tabla category_mappings, migración 0022). Usa el store REAL y el SyncEngine REAL con
// un servidor falso: lo que se prueba es la lógica de mezcla, de cola y de tolerancia a que la tabla aún no exista.
//   node scripts/golden/sync-mapeo.cjs [--show]
require('./ts-hook.cjs');
const Module = require('module');
const path = require('path');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === '@react-native-async-storage/async-storage') return path.join(__dirname, 'stub-async-storage.cjs');
  if (/^(expo|react-native|@expo)/.test(request)) return path.join(__dirname, 'stub-native.cjs');
  return origResolve.call(this, request, ...rest);
};
const assert = require('assert');

// ---- servidor falso (cliente de Supabase y repositorios) ----
const server = { failMappings: 'missing-table', mappings: new Map(), upserts: [], otherPulls: 0 };
const mockModule = (request, exports) => {
  const file = Module._resolveFilename(request, module);
  require.cache[file] = { id: file, filename: file, loaded: true, exports, children: [], paths: [] };
};
mockModule('@/services/supabase/client', {
  isSupabaseConfigured: true,
  supabaseProjectUrl: 'http://fake',
  supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: 'user-1' }, access_token: 't' } } }) } },
});
mockModule('@/services/supabase/profileRepository', { pushRemoteProfile: async () => {}, pushRemoteProfileKeepalive: () => {} });
const plainRepo = (name) => ({ list: async () => { server.otherPulls++; return []; }, upsert: async (_u, r) => { server.upserts.push([name, r.id]); } });
const tables = ['accounts', 'transactions', 'budgets', 'budget_templates', 'template_budget_lines', 'budget_assignments', 'period_budget_overrides', 'goals', 'investments', 'liabilities', 'net_worth_snapshots', 'audit_log'];
const repositoryByTable = Object.fromEntries(tables.map((t) => [t, plainRepo(t)]));
repositoryByTable.category_mappings = {
  list: async () => {
    if (server.failMappings) throw new Error('Could not find the table public.category_mappings');
    return [...server.mappings.values()];
  },
  upsert: async (_u, r) => {
    if (server.failMappings) throw new Error('Could not find the table public.category_mappings');
    server.mappings.set(r.keyword, { ...r, updatedAt: new Date(Date.now() + 1000).toISOString() });
  },
};
mockModule('@/services/supabase/repositories', { repositoryByTable });

const { useAppStore, mergeRemoteMappings } = require('@/store/useAppStore');
const { runSync } = require('@/services/sync/SyncEngine');
const { categoryMappingToRow, categoryMappingFromRow } = require('@/services/supabase/mappers');
const S = () => useAppStore.getState();

let ok = 0, fail = 0;
const t = async (name, fn) => {
  try { await fn(); ok++; if (process.argv.includes('--show')) console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name, '\n     ', e.stack.split('\n').slice(0, 3).join('\n      ')); }
};
const queued = (table) => S().pendingSync.filter((e) => e.table === table);
const rec = (kw, cat, sub, updatedAt, deletedAt) => ({ id: kw, keyword: kw, categoryId: cat, subcategoryId: sub, createdAt: updatedAt, updatedAt, deletedAt });

(async () => {
  // ---------- mezcla (pura) ----------
  await t('mezcla: una palabra nueva de la nube entra', () => {
    const r = mergeRemoteMappings({}, [rec('lupita', 'lifestyle', 'life_family_support', '2026-10-03T10:00:00Z')]);
    assert.deepStrictEqual(Object.keys(r), ['lupita']);
    assert.strictEqual(r.lupita.subcategoryId, 'life_family_support');
  });
  await t('mezcla: gana la corrección más reciente', () => {
    const local = { lupita: { categoryId: 'food', subcategoryId: 'food_restaurant', updatedAt: '2026-10-03T12:00:00Z' } };
    const older = mergeRemoteMappings(local, [rec('lupita', 'x', 'y', '2026-10-03T10:00:00Z')]);
    assert.strictEqual(older.lupita.subcategoryId, 'food_restaurant');
    const newer = mergeRemoteMappings(local, [rec('lupita', 'x', 'y', '2026-10-03T13:00:00Z')]);
    assert.strictEqual(newer.lupita.subcategoryId, 'y');
  });
  await t('mezcla: un borrado de la nube quita la palabra local', () => {
    const local = { lupita: { categoryId: 'a', subcategoryId: 'b', updatedAt: '2026-10-03T10:00:00Z' } };
    assert.deepStrictEqual(mergeRemoteMappings(local, [rec('lupita', 'a', 'b', '2026-10-03T11:00:00Z', '2026-10-03T11:00:00Z')]), {});
  });
  await t('mezcla: un borrado VIEJO no quita lo que se volvió a aprender después', () => {
    const local = { lupita: { categoryId: 'a', subcategoryId: 'b', updatedAt: '2026-10-03T12:00:00Z' } };
    const r = mergeRemoteMappings(local, [rec('lupita', 'a', 'b', '2026-10-03T11:00:00Z', '2026-10-03T11:00:00Z')]);
    assert.strictEqual(r.lupita.subcategoryId, 'b');
  });
  await t('mezcla: no muta el objeto original', () => {
    const local = { a: { categoryId: 'x', subcategoryId: 'y', updatedAt: '2026-01-01T00:00:00Z' } };
    const copy = JSON.stringify(local);
    mergeRemoteMappings(local, [rec('a', 'p', 'q', '2027-01-01T00:00:00Z'), rec('b', 'p', 'q', '2027-01-01T00:00:00Z')]);
    assert.strictEqual(JSON.stringify(local), copy);
  });
  await t('mappers: fila ↔ registro sin pérdida', () => {
    const r = rec('lupita', 'lifestyle', 'life_family_support', '2026-10-03T10:00:00Z');
    const row = categoryMappingToRow('user-1', r);
    assert.deepStrictEqual({ u: row.user_id, k: row.keyword, c: row.category_id, s: row.subcategory_id, d: row.deleted_at }, { u: 'user-1', k: 'lupita', c: 'lifestyle', s: 'life_family_support', d: null });
    const back = categoryMappingFromRow({ ...row, updated_at: r.updatedAt });
    assert.deepStrictEqual({ ...back, deletedAt: undefined }, { ...r, deletedAt: undefined });
  });

  // ---------- store: cola de sincronización ----------
  S().resetAll();
  await t('aprender una palabra la encola para subir (llave = la palabra)', () => {
    S().learnCategoryMapping('pagué la despensa de lupita 300', 'lifestyle', 'life_family_support');
    const q = queued('category_mappings');
    assert(q.length >= 2, `cola=${q.length}`);
    for (const e of q) {
      assert.strictEqual(e.op, 'upsert');
      assert.strictEqual(e.recordId, e.payload.keyword);
      assert.strictEqual(e.payload.subcategoryId, 'life_family_support');
      assert.strictEqual(e.payload.deletedAt, undefined);
    }
    assert(q.some((e) => e.recordId === 'lupita'));
  });
  await t('volver a aprender la misma palabra conserva createdAt', () => {
    const before = S().customCategoryMappings.lupita.createdAt;
    S().learnCategoryMapping('más cosas de lupita', 'food', 'food_supermarket');
    assert.strictEqual(S().customCategoryMappings.lupita.createdAt, before);
    assert.strictEqual(S().customCategoryMappings.lupita.subcategoryId, 'food_supermarket');
  });
  await t('el tope de palabras olvida las más viejas Y las marca borradas para la nube', () => {
    S().resetAll();
    for (let i = 0; i < 60; i++) S().learnCategoryMapping(`palabra${String(i).padStart(2, '0')}x gasto`, 'food', 'food_supermarket');
    assert(Object.keys(S().customCategoryMappings).length <= 50);
    const tombs = queued('category_mappings').filter((e) => e.op === 'delete');
    assert(tombs.length >= 10, `tombstones=${tombs.length}`);
    assert(tombs.every((e) => e.payload.deletedAt));
  });
  await t('"olvidar lo aprendido" encola un borrado por cada palabra', () => {
    S().resetAll();
    S().learnCategoryMapping('doña lupita despensa', 'food', 'food_supermarket');
    const n = Object.keys(S().customCategoryMappings).length;
    useAppStore.setState({ pendingSync: [] });
    S().clearCustomCategoryMappings();
    assert.deepStrictEqual(S().customCategoryMappings, {});
    const q = queued('category_mappings');
    assert.strictEqual(q.length, n);
    assert(q.every((e) => e.op === 'delete' && e.payload.deletedAt));
  });
  await t('las palabras de ANTES de la sincronización se encolan una sola vez', () => {
    S().resetAll();
    useAppStore.setState({ customMappingsSeeded: false, pendingSync: [], customCategoryMappings: { vieja: { categoryId: 'food', subcategoryId: 'food_supermarket', updatedAt: '2026-01-01T00:00:00Z' } } });
    S().seedMappingSync();
    assert.strictEqual(queued('category_mappings').length, 1);
    assert.strictEqual(queued('category_mappings')[0].payload.createdAt, '2026-01-01T00:00:00Z');
    S().seedMappingSync();
    assert.strictEqual(queued('category_mappings').length, 1);
  });
  await t('mergeRemoteRecords del store aplica la mezcla', () => {
    S().resetAll();
    S().mergeRemoteRecords('category_mappings', [rec('nuevo', 'food', 'food_supermarket', '2026-10-03T10:00:00Z')]);
    assert.strictEqual(S().customCategoryMappings.nuevo.subcategoryId, 'food_supermarket');
  });

  // ---------- motor de sincronización con servidor falso ----------
  await t('SIN la tabla en Supabase: lo demás se sincroniza igual y NO hay error', async () => {
    S().resetAll();
    useAppStore.setState({ pendingSync: [], lastSyncedAt: null });
    S().learnCategoryMapping('despensa lupita', 'food', 'food_supermarket');
    S().addAccount({ name: 'BBVA', type: 'bank', currency: 'MXN', balance: 100 }); // otra tabla, para ver que sí sube
    const before = queued('category_mappings').length;
    assert(before > 0);
    server.otherPulls = 0; server.upserts.length = 0;
    const r = await runSync();
    assert.strictEqual(r.error, undefined);
    assert.strictEqual(r.pushFailed, 0);
    assert(server.upserts.some(([name]) => name === 'accounts'), 'la cuenta debió subir');
    assert.strictEqual(server.otherPulls, tables.length, 'se debieron traer todas las demás tablas');
    assert.notStrictEqual(S().lastSyncedAt, null, 'lastSyncedAt debe avanzar');
    assert.strictEqual(queued('category_mappings').length, before, 'las palabras se quedan en la cola esperando la migración');
    assert.strictEqual(queued('accounts').length, 0);
  });
  await t('CON la tabla: sube las palabras, vacía la cola y las trae de vuelta', async () => {
    server.failMappings = null;
    const r = await runSync();
    assert.strictEqual(r.error, undefined);
    assert.strictEqual(queued('category_mappings').length, 0);
    assert(server.mappings.has('despensa') || server.mappings.has('lupita'), [...server.mappings.keys()].join(','));
  });
  await t('otro dispositivo: una palabra que aprendió aparece aquí tras sincronizar', async () => {
    server.mappings.set('uber', { ...rec('uber', 'transport', 'trans_didi', '2099-01-01T00:00:00Z') });
    await runSync();
    assert.strictEqual(S().customCategoryMappings.uber.subcategoryId, 'trans_didi');
  });
  await t('olvidar en este dispositivo llega a la nube', async () => {
    S().clearCustomCategoryMappings();
    await runSync();
    assert([...server.mappings.values()].every((m) => m.deletedAt), 'todas deben quedar marcadas como borradas');
  });
  await t('un fallo de red en la tabla opcional no frena los demás pulls', async () => {
    server.failMappings = 'network';
    server.otherPulls = 0;
    const r = await runSync();
    assert.strictEqual(r.error, undefined);
    assert.strictEqual(server.otherPulls, tables.length);
  });

  console.log(`\nMapeo personal: ${ok} OK, ${fail} fallan`);
  process.exit(fail ? 1 : 0);
})();

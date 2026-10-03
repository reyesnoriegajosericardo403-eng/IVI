// Pruebas del "túnel" del catálogo (src/data/catalogLoader.ts, categories.installKeywordPacks).
//   node scripts/golden/catalogo.cjs
// Siempre arranca con SOLO el núcleo (CATALOG=core) y va instalando el vocabulario como lo hace la app.
process.env.CATALOG = 'core';
require('./ts-hook.cjs');
const assert = require('assert');
const cat = require('@/data/categories');
const parser = require('@/ai/localParser');
const loader = require('@/data/catalogLoader');
const ext = require('@/data/keywordPacks/extended');

const count = () => cat.DEFAULT_CATEGORIES.reduce((n, c) => n + c.subcategories.reduce((m, s) => m + s.keywords.length, 0), 0);
const sub = (t) => parser.parseCaptureText(t).subcategoryId;
let ok = 0;
const check = (name, fn) => { fn(); ok++; console.log('  ✓', name); };

(async () => {
  const coreWords = count();
  const rev0 = cat.getCatalogRevision();
  check('arranca solo con el núcleo', () => {
    assert.strictEqual(loader.getCatalogStatus(), 'core');
    assert.strictEqual(cat.getInstalledCatalogVersion(), 'core');
    assert(coreWords < 8000, `núcleo=${coreWords}`);
  });
  check('con el núcleo ya clasifica lo cotidiano', () => assert.strictEqual(sub('tacos 120'), 'food_fastfood'));
  const before = sub('pagamos a medias el airbnb y a mí me tocaron 1900');

  // idempotencia y versión desconocida
  check('un id de subcategoría que la app no conoce se ignora (paquete más nuevo que la app)', () => {
    const r = cat.installKeywordPacks([{ sub_que_no_existe: ['hola mundo', 'otra'], food_fastfood: ['tacos de prueba xyz'] }], 'prueba.1');
    assert.deepStrictEqual(r, { added: 1, ignored: 2 });
    assert.strictEqual(cat.getCatalogRevision(), rev0 + 1);
  });
  check('instalar dos veces la misma versión no cambia nada', () => {
    const r = cat.installKeywordPacks([{ food_fastfood: ['otra mas'] }], 'prueba.1');
    assert.deepStrictEqual(r, { added: 0, ignored: 0 });
  });
  check('una palabra nueva se entiende de inmediato (el índice se reconstruye solo)', () => assert.strictEqual(sub('tacos de prueba xyz 90'), 'food_fastfood'));

  // carga real del ampliado
  const states = [];
  const off = loader.onCatalogStatus((s) => states.push(s));
  const p1 = loader.loadExtendedCatalog();
  const p2 = loader.loadExtendedCatalog();
  check('llamar dos veces mientras carga comparte la misma carga', () => assert.strictEqual(p1, p2));
  assert.strictEqual(await loader.whenCatalogReady(5000), true);
  off();
  check('estados: loading → ready', () => assert.deepStrictEqual(states, ['loading', 'ready']));
  check('el vocabulario completo quedó instalado', () => {
    assert.strictEqual(cat.getInstalledCatalogVersion(), ext.CATALOG_VERSION);
    assert(count() > 15000, `palabras=${count()}`);
  });
  check('ya entiende temas del ampliado (roomies, trámites)', () => {
    assert.strictEqual(sub('le pagué a mi roomie los 350 de la parte del internet'), 'house_internet');
    assert.strictEqual(sub('pagué la tenencia vehicular de este año 1250'), 'tax_vehicle');
  });
  check('cargar de nuevo ya listo no hace nada', () => assert.strictEqual(loader.getCatalogStatus(), 'ready'));
  console.log(`\n${ok} comprobaciones OK (frase de roomies con solo el núcleo: ${before})`);
})().catch((e) => { console.error('FALLÓ:', e.message); process.exit(1); });

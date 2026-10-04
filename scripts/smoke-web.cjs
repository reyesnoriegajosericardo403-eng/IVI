// Prueba de humo de la versión web en un navegador REAL (Chromium con Playwright): sirve una exportación, siembra
// datos de ejemplo y visita todas las pantallas buscando errores de JavaScript o pantallas en blanco.
//   npx expo export -p web --output-dir /tmp/web && node scripts/smoke-web.cjs /tmp/web
// Requiere Playwright (npx playwright install chromium) o el que ya trae el entorno de Claude Code.
const http = require('http');
const fs = require('fs');
const path = require('path');

let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const ROOT = process.argv[2];
if (!ROOT) { console.error('Uso: node scripts/smoke-web.cjs <carpeta exportada>'); process.exit(2); }
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(ROOT, 'index.html');
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const now = new Date().toISOString();
const meta = { createdAt: now, updatedAt: now, version: 1 };
const state = {
  profile: { name: 'Prueba', primaryCurrency: 'MXN', onboardingComplete: true, themePreference: 'light', budgetThresholds: { attention: 70, warning: 90, exceeded: 100 } },
  accounts: [
    { ...meta, id: '11111111-1111-4111-8111-111111111111', name: 'BBVA', type: 'bank', currency: 'MXN', balance: 5000 },
    { ...meta, id: '44444444-4444-4444-8444-444444444444', name: 'Morralla', type: 'cash', currency: 'MXN', balance: 300 },
  ],
  goals: [{ ...meta, id: '33333333-3333-4333-8333-333333333333', name: 'Viaje', targetAmount: 20000, currentAmount: 3000, currency: 'MXN' }],
  liabilities: [{ ...meta, id: '55555555-5555-4555-8555-555555555555', institution: 'Banorte', type: 'credit_card', balance: 8000, currency: 'MXN', dueDate: '2026-10-20' }],
};
const routes = ['/(tabs)', '/movimientos', '/presupuesto', '/patrimonio', '/inversiones', '/metas', '/ia', '/capture', '/transaction/new', '/settings', '/appearance', '/salud-financiera', '/privacidad', '/perfil', '/notificaciones', '/ai-settings', '/terminos', '/instalar', '/auth', '/onboarding'];

(async () => {
  const browser = await playwright.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 420, height: 860 } });
  await ctx.addInitScript((s) => { if (!localStorage.getItem('valu-app-storage')) localStorage.setItem('valu-app-storage', JSON.stringify({ state: s, version: 0 })); }, state);
  let bad = 0;
  for (const r of routes) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text().slice(0, 160)); });
    await page.goto(`http://localhost:${port}${r}`, { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(1800);
    const len = (await page.locator('body').innerText()).trim().length;
    if (errors.length || len < 20) { bad++; console.log('✗', r, 'texto:', len, errors.slice(0, 2)); } else console.log('✓', r);
    await page.close();
  }
  // Gesto: deslizar de lado entre secciones con eventos TÁCTILES reales (PanResponder de React Native).
  {
    const touchCtx = await browser.newContext({ viewport: { width: 420, height: 860 }, hasTouch: true, isMobile: true });
    await touchCtx.addInitScript((s) => { if (!localStorage.getItem('valu-app-storage')) localStorage.setItem('valu-app-storage', JSON.stringify({ state: s, version: 0 })); }, state);
    const page = await touchCtx.newPage();
    await page.goto(`http://localhost:${port}/(tabs)`, { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(2500);
    const before = new URL(page.url()).pathname;
    const cdp = await touchCtx.newCDPSession(page);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await touch('touchStart', 380, 300);
    for (let x = 380; x >= 100; x -= 20) { await touch('touchMove', x, 304); await page.waitForTimeout(16); }
    await touch('touchEnd', 100, 304);
    await page.waitForTimeout(1800);
    const after = new URL(page.url()).pathname;
    if (after === before) { bad++; console.log('✗ deslizar entre secciones: no cambió de pantalla', before); } else console.log(`✓ deslizar entre secciones (${before} → ${after})`);
    await touchCtx.close();
  }
  console.log(bad ? `${bad} comprobaciones con problemas` : 'todas las pantallas y gestos funcionan');
  await browser.close();
  server.close();
  process.exitCode = bad ? 1 : 0;
})().catch((e) => { console.error(e); server.close(); process.exit(1); });

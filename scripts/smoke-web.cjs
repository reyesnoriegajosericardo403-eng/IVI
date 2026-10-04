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
    { ...meta, id: '99999999-0000-4000-8000-000000000001', name: 'Oro', type: 'credit_card', currency: 'MXN', balance: 3000, isLiability: true },
  ],
  goals: [{ ...meta, id: '33333333-3333-4333-8333-333333333333', name: 'Viaje', targetAmount: 20000, currentAmount: 3000, currency: 'MXN' }],
  // P3: previstos (uno ya pasó, otro viene), una regla recurrente, un aviso y sus ocurrencias
  transactions: [
    { ...meta, id: '66666666-6666-4666-8666-666666666661', type: 'expense', amount: 8000, currency: 'MXN', categoryId: 'housing', subcategoryId: 'house_rent', merchant: 'Renta', accountId: '11111111-1111-4111-8111-111111111111', date: new Date(Date.now() - 86400000).toISOString(), origin: 'automatic', status: 'forecast', recurringRuleId: '77777777-7777-4777-8777-777777777771' },
    { ...meta, id: '66666666-6666-4666-8666-666666666662', type: 'expense', amount: 199, currency: 'MXN', categoryId: 'entertainment', subcategoryId: 'ent_streaming', merchant: 'Netflix', accountId: '11111111-1111-4111-8111-111111111111', date: new Date(Date.now() + 2 * 86400000).toISOString(), origin: 'manual', status: 'forecast' },
  ],
  recurringRules: [{ ...meta, id: '77777777-7777-4777-8777-777777777771', kind: 'transaction', name: 'Renta', status: 'active', recurrence: { frequency: 'monthly', interval: 1, startDate: '2026-01-05', dayOfMonth: 5 }, amount: 8000, currency: 'MXN', txType: 'expense', accountId: '11111111-1111-4111-8111-111111111111' }],
  reminders: [{ ...meta, id: '88888888-8888-4888-8888-888888888881', kind: 'custom', title: 'Pagar la luz', date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), timeOfDay: '09:00', advanceDays: [1], maxAttempts: 2, attemptIntervalMinutes: 120, push: true, status: 'active' }],
  reminderOccurrences: [{ ...meta, id: '99999999-9999-4999-8999-999999999991', reminderId: '88888888-8888-4888-8888-888888888881', eventDate: new Date(Date.now() - 3600000).toISOString().slice(0, 10), offsetDays: 0, scheduledFor: new Date(Date.now() - 3600000).toISOString(), status: 'pending', attemptsMade: 0, maxAttempts: 2, attemptIntervalMinutes: 120, title: 'Pagar la luz', push: true }],
  liabilities: [{ ...meta, id: '55555555-5555-4555-8555-555555555555', institution: 'Banorte', type: 'credit_card', balance: 8000, currency: 'MXN', dueDate: '2026-10-20' }],
};
const routes = ['/(tabs)', '/movimientos', '/presupuesto', '/patrimonio', '/inversiones', '/metas', '/ia', '/capture', '/transaction/new', '/settings', '/appearance', '/salud-financiera', '/privacidad', '/perfil', '/notificaciones', '/avisos', '/recurrentes', '/tarjetas', '/ai-settings', '/terminos', '/instalar', '/auth', '/onboarding'];

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
  // P3: la pestaña «Previstos» de Movimientos muestra los previstos y confirmar uno cambia el saldo una sola vez.
  {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
    await page.goto(`http://localhost:${port}/movimientos`, { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(1800);
    await page.getByText(/Previstos/).first().click();
    await page.waitForTimeout(600);
    const body = await page.locator('body').innerText();
    const okForecast = /Netflix/.test(body) && /Renta/.test(body) && /Pasaron de fecha/i.test(body);
    await page.getByText('Ya ocurrió').first().click();
    await page.waitForTimeout(600);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('valu-app-storage')).state);
    const confirmed = saved.transactions.filter((t) => t.status === 'posted' || !t.status);
    const bbva = saved.accounts.find((a) => a.name === 'BBVA').balance;
    if (errors.length || !okForecast || confirmed.length !== 1 || bbva !== 5000 - 8000) { bad++; console.log('✗ previstos: confirmar desde la pestaña', { errors, okForecast, confirmed: confirmed.length, bbva }); } else console.log('✓ previstos: se ven, se confirman y el saldo cambia una sola vez');
    await page.close();
  }
  // P3: crear un pago recurrente y un aviso desde sus pantallas (formularios reales).
  {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
    await page.goto(`http://localhost:${port}/recurrentes`, { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.getByText('Nuevo pago recurrente').first().click();
    await page.getByPlaceholder(/Renta, Netflix/).fill('Gimnasio');
    await page.getByPlaceholder('0.00').first().fill('500');
    await page.getByRole('button', { name: 'BBVA' }).first().click();
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await page.waitForTimeout(800);
    let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('valu-app-storage')).state);
    const rule = (saved.recurringRules || []).find((r) => r.name === 'Gimnasio');
    const fcs = (saved.transactions || []).filter((t) => t.recurringRuleId === rule?.id && t.status === 'forecast');
    const rem = (saved.reminders || []).find((r) => r.sourceId === rule?.id);
    const okRule = !!rule && fcs.length >= 3 && !!rem;
    await page.goto(`http://localhost:${port}/avisos`, { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Nuevo aviso' }).first().click();
    await page.getByPlaceholder(/Pagar la luz/).fill('Predial');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await page.waitForTimeout(800);
    saved = await page.evaluate(() => JSON.parse(localStorage.getItem('valu-app-storage')).state);
    const okRem = (saved.reminders || []).some((r) => r.title === 'Predial');
    if (errors.length || !okRule || !okRem) { bad++; console.log('✗ formularios P3', { errors, okRule, okRem, rule: !!rule, fcs: fcs.length, rem: !!rem }); } else console.log('✓ formularios P3: pago recurrente (con previstos y aviso) y aviso propio');
    await page.close();
  }
  // Tarjeta de crédito: poner corte y pago crea los avisos; pagar la tarjeta baja la deuda.
  {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
    await page.goto(`http://localhost:${port}/tarjetas`, { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.getByPlaceholder('ej. 5', { exact: true }).fill('5');
    await page.getByPlaceholder('ej. 25', { exact: true }).fill('25');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await page.waitForTimeout(800);
    let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('valu-app-storage')).state);
    const oro = saved.accounts.find((a) => a.name === 'Oro');
    const cardRems = (saved.reminders || []).filter((r) => r.sourceType === 'account');
    const cardOccs = (saved.reminderOccurrences || []).filter((o) => o.sourceType === 'account');
    const okDates = oro.cardCutoffDay === 5 && oro.cardDueDay === 25 && cardRems.length === 2 && cardOccs.length >= 6;
    const body = await page.locator('body').innerText();
    const okText = /fecha l[ií]mite/i.test(body);
    await page.getByRole('button', { name: 'Pagar tarjeta' }).first().click();
    await page.getByRole('button', { name: 'BBVA' }).first().click();
    await page.getByRole('button', { name: 'Registrar pago' }).first().click();
    await page.waitForTimeout(800);
    saved = await page.evaluate(() => JSON.parse(localStorage.getItem('valu-app-storage')).state);
    const oro2 = saved.accounts.find((a) => a.name === 'Oro');
    const bbva = saved.accounts.find((a) => a.name === 'BBVA');
    const okPay = oro2.balance < 3000 && bbva.balance < 5000;
    if (errors.length || !okDates || !okText || !okPay) { bad++; console.log('✗ tarjeta de crédito', { errors, okDates, okText, okPay, oro: oro2.balance, bbva: bbva.balance }); } else console.log('✓ tarjeta de crédito: fechas → avisos de corte y pago; pagar baja la deuda');
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

// Prueba de punta a punta del AGENTE DE IA en un navegador real (Chromium): la app exportada con un Supabase falso, una
// sesión iniciada y una IA falsa detrás de /functions/v1/ai-agent que habla el mismo protocolo que la función real.
// Comprueba: la cabecera dice que la IA está activa, una pregunta usa una herramienta y contesta con los números reales,
// un gasto propuesto se confirma manteniendo presionado y queda guardado (con la categoría del motor local), Ajustes →
// IA muestra estado y cuota, y si la función no está desplegada el chat contesta con el motor local y lo explica.
//   EXPO_PUBLIC_SUPABASE_URL=https://fakeproj.supabase.co EXPO_PUBLIC_SUPABASE_ANON_KEY=anon-fake \
//     npx expo export -p web --output-dir /tmp/web-ai && node scripts/smoke-agente.cjs /tmp/web-ai
const http = require('http');
const fs = require('fs');
const path = require('path');

let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const ROOT = process.argv[2];
if (!ROOT) { console.error('Uso: node scripts/smoke-agente.cjs <carpeta exportada con Supabase falso>'); process.exit(2); }
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
  transactions: [
    { ...meta, id: '55555555-5555-4555-8555-555555555551', type: 'expense', amount: 120, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_fastfood', merchant: 'Tacos', accountId: '44444444-4444-4444-8444-444444444444', date: now, origin: 'manual' },
    { ...meta, id: '55555555-5555-4555-8555-555555555552', type: 'expense', amount: 300, currency: 'MXN', categoryId: 'transport', subcategoryId: 'trans_uber', merchant: 'Uber', accountId: '11111111-1111-4111-8111-111111111111', date: now, origin: 'manual' },
  ],
  goals: [], investments: [], liabilities: [], budgets: [], conversations: [], chatMessages: [], activeConversationId: null,
};
const session = {
  access_token: 'token-de-prueba', refresh_token: 'refresh-de-prueba', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: 'a1b2c3d4-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'prueba@valu.app', app_metadata: {}, user_metadata: {}, created_at: now },
};

let mode = 'ok'; // 'ok' | 'not_deployed'
const aiRequests = [];
function aiAgent(body) {
  aiRequests.push(body);
  if (body.action === 'status') return { ok: true, v: 1, configured: true, allowed: true, byok: false, provider: 'gemini', providerLabel: 'Gemini (Google)', model: 'gemini-flash-latest', quota: { used: 2, limit: 150, remaining: 148 } };
  if (body.action === 'test') return { ok: true, v: 1, provider: 'gemini', providerLabel: 'Gemini (Google)', model: 'gemini-flash-latest', text: 'OK', toolCalls: [], raw: {}, quota: null };
  const msgs = body.messages;
  const lastUser = [...msgs].reverse().find((m) => m.role === 'user').text;
  const toolMsg = msgs[msgs.length - 1].role === 'tool' ? msgs[msgs.length - 1] : null;
  const reply = (text, toolCalls = []) => ({ ok: true, v: 1, provider: 'gemini', providerLabel: 'Gemini (Google)', model: 'gemini-test', text, toolCalls, raw: { provider: 'gemini', model: 'gemini-test', content: { role: 'model', parts: [] } }, finishReason: 'STOP', quota: { used: 3, limit: 150, remaining: 147 } });
  if (/gast[eé] m[aá]s/i.test(lastUser)) {
    if (!toolMsg) return reply('', [{ id: 'vx_0', name: 'gastos_por_categoria', args: {} }]);
    const r = toolMsg.results[0].content;
    return reply(`Este mes llevas $${r.total} en gastos; lo que más pesa es ${r.categorias[0].nombre} con $${r.categorias[0].monto}.`);
  }
  if (/tacos/i.test(lastUser)) {
    return reply('', [{ id: 'vx_0', name: 'proponer_acciones', args: { acciones: [{ type: 'add_transaction', transactionType: 'expense', amount: 230, concepto: 'tacos', accountNameHint: 'morralla' }], mensaje: 'Va, lo anoto en Morralla.' } }]);
  }
  return reply('No entendí, ¿me lo dices de otra forma?');
}

(async () => {
  const browser = await playwright.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 420, height: 860 } });
  await ctx.addInitScript(([s, sess]) => {
    if (!localStorage.getItem('valu-app-storage')) localStorage.setItem('valu-app-storage', JSON.stringify({ state: s, version: 0 }));
    localStorage.setItem('sb-fakeproj-auth-token', JSON.stringify(sess));
  }, [state, session]);
  await ctx.route('https://fakeproj.supabase.co/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const json = (status, body) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (url.pathname === '/functions/v1/ai-agent') {
      if (mode === 'not_deployed') return json(404, { code: 'NOT_FOUND', message: 'Requested function was not found' });
      return json(200, aiAgent(JSON.parse(req.postData() || '{}')));
    }
    if (url.pathname.startsWith('/auth/v1/user')) return json(200, session.user);
    if (url.pathname.startsWith('/auth/v1/token')) return json(200, session);
    if (url.pathname.startsWith('/rest/v1/')) return req.method() === 'GET' ? json(200, []) : json(201, []);
    return json(200, {});
  });

  let bad = 0;
  const check = (name, okv, info) => { if (okv) console.log('✓', name); else { bad++; console.log('✗', name, info ?? ''); } };
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));

  await page.goto(`http://localhost:${port}/ia`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(3000);
  const header = await page.locator('body').innerText();
  check('la cabecera del chat dice que la IA está activa', /VALU · IA Gemini/.test(header), header.slice(0, 200));

  const ask = async (text) => {
    await page.getByPlaceholder('Escríbele a VALU…').first().fill(text);
    await page.getByLabel('Enviar mensaje').first().click();
  };
  await ask('¿en qué gasté más este mes?');
  await page.waitForTimeout(4500);
  let body = await page.locator('body').innerText();
  check('pregunta: usa una herramienta y contesta con los números reales', /llevas \$420 en gastos/.test(body) && /Transporte/.test(body), body.slice(-500));
  check('bajo la respuesta dice que contestó la IA', /IA · Gemini · gemini-test/.test(body));
  const chatReq = aiRequests.filter((r) => r.action === 'chat');
  check('la IA recibió herramientas y el resultado de la consulta', chatReq.length >= 2 && chatReq[0].tools.length >= 10 && chatReq[1].messages.some((m) => m.role === 'tool'));

  await ask('gasté 230 en tacos en morralla');
  await page.waitForTimeout(4000);
  body = await page.locator('body').innerText();
  check('acción: la IA propone y la app muestra la tarjeta para confirmar', /Va, lo anoto en Morralla/.test(body) && /230/.test(body), body.slice(-600));
  const confirm = page.getByLabel(/^Confirmar:/).last();
  const box = await confirm.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1500);
    await page.mouse.up();
    await page.waitForTimeout(1200);
  }
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('valu-app-storage')).state);
  const tx = saved.transactions.find((x) => x.amount === 230 && !x.deletedAt);
  check('confirmar guarda el gasto con la categoría del motor local', !!tx && tx.categoryId === 'food' && tx.merchant === 'tacos', JSON.stringify(tx));
  const morralla = saved.accounts.find((a) => a.name === 'Morralla');
  check('y descuenta de la cuenta correcta', morralla.balance === 70, String(morralla.balance));

  await page.goto(`http://localhost:${port}/ai-settings`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(2500);
  body = await page.locator('body').innerText();
  check('Ajustes → IA muestra estado, modelo y cuota', /IA activa · Gemini/.test(body) && /te quedan 148 de 150/.test(body), body.slice(0, 600));

  mode = 'not_deployed';
  await page.goto(`http://localhost:${port}/ia`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(2500);
  await ask('¿cuál es mi patrimonio?');
  await page.waitForTimeout(3500);
  body = await page.locator('body').innerText();
  check('sin la función desplegada: contesta el motor local y explica qué falta', /Respondí sin IA: falta desplegar la función ai-agent/.test(body) && /patrimonio/i.test(body), body.slice(-500));

  check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  console.log(bad ? `${bad} comprobaciones con problemas` : 'el agente de IA funciona de punta a punta en el navegador');
  await browser.close();
  server.close();
  process.exitCode = bad ? 1 : 0;
})().catch((e) => { console.error(e); server.close(); process.exit(1); });

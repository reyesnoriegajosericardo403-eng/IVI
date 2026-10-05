// Función ai-agent (el "cerebro" de VALU) con proveedores FALSOS: traducción a Gemini / Claude / OpenAI, respaldo
// cuando un modelo se retira o no tiene cuota, sesión obligatoria, cuota diaria y errores claros (nunca 404).
//   node scripts/golden/ai-agente.cjs
require('./ts-hook.cjs');
const assert = require('assert');
const P = require('../../supabase/functions/_shared/aiProviders.ts');
const H = require('../../supabase/functions/_shared/aiAgentHandler.ts');

let ok = 0, fail = 0;
const queue = [];
const t = (name, fn) => queue.push([name, fn]);

const res = (status, body) => ({ ok: status >= 200 && status < 300, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });
const tools = [{
  name: 'buscar_movimientos',
  description: 'Busca movimientos',
  parameters: { type: 'object', properties: { texto: { type: 'string', description: 'palabra' }, limite: { type: 'integer' }, tipo: { type: 'string', enum: ['gasto', 'ingreso'] }, extra: { type: 'array', items: { type: 'string' } } }, required: ['texto', 'no_existe'] },
}];

// ---------------------------------------------------------------- Gemini
t('Gemini: sistema, roles, herramientas y esquema limpio', () => {
  const body = P.buildGeminiBody({ system: 'SYS', messages: [{ role: 'user', text: 'hola' }], tools, temperature: 0.2 }, 'gemini-x');
  assert.deepStrictEqual(body.systemInstruction, { parts: [{ text: 'SYS' }] });
  assert.deepStrictEqual(body.contents, [{ role: 'user', parts: [{ text: 'hola' }] }]);
  const decl = body.tools[0].functionDeclarations[0];
  assert.strictEqual(decl.name, 'buscar_movimientos');
  assert.deepStrictEqual(decl.parameters.required, ['texto'], 'quita requeridos que no existen');
  assert.deepStrictEqual(decl.parameters.properties.extra, { type: 'array', items: { type: 'string' } });
  assert.strictEqual(body.generationConfig.temperature, 0.2);
  assert(!('responseMimeType' in body.generationConfig), 'con herramientas no se fuerza JSON');
});
t('Gemini: la respuesta original del MISMO modelo se devuelve tal cual (firmas de pensamiento)', () => {
  const raw = { provider: 'gemini', model: 'gemini-x', content: { role: 'model', parts: [{ functionCall: { name: 'buscar_movimientos', args: { texto: 'oxxo' } }, thoughtSignature: 'SIG-REAL' }] } };
  const body = P.buildGeminiBody({
    system: 'S',
    messages: [
      { role: 'user', text: '¿cuánto en oxxo?' },
      { role: 'assistant', toolCalls: [{ id: 'vx_0', name: 'buscar_movimientos', args: { texto: 'oxxo' } }], raw },
      { role: 'tool', results: [{ callId: 'vx_0', name: 'buscar_movimientos', content: [{ monto: 50 }] }] },
    ],
    tools,
  }, 'gemini-x');
  assert.strictEqual(body.contents[1].parts[0].thoughtSignature, 'SIG-REAL');
  assert.strictEqual(body.contents[1].role, 'model');
  const fr = body.contents[2].parts[0].functionResponse;
  assert.deepStrictEqual(fr, { name: 'buscar_movimientos', response: { resultado: [{ monto: 50 }] } }, 'arreglo → objeto; sin id sintético');
});
t('Gemini: historial de OTRO modelo lleva firma comodín; ids reales se respetan', () => {
  const raw = { provider: 'gemini', model: 'otro', content: { role: 'model', parts: [{ functionCall: { name: 'a', args: {} } }] } };
  const body = P.buildGeminiBody({ system: 'S', messages: [
    { role: 'user', text: 'x' },
    { role: 'assistant', toolCalls: [{ id: 'call-77', name: 'a', args: {} }, { id: 'call-78', name: 'b', args: {} }], raw },
    { role: 'tool', results: [{ callId: 'call-77', name: 'a', content: { ok: 1 } }, { callId: 'call-78', name: 'b', content: 'listo' }] },
  ] }, 'gemini-x');
  const parts = body.contents[1].parts;
  assert.strictEqual(parts[0].thoughtSignature, P.GEMINI_SKIP_SIGNATURE);
  assert(!('thoughtSignature' in parts[1]), 'solo la primera llamada lleva firma');
  assert.strictEqual(parts[0].functionCall.id, 'call-77');
  assert.deepStrictEqual(body.contents[2].parts.map((p) => p.functionResponse.id), ['call-77', 'call-78']);
  assert.deepStrictEqual(body.contents[2].parts[1].functionResponse.response, { resultado: 'listo' });
});
t('Contestar sin herramientas (último paso): cada proveedor lo pide a su manera', () => {
  const req = { system: 'S', messages: [{ role: 'user', text: 'x' }], tools, toolChoice: 'none' };
  assert.deepStrictEqual(P.buildGeminiBody(req, 'm').toolConfig, { functionCallingConfig: { mode: 'NONE' } });
  assert.deepStrictEqual(P.buildAnthropicBody(req, 'm').tool_choice, { type: 'none' });
  assert.strictEqual(P.buildOpenAIBody(req, 'm', 'openai').tool_choice, 'none');
  assert(!('toolConfig' in P.buildGeminiBody({ ...req, toolChoice: 'auto' }, 'm')));
});
t('Gemini: modo JSON solo sin herramientas', () => {
  const body = P.buildGeminiBody({ system: 'S', messages: [{ role: 'user', text: 'x' }], json: true }, 'm');
  assert.strictEqual(body.generationConfig.responseMimeType, 'application/json');
});
t('Gemini: leer respuesta (texto sin pensamientos, llamadas, uso)', () => {
  const r = P.parseGeminiResponse({
    candidates: [{ content: { role: 'model', parts: [{ text: 'pensando', thought: true }, { text: 'Hola ' }, { text: 'Juan' }, { functionCall: { name: 'f', args: { a: 1 } } }] }, finishReason: 'STOP' }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 30 },
  }, 'gemini-x');
  assert.strictEqual(r.text, 'Hola Juan');
  assert.deepStrictEqual(r.toolCalls, [{ id: 'vx_0', name: 'f', args: { a: 1 } }]);
  assert.deepStrictEqual(r.usage, { inputTokens: 100, outputTokens: 50 });
  assert.strictEqual(r.raw.provider, 'gemini');
  assert.throws(() => P.parseGeminiResponse({ promptFeedback: { blockReason: 'SAFETY' } }, 'm'), (e) => e.code === 'provider_blocked');
});
t('Gemini: errores → códigos claros', () => {
  assert.strictEqual(P.geminiError(400, JSON.stringify({ error: { message: 'API key not valid. Please pass a valid API key.', details: [{ reason: 'API_KEY_INVALID' }] } })).code, 'provider_auth');
  assert.strictEqual(P.geminiError(404, JSON.stringify({ error: { message: 'models/gemini-2.0-flash is not found for API version v1beta' } })).code, 'provider_model');
  assert.strictEqual(P.geminiError(429, JSON.stringify({ error: { message: 'Quota exceeded for metric: generate_content_free_tier_requests, limit: 0, model: gemini-3.5-flash' } })).code, 'provider_model_quota');
  assert.strictEqual(P.geminiError(429, JSON.stringify({ error: { message: 'Quota exceeded for metric GenerateRequestsPerDayPerProjectPerModel-FreeTier' } })).code, 'provider_quota');
  const rl = P.geminiError(429, JSON.stringify({ error: { message: 'Resource exhausted', details: [{ retryDelay: '13s' }] } }));
  assert.deepStrictEqual([rl.code, rl.retryAfterSeconds], ['provider_rate_limit', 13]);
  assert.strictEqual(P.geminiError(503, '{"error":{"message":"The model is overloaded"}}').code, 'provider_unavailable');
});
t('Gemini: ordenar modelos disponibles (alias conocido, luego flash estable más nuevo, sin imagen/tts)', () => {
  const ranked = P.rankGeminiModels(['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-image', 'gemini-3.5-flash-preview-tts', 'gemini-4-flash-preview', 'gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-pro'], ['gemini-flash-latest', 'gemini-3.5-flash']);
  assert.deepStrictEqual(ranked.slice(0, 2), ['gemini-3.5-flash', 'gemini-3.6-flash']);
  assert(!ranked.some((m) => /image|tts|pro/.test(m)), ranked.join());
  assert(ranked.indexOf('gemini-4-flash-preview') > ranked.indexOf('gemini-2.5-flash'), 'las vistas previas van al final');
});

const geminiOk = (text, calls = []) => res(200, { candidates: [{ content: { role: 'model', parts: [...(text ? [{ text }] : []), ...calls.map((c) => ({ functionCall: c }))] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } });

t('Respaldo: el modelo retirado da 404 → lista modelos → usa el vigente y lo recuerda', async () => {
  P.resetModelCache();
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    if (url.includes('/models?')) return res(200, { models: [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] }] });
    if (url.includes('gemini-3.5-flash:generateContent')) return geminiOk('hola');
    return res(404, { error: { message: 'not found' } });
  };
  const r = await P.chatWithFallback({ provider: 'gemini', apiKey: 'AIza-clave-de-prueba-1', model: 'gemini-2.0-flash' }, { system: 's', messages: [{ role: 'user', text: 'x' }] }, fetchFn);
  assert.deepStrictEqual([r.model, r.text], ['gemini-3.5-flash', 'hola']);
  assert(calls[0].includes('gemini-2.0-flash'), 'primero el que se pidió');
  assert.strictEqual(calls.filter((u) => u.includes('/models?')).length, 1, 'lista UNA vez');
  calls.length = 0;
  const r2 = await P.chatWithFallback({ provider: 'gemini', apiKey: 'AIza-clave-de-prueba-1' }, { system: 's', messages: [{ role: 'user', text: 'x' }] }, fetchFn);
  assert.strictEqual(r2.model, 'gemini-3.5-flash');
  assert.strictEqual(calls.length, 1, 'recuerda el modelo que funcionó');
});
t('Respaldo: modelo sin cuota gratuita (limit: 0) → prueba el siguiente', async () => {
  P.resetModelCache();
  const fetchFn = async (url) => {
    if (url.includes('/models?')) return res(200, { models: [{ name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.1-flash-lite', supportedGenerationMethods: ['generateContent'] }] });
    if (url.includes('gemini-flash-latest')) return res(429, { error: { message: 'Quota exceeded for metric: x_free_tier, limit: 0' } });
    if (url.includes('gemini-3.1-flash-lite')) return geminiOk('ok lite');
    return res(404, { error: { message: 'no' } });
  };
  const r = await P.chatWithFallback({ provider: 'gemini', apiKey: 'AIza-clave-de-prueba-2' }, { system: 's', messages: [{ role: 'user', text: 'x' }] }, fetchFn);
  assert.deepStrictEqual([r.model, r.text], ['gemini-3.1-flash-lite', 'ok lite']);
});
t('Respaldo: clave inválida NO prueba otros modelos', async () => {
  P.resetModelCache();
  let n = 0;
  const fetchFn = async () => { n++; return res(400, { error: { message: 'API key not valid.', details: [{ reason: 'API_KEY_INVALID' }] } }); };
  await assert.rejects(P.chatWithFallback({ provider: 'gemini', apiKey: 'AIza-mala-clave-0000' }, { system: 's', messages: [{ role: 'user', text: 'x' }] }, fetchFn), (e) => e.code === 'provider_auth');
  assert.strictEqual(n, 1);
});

// ---------------------------------------------------------------- Claude
t('Claude: bloques, resultados de herramientas juntos y respuesta original', () => {
  const raw = { provider: 'anthropic', model: 'claude-x', content: [{ type: 'text', text: 'Busco' }, { type: 'tool_use', id: 'tu1', name: 'a', input: { q: 1 } }, { type: 'tool_use', id: 'tu2', name: 'b', input: {} }] };
  const body = P.buildAnthropicBody({ system: 'S', messages: [
    { role: 'user', text: 'x' },
    { role: 'assistant', toolCalls: [], raw },
    { role: 'tool', results: [{ callId: 'tu1', name: 'a', content: { v: 1 } }, { callId: 'tu2', name: 'b', content: 'listo' }] },
  ], tools }, 'claude-x');
  assert.strictEqual(body.system, 'S');
  assert.strictEqual(body.messages.length, 3);
  assert.deepStrictEqual(body.messages[1].content, raw.content);
  assert.deepStrictEqual(body.messages[2].content, [
    { type: 'tool_result', tool_use_id: 'tu1', content: '{"v":1}' },
    { type: 'tool_result', tool_use_id: 'tu2', content: 'listo' },
  ]);
  assert.deepStrictEqual(body.tools[0].input_schema, tools[0].parameters);
  const r = P.parseAnthropicResponse({ content: [{ type: 'text', text: 'Hola' }, { type: 'tool_use', id: 'x1', name: 'f', input: { a: 2 } }], stop_reason: 'tool_use', usage: { input_tokens: 7, output_tokens: 3 } }, 'claude-x');
  assert.deepStrictEqual([r.text, r.toolCalls, r.usage], ['Hola', [{ id: 'x1', name: 'f', args: { a: 2 } }], { inputTokens: 7, outputTokens: 3 }]);
  assert.strictEqual(P.anthropicError(400, '{"error":{"message":"Your credit balance is too low"}}').code, 'provider_quota');
  assert.strictEqual(P.anthropicError(529, '{}').code, 'provider_unavailable');
});

// ---------------------------------------------------------------- OpenAI / Grok
t('OpenAI: sistema primero, tool_calls con argumentos JSON y mensajes de herramienta', () => {
  const body = P.buildOpenAIBody({ system: 'S', messages: [
    { role: 'user', text: 'x' },
    { role: 'assistant', toolCalls: [{ id: 'c1', name: 'a', args: { q: 1 } }] },
    { role: 'tool', results: [{ callId: 'c1', name: 'a', content: { v: 1 } }] },
  ], tools }, 'gpt-x', 'openai');
  assert.deepStrictEqual(body.messages[0], { role: 'system', content: 'S' });
  assert.deepStrictEqual(body.messages[2].tool_calls, [{ id: 'c1', type: 'function', function: { name: 'a', arguments: '{"q":1}' } }]);
  assert.deepStrictEqual(body.messages[3], { role: 'tool', tool_call_id: 'c1', content: '{"v":1}' });
  assert.strictEqual(body.max_completion_tokens, 4096);
  assert(!('temperature' in body));
  const r = P.parseOpenAIResponse({ choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'c9', type: 'function', function: { name: 'f', arguments: '{"z":3}' } }] }, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 4, completion_tokens: 2 } }, 'gpt-x', 'openai');
  assert.deepStrictEqual(r.toolCalls, [{ id: 'c9', name: 'f', args: { z: 3 } }]);
  assert.strictEqual(P.openAIError(429, '{"error":{"code":"insufficient_quota","message":"x"}}', 'openai').code, 'provider_quota');
  assert.strictEqual(P.openAIError(404, '{"error":{"code":"model_not_found","message":"x"}}', 'xai').code, 'provider_model');
});

// ---------------------------------------------------------------- Manejador HTTP
const ENV = (over = {}) => H.envFrom((k) => ({ SUPABASE_URL: 'https://p.supabase.co', SUPABASE_ANON_KEY: 'ANON', SUPABASE_SERVICE_ROLE_KEY: 'SERVICE', GEMINI_API_KEY: 'AIza-servidor-123456', AI_DAILY_LIMIT: '3', ...over })[k]);
function fakeWorld({ used = 0, usageTable = true, gemini } = {}) {
  const log = [];
  let usage = used;
  const fetchFn = async (url, init = {}) => {
    log.push({ url, init });
    if (url.endsWith('/auth/v1/user')) return init.headers.Authorization === 'Bearer USER-TOKEN' ? res(200, { id: 'u-1', email: 'U1@valu.app' }) : res(401, { msg: 'bad jwt' });
    if (url.includes('/rest/v1/ai_usage?')) return usageTable ? res(200, usage ? [{ requests: usage }] : []) : res(404, { code: '42P01' });
    if (url.includes('/rest/v1/rpc/ai_usage_add')) { if (!usageTable) return res(404, {}); usage++; return res(200, usage); }
    if (url.includes('generativelanguage.googleapis.com')) return gemini ? gemini(url, init) : geminiOk('Hola, soy VALU');
    return res(500, 'inesperado ' + url);
  };
  return { fetchFn, log, usage: () => usage };
}
const req = (body, token = 'USER-TOKEN', method = 'POST') => new Request('https://p.supabase.co/functions/v1/ai-agent', { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: method === 'POST' ? JSON.stringify(body) : undefined });
const call = async (r, env, world) => { const out = await H.handleAgentRequest(r, env, { fetch: world.fetchFn, now: () => new Date('2026-10-05T12:00:00Z') }); return { status: out.status, body: out.status === 204 ? null : await out.json(), headers: out.headers }; };
const chatBody = { action: 'chat', system: 'Eres VALU', messages: [{ role: 'user', text: '¿cuánto gasté?' }], tools };

t('OPTIONS responde CORS sin pedir sesión', async () => {
  P.resetModelCache();
  const w = fakeWorld();
  const r = await call(new Request('https://p/x', { method: 'OPTIONS' }), ENV(), w);
  assert.strictEqual(r.status, 204);
  assert.match(r.headers.get('access-control-allow-headers'), /authorization/);
  assert.strictEqual(w.log.length, 0);
});
t('Sin sesión (o con la llave pública como sesión) → 401, sin llamar a la IA', async () => {
  const w = fakeWorld();
  assert.strictEqual((await call(req(chatBody, null), ENV(), w)).body.code, 'not_signed_in');
  const anon = await call(req(chatBody, 'ANON'), ENV(), w);
  assert.deepStrictEqual([anon.status, anon.body.code], [401, 'not_signed_in']);
  assert(!w.log.some((l) => l.url.includes('googleapis')), 'no tocó la IA');
});
t('Estado: proveedor, modelo y cuota de hoy', async () => {
  const w = fakeWorld({ used: 1 });
  const r = await call(req({ action: 'status' }), ENV(), w);
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual([r.body.configured, r.body.provider, r.body.model, r.body.quota], [true, 'gemini', 'gemini-flash-latest', { used: 1, limit: 3, remaining: 2 }]);
});
t('Sin clave en el servidor: estado lo dice y el chat explica qué secreto falta (503, no 404)', async () => {
  const w = fakeWorld();
  const env = ENV({ GEMINI_API_KEY: '' });
  assert.strictEqual((await call(req({ action: 'status' }), env, w)).body.configured, false);
  const r = await call(req(chatBody), env, w);
  assert.deepStrictEqual([r.status, r.body.code], [503, 'not_configured']);
  assert.match(r.body.error, /GEMINI_API_KEY/);
});
t('Chat: llama a Gemini, devuelve texto/herramientas/respuesta original y cuenta 1 consulta', async () => {
  P.resetModelCache();
  const w = fakeWorld({ gemini: () => geminiOk('', [{ name: 'buscar_movimientos', args: { texto: 'oxxo' } }]) });
  const r = await call(req(chatBody), ENV(), w);
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  assert.deepStrictEqual(r.body.toolCalls, [{ id: 'vx_0', name: 'buscar_movimientos', args: { texto: 'oxxo' } }]);
  assert.strictEqual(r.body.raw.provider, 'gemini');
  assert.deepStrictEqual(r.body.quota, { used: 1, limit: 3, remaining: 2 });
  const g = w.log.find((l) => l.url.includes('googleapis'));
  assert.strictEqual(g.init.headers['x-goog-api-key'], 'AIza-servidor-123456');
  assert(!g.url.includes('key='), 'la clave nunca va en la URL');
});
t('Cuota diaria agotada → 429 claro, sin llamar a la IA', async () => {
  const w = fakeWorld({ used: 3 });
  const r = await call(req(chatBody), ENV(), w);
  assert.deepStrictEqual([r.status, r.body.code], [429, 'quota_exceeded']);
  assert(!w.log.some((l) => l.url.includes('googleapis')));
});
t('Sin la migración 0025 (tabla ai_usage): funciona y cuenta en memoria', async () => {
  P.resetModelCache();
  const w = fakeWorld({ usageTable: false });
  const r = await call(req(chatBody), ENV(), w);
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  assert.strictEqual(r.body.quota.used >= 1, true);
});
t('Clave propia: usa la de la persona, no gasta la cuota del servidor', async () => {
  P.resetModelCache();
  const w = fakeWorld({ used: 3 });
  const r = await call(req({ ...chatBody, byok: { provider: 'gemini', apiKey: 'AIza-propia-987654321' } }), ENV(), w);
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  assert.strictEqual(r.body.quota, null);
  assert.strictEqual(w.log.find((l) => l.url.includes('googleapis')).init.headers['x-goog-api-key'], 'AIza-propia-987654321');
  assert(!w.log.some((l) => l.url.includes('rpc/ai_usage_add')));
  const bad = await call(req({ ...chatBody, byok: { provider: 'otro', apiKey: 'x' } }), ENV(), w);
  assert.deepStrictEqual([bad.status, bad.body.code], [400, 'bad_request']);
});
t('Clave del servidor inválida → mensaje dice que es la del secreto en Supabase', async () => {
  P.resetModelCache();
  const w = fakeWorld({ gemini: () => res(400, { error: { message: 'API key not valid.', details: [{ reason: 'API_KEY_INVALID' }] } }) });
  const r = await call(req(chatBody), ENV(), w);
  assert.deepStrictEqual([r.status, r.body.code], [502, 'provider_auth']);
  assert.match(r.body.error, /secreto en Supabase/);
});
t('Lista de correos autorizados (AI_ALLOWED_EMAILS): otra cuenta no usa la clave del servidor, pero sí la suya propia', async () => {
  P.resetModelCache();
  const w = fakeWorld();
  const env = ENV({ AI_ALLOWED_EMAILS: 'dueno@valu.app, Otra@Valu.app' });
  const denied = await call(req(chatBody), env, w);
  assert.deepStrictEqual([denied.status, denied.body.code], [403, 'not_allowed']);
  assert.strictEqual((await call(req({ action: 'status' }), env, w)).body.allowed, false);
  const own = await call(req({ ...chatBody, byok: { provider: 'gemini', apiKey: 'AIza-propia-987654321' } }), env, w);
  assert.strictEqual(own.status, 200, JSON.stringify(own.body));
  const w2 = fakeWorld();
  const okEnv = ENV({ AI_ALLOWED_EMAILS: 'u1@valu.app' });
  assert.strictEqual((await call(req(chatBody), okEnv, w2)).status, 200, 'el correo autorizado sí entra (sin importar mayúsculas)');
});
t('Prueba de conexión (test) responde con el modelo que funcionó', async () => {
  P.resetModelCache();
  const w = fakeWorld({ gemini: () => geminiOk('OK') });
  const r = await call(req({ action: 'test' }), ENV(), w);
  assert.deepStrictEqual([r.status, r.body.text, r.body.model], [200, 'OK', 'gemini-flash-latest']);
});
t('Solicitudes inválidas → 400 (y nunca 404 en ningún caso)', async () => {
  const w = fakeWorld();
  const cases = [
    await call(req({ action: 'chat', system: 'x', messages: [] }), ENV(), w),
    await call(req({ action: 'chat', system: '', messages: [{ role: 'user', text: 'x' }] }), ENV(), w),
    await call(req({ action: 'chat', system: 'x', messages: [{ role: 'robot', text: 'x' }] }), ENV(), w),
    await call(req({ action: 'chat', system: 'x', messages: [{ role: 'user', text: 'x' }], tools: [{ name: 'mal nombre', description: 'x', parameters: { type: 'object' } }] }), ENV(), w),
    await call(req({ action: 'borrar-todo' }), ENV(), w),
    await call(new Request('https://p/x', { method: 'GET', headers: { authorization: 'Bearer USER-TOKEN' } }), ENV(), w),
  ];
  for (const c of cases) assert.notStrictEqual(c.status, 404);
  assert.deepStrictEqual(cases.map((c) => c.status), [400, 400, 400, 400, 400, 405]);
});

// ---------------------------------------------------------------- Migración 0025: fechas del presupuesto en la nube
t('Presupuesto: día del mes/semana y fecha única viajan a Supabase y regresan; sin valor no se mandan', () => {
  const M = require('../../src/services/supabase/mappers.ts');
  const base = { id: 'b1', categoryId: 'food', monthlyAmount: 100, currency: 'MXN', thresholds: { attention: 0.7, warning: 0.85, exceeded: 1 }, createdAt: 'x', updatedAt: 'x' };
  const row = M.budgetToRow('u', { ...base, dayOfMonth: 5, dayOfWeek: 0, oneTimeDate: '2026-11-02' });
  assert.deepStrictEqual([row.day_of_month, row.day_of_week, row.one_time_date], [5, 0, '2026-11-02']);
  const back = M.budgetFromRow({ ...row, updated_at: 'y' });
  assert.deepStrictEqual([back.dayOfMonth, back.dayOfWeek, back.oneTimeDate], [5, 0, '2026-11-02']);
  const plain = M.budgetToRow('u', base);
  assert(!('day_of_month' in plain) && !('day_of_week' in plain) && !('one_time_date' in plain), 'antes de la migración no se mandan columnas nuevas');
});

(async () => {
  // En orden: varias pruebas comparten la memoria de "último modelo que funcionó".
  for (const [name, fn] of queue) {
    try { await fn(); ok++; } catch (e) { fail++; console.log('  ✗', name, '\n     ', String(e.stack || e.message).split('\n').slice(0, 5).join('\n      ')); }
  }
  console.log(`Agente de IA (servidor): ${ok} OK, ${fail} fallan`);
  process.exit(fail ? 1 : 0);
})();

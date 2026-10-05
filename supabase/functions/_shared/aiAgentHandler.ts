// Manejador HTTP de la función ai-agent (el "cerebro" de VALU). Sin APIs de Deno para poder probarlo en Node con un
// fetch falso (scripts/golden/ai-agente.cjs). El archivo supabase/functions/ai-agent/index.ts solo lo conecta.
//
// Qué hace, en orden:
//   1. Exige la sesión de la persona (nada de la llave pública sola: así nadie de fuera puede usar tu IA).
//   2. Elige la IA: la clave propia que mandó la persona (opcional) o la del servidor (secreto GEMINI_API_KEY, etc.).
//   3. Con la clave del servidor aplica una cuota diaria por persona (tabla ai_usage, migración 0025).
//   4. Traduce la conversación al proveedor (src: _shared/aiProviders.ts) con respaldo de modelos y devuelve la respuesta.
// Nunca guarda mensajes ni respuestas: solo cuenta cuántas solicitudes hizo cada persona al día.
// Nunca responde 404: si la app recibe un 404, es que la función no está desplegada.

import {
  chatWithFallback,
  DEFAULT_MODELS,
  PROVIDER_LABELS,
  ProviderError,
  type AgentMessage,
  type ChatRequest,
  type FetchLike,
  type ProviderConfig,
  type ProviderId,
  type RawTurn,
  type ToolSpec,
} from './aiProviders.ts';

export interface AgentEnv {
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
  keys: Partial<Record<ProviderId, string>>;
  provider?: ProviderId; // secreto AI_PROVIDER, si hay claves de varios proveedores
  model?: string; // secreto AI_MODEL
  dailyLimit: number; // secreto AI_DAILY_LIMIT (solicitudes por persona al día con la clave del servidor)
  // secreto AI_ALLOWED_EMAILS (opcional, separados por coma): solo esas cuentas usan la clave del servidor. Útil si
  // cualquiera puede registrarse en tu app; el resto puede seguir usando su propia clave.
  allowedEmails?: string[];
}

const PROVIDERS: ProviderId[] = ['gemini', 'anthropic', 'openai', 'xai'];
const KEY_SECRETS: Record<ProviderId, string> = {
  gemini: 'GEMINI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  xai: 'XAI_API_KEY',
};

export function envFrom(get: (name: string) => string | undefined): AgentEnv {
  const keys: Partial<Record<ProviderId, string>> = {};
  for (const p of PROVIDERS) {
    const v = get(KEY_SECRETS[p])?.trim();
    if (v) keys[p] = v;
  }
  const provider = (get('AI_PROVIDER') ?? '').trim().toLowerCase() as ProviderId;
  const limit = Number(get('AI_DAILY_LIMIT'));
  return {
    supabaseUrl: (get('SUPABASE_URL') ?? '').replace(/\/+$/, ''),
    anonKey: get('SUPABASE_ANON_KEY') ?? '',
    serviceKey: get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    keys,
    provider: PROVIDERS.includes(provider) ? provider : undefined,
    model: get('AI_MODEL')?.trim() || undefined,
    dailyLimit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 150,
    allowedEmails: (get('AI_ALLOWED_EMAILS') ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  };
}

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const MAX_BODY_CHARS = 600_000;
const MAX_MESSAGES = 80;
const MAX_TOOLS = 24;
const MAX_SYSTEM_CHARS = 40_000;
const BYOK_PER_MINUTE = 30;

type ErrorCode =
  | 'not_signed_in'
  | 'not_allowed'
  | 'not_configured'
  | 'quota_exceeded'
  | 'bad_request'
  | 'too_large'
  | 'method_not_allowed'
  | ProviderError['code'];

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'content-type': 'application/json', ...extra } });
}

function fail(code: ErrorCode, error: string, status: number, extra: Record<string, unknown> = {}): Response {
  const retry: Record<string, string> = typeof extra.retryAfterSeconds === 'number' ? { 'Retry-After': String(extra.retryAfterSeconds) } : {};
  return json({ ok: false, v: 1, code, error, ...extra }, status, retry);
}

function serverConfig(env: AgentEnv): ProviderConfig | null {
  const provider = env.provider && env.keys[env.provider] ? env.provider : PROVIDERS.find((p) => env.keys[p]);
  if (!provider) return null;
  return { provider, apiKey: env.keys[provider]!, model: env.model };
}

function byokConfig(raw: unknown): ProviderConfig | null | 'invalid' {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const provider = String(b.provider ?? '').toLowerCase() as ProviderId;
  const apiKey = typeof b.apiKey === 'string' ? b.apiKey.trim() : '';
  if (!PROVIDERS.includes(provider) || apiKey.length < 10 || apiKey.length > 400) return 'invalid';
  const model = typeof b.model === 'string' && b.model.trim() && b.model.trim().length < 100 ? b.model.trim() : undefined;
  return { provider, apiKey, model };
}

async function userFrom(req: Request, env: AgentEnv, fetchFn: FetchLike): Promise<{ id: string; email: string } | null> {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token || token === env.anonKey) return null;
  try {
    const res = await fetchFn(`${env.supabaseUrl}/auth/v1/user`, { method: 'GET', headers: { Authorization: `Bearer ${token}`, apikey: env.anonKey } });
    if (!res.ok) return null;
    const user = JSON.parse(await res.text());
    return typeof user?.id === 'string' ? { id: user.id, email: typeof user.email === 'string' ? user.email.toLowerCase() : '' } : null;
  } catch {
    return null;
  }
}

// ---------- Cuota diaria (tabla ai_usage). Si la migración 0025 no se ha corrido, se cuenta en memoria. ----------

const memoryUsage = new Map<string, number>();
const byokBursts = new Map<string, number[]>();

function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

async function usedToday(env: AgentEnv, userId: string, day: string, fetchFn: FetchLike): Promise<number> {
  try {
    const res = await fetchFn(`${env.supabaseUrl}/rest/v1/ai_usage?user_id=eq.${userId}&day=eq.${day}&select=requests`, {
      method: 'GET',
      headers: { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}` },
    });
    if (res.ok) {
      const rows = JSON.parse(await res.text());
      return Array.isArray(rows) && rows[0] ? Number(rows[0].requests) || 0 : 0;
    }
  } catch {
    // cae a memoria
  }
  return memoryUsage.get(`${userId}:${day}`) ?? 0;
}

async function addUsage(env: AgentEnv, userId: string, day: string, inTok: number, outTok: number, fetchFn: FetchLike): Promise<void> {
  const k = `${userId}:${day}`;
  memoryUsage.set(k, (memoryUsage.get(k) ?? 0) + 1);
  if (memoryUsage.size > 10_000) memoryUsage.clear();
  try {
    await fetchFn(`${env.supabaseUrl}/rest/v1/rpc/ai_usage_add`, {
      method: 'POST',
      headers: { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p_user: userId, p_day: day, p_in: Math.round(inTok), p_out: Math.round(outTok) }),
    });
  } catch {
    // contar nunca debe tumbar la respuesta
  }
}

function byokBurstExceeded(userId: string, nowMs: number): boolean {
  const list = (byokBursts.get(userId) ?? []).filter((t) => nowMs - t < 60_000);
  list.push(nowMs);
  byokBursts.set(userId, list);
  if (byokBursts.size > 5000) byokBursts.clear();
  return list.length > BYOK_PER_MINUTE;
}

// ---------- Validación del cuerpo ----------

function validMessages(raw: unknown): AgentMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) return null;
  const out: AgentMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') return null;
    const role = (m as { role?: unknown }).role;
    if (role === 'user') {
      const text = (m as { text?: unknown }).text;
      if (typeof text !== 'string' || !text.trim()) return null;
      out.push({ role: 'user', text });
    } else if (role === 'assistant') {
      const a = m as { text?: unknown; toolCalls?: unknown; raw?: unknown };
      const toolCalls = Array.isArray(a.toolCalls)
        ? a.toolCalls.filter((c: any) => c && typeof c.id === 'string' && typeof c.name === 'string').map((c: any) => ({ id: c.id, name: c.name, args: c.args && typeof c.args === 'object' ? c.args : {} }))
        : undefined;
      const r = a.raw as Partial<RawTurn> | undefined;
      const rawTurn = r && typeof r === 'object' && typeof r.provider === 'string' && typeof r.model === 'string' ? (r as RawTurn) : undefined;
      out.push({ role: 'assistant', text: typeof a.text === 'string' ? a.text : undefined, toolCalls, raw: rawTurn });
    } else if (role === 'tool') {
      const results = (m as { results?: unknown }).results;
      if (!Array.isArray(results) || results.length === 0) return null;
      out.push({
        role: 'tool',
        results: results
          .filter((r: any) => r && typeof r.callId === 'string' && typeof r.name === 'string')
          .map((r: any) => ({ callId: r.callId, name: r.name, content: r.content ?? null })),
      });
    } else return null;
  }
  return out;
}

function validTools(raw: unknown): ToolSpec[] | undefined | null {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw) || raw.length > MAX_TOOLS) return null;
  for (const t of raw) {
    if (!t || typeof t.name !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/.test(t.name) || typeof t.description !== 'string' || !t.parameters || t.parameters.type !== 'object') {
      return null;
    }
  }
  return raw as ToolSpec[];
}

function modelLabel(cfg: ProviderConfig): string {
  return cfg.model ?? DEFAULT_MODELS[cfg.provider][0];
}

// ---------- Manejador ----------

export async function handleAgentRequest(req: Request, env: AgentEnv, deps: { fetch: FetchLike; now?: () => Date }): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return fail('method_not_allowed', 'Método no permitido.', 405);
  if (!env.supabaseUrl || !env.anonKey) return fail('not_configured', 'A la función le falta la configuración de Supabase.', 500);

  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) return fail('too_large', 'La conversación es demasiado larga. Empieza una nueva.', 413);
  let body: any;
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return fail('bad_request', 'Solicitud inválida.', 400);
  }

  const user = await userFrom(req, env, deps.fetch);
  if (!user) return fail('not_signed_in', 'Inicia sesión para usar la IA de VALU.', 401);
  const userId = user.id;

  const now = deps.now?.() ?? new Date();
  const day = dayKey(now);
  const byok = byokConfig(body.byok);
  if (byok === 'invalid') return fail('bad_request', 'La clave propia que mandaste no es válida (revisa el proveedor y la clave).', 400);
  const serverAllowed = !env.allowedEmails?.length || env.allowedEmails.includes(user.email);
  const cfg = byok ?? (serverAllowed ? serverConfig(env) : null);
  const usesServerKey = !byok;

  const action = typeof body.action === 'string' ? body.action : 'chat';

  if (action === 'status') {
    const used = usesServerKey ? await usedToday(env, userId, day, deps.fetch) : 0;
    return json({
      ok: true,
      v: 1,
      configured: Boolean(cfg),
      allowed: serverAllowed || Boolean(byok),
      byok: Boolean(byok),
      provider: cfg?.provider ?? null,
      providerLabel: cfg ? PROVIDER_LABELS[cfg.provider] : null,
      model: cfg ? modelLabel(cfg) : null,
      quota: usesServerKey ? { used, limit: env.dailyLimit, remaining: Math.max(0, env.dailyLimit - used) } : null,
    });
  }

  if (action !== 'chat' && action !== 'test') return fail('bad_request', 'Acción desconocida.', 400);
  if (!cfg && !serverAllowed) {
    return fail('not_allowed', 'La IA integrada de esta app está limitada a cuentas autorizadas. Puedes usar tu propia clave en Ajustes → IA.', 403);
  }
  if (!cfg) {
    return fail(
      'not_configured',
      'La IA integrada todavía no tiene clave: en Supabase → Edge Functions → Secrets agrega GEMINI_API_KEY (o ANTHROPIC_API_KEY / OPENAI_API_KEY).',
      503
    );
  }

  if (usesServerKey) {
    const used = await usedToday(env, userId, day, deps.fetch);
    if (used >= env.dailyLimit) {
      return fail('quota_exceeded', `Llegaste al límite diario de la IA (${env.dailyLimit} consultas). Se renueva mañana; mientras tanto VALU sigue funcionando sin IA.`, 429, {
        quota: { used, limit: env.dailyLimit, remaining: 0 },
      });
    }
  } else if (byokBurstExceeded(userId, now.getTime())) {
    return fail('provider_rate_limit', 'Demasiadas solicitudes seguidas. Espera un minuto.', 429, { retryAfterSeconds: 60 });
  }

  let chat: ChatRequest;
  if (action === 'test') {
    chat = { system: 'Eres una prueba de conexión. Responde exactamente: OK', messages: [{ role: 'user', text: 'Prueba' }], maxTokens: 400 };
  } else {
    const messages = validMessages(body.messages);
    const tools = validTools(body.tools);
    const system = typeof body.system === 'string' ? body.system : '';
    if (!messages || tools === null || !system || system.length > MAX_SYSTEM_CHARS) return fail('bad_request', 'Solicitud de chat inválida.', 400);
    chat = {
      system,
      messages,
      tools,
      toolChoice: body.toolChoice === 'none' ? 'none' : 'auto',
      maxTokens: typeof body.maxTokens === 'number' && body.maxTokens > 0 ? Math.min(8192, Math.floor(body.maxTokens)) : undefined,
      temperature: typeof body.temperature === 'number' ? Math.max(0, Math.min(1, body.temperature)) : undefined,
      json: body.json === true,
    };
  }

  try {
    const started = Date.now();
    const result = await chatWithFallback(cfg, chat, deps.fetch);
    let quota = null;
    if (usesServerKey) {
      await addUsage(env, userId, day, result.usage.inputTokens, result.usage.outputTokens, deps.fetch);
      const used = await usedToday(env, userId, day, deps.fetch);
      quota = { used, limit: env.dailyLimit, remaining: Math.max(0, env.dailyLimit - used) };
    }
    return json({
      ok: true,
      v: 1,
      provider: result.provider,
      providerLabel: PROVIDER_LABELS[result.provider],
      model: result.model,
      text: result.text,
      toolCalls: result.toolCalls,
      raw: result.raw,
      usage: result.usage,
      finishReason: result.finishReason,
      quota,
      ms: Date.now() - started,
    });
  } catch (e) {
    const err = e instanceof ProviderError ? e : new ProviderError('provider_error', 'Error inesperado al hablar con la IA.', 502);
    // Solo el código queda en los registros de Supabase: nunca el contenido de la conversación.
    console.error(`ai-agent: ${cfg.provider} ${err.code} ${err.status}`);
    const who = usesServerKey ? 'La clave de la IA integrada (secreto en Supabase)' : 'Tu clave propia';
    const message = err.code === 'provider_auth' ? `${who} no es válida o no tiene permiso. ${err.message}` : err.message;
    return fail(err.code, message, err.status, { retryAfterSeconds: err.retryAfterSeconds, provider: cfg.provider, byok: !usesServerKey });
  }
}

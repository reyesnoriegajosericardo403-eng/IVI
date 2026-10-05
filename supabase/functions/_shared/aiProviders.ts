// Traducción entre el protocolo neutral del agente de VALU (v1) y cada proveedor de IA (Gemini, Claude, OpenAI, Grok).
// Sin APIs de Deno: lo usan la función ai-agent y las pruebas en Node (scripts/golden/ai-agente.cjs).
//
// La app arma la conversación UNA sola vez en este formato neutral y el servidor la traduce. Así el agente (el bucle que
// consulta tus datos con herramientas y propone acciones) es el mismo sin importar qué IA esté detrás.

export type ProviderId = 'gemini' | 'anthropic' | 'openai' | 'xai';

export interface JsonSchema {
  type: 'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array';
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: string[];
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: JsonSchema;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

// La respuesta original del proveedor, tal cual. Se le devuelve en el siguiente paso: Gemini 3 exige recibir de vuelta
// sus "firmas de pensamiento" en las llamadas a herramientas, y con esto nunca se pierden.
export interface RawTurn {
  provider: ProviderId;
  model: string;
  content: unknown;
}

export type AgentMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text?: string; toolCalls?: ToolCall[]; raw?: RawTurn }
  | { role: 'tool'; results: Array<{ callId: string; name: string; content: unknown }> };

export interface ChatRequest {
  system: string;
  messages: AgentMessage[];
  tools?: ToolSpec[];
  // 'none': la IA ve las herramientas (y su historial) pero esta vez debe contestar con texto.
  toolChoice?: 'auto' | 'none';
  maxTokens?: number;
  temperature?: number;
  // Pide la respuesta como JSON (captura por voz). Solo cambia algo en Gemini; los demás siguen el prompt.
  json?: boolean;
}

export interface ChatResult {
  provider: ProviderId;
  model: string;
  text: string;
  toolCalls: ToolCall[];
  raw: RawTurn;
  usage: { inputTokens: number; outputTokens: number };
  finishReason: string;
}

export type ProviderErrorCode =
  | 'provider_auth' // clave inválida o sin permiso
  | 'provider_model' // el modelo no existe (o ya lo retiraron)
  | 'provider_model_quota' // ese modelo no tiene cuota en esta clave (por ejemplo, 0 en el nivel gratuito): se prueba otro
  | 'provider_rate_limit' // demasiadas solicitudes por minuto
  | 'provider_quota' // se acabó la cuota del día o el saldo de la cuenta
  | 'provider_unavailable' // el proveedor está caído o saturado
  | 'provider_blocked' // filtro de seguridad del proveedor
  | 'provider_bad_request'
  | 'provider_error';

export class ProviderError extends Error {
  code: ProviderErrorCode;
  status: number;
  retryAfterSeconds?: number;
  constructor(code: ProviderErrorCode, message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  gemini: 'Gemini (Google)',
  anthropic: 'Claude (Anthropic)',
  openai: 'ChatGPT (OpenAI)',
  xai: 'Grok (xAI)',
};

// Modelos que se prueban en orden si no se fijó uno (secreto AI_MODEL). Para Gemini se usa primero el alias "-latest",
// que Google mueve solo al modelo vigente: así no se vuelve a romper cuando retiren un modelo (como pasó con
// gemini-2.0-flash el 1 de junio de 2026 y pasará con gemini-2.5-flash el 16 de octubre de 2026).
export const DEFAULT_MODELS: Record<ProviderId, string[]> = {
  gemini: ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3-flash', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'],
  anthropic: ['claude-haiku-4-5-20251001', 'claude-sonnet-5-5'],
  openai: ['gpt-5-mini', 'gpt-4.1-mini'],
  xai: ['grok-4-fast', 'grok-3-mini'],
};

const MAX_TOOL_RESULT_CHARS = 12_000;

function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function clampText(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function toolResultText(content: unknown): string {
  const text = typeof content === 'string' ? content : JSON.stringify(content ?? null);
  return clampText(text, MAX_TOOL_RESULT_CHARS);
}

// ---------------------------------------------------------------------------------------------------------------------
// Gemini (Google AI Studio, API v1beta)
// ---------------------------------------------------------------------------------------------------------------------

// Firma "comodín" que Gemini acepta cuando una llamada a herramienta no la trae (historial que no generó ese mismo modelo).
export const GEMINI_SKIP_SIGNATURE = 'skip_thought_signature_validator';
const SYNTHETIC_ID = 'vx_';

// Gemini acepta un subconjunto de JSON Schema: se dejan solo las llaves que entiende.
export function geminiSchema(schema: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = { type: schema.type };
  if (schema.description) out.description = schema.description;
  if (schema.enum && schema.enum.length) out.enum = schema.enum;
  if (schema.type === 'array' && schema.items) out.items = geminiSchema(schema.items);
  if (schema.type === 'object') {
    const props = Object.entries(schema.properties ?? {});
    out.properties = Object.fromEntries(props.map(([k, v]) => [k, geminiSchema(v)]));
    const required = (schema.required ?? []).filter((r) => schema.properties && r in schema.properties);
    if (required.length) out.required = required;
  }
  return out;
}

function geminiStruct(content: unknown): Record<string, unknown> {
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    const text = JSON.stringify(content);
    return text.length > MAX_TOOL_RESULT_CHARS ? { resultado_recortado: clampText(text, MAX_TOOL_RESULT_CHARS) } : (content as Record<string, unknown>);
  }
  return { resultado: typeof content === 'string' ? clampText(content, MAX_TOOL_RESULT_CHARS) : content ?? null };
}

function isGeminiContent(value: unknown): value is { parts: unknown[] } {
  return !!value && typeof value === 'object' && Array.isArray((value as { parts?: unknown }).parts);
}

export function buildGeminiBody(req: ChatRequest, model: string): Record<string, unknown> {
  const contents: Array<Record<string, unknown>> = [];
  for (const m of req.messages) {
    if (m.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: m.text }] });
    } else if (m.role === 'assistant') {
      // La respuesta original del MISMO modelo se devuelve tal cual (con sus firmas de pensamiento).
      if (m.raw && m.raw.provider === 'gemini' && m.raw.model === model && isGeminiContent(m.raw.content)) {
        contents.push({ ...(m.raw.content as Record<string, unknown>), role: 'model' });
        continue;
      }
      const parts: Array<Record<string, unknown>> = [];
      if (m.text) parts.push({ text: m.text });
      (m.toolCalls ?? []).forEach((c, i) => {
        const call: Record<string, unknown> = { name: c.name, args: c.args ?? {} };
        if (!c.id.startsWith(SYNTHETIC_ID)) call.id = c.id;
        parts.push(i === 0 ? { functionCall: call, thoughtSignature: GEMINI_SKIP_SIGNATURE } : { functionCall: call });
      });
      if (parts.length) contents.push({ role: 'model', parts });
    } else {
      contents.push({
        role: 'user',
        parts: m.results.map((r) => {
          const response: Record<string, unknown> = { name: r.name, response: geminiStruct(r.content) };
          if (!r.callId.startsWith(SYNTHETIC_ID)) response.id = r.callId;
          return { functionResponse: response };
        }),
      });
    }
  }
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: req.system }] },
    contents,
  };
  if (req.tools && req.tools.length) {
    body.tools = [{ functionDeclarations: req.tools.map((t) => ({ name: t.name, description: t.description, parameters: geminiSchema(t.parameters) })) }];
    if (req.toolChoice === 'none') body.toolConfig = { functionCallingConfig: { mode: 'NONE' } };
  }
  const generationConfig: Record<string, unknown> = {};
  if (typeof req.temperature === 'number') generationConfig.temperature = req.temperature;
  if (req.json && !(req.tools && req.tools.length)) generationConfig.responseMimeType = 'application/json';
  if (Object.keys(generationConfig).length) body.generationConfig = generationConfig;
  return body;
}

export function parseGeminiResponse(json: any, model: string): ChatResult {
  const candidate = json?.candidates?.[0];
  if (!candidate) {
    if (json?.promptFeedback?.blockReason) {
      throw new ProviderError('provider_blocked', 'El filtro de seguridad de Gemini bloqueó el mensaje. Escríbelo de otra forma.', 422);
    }
    throw new ProviderError('provider_error', 'Gemini respondió sin contenido.', 502);
  }
  const content = isGeminiContent(candidate.content) ? candidate.content : { role: 'model', parts: [] };
  const parts = content.parts as any[];
  const text = parts
    .filter((p) => p && typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('')
    .trim();
  const toolCalls: ToolCall[] = parts
    .filter((p) => p && p.functionCall && typeof p.functionCall.name === 'string')
    .map((p, i) => ({
      id: typeof p.functionCall.id === 'string' && p.functionCall.id ? p.functionCall.id : `${SYNTHETIC_ID}${i}`,
      name: p.functionCall.name,
      args: p.functionCall.args && typeof p.functionCall.args === 'object' ? p.functionCall.args : {},
    }));
  if (!text && toolCalls.length === 0 && candidate.finishReason === 'SAFETY') {
    throw new ProviderError('provider_blocked', 'El filtro de seguridad de Gemini bloqueó la respuesta. Escríbelo de otra forma.', 422);
  }
  const usage = json?.usageMetadata ?? {};
  return {
    provider: 'gemini',
    model,
    text,
    toolCalls,
    raw: { provider: 'gemini', model, content },
    usage: {
      inputTokens: Number(usage.promptTokenCount) || 0,
      outputTokens: (Number(usage.candidatesTokenCount) || 0) + (Number(usage.thoughtsTokenCount) || 0),
    },
    finishReason: String(candidate.finishReason ?? 'STOP'),
  };
}

function retryDelaySeconds(body: any): number | undefined {
  const details: any[] = Array.isArray(body?.error?.details) ? body.error.details : [];
  for (const d of details) {
    const m = typeof d?.retryDelay === 'string' ? d.retryDelay.match(/^(\d+(?:\.\d+)?)s$/) : null;
    if (m) return Math.ceil(Number(m[1]));
  }
  return undefined;
}

export function geminiError(status: number, bodyText: string): ProviderError {
  const body = safeJsonParse(bodyText);
  const message: string = body?.error?.message ?? bodyText.slice(0, 300);
  const reasons = JSON.stringify(body?.error?.details ?? []);
  if (/API_KEY_INVALID|API key not valid|API_KEY_SERVICE_BLOCKED/i.test(message + reasons) || status === 401 || status === 403) {
    return new ProviderError('provider_auth', 'La clave de Gemini no es válida o no tiene permiso para usar la API de Gemini.', 502);
  }
  if (status === 404) return new ProviderError('provider_model', `Ese modelo de Gemini ya no existe: ${message}`, 502);
  if (status === 429) {
    // "limit: 0" = ese modelo no tiene cuota gratuita en esta clave: conviene probar otro modelo, no esperar.
    if (/limit:\s*0\b/i.test(message) || /"quotaValue":\s*"0"/.test(reasons)) {
      return new ProviderError('provider_model_quota', 'Ese modelo no tiene cuota disponible con esta clave.', 503);
    }
    if (/per ?day|PerDay|daily/i.test(message + reasons)) {
      return new ProviderError('provider_quota', 'Se acabó la cuota diaria de Gemini de esta clave. Se renueva cada día.', 503, retryDelaySeconds(body));
    }
    return new ProviderError('provider_rate_limit', 'Gemini recibió demasiadas solicitudes seguidas. Intenta en unos segundos.', 503, retryDelaySeconds(body) ?? 20);
  }
  if (status >= 500) return new ProviderError('provider_unavailable', 'Gemini está saturado o no disponible en este momento.', 503, 10);
  if (/location is not supported|FAILED_PRECONDITION/i.test(message)) {
    return new ProviderError('provider_unavailable', 'Gemini no está disponible desde la región del servidor.', 503);
  }
  return new ProviderError('provider_bad_request', `Gemini rechazó la solicitud: ${clampText(message, 240)}`, 502);
}

// Lista los modelos que esta clave puede usar para generar texto (sin el prefijo "models/").
export async function listGeminiModels(apiKey: string, fetchFn: FetchLike): Promise<string[] | null> {
  try {
    const res = await fetchFn('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
      method: 'GET',
      headers: { 'x-goog-api-key': apiKey },
    });
    if (!res.ok) return null;
    const json = safeJsonParse(await res.text());
    const models: any[] = Array.isArray(json?.models) ? json.models : [];
    return models
      .filter((m) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => String(m.name ?? '').replace(/^models\//, ''))
      .filter(Boolean);
  } catch {
    return null;
  }
}

const NOT_CHAT = /(image|tts|audio|live|embed|robotics|computer|native|veo|imagen|aqa|learnlm|gemma)/i;

function versionOf(name: string): number {
  const m = name.match(/gemini-(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

// De los modelos disponibles, los más adecuados para el agente: primero los conocidos en su orden, luego el "flash"
// estable más nuevo, y al final los "flash" en vista previa.
export function rankGeminiModels(available: string[], preferred: string[]): string[] {
  const set = new Set(available);
  const known = preferred.filter((m) => set.has(m));
  const flash = available
    .filter((m) => /flash/i.test(m) && !NOT_CHAT.test(m) && !known.includes(m))
    .sort((a, b) => {
      const pa = /preview|exp/i.test(a) ? 1 : 0;
      const pb = /preview|exp/i.test(b) ? 1 : 0;
      if (pa !== pb) return pa - pb;
      const la = /lite/i.test(a) ? 1 : 0;
      const lb = /lite/i.test(b) ? 1 : 0;
      if (la !== lb) return la - lb;
      return versionOf(b) - versionOf(a);
    });
  return [...known, ...flash];
}

// ---------------------------------------------------------------------------------------------------------------------
// Claude (Anthropic Messages API)
// ---------------------------------------------------------------------------------------------------------------------

type AnthropicMessage = { role: 'user' | 'assistant'; content: unknown[] };

export function buildAnthropicBody(req: ChatRequest, model: string): Record<string, unknown> {
  const messages: AnthropicMessage[] = [];
  const push = (role: 'user' | 'assistant', blocks: unknown[]) => {
    if (!blocks.length) return;
    const last = messages[messages.length - 1];
    if (last && last.role === role) last.content.push(...blocks);
    else messages.push({ role, content: [...blocks] });
  };
  for (const m of req.messages) {
    if (m.role === 'user') push('user', [{ type: 'text', text: m.text }]);
    else if (m.role === 'assistant') {
      if (m.raw && m.raw.provider === 'anthropic' && Array.isArray(m.raw.content)) {
        push('assistant', m.raw.content as unknown[]);
        continue;
      }
      const blocks: unknown[] = [];
      if (m.text) blocks.push({ type: 'text', text: m.text });
      for (const c of m.toolCalls ?? []) blocks.push({ type: 'tool_use', id: c.id, name: c.name, input: c.args ?? {} });
      push('assistant', blocks);
    } else {
      push(
        'user',
        m.results.map((r) => ({ type: 'tool_result', tool_use_id: r.callId, content: toolResultText(r.content) }))
      );
    }
  }
  const body: Record<string, unknown> = {
    model,
    max_tokens: req.maxTokens ?? 2048,
    system: req.system,
    messages,
  };
  if (req.tools && req.tools.length) {
    body.tools = req.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));
    if (req.toolChoice === 'none') body.tool_choice = { type: 'none' };
  }
  if (typeof req.temperature === 'number') body.temperature = req.temperature;
  return body;
}

export function parseAnthropicResponse(json: any, model: string): ChatResult {
  const blocks: any[] = Array.isArray(json?.content) ? json.content : [];
  const text = blocks
    .filter((b) => b?.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('')
    .trim();
  const toolCalls: ToolCall[] = blocks
    .filter((b) => b?.type === 'tool_use' && typeof b.name === 'string')
    .map((b) => ({ id: String(b.id), name: b.name, args: b.input && typeof b.input === 'object' ? b.input : {} }));
  return {
    provider: 'anthropic',
    model,
    text,
    toolCalls,
    raw: { provider: 'anthropic', model, content: blocks },
    usage: { inputTokens: Number(json?.usage?.input_tokens) || 0, outputTokens: Number(json?.usage?.output_tokens) || 0 },
    finishReason: String(json?.stop_reason ?? 'end_turn'),
  };
}

export function anthropicError(status: number, bodyText: string): ProviderError {
  const body = safeJsonParse(bodyText);
  const message: string = body?.error?.message ?? bodyText.slice(0, 300);
  if (status === 401 || status === 403) return new ProviderError('provider_auth', 'La clave de Claude no es válida o no tiene permiso.', 502);
  if (status === 404) return new ProviderError('provider_model', `Ese modelo de Claude no existe: ${message}`, 502);
  if (status === 429) return new ProviderError('provider_rate_limit', 'Claude recibió demasiadas solicitudes seguidas. Intenta en unos segundos.', 503, 20);
  if (status === 529 || status >= 500) return new ProviderError('provider_unavailable', 'Claude está saturado o no disponible en este momento.', 503, 10);
  if (/credit balance|billing/i.test(message)) return new ProviderError('provider_quota', 'La cuenta de Anthropic no tiene saldo.', 503);
  return new ProviderError('provider_bad_request', `Claude rechazó la solicitud: ${clampText(message, 240)}`, 502);
}

// ---------------------------------------------------------------------------------------------------------------------
// OpenAI y Grok (Chat Completions, mismo formato)
// ---------------------------------------------------------------------------------------------------------------------

export function buildOpenAIBody(req: ChatRequest, model: string, provider: 'openai' | 'xai'): Record<string, unknown> {
  const messages: unknown[] = [{ role: 'system', content: req.system }];
  for (const m of req.messages) {
    if (m.role === 'user') messages.push({ role: 'user', content: m.text });
    else if (m.role === 'assistant') {
      if (m.raw && m.raw.provider === provider && m.raw.content && typeof m.raw.content === 'object') {
        messages.push(m.raw.content);
        continue;
      }
      const msg: Record<string, unknown> = { role: 'assistant', content: m.text ?? null };
      if (m.toolCalls && m.toolCalls.length) {
        msg.tool_calls = m.toolCalls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.args ?? {}) } }));
      }
      messages.push(msg);
    } else {
      for (const r of m.results) messages.push({ role: 'tool', tool_call_id: r.callId, content: toolResultText(r.content) });
    }
  }
  const body: Record<string, unknown> = { model, messages };
  if (req.tools && req.tools.length) {
    body.tools = req.tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));
    if (req.toolChoice === 'none') body.tool_choice = 'none';
  }
  // Los modelos de razonamiento de OpenAI no aceptan max_tokens ni temperatura; se manda solo el límite nuevo.
  if (provider === 'openai') body.max_completion_tokens = req.maxTokens ?? 4096;
  else if (typeof req.temperature === 'number') body.temperature = req.temperature;
  return body;
}

export function parseOpenAIResponse(json: any, model: string, provider: 'openai' | 'xai'): ChatResult {
  const choice = json?.choices?.[0];
  const message = choice?.message ?? { role: 'assistant', content: '' };
  const toolCalls: ToolCall[] = (Array.isArray(message.tool_calls) ? message.tool_calls : [])
    .filter((c: any) => c?.function?.name)
    .map((c: any) => ({ id: String(c.id), name: c.function.name, args: safeJsonParse(c.function.arguments ?? '{}') ?? {} }));
  return {
    provider,
    model,
    text: typeof message.content === 'string' ? message.content.trim() : '',
    toolCalls,
    raw: { provider, model, content: message },
    usage: { inputTokens: Number(json?.usage?.prompt_tokens) || 0, outputTokens: Number(json?.usage?.completion_tokens) || 0 },
    finishReason: String(choice?.finish_reason ?? 'stop'),
  };
}

export function openAIError(status: number, bodyText: string, provider: 'openai' | 'xai'): ProviderError {
  const label = provider === 'openai' ? 'ChatGPT' : 'Grok';
  const body = safeJsonParse(bodyText);
  const message: string = body?.error?.message ?? bodyText.slice(0, 300);
  const code: string = body?.error?.code ?? '';
  if (status === 401 || status === 403) return new ProviderError('provider_auth', `La clave de ${label} no es válida o no tiene permiso.`, 502);
  if (status === 404 || code === 'model_not_found') return new ProviderError('provider_model', `Ese modelo de ${label} no existe: ${message}`, 502);
  if (status === 429) {
    if (code === 'insufficient_quota' || /quota|billing|credits/i.test(message)) return new ProviderError('provider_quota', `La cuenta de ${label} no tiene saldo o cuota.`, 503);
    return new ProviderError('provider_rate_limit', `${label} recibió demasiadas solicitudes seguidas. Intenta en unos segundos.`, 503, 20);
  }
  if (status >= 500) return new ProviderError('provider_unavailable', `${label} está saturado o no disponible en este momento.`, 503, 10);
  return new ProviderError('provider_bad_request', `${label} rechazó la solicitud: ${clampText(message, 240)}`, 502);
}

// ---------------------------------------------------------------------------------------------------------------------
// Llamada con respaldo de modelos
// ---------------------------------------------------------------------------------------------------------------------

export interface ProviderConfig {
  provider: ProviderId;
  apiKey: string;
  model?: string; // fijo (secreto AI_MODEL o el que eligió la persona); si falla por modelo, se prueban los de respaldo
}

// Último modelo que funcionó con cada clave (en memoria de la función: se pierde al reiniciarse, y no pasa nada).
const workingModel = new Map<string, string>();

function keyFingerprint(cfg: ProviderConfig): string {
  return `${cfg.provider}:${cfg.apiKey.slice(-8)}:${cfg.apiKey.length}`;
}

export function resetModelCache(): void {
  workingModel.clear();
}

async function callOnce(cfg: ProviderConfig, model: string, req: ChatRequest, fetchFn: FetchLike): Promise<ChatResult> {
  let url: string;
  let headers: Record<string, string>;
  let body: Record<string, unknown>;
  if (cfg.provider === 'gemini') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    headers = { 'content-type': 'application/json', 'x-goog-api-key': cfg.apiKey };
    body = buildGeminiBody(req, model);
  } else if (cfg.provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'content-type': 'application/json', 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' };
    body = buildAnthropicBody(req, model);
  } else {
    url = cfg.provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.x.ai/v1/chat/completions';
    headers = { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` };
    body = buildOpenAIBody(req, model, cfg.provider);
  }

  let res;
  try {
    res = await fetchFn(url, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch {
    throw new ProviderError('provider_unavailable', 'No se pudo contactar al proveedor de IA.', 503, 5);
  }
  const text = await res.text();
  if (!res.ok) {
    if (cfg.provider === 'gemini') throw geminiError(res.status, text);
    if (cfg.provider === 'anthropic') throw anthropicError(res.status, text);
    throw openAIError(res.status, text, cfg.provider);
  }
  const json = safeJsonParse(text);
  if (!json) throw new ProviderError('provider_error', 'El proveedor de IA devolvió una respuesta ilegible.', 502);
  if (cfg.provider === 'gemini') return parseGeminiResponse(json, model);
  if (cfg.provider === 'anthropic') return parseAnthropicResponse(json, model);
  return parseOpenAIResponse(json, model, cfg.provider);
}

const SWITCH_MODEL: ProviderErrorCode[] = ['provider_model', 'provider_model_quota', 'provider_unavailable'];
const MAX_MODEL_ATTEMPTS = 4;

// Llama al proveedor; si el modelo ya no existe, no tiene cuota en esta clave o está saturado, prueba el siguiente.
export async function chatWithFallback(cfg: ProviderConfig, req: ChatRequest, fetchFn: FetchLike): Promise<ChatResult> {
  const fp = keyFingerprint(cfg);
  const defaults = DEFAULT_MODELS[cfg.provider];
  let order = [...new Set([...(cfg.model ? [cfg.model] : []), ...(workingModel.has(fp) ? [workingModel.get(fp)!] : []), ...defaults])];
  let listed = false;
  let lastError: ProviderError | null = null;
  const tried = new Set<string>();

  for (let attempt = 0; attempt < MAX_MODEL_ATTEMPTS && order.length; ) {
    const model = order.shift()!;
    if (tried.has(model)) continue;
    tried.add(model);
    attempt++;
    try {
      const result = await callOnce(cfg, model, req, fetchFn);
      workingModel.set(fp, model);
      return result;
    } catch (e) {
      const err = e instanceof ProviderError ? e : new ProviderError('provider_error', 'Error inesperado del proveedor de IA.', 502);
      lastError = err;
      if (!SWITCH_MODEL.includes(err.code)) throw err;
      if (workingModel.get(fp) === model) workingModel.delete(fp);
      // Con Gemini se pregunta UNA vez qué modelos tiene esta clave, para no adivinar nombres.
      if (cfg.provider === 'gemini' && !listed && err.code !== 'provider_unavailable') {
        listed = true;
        const available = await listGeminiModels(cfg.apiKey, fetchFn);
        if (available && available.length) order = rankGeminiModels(available, [...order, ...defaults]).filter((m) => !tried.has(m));
      }
    }
  }
  throw lastError ?? new ProviderError('provider_error', 'No hay ningún modelo disponible con esta clave.', 502);
}

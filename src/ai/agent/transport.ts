import { getLLMProviderConfig } from '@/providers/llm/secureConfig';
import type { LLMProviderId } from '@/providers/llm/types';
import { isSupabaseConfigured, supabase, supabaseAnonPublicKey, supabaseProjectUrl } from '@/services/supabase/client';

import { AgentError, type AgentChatResponse, type AgentErrorCode, type AgentMessage, type AgentStatus, type ToolSpec } from './protocol';

// Única puerta de la app hacia la IA: la función ai-agent de tu Supabase. Lleva la sesión de la persona (sin sesión no
// hay IA) y, si la persona conectó su propia clave en Ajustes → IA, la manda para que se use esa en vez de la del servidor.

const REQUEST_TIMEOUT_MS = 60_000;

const BYOK_PROVIDER: Record<LLMProviderId, string> = { claude: 'anthropic', openai: 'openai', gemini: 'gemini', grok: 'xai' };

export interface AgentChatPayload {
  system: string;
  messages: AgentMessage[];
  tools?: ToolSpec[];
  toolChoice?: 'auto' | 'none';
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
}

// Modelos que ya no existen (Google retiró gemini-2.0-flash el 1 de junio de 2026): si quedaron guardados de antes, se
// ignoran y el servidor elige el vigente.
export const RETIRED_MODEL = /^(gemini-(1\.|2\.0)|gpt-4o-mini$|gpt-3\.5|claude-(2|3|instant))/i;

export function usableModel(model: string | undefined): string | undefined {
  const m = (model ?? '').trim();
  return m && !RETIRED_MODEL.test(m) ? m : undefined;
}

async function byokPayload(): Promise<Record<string, unknown> | undefined> {
  const cfg = await getLLMProviderConfig().catch(() => null);
  if (!cfg || !cfg.apiKey) return undefined;
  const model = usableModel(cfg.model);
  return { provider: BYOK_PROVIDER[cfg.provider], apiKey: cfg.apiKey, ...(model ? { model } : {}) };
}

async function post(body: Record<string, unknown>): Promise<any> {
  if (!isSupabaseConfigured || !supabase || !supabaseProjectUrl) {
    throw new AgentError('no_backend', 'La IA de VALU necesita la nube (Supabase) conectada.');
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AgentError('not_signed_in', 'Inicia sesión para usar la IA de VALU.');

  const byok = await byokPayload();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  let res: Response;
  try {
    res = await fetch(`${supabaseProjectUrl.replace(/\/+$/, '')}/functions/v1/ai-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: supabaseAnonPublicKey ?? '' },
      body: JSON.stringify({ v: 1, ...body, ...(byok ? { byok } : {}) }),
      signal: controller?.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new AgentError('timeout', 'La IA tardó demasiado en responder.');
    throw new AgentError('offline', 'Sin conexión con la IA.');
  } finally {
    if (timer) clearTimeout(timer);
  }

  const json = await res.json().catch(() => null);
  if (res.ok && json?.ok) return json;
  // La función nunca responde 404: un 404 significa que no está desplegada en Supabase.
  if (res.status === 404) {
    throw new AgentError('not_deployed', 'La función ai-agent no está desplegada en tu Supabase (GitHub → Actions → «Desplegar funciones de Supabase» → ai-agent).', 404);
  }
  const code = (typeof json?.code === 'string' ? json.code : 'unknown') as AgentErrorCode;
  const message = typeof json?.error === 'string' ? json.error : `La IA respondió con un error (${res.status}).`;
  throw new AgentError(code, message, res.status, typeof json?.retryAfterSeconds === 'number' ? json.retryAfterSeconds : undefined);
}

export async function agentChat(payload: AgentChatPayload): Promise<AgentChatResponse> {
  const json = await post({ action: 'chat', ...payload });
  return {
    provider: json.provider,
    providerLabel: json.providerLabel ?? json.provider,
    model: json.model,
    text: typeof json.text === 'string' ? json.text : '',
    toolCalls: Array.isArray(json.toolCalls) ? json.toolCalls : [],
    raw: json.raw,
    finishReason: json.finishReason ?? '',
    quota: json.quota ?? null,
  };
}

let statusCache: { at: number; value: AgentStatus } | null = null;
const STATUS_TTL_MS = 60_000;

export async function agentStatus(force = false): Promise<AgentStatus> {
  if (!force && statusCache && Date.now() - statusCache.at < STATUS_TTL_MS) return statusCache.value;
  const json = await post({ action: 'status' });
  const value: AgentStatus = {
    configured: Boolean(json.configured),
    allowed: json.allowed !== false,
    byok: Boolean(json.byok),
    provider: json.provider ?? null,
    providerLabel: json.providerLabel ?? null,
    model: json.model ?? null,
    quota: json.quota ?? null,
  };
  statusCache = { at: Date.now(), value };
  return value;
}

export function forgetAgentStatus(): void {
  statusCache = null;
}

// «Probar conexión»: una respuesta mínima de la IA de verdad, con el modelo que respondió.
export async function agentTest(): Promise<{ providerLabel: string; model: string; ms: number }> {
  const started = Date.now();
  const json = await post({ action: 'test' });
  forgetAgentStatus();
  return { providerLabel: json.providerLabel ?? json.provider, model: json.model, ms: Date.now() - started };
}

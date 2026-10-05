// Protocolo neutral (v1) entre la app y la función ai-agent. Es la MISMA forma que define el servidor en
// supabase/functions/_shared/aiProviders.ts (allí está el detalle por proveedor); si cambia una, cambia la otra.

export type AgentProviderId = 'gemini' | 'anthropic' | 'openai' | 'xai';

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

export interface RawTurn {
  provider: AgentProviderId;
  model: string;
  content: unknown;
}

export type AgentMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text?: string; toolCalls?: ToolCall[]; raw?: RawTurn }
  | { role: 'tool'; results: Array<{ callId: string; name: string; content: unknown }> };

export interface AgentQuota {
  used: number;
  limit: number;
  remaining: number;
}

export interface AgentChatResponse {
  provider: AgentProviderId;
  providerLabel: string;
  model: string;
  text: string;
  toolCalls: ToolCall[];
  raw: RawTurn;
  finishReason: string;
  quota: AgentQuota | null;
}

export interface AgentStatus {
  configured: boolean;
  allowed: boolean; // false: la IA integrada está limitada a otras cuentas (se puede usar una clave propia)
  byok: boolean;
  provider: AgentProviderId | null;
  providerLabel: string | null;
  model: string | null;
  quota: AgentQuota | null;
}

// Errores que la app distingue para explicar qué pasa y quién lo arregla.
export type AgentErrorCode =
  | 'no_backend' // la app no tiene Supabase conectado
  | 'not_signed_in'
  | 'not_allowed' // la IA integrada está limitada a otras cuentas (AI_ALLOWED_EMAILS)
  | 'not_deployed' // la función ai-agent no está desplegada (404)
  | 'not_configured' // falta la clave de IA en los secretos de Supabase
  | 'quota_exceeded'
  | 'offline'
  | 'timeout'
  | 'provider_auth'
  | 'provider_model'
  | 'provider_model_quota'
  | 'provider_rate_limit'
  | 'provider_quota'
  | 'provider_unavailable'
  | 'provider_blocked'
  | 'provider_bad_request'
  | 'provider_error'
  | 'bad_request'
  | 'unknown';

export class AgentError extends Error {
  code: AgentErrorCode;
  status: number;
  retryAfterSeconds?: number;
  constructor(code: AgentErrorCode, message: string, status = 0, retryAfterSeconds?: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// Errores que no se arreglan reintentando en este momento (configuración o cuenta): se muestran tal cual.
export const SETUP_ERRORS: AgentErrorCode[] = ['no_backend', 'not_signed_in', 'not_allowed', 'not_deployed', 'not_configured', 'provider_auth'];

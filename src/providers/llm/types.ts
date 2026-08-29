// BYOK (Bring Your Own Key): cada usuario conecta la IA que ya paga —
// nunca la nuestra. Esto evita que el costo de uso de IA recaiga sobre
// nosotros cuando la app tenga más de un usuario, y evita que un futuro
// usuario dependa de una cuenta o suscripción nuestra.

export type LLMProviderId = 'claude' | 'openai' | 'gemini' | 'grok';

export interface LLMProviderConfig {
  provider: LLMProviderId;
  apiKey: string;
  model: string;
}

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Contrato mínimo que cualquier proveedor de modelo de lenguaje debe
// cumplir. El resto de la app (copiloto, intérprete de captura) solo habla
// con esto — nunca con el SDK o la forma de request/response de un
// proveedor específico (spec 80, 81).
export interface LLMClient {
  chat(systemPrompt: string, messages: LLMMessage[]): Promise<string>;
}

export const LLM_PROVIDER_LABELS: Record<LLMProviderId, string> = {
  claude: 'Claude (Anthropic)',
  openai: 'ChatGPT (OpenAI)',
  gemini: 'Gemini (Google)',
  grok: 'Grok (xAI)',
};

// Modelo por defecto sugerido — el usuario siempre puede escribir otro.
// Se favorece el modelo más pequeño/económico de cada familia, ya que el
// copiloto financiero y el intérprete de captura son tareas simples.
export const LLM_PROVIDER_DEFAULT_MODEL: Record<LLMProviderId, string> = {
  claude: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  grok: 'grok-4-fast',
};

export const LLM_PROVIDER_KEY_HELP: Record<LLMProviderId, string> = {
  claude: 'Consigue tu clave en console.anthropic.com → API Keys.',
  openai: 'Consigue tu clave en platform.openai.com → API keys.',
  gemini: 'Consigue tu clave gratis en aistudio.google.com → Get API key.',
  grok: 'Consigue tu clave en console.x.ai → API Keys.',
};

// Aviso honesto de costo antes de que el usuario pegue su clave — para que
// nadie se lleve la sorpresa de un cobro inesperado (spec: el usuario ya
// vivió esto y pidió que quedara claro de antemano).
export const LLM_PROVIDER_HAS_FREE_TIER: Record<LLMProviderId, boolean> = {
  claude: false,
  openai: false,
  gemini: true,
  grok: false,
};

export const LLM_PROVIDER_COST_NOTE: Record<LLMProviderId, string> = {
  claude:
    'Requiere una cuenta de Anthropic con saldo cargado (no tiene nivel gratuito). Cada mensaje tiene un costo muy bajo, pero real, que se cobra a tu cuenta — nunca a VALU.',
  openai:
    'Requiere una cuenta de OpenAI con saldo cargado (no tiene nivel gratuito). Cada mensaje tiene un costo muy bajo, pero real, que se cobra a tu cuenta — nunca a VALU.',
  gemini:
    'Google ofrece un nivel gratuito generoso para este modelo — es la opción recomendada si no quieres arriesgar ningún cobro.',
  grok:
    'Requiere una cuenta de xAI con saldo cargado (no tiene nivel gratuito). Cada mensaje tiene un costo muy bajo, pero real, que se cobra a tu cuenta — nunca a VALU.',
};

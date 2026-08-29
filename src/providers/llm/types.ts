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

// Guía completa para conseguir la clave — pensada para alguien que nunca
// ha oído la palabra "API": a dónde ir, qué tocar, cómo se ve la clave y
// qué hacer con ella. El usuario pidió esto explícitamente después de
// perderse buscando la de Gemini.
export interface LLMProviderKeyGuide {
  url: string;
  urlLabel: string;
  steps: string[];
  warning?: string;
}

export const LLM_PROVIDER_KEY_GUIDE: Record<LLMProviderId, LLMProviderKeyGuide> = {
  claude: {
    url: 'https://console.anthropic.com/settings/keys',
    urlLabel: 'console.anthropic.com',
    steps: [
      'Toca el botón de abajo — te lleva directo a la página de claves de Anthropic.',
      'Inicia sesión o crea una cuenta (con tu correo o con Google).',
      'Toca "Create Key", ponle el nombre que quieras (ej. "VALU").',
      'Copia la clave que aparece — empieza con "sk-ant-" — es tu única oportunidad de verla completa.',
      'Regresa a esta pantalla y pégala abajo en "Pega tu API key aquí".',
    ],
  },
  openai: {
    url: 'https://platform.openai.com/api-keys',
    urlLabel: 'platform.openai.com',
    steps: [
      'Toca el botón de abajo — te lleva directo a la página de claves de OpenAI.',
      'Inicia sesión o crea una cuenta.',
      'Toca "Create new secret key", ponle el nombre que quieras (ej. "VALU").',
      'Copia la clave que aparece — empieza con "sk-" — es tu única oportunidad de verla completa.',
      'Regresa a esta pantalla y pégala abajo en "Pega tu API key aquí".',
    ],
  },
  gemini: {
    url: 'https://aistudio.google.com/apikey',
    urlLabel: 'aistudio.google.com',
    steps: [
      'Toca el botón de abajo — te lleva directo a Google AI Studio (no es Google Cloud, es la versión gratuita).',
      'Inicia sesión con tu cuenta de Google normal (la misma de tu Gmail).',
      'Toca "Create API key" ("Crear clave de API"). Si te pide elegir o crear un proyecto, acepta la opción automática — no hay que pagar nada.',
      'Copia la clave que aparece — empieza con "AIza".',
      'Regresa a esta pantalla y pégala abajo en "Pega tu API key aquí".',
    ],
    warning:
      'Si la página te pide una tarjeta o menciona un cobro mensual, no es la correcta — asegúrate de que la dirección diga aistudio.google.com y no console.cloud.google.com.',
  },
  grok: {
    url: 'https://console.x.ai',
    urlLabel: 'console.x.ai',
    steps: [
      'Toca el botón de abajo — te lleva directo a la consola de xAI.',
      'Inicia sesión con tu cuenta de X (Twitter) o crea una nueva.',
      'Ve a "API Keys" y toca "Create API key".',
      'Copia la clave que aparece — empieza con "xai-".',
      'Regresa a esta pantalla y pégala abajo en "Pega tu API key aquí".',
    ],
  },
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

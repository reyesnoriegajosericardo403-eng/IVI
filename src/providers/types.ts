import type { InterpretedMessage, PendingClarification } from '@/ai/chatTypes';
import type { ParsedCapture } from '@/ai/localParser';
import type { CopilotContext } from '@/ai/localCopilot';
import type { Currency, RecurringRule, Reminder, TemplateBudgetLine, Transaction } from '@/data/types';

// Contratos que cualquier proveedor externo debe cumplir. La UI y la
// lógica de negocio SOLO conocen estas interfaces — nunca un SDK de un
// proveedor específico. Cambiar de proveedor (o pasar de la
// implementación local a una real en la nube) es cuestión de registrar
// una nueva implementación aquí, sin tocar pantallas (spec 80, 81).

export interface AIInterpreterProvider {
  name: string;
  parseCaptureText(text: string): Promise<ParsedCapture>;
}

export interface CopilotProvider {
  name: string;
  answerQuestion(question: string, ctx: CopilotContext): Promise<string>;
}

// Mismo contexto que el copiloto de lectura, más lo que hace falta para
// resolver acciones sobre datos reales (src/ai/actionCatalog.ts) — la
// plantilla de presupuesto por defecto, para poder resolver/mostrar sus
// montos actuales.
export interface ActionAgentContext extends CopilotContext {
  templateBudgetLines: TemplateBudgetLine[];
  // P3 (opcionales): lo previsto todavía abierto, los pagos recurrentes y los avisos, para poder resolverlos por nombre.
  forecasts?: Transaction[];
  recurringRules?: RecurringRule[];
  reminders?: Reminder[];
}

// Chat con capacidad de proponer una acción sobre datos (spec: "modificar,
// quitar o agregar datos... solo la parte externa y de datos, no se tiene
// que modificar nada de código"). `action`/`summary` solo vienen cuando de
// verdad se validó una acción contra datos reales — nunca se aplican
// solos, quien los recibe siempre debe pedir confirmación explícita antes
// (ver ChatActionCard.tsx).
export interface InterpretOptions {
  pending?: PendingClarification;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  onProgress?: (label: string) => void;
}

export interface ActionAgentProvider {
  name: string;
  // `pending`: la pregunta de aclaración abierta de este chat, si la hay — el texto puede ser su respuesta.
  // `history`: lo último de la conversación (el agente de IA lo usa como contexto). `onProgress`: qué está haciendo.
  interpretMessage(text: string, ctx: ActionAgentContext, opts?: InterpretOptions): Promise<InterpretedMessage>;
}

export interface MarketQuote {
  ticker: string;
  price: number;
  previousClose: number | null;
  asOf: string;
  source: string;
  // true cuando el precio devuelto es el último que se pudo obtener,
  // pero la consulta más reciente falló o el mercado está cerrado — se
  // sigue mostrando (nunca se inventa uno nuevo), solo se avisa que no
  // es de este instante.
  stale: boolean;
}

// Tasa oficial de CETES por término (Banxico) — no es un precio de
// mercado por unidad: los CETES no cotizan de forma continua como una
// acción, se liquidan a su valor nominal al vencimiento. Se muestra como
// tasa, nunca como un "precio inventado" para poder calcular una
// ganancia/pérdida que no existe.
export interface CetesRates {
  d28: number | null;
  d91: number | null;
  d182: number | null;
  d364: number | null;
  asOf: string | null;
  source: string;
}

export interface MarketDataProvider {
  name: string;
  // Cotiza varios tickers de una sola vez (más eficiente que uno por
  // uno). Cada entrada es null cuando no hay una fuente real conectada
  // todavía o el ticker no se pudo resolver — nunca se inventa un precio
  // (spec 17, 42). Puede combinar más de un proveedor por dentro (spec:
  // "quiero que sean dos proveedores diferentes que corran... al mismo
  // tiempo") — a la app solo le importa el resultado final.
  getQuotes(tickers: string[]): Promise<Record<string, MarketQuote | null>>;
  // Tasa vigente de CETES, o null si no hay fuente conectada todavía.
  getCetesRates(): Promise<CetesRates | null>;
}

export interface ExchangeRateInfo {
  rate: number;
  isLive: boolean;
  source: string;
  updatedAt: string;
}

export interface ExchangeRateProvider {
  name: string;
  getRate(from: Currency, to: Currency): Promise<ExchangeRateInfo>;
}

// Avisos al teléfono (contrato de docs/03_fase2_contratos_v1.md §7). Hoy la
// única implementación es Web Push para la PWA instalada; una app nativa
// futura registraría aquí su propia implementación (expo-notifications)
// sin tocar la pantalla de Notificaciones.
export type NotificationSupport =
  | { supported: true }
  | { supported: false; reason: 'native_pending' | 'no_backend' | 'unsupported_browser' | 'ios_needs_install' | 'signed_out' };

export type NotificationPermission = 'granted' | 'denied' | 'default';

export interface NotificationProvider {
  name: string;
  getSupport(isSignedIn: boolean): NotificationSupport;
  getPermission(): NotificationPermission;
  isSubscribed(): Promise<boolean>;
  // Debe llamarse desde un toque del usuario (iOS lo exige para pedir permiso).
  enable(): Promise<{ ok: true } | { ok: false; error: string }>;
  disable(): Promise<void>;
  sendTest(): Promise<{ ok: true; delivered: number } | { ok: false; error: string }>;
}

export interface SpeechToTextProvider {
  name: string;
  isAvailable(): boolean;
  startListening(handlers: {
    // Texto final acumulado hasta ahora (crece conforme el usuario habla
    // varias frases seguidas en una sola grabación).
    onResult: (transcript: string) => void;
    // Texto parcial de la frase actual, para reflejarlo en pantalla en
    // vivo mientras el usuario todavía está hablando (spec: "que mientras
    // se vaya hablando se vaya reflejando en la pantalla").
    onInterim?: (transcript: string) => void;
    onError: (message: string) => void;
    onEnd: () => void;
  }): (() => void) | null;
}

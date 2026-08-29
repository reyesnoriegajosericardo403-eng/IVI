import type { ParsedCapture } from '@/ai/localParser';
import type { CopilotContext } from '@/ai/localCopilot';
import type { Currency } from '@/data/types';

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

export interface MarketQuote {
  ticker: string;
  price: number;
  currency: Currency;
  asOf: string;
  source: string;
}

export interface MarketDataProvider {
  name: string;
  // null cuando no hay una fuente real conectada todavía — nunca se
  // inventa un precio (spec 17, 42).
  getQuote(ticker: string): Promise<MarketQuote | null>;
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

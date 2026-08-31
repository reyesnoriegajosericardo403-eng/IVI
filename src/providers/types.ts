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

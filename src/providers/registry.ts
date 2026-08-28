import { localAIInterpreterProvider } from './local/localAIInterpreter';
import { localCopilotProvider } from './local/localCopilotProvider';
import { staticExchangeRateProvider } from './local/staticExchangeRateProvider';
import { unavailableMarketDataProvider } from './local/unavailableMarketDataProvider';
import { webSpeechProvider } from './local/webSpeechProvider';
import type {
  AIInterpreterProvider,
  CopilotProvider,
  ExchangeRateProvider,
  MarketDataProvider,
  SpeechToTextProvider,
} from './types';

// Punto único de cambio de proveedor (spec 80, 81). Hoy todo apunta a
// implementaciones locales; una fase futura puede llamar a los setters de
// abajo para enchufar Claude, una API de mercado, etc. — el resto de la
// app siempre consume `providers.*`, nunca un proveedor concreto.
interface ProviderRegistry {
  ai: AIInterpreterProvider;
  copilot: CopilotProvider;
  marketData: MarketDataProvider;
  exchangeRate: ExchangeRateProvider;
  speech: SpeechToTextProvider;
}

export const providers: ProviderRegistry = {
  ai: localAIInterpreterProvider,
  copilot: localCopilotProvider,
  marketData: unavailableMarketDataProvider,
  exchangeRate: staticExchangeRateProvider,
  speech: webSpeechProvider,
};

export function setAIInterpreterProvider(p: AIInterpreterProvider) {
  providers.ai = p;
}
export function setCopilotProvider(p: CopilotProvider) {
  providers.copilot = p;
}
export function setMarketDataProvider(p: MarketDataProvider) {
  providers.marketData = p;
}
export function setExchangeRateProvider(p: ExchangeRateProvider) {
  providers.exchangeRate = p;
}
export function setSpeechToTextProvider(p: SpeechToTextProvider) {
  providers.speech = p;
}

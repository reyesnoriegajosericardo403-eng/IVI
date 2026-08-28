import type { MarketDataProvider } from '../types';

// Fase 1-3: no hay ninguna fuente de precios de mercado conectada todavía.
// Devuelve null explícitamente en vez de inventar un precio (spec 17, 42).
// En Fase 4 se registra un MarketDataProvider real (ej. Twelve Data,
// Finnhub) que cumple el mismo contrato.
export const unavailableMarketDataProvider: MarketDataProvider = {
  name: 'unavailable',
  async getQuote() {
    return null;
  },
};

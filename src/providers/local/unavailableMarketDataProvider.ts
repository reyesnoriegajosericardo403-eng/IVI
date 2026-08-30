import type { MarketDataProvider } from '../types';

// Sin Supabase conectado no hay dónde guardar de forma segura la clave
// del proveedor de precios, así que no hay ninguna fuente de mercado
// conectada. Devuelve null explícitamente en vez de inventar un precio
// (spec 17, 42). Cuando Supabase está configurado se registra
// relayMarketDataProvider, que cumple el mismo contrato con datos reales.
export const unavailableMarketDataProvider: MarketDataProvider = {
  name: 'unavailable',
  async getQuotes(tickers: string[]) {
    return Object.fromEntries(tickers.map((t) => [t, null]));
  },
};

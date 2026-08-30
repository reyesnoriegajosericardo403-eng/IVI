import { isSupabaseConfigured, supabaseAnonPublicKey, supabaseProjectUrl } from '@/services/supabase/client';
import type { MarketDataProvider, MarketQuote } from '../types';

// Cotizaciones reales vía el relevo market-data en Supabase (spec Fase
// 4). La clave del proveedor (Finnhub) vive solo en el servidor, como
// secreto de la función — nunca en el cliente, en ninguna plataforma, a
// diferencia del BYOK de IA (aquí no es una cuenta personal del usuario,
// es un recurso compartido del dueño de la app, así que no tiene sentido
// pedirle su propia clave a cada persona).
export const relayMarketDataProvider: MarketDataProvider = {
  name: 'finnhub-relay',
  async getQuotes(tickers: string[]): Promise<Record<string, MarketQuote | null>> {
    if (tickers.length === 0) return {};
    if (!isSupabaseConfigured) {
      return Object.fromEntries(tickers.map((t) => [t, null]));
    }

    const baseUrl = (supabaseProjectUrl ?? '').replace(/\/+$/, '');
    try {
      const res = await fetch(`${baseUrl}/functions/v1/market-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonPublicKey}`,
        },
        body: JSON.stringify({ tickers }),
      });
      if (!res.ok) {
        return Object.fromEntries(tickers.map((t) => [t, null]));
      }
      const data = await res.json();
      const quotes = data?.quotes ?? {};
      const result: Record<string, MarketQuote | null> = {};
      for (const ticker of tickers) {
        const q = quotes[ticker];
        result[ticker] = q
          ? { ticker, price: q.price, previousClose: q.previousClose ?? null, asOf: q.asOf, source: q.source, stale: Boolean(q.stale) }
          : null;
      }
      return result;
    } catch {
      return Object.fromEntries(tickers.map((t) => [t, null]));
    }
  },
};

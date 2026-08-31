import { isSupabaseConfigured, supabaseAnonPublicKey, supabaseProjectUrl } from '@/services/supabase/client';
import type { CetesRates, MarketDataProvider, MarketQuote } from '../types';

// Llama al relevo una sola vez y devuelve el JSON crudo, o null si algo
// falló (sin conexión configurada, red caída, respuesta no-OK). Tanto
// getQuotes como getCetesRates comparten esta misma llamada porque el
// relevo ya arma ambas cosas en una sola respuesta.
async function callRelay(tickers: string[]): Promise<{ quotes?: Record<string, RawQuote | null>; cetesRates?: RawCetesRates | null } | null> {
  if (!isSupabaseConfigured) return null;
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
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

interface RawQuote {
  price: number;
  previousClose: number | null;
  asOf: string;
  source: string;
  stale: boolean;
}

type RawCetesRates = CetesRates;

// Cotizaciones reales vía el relevo market-data en Supabase — que por
// dentro ya combina dos proveedores (Finnhub + Yahoo Finance) corriendo
// en paralelo por cada ticker, y expone la tasa oficial de CETES
// (Banxico). Las claves de los proveedores viven solo en el servidor,
// como secretos de la función — nunca en el cliente, en ninguna
// plataforma, a diferencia del BYOK de IA (aquí no es una cuenta
// personal del usuario, es un recurso compartido del dueño de la app,
// así que no tiene sentido pedirle su propia clave a cada persona).
export const relayMarketDataProvider: MarketDataProvider = {
  name: 'multi-provider-relay',
  async getQuotes(tickers: string[]): Promise<Record<string, MarketQuote | null>> {
    if (tickers.length === 0) return {};
    const data = await callRelay(tickers);
    const quotes = data?.quotes ?? {};
    const result: Record<string, MarketQuote | null> = {};
    for (const ticker of tickers) {
      const q = quotes[ticker];
      result[ticker] = q
        ? { ticker, price: q.price, previousClose: q.previousClose ?? null, asOf: q.asOf, source: q.source, stale: Boolean(q.stale) }
        : null;
    }
    return result;
  },
  async getCetesRates(): Promise<CetesRates | null> {
    const data = await callRelay([]);
    return data?.cetesRates ?? null;
  },
};

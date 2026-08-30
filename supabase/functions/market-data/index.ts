// market-data: relevo sin estado para consultar precios de mercado reales
// sin exponer ninguna clave al cliente ni guardar nada en base de datos.
// El cliente pide una lista de tickers; esta función responde con el
// precio actual de cada uno (o null si no se pudo obtener) usando una
// sola clave del proveedor guardada como secreto del proyecto — nunca la
// del usuario, nunca visible desde el navegador.
//
// No hay tabla, no hay INSERT, no hay historial: cada respuesta se arma
// al vuelo y se descarta. Solo se mantiene una caché en memoria de muy
// corta duración (60 segundos) para no gastar de más la cuota gratuita
// del proveedor cuando varias personas piden el mismo ticker casi al
// mismo tiempo — esa caché vive mientras el proceso siga prendido, nunca
// se persiste a disco.
//
// Proveedor: Finnhub (https://finnhub.io) — tiene un nivel gratuito
// pensado para este tipo de uso. Requiere configurar el secreto
// FINNHUB_API_KEY en Supabase → Edge Functions → Secrets.
// Se despliega con `supabase functions deploy market-data`.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CACHE_TTL_MS = 60_000;
const MAX_TICKERS_PER_CALL = 25;

interface CachedQuote {
  price: number;
  previousClose: number | null;
  asOf: string;
  fetchedAtMs: number;
}

// Vive solo mientras el proceso siga caliente — no es persistencia, es
// una optimización de tráfico (spec: "no se deben quedar en el historial
// o en alguna base de datos").
const cache = new Map<string, CachedQuote>();

interface RequestBody {
  tickers: string[];
}

export interface QuoteResult {
  price: number;
  previousClose: number | null;
  asOf: string;
  source: string;
  stale: boolean;
}

async function fetchQuote(ticker: string, apiKey: string): Promise<QuoteResult | null> {
  const cached = cache.get(ticker);
  if (cached && Date.now() - cached.fetchedAtMs < CACHE_TTL_MS) {
    return { price: cached.price, previousClose: cached.previousClose, asOf: cached.asOf, source: 'finnhub', stale: false };
  }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`
    );
    if (!res.ok) {
      return cached ? { price: cached.price, previousClose: cached.previousClose, asOf: cached.asOf, source: 'finnhub', stale: true } : null;
    }
    const data = await res.json();
    // Finnhub devuelve c=0 cuando el símbolo no existe o no hay dato.
    if (!data || typeof data.c !== 'number' || data.c === 0) {
      return cached ? { price: cached.price, previousClose: cached.previousClose, asOf: cached.asOf, source: 'finnhub', stale: true } : null;
    }
    const asOf = new Date().toISOString();
    cache.set(ticker, { price: data.c, previousClose: typeof data.pc === 'number' ? data.pc : null, asOf, fetchedAtMs: Date.now() });
    return { price: data.c, previousClose: typeof data.pc === 'number' ? data.pc : null, asOf, source: 'finnhub', stale: false };
  } catch {
    return cached ? { price: cached.price, previousClose: cached.previousClose, asOf: cached.asOf, source: 'finnhub', stale: true } : null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }

  const apiKey = Deno.env.get('FINNHUB_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Falta configurar el secreto FINNHUB_API_KEY en este proyecto de Supabase.' }),
      { status: 500, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } }
    );
  }

  let payload: RequestBody;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }

  const tickers = Array.isArray(payload.tickers) ? payload.tickers.slice(0, MAX_TICKERS_PER_CALL) : [];
  const quotes: Record<string, QuoteResult | null> = {};

  await Promise.all(
    tickers.map(async (ticker) => {
      quotes[ticker] = await fetchQuote(ticker, apiKey);
    })
  );

  return new Response(JSON.stringify({ quotes }), {
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
});

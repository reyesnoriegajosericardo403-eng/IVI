// market-data: relevo sin estado para consultar precios de mercado reales
// sin exponer ninguna clave al cliente ni guardar nada en base de datos.
// El cliente pide una lista de tickers; esta función responde con el
// precio actual de cada uno (o null si no se pudo obtener) y, aparte, la
// tasa vigente de CETES — dos cosas de naturaleza distinta que conviven
// en la misma respuesta para no obligar al usuario a configurar dos
// funciones separadas.
//
// No hay tabla, no hay INSERT, no hay historial: cada respuesta se arma
// al vuelo y se descarta. Solo se mantienen cachés en memoria de corta
// duración para no gastar de más la cuota gratuita de los proveedores —
// viven mientras el proceso siga prendido, nunca se persisten a disco.
//
// Cotizaciones — DOS proveedores corriendo en paralelo por cada ticker:
//   1) Finnhub (https://finnhub.io) — requiere el secreto FINNHUB_API_KEY.
//   2) Yahoo Finance (endpoint público, sin clave) — también se intenta
//      con sufijo ".MX" para instrumentos de la Bolsa Mexicana de
//      Valores (FIBRAs, acciones mexicanas) que Finnhub no cubre.
// Si un proveedor falla o no está configurado, se usa el otro — nunca se
// inventa un precio cuando ambos fallan.
//
// CETES — no tienen un precio de mercado continuo como una acción (son
// instrumentos a descuento que se liquidan a su valor nominal al
// vencimiento), así que en vez de fabricar un "precio por unidad" se
// expone la TASA de rendimiento oficial que publica Banxico cada semana
// (28/91/182/364 días) — un dato real, no inventado, mostrado como tasa,
// no como precio. Requiere el secreto BANXICO_TOKEN (gratuito).
//
// Se despliega con `supabase functions deploy market-data`. Secretos en
// Supabase → Edge Functions → Secrets: FINNHUB_API_KEY, BANXICO_TOKEN.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CACHE_TTL_MS = 60_000;
const CETES_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // Banxico solo publica una vez por semana
const MAX_TICKERS_PER_CALL = 25;

interface CachedQuote {
  price: number;
  previousClose: number | null;
  asOf: string;
  source: string;
  fetchedAtMs: number;
}

// Viven solo mientras el proceso siga caliente — no es persistencia, es
// una optimización de tráfico (spec: "no se deben quedar en el historial
// o en alguna base de datos").
const quoteCache = new Map<string, CachedQuote>();
let cetesCache: { data: CetesRatesResult; fetchedAtMs: number } | null = null;

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

export interface CetesRatesResult {
  d28: number | null;
  d91: number | null;
  d182: number | null;
  d364: number | null;
  asOf: string | null;
  source: string;
}

async function fetchFinnhubQuote(ticker: string, apiKey: string): Promise<{ price: number; previousClose: number | null } | null> {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`);
    if (!res.ok) return null;
    const data = await res.json();
    // Finnhub devuelve c=0 cuando el símbolo no existe o no hay dato.
    if (!data || typeof data.c !== 'number' || data.c === 0) return null;
    return { price: data.c, previousClose: typeof data.pc === 'number' ? data.pc : null };
  } catch {
    return null;
  }
}

async function fetchYahooQuote(symbol: string): Promise<{ price: number; previousClose: number | null } | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== 'number') return null;
    const previousClose =
      typeof meta.previousClose === 'number'
        ? meta.previousClose
        : typeof meta.chartPreviousClose === 'number'
          ? meta.chartPreviousClose
          : null;
    return { price: meta.regularMarketPrice, previousClose };
  } catch {
    return null;
  }
}

// Prueba el ticker tal cual y, si no trae punto (para no duplicar algo
// como "BRK.B"), también con sufijo ".MX" — cubre acciones y FIBRAs de la
// Bolsa Mexicana de Valores sin que el usuario tenga que escribir el
// sufijo él mismo.
async function fetchYahooQuoteAnySuffix(ticker: string): Promise<{ price: number; previousClose: number | null } | null> {
  const candidates = ticker.includes('.') ? [ticker] : [ticker, `${ticker}.MX`];
  const results = await Promise.all(candidates.map(fetchYahooQuote));
  return results.find((r) => r !== null) ?? null;
}

async function fetchQuote(ticker: string, finnhubKey: string | null): Promise<QuoteResult | null> {
  const cached = quoteCache.get(ticker);
  if (cached && Date.now() - cached.fetchedAtMs < CACHE_TTL_MS) {
    return { price: cached.price, previousClose: cached.previousClose, asOf: cached.asOf, source: cached.source, stale: false };
  }

  const [finnhub, yahoo] = await Promise.all([
    finnhubKey ? fetchFinnhubQuote(ticker, finnhubKey) : Promise.resolve(null),
    fetchYahooQuoteAnySuffix(ticker),
  ]);

  const picked = finnhub ?? yahoo;
  const source = finnhub ? 'finnhub' : yahoo ? 'yahoo' : null;

  if (picked && source) {
    const asOf = new Date().toISOString();
    quoteCache.set(ticker, { price: picked.price, previousClose: picked.previousClose, asOf, source, fetchedAtMs: Date.now() });
    return { price: picked.price, previousClose: picked.previousClose, asOf, source, stale: false };
  }

  if (cached) {
    return { price: cached.price, previousClose: cached.previousClose, asOf: cached.asOf, source: cached.source, stale: true };
  }
  return null;
}

// IDs de serie de Banxico SIE para la tasa de rendimiento de CETES en
// subasta primaria (28/91/182/364 días) — si alguno cambiara o no
// existiera, esa serie simplemente vuelve null, nunca se inventa un
// número para rellenarla.
const CETES_SERIES: Record<'d28' | 'd91' | 'd182' | 'd364', string> = {
  d28: 'SF43936',
  d91: 'SF43939',
  d182: 'SF43942',
  d364: 'SF43945',
};

function banxicoDateToISO(fecha: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fecha);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

async function fetchBanxicoSeries(seriesId: string, token: string): Promise<{ value: number; date: string } | null> {
  try {
    const res = await fetch(`https://www.banxico.org.mx/SieAPIRest/service/v1/series/${seriesId}/datos/oportuno?token=${token}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const dato = data?.bmx?.series?.[0]?.datos?.[0];
    if (!dato || typeof dato.dato !== 'string') return null;
    const value = parseFloat(dato.dato.replace(',', ''));
    if (Number.isNaN(value)) return null;
    return { value, date: dato.fecha };
  } catch {
    return null;
  }
}

async function getCetesRates(token: string | null): Promise<CetesRatesResult | null> {
  if (!token) return null;
  if (cetesCache && Date.now() - cetesCache.fetchedAtMs < CETES_CACHE_TTL_MS) return cetesCache.data;

  const [d28, d91, d182, d364] = await Promise.all([
    fetchBanxicoSeries(CETES_SERIES.d28, token),
    fetchBanxicoSeries(CETES_SERIES.d91, token),
    fetchBanxicoSeries(CETES_SERIES.d182, token),
    fetchBanxicoSeries(CETES_SERIES.d364, token),
  ]);

  if (!d28 && !d91 && !d182 && !d364) {
    return cetesCache ? cetesCache.data : null;
  }

  const rawDate = d28?.date ?? d91?.date ?? d182?.date ?? d364?.date ?? null;
  const result: CetesRatesResult = {
    d28: d28?.value ?? null,
    d91: d91?.value ?? null,
    d182: d182?.value ?? null,
    d364: d364?.value ?? null,
    asOf: rawDate ? (banxicoDateToISO(rawDate) ?? rawDate) : null,
    source: 'banxico',
  };
  cetesCache = { data: result, fetchedAtMs: Date.now() };
  return result;
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

  let payload: RequestBody;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }

  const finnhubKey = Deno.env.get('FINNHUB_API_KEY') ?? null;
  const banxicoToken = Deno.env.get('BANXICO_TOKEN') ?? null;
  const tickers = Array.isArray(payload.tickers) ? payload.tickers.slice(0, MAX_TICKERS_PER_CALL) : [];

  const [quoteEntries, cetesRates] = await Promise.all([
    Promise.all(tickers.map(async (ticker) => [ticker, await fetchQuote(ticker, finnhubKey)] as const)),
    getCetesRates(banxicoToken),
  ]);

  const quotes: Record<string, QuoteResult | null> = Object.fromEntries(quoteEntries);

  return new Response(JSON.stringify({ quotes, cetesRates }), {
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
});

// ai-relay: relevo sin estado para saltar la restricción CORS que impide
// llamar a Claude/ChatGPT/Grok/Gemini directo desde un navegador (spec
// BYOK). NO guarda, registra ni factura nada — solo reenvía la petición
// que arma el propio cliente (con la clave del usuario) hacia el
// proveedor de IA que el usuario eligió, y devuelve la respuesta tal cual.
//
// El costo del modelo lo sigue pagando la clave del usuario, nunca
// nosotros. Este archivo se despliega con `supabase functions deploy ai-relay`.

const ALLOWED_HOSTS = new Set([
  'api.anthropic.com',
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'api.x.ai',
]);

// Solo estos encabezados se reenvían al proveedor — el cliente arma su
// propia forma de request (algunos usan "authorization", otros
// "x-api-key"), pero nada del resto de lo que un cliente podría mandar
// tiene motivo de llegar al proveedor de IA.
const FORWARDABLE_HEADERS = new Set(['authorization', 'x-api-key', 'x-goog-api-key', 'anthropic-version', 'content-type']);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Límite de tamaño del cuerpo — un mensaje de chat legítimo (incluso con
// bastante contexto financiero) no se acerca a esto; solo frena un intento
// de mandar payloads gigantes para agotar memoria/ancho de banda.
const MAX_BODY_BYTES = 256 * 1024;

// Ventana deslizante en memoria, por IP — best-effort: una función Edge
// puede arrancar en frío y perder este estado, pero mientras la instancia
// esté caliente (el caso común bajo un intento de abuso real, que manda
// ráfagas seguidas) sí frena. Sin este límite, la clave pública anon de
// Supabase (visible en el bundle web) es toda la "autenticación" que pide
// esta función — cualquiera podría usarla como relevo abierto hacia los 4
// proveedores permitidos, aunque solo con SU PROPIA clave de IA.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestLog = new Map<string, number[]>();

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(clientId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(clientId, timestamps);
  // Limpieza oportunista para no acumular IPs viejas indefinidamente en memoria.
  if (requestLog.size > 5000) {
    for (const [key, times] of requestLog) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) requestLog.delete(key);
    }
  }
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

interface RelayRequest {
  url: string;
  headers: Record<string, string>;
  body: unknown;
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

  const clientId = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (isRateLimited(clientId)) {
    return new Response(JSON.stringify({ error: 'Demasiadas solicitudes. Espera un momento antes de volver a intentar.' }), {
      status: 429,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json', 'Retry-After': '60' },
    });
  }

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'Solicitud demasiado grande' }), {
      status: 413,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }

  let payload: RelayRequest;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(payload.url);
  } catch {
    return new Response(JSON.stringify({ error: 'URL de destino inválida' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }

  if (!ALLOWED_HOSTS.has(targetUrl.hostname)) {
    return new Response(JSON.stringify({ error: `Dominio no permitido: ${targetUrl.hostname}` }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }

  const forwardHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload.headers ?? {})) {
    if (FORWARDABLE_HEADERS.has(key.toLowerCase())) forwardHeaders[key] = value;
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: { ...forwardHeaders, 'content-type': 'application/json' },
      body: JSON.stringify(payload.body),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...CORS_HEADERS, 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'No se pudo contactar al proveedor de IA' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }
});

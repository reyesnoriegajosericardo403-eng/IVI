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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: { ...payload.headers, 'content-type': 'application/json' },
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

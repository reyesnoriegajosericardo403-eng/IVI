// delete-account: elimina de verdad (no un soft-delete) la cuenta de
// quien llama y todos sus datos. A diferencia de ai-relay/market-data,
// esta función SÍ necesita saber quién eres — nunca confía en un id que
// venga en el cuerpo de la petición, siempre lo resuelve a partir de tu
// propio token de sesión, para que nadie pueda borrar la cuenta de otra
// persona.
//
// Por qué basta con borrar auth.users: cada tabla (profiles, accounts,
// transactions, budgets, goals, investments, liabilities,
// net_worth_snapshots, audit_log) tiene su columna user_id con
// "references auth.users(id) on delete cascade" — borrar el usuario de
// Auth arrastra y elimina de verdad todas sus filas en cada tabla.
//
// Requiere "Verify JWT" ENCENDIDO en esta función (a diferencia de las
// otras dos) — el token que llega es siempre la sesión real de un
// usuario, nunca la clave pública/anon.
//
// Se despliega con `supabase functions deploy delete-account`. No
// requiere ningún secreto nuevo: SUPABASE_URL, SUPABASE_ANON_KEY y
// SUPABASE_SERVICE_ROLE_KEY ya vienen configurados automáticamente por
// Supabase en cada función.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse({ error: 'Método no permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Configuración incompleta del proyecto de Supabase.' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Falta la sesión del usuario.' }, 401);
  }

  // Resuelve quién es de verdad el que llama a partir de SU propio token.
  const whoRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: anonKey },
  });
  if (!whoRes.ok) {
    return jsonResponse({ error: 'Sesión inválida o expirada. Vuelve a iniciar sesión e inténtalo de nuevo.' }, 401);
  }
  const who = await whoRes.json();
  const userId = who?.id;
  if (!userId) {
    return jsonResponse({ error: 'No se pudo identificar al usuario.' }, 401);
  }

  // Borra al usuario de Supabase Auth — el ON DELETE CASCADE de cada
  // tabla se encarga del resto.
  const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey },
  });
  if (!deleteRes.ok) {
    const detail = await deleteRes.text().catch(() => '');
    return jsonResponse({ error: 'No se pudo eliminar la cuenta en el servidor.', detail }, 502);
  }

  return jsonResponse({ success: true });
});

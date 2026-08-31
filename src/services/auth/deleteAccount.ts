import { isSupabaseConfigured, supabase, supabaseProjectUrl } from '@/services/supabase/client';

// Llama al relevo delete-account con la sesión real del usuario — nunca
// se le pasa un id a mano, el servidor lo resuelve de su propio token
// (spec: "cumpla con los reglamentos... empezando por Norteamérica" —
// esto es el derecho a eliminar tu cuenta y tus datos).
export async function deleteAccountPermanently(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'No hay una cuenta en la nube conectada — no hay nada que borrar en el servidor.' };
  }

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    return { success: false, error: 'No se encontró una sesión activa. Inicia sesión de nuevo e inténtalo otra vez.' };
  }

  const baseUrl = (supabaseProjectUrl ?? '').replace(/\/+$/, '');
  try {
    const res = await fetch(`${baseUrl}/functions/v1/delete-account`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({} as { error?: string }));
      return { success: false, error: body?.error ?? `No se pudo eliminar la cuenta (código ${res.status}).` };
    }
    return { success: true };
  } catch {
    return { success: false, error: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.' };
  }
}

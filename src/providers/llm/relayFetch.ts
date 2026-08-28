import { Platform } from 'react-native';

import { isSupabaseConfigured, supabaseAnonPublicKey, supabaseProjectUrl } from '@/services/supabase/client';

// Los navegadores bloquean por CORS las llamadas directas de la Fase 3 a
// Claude/ChatGPT/Grok (y para mantener un solo camino de código, también a
// Gemini). En web, la llamada pasa por un relevo sin estado en Supabase
// (supabase/functions/ai-relay) que solo reenvía bytes — nunca ve, guarda
// ni paga el uso de IA; el costo del modelo lo sigue cubriendo la clave del
// propio usuario. En nativo (iOS/Android) no hay restricción de navegador,
// así que la llamada va directo al proveedor.
export async function providerFetch(url: string, headers: Record<string, string>, body: unknown): Promise<any> {
  const isWeb = Platform.OS === 'web';

  if (isWeb) {
    if (!isSupabaseConfigured) {
      throw new Error(
        'En la versión web, conectar tu propia IA requiere tener un proyecto Supabase conectado (funciona como relevo para saltar la restricción de seguridad del navegador). Prueba desde la app nativa, o conecta Supabase para activarlo aquí también.'
      );
    }
    const res = await fetch(`${supabaseProjectUrl}/functions/v1/ai-relay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonPublicKey}`,
      },
      body: JSON.stringify({ url, headers, body }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`El relevo respondió con error (${res.status}): ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`El proveedor de IA respondió con error (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

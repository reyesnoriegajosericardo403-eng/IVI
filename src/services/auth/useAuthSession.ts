import { useEffect, useState } from 'react';

import { establishSessionFromUrl } from '@/services/auth/actions';
import { isSupabaseConfigured, supabase } from '@/services/supabase/client';

export interface AuthState {
  // true mientras se resuelve la sesión guardada; false apenas se sabe si
  // hay sesión o no (incluso si Supabase no está configurado).
  loading: boolean;
  userId: string | null;
  email: string | null;
  // true solo en el primer instante después de volver de un inicio de
  // sesión con Google/Apple que sí funcionó — para mostrar una
  // confirmación breve ("tu correo... ya inició sesión") antes de entrar
  // a la app (spec: "que su primera interacción resulte agradable...
  // debe aparecer su correo en la pantalla").
  justSignedInViaOAuth: boolean;
}

// Si Supabase no está configurado, la app opera en modo local — nunca se
// bloquea esperando una sesión que no puede existir (spec 20).
export function useAuthSession(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: isSupabaseConfigured,
    userId: null,
    email: null,
    justSignedInViaOAuth: false,
  });

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setState({ loading: false, userId: null, email: null, justSignedInViaOAuth: false });
      return;
    }
    const client = supabase;

    // ¿Venimos de un redirect de OAuth (Google/Apple)? La URL trae un
    // "?code=" (PKCE) o tokens en el hash. Mientras eso no termine de
    // canjearse, se ignora cualquier aviso de "no hay sesión" —
    // onAuthStateChange siempre manda un primer aviso con lo que YA había
    // en el storage, todavía SIN el code canjeado, y antes eso bastaba
    // para que index.tsx creyera que no había sesión y mandara de vuelta a
    // /auth una fracción de segundo antes de que el inicio de sesión
    // terminara de guardarse (spec: "cuando le picas [Google] retrocede...
    // tengo que picar dos veces para que funcione"). Un aviso con sesión
    // real SÍ se respeta de inmediato, venga de donde venga.
    const hadPendingOAuthRedirect =
      typeof window !== 'undefined' &&
      (window.location.search.includes('code=') || window.location.hash.includes('access_token='));
    let resolvingUrl = hadPendingOAuthRedirect;

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (resolvingUrl && !session) return;
      setState((prev) => ({
        loading: false,
        userId: session?.user.id ?? null,
        email: session?.user.email ?? null,
        justSignedInViaOAuth: hadPendingOAuthRedirect && !!session && !prev.userId,
      }));
    });

    establishSessionFromUrl().then((result) => {
      resolvingUrl = false;
      client.auth.getSession().then(({ data }) => {
        setState((prev) =>
          prev.userId
            ? prev
            : {
                loading: false,
                userId: data.session?.user.id ?? null,
                email: data.session?.user.email ?? null,
                justSignedInViaOAuth: hadPendingOAuthRedirect && result.ok && !!data.session,
              }
        );
      });
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return state;
}

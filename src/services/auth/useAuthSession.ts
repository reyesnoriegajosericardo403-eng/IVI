import { useEffect, useState } from 'react';

import { establishSessionFromUrl } from '@/services/auth/actions';
import { isSupabaseConfigured, supabase } from '@/services/supabase/client';

export interface AuthState {
  // true mientras se resuelve la sesión guardada; false apenas se sabe si
  // hay sesión o no (incluso si Supabase no está configurado).
  loading: boolean;
  userId: string | null;
  email: string | null;
}

// Si Supabase no está configurado, la app opera en modo local — nunca se
// bloquea esperando una sesión que no puede existir (spec 20).
export function useAuthSession(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: isSupabaseConfigured,
    userId: null,
    email: null,
  });

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setState({ loading: false, userId: null, email: null });
      return;
    }
    const client = supabase;

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      setState({ loading: false, userId: session?.user.id ?? null, email: session?.user.email ?? null });
    });

    // Si venimos de un redirect de OAuth (Google/Apple), la URL trae un
    // "?code=" (PKCE) o tokens en el hash — el cliente se creó con
    // detectSessionInUrl:false, así que hay que resolverlo a mano antes de
    // preguntar si ya hay una sesión guardada; si no, esta llamada no hace
    // nada (no hay código/hash que procesar).
    establishSessionFromUrl().finally(() => {
      client.auth.getSession().then(({ data }) => {
        setState((prev) => (prev.userId ? prev : {
          loading: false,
          userId: data.session?.user.id ?? null,
          email: data.session?.user.email ?? null,
        }));
      });
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return state;
}

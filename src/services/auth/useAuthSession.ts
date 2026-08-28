import { useEffect, useState } from 'react';

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

    supabase.auth.getSession().then(({ data }) => {
      setState({
        loading: false,
        userId: data.session?.user.id ?? null,
        email: data.session?.user.email ?? null,
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ loading: false, userId: session?.user.id ?? null, email: session?.user.email ?? null });
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return state;
}

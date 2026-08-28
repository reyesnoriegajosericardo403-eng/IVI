import { supabase } from '@/services/supabase/client';

export interface AuthResult {
  ok: boolean;
  error?: string;
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Supabase no está configurado.' };
  const { error } = await supabase.auth.signUp({ email, password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Supabase no está configurado.' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

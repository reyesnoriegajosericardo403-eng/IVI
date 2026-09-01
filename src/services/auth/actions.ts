import { Platform } from 'react-native';

import { supabase } from '@/services/supabase/client';

export interface AuthResult {
  ok: boolean;
  error?: string;
}

// Origen para los enlaces de confirmación/recuperación que Supabase manda
// por correo — deben apuntar de vuelta a esta misma app. En web es el
// dominio real (ej. https://ivi-beta.vercel.app); fuera de web no hay
// "origin" de navegador, así que se deja vacío y Supabase usa el Site URL
// configurado en el proyecto.
export function getAuthRedirectOrigin(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return '';
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Supabase no está configurado.' };
  const origin = getAuthRedirectOrigin();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: origin ? { emailRedirectTo: `${origin}/` } : undefined,
  });
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

// Manda el correo de "recuperar contraseña" — usa el mismo proveedor de
// correo que ya usa Supabase para confirmar cuentas, no necesita ningún
// servicio nuevo.
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Supabase no está configurado.' };
  const origin = getAuthRedirectOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: origin ? `${origin}/reset-password` : undefined,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// El cliente de Supabase de esta app se creó con detectSessionInUrl:false
// (no procesa solo el enlace de recuperación), así que app/reset-password
// lo hace a mano aquí — soporta tanto el flujo con "?code=" (PKCE) como el
// flujo viejo con "#access_token=...&refresh_token=..." en el hash, sin
// depender de cuál esté activo en el proyecto de Supabase.
export async function establishSessionFromUrl(): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Supabase no está configurado.' };
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return { ok: false, error: 'Abre este enlace desde el navegador donde usas VALU.' };
  }

  const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : '';
  const hashParams = new URLSearchParams(hash);
  const queryParams = new URLSearchParams(window.location.search);

  const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
  if (errorDescription) return { ok: false, error: errorDescription };

  const code = queryParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // El código es de un solo uso — se quita de la URL para que un refresh
    // de la página no intente canjearlo otra vez (fallaría con "invalid
    // request" al segundo intento).
    window.history.replaceState({}, '', window.location.pathname);
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    window.history.replaceState({}, '', window.location.pathname);
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  return { ok: false, error: 'Este enlace ya no es válido. Pide uno nuevo.' };
}

// Fija la nueva contraseña — solo funciona si ya existe una sesión de
// recuperación activa (se establece en app/reset-password.tsx a partir del
// enlace del correo).
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Supabase no está configurado.' };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// Inicia sesión con un proveedor externo (Google, Apple, etc.) — requiere
// que ese proveedor esté habilitado y configurado en el proyecto de
// Supabase (Authentication → Providers) además de su propia consola de
// desarrollador. Sin esa configuración, Supabase responde con un error
// claro ("Unsupported provider") en vez de fallar en silencio.
export async function signInWithOAuth(provider: 'google' | 'apple'): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Supabase no está configurado.' };
  const origin = getAuthRedirectOrigin();
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: origin ? { redirectTo: `${origin}/` } : undefined,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

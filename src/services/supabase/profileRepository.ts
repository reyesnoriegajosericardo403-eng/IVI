import type { UserProfile } from '@/data/types';
import { supabase, supabaseAnonPublicKey, supabaseProjectUrl } from './client';

// El perfil es un singleton por usuario (clave = user_id), no una lista de
// registros como el resto de entidades — por eso vive fuera del
// Repository<T> genérico en vez de forzar un id artificial.

// Compartida entre pushRemoteProfile (cliente supabase-js normal) y
// pushRemoteProfileKeepalive (fetch crudo de emergencia) — un solo lugar
// para el mapeo TS→columnas evita que las dos vías de subida se desincronicen.
function buildProfileRow(profile: UserProfile) {
  return {
    name: profile.name,
    primary_currency: profile.primaryCurrency,
    theme_preference: profile.themePreference,
    onboarding_complete: profile.onboardingComplete,
    budget_threshold_attention: profile.budgetThresholds.attention,
    budget_threshold_warning: profile.budgetThresholds.warning,
    budget_threshold_exceeded: profile.budgetThresholds.exceeded,
    visual_style: profile.visualStyle ?? null,
    last_permanent_visual_style: profile.lastPermanentVisualStyle ?? null,
    accent_palette_id: profile.accentPaletteId ?? null,
    background_mode: profile.backgroundMode ?? null,
    background_catalog_image_id: profile.backgroundCatalogImageId ?? null,
    background_custom_uri: profile.backgroundCustomUri ?? null,
    background_focal_x_mobile: profile.backgroundFocalXMobile ?? null,
    background_focal_y_mobile: profile.backgroundFocalYMobile ?? null,
    background_focal_x_desktop: profile.backgroundFocalXDesktop ?? null,
    background_focal_y_desktop: profile.backgroundFocalYDesktop ?? null,
    background_darkness: profile.backgroundDarkness ?? null,
    background_blur_amount: profile.backgroundBlurAmount ?? null,
  };
}

export async function fetchRemoteProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error || !data) return null;
  return {
    name: data.name,
    primaryCurrency: data.primary_currency,
    onboardingComplete: data.onboarding_complete,
    themePreference: data.theme_preference,
    budgetThresholds: {
      attention: data.budget_threshold_attention,
      warning: data.budget_threshold_warning,
      exceeded: data.budget_threshold_exceeded,
    },
    visualStyle: data.visual_style ?? undefined,
    lastPermanentVisualStyle: data.last_permanent_visual_style ?? undefined,
    accentPaletteId: data.accent_palette_id ?? undefined,
    backgroundMode: data.background_mode ?? undefined,
    backgroundCatalogImageId: data.background_catalog_image_id ?? undefined,
    backgroundCustomUri: data.background_custom_uri ?? undefined,
    backgroundFocalXMobile: data.background_focal_x_mobile ?? undefined,
    backgroundFocalYMobile: data.background_focal_y_mobile ?? undefined,
    backgroundFocalXDesktop: data.background_focal_x_desktop ?? undefined,
    backgroundFocalYDesktop: data.background_focal_y_desktop ?? undefined,
    backgroundDarkness: data.background_darkness ?? undefined,
    backgroundBlurAmount: data.background_blur_amount ?? undefined,
  };
}

export async function pushRemoteProfile(userId: string, profile: UserProfile): Promise<void> {
  if (!supabase) return;
  await supabase.from('profiles').update(buildProfileRow(profile)).eq('user_id', userId);
}

// Camino de emergencia: fetch CRUDO con keepalive:true, en vez del cliente
// supabase-js normal, disparado justo cuando el sistema avisa que la app se
// va a segundo plano (ver useSyncEngine.ts). keepalive le entrega la
// petición a la capa de red del propio navegador/SO en vez de al proceso
// de la página — el mismo mecanismo que usan los beacons de analítica para
// sobrevivir el cierre de una pestaña — y por eso puede seguir en vuelo
// incluso si el proceso que la disparó ya murió. El cliente supabase-js
// NO pasa keepalive a su fetch interno, así que una petición hecha con él
// se cancela junto con el proceso si el sistema mata la app a medio vuelo
// (spec 2026-09-27: la subida disparada en visibilitychange seguía sin
// alcanzar a llegar cuando el usuario quitaba la app de "apps activas").
// Deliberadamente NO marca profileDirty=false — no hay forma de confirmar
// que el servidor la recibió (el proceso puede morir antes de la
// respuesta), así que el próximo runSync() normal (al reabrir la app, o el
// ciclo de 60s si el proceso sobrevivió) la reintenta y SÍ confirma.
export function pushRemoteProfileKeepalive(userId: string, profile: UserProfile, accessToken: string): void {
  if (!supabaseProjectUrl || !supabaseAnonPublicKey) return;
  const url = `${supabaseProjectUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`;
  fetch(url, {
    method: 'PATCH',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonPublicKey,
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(buildProfileRow(profile)),
  }).catch(() => {
    // Sin red, o el proceso murió a medio envío: no hay JS vivo aquí para
    // reintentar — el próximo runSync() al reabrir la app se encarga.
  });
}

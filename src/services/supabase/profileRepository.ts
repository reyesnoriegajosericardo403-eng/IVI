import type { UserProfile } from '@/data/types';
import { supabase } from './client';

// El perfil es un singleton por usuario (clave = user_id), no una lista de
// registros como el resto de entidades — por eso vive fuera del
// Repository<T> genérico en vez de forzar un id artificial.

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
  };
}

export async function pushRemoteProfile(userId: string, profile: UserProfile): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('profiles')
    .update({
      name: profile.name,
      primary_currency: profile.primaryCurrency,
      theme_preference: profile.themePreference,
      onboarding_complete: profile.onboardingComplete,
      budget_threshold_attention: profile.budgetThresholds.attention,
      budget_threshold_warning: profile.budgetThresholds.warning,
      budget_threshold_exceeded: profile.budgetThresholds.exceeded,
    })
    .eq('user_id', userId);
}

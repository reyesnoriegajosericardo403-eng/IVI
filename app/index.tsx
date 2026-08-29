import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuthSession } from '@/services/auth/useAuthSession';
import { useProfileReconciliation } from '@/services/auth/useProfileReconciliation';
import { isSupabaseConfigured } from '@/services/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function Index() {
  const { colors } = useTheme();
  const { loading, userId } = useAuthSession();
  const { ready } = useProfileReconciliation(userId);
  const onboardingComplete = useAppStore((s) => s.profile.onboardingComplete);

  // Espera a saber el estado REAL del perfil (del servidor) antes de
  // decidir a dónde navegar — nunca confía en el estado local a ciegas,
  // que puede venir de un intento de registro anterior con otra cuenta
  // en este mismo navegador (spec 76, 77).
  if (isSupabaseConfigured && (loading || (userId && !ready))) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accentFrom} />
      </View>
    );
  }

  if (isSupabaseConfigured && !userId) {
    return <Redirect href="/auth" />;
  }

  return <Redirect href={onboardingComplete ? '/(tabs)' : '/onboarding'} />;
}

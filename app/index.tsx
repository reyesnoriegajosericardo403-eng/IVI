import { Redirect, router } from 'expo-router';
import React, { useEffect } from 'react';
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
  const authPending = isSupabaseConfigured && (loading || (userId && !ready));
  const needsAuth = isSupabaseConfigured && !userId;
  const goesStraightToCapture = !authPending && !needsAuth && onboardingComplete;

  // Reducir fricción al máximo: si ya hay sesión y el onboarding está
  // hecho, abrir la app manda directo a "Grabar por voz" (el Dashboard
  // queda detrás — cerrar la captura regresa ahí). Se hace con navegación
  // imperativa porque son DOS pasos (entrar a las tabs y luego abrir el
  // modal de captura encima), algo que <Redirect> no puede expresar solo.
  useEffect(() => {
    if (!goesStraightToCapture) return;
    router.replace('/(tabs)');
    router.push('/capture');
  }, [goesStraightToCapture]);

  if (authPending || goesStraightToCapture) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accentFrom} />
      </View>
    );
  }

  if (needsAuth) {
    return <Redirect href="/auth" />;
  }

  // Solo queda el caso onboardingComplete === false — el caso true ya se
  // resolvió arriba (goesStraightToCapture).
  return <Redirect href="/onboarding" />;
}

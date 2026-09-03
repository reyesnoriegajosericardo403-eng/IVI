import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useAuthSession } from '@/services/auth/useAuthSession';
import { useProfileReconciliation } from '@/services/auth/useProfileReconciliation';
import { isSupabaseConfigured } from '@/services/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

// Cuánto se muestra la confirmación de "ya inició sesión con Google" antes
// de seguir de largo — suficiente para leerla, no tanto como para sentirse
// una pantalla de carga rota (spec: "que su primera interacción resulte
// agradable... debe funcionar a la primera").
const OAUTH_CONFIRM_MS = 1600;
// Si reconciliar el perfil con el servidor tarda más que esto (red lenta,
// hipo del backend), se ofrece un botón para seguir de todos modos — nadie
// debe quedarse atorado en una pantalla de carga sin salida.
const PENDING_FAILSAFE_MS = 6000;

export default function Index() {
  const { colors, typography, spacing } = useTheme();
  const { loading, userId, email, justSignedInViaOAuth } = useAuthSession();
  const { ready } = useProfileReconciliation(userId);
  const onboardingComplete = useAppStore((s) => s.profile.onboardingComplete);
  const [oauthConfirmShown, setOauthConfirmShown] = useState(false);
  const [forceProceed, setForceProceed] = useState(false);
  const [showFailsafe, setShowFailsafe] = useState(false);

  useEffect(() => {
    if (!justSignedInViaOAuth) return;
    setOauthConfirmShown(true);
    const timer = setTimeout(() => setOauthConfirmShown(false), OAUTH_CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [justSignedInViaOAuth]);

  // Espera a saber el estado REAL del perfil (del servidor) antes de
  // decidir a dónde navegar — nunca confía en el estado local a ciegas,
  // que puede venir de un intento de registro anterior con otra cuenta
  // en este mismo navegador (spec 76, 77).
  const authPending = !forceProceed && isSupabaseConfigured && (loading || (userId && !ready));

  useEffect(() => {
    if (!authPending) {
      setShowFailsafe(false);
      return;
    }
    const timer = setTimeout(() => setShowFailsafe(true), PENDING_FAILSAFE_MS);
    return () => clearTimeout(timer);
  }, [authPending]);
  const needsAuth = isSupabaseConfigured && !userId;
  // "!oauthConfirmShown" retrasa el salto directo a Captura mientras se ve
  // la confirmación — si no, la navegación desmontaría esta pantalla antes
  // de que alguien alcance a leerla.
  const goesStraightToCapture = !authPending && !needsAuth && onboardingComplete && !oauthConfirmShown;

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

  if (oauthConfirmShown) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xl }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark" size={32} color="#FFFFFF" />
        </View>
        <Text style={[typography.headline, { color: colors.textPrimary, marginTop: spacing.lg, textAlign: 'center' }]}>
          Sesión iniciada
        </Text>
        {!!email && (
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>{email}</Text>
        )}
        {/* Nunca depender solo del temporizador para seguir adelante — si
            algo tarda (reconciliar el perfil, la red), la persona debe
            poder tocar para continuar en vez de quedarse atorada aquí
            (spec: "agregues un botón de iniciar sesión o continuar"). */}
        <Pressable
          accessibilityLabel="Continuar"
          onPress={() => setOauthConfirmShown(false)}
          style={{ marginTop: spacing.xl, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 999, backgroundColor: colors.accentFrom }}
        >
          <Text style={[typography.headline, { color: '#FFFFFF' }]}>Continuar</Text>
        </Pressable>
      </View>
    );
  }

  if (authPending || goesStraightToCapture) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xl }}>
        <ActivityIndicator color={colors.accentFrom} />
        {showFailsafe && (
          <>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.lg, textAlign: 'center' }]}>
              Esto está tardando más de lo normal.
            </Text>
            <Pressable
              accessibilityLabel="Continuar de todos modos"
              onPress={() => setForceProceed(true)}
              style={{ marginTop: spacing.md, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 999, borderWidth: 1, borderColor: colors.surfaceBorder }}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Continuar de todos modos</Text>
            </Pressable>
          </>
        )}
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

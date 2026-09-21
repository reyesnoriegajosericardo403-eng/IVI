import * as SplashScreen from 'expo-splash-screen';
import { DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/AppBackground';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useRemoteVisualStyles } from '@/services/themes/remoteThemes';
import { registerConfiguredLLMProvider } from '@/providers/llm/registerConfiguredProvider';
import { registerMarketDataProvider } from '@/providers/market/registerMarketDataProvider';
import { useAuthSession } from '@/services/auth/useAuthSession';
import { usePushProfileOnChange } from '@/services/auth/useProfileReconciliation';
import { useMarketDataRefresh } from '@/services/market/useMarketDataRefresh';
import { useSyncEngine } from '@/services/sync/useSyncEngine';
import { useAppStore } from '@/store/useAppStore';
import { selectActiveAccounts, selectActiveInvestments, selectActiveLiabilities } from '@/store/selectors';
import { computeNetWorth } from '@/utils/finance';

SplashScreen.preventAutoHideAsync().catch(() => {});

// El contenedor de navegación pinta un fondo propio (blanco) que taparía el
// fondo del estilo visual. Se le deja transparente para que mande
// <AppBackground>, que es quien conoce el degradado o el color del estilo.
const TRANSPARENT_NAVIGATION_THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent' },
};

function RootStack() {
  const { colors, scheme } = useTheme();
  const { userId } = useAuthSession();
  useSyncEngine();
  usePushProfileOnChange(userId);
  useMarketDataRefresh();
  useRemoteVisualStyles(userId);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const rawAccounts = useAppStore((s) => s.accounts);
  const rawInvestments = useAppStore((s) => s.investments);
  const rawLiabilities = useAppStore((s) => s.liabilities);
  const accounts = useMemo(() => selectActiveAccounts(rawAccounts), [rawAccounts]);
  const investments = useMemo(() => selectActiveInvestments(rawInvestments), [rawInvestments]);
  const liabilities = useMemo(() => selectActiveLiabilities(rawLiabilities), [rawLiabilities]);
  const baseCurrency = useAppStore((s) => s.profile.primaryCurrency);
  const liveQuotes = useAppStore((s) => s.liveQuotes);
  const recordNetWorthSnapshot = useAppStore((s) => s.recordNetWorthSnapshot);

  useEffect(() => {
    if (hasHydrated) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [hasHydrated]);

  // Carga la IA que el usuario haya conectado (Claude/ChatGPT/Gemini/Grok
  // con su propia clave) — si no hay ninguna, se queda con el copiloto
  // local basado en reglas.
  useEffect(() => {
    registerConfiguredLLMProvider();
    registerMarketDataProvider();
  }, []);

  // Registra un snapshot diario del patrimonio neto real del usuario para
  // poder construir tendencias históricas honestas (nunca inventadas).
  useEffect(() => {
    if (!hasHydrated) return;
    if (accounts.length === 0 && investments.length === 0 && liabilities.length === 0) return;
    const { assets, liabilities: liab, netWorth } = computeNetWorth(accounts, investments, liabilities, baseCurrency, liveQuotes);
    recordNetWorthSnapshot({
      date: new Date().toISOString().slice(0, 10),
      assets,
      liabilities: liab,
      netWorth,
      currency: baseCurrency,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, accounts, investments, liabilities, baseCurrency, liveQuotes]);

  if (!hasHydrated) return null;

  return (
    <AppBackground>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <NavigationThemeProvider value={TRANSPARENT_NAVIGATION_THEME}>
      <Stack
        screenOptions={{
          headerShown: false,
          // Transparente a propósito: quien pinta el fondo es <AppBackground>,
          // que está detrás. Si aquí se dejara un color, taparía el degradado
          // del estilo visual (y el contenedor de navegación pinta blanco por
          // su cuenta si no se le dice otra cosa).
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="capture"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
      </NavigationThemeProvider>
    </AppBackground>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootStack />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

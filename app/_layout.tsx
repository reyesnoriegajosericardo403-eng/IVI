import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';
import { computeNetWorth } from '@/utils/finance';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const { colors, scheme } = useTheme();
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const accounts = useAppStore((s) => s.accounts);
  const investments = useAppStore((s) => s.investments);
  const liabilities = useAppStore((s) => s.liabilities);
  const baseCurrency = useAppStore((s) => s.profile.primaryCurrency);
  const recordNetWorthSnapshot = useAppStore((s) => s.recordNetWorthSnapshot);

  useEffect(() => {
    if (hasHydrated) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [hasHydrated]);

  // Registra un snapshot diario del patrimonio neto real del usuario para
  // poder construir tendencias históricas honestas (nunca inventadas).
  useEffect(() => {
    if (!hasHydrated) return;
    if (accounts.length === 0 && investments.length === 0 && liabilities.length === 0) return;
    const { assets, liabilities: liab, netWorth } = computeNetWorth(accounts, investments, liabilities, baseCurrency);
    recordNetWorthSnapshot({
      date: new Date().toISOString().slice(0, 10),
      assets,
      liabilities: liab,
      netWorth,
      currency: baseCurrency,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, accounts, investments, liabilities, baseCurrency]);

  if (!hasHydrated) return null;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
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
    </>
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

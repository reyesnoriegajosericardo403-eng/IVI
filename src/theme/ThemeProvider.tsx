import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useAppStore } from '@/store/useAppStore';
import { darkColors, lightColors, type ThemeColors } from './colors';
import { radius, spacing, typography } from './tokens';

interface ThemeContextValue {
  colors: ThemeColors;
  scheme: 'light' | 'dark';
  radius: typeof radius;
  spacing: typeof spacing;
  typography: typeof typography;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const preference = useAppStore((s) => s.profile.themePreference);

  const scheme = useMemo<'light' | 'dark'>(() => {
    if (preference === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
    return preference;
  }, [preference, systemScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: scheme === 'dark' ? darkColors : lightColors,
      scheme,
      radius,
      spacing,
      typography,
    }),
    [scheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}

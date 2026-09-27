import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useAppStore } from '@/store/useAppStore';
import { findAccentPalette } from './accentPalettes';
import { type ThemeColors } from './colors';
import { withAlpha } from './surfaceStyle';
import { mergeVisualStyles, resolveVisualStyle, selectableVisualStyles } from './themeRegistry';
import { radius as baseRadius, spacing, typography as baseTypography } from './tokens';
import { type StyleSurface, type VisualStyleDefinition } from './visualStyles';

interface ThemeContextValue {
  colors: ThemeColors;
  scheme: 'light' | 'dark';
  // Tokens del estilo visual activo (borde, sombra, desenfoque, degradado).
  surface: StyleSurface;
  // El estilo completo, para mostrar su nombre/estado en Ajustes.
  style: VisualStyleDefinition;
  // Lo que se le puede ofrecer al usuario ahora mismo (sin archivados ni
  // caducados).
  availableStyles: VisualStyleDefinition[];
  radius: typeof baseRadius;
  spacing: typeof spacing;
  typography: typeof baseTypography;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// El brutalismo pide tipografía más pesada; el resto de estilos usan la
// escala normal.
const BOLDER: Record<string, '600' | '700' | '800'> = {
  '400': '600',
  '500': '700',
  '600': '800',
  '700': '800',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const preference = useAppStore((s) => s.profile.themePreference);
  const selectedStyleId = useAppStore((s) => s.profile.visualStyle);
  const lastPermanentStyleId = useAppStore((s) => s.profile.lastPermanentVisualStyle);
  const accentPaletteId = useAppStore((s) => s.profile.accentPaletteId);
  const remoteVisualStyles = useAppStore((s) => s.remoteVisualStyles);
  const setVisualStyle = useAppStore((s) => s.setVisualStyle);

  const scheme = useMemo<'light' | 'dark'>(() => {
    if (preference === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
    return preference;
  }, [preference, systemScheme]);

  const allStyles = useMemo(() => mergeVisualStyles(remoteVisualStyles), [remoteVisualStyles]);
  const resolved = useMemo(
    () => resolveVisualStyle(allStyles, selectedStyleId, lastPermanentStyleId),
    [allStyles, selectedStyleId, lastPermanentStyleId]
  );

  // Si el estilo elegido caducó o fue archivado, se deja guardado el que se
  // le devolvió — así no se vuelve a intentar resolver lo mismo cada vez que
  // abre la app.
  useEffect(() => {
    if (!resolved.fellBack) return;
    setVisualStyle(resolved.style.id, resolved.style.status === 'permanent');
  }, [resolved, setVisualStyle]);

  const value = useMemo<ThemeContextValue>(() => {
    const variant = scheme === 'dark' ? resolved.style.dark : resolved.style.light;
    // Solo "Vidrio líquido" ofrece paleta de acento seleccionable (spec: "el
    // tema de color aparece selectivamente en el aviso principal, botón
    // principal, iconos activos, chips seleccionados") — nunca toca
    // success/warning/danger/info, que son semánticos y fijos.
    const colors: ThemeColors = resolved.style.supportsBackgroundPhoto
      ? (() => {
          const palette = findAccentPalette(accentPaletteId);
          return {
            ...variant.colors,
            accentFrom: palette.accent,
            accentTo: palette.insightSurface,
            accentSoft: withAlpha(palette.accent, 0.16),
          };
        })()
      : variant.colors;
    const { radiusScale, boldText } = variant.surface;

    const radius = {
      sm: Math.round(baseRadius.sm * radiusScale),
      md: Math.round(baseRadius.md * radiusScale),
      lg: Math.round(baseRadius.lg * radiusScale),
      xl: Math.round(baseRadius.xl * radiusScale),
      pill: baseRadius.pill,
    };

    const typography = boldText
      ? (Object.fromEntries(
          Object.entries(baseTypography).map(([key, token]) => [
            key,
            { ...token, fontWeight: BOLDER[token.fontWeight] ?? token.fontWeight },
          ])
        ) as typeof baseTypography)
      : baseTypography;

    return {
      colors,
      surface: variant.surface,
      style: resolved.style,
      availableStyles: selectableVisualStyles(allStyles),
      scheme,
      radius,
      spacing,
      typography,
    };
  }, [scheme, resolved.style, allStyles, accentPaletteId]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}

import React from 'react';
import { View, type ViewProps } from 'react-native';

import { surfaceBlur, surfaceShadow } from '@/theme/surfaceStyle';
import { useTheme } from '@/theme/ThemeProvider';

import { GlassSheen } from './GlassSheen';

interface GlassCardProps extends ViewProps {
  padded?: boolean;
}

// La tarjeta base de la app. No decide cómo se ve: lee los tokens del estilo
// visual activo, así la misma tarjeta sale translúcida con desenfoque
// (vidrio), sólida y sin borde (degradado suave) o con borde grueso y sombra
// dura (brutalista) — sin tocar ninguna pantalla.
export function GlassCard({ style, padded = true, children, ...rest }: GlassCardProps) {
  const { colors, radius, spacing, surface } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.surfaceBorder,
          borderWidth: surface.borderWidth,
          borderRadius: radius.lg,
          padding: padded ? spacing.lg : 0,
        },
        surfaceShadow(surface),
        surfaceBlur(surface),
        style,
      ]}
      {...rest}
    >
      {/* Solo estilos con desenfoque de verdad (glassmorfismo) atrapan luz
          arriba — el resto de estilos no lo necesita. */}
      {surface.blur > 0 && <GlassSheen radius={radius.lg} />}
      {children}
    </View>
  );
}

import React from 'react';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface GlassCardProps extends ViewProps {
  padded?: boolean;
}

export function GlassCard({ style, padded = true, children, ...rest }: GlassCardProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.surface,
          borderColor: colors.surfaceBorder,
          borderRadius: radius.lg,
          padding: padded ? spacing.lg : 0,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(15,23,42,0.08)' } as any,
      default: {
        shadowColor: '#0B1220',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
      },
    }),
  },
});

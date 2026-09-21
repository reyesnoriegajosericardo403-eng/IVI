import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AccountDropdown } from './AccountDropdown';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
}

// Cabecera reutilizable — antes traía dos íconos sueltos (Ajustes + IA);
// ahora ambos, y algunas cosas más, viven dentro del AccountDropdown para
// no repetir el mismo par de botones en cada pantalla (spec: "esos van a
// ser sustituidos por el Account Dropdown").
export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.row, { marginBottom: spacing.lg }]}>
      <View style={{ flex: 1 }}>
        <Text style={[typography.title, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle && (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{subtitle}</Text>
        )}
      </View>
      <AccountDropdown />
    </View>
  );
}

const styles = StyleSheet.create({
  // zIndex explícito: el menú de cuenta se despliega hacia abajo y puede
  // terminar sobre tarjetas de vidrio más abajo en la pantalla — sin
  // esto, esas tarjetas (que también usan backdrop-filter) pueden
  // acabar "ganándole" el toque al menú.
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 20 },
});

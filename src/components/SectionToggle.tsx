import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Currency } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency } from '@/utils/format';

// Encabezado de una sección colapsable — cerrada por defecto para que la
// pantalla se vea simple, con un total opcional visible sin necesidad de
// abrirla (spec: "quiero que ingresos y gastos sean dos casillas
// desplegables"; reutilizado también por Inversiones para "Cartera").
export function SectionToggle({
  title,
  amount,
  currency,
  open,
  onToggle,
}: {
  title: string;
  amount?: number;
  currency?: Currency;
  open: boolean;
  onToggle: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  return (
    <Pressable
      accessibilityLabel={`${open ? 'Ocultar' : 'Mostrar'} ${title}`}
      onPress={onToggle}
      style={[styles.toggle, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderRadius: radius.lg }]}
    >
      <Text style={[typography.title, { color: colors.textPrimary }]}>{title}</Text>
      <View style={styles.row}>
        {amount !== undefined && currency && (
          <Text style={[typography.headline, { color: colors.textPrimary, marginRight: spacing.sm }]}>
            {formatCurrency(amount, currency)}
          </Text>
        )}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
});

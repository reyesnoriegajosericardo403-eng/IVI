import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Currency } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency } from '@/utils/format';

// Tarjeta estilo "wallet" para una cuenta — reemplaza el renglón de lista
// delgado de antes (spec: "que se vean como tarjetas que se pueden
// deslizar, como el ejemplo que te pasé"). El ícono de `iconName` es un
// placeholder por tipo de cuenta hasta que lleguen los logos reales de
// cada institución (el usuario los mandará después) — cuando existan,
// van aquí en vez del ícono de Ionicons.
export function AccountCard({
  name,
  typeLabel,
  balance,
  currency,
  color,
  iconName,
  onPress,
  onDelete,
  accessibilityLabel,
}: {
  name: string;
  typeLabel: string;
  balance: number;
  currency: Currency;
  color: string;
  iconName: string;
  onPress: () => void;
  onDelete?: () => void;
  accessibilityLabel: string;
}) {
  const { typography, radius } = useTheme();

  return (
    <Pressable accessibilityLabel={accessibilityLabel} onPress={onPress} style={[styles.card, { backgroundColor: color, borderRadius: radius.lg }]}>
      <View style={styles.topRow}>
        <View style={styles.iconBadge}>
          <Ionicons name={iconName as any} size={20} color="#FFFFFF" />
        </View>
        {onDelete && (
          <Pressable accessibilityLabel={`Eliminar ${name}`} onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.85)" />
          </Pressable>
        )}
      </View>

      <View>
        <Text style={[typography.headline, styles.name]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[typography.micro, styles.typeLabel]}>{typeLabel}</Text>
        <Text style={[typography.title, styles.balance]} numberOfLines={1} adjustsFontSizeToFit>
          {formatCurrency(balance, currency)}
        </Text>
      </View>
    </Pressable>
  );
}

const CARD_WIDTH = 260;

export const ACCOUNT_CARD_WIDTH = CARD_WIDTH;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: 160,
    padding: 18,
    justifyContent: 'space-between',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: '#FFFFFF' },
  typeLabel: { color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  balance: { color: '#FFFFFF', marginTop: 10 },
});

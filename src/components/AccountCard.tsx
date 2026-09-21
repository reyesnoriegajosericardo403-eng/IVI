import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Currency } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency } from '@/utils/format';

interface AccountCardVisualProps {
  name: string;
  typeLabel: string;
  balance: number;
  currency: Currency;
  color: string;
  iconName: string;
  onDelete?: () => void;
}

// Solo el contenido visual, sin su propio touch responder — lo usa tanto
// `AccountCard` (envuelto en un único Pressable, para listas simples como
// el onboarding) como `AccountCardStack` (envuelto en su propio
// PanResponder, para poder arrastrarla). Ponerle un Pressable aquí adentro
// competiría por el toque con el PanResponder de la pila y el arrastre
// nunca llegaría a dispararse — React Native le da el toque al responder
// MÁS PROFUNDO que exista justo en ese punto.
export function AccountCardVisual({ name, typeLabel, balance, currency, color, iconName, onDelete }: AccountCardVisualProps) {
  const { typography } = useTheme();

  return (
    <View style={[styles.cardInner, { backgroundColor: color }]}>
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
    </View>
  );
}

// Tarjeta estilo "wallet" para una cuenta, tocable como una sola pieza —
// se usa donde no hace falta arrastrarla (onboarding: columna vertical
// simple). El ícono de `iconName` es un placeholder por tipo de cuenta
// hasta que lleguen los logos reales de cada institución.
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
  const { radius } = useTheme();

  return (
    <Pressable accessibilityLabel={accessibilityLabel} onPress={onPress} style={[styles.pressableClip, { borderRadius: radius.lg }]}>
      <AccountCardVisual name={name} typeLabel={typeLabel} balance={balance} currency={currency} color={color} iconName={iconName} onDelete={onDelete} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableClip: { width: '100%', overflow: 'hidden' },
  cardInner: {
    width: '100%',
    height: 150,
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

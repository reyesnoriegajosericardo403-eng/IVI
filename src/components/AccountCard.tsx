import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Currency } from '@/data/types';
import { surfaceBlur, withAlpha } from '@/theme/surfaceStyle';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency } from '@/utils/format';

import { GlassSheen } from './GlassSheen';

interface AccountCardVisualProps {
  name: string;
  typeLabel: string;
  balance: number;
  currency: Currency;
  color: string;
  iconName: string;
  onDelete?: () => void;
  // Versión más chica para cuando la tarjeta comparte la mitad del ancho
  // con otra ficha (spec: "deben ser más pequeñas a los lados").
  compact?: boolean;
}

// Solo el contenido visual, sin su propio touch responder — lo usa tanto
// `AccountCard` (envuelto en un único Pressable, para listas simples como
// el onboarding) como `AccountCardStack` (envuelto en su propio
// PanResponder, para poder arrastrarla). Ponerle un Pressable aquí adentro
// competiría por el toque con el PanResponder de la pila y el arrastre
// nunca llegaría a dispararse — React Native le da el toque al responder
// MÁS PROFUNDO que exista justo en ese punto.
//
// El "vidrio" ya NO es una opción que elige quien la usa — sale del
// estilo visual activo, igual que GlassCard (spec: "en la parte de
// patrimonio igual requiero que a las tarjetas... les apliques el estilo
// de vidrio o los diferentes estilos, deacuerdo al que el usuario
// escoja"). Con blur (Vidrio): color translúcido + desenfoque + brillo.
// Sin blur (Degradado suave, Neo brutalista): el color a toda opacidad —
// nunca transparente sin desenfoque real detrás, porque entonces se ve
// la tarjeta de atrás en la pila (spec: "se transparentan y dejan ver las
// tarjetas detrás lo cual confunde").
export function AccountCardVisual({ name, typeLabel, balance, currency, color, iconName, onDelete, compact = false }: AccountCardVisualProps) {
  const { typography, surface, radius, scheme } = useTheme();
  const isGlass = surface.blur > 0;
  // Más alfa en claro que en oscuro — el mismo 0.55 de antes se veía
  // sombrío sobre un fondo claro (spec: "les des mas vivacidad al
  // color"); en oscuro ya se leía bien.
  const glassAlpha = scheme === 'light' ? 0.72 : 0.55;

  return (
    <View
      style={[
        compact ? styles.cardInnerCompact : styles.cardInner,
        {
          backgroundColor: isGlass ? withAlpha(color, glassAlpha) : color,
          borderRadius: compact ? radius.md : radius.lg,
        },
        isGlass && surfaceBlur(surface),
        isGlass && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
      ]}
    >
      {isGlass && <GlassSheen radius={compact ? radius.md : radius.lg} intensity={0.7} />}
      <View style={styles.topRow}>
        <View style={[styles.iconBadge, compact && styles.iconBadgeCompact]}>
          <Ionicons name={iconName as any} size={compact ? 15 : 20} color="#FFFFFF" />
        </View>
        {onDelete && (
          <Pressable accessibilityLabel={`Eliminar ${name}`} onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.85)" />
          </Pressable>
        )}
      </View>

      <View>
        <Text style={[compact ? typography.caption : typography.headline, styles.name]} numberOfLines={1}>
          {name}
        </Text>
        {!compact && <Text style={[typography.micro, styles.typeLabel]}>{typeLabel}</Text>}
        <Text
          style={[compact ? typography.body : typography.title, styles.balance]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
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
  cardInnerCompact: {
    width: '100%',
    height: 110,
    padding: 12,
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
  iconBadgeCompact: { width: 26, height: 26, borderRadius: 13 },
  name: { color: '#FFFFFF' },
  typeLabel: { color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  balance: { color: '#FFFFFF', marginTop: 10 },
});

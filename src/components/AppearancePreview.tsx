import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { findAccentPalette } from '@/theme/accentPalettes';
import { formatCurrency } from '@/utils/format';

// Miniatura de "cómo se vería Inicio" con la selección TODAVÍA SIN APLICAR
// (spec: "Ver cambios al instante en la vista previa" antes de tocar
// Aplicar) — nunca lee useTheme(), solo los valores en borrador que le pasa
// app/appearance.tsx, para que Cancelar de verdad no cambie nada.
export function AppearancePreview({
  accentPaletteId,
  photoUri,
  photoSource,
  darkness,
  blurAmount,
}: {
  accentPaletteId: string;
  photoUri?: string;
  photoSource?: unknown;
  darkness: number;
  blurAmount: number;
}) {
  const palette = findAccentPalette(accentPaletteId);
  const hasPhoto = !!(photoUri || photoSource);
  const blurPx = Math.round(blurAmount * 10);
  const imgStyle =
    Platform.OS === 'web' && hasPhoto
      ? ({ filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined, transform: [{ scale: 1.08 }] } as object)
      : undefined;

  return (
    <View style={styles.frame}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1B2029' }]} />
      {hasPhoto && (
        <Image source={photoUri ? { uri: photoUri } : (photoSource as number)} resizeMode="cover" style={[StyleSheet.absoluteFill, imgStyle]} />
      )}
      {hasPhoto && (
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="previewDarken" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#000000" stopOpacity={darkness * 0.7} />
              <Stop offset="100%" stopColor="#000000" stopOpacity={darkness * 0.85} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#previewDarken)" />
        </Svg>
      )}

      <View style={styles.content}>
        <Text style={styles.eyebrow}>PATRIMONIO NETO</Text>
        <Text style={styles.amount}>{formatCurrency(48250, 'MXN')}</Text>

        <View style={[styles.card, { borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(48,56,68,0.62)' }]}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBadge, { backgroundColor: palette.accent }]}>
              <Ionicons name="trending-up" size={12} color={palette.accentText} />
            </View>
            <Text style={styles.cardLabel}>Presupuesto del mes</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '64%', backgroundColor: palette.accent }]} />
          </View>
        </View>

        <View style={[styles.button, { backgroundColor: palette.accent }]}>
          <Text style={[styles.buttonText, { color: palette.accentText }]}>Registrar movimiento</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', height: 220, borderRadius: 20, overflow: 'hidden' },
  content: { flex: 1, padding: 16, justifyContent: 'flex-end', gap: 8 },
  eyebrow: { color: '#D7D6D1', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  amount: { color: '#FEFCF8', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 14, padding: 10, gap: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBadge: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { color: '#FEFCF8', fontSize: 12, fontWeight: '600' },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },
  button: { marginTop: 4, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  buttonText: { fontWeight: '700', fontSize: 13 },
});

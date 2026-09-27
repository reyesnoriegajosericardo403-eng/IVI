import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { BackgroundPhotoLayer } from '@/components/BackgroundPhotoLayer';
import { findAccentPalette } from '@/theme/accentPalettes';
import { formatCurrency } from '@/utils/format';

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// Miniatura de "cómo se vería Inicio" con la selección TODAVÍA SIN APLICAR
// (spec: "Ver cambios al instante en la vista previa" antes de tocar
// Aplicar) — nunca lee useTheme(), solo los valores en borrador que le pasa
// app/appearance.tsx, para que Cancelar de verdad no cambie nada.
//
// Usa el MISMO BackgroundPhotoLayer que pinta el fondo real de toda la app
// (antes tenía su propio <Image resizeMode="cover"> aparte, que ni
// siquiera respetaba el punto focal — así que "mover imagen" no se veía
// reflejado aquí, una de las quejas reportadas). Cuando `interactive` está
// activo, arrastrar sobre la propia vista previa mueve el punto focal
// directamente — reemplaza la grilla 3x3 de "Mover imagen", que resultó
// confusa (¿qué punto representa qué?) por manipulación directa sobre la
// imagen real.
export function AppearancePreview({
  accentPaletteId,
  photoUri,
  photoSource,
  darkness,
  blurAmount,
  focalX = 0.5,
  focalY = 0.5,
  onFocalChange,
  interactive = false,
}: {
  accentPaletteId: string;
  photoUri?: string;
  photoSource?: unknown;
  darkness: number;
  blurAmount: number;
  focalX?: number;
  focalY?: number;
  onFocalChange?: (x: number, y: number) => void;
  interactive?: boolean;
}) {
  const palette = findAccentPalette(accentPaletteId);
  const hasPhoto = !!(photoUri || photoSource);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // El PanResponder se crea UNA sola vez (useRef) — se lee todo lo que
  // cambia (foco actual, tamaño, callback) desde `latest` para no
  // recrearlo en cada render, mismo patrón ya usado en BudgetTemplateList.tsx.
  const latest = useRef({ focalX, focalY, size, onFocalChange, interactive });
  latest.current = { focalX, focalY, size, onFocalChange, interactive };
  const dragStart = useRef({ x: focalX, y: focalY });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => latest.current.interactive,
      onMoveShouldSetPanResponder: () => latest.current.interactive,
      onPanResponderGrant: () => {
        dragStart.current = { x: latest.current.focalX, y: latest.current.focalY };
      },
      onPanResponderMove: (_, gesture) => {
        const { width, height } = latest.current.size;
        if (!width || !height) return;
        const x = clamp01(dragStart.current.x + gesture.dx / width);
        const y = clamp01(dragStart.current.y + gesture.dy / height);
        latest.current.onFocalChange?.(x, y);
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  return (
    <View style={styles.frame} onLayout={onLayout}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1B2029' }]} />
      {hasPhoto && size.width > 0 && (
        <BackgroundPhotoLayer
          uri={photoUri}
          source={photoSource}
          width={size.width}
          height={size.height}
          focalX={focalX}
          focalY={focalY}
          darkness={darkness}
          blurAmount={blurAmount}
          filterIdSuffix="Preview"
        />
      )}

      <View style={styles.content} pointerEvents="none">
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

      {interactive && hasPhoto && (
        <>
          {/* Captura el arrastre en TODA la vista previa — no solo cerca del
              marcador — para que mover la foto sea fácil de encontrar sin
              tener que acertarle a un punto pequeño. */}
          <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
          <View
            pointerEvents="none"
            style={[
              styles.focalMarker,
              { left: focalX * size.width - 14, top: focalY * size.height - 14 },
            ]}
          >
            <View style={styles.focalMarkerRing} />
            <View style={styles.focalMarkerDot} />
          </View>
          <View pointerEvents="none" style={styles.focalHint}>
            <Ionicons name="move-outline" size={12} color="#FEFCF8" />
            <Text style={styles.focalHintText}>Arrastra para mover la foto</Text>
          </View>
        </>
      )}
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
  focalMarker: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  focalMarkerRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FEFCF8',
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  focalMarkerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FEFCF8' },
  focalHint: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  focalHintText: { color: '#FEFCF8', fontSize: 11, fontWeight: '600' },
});

import { router } from 'expo-router';
import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { SWIPE_ORDER } from './AppTabBar';

// Qué tan lejos y qué tan derecho tiene que ir el dedo para contar como
// "cambiar de sección". Alto a propósito: así un arrastre de tarjetas, un
// carrusel horizontal o un scroll normal nunca se confunden con navegar.
const MIN_DISTANCE = 70;
const HORIZONTAL_DOMINANCE = 2;

// Deslizar de lado para moverse entre secciones, sin quitar el TAB (spec:
// "se van a conservar el Tab pero puedes preferir solo deslizar la
// pantalla").
//
// Observa los eventos de puntero en vez de reclamar el gesto: así NUNCA le
// quita el control a lo que ya funciona dentro de las pantallas (arrastrar
// una tarjeta de cuenta, arrastrar un presupuesto al calendario, los
// carruseles de chips). Solo mira dónde empezó y dónde terminó el dedo.
export function TabSwipeArea({ activeRoute, children }: { activeRoute: string; children: React.ReactNode }) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const goByOffset = (offset: number) => {
    const current = SWIPE_ORDER.indexOf(activeRoute);
    if (current === -1) return;
    const next = current + offset;
    // Sin vuelta circular: en los extremos simplemente no pasa nada.
    if (next < 0 || next >= SWIPE_ORDER.length) return;
    const route = SWIPE_ORDER[next];
    router.navigate(`/(tabs)/${route === 'index' ? '' : route}` as never);
  };

  return (
    <View
      style={styles.root}
      onPointerDown={(e) => {
        start.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
      }}
      onPointerUp={(e) => {
        const from = start.current;
        start.current = null;
        if (!from) return;
        const dx = e.nativeEvent.clientX - from.x;
        const dy = e.nativeEvent.clientY - from.y;
        if (Math.abs(dx) < MIN_DISTANCE) return;
        if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_DOMINANCE) return;
        // Deslizar hacia la izquierda avanza a la siguiente sección.
        goByOffset(dx < 0 ? 1 : -1);
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

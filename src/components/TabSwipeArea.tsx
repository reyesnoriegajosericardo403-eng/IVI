import { router } from 'expo-router';
import React, { useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { SWIPE_ORDER } from './AppTabBar';

// Qué tan pronto se nota que el dedo va horizontal — mismo criterio de
// "intención" que ya usa CalendarPicker antes de reclamar un gesto propio.
const CLAIM_THRESHOLD = 12;
// Qué tan lejos tiene que llegar el dedo para que YA cuente como "cambiar
// de sección" (además de solo notarse horizontal).
const MIN_DISTANCE = 60;
const HORIZONTAL_DOMINANCE = 1.5;

// Deslizar de lado para moverse entre secciones, sin quitar el TAB (spec:
// "se van a conservar el Tab pero puedes preferir solo deslizar la
// pantalla").
//
// Usa el sistema de "responder" propio de React Native (PanResponder), el
// mismo que ya usan la pila de tarjetas y el calendario de arrastre — NO
// simples eventos de puntero. La razón: solo el responder system negocia de
// verdad quién se queda con un gesto (el nodo más profundo que lo pide
// gana), así que un scroll vertical o el arrastre de una tarjeta siguen
// ganando sobre este deslizamiento cuando corresponde, y en un teléfono real
// el navegador no nos cancela el gesto a media pantalla como sí puede pasar
// con onPointerDown/onPointerUp sueltos.
export function TabSwipeArea({ activeRoute, children }: { activeRoute: string; children: React.ReactNode }) {
  // Ref de "último valor": el PanResponder se crea una sola vez (con
  // useRef), así que sin esto quedaría con el activeRoute del primer
  // render para siempre.
  const activeRouteRef = useRef(activeRoute);
  activeRouteRef.current = activeRoute;

  const goByOffset = (offset: number) => {
    const current = SWIPE_ORDER.indexOf(activeRouteRef.current);
    if (current === -1) return;
    const next = current + offset;
    // Sin vuelta circular: en los extremos simplemente no pasa nada.
    if (next < 0 || next >= SWIPE_ORDER.length) return;
    const route = SWIPE_ORDER[next];
    router.navigate(`/(tabs)/${route === 'index' ? '' : route}` as never);
  };

  const responder = useRef(
    PanResponder.create({
      // Nunca al primer toque: así un tap normal, o el inicio de un scroll
      // o de un arrastre de un hijo (tarjeta, calendario), sigue siendo del
      // hijo — este contenedor solo entra si nadie más lo reclamó antes.
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > CLAIM_THRESHOLD && Math.abs(gesture.dx) > Math.abs(gesture.dy) * HORIZONTAL_DOMINANCE,
      // Si algo más pide el gesto mientras lo tenemos, se lo cedemos sin
      // pelear — esto nunca debe "ganarle" a una interacción real.
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: (_evt, gesture) => {
        if (Math.abs(gesture.dx) < MIN_DISTANCE) return;
        // Deslizar hacia la izquierda avanza a la siguiente sección.
        goByOffset(gesture.dx < 0 ? 1 : -1);
      },
    })
  ).current;

  return (
    <View style={styles.root} {...responder.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

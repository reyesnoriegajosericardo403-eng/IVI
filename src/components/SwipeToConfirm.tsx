import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useTheme } from '@/theme/ThemeProvider';

const THUMB_SIZE = 56;
const THRESHOLD_RATIO = 0.8;

interface SwipeToConfirmProps {
  // Se llama UNA sola vez, cuando el gesto cruza el umbral y termina la
  // animación de 300ms — nunca por un tap suelto, así se acaba el problema
  // de que el botón "Listo" a veces no registraba el toque a la primera.
  onConfirm: () => void;
  label?: string;
  confirmedLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  accessibilityLabel?: string;
}

// Barra de "deslizar para confirmar" — reemplaza un botón de un solo toque
// por un gesto continuo, hecho a propósito para que sea imposible que se
// dispare a medias o por accidente. Usa react-native-gesture-handler con
// `.runOnJS(true)` (los callbacks corren como funciones normales de JS, no
// como "worklets" de Reanimated) para no depender de un plugin de Babel
// especial en el bundler de este proyecto.
export function SwipeToConfirm({
  onConfirm,
  label = 'Desliza para guardar',
  confirmedLabel = '¡Listo!',
  icon = 'mic',
  disabled = false,
  accessibilityLabel = 'Deslizar para guardar',
}: SwipeToConfirmProps) {
  const { colors, typography, radius } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const translateX = useRef(new Animated.Value(0)).current;
  const dragXRef = useRef(0);
  const hapticFiredRef = useRef(false);
  const maxTranslateRef = useRef(0);
  const disabledRef = useRef(disabled);
  const confirmedRef = useRef(confirmed);
  const onConfirmRef = useRef(onConfirm);

  const maxTranslate = Math.max(0, trackWidth - THUMB_SIZE);

  useEffect(() => {
    maxTranslateRef.current = maxTranslate;
  }, [maxTranslate]);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);
  useEffect(() => {
    confirmedRef.current = confirmed;
  }, [confirmed]);
  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

  // Si el botón se vuelve a habilitar (ej. nueva grabación), regresa el
  // gesto a su posición inicial en vez de quedarse "atorado" confirmado.
  useEffect(() => {
    if (!disabled) {
      setConfirmed(false);
      hapticFiredRef.current = false;
      dragXRef.current = 0;
      translateX.setValue(0);
    }
  }, [disabled, translateX]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  const finishConfirm = useCallback(() => {
    setConfirmed(true);
    setDragging(false);
    Animated.timing(translateX, { toValue: maxTranslateRef.current, duration: 120, useNativeDriver: false }).start();
    setTimeout(() => onConfirmRef.current(), 300);
  }, [translateX]);

  const resetPosition = useCallback(() => {
    setDragging(false);
    dragXRef.current = 0;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: false, bounciness: 8, speed: 14 }).start();
  }, [translateX]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          if (disabledRef.current || confirmedRef.current || maxTranslateRef.current <= 0) return;
          hapticFiredRef.current = false;
          setDragging(true);
        })
        .onUpdate((e) => {
          if (disabledRef.current || confirmedRef.current || maxTranslateRef.current <= 0) return;
          const max = maxTranslateRef.current;
          const raw = Math.max(0, Math.min(max, e.translationX));
          dragXRef.current = raw;
          translateX.setValue(raw);
          const pct = raw / max;
          if (pct >= THRESHOLD_RATIO && !hapticFiredRef.current) {
            hapticFiredRef.current = true;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          } else if (pct < THRESHOLD_RATIO) {
            hapticFiredRef.current = false;
          }
        })
        .onEnd(() => {
          if (disabledRef.current || confirmedRef.current || maxTranslateRef.current <= 0) return;
          const max = maxTranslateRef.current;
          const pct = max > 0 ? dragXRef.current / max : 0;
          if (pct >= THRESHOLD_RATIO) {
            finishConfirm();
          } else {
            resetPosition();
          }
        })
        .runOnJS(true),
    [translateX, finishConfirm, resetPosition]
  );

  const fillWidth = Animated.add(translateX, THUMB_SIZE / 2 + 4);
  const isActive = dragging || confirmed;

  return (
    <View
      onLayout={onLayout}
      accessibilityLabel={`Barra: ${accessibilityLabel}`}
      style={[
        styles.track,
        { backgroundColor: colors.accentSoft, borderRadius: radius.pill, height: THUMB_SIZE, opacity: disabled ? 0.6 : 1 },
      ]}
    >
      {trackWidth > 0 && (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.fill,
              { width: fillWidth, height: THUMB_SIZE, borderRadius: radius.pill, backgroundColor: colors.accentFrom },
            ]}
          />
          <View pointerEvents="none" style={styles.labelWrap}>
            <Text style={[typography.body, { color: isActive ? '#FFFFFF' : colors.accentFrom, fontWeight: '700' }]}>
              {confirmed ? confirmedLabel : label}
            </Text>
          </View>
          <GestureDetector gesture={pan}>
            <Animated.View
              accessibilityLabel={accessibilityLabel}
              style={[
                styles.thumb,
                {
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  borderRadius: THUMB_SIZE / 2,
                  backgroundColor: colors.accentFrom,
                  transform: [{ translateX }],
                },
              ]}
            >
              <Ionicons name={confirmed ? 'checkmark' : dragging ? 'chevron-forward' : icon} size={24} color="#FFFFFF" />
            </Animated.View>
          </GestureDetector>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', justifyContent: 'center', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0 },
  labelWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  thumb: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
});

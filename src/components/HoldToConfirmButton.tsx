import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const HOLD_DURATION_MS = 900;
const RELEASE_DURATION_MS = 180;
const ERROR_RESET_MS = 3000;
const STROKE_WIDTH = 3;

type HoldState = 'idle' | 'holding' | 'saving' | 'success' | 'error';

interface HoldToConfirmButtonProps {
  // Puede ser async — si truena/rechaza, el botón muestra el estado de
  // error en vez de fallar en silencio (nunca se debe fingir un guardado
  // que no ocurrió).
  onConfirm: () => void | Promise<void>;
  label?: string;
  holdingLabel?: string;
  savingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  accessibilityLabel?: string;
  height?: number;
}

// Botón "Mantén presionado para confirmar" — reemplaza el gesto de deslizar
// (que seguía sin registrar el toque a la primera para algunos usuarios) por
// un mantener-presionado con un anillo de neón que se llena alrededor del
// botón. Solo se ejecuta `onConfirm` cuando el llenado llega al 100%; soltar
// antes cancela sin ejecutar nada.
export function HoldToConfirmButton({
  onConfirm,
  label = 'Mantén presionado para guardar',
  holdingLabel = 'Sigue presionando…',
  savingLabel = 'Guardando…',
  successLabel = '¡Guardado correctamente!',
  errorLabel = 'Upps, no se guardó correctamente. Dale otra vez.',
  icon = 'mic',
  disabled = false,
  accessibilityLabel = 'Mantener presionado para guardar',
  height = 64,
}: HoldToConfirmButtonProps) {
  const { colors, typography, radius } = useTheme();
  const [state, setState] = useState<HoldState>('idle');
  const [boxWidth, setBoxWidth] = useState(0);

  const fill = useRef(new Animated.Value(0)).current;
  const runningAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const onConfirmRef = useRef(onConfirm);
  const disabledRef = useRef(disabled);
  const errorResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(
    () => () => {
      if (errorResetTimerRef.current) clearTimeout(errorResetTimerRef.current);
    },
    []
  );

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setBoxWidth(e.nativeEvent.layout.width);
  }, []);

  const resetToIdle = useCallback(() => {
    setState('idle');
    fill.setValue(0);
  }, [fill]);

  const handleThresholdReached = useCallback(async () => {
    setState('saving');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const startedAt = Date.now();
    const MIN_SAVING_MS = 250; // que el loader no sea un parpadeo imperceptible
    try {
      await onConfirmRef.current();
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_SAVING_MS) await new Promise((r) => setTimeout(r, MIN_SAVING_MS - elapsed));
      setState('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      setState('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      errorResetTimerRef.current = setTimeout(resetToIdle, ERROR_RESET_MS);
    }
  }, [resetToIdle]);

  const handlePressIn = useCallback(() => {
    if (disabledRef.current || state === 'saving' || state === 'success') return;
    setState('holding');
    const anim = Animated.timing(fill, {
      toValue: 1,
      duration: HOLD_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    runningAnimRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) handleThresholdReached();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, fill]);

  const handlePressOut = useCallback(() => {
    if (state !== 'holding') return;
    runningAnimRef.current?.stop();
    setState('idle');
    Animated.timing(fill, { toValue: 0, duration: RELEASE_DURATION_MS, useNativeDriver: false }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, fill]);

  const stateColor = useMemo(() => {
    if (state === 'success') return colors.success;
    if (state === 'error') return colors.danger;
    return colors.info; // acento "neón" cyan/azul mientras se llena
  }, [state, colors]);

  const displayLabel =
    state === 'saving' ? savingLabel : state === 'success' ? successLabel : state === 'error' ? errorLabel : state === 'holding' ? holdingLabel : label;

  const rx = height / 2;
  const perimeter = boxWidth > 0 ? 2 * (boxWidth - 2 * rx) + 2 * (height - 2 * rx) + 2 * Math.PI * rx : 0;
  const strokeDashoffset = fill.interpolate({ inputRange: [0, 1], outputRange: [perimeter, 0] });

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || state === 'saving' || state === 'success'}
      style={[
        styles.button,
        {
          height,
          borderRadius: rx,
          backgroundColor: colors.surfaceSolid,
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          opacity: disabled ? 0.6 : 1,
          shadowColor: stateColor,
          shadowOpacity: state === 'holding' || state === 'success' ? 0.55 : 0,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
          elevation: state === 'holding' || state === 'success' ? 6 : 0,
        },
      ]}
    >
      {boxWidth > 0 && (
        <Svg width={boxWidth} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Rect
            x={STROKE_WIDTH / 2}
            y={STROKE_WIDTH / 2}
            width={boxWidth - STROKE_WIDTH}
            height={height - STROKE_WIDTH}
            rx={rx - STROKE_WIDTH / 2}
            fill="none"
            stroke={colors.divider}
            strokeWidth={STROKE_WIDTH}
          />
          <AnimatedRect
            x={STROKE_WIDTH / 2}
            y={STROKE_WIDTH / 2}
            width={boxWidth - STROKE_WIDTH}
            height={height - STROKE_WIDTH}
            rx={rx - STROKE_WIDTH / 2}
            fill="none"
            stroke={stateColor}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${perimeter}, ${perimeter}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
      )}
      <View style={styles.content} pointerEvents="none">
        {state === 'saving' ? (
          <ActivityIndicator color={stateColor} />
        ) : (
          <Ionicons
            name={state === 'success' ? 'checkmark-circle' : state === 'error' ? 'alert-circle' : icon}
            size={20}
            color={stateColor}
          />
        )}
        <Text
          style={[typography.body, { color: colors.textPrimary, fontWeight: '700', marginLeft: 10, flexShrink: 1 }]}
          numberOfLines={2}
        >
          {displayLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});

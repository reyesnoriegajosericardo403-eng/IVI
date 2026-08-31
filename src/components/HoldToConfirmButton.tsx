import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const HOLD_DURATION_MS = 900;
const RELEASE_DURATION_MS = 180;
const ERROR_RESET_MS = 3000;
const STROKE_WIDTH = 4;
const DIAMETER = 84;

type HoldState = 'idle' | 'holding' | 'saving' | 'success' | 'error';

// Estilo que evita que el navegador seleccione texto o muestre el menú de
// "copiar/pegar" al mantener el dedo/mouse presionado — eso era lo que
// cancelaba el gesto (spec: "se selecciona el texto que está dentro del
// botoncito y eso cancela el registro"). Ya no hay texto adentro del
// botón, pero se deja también aquí por si el navegador intenta seleccionar
// el ícono o el fondo.
const noSelectStyle = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
} as any;

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
}

// Botón circular "Mantén presionado para confirmar" — el texto vive AFUERA
// del botón (nunca adentro) para que no haya nada que un navegador pueda
// intentar seleccionar durante el hold. Un anillo de neón se llena
// alrededor del círculo mientras se sostiene; soltar antes del 100%
// cancela sin ejecutar nada.
export function HoldToConfirmButton({
  onConfirm,
  label = 'Mantén presionado para guardar',
  holdingLabel = 'Sigue presionando…',
  savingLabel = 'Guardando…',
  successLabel = '¡Guardado correctamente!',
  errorLabel = 'Upps, no se guardó. Dale otra vez.',
  icon = 'mic',
  disabled = false,
  accessibilityLabel = 'Mantener presionado para guardar',
}: HoldToConfirmButtonProps) {
  const { colors, typography } = useTheme();
  const [state, setState] = useState<HoldState>('idle');

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

  const radiusPx = (DIAMETER - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radiusPx;
  const strokeDashoffset = fill.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || state === 'saving' || state === 'success'}
        style={[
          styles.button,
          noSelectStyle,
          {
            width: DIAMETER,
            height: DIAMETER,
            borderRadius: DIAMETER / 2,
            backgroundColor: colors.surfaceSolid,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            opacity: disabled ? 0.6 : 1,
            shadowColor: stateColor,
            shadowOpacity: state === 'holding' || state === 'success' ? 0.6 : 0,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 0 },
            elevation: state === 'holding' || state === 'success' ? 8 : 0,
          },
        ]}
      >
        <Svg width={DIAMETER} height={DIAMETER} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Circle cx={DIAMETER / 2} cy={DIAMETER / 2} r={radiusPx} fill="none" stroke={colors.divider} strokeWidth={STROKE_WIDTH} />
          <AnimatedCircle
            cx={DIAMETER / 2}
            cy={DIAMETER / 2}
            r={radiusPx}
            fill="none"
            stroke={stateColor}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${circumference}, ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${DIAMETER / 2}, ${DIAMETER / 2}`}
          />
        </Svg>
        <View pointerEvents="none">
          {state === 'saving' ? (
            <ActivityIndicator color={stateColor} />
          ) : (
            <Ionicons
              name={state === 'success' ? 'checkmark-circle' : state === 'error' ? 'alert-circle' : icon}
              size={30}
              color={stateColor}
            />
          )}
        </View>
      </Pressable>
      <Text style={[typography.caption, noSelectStyle, { color: colors.textSecondary, fontWeight: '700', marginTop: 10, textAlign: 'center' }]}>
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  button: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});

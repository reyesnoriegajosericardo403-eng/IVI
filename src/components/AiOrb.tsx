import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { CHAT_PALETTE } from '@/theme/chatPalette';

const AnimatedSvgCircle = Animated.createAnimatedComponent(Circle);
const logoSource = require('../../assets/icon.png');

// Logo real de la app (assets/icon.png), recortado en círculo y con un
// efecto 3D de esfera pulida (brillo especular arriba-izquierda + sombra
// de borde abajo-derecha) — reemplaza la esfera abstracta previa a pedido
// explícito del usuario ("el logo que tenemos ahora mismo... circular...
// con efecto 3D"). El halo de luz pulsante detrás se conserva igual.
export function AiOrb({ size = 96 }: { size?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, useNativeDriver: false }),
      ])
    );
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ])
    );
    glowLoop.start();
    breatheLoop.start();
    return () => {
      glowLoop.stop();
      breatheLoop.stop();
    };
  }, [pulse, breathe]);

  const glowSize = size * 2.1;
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] });
  const glowRadius = pulse.interpolate({ inputRange: [0, 1], outputRange: [size * 0.62, size * 0.72] });
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });

  return (
    <View style={{ width: glowSize, height: glowSize, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={glowSize} height={glowSize} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={CHAT_PALETTE.accent} stopOpacity={0.55} />
            <Stop offset="100%" stopColor={CHAT_PALETTE.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <AnimatedSvgCircle cx={glowSize / 2} cy={glowSize / 2} r={glowRadius} fill="url(#orbGlow)" opacity={glowOpacity} />
      </Svg>

      <Animated.View style={[styles.logoShadow, { width: size, height: size, borderRadius: size / 2, transform: [{ scale }] }]}>
        <View style={[styles.logoClip, { width: size, height: size, borderRadius: size / 2 }]}>
          <Image source={logoSource} style={{ width: size, height: size }} resizeMode="cover" />
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="orbGloss" cx="32%" cy="24%" r="65%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.55} />
                <Stop offset="45%" stopColor="#FFFFFF" stopOpacity={0.12} />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
              </RadialGradient>
              <RadialGradient id="orbRimShade" cx="68%" cy="78%" r="72%">
                <Stop offset="0%" stopColor="#000000" stopOpacity={0} />
                <Stop offset="65%" stopColor="#000000" stopOpacity={0} />
                <Stop offset="100%" stopColor="#000000" stopOpacity={0.4} />
              </RadialGradient>
            </Defs>
            <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#orbRimShade)" />
            <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#orbGloss)" />
          </Svg>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  logoClip: {
    overflow: 'hidden',
    backgroundColor: '#0B0A14',
  },
});

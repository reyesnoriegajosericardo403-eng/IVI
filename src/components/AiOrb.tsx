import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { CHAT_PALETTE } from '@/theme/chatPalette';

const AnimatedSvgCircle = Animated.createAnimatedComponent(Circle);

// Esfera de degradado iridiscente con brillo pulsante — referencia
// explícita del usuario (captura de un asistente de IA con una esfera de
// colores). Nada de esto viene del sistema de vidrio de la app: es un
// elemento propio de esta pantalla, deliberadamente vistoso.
export function AiOrb({ size = 96 }: { size?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const glowSize = size * 2.1;
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] });
  const glowRadius = pulse.interpolate({ inputRange: [0, 1], outputRange: [size * 0.62, size * 0.72] });

  return (
    <View style={{ width: glowSize, height: glowSize, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={glowSize} height={glowSize}>
        <Defs>
          <RadialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={CHAT_PALETTE.accent} stopOpacity={0.55} />
            <Stop offset="100%" stopColor={CHAT_PALETTE.accent} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="orbBody" cx="34%" cy="28%" r="80%">
            {CHAT_PALETTE.orbStops.map((c, i) => (
              <Stop key={c} offset={`${(i / (CHAT_PALETTE.orbStops.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </RadialGradient>
        </Defs>
        <AnimatedSvgCircle cx={glowSize / 2} cy={glowSize / 2} r={glowRadius} fill="url(#orbGlow)" opacity={glowOpacity} />
        <Circle cx={glowSize / 2} cy={glowSize / 2} r={size / 2} fill="url(#orbBody)" />
      </Svg>
    </View>
  );
}

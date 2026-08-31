import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface HealthGradientBarProps {
  score: number; // 0-100
  width?: number;
  height?: number;
}

// Barra degradada rojo→amarillo→verde con un indicador circular blanco en
// la posición del puntaje (spec: imagen "Tu salud financiera", 65/100).
// El degradado es fijo — rojo (0, salud baja) a verde (100, salud alta) —
// solo el indicador se mueve según el puntaje real.
export function HealthGradientBar({ score, width = 280, height = 14 }: HealthGradientBarProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const thumbSize = height + 10;
  const trackRadius = height / 2;
  const thumbLeft = Math.max(0, Math.min(width - thumbSize, (clamped / 100) * width - thumbSize / 2));

  return (
    <View style={{ width, height: thumbSize, justifyContent: 'center' }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="healthGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#EF4444" />
            <Stop offset="0.5" stopColor="#F59E0B" />
            <Stop offset="1" stopColor="#16A34A" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} rx={trackRadius} ry={trackRadius} fill="url(#healthGradient)" />
      </Svg>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: thumbLeft,
          top: (height - thumbSize) / 2,
          width: thumbSize,
          height: thumbSize,
          borderRadius: thumbSize / 2,
          backgroundColor: '#FFFFFF',
          borderWidth: 3,
          borderColor: 'rgba(0,0,0,0.12)',
        }}
      />
    </View>
  );
}

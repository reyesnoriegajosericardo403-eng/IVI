import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface BarTrendProps {
  data: number[];
  width?: number;
  height?: number;
  color: string;
}

// Versión de barras del mismo Sparkline — spec: "cambiarlo a una gráfica
// de barras". Cada barra lleva su propio degradado translúcido (vidrio
// más leve que el de una tarjeta: sin blur real, solo la transparencia y
// el brillito de arriba, que sobre una forma tan angosta ya se lee bien).
export function BarTrend({ data, width = 280, height = 64, color }: BarTrendProps) {
  if (data.length === 0) {
    return <View style={{ width, height }} />;
  }

  const min = Math.min(0, ...data);
  const max = Math.max(...data, 1);
  const range = max - min || 1;
  const gap = 4;
  const barWidth = Math.max(3, width / data.length - gap);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.85} />
          <Stop offset="1" stopColor={color} stopOpacity={0.35} />
        </LinearGradient>
        <LinearGradient id="barSheen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {data.map((v, i) => {
        const barHeight = Math.max(2, ((v - min) / range) * height);
        const x = i * (barWidth + gap);
        const y = height - barHeight;
        return (
          <React.Fragment key={i}>
            <Rect x={x} y={y} width={barWidth} height={barHeight} rx={barWidth / 3} fill="url(#barFill)" />
            <Rect x={x} y={y} width={barWidth} height={Math.min(barHeight, height * 0.4)} rx={barWidth / 3} fill="url(#barSheen)" />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

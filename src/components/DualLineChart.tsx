import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface DualLineChartProps {
  seriesA: number[];
  seriesB: number[];
  colorA: string;
  colorB: string;
  width?: number;
  height?: number;
}

// Gráfica histórica de dos series en la misma escala — pensada para
// activos (verde) vs. pasivos (rojo) en Patrimonio (spec: mostrar ambos,
// no solo la línea neta).
export function DualLineChart({ seriesA, seriesB, colorA, colorB, width = 300, height = 100 }: DualLineChartProps) {
  if (seriesA.length < 2 || seriesB.length < 2) {
    return <View style={{ width, height }} />;
  }

  const allValues = [...seriesA, ...seriesB];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const stepX = width / (seriesA.length - 1);
  const padding = 4;
  const drawHeight = height - padding * 2;

  const toPath = (data: number[]) =>
    data
      .map((v, i) => {
        const x = i * stepX;
        const y = padding + drawHeight - ((v - min) / range) * drawHeight;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  return (
    <Svg width={width} height={height}>
      <Path d={toPath(seriesB)} fill="none" stroke={colorB} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={toPath(seriesA)} fill="none" stroke={colorA} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

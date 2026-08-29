import React from 'react';
import Svg, { Circle, G } from 'react-native-svg';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  emptyColor: string;
}

// Gráfico de anillo sin dependencias externas, usando el truco de
// strokeDasharray sobre un círculo — igual de "sin librerías" que
// Sparkline/DualLineChart. Si no hay gasto todavía, muestra un anillo
// neutro en vez de inventar una proporción.
export function DonutChart({ data, size = 140, strokeWidth = 18, emptyColor }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  if (total <= 0) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={emptyColor} strokeWidth={strokeWidth} fill="none" />
      </Svg>
    );
  }

  let offsetAccum = 0;

  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${center}, ${center}`}>
        {data
          .filter((slice) => slice.value > 0)
          .map((slice, i) => {
            const fraction = slice.value / total;
            const dash = fraction * circumference;
            const strokeDashoffset = -offsetAccum;
            offsetAccum += dash;
            return (
              <Circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={strokeDashoffset}
                fill="none"
              />
            );
          })}
      </G>
    </Svg>
  );
}

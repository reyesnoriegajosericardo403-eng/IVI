import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { compactAmount } from '@/utils/format';

interface BarTrendProps {
  data: number[];
  labels?: string[];
  width?: number;
  height?: number;
  color: string;
  // Segunda serie opcional (ej. pasivos junto a activos) — se dibuja
  // como una barra pareja, más angosta, al lado de la primera.
  seriesB?: number[];
  colorB?: string;
  showAxes?: boolean;
}

const AXIS_COLOR = '#94A3B8';
const MAX_X_LABELS = 5;

function pickLabelIndices(n: number, max: number): number[] {
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  const step = (n - 1) / (max - 1);
  const idxs = new Set<number>();
  for (let i = 0; i < max; i++) idxs.add(Math.round(i * step));
  return Array.from(idxs).sort((a, b) => a - b);
}

// Versión de barras del mismo Sparkline — spec: "cambiarlo a una gráfica
// de barras". Cada barra lleva su propio degradado translúcido (vidrio
// más leve que el de una tarjeta: sin blur real, solo la transparencia y
// el brillito de arriba, que sobre una forma tan angosta ya se lee bien).
export function BarTrend({ data, labels, width = 280, height = 64, color, seriesB, colorB, showAxes = true }: BarTrendProps) {
  if (data.length === 0) {
    return <View style={{ width, height }} />;
  }

  const leftMargin = showAxes ? 34 : 0;
  const bottomMargin = showAxes && labels ? 16 : 0;
  const topMargin = showAxes ? 6 : 0;
  const plotWidth = width - leftMargin;
  const plotHeight = height - bottomMargin - topMargin;

  const allValues = seriesB ? [...data, 0, ...seriesB] : [...data, 0];
  const min = Math.min(0, ...allValues);
  const max = Math.max(...allValues, 1);
  const range = max - min || 1;
  const baseY = topMargin + plotHeight - ((0 - min) / range) * plotHeight;

  const gap = 4;
  const groupWidth = Math.max(4, plotWidth / data.length - gap);
  const barWidth = seriesB ? groupWidth / 2 - 1 : groupWidth;

  const yTicks = [max, min + range / 2, min];
  const labelIdxs = showAxes && labels ? pickLabelIndices(labels.length, MAX_X_LABELS) : [];

  const renderBar = (v: number, x: number, w: number, fillId: string, sheenId: string) => {
    const barHeight = Math.max(2, (Math.abs(v) / range) * plotHeight);
    const y = v >= 0 ? baseY - barHeight : baseY;
    return (
      <React.Fragment>
        <Rect x={x} y={y} width={w} height={barHeight} rx={Math.min(w / 3, 6)} fill={`url(#${fillId})`} />
        <Rect x={x} y={y} width={w} height={Math.min(barHeight, plotHeight * 0.4)} rx={Math.min(w / 3, 6)} fill={`url(#${sheenId})`} />
      </React.Fragment>
    );
  };

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.85} />
          <Stop offset="1" stopColor={color} stopOpacity={0.35} />
        </LinearGradient>
        <LinearGradient id="barFillB" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colorB ?? color} stopOpacity={0.85} />
          <Stop offset="1" stopColor={colorB ?? color} stopOpacity={0.35} />
        </LinearGradient>
        <LinearGradient id="barSheen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {showAxes &&
        yTicks.map((v, i) => {
          const y = topMargin + (i / (yTicks.length - 1)) * plotHeight;
          return (
            <React.Fragment key={i}>
              <Line x1={leftMargin} y1={y} x2={width} y2={y} stroke={AXIS_COLOR} strokeOpacity={0.18} strokeWidth={1} strokeDasharray="2,3" />
              <SvgText x={leftMargin - 5} y={y + 3} fontSize={8} fill={AXIS_COLOR} textAnchor="end">
                {compactAmount(v)}
              </SvgText>
            </React.Fragment>
          );
        })}

      {data.map((v, i) => {
        const groupX = leftMargin + i * (groupWidth + gap);
        return (
          <React.Fragment key={i}>
            {renderBar(v, groupX, barWidth, 'barFill', 'barSheen')}
            {seriesB && renderBar(seriesB[i], groupX + barWidth + 2, barWidth, 'barFillB', 'barSheen')}
          </React.Fragment>
        );
      })}

      {showAxes &&
        labels &&
        labelIdxs.map((i) => (
          <SvgText
            key={i}
            x={leftMargin + i * (groupWidth + gap) + groupWidth / 2}
            y={height - 2}
            fontSize={8}
            fill={AXIS_COLOR}
            textAnchor="middle"
          >
            {labels[i]}
          </SvgText>
        ))}
    </Svg>
  );
}

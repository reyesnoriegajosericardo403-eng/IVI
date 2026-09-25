import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { compactAmount } from '@/utils/format';

interface SparklineProps {
  data: number[];
  labels?: string[];
  width?: number;
  height?: number;
  color: string;
  filled?: boolean;
  // Segunda serie opcional (ej. pasivos junto a activos) — misma escala
  // que la primera, sin relleno propio.
  seriesB?: number[];
  colorB?: string;
  // Encabezados de ejes + líneas guía — spec: "absolutamente todas...
  // deben tener líneas y encabezados en sus ejes 'x' y 'y'... líneas
  // para ubicarte en el periodo en el que estés". Se puede apagar en
  // versiones miniatura donde no cabe (spec: mantener trazos suaves que
  // no sobrecarguen la vista).
  showAxes?: boolean;
}

const AXIS_COLOR = '#94A3B8';
const MAX_X_LABELS = 5;

// Catmull-Rom → Bézier cúbica: la misma curva pasa por todos los puntos
// pero sin los picos de una polilínea recta (spec: "que no se vean
// puntiagudas").
function smoothPath(points: Array<[number, number]>): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)} L${points[1][0].toFixed(1)},${points[1][1].toFixed(1)}`;
  }
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

// Reparte como máximo `max` etiquetas a lo largo de `n` puntos, siempre
// incluyendo el primero y el último — para no encimar texto cuando hay
// más puntos de los que caben legibles.
function pickLabelIndices(n: number, max: number): number[] {
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  const step = (n - 1) / (max - 1);
  const idxs = new Set<number>();
  for (let i = 0; i < max; i++) idxs.add(Math.round(i * step));
  return Array.from(idxs).sort((a, b) => a - b);
}

// Gráfico de línea minimalista sin dependencias externas de charting —
// suficiente para tendencias (spec sección 31: "no saturar de información").
export function Sparkline({ data, labels, width = 280, height = 64, color, filled = true, seriesB, colorB, showAxes = true }: SparklineProps) {
  if (data.length < 2) {
    return <View style={{ width, height }} />;
  }

  const allValues = seriesB ? [...data, ...seriesB] : data;
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const leftMargin = showAxes ? 34 : 0;
  const bottomMargin = showAxes && labels ? 16 : 0;
  const topMargin = showAxes ? 6 : 0;
  const plotWidth = width - leftMargin;
  const plotHeight = height - bottomMargin - topMargin;
  const stepX = plotWidth / (data.length - 1);

  const toPoints = (series: number[]) =>
    series.map((v, i) => {
      const x = leftMargin + i * stepX;
      const y = topMargin + plotHeight - ((v - min) / range) * plotHeight;
      return [x, y] as [number, number];
    });

  const points = toPoints(data);
  const linePath = smoothPath(points);
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${(topMargin + plotHeight).toFixed(1)} L${leftMargin},${(topMargin + plotHeight).toFixed(1)} Z`;
  const pointsB = seriesB ? toPoints(seriesB) : null;
  const linePathB = pointsB ? smoothPath(pointsB) : null;

  const yTicks = [max, min + range / 2, min];
  const lastPoint = points[points.length - 1];
  const labelIdxs = showAxes && labels ? pickLabelIndices(labels.length, MAX_X_LABELS) : [];

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.25} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
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

      {/* Línea vertical suave en el último punto — para ubicarte en qué
          periodo estás dentro de la gráfica (spec). */}
      {showAxes && (
        <Line
          x1={lastPoint[0]}
          y1={topMargin}
          x2={lastPoint[0]}
          y2={topMargin + plotHeight}
          stroke={color}
          strokeOpacity={0.25}
          strokeWidth={1}
          strokeDasharray="2,3"
        />
      )}

      {filled && <Path d={areaPath} fill="url(#sparkFill)" stroke="none" />}
      {linePathB && (
        <Path d={linePathB} fill="none" stroke={colorB ?? color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      )}
      <Path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {points.map(([x, y], i) => (
        <Circle
          key={`a-${i}`}
          cx={x}
          cy={y}
          r={i === points.length - 1 ? 3.2 : 2}
          fill={i === points.length - 1 ? color : '#FFFFFF'}
          stroke={color}
          strokeWidth={1.4}
        />
      ))}
      {pointsB?.map(([x, y], i) => (
        <Circle
          key={`b-${i}`}
          cx={x}
          cy={y}
          r={i === pointsB.length - 1 ? 3.2 : 2}
          fill={i === pointsB.length - 1 ? colorB ?? color : '#FFFFFF'}
          stroke={colorB ?? color}
          strokeWidth={1.4}
        />
      ))}

      {showAxes &&
        labels &&
        labelIdxs.map((i) => (
          <SvgText key={i} x={leftMargin + i * stepX} y={height - 2} fontSize={8} fill={AXIS_COLOR} textAnchor="middle">
            {labels[i]}
          </SvgText>
        ))}
    </Svg>
  );
}

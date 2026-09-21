import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import type { NetWorthSnapshot } from '@/data/types';
import { makePeriodKey } from '@/utils/budgetPeriods';

import { BarTrend } from './BarTrend';
import { ChartOptionsDropdown, type ChartKind, type ChartPeriod } from './ChartOptionsDropdown';
import { Sparkline } from './Sparkline';

// Agrupa el historial (una entrada por día) en día/semana/mes — por
// semana o mes se queda con la última instantánea real de cada bucket,
// nunca un promedio inventado. Ordenado de más viejo a más nuevo.
function bucketHistory(history: NetWorthSnapshot[], period: ChartPeriod, maxPoints: number): number[] {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  if (period === 'day') {
    return sorted.slice(-maxPoints).map((h) => h.netWorth);
  }
  const scope = period === 'week' ? 'week' : 'month';
  const byBucket = new Map<string, NetWorthSnapshot>();
  const order: string[] = [];
  for (const snap of sorted) {
    const key = makePeriodKey(scope, new Date(`${snap.date}T00:00:00`));
    if (!byBucket.has(key)) order.push(key);
    byBucket.set(key, snap); // la última instantánea de ese bucket gana
  }
  return order.slice(-maxPoints).map((key) => byBucket.get(key)!.netWorth);
}

// Gráfica de patrimonio neto con su propio selector de tipo (línea/barras)
// y temporalidad (día/semana/mes) — spec: "poder cambiar de gráfica de
// línea a una gráfica de barras... por semana, del día o del mes". Se usa
// tanto en la ficha chica de Inicio como en la de Patrimonio.
export function NetWorthTrendChart({
  history,
  color,
  width = 280,
  height = 64,
  compact = false,
}: {
  history: NetWorthSnapshot[];
  color: string;
  width?: number;
  height?: number;
  compact?: boolean;
}) {
  const [chartType, setChartType] = useState<ChartKind>('line');
  const [period, setPeriod] = useState<ChartPeriod>('day');

  const maxPoints = period === 'day' ? (compact ? 10 : 14) : period === 'week' ? 8 : 6;
  const data = useMemo(() => bucketHistory(history, period, maxPoints), [history, period, maxPoints]);

  if (data.length < 2) return null;

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <ChartOptionsDropdown chartType={chartType} onChangeChartType={setChartType} period={period} onChangePeriod={setPeriod} />
      </View>
      {chartType === 'line' ? (
        <Sparkline data={data} color={color} width={width} height={height} />
      ) : (
        <BarTrend data={data} color={color} width={width} height={height} />
      )}
    </View>
  );
}

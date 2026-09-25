import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import type { NetWorthSnapshot } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { bucketNetWorthHistory } from '@/utils/chartBucket';

import { BarTrend } from './BarTrend';
import { ChartOptionsDropdown, type ChartKind, type ChartPeriod } from './ChartOptionsDropdown';
import { Sparkline } from './Sparkline';

// Activos vs. pasivos en el tiempo, con el mismo selector de tipo/periodo
// que el resto de las gráficas de tendencia — spec: "no aplicaste la
// opción de cambiar de tipo de gráfica en todas las gráficas de la app".
// Sustituye a DualLineChart (línea recta, sin ejes ni forma de cambiar
// periodo).
export function AssetsLiabilitiesTrendChart({
  history,
  colorAssets,
  colorLiabilities,
  width = 300,
  height = 100,
}: {
  history: NetWorthSnapshot[];
  colorAssets: string;
  colorLiabilities: string;
  width?: number;
  height?: number;
}) {
  const { colors, typography } = useTheme();
  const [chartType, setChartType] = useState<ChartKind>('line');
  const [period, setPeriod] = useState<ChartPeriod>('day');

  const maxPoints = period === 'day' ? 14 : period === 'week' ? 8 : 6;
  const bucketed = useMemo(() => bucketNetWorthHistory(history, period, maxPoints), [history, period, maxPoints]);
  const assets = bucketed.map((b) => b.snapshot.assets);
  const liabilities = bucketed.map((b) => b.snapshot.liabilities);
  const labels = bucketed.map((b) => b.label);

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <ChartOptionsDropdown chartType={chartType} onChangeChartType={setChartType} period={period} onChangePeriod={setPeriod} />
      </View>
      {assets.length < 2 ? (
        <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[typography.micro, { color: colors.textTertiary, textAlign: 'center' }]}>
            Aún no hay suficientes datos para ver esto por {period === 'week' ? 'semana' : period === 'month' ? 'mes' : 'día'}.
          </Text>
        </View>
      ) : chartType === 'line' ? (
        <Sparkline
          data={assets}
          seriesB={liabilities}
          colorB={colorLiabilities}
          labels={labels}
          color={colorAssets}
          width={width}
          height={height}
          filled={false}
        />
      ) : (
        <BarTrend data={assets} seriesB={liabilities} colorB={colorLiabilities} labels={labels} color={colorAssets} width={width} height={height} />
      )}
    </View>
  );
}

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { compactAmount, formatCurrency } from '@/utils/format';
import type { Currency } from '@/data/types';

export interface BudgetProgressItem {
  id: string;
  label: string;
  budgeted: number;
  actual: number;
}

const CHART_HEIGHT = 110;
const BAR_WIDTH = 34;
const GAP = 18;

// La barra "termómetro": el presupuestado en degradado azul marca el
// 100%, y el gasto real se rellena de ABAJO hacia arriba en rojo — de un
// vistazo se ve jerárquicamente qué categoría va bien y cuál ya se pasó
// (spec: "puedan ver en que se están pasando, o ya se pasaron"). Ambos
// tonos van translúcidos con un brillito arriba — el mismo lenguaje de
// vidrio que el resto de la app, pero más leve.
function ThermometerBar({ item, maxBudgeted }: { item: BudgetProgressItem; maxBudgeted: number }) {
  const { colors, typography } = useTheme();
  // Sin presupuesto (gasto que se coló sin planear): no hay una altura de
  // "100%" contra la cual medir, así que la barra completa es el gasto
  // real, sólida, sin fondo azul — spec: "los gastos que no se
  // presupuestaron... también aparezcan en el gráfico".
  const unbudgeted = item.budgeted <= 0 && item.actual > 0;

  if (unbudgeted) {
    const barHeight = maxBudgeted > 0 ? Math.max(6, (item.actual / maxBudgeted) * CHART_HEIGHT) : 6;
    const top = CHART_HEIGHT - barHeight;
    const fillId = `budgetFill-${item.id}`;
    return (
      <View style={styles.barSlot}>
        <Text style={[typography.micro, { color: colors.textTertiary, marginBottom: 2 }]}>Sin plan</Text>
        <Svg width={BAR_WIDTH} height={CHART_HEIGHT + 6}>
          <Defs>
            <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.danger} stopOpacity={0.85} />
              <Stop offset="1" stopColor={colors.danger} stopOpacity={0.55} />
            </LinearGradient>
          </Defs>
          <Rect x={2} y={top} width={BAR_WIDTH - 4} height={barHeight} rx={8} fill={`url(#${fillId})`} />
        </Svg>
        <Text style={[typography.micro, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]} numberOfLines={1}>
          {item.label}
        </Text>
      </View>
    );
  }

  const barHeight = maxBudgeted > 0 ? Math.max(6, (item.budgeted / maxBudgeted) * CHART_HEIGHT) : 6;
  const top = CHART_HEIGHT - barHeight;
  const ratio = item.budgeted > 0 ? item.actual / item.budgeted : 0;
  const exceeded = ratio > 1;
  const overflow = exceeded ? 6 : 0;
  const fillHeight = Math.min(ratio, 1) * barHeight + overflow;
  const fillTop = CHART_HEIGHT - Math.min(ratio, 1) * barHeight - overflow;
  const gradId = `budgetBar-${item.id}`;
  const fillId = `budgetFill-${item.id}`;

  return (
    <View style={styles.barSlot}>
      {exceeded && <Text style={[typography.micro, { color: colors.danger, marginBottom: 2 }]}>¡Excedido!</Text>}
      <Svg width={BAR_WIDTH} height={CHART_HEIGHT + 6}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.info} stopOpacity={0.55} />
            <Stop offset="1" stopColor={colors.info} stopOpacity={0.22} />
          </LinearGradient>
          <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.danger} stopOpacity={0.85} />
            <Stop offset="1" stopColor={colors.danger} stopOpacity={0.55} />
          </LinearGradient>
        </Defs>
        {/* Presupuestado: azul, siempre a toda su altura (el 100% de referencia). */}
        <Rect x={2} y={top} width={BAR_WIDTH - 4} height={barHeight} rx={8} fill={`url(#${gradId})`} stroke={colors.info} strokeOpacity={0.3} strokeWidth={1} />
        {/* Gastado real: rojo, relleno desde abajo. */}
        {fillHeight > 0 && (
          <Rect x={2} y={fillTop} width={BAR_WIDTH - 4} height={fillHeight} rx={8} fill={`url(#${fillId})`} />
        )}
      </Svg>
      <Text style={[typography.micro, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]} numberOfLines={1}>
        {item.label}
      </Text>
      <Text
        style={[typography.micro, { color: exceeded ? colors.danger : colors.textTertiary, fontWeight: '700', textAlign: 'center' }]}
        numberOfLines={1}
      >
        {Math.round(ratio * 100)}%
      </Text>
    </View>
  );
}

// Recorta a como máximo `maxBars` barras a la vista (spec: "que no se
// sobrecargue demasiado el gráfico") — las de mayor peso (presupuestado o
// gastado, lo que sea más grande) y una última "Otros" con la suma del
// resto, ordenadas de mayor a menor. El tope varía según el tamaño de
// pantalla (spec: "en pantallas grandes puede mostrar hasta 7... en
// móviles solo 3").
function capItems(items: BudgetProgressItem[], maxBars: number): BudgetProgressItem[] {
  if (items.length <= maxBars) return items;
  const weight = (i: BudgetProgressItem) => Math.max(i.budgeted, i.actual);
  const sorted = [...items].sort((a, b) => weight(b) - weight(a));
  const top = sorted.slice(0, maxBars - 1);
  const rest = sorted.slice(maxBars - 1);
  const otros: BudgetProgressItem = {
    id: 'otros',
    label: 'Otros',
    budgeted: rest.reduce((s, i) => s + i.budgeted, 0),
    actual: rest.reduce((s, i) => s + i.actual, 0),
  };
  return [...top, otros];
}

// Regla del eje Y: 3 líneas guía con su valor, en trazos suaves — mismo
// lenguaje que ya usan Sparkline/BarTrend (spec: "líneas de los ejes x y
// y... igual en trazos suaves"). El eje X ya lo cubre la etiqueta de cada
// barra (nombre de categoría), así que aquí solo falta la escala.
function YAxisRuler({ maxBudgeted }: { maxBudgeted: number }) {
  const { colors, typography } = useTheme();
  const ticks = [maxBudgeted, maxBudgeted / 2, 0];
  return (
    <View style={[styles.yAxis, { height: CHART_HEIGHT }]}>
      {ticks.map((v, i) => (
        <View key={i} style={styles.yAxisTick}>
          <Text style={[typography.micro, { color: colors.textTertiary }]} numberOfLines={1}>
            {compactAmount(v)}
          </Text>
          <View style={[styles.yAxisLine, { backgroundColor: colors.divider }]} />
        </View>
      ))}
    </View>
  );
}

// Versión compacta (Inicio, por grupo) o detallada (Presupuesto, por
// categoría) de la misma gráfica — con scroll horizontal para cuando hay
// más barras de las que caben.
export function BudgetProgressChart({
  items,
  currency,
  maxBars = 4,
}: {
  items: BudgetProgressItem[];
  currency: Currency;
  maxBars?: number;
}) {
  const { colors, typography, spacing } = useTheme();
  const displayItems = capItems(items, maxBars);
  const maxBudgeted = Math.max(1, ...displayItems.map((i) => Math.max(i.budgeted, i.actual)));
  // La leyenda de totales siempre refleja TODO (sin recortar) — solo las
  // barras individuales se agrupan en "Otros".
  const totalBudgeted = items.reduce((s, i) => s + i.budgeted, 0);
  const totalActual = items.reduce((s, i) => s + i.actual, 0);

  if (items.length === 0) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.info }]} />
          <Text style={[typography.micro, { color: colors.textTertiary }]}>
            Presupuestado {formatCurrency(totalBudgeted, currency)}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
          <Text style={[typography.micro, { color: colors.textTertiary }]}>Gastado {formatCurrency(totalActual, currency)}</Text>
        </View>
      </View>
      <View style={styles.chartRow}>
        <YAxisRuler maxBudgeted={maxBudgeted} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.barsRow}>
          {displayItems.map((item) => (
            <ThermometerBar key={item.id} item={item} maxBudgeted={maxBudgeted} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legendRow: { flexDirection: 'row', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  chartRow: { flexDirection: 'row' },
  yAxis: { width: 34, justifyContent: 'space-between', marginRight: 4, paddingBottom: 20 },
  yAxisTick: { flexDirection: 'row', alignItems: 'center' },
  yAxisLine: { flex: 1, height: StyleSheet.hairlineWidth, marginLeft: 3, opacity: 0.6 },
  barsRow: { flexDirection: 'row', gap: GAP, paddingVertical: 2 },
  barSlot: { width: BAR_WIDTH + 24, alignItems: 'center' },
});

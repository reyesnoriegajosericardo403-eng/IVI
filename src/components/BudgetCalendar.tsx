import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Budget, BudgetAssignment, BudgetTemplate } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { makePeriodKey, parsePeriodKey, type PeriodScope } from '@/utils/budgetPeriods';
import { addMonths, buildMonthGrid, monthLabel, parseISODate, WEEKDAY_LABELS } from '@/utils/date';

// Calendario de asignación de presupuestos: pinta cada día con el color
// de la plantilla que le toca y deja tocar un mes, una semana o un día
// para asignarle una (spec: "cuando se seleccione un presupuesto en el
// calendario, el calendario debe tener ese color en sus fechas en las
// que el presupuesto está aplicado").
//
// Qué color gana en un día: primero una plantilla de DÍA asignada a esa
// fecha exacta, luego la de su SEMANA, y al final la del MES. Los
// eventos de un día (los de esta función y los que ya existían como
// gastos "de una vez") se marcan además con un punto en la esquina, para
// que se vean aunque ese día ya tenga color de semana o mes (spec:
// "estos eventos de un día se pueden poner encima incluso de una semana
// que ya tenga un tipo de presupuesto asignado").

export function BudgetCalendar({
  monthIso,
  onChangeMonth,
  mode,
  templates,
  assignments,
  oneTimeBudgets,
  selectedPeriodKey,
  onSelectPeriod,
  previewDates,
  previewColor,
  onGridLayout,
}: {
  monthIso: string;
  onChangeMonth: (iso: string) => void;
  // Qué se asigna al tocar: el mes completo, la semana del día tocado, o
  // ese día suelto.
  mode: PeriodScope;
  templates: BudgetTemplate[];
  assignments: BudgetAssignment[];
  // Gastos "de una vez" que ya existían (Budget.oneTimeDate) — solo para
  // marcarlos, no se pueden reasignar desde aquí.
  oneTimeBudgets: Budget[];
  selectedPeriodKey: string;
  onSelectPeriod: (periodKey: string) => void;
  // Vista previa mientras se arrastra una ficha desde "Mis presupuestos"
  // (spec: "círculo semitransparente o con borde discontinuo... nunca
  // rectángulos"). Fechas en formato ISO ("2026-09-15").
  previewDates?: Set<string>;
  previewColor?: string;
  // Posición/tamaño en página de la cuadrícula de días — para que la
  // pantalla que arrastra la ficha sepa sobre qué celda está el dedo o el
  // cursor sin que este componente tenga que saber nada de arrastre.
  onGridLayout?: (layout: { pageX: number; pageY: number; width: number; height: number; rows: number }) => void;
}) {
  const { colors, typography, spacing } = useTheme();
  const weeks = buildMonthGrid(monthIso);
  const gridRef = useRef<View>(null);

  const reportGridLayout = () => {
    if (!onGridLayout) return;
    gridRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      onGridLayout({ pageX, pageY, width, height, rows: weeks.length });
    });
  };
  const templateById = new Map(templates.map((t) => [t.id, t]));

  const templateForKey = (key: string): BudgetTemplate | undefined => {
    const assignment = assignments.find((a) => a.periodKey === key);
    return assignment ? templateById.get(assignment.templateId) : undefined;
  };

  const oneTimeDates = new Set(oneTimeBudgets.map((b) => b.oneTimeDate).filter((d): d is string => !!d));

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={styles.headerRow}>
        <Pressable accessibilityLabel="Mes anterior" onPress={() => onChangeMonth(addMonths(monthIso, -1))} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.headline, { color: colors.textPrimary }]}>{monthLabel(monthIso)}</Text>
        <Pressable accessibilityLabel="Mes siguiente" onPress={() => onChangeMonth(addMonths(monthIso, 1))} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text key={`${label}-${i}`} style={[typography.micro, styles.weekdayCell, { color: colors.textTertiary }]}>
            {label}
          </Text>
        ))}
      </View>

      <View ref={gridRef} onLayout={reportGridLayout}>
        {weeks.map((week, wIdx) => (
        <View key={wIdx} style={styles.weekRow}>
          {week.map((cell) => {
            const date = parseISODate(cell.iso);
            const dayKey = makePeriodKey('day', date);
            const weekKey = makePeriodKey('week', date);
            const monthKey = makePeriodKey('month', date);
            const applied = templateForKey(dayKey) ?? templateForKey(weekKey) ?? templateForKey(monthKey);
            const keyForMode = mode === 'day' ? dayKey : mode === 'week' ? weekKey : monthKey;
            const isSelected = keyForMode === selectedPeriodKey;
            const hasEvent = oneTimeDates.has(cell.iso) || !!templateForKey(dayKey);
            const isPreview = !!previewDates?.has(cell.iso);

            return (
              <Pressable
                key={cell.iso}
                accessibilityLabel={`Día ${cell.day} de ${monthLabel(monthIso)}`}
                onPress={() => onSelectPeriod(keyForMode)}
                style={[styles.dayCell, { opacity: cell.inMonth ? 1 : 0.35 }]}
              >
                {/* Círculo alrededor del número — nunca un rectángulo de fondo
                    (spec: "las fechas asignadas deben identificarse mediante
                    círculos... nunca mediante rectángulos"). Sólido cuando ya
                    está confirmado, punteado y semitransparente en vista previa. */}
                <View
                  style={[
                    styles.dayCircle,
                    isPreview
                      ? { borderWidth: 2, borderStyle: 'dashed', borderColor: previewColor, backgroundColor: `${previewColor}40` }
                      : applied
                        ? { backgroundColor: applied.color }
                        : null,
                    isSelected && { borderWidth: 2, borderColor: colors.accentFrom },
                  ]}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: applied || isPreview ? '#FFFFFF' : colors.textSecondary, fontWeight: applied ? '700' : '400' },
                    ]}
                  >
                    {cell.day}
                  </Text>
                </View>
                {hasEvent && <View style={[styles.eventDot, { backgroundColor: colors.warning }]} />}
              </Pressable>
            );
          })}
        </View>
        ))}
      </View>
    </View>
  );
}

// Leyenda de colores — se renderiza ARRIBA de la cuadrícula (más fácil de
// leer de un vistazo al entrar que al final de una cuadrícula larga; spec:
// "no se entiende... como se ve en tu calendario que ya fue asignado").
export function BudgetTemplateLegend({ templates }: { templates: BudgetTemplate[] }) {
  const { colors, typography } = useTheme();
  if (templates.length === 0) return null;
  return (
    <View style={styles.legendWrap}>
      {templates.map((t) => (
        <View key={t.id} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: t.color }]} />
          <Text style={[typography.micro, { color: colors.textTertiary }]}>{t.name}</Text>
        </View>
      ))}
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
        <Text style={[typography.micro, { color: colors.textTertiary }]}>Evento de un día</Text>
      </View>
    </View>
  );
}

// Etiqueta corta de qué plantilla aplica en un periodo — para el chip de
// arriba de la pantalla de Presupuesto.
export function templateLabelForPeriod(
  periodKey: string,
  templates: BudgetTemplate[],
  assignments: BudgetAssignment[]
): BudgetTemplate | undefined {
  const assignment = assignments.find((a) => a.periodKey === periodKey);
  if (assignment) return templates.find((t) => t.id === assignment.templateId);
  return templates.find((t) => t.isDefault);
}

export function periodScopeFromKey(periodKey: string): PeriodScope {
  return parsePeriodKey(periodKey)?.scope ?? 'month';
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { padding: 6 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekdayCell: { flex: 1, textAlign: 'center' },
  dayCell: { flex: 1, height: 34, alignItems: 'center', justifyContent: 'center', margin: 1 },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  eventDot: { position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: 3 },
  legendWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
});

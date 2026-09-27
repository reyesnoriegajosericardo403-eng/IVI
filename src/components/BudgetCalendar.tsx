import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Budget, BudgetAssignment, BudgetTemplate } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { getAssignmentRange, dateInRange } from '@/utils/budgetPeriods';
import { addMonths, buildMonthGrid, monthLabel, parseISODate, WEEKDAY_LABELS } from '@/utils/date';

import { templateIcon } from './budgetTemplateMeta';

// Calendario de asignación de presupuestos (rediseño según imagen de
// referencia + spec v2 "Plan de gastos"): cada día muestra el ícono de la
// plantilla que lo cubre — sólido cuando ya está confirmado, con borde
// discontinuo cuando es una selección todavía sin guardar (spec: "las
// fechas seleccionadas y todavía no guardadas se distinguen claramente de
// las fechas con presupuesto ya asignado... nunca depender solo del
// color"). Tocar un día empieza/extiende un RANGO (no un periodo fijo de
// día/semana/mes) — quien arma ese rango es la pantalla padre.

export function BudgetCalendar({
  monthIso,
  onChangeMonth,
  templates,
  assignments,
  oneTimeBudgets,
  pendingDates,
  pendingIcon,
  pendingColor,
  onDayPress,
  previewDates,
  previewColor,
  previewIcon,
  onGridLayout,
}: {
  monthIso: string;
  onChangeMonth: (iso: string) => void;
  templates: BudgetTemplate[];
  assignments: BudgetAssignment[];
  // Gastos "de una vez" que ya existían (Budget.oneTimeDate) — solo para
  // marcarlos, no se pueden reasignar desde aquí.
  oneTimeBudgets: Budget[];
  // Rango elegido a mano, todavía SIN CONFIRMAR (spec: "Pendiente de
  // guardar" — nunca el mismo tratamiento visual que un plan confirmado).
  pendingDates?: Set<string>;
  pendingIcon?: string;
  pendingColor?: string;
  onDayPress?: (iso: string) => void;
  // Vista previa mientras se arrastra una ficha desde "Mis presupuestos".
  previewDates?: Set<string>;
  previewColor?: string;
  previewIcon?: string;
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

  // Qué asignación confirmada gana un día: el rango más corto que lo
  // cubra (igual que resolveTemplateForDate en finance.ts) — así el
  // calendario nunca muestra dos plantillas encimadas el mismo día.
  const templateForDate = (date: Date): BudgetTemplate | undefined => {
    let best: { assignment: BudgetAssignment; span: number } | null = null;
    for (const a of assignments) {
      const range = getAssignmentRange(a);
      if (!range || !dateInRange(date, range)) continue;
      const span = range.end.getTime() - range.start.getTime();
      if (!best || span < best.span) best = { assignment: a, span };
    }
    return best ? templateById.get(best.assignment.templateId) : undefined;
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
              const applied = templateForDate(date);
              const hasEvent = oneTimeDates.has(cell.iso);
              const isPending = !!pendingDates?.has(cell.iso);
              const isPreview = !!previewDates?.has(cell.iso);

              const iconName = isPreview ? previewIcon : isPending ? pendingIcon : applied ? templateIcon(applied) : undefined;
              const badgeColor = isPreview ? previewColor : isPending ? pendingColor : applied?.color;

              return (
                <Pressable
                  key={cell.iso}
                  accessibilityLabel={`Día ${cell.day} de ${monthLabel(monthIso)}${applied ? `, ${applied.name}` : ''}${isPending ? ', selección pendiente de guardar' : ''}`}
                  onPress={() => onDayPress?.(cell.iso)}
                  style={[styles.dayCell, { opacity: cell.inMonth ? 1 : 0.35 }]}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      isPending || isPreview
                        ? { borderWidth: 2, borderStyle: 'dashed', borderColor: badgeColor, backgroundColor: `${badgeColor}33` }
                        : applied
                          ? { backgroundColor: applied.color }
                          : null,
                    ]}
                  >
                    {iconName ? (
                      <Ionicons name={iconName as any} size={13} color={isPending || isPreview ? badgeColor : '#FFFFFF'} />
                    ) : (
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>{cell.day}</Text>
                    )}
                  </View>
                  {iconName && <Text style={[styles.dayNumberUnder, { color: colors.textTertiary }]}>{cell.day}</Text>}
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

// Leyenda: dos estados nada más, siempre visibles arriba del calendario
// (spec: "una fecha con plan confirmado y otra seleccionada sin guardar se
// distinguen sin depender del color" — el patrón sólido/discontinuo hace
// ese trabajo, la leyenda solo lo nombra por escrito).
export function BudgetTemplateLegend({ templates: _templates }: { templates: BudgetTemplate[] }) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.legendWrap}>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.accentFrom }]} />
        <Text style={[typography.micro, { color: colors.textTertiary }]}>Seleccionado, pendiente de guardar</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, { backgroundColor: colors.accentFrom }]} />
        <Text style={[typography.micro, { color: colors.textTertiary }]}>Día asignado</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { padding: 6 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekdayCell: { flex: 1, textAlign: 'center' },
  dayCell: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', margin: 1 },
  dayCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dayNumberUnder: { fontSize: 9, marginTop: 1 },
  eventDot: { position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: 3 },
  legendWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4 },
});

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { findBudgetConcept, findIncomeConcept, parseSubBudgetId, type BudgetGroupId } from '@/data/budgetConcepts';
import type { BudgetAssignment, BudgetTemplate, Currency, TemplateBudgetLine } from '@/data/types';
import { surfaceBlur, surfaceShadow } from '@/theme/surfaceStyle';
import { useTheme } from '@/theme/ThemeProvider';
import { makePeriodKey } from '@/utils/budgetPeriods';
import { buildMonthGrid, monthLabel, parseISODate } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

import { DonutChart } from './DonutChart';

type Bucket = 'income' | BudgetGroupId;
const BUCKET_ORDER: Bucket[] = ['income', 'necesidades', 'deseos', 'ahorro'];
const BUCKET_LABELS: Record<Bucket, string> = {
  income: 'Ingresos',
  necesidades: 'Necesidades',
  deseos: 'Deseos',
  ahorro: 'Ahorro',
};

function bucketOf(categoryId: string): Bucket {
  if (findIncomeConcept(categoryId)) return 'income';
  const parsed = parseSubBudgetId(categoryId);
  const conceptId = parsed ? parsed.conceptId : categoryId;
  return findBudgetConcept(conceptId)?.group ?? 'necesidades';
}

interface Segment {
  key: string;
  isoDates: string[];
  template: BudgetTemplate | undefined;
}

// Responde directamente a "no sé cómo comprobar que no hay dos
// presupuestos uno encima del otro": parte el mes visible en TRAMOS de
// fecha, cada uno con la plantilla que de verdad manda ahí (misma
// prioridad día > semana > mes que ya usa BudgetCalendar, para que esto
// nunca diga algo distinto de lo que el calendario pinta). Como los
// tramos se arman a partir de esa prioridad, por construcción nunca se
// encima uno con otro — y aquí se ve explícito cuál manda en cada quién.
export function MonthBudgetBreakdown({
  monthIso,
  templates,
  assignments,
  templateLines,
  currency,
  onClose,
}: {
  monthIso: string;
  templates: BudgetTemplate[];
  assignments: BudgetAssignment[];
  templateLines: TemplateBudgetLine[];
  currency: Currency;
  onClose: () => void;
}) {
  const { colors, typography, spacing, radius, surface } = useTheme();
  const templateById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);

  const templateForKey = (key: string): BudgetTemplate | undefined => {
    const assignment = assignments.find((a) => a.periodKey === key);
    return assignment ? templateById.get(assignment.templateId) : undefined;
  };

  const segments = useMemo<Segment[]>(() => {
    const days = buildMonthGrid(monthIso)
      .flat()
      .filter((c) => c.inMonth);
    const order: string[] = [];
    const byKey = new Map<string, Segment>();
    days.forEach((cell) => {
      const date = parseISODate(cell.iso);
      const dayKey = makePeriodKey('day', date);
      const weekKey = makePeriodKey('week', date);
      const monthKey = makePeriodKey('month', date);
      const winningKey = templateForKey(dayKey) ? dayKey : templateForKey(weekKey) ? weekKey : monthKey;
      if (!byKey.has(winningKey)) {
        byKey.set(winningKey, { key: winningKey, isoDates: [], template: templateForKey(winningKey) ?? templates.find((t) => t.isDefault) });
        order.push(winningKey);
      }
      byKey.get(winningKey)!.isoDates.push(cell.iso);
    });
    return order.map((k) => byKey.get(k)!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthIso, templates, assignments]);

  const bucketsFor = (templateId: string | undefined) => {
    const buckets: Record<Bucket, { total: number; slices: { label: string; value: number; color: string }[] }> = {
      income: { total: 0, slices: [] },
      necesidades: { total: 0, slices: [] },
      deseos: { total: 0, slices: [] },
      ahorro: { total: 0, slices: [] },
    };
    const palette = [colors.accentFrom, colors.accentTo, colors.warning, colors.info, colors.success, colors.danger];
    if (!templateId) return buckets;
    templateLines
      .filter((l) => l.templateId === templateId)
      .forEach((l, i) => {
        const bucket = buckets[bucketOf(l.categoryId)];
        bucket.total += l.monthlyAmount;
        bucket.slices.push({ label: l.categoryId, value: l.monthlyAmount, color: palette[i % palette.length] });
      });
    return buckets;
  };

  const rangeLabel = (seg: Segment) => {
    const first = seg.isoDates[0];
    const last = seg.isoDates[seg.isoDates.length - 1];
    const d1 = parseISODate(first).getDate();
    const d2 = parseISODate(last).getDate();
    if (d1 === d2) return `${d1} de ${monthLabel(monthIso)}`;
    // Un tramo por mes puede quedar partido en dos pedazos por una semana
    // en medio (ej. 1–13 y 21–30) — se agrupan bajo la misma plantilla
    // porque es la MISMA asignación, así que se listan como rangos
    // separados dentro del mismo renglón en vez de fingir que son
    // continuos.
    const ranges: string[] = [];
    let start = d1;
    let prev = d1;
    for (let i = 1; i < seg.isoDates.length; i++) {
      const day = parseISODate(seg.isoDates[i]).getDate();
      if (day !== prev + 1) {
        ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
        start = day;
      }
      prev = day;
    }
    ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
    return `${ranges.join(', ')} de ${monthLabel(monthIso)}`;
  };

  return (
    <View style={styles.backdrop}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surfaceSolid, borderColor: colors.surfaceBorder, borderWidth: surface.borderWidth, borderRadius: radius.lg },
          surfaceShadow(surface),
          surfaceBlur(surface),
        ]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Resumen de {monthLabel(monthIso)}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              {segments.length === 1
                ? 'Un solo presupuesto cubre todo el mes — no hay nada encimado.'
                : `El mes se reparte en ${segments.length} tramos, cada uno con su propio presupuesto. Nunca se encima uno con otro.`}
            </Text>
          </View>
          <Pressable accessibilityLabel="Cerrar resumen del mes" onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: spacing.md, paddingTop: spacing.md }}>
          {segments.map((seg) => {
            const buckets = bucketsFor(seg.template?.id);
            return (
              <View key={seg.key} style={[styles.segment, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}>
                <View style={styles.segmentHeader}>
                  <View style={[styles.colorDot, { backgroundColor: seg.template?.color ?? colors.textTertiary }]} />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]} numberOfLines={1}>
                      {seg.template?.name ?? 'Sin presupuesto'}
                    </Text>
                    <Text style={[typography.micro, { color: colors.textTertiary }]}>{rangeLabel(seg)}</Text>
                  </View>
                </View>
                <View style={styles.grid}>
                  {BUCKET_ORDER.map((bucket) => (
                    <View key={bucket} style={styles.gridItem}>
                      <DonutChart data={buckets[bucket].slices} size={56} strokeWidth={8} emptyColor={colors.divider} />
                      <Text style={[typography.micro, { color: colors.textSecondary, marginTop: 4 }]}>{BUCKET_LABELS[bucket]}</Text>
                      <Text style={[typography.micro, { color: colors.textPrimary, fontWeight: '700' }]} numberOfLines={1} adjustsFontSizeToFit>
                        {formatCurrency(buckets[bucket].total, currency)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 30,
  },
  card: { width: '100%', maxWidth: 420, padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  segment: { borderWidth: 1, padding: 12 },
  segmentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  gridItem: { alignItems: 'center', flex: 1 },
});

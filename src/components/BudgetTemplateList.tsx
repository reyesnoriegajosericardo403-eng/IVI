import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { findBudgetConcept, findIncomeConcept, parseSubBudgetId, type BudgetGroupId } from '@/data/budgetConcepts';
import type { BudgetTemplate, Currency, TemplateBudgetLine } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency } from '@/utils/format';

import { DonutChart } from './DonutChart';
import { KIND_LABELS } from './BudgetTemplateSheet';

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

// Lista de "Mis presupuestos": solo el nombre por default — al tocar uno se
// despliega su composición en 4 gráficas simples (spec: "una lista de mis
// presupuestos solo con el encabezado de su nombre y cuando entres a ellos
// se despliegan de manera gráfica 4 gráficas donde se vean los ingresos y
// los 3 tipos de gastos"). Son los montos definidos en la plantilla misma
// (no gasto real de un periodo concreto — una plantilla no vive en un
// periodo fijo).
export function BudgetTemplateList({
  templates,
  templateLines,
  currency,
}: {
  templates: BudgetTemplate[];
  templateLines: TemplateBudgetLine[];
  currency: Currency;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const palette = [colors.accentFrom, colors.accentTo, colors.warning, colors.info, colors.success, colors.danger];

  return (
    <View style={{ gap: spacing.sm }}>
      {templates.map((t) => {
        const isOpen = expandedId === t.id;
        const lines = isOpen ? templateLines.filter((l) => l.templateId === t.id) : [];
        const buckets: Record<Bucket, { total: number; slices: { label: string; value: number; color: string }[] }> = {
          income: { total: 0, slices: [] },
          necesidades: { total: 0, slices: [] },
          deseos: { total: 0, slices: [] },
          ahorro: { total: 0, slices: [] },
        };
        lines.forEach((l, i) => {
          const bucket = buckets[bucketOf(l.categoryId)];
          bucket.total += l.monthlyAmount;
          bucket.slices.push({ label: l.categoryId, value: l.monthlyAmount, color: palette[i % palette.length] });
        });

        return (
          <View key={t.id} style={[styles.card, { borderColor: colors.surfaceBorder, borderRadius: radius.lg, backgroundColor: colors.surfaceSolid }]}>
            <Pressable
              accessibilityLabel={`Ver ${t.name}`}
              onPress={() => setExpandedId(isOpen ? null : t.id)}
              style={styles.row}
            >
              <View style={[styles.colorDot, { backgroundColor: t.color }]} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>{t.name}</Text>
                <Text style={[typography.micro, { color: colors.textTertiary }]}>{KIND_LABELS[t.kind]}</Text>
              </View>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
            </Pressable>

            {isOpen && (
              <View style={{ marginTop: spacing.md, gap: spacing.md }}>
                <View style={styles.grid}>
                  {BUCKET_ORDER.map((bucket) => (
                    <View key={bucket} style={styles.gridItem}>
                      <DonutChart data={buckets[bucket].slices} size={72} strokeWidth={10} emptyColor={colors.divider} />
                      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 6 }]}>{BUCKET_LABELS[bucket]}</Text>
                      <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700' }]}>
                        {formatCurrency(buckets[bucket].total, currency)}
                      </Text>
                    </View>
                  ))}
                </View>
                <Pressable
                  accessibilityLabel={`Editar montos de ${t.name}`}
                  onPress={() => router.push(`/budget-template/${t.id}`)}
                  style={[styles.editBtn, { borderColor: colors.accentFrom, borderRadius: radius.pill }]}
                >
                  <Ionicons name="create-outline" size={15} color={colors.accentFrom} />
                  <Text style={{ color: colors.accentFrom, fontWeight: '700', marginLeft: 6 }}>Editar montos</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', alignItems: 'center', marginBottom: 12 },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, paddingVertical: 10 },
});

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Budget, BudgetFrequency, BudgetPeriodicity, Currency } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { computeMonthlyAmount, FREQUENCY_LABELS, PERIODICITY_LABELS } from '@/utils/budgetCalculator';
import { formatCurrency } from '@/utils/format';

import { GlassCard } from './GlassCard';

// Formulario compartido para definir el monto esperado de un concepto de
// presupuesto (gasto o ingreso) — usado por Presupuesto y por el
// cuestionario de presupuesto en el onboarding, para que lo que se anote
// en uno u otro lado sea exactamente el mismo dato (spec: "esos datos se
// queden como su presupuesto ya definido").
export function ConceptBudgetForm({
  concept,
  initial,
  currency,
  onSave,
  onCancel,
}: {
  concept: { id: string; name: string };
  initial: Budget | undefined;
  currency: Currency;
  onSave: (input: { baseAmount: number; periodicity: BudgetPeriodicity; frequency?: BudgetFrequency; customDaysPerWeek?: number }) => void;
  onCancel: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [periodicity, setPeriodicity] = useState<BudgetPeriodicity>(initial?.periodicity ?? 'month');
  const [frequency, setFrequency] = useState<BudgetFrequency>(initial?.frequency ?? 'all_days');
  const [customDays, setCustomDays] = useState(initial?.customDaysPerWeek ?? 3);
  const [amountText, setAmountText] = useState(initial?.baseAmount ? String(initial.baseAmount) : '');

  const baseAmount = parseFloat(amountText.replace(',', '.')) || 0;
  const monthlyAmount = computeMonthlyAmount({ baseAmount, periodicity, frequency, customDaysPerWeek: customDays });
  const canSave = baseAmount > 0;

  return (
    <GlassCard style={{ gap: spacing.md }}>
      <Text style={[typography.headline, { color: colors.textPrimary }]}>{concept.name}</Text>

      <View>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>Periodicidad</Text>
        <View style={styles.chipRow}>
          {(['day', 'week', 'month'] as BudgetPeriodicity[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriodicity(p)}
              style={[styles.chip, { borderRadius: radius.pill, borderColor: periodicity === p ? colors.accentFrom : colors.surfaceBorder, backgroundColor: periodicity === p ? colors.accentSoft : 'transparent' }]}
            >
              <Text style={{ color: periodicity === p ? colors.accentFrom : colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                {PERIODICITY_LABELS[p]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {periodicity === 'day' && (
        <View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>Frecuencia</Text>
          <View style={styles.chipWrap}>
            {(['all_days', 'weekdays', 'weekends', 'custom', 'one_time'] as BudgetFrequency[]).map((f) => (
              <Pressable
                key={f}
                onPress={() => setFrequency(f)}
                style={[styles.chip, { borderRadius: radius.pill, borderColor: frequency === f ? colors.accentFrom : colors.surfaceBorder, backgroundColor: frequency === f ? colors.accentSoft : 'transparent' }]}
              >
                <Text style={{ color: frequency === f ? colors.accentFrom : colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                  {FREQUENCY_LABELS[f]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {periodicity === 'day' && frequency === 'custom' && (
        <View style={styles.rowCenter}>
          <Text style={[typography.caption, { color: colors.textSecondary, marginRight: spacing.sm }]}>Días por semana:</Text>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Pressable
              key={n}
              onPress={() => setCustomDays(n)}
              style={[styles.dayPill, { borderRadius: radius.pill, borderColor: customDays === n ? colors.accentFrom : colors.surfaceBorder, backgroundColor: customDays === n ? colors.accentSoft : 'transparent' }]}
            >
              <Text style={{ color: customDays === n ? colors.accentFrom : colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{n}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <TextInput
        value={amountText}
        onChangeText={setAmountText}
        keyboardType="decimal-pad"
        placeholder={periodicity === 'day' && frequency === 'one_time' ? 'Monto del evento' : `Monto por ${PERIODICITY_LABELS[periodicity].toLowerCase()}`}
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
      />

      {baseAmount > 0 && (
        <View style={{ backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.accentFrom }]}>
            Equivale a {formatCurrency(monthlyAmount, currency)} al mes
          </Text>
        </View>
      )}

      <View style={styles.rowEnd}>
        <Pressable onPress={onCancel}>
          <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
        </Pressable>
        <Pressable
          disabled={!canSave}
          onPress={() => onSave({ baseAmount, periodicity, frequency: periodicity === 'day' ? frequency : undefined, customDaysPerWeek: customDays })}
          style={[styles.saveBtn, { borderRadius: radius.pill, backgroundColor: canSave ? colors.accentFrom : colors.surfaceBorder }]}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Guardar</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowEnd: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' },
  chipRow: { flexDirection: 'row', gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  dayPill: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 6 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10 },
});

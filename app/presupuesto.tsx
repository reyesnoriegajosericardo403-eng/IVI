import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/CategoryIcon';
import { DonutChart } from '@/components/DonutChart';
import { GlassCard } from '@/components/GlassCard';
import { ProgressBar } from '@/components/ProgressBar';
import { BUDGET_GROUP_DESCRIPTIONS, BUDGET_GROUP_LABELS, budgetConceptsByGroup, type BudgetConcept, type BudgetGroupId } from '@/data/budgetConcepts';
import type { Budget, BudgetFrequency, BudgetPeriodicity, Currency } from '@/data/types';
import { selectActiveBudgets, selectActiveTransactions } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { computeMonthlyAmount, FREQUENCY_LABELS, PERIODICITY_LABELS, WEEKS_PER_MONTH } from '@/utils/budgetCalculator';
import { buildBudgetLines, incomeByKind, spendByConcept, type BudgetLine, type BudgetStatus } from '@/utils/finance';
import { formatCurrency } from '@/utils/format';

const STATUS_LABEL: Record<BudgetStatus, string> = {
  normal: 'Normal',
  attention: 'Atención',
  warning: 'Advertencia',
  exceeded: 'Excedido',
};

const GROUPS: BudgetGroupId[] = ['hoy', 'luego', 'compartir'];
const GROUP_COLOR_KEY: Record<BudgetGroupId, 'accentFrom' | 'accentTo' | 'warning'> = {
  hoy: 'accentFrom',
  luego: 'accentTo',
  compartir: 'warning',
};

type Scope = 'month' | 'week';

export default function Presupuesto() {
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const rawBudgets = useAppStore((s) => s.budgets);
  const rawTransactions = useAppStore((s) => s.transactions);
  const setBudget = useAppStore((s) => s.setBudget);
  const deleteBudget = useAppStore((s) => s.deleteBudget);

  const budgets = useMemo(() => selectActiveBudgets(rawBudgets), [rawBudgets]);
  const transactions = useMemo(() => selectActiveTransactions(rawTransactions), [rawTransactions]);

  const [scope, setScope] = useState<Scope>('month');
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);

  const lines = buildBudgetLines(budgets, transactions, profile.budgetThresholds);
  const lineByConcept = new Map(lines.map((l) => [l.categoryId, l]));
  const conceptSpend = spendByConcept(transactions, new Date(), scope);
  const income = incomeByKind(transactions, new Date(), scope);

  const scopedBudgeted = (monthlyAmount: number) => (scope === 'week' ? monthlyAmount / WEEKS_PER_MONTH : monthlyAmount);

  const totalActualExpense = GROUPS.reduce(
    (sum, g) => sum + budgetConceptsByGroup(g).reduce((s2, c) => s2 + (conceptSpend[c.id] ?? 0), 0),
    0
  );
  const totalIncome = income.fixed + income.variable;
  const balance = totalIncome - totalActualExpense;

  const donutData = GROUPS.map((g) => ({
    label: BUDGET_GROUP_LABELS[g],
    value: budgetConceptsByGroup(g).reduce((s, c) => s + (conceptSpend[c.id] ?? 0), 0),
    color: colors[GROUP_COLOR_KEY[g]],
  }));

  const handleSaveConcept = (
    concept: BudgetConcept,
    input: { baseAmount: number; periodicity: BudgetPeriodicity; frequency?: BudgetFrequency; customDaysPerWeek?: number }
  ) => {
    const monthlyAmount = computeMonthlyAmount(input);
    if (monthlyAmount <= 0) return;
    setBudget({
      categoryId: concept.id,
      monthlyAmount,
      currency: profile.primaryCurrency,
      thresholds: profile.budgetThresholds,
      periodicity: input.periodicity,
      frequency: input.frequency,
      customDaysPerWeek: input.customDaysPerWeek,
      baseAmount: input.baseAmount,
    });
    setEditingConceptId(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>Presupuesto</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Ingresos, gastos y hacia dónde va tu dinero</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.md }}>
        <View style={[styles.scopeToggle, { borderColor: colors.surfaceBorder, borderRadius: radius.pill }]}>
          {(['week', 'month'] as Scope[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setScope(s)}
              style={[styles.scopeBtn, { borderRadius: radius.pill, backgroundColor: scope === s ? colors.accentFrom : 'transparent' }]}
            >
              <Text style={{ color: scope === s ? '#FFFFFF' : colors.textSecondary, fontWeight: '700' }}>
                {s === 'week' ? 'Semanal' : 'Mensual'}
              </Text>
            </Pressable>
          ))}
        </View>

        <GlassCard style={{ gap: spacing.xs }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Balance {scope === 'week' ? 'de esta semana' : 'de este mes'}
          </Text>
          <Text style={[typography.display, { color: balance >= 0 ? colors.success : colors.danger }]}>
            {balance >= 0 ? '' : '-'}
            {formatCurrency(Math.abs(balance), profile.primaryCurrency)}
          </Text>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            {formatCurrency(totalIncome, profile.primaryCurrency)} de ingresos − {formatCurrency(totalActualExpense, profile.primaryCurrency)} de gastos
          </Text>
        </GlassCard>

        <GlassCard style={{ gap: spacing.sm }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Ingresos</Text>
          <View style={styles.rowBetween}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>Fijos</Text>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>{formatCurrency(income.fixed, profile.primaryCurrency)}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>Variables / eventuales</Text>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>{formatCurrency(income.variable, profile.primaryCurrency)}</Text>
          </View>
        </GlassCard>

        <GlassCard style={{ gap: spacing.md, alignItems: 'center' }}>
          <Text style={[typography.headline, { color: colors.textPrimary, alignSelf: 'flex-start' }]}>Gastos por grupo</Text>
          {totalActualExpense > 0 ? (
            <>
              <DonutChart data={donutData} emptyColor={colors.divider} />
              <View style={{ width: '100%', gap: 6 }}>
                {donutData.map((d) => (
                  <View key={d.label} style={styles.rowBetween}>
                    <View style={styles.rowCenter}>
                      <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                      <Text style={[typography.caption, { color: colors.textPrimary, marginLeft: 6 }]}>{d.label}</Text>
                    </View>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {formatCurrency(d.value, profile.primaryCurrency)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              Aún no registras gastos {scope === 'week' ? 'esta semana' : 'este mes'}.
            </Text>
          )}
        </GlassCard>

        {GROUPS.map((group) => {
          const concepts = budgetConceptsByGroup(group);
          const groupBudgeted = concepts.reduce((s, c) => s + scopedBudgeted(lineByConcept.get(c.id)?.budgeted ?? 0), 0);
          const groupActual = concepts.reduce((s, c) => s + (conceptSpend[c.id] ?? 0), 0);

          return (
            <View key={group} style={{ gap: spacing.sm }}>
              <View style={styles.groupHeader}>
                <View>
                  <Text style={[typography.title, { color: colors.textPrimary }]}>{BUDGET_GROUP_LABELS[group]}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{BUDGET_GROUP_DESCRIPTIONS[group]}</Text>
                </View>
                {groupBudgeted > 0 && (
                  <Text style={[typography.caption, { color: colors.textTertiary }]}>
                    {formatCurrency(groupActual, profile.primaryCurrency)} / {formatCurrency(groupBudgeted, profile.primaryCurrency)}
                  </Text>
                )}
              </View>

              {concepts.map((concept) =>
                editingConceptId === concept.id ? (
                  <ConceptBudgetForm
                    key={concept.id}
                    concept={concept}
                    initial={budgets.find((b) => b.categoryId === concept.id)}
                    currency={profile.primaryCurrency}
                    onCancel={() => setEditingConceptId(null)}
                    onSave={(input) => handleSaveConcept(concept, input)}
                  />
                ) : (
                  <ConceptRow
                    key={concept.id}
                    concept={concept}
                    line={lineByConcept.get(concept.id)}
                    scope={scope}
                    scopedBudgeted={scopedBudgeted}
                    actualNoBudget={conceptSpend[concept.id] ?? 0}
                    currency={profile.primaryCurrency}
                    onEdit={() => setEditingConceptId(concept.id)}
                    onDelete={(budgetId) => deleteBudget(budgetId)}
                  />
                )
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function ConceptRow({
  concept,
  line,
  scope,
  scopedBudgeted,
  actualNoBudget,
  currency,
  onEdit,
  onDelete,
}: {
  concept: BudgetConcept;
  line: BudgetLine | undefined;
  scope: Scope;
  scopedBudgeted: (monthlyAmount: number) => number;
  actualNoBudget: number;
  currency: Currency;
  onEdit: () => void;
  onDelete: (budgetId: string) => void;
}) {
  const { colors, typography, spacing } = useTheme();
  const budgeted = line ? scopedBudgeted(line.budgeted) : 0;
  const percentUsed = line && budgeted > 0 ? Math.round((actualNoBudget / budgeted) * 100) : 0;

  return (
    <GlassCard style={{ gap: spacing.sm }}>
      <View style={styles.rowBetween}>
        <View style={styles.rowCenter}>
          <CategoryIcon categoryId={concept.icon} size={16} />
          <Text style={[typography.headline, { color: colors.textPrimary, marginLeft: spacing.sm }]}>{concept.name}</Text>
        </View>
        <View style={styles.rowCenter}>
          <Pressable accessibilityLabel={`Editar ${concept.name}`} onPress={onEdit} style={{ marginRight: line ? spacing.sm : 0 }}>
            <Ionicons name={line ? 'pencil-outline' : 'add-circle-outline'} size={18} color={line ? colors.textTertiary : colors.accentFrom} />
          </Pressable>
          {line && (
            <Pressable accessibilityLabel={`Eliminar presupuesto de ${concept.name}`} onPress={() => onDelete(line.budgetId)}>
              <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {line ? (
        <>
          <ProgressBar percent={percentUsed} status={line.status} />
          <View style={styles.rowBetween}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {formatCurrency(actualNoBudget, currency)} de {formatCurrency(budgeted, currency)}
              {scope === 'week' ? ' esta semana' : ' este mes'}
            </Text>
            <Text
              style={[
                typography.caption,
                {
                  fontWeight: '700',
                  color: line.status === 'exceeded' || line.status === 'warning' ? colors.danger : line.status === 'attention' ? colors.warning : colors.success,
                },
              ]}
            >
              {percentUsed}% · {STATUS_LABEL[line.status]}
            </Text>
          </View>
        </>
      ) : (
        <Text style={[typography.caption, { color: colors.textTertiary }]}>
          {actualNoBudget > 0
            ? `Ya llevas ${formatCurrency(actualNoBudget, currency)} sin presupuesto — toca + para definir uno.`
            : 'Sin presupuesto — toca + para definir uno.'}
        </Text>
      )}
    </GlassCard>
  );
}

function ConceptBudgetForm({
  concept,
  initial,
  currency,
  onSave,
  onCancel,
}: {
  concept: BudgetConcept;
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowEnd: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' },
  groupHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 },
  scopeToggle: { flexDirection: 'row', borderWidth: 1, padding: 3, alignSelf: 'flex-start' },
  scopeBtn: { paddingHorizontal: 18, paddingVertical: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  dayPill: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 6 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10 },
});

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConceptBudgetForm } from '@/components/ConceptBudgetForm';
import { ConceptRow } from '@/components/ConceptRow';
import { DonutChart } from '@/components/DonutChart';
import { GlassCard } from '@/components/GlassCard';
import { IncomeConceptRow } from '@/components/IncomeConceptRow';
import { SectionToggle } from '@/components/SectionToggle';
import { BUDGET_GROUP_DESCRIPTIONS, BUDGET_GROUP_LABELS, budgetConceptsByGroup, INCOME_CONCEPTS, type BudgetGroupId, type IncomeConcept } from '@/data/budgetConcepts';
import type { BudgetFrequency, BudgetPeriodicity } from '@/data/types';
import { selectActiveAccounts, selectActiveBudgets, selectActiveTransactions } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { computeMonthlyAmount, WEEKS_PER_MONTH } from '@/utils/budgetCalculator';
import { buildBudgetLines, incomeByConcept, incomeByKind, spendByConcept } from '@/utils/finance';
import { formatCurrency } from '@/utils/format';

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
  const rawAccounts = useAppStore((s) => s.accounts);
  const setBudget = useAppStore((s) => s.setBudget);
  const deleteBudget = useAppStore((s) => s.deleteBudget);

  const budgets = useMemo(() => selectActiveBudgets(rawBudgets), [rawBudgets]);
  const transactions = useMemo(() => selectActiveTransactions(rawTransactions), [rawTransactions]);
  const accounts = useMemo(() => selectActiveAccounts(rawAccounts), [rawAccounts]);

  const [scope, setScope] = useState<Scope>('month');
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const [ingresosOpen, setIngresosOpen] = useState(false);
  const [gastosOpen, setGastosOpen] = useState(false);

  const lines = buildBudgetLines(budgets, transactions, profile.budgetThresholds, new Date(), scope);
  const lineByConcept = new Map(lines.map((l) => [l.categoryId, l]));
  const conceptSpend = spendByConcept(transactions, new Date(), scope);
  const incomeConceptActual = incomeByConcept(transactions, new Date(), scope);
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
    categoryId: string,
    input: {
      baseAmount: number;
      periodicity: BudgetPeriodicity;
      frequency?: BudgetFrequency;
      customDaysPerWeek?: number;
      incomeDayOfMonth?: number;
      targetAccountId?: string;
      excludedAccountIds?: string[];
    }
  ) => {
    const monthlyAmount = computeMonthlyAmount(input);
    if (monthlyAmount <= 0) return;
    setBudget({
      categoryId,
      monthlyAmount,
      currency: profile.primaryCurrency,
      thresholds: profile.budgetThresholds,
      periodicity: input.periodicity,
      frequency: input.frequency,
      customDaysPerWeek: input.customDaysPerWeek,
      baseAmount: input.baseAmount,
      incomeDayOfMonth: input.incomeDayOfMonth,
      targetAccountId: input.targetAccountId,
      excludedAccountIds: input.excludedAccountIds,
    });
    setEditingConceptId(null);
  };

  const fixedIncomeConcepts = INCOME_CONCEPTS.filter((c) => c.kind === 'fixed');
  const variableIncomeConcepts = INCOME_CONCEPTS.filter((c) => c.kind === 'variable');

  const renderIncomeConcept = (concept: IncomeConcept) =>
    editingConceptId === concept.id ? (
      <ConceptBudgetForm
        key={concept.id}
        concept={concept}
        initial={budgets.find((b) => b.categoryId === concept.id)}
        currency={profile.primaryCurrency}
        showDayOfMonth={concept.kind === 'fixed'}
        accounts={accounts}
        showAccountTarget
        onCancel={() => setEditingConceptId(null)}
        onSave={(input) => handleSaveConcept(concept.id, input)}
      />
    ) : (
      <IncomeConceptRow
        key={concept.id}
        concept={concept}
        line={lineByConcept.get(concept.id)}
        scope={scope}
        scopedBudgeted={scopedBudgeted}
        actualNoBudget={incomeConceptActual[concept.id] ?? 0}
        currency={profile.primaryCurrency}
        accounts={accounts}
        onEdit={() => setEditingConceptId(concept.id)}
        onDelete={(budgetId) => deleteBudget(budgetId)}
      />
    );

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

        {/* ---------- Ingresos: casilla desplegable ---------- */}
        <SectionToggle
          title="Ingresos"
          amount={totalIncome}
          currency={profile.primaryCurrency}
          open={ingresosOpen}
          onToggle={() => setIngresosOpen((v) => !v)}
        />

        {ingresosOpen && (
          <View style={{ gap: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.textSecondary, paddingHorizontal: 4 }]}>
              Anota cuánto esperas recibir de cada tipo de ingreso — es opcional, y lo puedes editar cuando quieras.
            </Text>

            <Text style={[typography.headline, { color: colors.textPrimary }]}>Fijos</Text>
            {fixedIncomeConcepts.map(renderIncomeConcept)}

            <Text style={[typography.headline, { color: colors.textPrimary, marginTop: spacing.xs }]}>Variables / eventuales</Text>
            {variableIncomeConcepts.map(renderIncomeConcept)}
          </View>
        )}

        {/* ---------- Gastos: casilla desplegable ---------- */}
        <SectionToggle
          title="Gastos"
          amount={totalActualExpense}
          currency={profile.primaryCurrency}
          open={gastosOpen}
          onToggle={() => setGastosOpen((v) => !v)}
        />

        {gastosOpen && (
          <View style={{ gap: spacing.md }}>
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
                        accounts={accounts}
                        showAccountExclude
                        onCancel={() => setEditingConceptId(null)}
                        onSave={(input) => handleSaveConcept(concept.id, input)}
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
                        accounts={accounts}
                        onEdit={() => setEditingConceptId(concept.id)}
                        onDelete={(budgetId) => deleteBudget(budgetId)}
                      />
                    )
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  groupHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 },
  scopeToggle: { flexDirection: 'row', borderWidth: 1, padding: 3, alignSelf: 'flex-start' },
  scopeBtn: { paddingHorizontal: 18, paddingVertical: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
});

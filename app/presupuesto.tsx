import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConceptBudgetForm } from '@/components/ConceptBudgetForm';
import { ConceptRow } from '@/components/ConceptRow';
import { ConceptSubBudgets } from '@/components/ConceptSubBudgets';
import { IncomeConceptRow } from '@/components/IncomeConceptRow';
import { SectionToggle } from '@/components/SectionToggle';
import { BUDGET_GROUP_DESCRIPTIONS, BUDGET_GROUP_LABELS, budgetConceptsByGroup, INCOME_CONCEPTS, type BudgetGroupId, type IncomeConcept } from '@/data/budgetConcepts';
import type { BudgetFrequency, BudgetPeriodicity } from '@/data/types';
import { selectActiveAccounts, selectActiveBudgets, selectActiveTransactions } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { computeMonthlyAmount, WEEKS_PER_MONTH } from '@/utils/budgetCalculator';
import { formatDateDMY, monthLabel, toISODate } from '@/utils/date';
import { buildBudgetLines, incomeByConcept, incomeByKind, spendByConcept, spendBySubBudget } from '@/utils/finance';
import { formatCurrency } from '@/utils/format';

const GROUPS: BudgetGroupId[] = ['necesidades', 'deseos', 'ahorro'];
const GROUP_COLOR_KEY: Record<BudgetGroupId, 'accentFrom' | 'accentTo' | 'warning'> = {
  necesidades: 'accentFrom',
  deseos: 'warning',
  ahorro: 'accentTo',
};
const GROUP_ICON: Record<BudgetGroupId, keyof typeof Ionicons.glyphMap> = {
  necesidades: 'home-outline',
  deseos: 'heart-outline',
  ahorro: 'trending-up-outline',
};

type Scope = 'month' | 'week';

// Texto del rango de fechas para "Periodo del presupuesto" — el mes en
// curso, o la semana en curso (lunes a domingo), nunca una fecha inventada.
function periodRangeLabel(scope: Scope): string {
  const now = new Date();
  if (scope === 'month') return monthLabel(toISODate(now));
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${formatDateDMY(toISODate(monday))} – ${formatDateDMY(toISODate(sunday))}`;
}

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
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<BudgetGroupId | null>(null);

  const lines = buildBudgetLines(budgets, transactions, profile.budgetThresholds, new Date(), scope);
  const lineByConcept = new Map(lines.map((l) => [l.categoryId, l]));
  const conceptSpend = spendByConcept(transactions, new Date(), scope);
  const subcategorySpend = spendBySubBudget(transactions, new Date(), scope);
  const incomeConceptActual = incomeByConcept(transactions, new Date(), scope);
  const income = incomeByKind(transactions, new Date(), scope);

  const scopedBudgeted = (monthlyAmount: number) => (scope === 'week' ? monthlyAmount / WEEKS_PER_MONTH : monthlyAmount);

  const totalActualExpense = GROUPS.reduce(
    (sum, g) => sum + budgetConceptsByGroup(g).reduce((s2, c) => s2 + (conceptSpend[c.id] ?? 0), 0),
    0
  );
  const totalIncome = income.fixed + income.variable;

  // "Tienes para gastar": lo que queda del presupuesto de GASTO ya
  // definido — nunca se mezcla con lo presupuestado de ingresos (mismo
  // principio que "Tu resumen" del Dashboard).
  const budgetedExpenseTotal = GROUPS.reduce(
    (sum, g) => sum + budgetConceptsByGroup(g).reduce((s2, c) => s2 + scopedBudgeted(lineByConcept.get(c.id)?.budgeted ?? 0), 0),
    0
  );
  const remainingToSpend = Math.max(0, budgetedExpenseTotal - totalActualExpense);
  const expensePercentUsed = budgetedExpenseTotal > 0 ? Math.min(100, Math.round((totalActualExpense / budgetedExpenseTotal) * 100)) : 0;

  const groupSummaries = GROUPS.map((g) => {
    const concepts = budgetConceptsByGroup(g);
    const groupBudgeted = concepts.reduce((s, c) => s + scopedBudgeted(lineByConcept.get(c.id)?.budgeted ?? 0), 0);
    const groupActual = concepts.reduce((s, c) => s + (conceptSpend[c.id] ?? 0), 0);
    const amount = groupBudgeted > 0 ? groupBudgeted : groupActual;
    const percentBase = budgetedExpenseTotal > 0 ? budgetedExpenseTotal : totalActualExpense;
    const percent = percentBase > 0 ? Math.round((amount / percentBase) * 100) : 0;
    return { group: g, concepts, groupBudgeted, groupActual, amount, percent };
  });

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
          <Text style={[typography.title, { color: colors.textPrimary }]}>Mi presupuesto</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Ingresos, gastos y hacia dónde va tu dinero</Text>
        </View>
        <Pressable accessibilityLabel="Ajustes" onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.md }}>
        {/* ---------- Periodo del presupuesto ---------- */}
        <Pressable
          accessibilityLabel="Cambiar periodo del presupuesto"
          onPress={() => setPeriodoOpen((v) => !v)}
          style={[styles.periodRow, { borderColor: colors.surfaceBorder, borderRadius: radius.lg, backgroundColor: colors.surfaceSolid }]}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Periodo del presupuesto</Text>
            <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>{periodRangeLabel(scope)}</Text>
          </View>
          <Ionicons name={periodoOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
        </Pressable>

        {periodoOpen && (
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
        )}

        {/* ---------- Tienes para gastar ---------- */}
        <View style={[styles.spendCard, { backgroundColor: colors.accentFrom, borderRadius: radius.lg }]}>
          <View style={styles.rowBetween}>
            <Text style={[typography.body, { color: 'rgba(255,255,255,0.85)', fontWeight: '600' }]}>Tienes para gastar</Text>
            <View style={[styles.walletIcon, { borderRadius: radius.md }]}>
              <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
            </View>
          </View>
          <Text style={[typography.display, { color: '#FFFFFF', marginTop: 4 }]}>
            {formatCurrency(remainingToSpend, profile.primaryCurrency)}
          </Text>
          {budgetedExpenseTotal > 0 ? (
            <>
              <View style={[styles.spendTrack, { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: radius.pill, marginTop: spacing.md }]}>
                <View style={[styles.spendFill, { width: `${expensePercentUsed}%`, backgroundColor: colors.success, borderRadius: radius.pill }]} />
              </View>
              <View style={[styles.rowBetween, { marginTop: 6 }]}>
                <Text style={[typography.caption, { color: 'rgba(255,255,255,0.85)' }]}>
                  Has usado {formatCurrency(totalActualExpense, profile.primaryCurrency)} de {formatCurrency(budgetedExpenseTotal, profile.primaryCurrency)}
                </Text>
                <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>{expensePercentUsed}%</Text>
              </View>
            </>
          ) : (
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.85)', marginTop: spacing.sm }]}>
              Aún no defines tu presupuesto de gastos — ábrelo abajo para empezar.
            </Text>
          )}
        </View>

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

        {/* ---------- Distribuye tu dinero: grupos de gasto ---------- */}
        <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.xs }]}>Distribuye tu dinero</Text>

        {groupSummaries.map(({ group, concepts, amount, percent }) => {
          const isOpen = openGroupId === group;
          return (
            <View key={group} style={{ gap: spacing.sm }}>
              <Pressable
                accessibilityLabel={`Mostrar/Ocultar ${BUDGET_GROUP_LABELS[group]}`}
                onPress={() => setOpenGroupId(isOpen ? null : group)}
                style={[styles.groupCard, { borderColor: colors.surfaceBorder, borderRadius: radius.lg, backgroundColor: colors.surfaceSolid }]}
              >
                <View style={[styles.groupIconBadge, { backgroundColor: colors.accentSoft, borderRadius: radius.md }]}>
                  <Ionicons name={GROUP_ICON[group]} size={18} color={colors[GROUP_COLOR_KEY[group]]} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={[typography.headline, { color: colors.textPrimary }]}>{BUDGET_GROUP_LABELS[group]}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                    {BUDGET_GROUP_DESCRIPTIONS[group]}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', marginRight: spacing.sm }}>
                  <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>
                    {formatCurrency(amount, profile.primaryCurrency)}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textTertiary }]}>{percent}%</Text>
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
              </Pressable>

              {isOpen &&
                concepts.map((concept) => (
                  <View key={concept.id} style={{ gap: spacing.sm }}>
                    {editingConceptId === concept.id ? (
                      <ConceptBudgetForm
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
                    )}
                    <ConceptSubBudgets
                      concept={concept}
                      budgets={budgets}
                      lineByConcept={lineByConcept}
                      subcategorySpend={subcategorySpend}
                      scope={scope}
                      scopedBudgeted={scopedBudgeted}
                      currency={profile.primaryCurrency}
                      accounts={accounts}
                      editingConceptId={editingConceptId}
                      setEditingConceptId={setEditingConceptId}
                      onSaveConcept={handleSaveConcept}
                      onDeleteBudget={(budgetId) => deleteBudget(budgetId)}
                    />
                  </View>
                ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  scopeToggle: { flexDirection: 'row', borderWidth: 1, padding: 3, alignSelf: 'flex-start' },
  scopeBtn: { paddingHorizontal: 18, paddingVertical: 8 },
  periodRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  spendCard: { padding: 18 },
  walletIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  spendTrack: { width: '100%', height: 8, overflow: 'hidden' },
  spendFill: { height: 8 },
  groupCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 14 },
  groupIconBadge: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});

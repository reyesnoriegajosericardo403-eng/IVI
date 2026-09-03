import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BudgetCalendar } from '@/components/BudgetCalendar';
import { BudgetSearchBar, type BudgetSearchEntry } from '@/components/BudgetSearchBar';
import { BudgetTemplateSheet } from '@/components/BudgetTemplateSheet';
import { ConceptBudgetForm } from '@/components/ConceptBudgetForm';
import { ConceptRow } from '@/components/ConceptRow';
import { ConceptSubBudgets } from '@/components/ConceptSubBudgets';
import { IncomeConceptRow } from '@/components/IncomeConceptRow';
import { PropagateChoiceSheet, type PropagateChoice } from '@/components/PropagateChoiceSheet';
import { SectionToggle } from '@/components/SectionToggle';
import {
  BUDGET_CONCEPTS,
  BUDGET_GROUP_DESCRIPTIONS,
  BUDGET_GROUP_EXAMPLES,
  BUDGET_GROUP_LABELS,
  budgetConceptsByGroup,
  INCOME_CONCEPTS,
  makeSubBudgetId,
  subcategoryOptionsForConcept,
  type BudgetGroupId,
  type IncomeConcept,
} from '@/data/budgetConcepts';
import { findSubcategory } from '@/data/categories';
import type { BudgetFrequency, BudgetPeriodicity, BudgetTemplateKind, Currency } from '@/data/types';
import {
  selectActiveAccounts,
  selectActiveBudgetAssignments,
  selectActiveBudgets,
  selectActiveBudgetTemplates,
  selectActivePeriodOverrides,
  selectActiveTemplateBudgetLines,
  selectActiveTransactions,
} from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { computeMonthlyAmount, WEEKS_PER_MONTH } from '@/utils/budgetCalculator';
import { makePeriodKey, parsePeriodKey, periodKeyLabel, shiftPeriodKey } from '@/utils/budgetPeriods';
import { toISODate } from '@/utils/date';
import { incomeByConceptInRange, resolveBudgetForPeriod } from '@/utils/finance';
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

// Lo que se guardó pero todavía no se aplica: espera a que la persona
// diga hasta dónde llega el cambio (solo este periodo, todos, o N).
interface PendingSave {
  categoryId: string;
  patch: {
    monthlyAmount: number;
    currency: Currency;
    periodicity?: BudgetPeriodicity;
    frequency?: BudgetFrequency;
    customDaysPerWeek?: number;
    baseAmount?: number;
    dayOfWeek?: number;
    dayOfMonth?: number;
    oneTimeDate?: string;
    targetAccountId?: string;
    includedAccountIds?: string[];
  };
}

export default function Presupuesto() {
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const rawBudgets = useAppStore((s) => s.budgets);
  const rawTransactions = useAppStore((s) => s.transactions);
  const rawAccounts = useAppStore((s) => s.accounts);
  const rawTemplates = useAppStore((s) => s.budgetTemplates);
  const rawTemplateLines = useAppStore((s) => s.templateBudgetLines);
  const rawAssignments = useAppStore((s) => s.budgetAssignments);
  const rawOverrides = useAppStore((s) => s.periodBudgetOverrides);
  const ensureDefaultBudgetTemplate = useAppStore((s) => s.ensureDefaultBudgetTemplate);
  const addBudgetTemplate = useAppStore((s) => s.addBudgetTemplate);
  const deleteBudgetTemplate = useAppStore((s) => s.deleteBudgetTemplate);
  const setTemplateBudgetLine = useAppStore((s) => s.setTemplateBudgetLine);
  const deleteTemplateBudgetLine = useAppStore((s) => s.deleteTemplateBudgetLine);
  const assignTemplateToPeriod = useAppStore((s) => s.assignTemplateToPeriod);
  const unassignPeriod = useAppStore((s) => s.unassignPeriod);
  const setPeriodOverride = useAppStore((s) => s.setPeriodOverride);
  const updateProfileDraft = useAppStore((s) => s.updateProfileDraft);

  // Lo que ya existía antes de las plantillas se envuelve en "Mi
  // presupuesto" la primera vez que se abre esta pantalla.
  useEffect(() => {
    ensureDefaultBudgetTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const budgets = useMemo(() => selectActiveBudgets(rawBudgets), [rawBudgets]);
  const transactions = useMemo(() => selectActiveTransactions(rawTransactions), [rawTransactions]);
  const accounts = useMemo(() => selectActiveAccounts(rawAccounts), [rawAccounts]);
  const templates = useMemo(() => selectActiveBudgetTemplates(rawTemplates), [rawTemplates]);
  const templateLines = useMemo(() => selectActiveTemplateBudgetLines(rawTemplateLines), [rawTemplateLines]);
  const assignments = useMemo(() => selectActiveBudgetAssignments(rawAssignments), [rawAssignments]);
  const overrides = useMemo(() => selectActivePeriodOverrides(rawOverrides), [rawOverrides]);

  const [scope, setScope] = useState<Scope>('month');
  const [viewingPeriodKey, setViewingPeriodKey] = useState(() => makePeriodKey('month', new Date()));
  const [calendarMonthIso, setCalendarMonthIso] = useState(() => toISODate(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const [ingresosOpen, setIngresosOpen] = useState(false);
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<BudgetGroupId | null>(null);
  const [introOpen, setIntroOpen] = useState(!profile.seenBudgetTemplatesIntro);

  // Cambiar entre Semanal y Mensual mueve el periodo que se está viendo
  // al equivalente de hoy en esa escala.
  const switchScope = (next: Scope) => {
    setScope(next);
    setViewingPeriodKey(makePeriodKey(next, new Date()));
  };

  const resolved = useMemo(
    () =>
      resolveBudgetForPeriod({
        periodKey: viewingPeriodKey,
        templates,
        templateLines,
        assignments,
        overrides,
        transactions,
        thresholds: profile.budgetThresholds,
      }),
    [viewingPeriodKey, templates, templateLines, assignments, overrides, transactions, profile.budgetThresholds]
  );

  const { template: activeTemplate, assignment: activeAssignment, lines, conceptSpend, subcategorySpend, incomeConceptActual } = resolved;
  const lineByConcept = useMemo(() => new Map(lines.map((l) => [l.categoryId, l])), [lines]);

  // Los renglones que el formulario debe reabrir: los de la plantilla del
  // periodo, ya con el ajuste de ESTE periodo aplicado si lo hay.
  const editableLines = useMemo(() => {
    if (!activeTemplate) return [];
    const own = templateLines.filter((l) => l.templateId === activeTemplate.id);
    if (!activeAssignment) return own;
    const here = overrides.filter((o) => o.assignmentId === activeAssignment.id);
    return own.map((l) => {
      const o = here.find((x) => x.categoryId === l.categoryId);
      return o && o.monthlyAmount !== null ? { ...l, ...o, id: l.id, categoryId: l.categoryId } : l;
    });
  }, [activeTemplate, activeAssignment, templateLines, overrides]);

  const periodRange = parsePeriodKey(viewingPeriodKey);
  const income = useMemo(() => {
    if (!periodRange) return { fixed: 0, variable: 0 };
    const byConcept = incomeByConceptInRange(transactions, periodRange.start, periodRange.end);
    let fixed = 0;
    let variable = 0;
    for (const concept of INCOME_CONCEPTS) {
      const amount = byConcept[concept.id] ?? 0;
      if (concept.kind === 'fixed') fixed += amount;
      else variable += amount;
    }
    return { fixed, variable };
  }, [transactions, periodRange?.start?.getTime(), periodRange?.end?.getTime()]);

  const scopedBudgeted = (monthlyAmount: number) => (scope === 'week' ? monthlyAmount / WEEKS_PER_MONTH : monthlyAmount);

  const totalActualExpense = GROUPS.reduce(
    (sum, g) => sum + budgetConceptsByGroup(g).reduce((s2, c) => s2 + (conceptSpend[c.id] ?? 0), 0),
    0
  );
  const totalIncome = income.fixed + income.variable;

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

  const writeToTemplate = (categoryId: string, patch: PendingSave['patch']) => {
    if (!activeTemplate) return;
    setTemplateBudgetLine({ templateId: activeTemplate.id, categoryId, ...patch });
  };

  const handleSaveConcept = (
    categoryId: string,
    input: {
      baseAmount: number;
      periodicity: BudgetPeriodicity;
      frequency?: BudgetFrequency;
      customDaysPerWeek?: number;
      dayOfWeek?: number;
      dayOfMonth?: number;
      oneTimeDate?: string;
      targetAccountId?: string;
      includedAccountIds?: string[];
    }
  ) => {
    const monthlyAmount = computeMonthlyAmount(input);
    if (monthlyAmount <= 0) return;
    const patch: PendingSave['patch'] = {
      monthlyAmount,
      currency: profile.primaryCurrency,
      periodicity: input.periodicity,
      frequency: input.frequency,
      customDaysPerWeek: input.customDaysPerWeek,
      baseAmount: input.baseAmount,
      dayOfWeek: input.dayOfWeek,
      dayOfMonth: input.dayOfMonth,
      oneTimeDate: input.oneTimeDate,
      targetAccountId: input.targetAccountId,
      includedAccountIds: input.includedAccountIds,
    };
    // Si el periodo tiene un presupuesto con nombre cargado, el cambio es
    // de ESTE periodo salvo que la persona diga otra cosa. Con el de
    // siempre no hay nada que preguntar: se edita directo.
    if (activeAssignment && activeTemplate && !activeTemplate.isDefault) {
      setPendingSave({ categoryId, patch });
      return;
    }
    writeToTemplate(categoryId, patch);
    setEditingConceptId(null);
  };

  const applyPendingSave = (choice: PropagateChoice) => {
    if (!pendingSave) return;
    setPeriodOverride(viewingPeriodKey, pendingSave.categoryId, pendingSave.patch, choice);
    setPendingSave(null);
    setEditingConceptId(null);
  };

  // Quitar un renglón: de la plantilla completa cuando es el presupuesto
  // de siempre; solo de este periodo cuando hay uno con nombre cargado.
  const handleDeleteLine = (lineId: string) => {
    const line = editableLines.find((l) => l.id === lineId);
    if (!line) return;
    if (activeAssignment && activeTemplate && !activeTemplate.isDefault) {
      setPeriodOverride(viewingPeriodKey, line.categoryId, { monthlyAmount: null, currency: profile.primaryCurrency }, 'none');
      return;
    }
    deleteTemplateBudgetLine(lineId);
  };

  const fixedIncomeConcepts = INCOME_CONCEPTS.filter((c) => c.kind === 'fixed');
  const variableIncomeConcepts = INCOME_CONCEPTS.filter((c) => c.kind === 'variable');

  const renderIncomeConcept = (concept: IncomeConcept) =>
    editingConceptId === concept.id ? (
      <ConceptBudgetForm
        key={concept.id}
        concept={concept}
        initial={editableLines.find((l) => l.categoryId === concept.id)}
        currency={profile.primaryCurrency}
        allowDateQuestion={concept.kind === 'fixed'}
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
        onDelete={handleDeleteLine}
      />
    );

  const incomeSearchEntries: BudgetSearchEntry[] = useMemo(
    () =>
      INCOME_CONCEPTS.map((concept) => {
        const subId = concept.matches[0]?.subcategoryIds?.[0];
        const keywords = subId ? findSubcategory('income', subId)?.keywords : undefined;
        return {
          key: concept.id,
          label: concept.name,
          sublabel: concept.kind === 'fixed' ? 'Ingreso fijo' : 'Ingreso variable',
          keywords,
          onSelect: () => {
            setIngresosOpen(true);
            setEditingConceptId(concept.id);
          },
        };
      }),
    []
  );

  const expenseSearchEntries: BudgetSearchEntry[] = useMemo(() => {
    const out: BudgetSearchEntry[] = [];
    for (const concept of BUDGET_CONCEPTS) {
      out.push({
        key: concept.id,
        label: concept.name,
        sublabel: BUDGET_GROUP_LABELS[concept.group],
        onSelect: () => {
          setOpenGroupId(concept.group);
          setEditingConceptId(concept.id);
        },
      });
      for (const option of subcategoryOptionsForConcept(concept)) {
        out.push({
          key: `${concept.id}::${option.subcategoryId}`,
          label: option.name,
          sublabel: concept.name,
          keywords: findSubcategory(option.categoryId, option.subcategoryId)?.keywords,
          onSelect: () => {
            setOpenGroupId(concept.group);
            setEditingConceptId(makeSubBudgetId(concept.id, option.subcategoryId));
          },
        });
      }
    }
    return out;
  }, []);

  const oneTimeBudgets = useMemo(() => budgets.filter((b) => !!b.oneTimeDate), [budgets]);
  const isCurrentPeriod = viewingPeriodKey === makePeriodKey(scope, new Date());

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
        {/* ---------- Periodo + plantilla activa ---------- */}
        <View style={[styles.periodCard, { borderColor: colors.surfaceBorder, borderRadius: radius.lg, backgroundColor: colors.surfaceSolid }]}>
          <View style={styles.rowCenter}>
            <Pressable
              accessibilityLabel="Periodo anterior"
              onPress={() => setViewingPeriodKey((k) => shiftPeriodKey(k, -1))}
              style={styles.navBtn}
            >
              <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              accessibilityLabel="Cambiar periodo del presupuesto"
              onPress={() => setPeriodoOpen((v) => !v)}
              style={{ flex: 1, alignItems: 'center' }}
            >
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Periodo del presupuesto</Text>
              <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>{periodKeyLabel(viewingPeriodKey)}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Periodo siguiente"
              onPress={() => setViewingPeriodKey((k) => shiftPeriodKey(k, 1))}
              style={styles.navBtn}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {periodoOpen && (
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <View style={[styles.scopeToggle, { borderColor: colors.surfaceBorder, borderRadius: radius.pill }]}>
                {(['week', 'month'] as Scope[]).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => switchScope(s)}
                    style={[styles.scopeBtn, { borderRadius: radius.pill, backgroundColor: scope === s ? colors.accentFrom : 'transparent' }]}
                  >
                    <Text style={{ color: scope === s ? '#FFFFFF' : colors.textSecondary, fontWeight: '700' }}>
                      {s === 'week' ? 'Semanal' : 'Mensual'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {!isCurrentPeriod && (
                <Pressable
                  accessibilityLabel="Volver al periodo actual"
                  onPress={() => setViewingPeriodKey(makePeriodKey(scope, new Date()))}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Text style={{ color: colors.accentFrom, fontWeight: '700' }}>Volver a hoy</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Plantilla que está cargada en este periodo */}
          <View style={[styles.templateRow, { borderTopColor: colors.divider, marginTop: spacing.sm, paddingTop: spacing.sm }]}>
            <View style={[styles.colorDot, { backgroundColor: activeTemplate?.color ?? colors.textTertiary }]} />
            <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600', flex: 1, marginLeft: spacing.sm }]} numberOfLines={1}>
              {activeTemplate?.name ?? 'Mi presupuesto'}
            </Text>
            <Pressable accessibilityLabel="Cambiar presupuesto de este periodo" onPress={() => setTemplateSheetOpen(true)}>
              <Text style={{ color: colors.accentFrom, fontWeight: '700' }}>Cambiar</Text>
            </Pressable>
          </View>

          <View style={styles.templateActions}>
            <Pressable
              accessibilityLabel="Repetir este presupuesto en el siguiente periodo"
              onPress={() => {
                if (!activeTemplate) return;
                assignTemplateToPeriod(activeTemplate.id, shiftPeriodKey(viewingPeriodKey, 1));
              }}
              style={[styles.secondaryBtn, { borderColor: colors.accentFrom, borderRadius: radius.pill }]}
            >
              <Ionicons name="repeat-outline" size={15} color={colors.accentFrom} />
              <Text style={{ color: colors.accentFrom, fontWeight: '700', marginLeft: 6, fontSize: 13 }}>Repetir el siguiente</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Ver calendario de presupuestos"
              onPress={() => setCalendarOpen((v) => !v)}
              style={[styles.secondaryBtn, { borderColor: colors.surfaceBorder, borderRadius: radius.pill }]}
            >
              <Ionicons name="calendar-outline" size={15} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontWeight: '700', marginLeft: 6, fontSize: 13 }}>
                {calendarOpen ? 'Ocultar calendario' : 'Calendario'}
              </Text>
            </Pressable>
          </View>

          {calendarOpen && (
            <View style={{ marginTop: spacing.md }}>
              <BudgetCalendar
                monthIso={calendarMonthIso}
                onChangeMonth={setCalendarMonthIso}
                mode={scope}
                templates={templates}
                assignments={assignments}
                oneTimeBudgets={oneTimeBudgets}
                selectedPeriodKey={viewingPeriodKey}
                onSelectPeriod={(key) => {
                  setViewingPeriodKey(key);
                  setTemplateSheetOpen(true);
                }}
              />
            </View>
          )}
        </View>

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

        {/* ---------- Ingresos ---------- */}
        <SectionToggle
          title="Ingresos"
          amount={totalIncome}
          currency={profile.primaryCurrency}
          open={ingresosOpen}
          onToggle={() => setIngresosOpen((v) => !v)}
        />

        <BudgetSearchBar entries={incomeSearchEntries} placeholder="Buscar un tipo de ingreso…" />

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

        {/* ---------- Distribuye tu dinero ---------- */}
        <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.xs }]}>Distribuye tu dinero</Text>

        <BudgetSearchBar entries={expenseSearchEntries} placeholder="Buscar un gasto (ej. Uber, corte de pelo…)" />

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
                  <Text style={[typography.micro, { color: colors.textTertiary, fontWeight: '400', marginTop: 2 }]} numberOfLines={1}>
                    {BUDGET_GROUP_EXAMPLES[group]}
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
                        initial={editableLines.find((l) => l.categoryId === concept.id)}
                        currency={profile.primaryCurrency}
                        accounts={accounts}
                        showAccountInclude
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
                        onDelete={handleDeleteLine}
                      />
                    )}
                    <ConceptSubBudgets
                      concept={concept}
                      budgets={editableLines}
                      lineByConcept={lineByConcept}
                      subcategorySpend={subcategorySpend}
                      scope={scope}
                      scopedBudgeted={scopedBudgeted}
                      currency={profile.primaryCurrency}
                      accounts={accounts}
                      editingConceptId={editingConceptId}
                      setEditingConceptId={setEditingConceptId}
                      onSaveConcept={handleSaveConcept}
                      onDeleteBudget={handleDeleteLine}
                    />
                  </View>
                ))}
            </View>
          );
        })}
      </ScrollView>

      {templateSheetOpen && (
        <BudgetTemplateSheet
          periodLabel={periodKeyLabel(viewingPeriodKey)}
          scope={parsePeriodKey(viewingPeriodKey)?.scope ?? scope}
          templates={templates}
          currentTemplateId={activeAssignment?.templateId}
          onAssign={(templateId) => {
            assignTemplateToPeriod(templateId, viewingPeriodKey);
            setTemplateSheetOpen(false);
          }}
          onUnassign={() => {
            unassignPeriod(viewingPeriodKey);
            setTemplateSheetOpen(false);
          }}
          onCreate={(name, color, kind: BudgetTemplateKind) => {
            const id = addBudgetTemplate({ name, color, kind });
            assignTemplateToPeriod(id, viewingPeriodKey);
            setTemplateSheetOpen(false);
          }}
          onDelete={(templateId) => deleteBudgetTemplate(templateId)}
          onClose={() => setTemplateSheetOpen(false)}
        />
      )}

      {pendingSave && activeTemplate && (
        <PropagateChoiceSheet
          templateName={activeTemplate.name}
          onChoose={applyPendingSave}
          onCancel={() => setPendingSave(null)}
        />
      )}

      {introOpen && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
            <Ionicons name="calendar-number-outline" size={30} color={colors.accentFrom} />
            <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.sm }]}>Nuevo: presupuestos con nombre</Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              Ahora puedes armar varios presupuestos para situaciones distintas — uno para tus días de clases o
              trabajo, otro para vacaciones, y hasta eventos de un solo día — y aplicarlos a las semanas o meses
              que quieras desde el calendario.
            </Text>
            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.sm }]}>
              También puedes moverte a periodos pasados o futuros con las flechas, y repetir el presupuesto de
              este periodo en el siguiente con un toque.
            </Text>
            <Pressable
              accessibilityLabel="Entendido"
              onPress={() => {
                setIntroOpen(false);
                updateProfileDraft({ seenBudgetTemplatesIntro: true });
              }}
              style={[styles.introCta, { borderRadius: radius.pill, backgroundColor: colors.accentFrom, marginTop: spacing.lg }]}
            >
              <Text style={[typography.headline, { color: '#FFFFFF' }]}>Entendido</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  scopeToggle: { flexDirection: 'row', borderWidth: 1, padding: 3, alignSelf: 'flex-start' },
  scopeBtn: { paddingHorizontal: 18, paddingVertical: 8 },
  periodCard: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  navBtn: { padding: 6 },
  templateRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1 },
  templateActions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  spendCard: { padding: 18 },
  walletIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  spendTrack: { width: '100%', height: 8, overflow: 'hidden' },
  spendFill: { height: 8 },
  groupCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 14 },
  groupIconBadge: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { width: '100%', maxWidth: 360, padding: 24 },
  introCta: { paddingVertical: 14, alignItems: 'center' },
});

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BudgetSearchBar, type BudgetSearchEntry } from '@/components/BudgetSearchBar';
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
  findIncomeConcept,
  INCOME_CONCEPTS,
  makeSubBudgetId,
  subcategoryOptionsForConcept,
  type BudgetGroupId,
  type IncomeConcept,
} from '@/data/budgetConcepts';
import { findSubcategory } from '@/data/categories';
import type { BudgetFrequency, BudgetPeriodicity, Currency } from '@/data/types';
import {
  selectActiveAccounts,
  selectActiveBudgetAssignments,
  selectActiveBudgetTemplates,
  selectActivePeriodOverrides,
  selectActiveTemplateBudgetLines,
  selectActiveTransactions,
} from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { computeMonthlyAmount, WEEKS_PER_MONTH } from '@/utils/budgetCalculator';
import { parsePeriodKey, periodKeyLabel } from '@/utils/budgetPeriods';
import { buildLinesFromTemplateLines, incomeByConceptInRange, resolveBudgetForPeriod } from '@/utils/finance';
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
// diga hasta dónde llega el cambio (solo este periodo, todos, o N). Solo
// existe en modo "periodo" — editar la plantilla directo nunca pregunta.
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

// Pantalla de edición de montos — se llega de dos formas (spec: "que la
// integración se vea limpia", separar la edición del vistazo simple de
// Presupuesto):
// 1. Con `periodKey` (desde "Editar este periodo"): edita el periodo que
//    se estaba viendo, con overrides y la pregunta Sí/No/Personalizado
//    si la plantilla activa no es la de siempre — igual que antes.
// 2. Sin `periodKey` (desde "Editar montos" en la lista de plantillas):
//    edita la plantilla misma directo, sin overrides ni pregunta — no
//    hay periodo del cual propagar.
export default function BudgetTemplateEdit() {
  const { id, periodKey } = useLocalSearchParams<{ id: string; periodKey?: string }>();
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const rawTransactions = useAppStore((s) => s.transactions);
  const rawAccounts = useAppStore((s) => s.accounts);
  const rawTemplates = useAppStore((s) => s.budgetTemplates);
  const rawTemplateLines = useAppStore((s) => s.templateBudgetLines);
  const rawAssignments = useAppStore((s) => s.budgetAssignments);
  const rawOverrides = useAppStore((s) => s.periodBudgetOverrides);
  const ensureDefaultBudgetTemplate = useAppStore((s) => s.ensureDefaultBudgetTemplate);
  const setTemplateBudgetLine = useAppStore((s) => s.setTemplateBudgetLine);
  const deleteTemplateBudgetLine = useAppStore((s) => s.deleteTemplateBudgetLine);
  const setPeriodOverride = useAppStore((s) => s.setPeriodOverride);

  useEffect(() => {
    ensureDefaultBudgetTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const transactions = useMemo(() => selectActiveTransactions(rawTransactions), [rawTransactions]);
  const accounts = useMemo(() => selectActiveAccounts(rawAccounts), [rawAccounts]);
  const templates = useMemo(() => selectActiveBudgetTemplates(rawTemplates), [rawTemplates]);
  const templateLines = useMemo(() => selectActiveTemplateBudgetLines(rawTemplateLines), [rawTemplateLines]);
  const assignments = useMemo(() => selectActiveBudgetAssignments(rawAssignments), [rawAssignments]);
  const overrides = useMemo(() => selectActivePeriodOverrides(rawOverrides), [rawOverrides]);

  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const [ingresosOpen, setIngresosOpen] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<BudgetGroupId | null>(null);

  const periodResolved = useMemo(
    () =>
      periodKey
        ? resolveBudgetForPeriod({
            periodKey,
            templates,
            templateLines,
            assignments,
            overrides,
            transactions,
            thresholds: profile.budgetThresholds,
          })
        : null,
    [periodKey, templates, templateLines, assignments, overrides, transactions, profile.budgetThresholds]
  );

  const activeTemplate = periodResolved ? periodResolved.template : templates.find((t) => t.id === id);
  const activeAssignment = periodResolved?.assignment;
  const scope: Scope = periodKey && parsePeriodKey(periodKey)?.scope === 'week' ? 'week' : 'month';

  // Los renglones que el formulario debe reabrir: los de la plantilla
  // activa, con el ajuste de ESTE periodo aplicado si lo hay (modo
  // periodo) o tal cual (modo edición directa de plantilla).
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

  // Gasto/ingreso real: solo existe cuando se está viendo un periodo
  // concreto. Editando la plantilla directo no hay con qué comparar.
  const conceptSpend = periodResolved?.conceptSpend ?? {};
  const subcategorySpend = periodResolved?.subcategorySpend ?? {};
  const incomeConceptActual = periodResolved?.incomeConceptActual ?? {};

  // En modo periodo, `resolveBudgetForPeriod` ya arma las líneas con sus
  // overrides combinados. Editando la plantilla directo (sin periodo) se
  // arman de cero a partir de sus renglones propios, sin overrides.
  const ownTemplateLines = useMemo(
    () => (activeTemplate ? templateLines.filter((l) => l.templateId === activeTemplate.id) : []),
    [activeTemplate, templateLines]
  );
  const lines = useMemo(
    () =>
      periodResolved
        ? periodResolved.lines
        : buildLinesFromTemplateLines(ownTemplateLines, [], conceptSpend, subcategorySpend, incomeConceptActual, profile.budgetThresholds),
    [periodResolved, ownTemplateLines, conceptSpend, subcategorySpend, incomeConceptActual, profile.budgetThresholds]
  );
  const lineByConcept = useMemo(() => new Map(lines.map((l) => [l.categoryId, l])), [lines]);

  const periodRange = periodKey ? parsePeriodKey(periodKey) : null;
  const totalIncome = useMemo(() => {
    if (periodRange) {
      const byConcept = incomeByConceptInRange(transactions, periodRange.start, periodRange.end);
      return INCOME_CONCEPTS.reduce((sum, c) => sum + (byConcept[c.id] ?? 0), 0);
    }
    // Sin periodo: el total esperado según lo que ya se definió en la plantilla.
    return ownTemplateLines.filter((l) => findIncomeConcept(l.categoryId)).reduce((sum, l) => sum + l.monthlyAmount, 0);
  }, [periodRange?.start?.getTime(), periodRange?.end?.getTime(), transactions, ownTemplateLines]);

  const scopedBudgeted = (monthlyAmount: number) => (scope === 'week' ? monthlyAmount / WEEKS_PER_MONTH : monthlyAmount);

  const groupSummaries = GROUPS.map((g) => {
    const concepts = budgetConceptsByGroup(g);
    const groupBudgeted = concepts.reduce((s, c) => s + scopedBudgeted(lineByConcept.get(c.id)?.budgeted ?? 0), 0);
    const groupActual = concepts.reduce((s, c) => s + (conceptSpend[c.id] ?? 0), 0);
    const amount = groupBudgeted > 0 ? groupBudgeted : groupActual;
    const percentBase = GROUPS.reduce((s2, g2) => s2 + budgetConceptsByGroup(g2).reduce((s3, c) => s3 + scopedBudgeted(lineByConcept.get(c.id)?.budgeted ?? 0), 0), 0);
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
    // Editando un periodo con presupuesto con nombre cargado, el cambio
    // es de ESE periodo salvo que la persona diga otra cosa. Editando la
    // plantilla directo (sin periodo) no hay nada que preguntar.
    if (periodKey && activeAssignment && activeTemplate && !activeTemplate.isDefault) {
      setPendingSave({ categoryId, patch });
      return;
    }
    writeToTemplate(categoryId, patch);
    setEditingConceptId(null);
  };

  const applyPendingSave = (choice: PropagateChoice) => {
    if (!pendingSave || !periodKey) return;
    setPeriodOverride(periodKey, pendingSave.categoryId, pendingSave.patch, choice);
    setPendingSave(null);
    setEditingConceptId(null);
  };

  const handleDeleteLine = (lineId: string) => {
    const line = editableLines.find((l) => l.id === lineId);
    if (!line) return;
    if (periodKey && activeAssignment && activeTemplate && !activeTemplate.isDefault) {
      setPeriodOverride(periodKey, line.categoryId, { monthlyAmount: null, currency: profile.primaryCurrency }, 'none');
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

  const headerTitle = periodKey ? periodKeyLabel(periodKey) : activeTemplate?.name ?? 'Presupuesto';
  const headerSubtitle = periodKey
    ? `Editando "${activeTemplate?.name ?? 'Mi presupuesto'}" para este periodo`
    : 'Edita los montos base de esta plantilla';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[typography.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {headerTitle}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
            {headerSubtitle}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.md }}>
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

      {pendingSave && activeTemplate && (
        <PropagateChoiceSheet templateName={activeTemplate.name} onChoose={applyPendingSave} onCancel={() => setPendingSave(null)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  groupCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 14 },
  groupIconBadge: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});

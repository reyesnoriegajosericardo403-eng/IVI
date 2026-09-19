import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AssignBudgetFlow } from '@/components/AssignBudgetFlow';
import { BudgetCalendar, BudgetTemplateLegend } from '@/components/BudgetCalendar';
import { BudgetTemplateList } from '@/components/BudgetTemplateList';
import { BudgetTemplateSheet } from '@/components/BudgetTemplateSheet';
import { ProgressBar } from '@/components/ProgressBar';
import { budgetConceptsByGroup, type BudgetGroupId } from '@/data/budgetConcepts';
import type { BudgetTemplateKind } from '@/data/types';
import {
  selectActiveBudgetAssignments,
  selectActiveBudgets,
  selectActiveBudgetTemplates,
  selectActivePeriodOverrides,
  selectActiveTemplateBudgetLines,
  selectActiveTransactions,
} from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { WEEKS_PER_MONTH } from '@/utils/budgetCalculator';
import { makePeriodKey, periodKeyLabel, shiftPeriodKey } from '@/utils/budgetPeriods';
import { computeBudgetStatus, resolveBudgetForPeriod } from '@/utils/finance';
import { formatCurrency } from '@/utils/format';

const GROUPS: BudgetGroupId[] = ['necesidades', 'deseos', 'ahorro'];

type Scope = 'month' | 'week';

// Pantalla de inicio de Presupuesto — reducida a 3 bloques (spec: "cuando
// entre lo único que quiero ver es una simple gráfica... el calendario
// bonito y minimalista... y una lista de mis presupuestos solo con el
// encabezado de su nombre"). La edición de montos vive en
// app/budget-template/[id].tsx.
export default function Presupuesto() {
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const rawBudgets = useAppStore((s) => s.budgets);
  const rawTransactions = useAppStore((s) => s.transactions);
  const rawTemplates = useAppStore((s) => s.budgetTemplates);
  const rawTemplateLines = useAppStore((s) => s.templateBudgetLines);
  const rawAssignments = useAppStore((s) => s.budgetAssignments);
  const rawOverrides = useAppStore((s) => s.periodBudgetOverrides);
  const ensureDefaultBudgetTemplate = useAppStore((s) => s.ensureDefaultBudgetTemplate);
  const addBudgetTemplate = useAppStore((s) => s.addBudgetTemplate);
  const deleteBudgetTemplate = useAppStore((s) => s.deleteBudgetTemplate);
  const assignTemplateToPeriod = useAppStore((s) => s.assignTemplateToPeriod);
  const unassignPeriod = useAppStore((s) => s.unassignPeriod);
  const updateProfileDraft = useAppStore((s) => s.updateProfileDraft);

  // Lo que ya existía antes de las plantillas se envuelve en "Mi
  // presupuesto" la primera vez que se abre esta pantalla.
  useEffect(() => {
    ensureDefaultBudgetTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const budgets = useMemo(() => selectActiveBudgets(rawBudgets), [rawBudgets]);
  const transactions = useMemo(() => selectActiveTransactions(rawTransactions), [rawTransactions]);
  const templates = useMemo(() => selectActiveBudgetTemplates(rawTemplates), [rawTemplates]);
  const templateLines = useMemo(() => selectActiveTemplateBudgetLines(rawTemplateLines), [rawTemplateLines]);
  const assignments = useMemo(() => selectActiveBudgetAssignments(rawAssignments), [rawAssignments]);
  const overrides = useMemo(() => selectActivePeriodOverrides(rawOverrides), [rawOverrides]);

  const [scope, setScope] = useState<Scope>('month');
  const [viewingPeriodKey, setViewingPeriodKey] = useState(() => makePeriodKey('month', new Date()));
  const [calendarMonthIso, setCalendarMonthIso] = useState(() => new Date().toISOString().slice(0, 10));
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [assignFlowOpen, setAssignFlowOpen] = useState(false);
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(!profile.seenBudgetTemplatesIntro);

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
  const { template: activeTemplate, assignment: activeAssignment, lines, conceptSpend } = resolved;
  const lineByConcept = useMemo(() => new Map(lines.map((l) => [l.categoryId, l])), [lines]);

  const scopedBudgeted = (monthlyAmount: number) => (scope === 'week' ? monthlyAmount / WEEKS_PER_MONTH : monthlyAmount);

  const totalActualExpense = GROUPS.reduce(
    (sum, g) => sum + budgetConceptsByGroup(g).reduce((s2, c) => s2 + (conceptSpend[c.id] ?? 0), 0),
    0
  );
  const budgetedExpenseTotal = GROUPS.reduce(
    (sum, g) => sum + budgetConceptsByGroup(g).reduce((s2, c) => s2 + scopedBudgeted(lineByConcept.get(c.id)?.budgeted ?? 0), 0),
    0
  );
  const remainingToSpend = Math.max(0, budgetedExpenseTotal - totalActualExpense);
  const expensePercentUsed = budgetedExpenseTotal > 0 ? Math.min(100, Math.round((totalActualExpense / budgetedExpenseTotal) * 100)) : 0;

  const oneTimeBudgets = useMemo(() => budgets.filter((b) => !!b.oneTimeDate), [budgets]);
  const isCurrentPeriod = viewingPeriodKey === makePeriodKey(scope, new Date());

  const goEditPeriod = () => {
    if (!activeTemplate) return;
    router.push({ pathname: '/budget-template/[id]', params: { id: activeTemplate.id, periodKey: viewingPeriodKey } });
  };

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

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.lg }}>
        {/* ---------- 1. Resumen del periodo actual (gráfica simple) ---------- */}
        <View style={[styles.card, { borderColor: colors.surfaceBorder, borderRadius: radius.lg, backgroundColor: colors.surfaceSolid }]}>
          <View style={styles.rowCenter}>
            <Pressable accessibilityLabel="Periodo anterior" onPress={() => setViewingPeriodKey((k) => shiftPeriodKey(k, -1))} style={styles.navBtn}>
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
            <Pressable accessibilityLabel="Periodo siguiente" onPress={() => setViewingPeriodKey((k) => shiftPeriodKey(k, 1))} style={styles.navBtn}>
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
                <Pressable accessibilityLabel="Volver al periodo actual" onPress={() => setViewingPeriodKey(makePeriodKey(scope, new Date()))} style={{ alignSelf: 'flex-start' }}>
                  <Text style={{ color: colors.accentFrom, fontWeight: '700' }}>Volver a hoy</Text>
                </Pressable>
              )}
            </View>
          )}

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
              accessibilityLabel="Editar este periodo"
              onPress={goEditPeriod}
              style={[styles.secondaryBtn, { borderColor: colors.surfaceBorder, borderRadius: radius.pill }]}
            >
              <Ionicons name="create-outline" size={15} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontWeight: '700', marginLeft: 6, fontSize: 13 }}>Editar este periodo</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Restante para gastar</Text>
            <Text style={[typography.display, { color: colors.textPrimary, marginTop: 2 }]}>
              {formatCurrency(remainingToSpend, profile.primaryCurrency)}
            </Text>
            {budgetedExpenseTotal > 0 ? (
              <>
                <View style={{ marginTop: spacing.sm }}>
                  <ProgressBar percent={expensePercentUsed} status={computeBudgetStatus(expensePercentUsed, profile.budgetThresholds)} />
                </View>
                <View style={[styles.rowBetween, { marginTop: 6 }]}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Has usado {formatCurrency(totalActualExpense, profile.primaryCurrency)} de {formatCurrency(budgetedExpenseTotal, profile.primaryCurrency)}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700' }]}>{expensePercentUsed}%</Text>
                </View>
              </>
            ) : (
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                Aún no defines tu presupuesto de gastos — toca &quot;Editar este periodo&quot; para empezar.
              </Text>
            )}
          </View>
        </View>

        {/* ---------- 2. Calendario ---------- */}
        <View style={[styles.card, { borderColor: colors.surfaceBorder, borderRadius: radius.lg, backgroundColor: colors.surfaceSolid, gap: spacing.sm }]}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Calendario</Text>

          <View style={[styles.scopeToggle, { borderColor: colors.surfaceBorder, borderRadius: radius.pill, alignSelf: 'flex-start' }]}>
            {(['week', 'month'] as Scope[]).map((s) => (
              <Pressable
                key={s}
                onPress={() => switchScope(s)}
                style={[styles.scopeBtn, { borderRadius: radius.pill, backgroundColor: scope === s ? colors.accentFrom : 'transparent' }]}
              >
                <Text style={{ color: scope === s ? '#FFFFFF' : colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
                  {s === 'week' ? 'Semanal' : 'Mensual'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[typography.micro, { color: colors.textTertiary }]}>
            Tocar un día asigna {scope === 'week' ? 'toda esa semana' : 'todo ese mes'} — o usa el botón de abajo para elegir con calma.
          </Text>

          <BudgetTemplateLegend templates={templates} />

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

          <Pressable
            accessibilityLabel="Asignar presupuesto a una fecha"
            onPress={() => setAssignFlowOpen(true)}
            style={[styles.assignBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}
          >
            <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', marginLeft: 6 }}>Asignar presupuesto a una fecha</Text>
          </Pressable>
        </View>

        {/* ---------- 3. Mis presupuestos ---------- */}
        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Mis presupuestos</Text>
          <BudgetTemplateList templates={templates} templateLines={templateLines} currency={profile.primaryCurrency} />
        </View>
      </ScrollView>

      {templateSheetOpen && (
        <BudgetTemplateSheet
          periodLabel={periodKeyLabel(viewingPeriodKey)}
          scope={scope}
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

      {assignFlowOpen && (
        <AssignBudgetFlow
          initialScope={scope}
          templates={templates}
          onAssign={(templateId, key) => {
            assignTemplateToPeriod(templateId, key);
            setViewingPeriodKey(key);
          }}
          onCreate={(name, color, kind, key) => {
            const id = addBudgetTemplate({ name, color, kind });
            assignTemplateToPeriod(id, key);
            setViewingPeriodKey(key);
          }}
          onDelete={(templateId) => deleteBudgetTemplate(templateId)}
          onClose={() => setAssignFlowOpen(false)}
        />
      )}

      {introOpen && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceSolid, borderRadius: radius.lg }]}>
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
  card: { borderWidth: 1, padding: 14 },
  navBtn: { padding: 6 },
  templateRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1 },
  templateActions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  assignBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 4 },
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

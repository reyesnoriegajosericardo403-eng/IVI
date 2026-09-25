import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AssignBudgetFlow } from '@/components/AssignBudgetFlow';
import { BudgetCalendar, BudgetTemplateLegend } from '@/components/BudgetCalendar';
import { BudgetProgressChart, type BudgetProgressItem } from '@/components/BudgetProgressChart';
import { BudgetTemplateList } from '@/components/BudgetTemplateList';
import { BudgetTemplateSheet } from '@/components/BudgetTemplateSheet';
import { GlassCard } from '@/components/GlassCard';
import { MonthBudgetBreakdown } from '@/components/MonthBudgetBreakdown';
import { findBudgetConcept, findIncomeConcept, parseSubBudgetId } from '@/data/budgetConcepts';
import type { BudgetTemplate, BudgetTemplateKind } from '@/data/types';
import {
  selectActiveBudgetAssignments,
  selectActiveBudgets,
  selectActiveBudgetTemplates,
  selectActivePeriodOverrides,
  selectActiveTemplateBudgetLines,
  selectActiveTransactions,
} from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { surfaceShadow } from '@/theme/surfaceStyle';
import { useTheme } from '@/theme/ThemeProvider';
import { isEndingSoon, makePeriodKey, parsePeriodKey, periodKeyLabel, shiftPeriodKey } from '@/utils/budgetPeriods';
import { buildMonthGrid, parseISODate, toISODate } from '@/utils/date';
import { resolveBudgetForPeriod, resolveTemplateForPeriod } from '@/utils/finance';

type Scope = 'month' | 'week';

// Pantalla de inicio de Presupuesto — reducida a 3 bloques (spec: "cuando
// entre lo único que quiero ver es una simple gráfica... el calendario
// bonito y minimalista... y una lista de mis presupuestos solo con el
// encabezado de su nombre"). La edición de montos vive en
// app/budget-template/[id].tsx.
export default function Presupuesto() {
  const { colors, typography, spacing, radius, surface } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const rawBudgets = useAppStore((s) => s.budgets);
  const rawTemplates = useAppStore((s) => s.budgetTemplates);
  const rawTemplateLines = useAppStore((s) => s.templateBudgetLines);
  const rawAssignments = useAppStore((s) => s.budgetAssignments);
  const rawOverrides = useAppStore((s) => s.periodBudgetOverrides);
  const rawTransactions = useAppStore((s) => s.transactions);
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
  const templates = useMemo(() => selectActiveBudgetTemplates(rawTemplates), [rawTemplates]);
  const templateLines = useMemo(() => selectActiveTemplateBudgetLines(rawTemplateLines), [rawTemplateLines]);
  const assignments = useMemo(() => selectActiveBudgetAssignments(rawAssignments), [rawAssignments]);
  const overrides = useMemo(() => selectActivePeriodOverrides(rawOverrides), [rawOverrides]);
  const transactions = useMemo(() => selectActiveTransactions(rawTransactions), [rawTransactions]);

  const [scope, setScope] = useState<Scope>('month');
  const [viewingPeriodKey, setViewingPeriodKey] = useState(() => makePeriodKey('month', new Date()));
  const [calendarMonthIso, setCalendarMonthIso] = useState(() => new Date().toISOString().slice(0, 10));
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [assignFlowOpen, setAssignFlowOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(!profile.seenBudgetTemplatesIntro);

  // Arrastrar una ficha de "Mis presupuestos" hasta el calendario (spec:
  // "el usuario arrastra una ficha... la suelta sobre un día"). El estado
  // vive aquí, no en BudgetTemplateList ni en BudgetCalendar, porque la
  // ficha flotante y la vista previa deben pintarse por encima de ambos.
  const [gridLayout, setGridLayout] = useState<{ pageX: number; pageY: number; width: number; height: number; rows: number } | null>(
    null
  );
  const [dragTemplate, setDragTemplate] = useState<BudgetTemplate | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [previewDates, setPreviewDates] = useState<Set<string>>(new Set());
  const [dragTargetKey, setDragTargetKey] = useState<string | null>(null);
  const [dragMessage, setDragMessage] = useState<string | null>(null);

  const switchScope = (next: Scope) => {
    setScope(next);
    setViewingPeriodKey(makePeriodKey(next, new Date()));
  };

  const activeAssignment = useMemo(
    () => resolveTemplateForPeriod(viewingPeriodKey, templates, assignments).assignment,
    [viewingPeriodKey, templates, assignments]
  );

  // Presupuestado vs. gastado real, por categoría, del periodo que se
  // está viendo — la versión "a detalle" de la misma gráfica que ya
  // aparece resumida por grupo en Inicio (spec: "esta función debe estar
  // también en la parte de presupuestos pero más a detalle").
  const budgetProgressItems = useMemo<BudgetProgressItem[]>(() => {
    const resolved = resolveBudgetForPeriod({
      periodKey: viewingPeriodKey,
      templates,
      templateLines,
      assignments,
      overrides,
      transactions,
      thresholds: profile.budgetThresholds,
    });
    const budgetedItems = resolved.lines
      .filter((l) => !findIncomeConcept(l.categoryId) && l.budgeted > 0)
      .map((l) => ({ id: l.budgetId, label: l.categoryName, budgeted: l.budgeted, actual: l.actual }));

    // Conceptos que SÍ tuvieron gasto real pero que no tienen ninguna
    // ficha de presupuesto (ni de concepto ni de subcategoría) — spec:
    // "los gastos que no se presupuestaron pero también se incurrieron en
    // el periodo también aparezcan en el gráfico, eso sí son muy
    // representativos". BudgetProgressChart se encarga de recortar a las
    // más representativas (tope de 4 + "Otros").
    const covered = new Set<string>();
    resolved.lines.forEach((l) => {
      if (findIncomeConcept(l.categoryId)) return;
      const sub = parseSubBudgetId(l.categoryId);
      covered.add(sub ? sub.conceptId : l.categoryId);
    });
    const unbudgetedItems: BudgetProgressItem[] = Object.entries(resolved.conceptSpend)
      .filter(([conceptId, actual]) => actual > 0 && !covered.has(conceptId) && !findIncomeConcept(conceptId))
      .map(([conceptId, actual]) => ({
        id: `sin-plan:${conceptId}`,
        label: findBudgetConcept(conceptId)?.name ?? conceptId,
        budgeted: 0,
        actual,
      }));

    return [...budgetedItems, ...unbudgetedItems];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingPeriodKey, templates, templateLines, assignments, overrides, transactions]);

  const oneTimeBudgets = useMemo(() => budgets.filter((b) => !!b.oneTimeDate), [budgets]);
  const isCurrentPeriod = viewingPeriodKey === makePeriodKey(scope, new Date());

  // "Repetir presupuesto anterior": solo cuando el periodo REAL de hoy
  // está por terminar y el periodo pasado tenía un presupuesto con
  // nombre que el siguiente todavía no tiene (spec: "cuando el
  // presupuesto del mes esté acabando").
  const realCurrentKey = makePeriodKey(scope, new Date());
  const prevKey = shiftPeriodKey(realCurrentKey, -1);
  const prevTemplate = resolveTemplateForPeriod(prevKey, templates, assignments).template;
  const currentRealTemplate = resolveTemplateForPeriod(realCurrentKey, templates, assignments).template;
  const showRepeatPrevious =
    isEndingSoon(realCurrentKey) && !!prevTemplate && !prevTemplate.isDefault && currentRealTemplate?.id !== prevTemplate.id;

  const handleRepeatPrevious = () => {
    if (!prevTemplate) return;
    assignTemplateToPeriod(prevTemplate.id, shiftPeriodKey(realCurrentKey, 1));
  };

  // Mientras se arrastra: de la posición del dedo/cursor + el tamaño de la
  // cuadrícula del calendario, calcula sobre qué celda está y resalta TODAS
  // las fechas que ocuparía la ficha soltada ahí — el mes completo, la
  // semana de esa celda, o solo ese día, según el `kind` de la ficha.
  useEffect(() => {
    if (!dragTemplate || !dragPos || !gridLayout) {
      setPreviewDates(new Set());
      setDragTargetKey(null);
      return;
    }
    const { pageX, pageY, width, height, rows } = gridLayout;
    const relX = dragPos.x - pageX;
    const relY = dragPos.y - pageY;
    if (relX < 0 || relY < 0 || relX >= width || relY >= height) {
      setPreviewDates(new Set());
      setDragTargetKey(null);
      return;
    }
    const col = Math.min(6, Math.floor((relX / width) * 7));
    const row = Math.min(rows - 1, Math.floor((relY / height) * rows));
    const weeks = buildMonthGrid(calendarMonthIso);
    const cell = weeks[row]?.[col];
    if (!cell) {
      setPreviewDates(new Set());
      setDragTargetKey(null);
      return;
    }
    const key = makePeriodKey(dragTemplate.kind, parseISODate(cell.iso));
    const parsed = parsePeriodKey(key);
    if (!parsed) {
      setPreviewDates(new Set());
      setDragTargetKey(null);
      return;
    }
    const dates = new Set<string>();
    for (let d = new Date(parsed.start); d.getTime() <= parsed.end.getTime(); d.setDate(d.getDate() + 1)) {
      dates.add(toISODate(d));
    }
    setPreviewDates(dates);
    setDragTargetKey(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragTemplate, dragPos, gridLayout, calendarMonthIso]);

  const handleDragStart = (template: BudgetTemplate) => {
    setDragTemplate(template);
    setDragMessage(null);
  };

  const handleDragMove = (pageX: number, pageY: number) => {
    setDragPos({ x: pageX, y: pageY });
  };

  const handleDragEnd = () => {
    if (dragTemplate && dragTargetKey) {
      assignTemplateToPeriod(dragTemplate.id, dragTargetKey);
      setDragMessage(`Presupuesto "${dragTemplate.name}" asignado a ${periodKeyLabel(dragTargetKey)}`);
    }
    setDragTemplate(null);
    setDragPos(null);
    setPreviewDates(new Set());
    setDragTargetKey(null);
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
        {/* ---------- Calendario (incluye nav de periodo) ---------- */}
        <GlassCard style={{ gap: spacing.sm }}>
          <View style={styles.rowCenter}>
            <Pressable accessibilityLabel="Periodo anterior" onPress={() => setViewingPeriodKey((k) => shiftPeriodKey(k, -1))} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[typography.headline, { color: colors.textPrimary }]}>{periodKeyLabel(viewingPeriodKey)}</Text>
              {!isCurrentPeriod && (
                <Pressable accessibilityLabel="Volver al periodo actual" onPress={() => setViewingPeriodKey(makePeriodKey(scope, new Date()))}>
                  <Text style={{ color: colors.accentFrom, fontWeight: '700', fontSize: 13 }}>Volver a hoy</Text>
                </Pressable>
              )}
            </View>
            <Pressable accessibilityLabel="Ver resumen del mes" onPress={() => setSummaryOpen(true)} style={styles.navBtn}>
              <Ionicons name="bar-chart-outline" size={18} color={colors.accentFrom} />
            </Pressable>
            <Pressable accessibilityLabel="Periodo siguiente" onPress={() => setViewingPeriodKey((k) => shiftPeriodKey(k, 1))} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

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

          {showRepeatPrevious && prevTemplate && (
            <Pressable
              accessibilityLabel={`Repetir presupuesto de ${prevTemplate.name} para el próximo periodo`}
              onPress={handleRepeatPrevious}
              style={[styles.secondaryBtn, { borderColor: colors.accentFrom, borderRadius: radius.pill, alignSelf: 'flex-start' }]}
            >
              <Ionicons name="repeat-outline" size={15} color={colors.accentFrom} />
              <Text style={{ color: colors.accentFrom, fontWeight: '700', marginLeft: 6, fontSize: 13 }}>
                Repetir presupuesto de &quot;{prevTemplate.name}&quot; para el próximo periodo
              </Text>
            </Pressable>
          )}

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
            previewDates={previewDates}
            previewColor={dragTemplate?.color}
            onGridLayout={setGridLayout}
          />

          <Pressable
            accessibilityLabel="Asignar presupuesto a una fecha"
            onPress={() => setAssignFlowOpen(true)}
            style={[styles.assignBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}
          >
            <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', marginLeft: 6 }}>Asignar presupuesto a una fecha</Text>
          </Pressable>
        </GlassCard>

        {/* ---------- Presupuestado vs. gastado real, por categoría ---------- */}
        {budgetProgressItems.length > 0 && (
          <GlassCard style={{ gap: spacing.sm }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Cómo van tus gastos</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {periodKeyLabel(viewingPeriodKey)} — presupuestado contra lo que ya gastaste, por categoría.
            </Text>
            <BudgetProgressChart items={budgetProgressItems} currency={profile.primaryCurrency} />
          </GlassCard>
        )}

        {/* ---------- 3. Mis presupuestos ---------- */}
        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Mis presupuestos</Text>
          <BudgetTemplateList
            templates={templates}
            templateLines={templateLines}
            currency={profile.primaryCurrency}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          />
        </View>
      </ScrollView>

      {/* Ficha flotante mientras se arrastra — sigue el dedo/cursor por
          encima del calendario, que vive en otra sección de esta misma
          pantalla. */}
      {dragTemplate && dragPos && (
        <View
          pointerEvents="none"
          style={[
            styles.dragGhost,
            { left: dragPos.x - 90, top: dragPos.y - 24, backgroundColor: dragTemplate.color, borderRadius: radius.pill },
          ]}
        >
          <Ionicons name="reorder-two-outline" size={14} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontWeight: '700', marginLeft: 6, fontSize: 13 }} numberOfLines={1}>
            {dragTemplate.name}
          </Text>
        </View>
      )}

      {/* Anuncio para lectores de pantalla del resultado del arrastre —
          la vía accesible sin mouse/touch es el botón "Asignar presupuesto
          a una fecha" (flujo guiado), operable por completo con teclado. */}
      {dragMessage && (
        <Text accessibilityLiveRegion="polite" style={styles.srOnly}>
          {dragMessage}
        </Text>
      )}

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
          templates={templates}
          onAssign={(templateId, key) => {
            assignTemplateToPeriod(templateId, key);
            setViewingPeriodKey(key);
          }}
          onDelete={(templateId) => deleteBudgetTemplate(templateId)}
          onClose={() => setAssignFlowOpen(false)}
        />
      )}

      {summaryOpen && (
        <MonthBudgetBreakdown
          monthIso={calendarMonthIso}
          templates={templates}
          assignments={assignments}
          templateLines={templateLines}
          currency={profile.primaryCurrency}
          onClose={() => setSummaryOpen(false)}
        />
      )}

      {introOpen && (
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surfaceSolid, borderColor: colors.surfaceBorder, borderWidth: surface.borderWidth, borderRadius: radius.lg },
              surfaceShadow(surface),
            ]}
          >
            <Ionicons name="calendar-number-outline" size={30} color={colors.accentFrom} />
            <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.sm }]}>Nuevo: presupuestos con nombre</Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              Ahora puedes armar varios presupuestos para situaciones distintas — uno para tus días de clases o
              trabajo, otro para vacaciones, y hasta eventos de un solo día — y aplicarlos a las semanas o meses
              que quieras desde el calendario.
            </Text>
            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.sm }]}>
              También puedes moverte a periodos pasados o futuros con las flechas del calendario.
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
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  scopeToggle: { flexDirection: 'row', borderWidth: 1, padding: 3, alignSelf: 'flex-start' },
  scopeBtn: { paddingHorizontal: 18, paddingVertical: 8 },
  navBtn: { padding: 6 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
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
  dragGhost: {
    position: 'absolute',
    width: 180,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});

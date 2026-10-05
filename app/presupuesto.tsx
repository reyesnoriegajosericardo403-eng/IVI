import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HelpButton } from '@/components/HelpButton';
import { BudgetActionPanel } from '@/components/BudgetActionPanel';
import { BudgetCalendar, BudgetTemplateLegend } from '@/components/BudgetCalendar';
import { BudgetChipRow } from '@/components/BudgetChipRow';
import { BudgetProgressChart, type BudgetProgressItem } from '@/components/BudgetProgressChart';
import { BudgetTemplateList } from '@/components/BudgetTemplateList';
import { templateIcon } from '@/components/budgetTemplateMeta';
import { GlassCard } from '@/components/GlassCard';
import { MonthBudgetBreakdown } from '@/components/MonthBudgetBreakdown';
import { TemplateMetaForm } from '@/components/TemplateMetaForm';
import { findBudgetConcept, findIncomeConcept, parseSubBudgetId } from '@/data/budgetConcepts';
import type { BudgetAssignment, BudgetTemplate } from '@/data/types';
import { useBreakpoint } from '@/hooks/useBreakpoint';
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
import { isoDatesBetween, makePeriodKey, makeRangeKey, parsePeriodKey, periodKeyLabel, rangeLabel } from '@/utils/budgetPeriods';
import { buildMonthGrid, daysInMonth, parseISODate, toISODate } from '@/utils/date';
import { resolveBudgetForPeriod, findOverlappingAssignments, resolveTemplateBudgetInRange, upcomingAssignments } from '@/utils/finance';

function monthStartIso(monthIso: string): string {
  const d = parseISODate(monthIso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}
function monthEndIso(monthIso: string): string {
  const d = parseISODate(monthIso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), daysInMonth(d)));
}

// Pantalla de Presupuesto — rediseño según especificación v2 "Plan de
// gastos" + imagen de referencia: el calendario es el área principal, con
// los presupuestos disponibles como chips justo encima, y un panel de
// acción a la derecha (columna en tablet/escritorio, debajo en móvil) que
// siempre muestra presupuesto elegido, planeado/gastado y el botón de
// confirmar. Elegir fechas es tocar el día de inicio y el día de fin en el
// calendario — el rango se previsualiza con borde discontinuo
// ("pendiente de guardar") hasta que se confirma.
export default function Presupuesto() {
  const { colors, typography, spacing, radius } = useTheme();
  const { isTablet } = useBreakpoint();
  const profile = useAppStore((s) => s.profile);
  const rawTemplates = useAppStore((s) => s.budgetTemplates);
  const rawTemplateLines = useAppStore((s) => s.templateBudgetLines);
  const rawAssignments = useAppStore((s) => s.budgetAssignments);
  const rawOverrides = useAppStore((s) => s.periodBudgetOverrides);
  const rawBudgets = useAppStore((s) => s.budgets);
  const rawTransactions = useAppStore((s) => s.transactions);
  const ensureDefaultBudgetTemplate = useAppStore((s) => s.ensureDefaultBudgetTemplate);
  const addBudgetTemplate = useAppStore((s) => s.addBudgetTemplate);
  const deleteBudgetTemplate = useAppStore((s) => s.deleteBudgetTemplate);
  const assignTemplateToRange = useAppStore((s) => s.assignTemplateToRange);

  useEffect(() => {
    ensureDefaultBudgetTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allTemplates = useMemo(() => selectActiveBudgetTemplates(rawTemplates), [rawTemplates]);
  const templates = useMemo(() => allTemplates.filter((t) => !t.isDefault), [allTemplates]);
  const templateLines = useMemo(() => selectActiveTemplateBudgetLines(rawTemplateLines), [rawTemplateLines]);
  const assignments = useMemo(() => selectActiveBudgetAssignments(rawAssignments), [rawAssignments]);
  const overrides = useMemo(() => selectActivePeriodOverrides(rawOverrides), [rawOverrides]);
  const budgets = useMemo(() => selectActiveBudgets(rawBudgets), [rawBudgets]);
  const transactions = useMemo(() => selectActiveTransactions(rawTransactions), [rawTransactions]);
  const oneTimeBudgets = useMemo(() => budgets.filter((b) => !!b.oneTimeDate), [budgets]);

  const [calendarMonthIso, setCalendarMonthIso] = useState(() => toISODate(new Date()));
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [pendingEnd, setPendingEnd] = useState<string | null>(null);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [conflicts, setConflicts] = useState<{ assignment: BudgetAssignment; template: BudgetTemplate | undefined }[] | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [announce, setAnnounce] = useState<string | null>(null);

  // Arrastrar una ficha desde "Mis presupuestos" sigue asignando su
  // periodo natural completo (día/semana/mes) — el flujo nuevo de tocar
  // inicio/fin convive con esto, no lo reemplaza.
  const [gridLayout, setGridLayout] = useState<{ pageX: number; pageY: number; width: number; height: number; rows: number } | null>(null);
  const [dragTemplate, setDragTemplate] = useState<BudgetTemplate | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [previewDates, setPreviewDates] = useState<Set<string>>(new Set());
  const [dragTargetKey, setDragTargetKey] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTemplateId && templates.length > 0) setSelectedTemplateId(templates[0].id);
    if (selectedTemplateId && !templates.some((t) => t.id === selectedTemplateId)) {
      setSelectedTemplateId(templates[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates.length]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;
  const pendingDates = useMemo(
    () => (pendingStart && pendingEnd ? new Set(isoDatesBetween(pendingStart, pendingEnd)) : new Set<string>()),
    [pendingStart, pendingEnd]
  );

  const monthStart = monthStartIso(calendarMonthIso);
  const monthEnd = monthEndIso(calendarMonthIso);

  // Resumen del panel de acción: si hay un rango pendiente, previsualiza
  // exactamente lo que aplicaría al confirmarlo; si no, muestra lo que la
  // plantilla elegida ya tiene asignado en el mes que se está viendo.
  const panelSummary = useMemo(() => {
    if (!selectedTemplate) return { planned: 0, actual: 0, categoryBreakdown: [] as ReturnType<typeof resolveTemplateBudgetInRange>['categoryBreakdown'] };
    const ownAssignments = assignments.filter((a) => a.templateId === selectedTemplate.id);
    if (pendingStart && pendingEnd) {
      const synthetic: BudgetAssignment = {
        id: '__pending__',
        templateId: selectedTemplate.id,
        periodKey: makeRangeKey(pendingStart, pendingEnd),
        startDate: pendingStart,
        endDate: pendingEnd,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return resolveTemplateBudgetInRange({
        template: selectedTemplate,
        templateLines,
        assignments: [...ownAssignments, synthetic],
        startIso: pendingStart,
        endIso: pendingEnd,
        transactions,
      });
    }
    return resolveTemplateBudgetInRange({
      template: selectedTemplate,
      templateLines,
      assignments: ownAssignments,
      startIso: monthStart,
      endIso: monthEnd,
      transactions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate, assignments, templateLines, transactions, pendingStart, pendingEnd, monthStart, monthEnd]);

  const upcoming = useMemo(
    () => upcomingAssignments(toISODate(new Date()), assignments, allTemplates, templateLines, 4),
    [assignments, allTemplates, templateLines]
  );

  // "Cómo van tus gastos" — la gráfica general del mes que se está viendo,
  // igual que antes (mezcla lo que gane cada día, cualquier plantilla).
  const monthPeriodKey = makePeriodKey('month', parseISODate(calendarMonthIso));
  const budgetProgressItems = useMemo<BudgetProgressItem[]>(() => {
    const resolved = resolveBudgetForPeriod({
      periodKey: monthPeriodKey,
      templates: allTemplates,
      templateLines,
      assignments,
      overrides,
      transactions,
      thresholds: profile.budgetThresholds,
    });
    const budgetedItems = resolved.lines
      .filter((l) => !findIncomeConcept(l.categoryId) && l.budgeted > 0)
      .map((l) => ({ id: l.budgetId, label: l.categoryName, budgeted: l.budgeted, actual: l.actual }));
    const covered = new Set<string>();
    resolved.lines.forEach((l) => {
      if (findIncomeConcept(l.categoryId)) return;
      const sub = parseSubBudgetId(l.categoryId);
      covered.add(sub ? sub.conceptId : l.categoryId);
    });
    const unbudgetedItems: BudgetProgressItem[] = Object.entries(resolved.conceptSpend)
      .filter(([conceptId, actual]) => actual > 0 && !covered.has(conceptId) && !findIncomeConcept(conceptId))
      .map(([conceptId, actual]) => ({ id: `sin-plan:${conceptId}`, label: findBudgetConcept(conceptId)?.name ?? conceptId, budgeted: 0, actual }));
    return [...budgetedItems, ...unbudgetedItems];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthPeriodKey, allTemplates, templateLines, assignments, overrides, transactions]);

  // ---- Selección de rango por toques (spec: "tocar dos fechas o los
  // campos Desde y Hasta") ----
  const handleDayPress = (iso: string) => {
    if (!selectedTemplateId) return;
    if (!pendingStart) {
      setPendingStart(iso);
      setPendingEnd(iso);
    } else {
      setPendingEnd(iso);
    }
  };
  const cancelSelection = () => {
    setPendingStart(null);
    setPendingEnd(null);
  };

  const handleConfirm = () => {
    if (!selectedTemplate || !pendingStart || !pendingEnd) return;
    const [start, end] = pendingStart <= pendingEnd ? [pendingStart, pendingEnd] : [pendingEnd, pendingStart];
    const overlaps = findOverlappingAssignments(start, end, assignments, allTemplates);
    if (overlaps.length > 0 && !conflicts) {
      setConflicts(overlaps);
      return;
    }
    assignTemplateToRange(selectedTemplate.id, start, end);
    setAnnounce(`"${selectedTemplate.name}" asignado del ${rangeLabel(start, end)}`);
    setConflicts(null);
    setPendingStart(null);
    setPendingEnd(null);
  };

  // ---- Arrastrar ficha de "Mis presupuestos" (sin cambios de fondo) ----
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
    setPreviewDates(new Set(isoDatesBetween(toISODate(parsed.start), toISODate(parsed.end))));
    setDragTargetKey(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragTemplate, dragPos, gridLayout, calendarMonthIso]);

  const handleDragEnd = () => {
    if (dragTemplate && dragTargetKey && previewDates.size > 0) {
      const sorted = Array.from(previewDates).sort();
      const start = sorted[0];
      const end = sorted[sorted.length - 1];
      assignTemplateToRange(dragTemplate.id, start, end);
      setAnnounce(`"${dragTemplate.name}" asignado del ${rangeLabel(start, end)}`);
    }
    setDragTemplate(null);
    setDragPos(null);
    setPreviewDates(new Set());
    setDragTargetKey(null);
  };

  const handleDeleteTemplate = (id: string) => {
    deleteBudgetTemplate(id);
    if (selectedTemplateId === id) setSelectedTemplateId(null);
  };

  const rangePillLabel = pendingStart && pendingEnd ? rangeLabel(pendingStart, pendingEnd) : 'Toca un día para empezar';
  const pendingDayCount = pendingStart && pendingEnd ? isoDatesBetween(pendingStart, pendingEnd).length : 0;

  const calendarBlock = (
    <GlassCard style={{ gap: spacing.sm }}>
      <View style={styles.rangeRow}>
        <Pressable
          accessibilityLabel={pendingStart ? 'Cancelar selección de fechas' : 'Sin selección todavía'}
          onPress={cancelSelection}
          disabled={!pendingStart}
          style={[styles.rangePill, { borderColor: colors.surfaceBorder, borderRadius: radius.pill }]}
        >
          <Ionicons name="calendar-outline" size={15} color={colors.textSecondary} />
          <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '600', marginLeft: 6 }]}>{rangePillLabel}</Text>
          {pendingStart && <Ionicons name="close" size={14} color={colors.textTertiary} style={{ marginLeft: 6 }} />}
        </Pressable>
        <Pressable accessibilityLabel="Ver resumen del mes" onPress={() => setSummaryOpen(true)} style={styles.navBtn}>
          <Ionicons name="bar-chart-outline" size={18} color={colors.accentFrom} />
        </Pressable>
      </View>

      <BudgetTemplateLegend templates={templates} />

      <BudgetCalendar
        monthIso={calendarMonthIso}
        onChangeMonth={setCalendarMonthIso}
        templates={allTemplates}
        assignments={assignments}
        oneTimeBudgets={oneTimeBudgets}
        pendingDates={pendingDates}
        pendingIcon={selectedTemplate ? templateIcon(selectedTemplate) : undefined}
        pendingColor={selectedTemplate?.color ?? colors.accentFrom}
        onDayPress={handleDayPress}
        previewDates={previewDates}
        previewColor={dragTemplate?.color}
        previewIcon={dragTemplate ? templateIcon(dragTemplate) : undefined}
        onGridLayout={setGridLayout}
      />
    </GlassCard>
  );

  const panelBlock = (
    <BudgetActionPanel
      template={selectedTemplate}
      planned={panelSummary.planned}
      actual={panelSummary.actual}
      currency={profile.primaryCurrency}
      thresholds={profile.budgetThresholds}
      upcoming={upcoming}
      categoryBreakdown={panelSummary.categoryBreakdown}
      pendingDays={pendingDayCount}
      canConfirm={!!selectedTemplate && !!pendingStart && !!pendingEnd}
      confirmLabel={selectedTemplate && pendingDayCount > 0 ? `Asignar ${selectedTemplate.name} · ${pendingDayCount} día${pendingDayCount === 1 ? '' : 's'}` : 'Elige un rango de fechas'}
      onConfirm={handleConfirm}
      onOpenTemplate={() => selectedTemplate && router.push(`/budget-template/${selectedTemplate.id}`)}
      onDeleteTemplate={() => selectedTemplate && handleDeleteTemplate(selectedTemplate.id)}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.title, { color: colors.textPrimary, flex: 1 }]}>Plan de gastos</Text>
        <View style={{ marginLeft: 6 }}><HelpButton topic="presupuesto" /></View>
        <Pressable accessibilityLabel="Ajustes" onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <BudgetChipRow
          templates={templates}
          selectedId={selectedTemplateId}
          onSelect={(id) => {
            setSelectedTemplateId(id);
            cancelSelection();
          }}
          onNew={() => setNewTemplateOpen(true)}
          onDelete={handleDeleteTemplate}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.lg }}>
        {isTablet ? (
          <View style={styles.twoColumn}>
            <View style={{ flex: 1.6 }}>{calendarBlock}</View>
            <View style={{ flex: 1, minWidth: 300 }}>{panelBlock}</View>
          </View>
        ) : (
          <View style={{ gap: spacing.lg }}>
            {calendarBlock}
            {panelBlock}
          </View>
        )}

        {budgetProgressItems.length > 0 && (
          <GlassCard style={{ gap: spacing.sm }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Cómo van tus gastos</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {periodKeyLabel(monthPeriodKey)} — presupuestado contra lo que ya gastaste, por categoría.
            </Text>
            <BudgetProgressChart items={budgetProgressItems} currency={profile.primaryCurrency} />
          </GlassCard>
        )}

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Mis presupuestos</Text>
          <BudgetTemplateList
            templates={allTemplates}
            templateLines={templateLines}
            currency={profile.primaryCurrency}
            onDragStart={setDragTemplate}
            onDragMove={(x, y) => setDragPos({ x, y })}
            onDragEnd={handleDragEnd}
          />
        </View>
      </ScrollView>

      {dragTemplate && dragPos && (
        <View pointerEvents="none" style={[styles.dragGhost, { left: dragPos.x - 90, top: dragPos.y - 24, backgroundColor: dragTemplate.color, borderRadius: radius.pill }]}>
          <Ionicons name="reorder-two-outline" size={14} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontWeight: '700', marginLeft: 6, fontSize: 13 }} numberOfLines={1}>
            {dragTemplate.name}
          </Text>
        </View>
      )}

      {announce && (
        <Text accessibilityLiveRegion="polite" style={styles.srOnly}>
          {announce}
        </Text>
      )}

      {newTemplateOpen && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceSolid, borderColor: colors.surfaceBorder, borderWidth: 1, borderRadius: radius.lg }]}>
            <Text style={[typography.headline, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Nuevo presupuesto</Text>
            <TemplateMetaForm
              onSave={(name, color, kind, icon) => {
                const id = addBudgetTemplate({ name, color, kind, icon });
                setSelectedTemplateId(id);
                setNewTemplateOpen(false);
              }}
              onCancel={() => setNewTemplateOpen(false)}
            />
          </View>
        </View>
      )}

      {conflicts && conflicts.length > 0 && pendingStart && pendingEnd && selectedTemplate && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceSolid, borderColor: colors.surfaceBorder, borderWidth: 1, borderRadius: radius.lg }]}>
            <Ionicons name="alert-circle-outline" size={26} color={colors.warning} />
            <Text style={[typography.headline, { color: colors.textPrimary, marginTop: spacing.sm }]}>Estas fechas ya tienen presupuesto</Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              {conflicts.map((c) => c.template?.name ?? 'otro presupuesto').join(', ')} ya cubre parte de{' '}
              {rangeLabel(pendingStart, pendingEnd)}. Al confirmar, &quot;{selectedTemplate.name}&quot; será el que aplique esos días — el otro presupuesto
              sigue existiendo, solo deja de aplicar ahí.
            </Text>
            <View style={styles.conflictActions}>
              <Pressable onPress={() => setConflicts(null)}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Continuar y asignar de todos modos"
                onPress={handleConfirm}
                style={[styles.continueBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Continuar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {summaryOpen && (
        <MonthBudgetBreakdown
          monthIso={calendarMonthIso}
          templates={allTemplates}
          assignments={assignments}
          templateLines={templateLines}
          currency={profile.primaryCurrency}
          onClose={() => setSummaryOpen(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  twoColumn: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  rangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rangePill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  navBtn: { padding: 6 },
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
  modalCard: { width: '100%', maxWidth: 380, padding: 20 },
  conflictActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 18 },
  continueBtn: { paddingHorizontal: 20, paddingVertical: 10 },
});

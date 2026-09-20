import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { findBudgetConcept, findIncomeConcept, parseSubBudgetId, type BudgetGroupId } from '@/data/budgetConcepts';
import type { BudgetTemplate, BudgetTemplateKind, Currency, TemplateBudgetLine } from '@/data/types';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { WEEKS_PER_MONTH } from '@/utils/budgetCalculator';
import { formatCurrency } from '@/utils/format';

import { DonutChart } from './DonutChart';
import { KIND_LABELS } from './BudgetTemplateSheet';
import { TemplateMetaForm } from './TemplateMetaForm';

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

const DRAG_THRESHOLD = 12;

// Encabezado de una fila — toca para expandir, o mantén y arrastra hasta
// el calendario para asignarla (spec: "el usuario toca o hace clic sobre
// una ficha... la ficha debe seguir el dedo o el cursor"). El umbral de
// intención (>12px) es el mismo criterio que ya usa CalendarPicker para
// distinguir un toque de un gesto real. El chevron es un Pressable aparte
// para que siga siendo operable por teclado — arrastrar en sí no tiene
// equivalente de teclado; la vía accesible para asignar sin mouse/touch
// es el botón "Asignar presupuesto a una fecha" (flujo guiado) que ya
// existe en la pantalla de Presupuesto.
function TemplateDragHandle({
  template,
  isOpen,
  onToggleExpand,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  template: BudgetTemplate;
  isOpen: boolean;
  onToggleExpand: () => void;
  onDragStart?: (template: BudgetTemplate) => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: () => void;
}) {
  const { colors, typography, spacing } = useTheme();
  const draggingRef = useRef(false);

  // El PanResponder se crea UNA sola vez (useRef) para no perder la
  // referencia a mitad de un gesto, pero eso significa que sus callbacks
  // quedarían atados para siempre a los props del primer render — un bug
  // real, no solo de pruebas: onDragEnd veía por siempre dragTemplate/
  // dragTargetKey como null (los del montaje inicial) y la asignación
  // nunca se guardaba. Un ref "más reciente", actualizado en cada render,
  // resuelve esto sin recrear el PanResponder.
  const latest = useRef({ template, onToggleExpand, onDragStart, onDragMove, onDragEnd });
  latest.current = { template, onToggleExpand, onDragStart, onDragMove, onDragEnd };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > DRAG_THRESHOLD || Math.abs(gesture.dy) > DRAG_THRESHOLD,
      onPanResponderMove: (evt, gesture) => {
        if (!draggingRef.current && (Math.abs(gesture.dx) > DRAG_THRESHOLD || Math.abs(gesture.dy) > DRAG_THRESHOLD)) {
          draggingRef.current = true;
          latest.current.onDragStart?.(latest.current.template);
        }
        if (draggingRef.current) latest.current.onDragMove?.(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      },
      onPanResponderRelease: () => {
        if (draggingRef.current) {
          latest.current.onDragEnd?.();
          draggingRef.current = false;
        } else {
          latest.current.onToggleExpand();
        }
      },
      onPanResponderTerminate: () => {
        if (draggingRef.current) {
          latest.current.onDragEnd?.();
          draggingRef.current = false;
        }
      },
    })
  ).current;

  return (
    <View {...panResponder.panHandlers} style={styles.row}>
      <View style={[styles.colorDot, { backgroundColor: template.color }]} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>{template.name}</Text>
        <Text style={[typography.micro, { color: colors.textTertiary }]}>{KIND_LABELS[template.kind]}</Text>
      </View>
      <Pressable accessibilityLabel={`Mostrar/Ocultar ${template.name}`} onPress={onToggleExpand} hitSlop={8}>
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
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
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  templates: BudgetTemplate[];
  templateLines: TemplateBudgetLine[];
  currency: Currency;
  // Arrastrar una ficha hasta el calendario para asignarla (spec: "que el
  // usuario seleccione una ficha... la arrastre hacia un periodo del
  // calendario y la asigne"). El estado del arrastre vive en la pantalla
  // padre porque la ficha flotante debe pintarse por encima del
  // calendario, que está en otra sección de la misma pantalla.
  onDragStart?: (template: BudgetTemplate) => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const updateBudgetTemplate = useAppStore((s) => s.updateBudgetTemplate);
  const rescaleTemplateLines = useAppStore((s) => s.rescaleTemplateLines);
  const addBudgetTemplate = useAppStore((s) => s.addBudgetTemplate);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingMetaId, setEditingMetaId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const palette = [colors.accentFrom, colors.accentTo, colors.warning, colors.info, colors.success, colors.danger];

  const handleSaveMeta = (template: BudgetTemplate) => (name: string, color: string, kind: BudgetTemplateKind) => {
    // Semanal↔mensual re-escala los montos con la misma regla (×4 / ÷4)
    // que ya usa el resto de la app — nunca si de por medio hay un "Día"
    // (un evento con fecha propia, no una tasa recurrente que convertir).
    if (kind !== template.kind && template.kind !== 'day' && kind !== 'day') {
      rescaleTemplateLines(template.id, kind === 'month' ? WEEKS_PER_MONTH : 1 / WEEKS_PER_MONTH);
    }
    updateBudgetTemplate(template.id, { name, color, kind });
    setEditingMetaId(null);
  };

  const handleCreate = (name: string, color: string, kind: BudgetTemplateKind) => {
    addBudgetTemplate({ name, color, kind });
    setCreating(false);
  };

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
            <TemplateDragHandle
              template={t}
              isOpen={isOpen}
              onToggleExpand={() => setExpandedId(isOpen ? null : t.id)}
              onDragStart={onDragStart}
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
            />

            {isOpen && editingMetaId === t.id && (
              <View style={{ marginTop: spacing.md }}>
                <TemplateMetaForm
                  initial={{ name: t.name, color: t.color, kind: t.kind }}
                  lockKind={t.isDefault}
                  onSave={handleSaveMeta(t)}
                  onCancel={() => setEditingMetaId(null)}
                />
              </View>
            )}

            {isOpen && editingMetaId !== t.id && (
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
                <View style={styles.actionsRow}>
                  <Pressable
                    accessibilityLabel={`Editar montos de ${t.name}`}
                    onPress={() => router.push(`/budget-template/${t.id}`)}
                    style={[styles.editBtn, { borderColor: colors.accentFrom, borderRadius: radius.pill, flex: 1 }]}
                  >
                    <Ionicons name="create-outline" size={15} color={colors.accentFrom} />
                    <Text style={{ color: colors.accentFrom, fontWeight: '700', marginLeft: 6 }}>Editar montos</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Editar nombre, color o periodo de ${t.name}`}
                    onPress={() => setEditingMetaId(t.id)}
                    style={[styles.iconBtn, { borderColor: colors.surfaceBorder, borderRadius: radius.pill }]}
                  >
                    <Ionicons name="pencil-outline" size={15} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        );
      })}

      {creating ? (
        <TemplateMetaForm onSave={handleCreate} onCancel={() => setCreating(false)} />
      ) : (
        <Pressable
          accessibilityLabel="Crear presupuesto"
          onPress={() => setCreating(true)}
          style={[styles.createRow, { borderColor: colors.accentFrom, borderRadius: radius.lg }]}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.accentFrom} />
          <Text style={{ color: colors.accentFrom, fontWeight: '700', marginLeft: spacing.sm }}>Crear presupuesto</Text>
        </Pressable>
      )}
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
  actionsRow: { flexDirection: 'row', gap: 8 },
  iconBtn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, paddingHorizontal: 14 },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 14,
  },
});

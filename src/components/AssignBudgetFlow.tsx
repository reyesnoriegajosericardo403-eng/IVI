import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { BudgetTemplate, BudgetTemplateKind } from '@/data/types';
import { useAppStore } from '@/store/useAppStore';
import { surfaceBlur, surfaceShadow } from '@/theme/surfaceStyle';
import { useTheme } from '@/theme/ThemeProvider';
import { makePeriodKey, parsePeriodKey, periodKeyLabel, shiftPeriodKey } from '@/utils/budgetPeriods';
import { toISODate } from '@/utils/date';

import { CalendarPicker } from './CalendarPicker';
import { KIND_LABELS } from './BudgetTemplateSheet';
import { TemplateMetaForm } from './TemplateMetaForm';

function isoFromPeriodKey(key: string): string {
  const parsed = parsePeriodKey(key);
  return parsed ? toISODate(parsed.start) : toISODate(new Date());
}

interface ChosenTemplate {
  id: string;
  name: string;
  color: string;
  kind: BudgetTemplateKind;
}

// Otra forma de asignar un presupuesto a una fecha, más guiada que tocar
// directamente una celda del calendario — spec: "dame otra opción para
// asignar al calendario el tipo de presupuesto de mi elección para que sea
// más sencillo". Convive con tocar el calendario, no lo reemplaza.
//
// Primero QUÉ, luego CUÁNDO — no al revés: antes pedía elegir "mes, semana
// o día" y DESPUÉS el presupuesto, un paso de más que no aporta nada,
// porque cada presupuesto ya sabe su propio periodo (spec: "quiero que...
// sean más fáciles e intuitivas las funciones de asignar presupuestos a
// las fechas"). Al elegir un presupuesto semanal, el siguiente paso pide
// una semana directo — nunca hay que declarar el periodo dos veces.
export function AssignBudgetFlow({
  templates,
  onAssign,
  onDelete,
  onClose,
}: {
  templates: BudgetTemplate[];
  onAssign: (templateId: string, periodKey: string) => void;
  onDelete: (templateId: string) => void;
  onClose: () => void;
}) {
  const { colors, typography, spacing, radius, surface } = useTheme();
  const addBudgetTemplate = useAppStore((s) => s.addBudgetTemplate);
  const [step, setStep] = useState<'template' | 'date'>('template');
  const [creating, setCreating] = useState(false);
  const [chosen, setChosen] = useState<ChosenTemplate | null>(null);
  const [periodKey, setPeriodKey] = useState('');
  const [pickerMonthIso, setPickerMonthIso] = useState(() => toISODate(new Date()));

  // Los mismos presupuestos con nombre que ofrece BudgetTemplateSheet — el
  // de siempre no aplica aquí porque asignarlo a un periodo es, en los
  // hechos, quitar la asignación (ya existe esa vía en el calendario).
  const selectable = templates.filter((t) => !t.isDefault);

  const chooseTemplate = (t: ChosenTemplate) => {
    setChosen(t);
    setPeriodKey(makePeriodKey(t.kind, new Date()));
    setPickerMonthIso(toISODate(new Date()));
    setStep('date');
  };

  const handleCreate = (name: string, color: string, kind: BudgetTemplateKind) => {
    const id = addBudgetTemplate({ name, color, kind });
    setCreating(false);
    chooseTemplate({ id, name, color, kind });
  };

  const confirmDate = () => {
    if (!chosen) return;
    onAssign(chosen.id, periodKey);
    onClose();
  };

  return (
    <View style={styles.backdrop}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surfaceSolid, borderColor: colors.surfaceBorder, borderWidth: surface.borderWidth, borderRadius: radius.lg },
          surfaceShadow(surface),
          surfaceBlur(surface),
        ]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Asignar presupuesto a una fecha</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              {step === 'template' ? '1. Elige qué presupuesto quieres usar' : `2. ¿Cuándo aplica "${chosen?.name}"?`}
            </Text>
          </View>
          <Pressable accessibilityLabel="Cerrar" onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        {step === 'template' && !creating && (
          <ScrollView style={{ maxHeight: 340, marginTop: spacing.md }} contentContainerStyle={{ gap: spacing.sm }}>
            {selectable.map((t) => (
              <Pressable
                key={t.id}
                accessibilityLabel={`Usar ${t.name}`}
                onPress={() => chooseTemplate({ id: t.id, name: t.name, color: t.color, kind: t.kind })}
                style={[styles.row, { borderColor: colors.surfaceBorder, borderWidth: surface.borderWidth, borderRadius: radius.md }]}
              >
                <View style={[styles.colorDot, { backgroundColor: t.color }]} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>{t.name}</Text>
                  <Text style={[typography.micro, { color: colors.textTertiary }]}>{KIND_LABELS[t.kind]}</Text>
                </View>
                <Pressable accessibilityLabel={`Borrar ${t.name}`} onPress={() => onDelete(t.id)} hitSlop={8} style={{ marginRight: spacing.xs }}>
                  <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                </Pressable>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </Pressable>
            ))}

            {selectable.length === 0 && (
              <Text style={[typography.caption, { color: colors.textTertiary }]}>
                Todavía no tienes presupuestos con nombre — crea el primero abajo.
              </Text>
            )}

            <Pressable
              accessibilityLabel="Crear un presupuesto nuevo"
              onPress={() => setCreating(true)}
              style={[styles.row, { borderColor: colors.accentFrom, borderWidth: surface.borderWidth, borderRadius: radius.md }]}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.accentFrom} />
              <Text style={[typography.body, { color: colors.accentFrom, fontWeight: '700', marginLeft: spacing.sm }]}>
                Crear un presupuesto nuevo
              </Text>
            </Pressable>
          </ScrollView>
        )}

        {step === 'template' && creating && (
          <View style={{ marginTop: spacing.md }}>
            <TemplateMetaForm onSave={handleCreate} onCancel={() => setCreating(false)} />
          </View>
        )}

        {step === 'date' && chosen && chosen.kind !== 'day' && (
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Elige {chosen.kind === 'month' ? 'el mes' : 'la semana'}:
            </Text>
            <View style={styles.stepperRow}>
              <Pressable
                accessibilityLabel="Periodo anterior"
                onPress={() => setPeriodKey((k) => shiftPeriodKey(k, -1))}
                style={styles.navBtn}
              >
                <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
              </Pressable>
              <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>{periodKeyLabel(periodKey)}</Text>
              <Pressable
                accessibilityLabel="Periodo siguiente"
                onPress={() => setPeriodKey((k) => shiftPeriodKey(k, 1))}
                style={styles.navBtn}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.footerRow}>
              <Pressable onPress={() => setStep('template')}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Atrás</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Confirmar y asignar"
                onPress={confirmDate}
                style={[styles.continueBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Asignar</Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 'date' && chosen && chosen.kind === 'day' && (
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Elige el día:</Text>
            <CalendarPicker
              monthIso={pickerMonthIso}
              selectedIso={isoFromPeriodKey(periodKey)}
              onChangeMonth={setPickerMonthIso}
              onSelectDay={(iso) => setPeriodKey(makePeriodKey('day', new Date(`${iso}T00:00:00`)))}
            />
            <View style={styles.footerRow}>
              <Pressable onPress={() => setStep('template')}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Atrás</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Confirmar y asignar"
                onPress={confirmDate}
                style={[styles.continueBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Asignar</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
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
  card: { width: '100%', maxWidth: 380, padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  navBtn: { padding: 6 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  continueBtn: { paddingHorizontal: 20, paddingVertical: 10 },
});

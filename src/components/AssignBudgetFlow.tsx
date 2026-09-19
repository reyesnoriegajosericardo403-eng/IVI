import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BudgetTemplate, BudgetTemplateKind } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { makePeriodKey, parsePeriodKey, periodKeyLabel, shiftPeriodKey, type PeriodScope } from '@/utils/budgetPeriods';
import { toISODate } from '@/utils/date';

import { BudgetTemplateSheet } from './BudgetTemplateSheet';
import { CalendarPicker } from './CalendarPicker';

const SCOPE_OPTIONS: { value: PeriodScope; label: string }[] = [
  { value: 'month', label: 'Mes' },
  { value: 'week', label: 'Semana' },
  { value: 'day', label: 'Día' },
];

function isoFromPeriodKey(key: string): string {
  const parsed = parsePeriodKey(key);
  return parsed ? toISODate(parsed.start) : toISODate(new Date());
}

// Otra forma de asignar un presupuesto a una fecha, más guiada que tocar
// directamente una celda del calendario — spec: "dame otra opción para
// asignar al calendario el tipo de presupuesto de mi elección para que sea
// más sencillo". Convive con tocar el calendario, no lo reemplaza.
export function AssignBudgetFlow({
  initialScope,
  templates,
  onAssign,
  onCreate,
  onDelete,
  onClose,
}: {
  initialScope: PeriodScope;
  templates: BudgetTemplate[];
  onAssign: (templateId: string, periodKey: string) => void;
  onCreate: (name: string, color: string, kind: BudgetTemplateKind, periodKey: string) => void;
  onDelete: (templateId: string) => void;
  onClose: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [step, setStep] = useState<'scope' | 'date' | 'template'>('scope');
  const [scope, setScope] = useState<PeriodScope>(initialScope === 'day' ? 'month' : initialScope);
  const [periodKey, setPeriodKey] = useState(() => makePeriodKey(scope, new Date()));
  const [pickerMonthIso, setPickerMonthIso] = useState(() => toISODate(new Date()));

  const chooseScope = (s: PeriodScope) => {
    setScope(s);
    setPeriodKey(makePeriodKey(s === 'day' ? 'day' : s, new Date()));
    setStep('date');
  };

  if (step === 'template') {
    return (
      <BudgetTemplateSheet
        periodLabel={periodKeyLabel(periodKey)}
        scope={scope}
        templates={templates}
        currentTemplateId={undefined}
        onAssign={(templateId) => {
          onAssign(templateId, periodKey);
          onClose();
        }}
        onUnassign={onClose}
        onCreate={(name, color, kind) => {
          onCreate(name, color, kind, periodKey);
          onClose();
        }}
        onDelete={onDelete}
        onClose={onClose}
      />
    );
  }

  return (
    <View style={styles.backdrop}>
      <View style={[styles.card, { backgroundColor: colors.surfaceSolid, borderRadius: radius.lg }]}>
        <View style={styles.headerRow}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Asignar presupuesto a una fecha</Text>
          <Pressable accessibilityLabel="Cerrar" onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        {step === 'scope' && (
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>¿Qué quieres asignar?</Text>
            {SCOPE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                accessibilityLabel={opt.label}
                onPress={() => chooseScope(opt.value)}
                style={[styles.scopeRow, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
              >
                <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>{opt.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </Pressable>
            ))}
          </View>
        )}

        {step === 'date' && scope !== 'day' && (
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Elige {scope === 'month' ? 'el mes' : 'la semana'}:
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
              <Pressable onPress={() => setStep('scope')}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Atrás</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Continuar"
                onPress={() => setStep('template')}
                style={[styles.continueBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Continuar</Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 'date' && scope === 'day' && (
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Elige el día:</Text>
            <CalendarPicker
              monthIso={pickerMonthIso}
              selectedIso={isoFromPeriodKey(periodKey)}
              onChangeMonth={setPickerMonthIso}
              onSelectDay={(iso) => setPeriodKey(makePeriodKey('day', new Date(`${iso}T00:00:00`)))}
            />
            <View style={styles.footerRow}>
              <Pressable onPress={() => setStep('scope')}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Atrás</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Continuar"
                onPress={() => setStep('template')}
                style={[styles.continueBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Continuar</Text>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scopeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  navBtn: { padding: 6 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  continueBtn: { paddingHorizontal: 20, paddingVertical: 10 },
});

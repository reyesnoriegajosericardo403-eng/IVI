import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ACCOUNT_COLOR_SWATCHES } from '@/data/accountColors';
import type { BudgetTemplate, BudgetTemplateKind } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import type { PeriodScope } from '@/utils/budgetPeriods';

const KIND_LABELS: Record<BudgetTemplateKind, string> = {
  week: 'Semanal',
  month: 'Mensual',
  day: 'Día (evento único)',
};

// Hoja para elegir qué presupuesto se aplica en el periodo que se está
// viendo, crear uno nuevo, o quitar el que estaba (spec: "elegir en el
// calendario del presupuesto qué tipo de presupuesto usar").
export function BudgetTemplateSheet({
  periodLabel,
  scope,
  templates,
  currentTemplateId,
  onAssign,
  onUnassign,
  onCreate,
  onDelete,
  onClose,
}: {
  periodLabel: string;
  // Solo se ofrecen plantillas del mismo tipo que el periodo que se está
  // asignando — una plantilla semanal no tiene sentido en un mes.
  scope: PeriodScope;
  templates: BudgetTemplate[];
  currentTemplateId: string | undefined;
  onAssign: (templateId: string) => void;
  onUnassign: () => void;
  onCreate: (name: string, color: string, kind: BudgetTemplateKind) => void;
  onDelete: (templateId: string) => void;
  onClose: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(ACCOUNT_COLOR_SWATCHES[0]);

  const selectable = templates.filter((t) => t.kind === scope && !t.isDefault);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, color, scope as BudgetTemplateKind);
    setName('');
    setCreating(false);
  };

  return (
    <View style={styles.backdrop}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Presupuesto de este periodo</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{periodLabel}</Text>
          </View>
          <Pressable accessibilityLabel="Cerrar" onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.sm }}>
          <Pressable
            accessibilityLabel="Usar el presupuesto de siempre"
            onPress={onUnassign}
            style={[styles.row, { borderColor: !currentTemplateId ? colors.accentFrom : colors.surfaceBorder, borderRadius: radius.md }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>Mi presupuesto de siempre</Text>
              <Text style={[typography.micro, { color: colors.textTertiary }]}>El que usas cuando no eliges otro</Text>
            </View>
            {!currentTemplateId && <Ionicons name="checkmark-circle" size={20} color={colors.accentFrom} />}
          </Pressable>

          {selectable.map((t) => (
            <Pressable
              key={t.id}
              accessibilityLabel={`Usar ${t.name}`}
              onPress={() => onAssign(t.id)}
              style={[styles.row, { borderColor: currentTemplateId === t.id ? colors.accentFrom : colors.surfaceBorder, borderRadius: radius.md }]}
            >
              <View style={[styles.colorDot, { backgroundColor: t.color }]} />
              <Text style={[typography.body, { color: colors.textPrimary, flex: 1, marginLeft: spacing.sm }]}>{t.name}</Text>
              {currentTemplateId === t.id && <Ionicons name="checkmark-circle" size={20} color={colors.accentFrom} />}
              <Pressable accessibilityLabel={`Borrar ${t.name}`} onPress={() => onDelete(t.id)} style={{ marginLeft: spacing.sm }}>
                <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
              </Pressable>
            </Pressable>
          ))}

          {creating ? (
            <View style={[styles.createBox, { borderColor: colors.surfaceBorder, borderRadius: radius.md, gap: spacing.sm }]}>
              <TextInput
                autoFocus
                value={name}
                onChangeText={setName}
                placeholder={scope === 'day' ? 'Ej. Consulta con el oftalmólogo' : 'Ej. Vacaciones, Días de clases…'}
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.sm }]}
              />
              <Text style={[typography.micro, { color: colors.textTertiary }]}>Color en el calendario</Text>
              <View style={styles.swatchRow}>
                {ACCOUNT_COLOR_SWATCHES.map((c) => (
                  <Pressable
                    key={c}
                    accessibilityLabel={`Color ${c}`}
                    onPress={() => setColor(c)}
                    style={[styles.swatch, { backgroundColor: c, borderColor: color === c ? colors.textPrimary : 'transparent' }]}
                  />
                ))}
              </View>
              <View style={styles.createActions}>
                <Pressable onPress={() => setCreating(false)}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Guardar presupuesto nuevo"
                  onPress={handleCreate}
                  style={[styles.saveBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Crear</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityLabel="Crear un presupuesto nuevo"
              onPress={() => setCreating(true)}
              style={[styles.row, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.accentFrom} />
              <Text style={[typography.body, { color: colors.accentFrom, fontWeight: '700', marginLeft: spacing.sm }]}>
                Crear un presupuesto {KIND_LABELS[scope as BudgetTemplateKind].toLowerCase()}
              </Text>
            </Pressable>
          )}
        </ScrollView>
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
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  createBox: { borderWidth: 1, padding: 12 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 2 },
  createActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8 },
});

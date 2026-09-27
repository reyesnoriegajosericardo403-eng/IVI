import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ACCOUNT_COLOR_SWATCHES } from '@/data/accountColors';
import type { BudgetTemplateKind } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';

import { BUDGET_TEMPLATE_ICON_CHOICES, DEFAULT_TEMPLATE_ICON, KIND_LABELS } from './budgetTemplateMeta';

const EDITABLE_KINDS: BudgetTemplateKind[] = ['week', 'month', 'day'];

// Formulario para crear o editar nombre/ícono/color/periodo de una
// plantilla de presupuesto (spec: "al momento de crear el presupuesto
// debería estar la opción de elegir el periodo").
export function TemplateMetaForm({
  initial,
  lockKind = false,
  onSave,
  onCancel,
}: {
  initial?: { name: string; color: string; kind: BudgetTemplateKind; icon?: string };
  lockKind?: boolean;
  onSave: (name: string, color: string, kind: BudgetTemplateKind, icon: string) => void;
  onCancel: () => void;
}) {
  const { colors, typography, spacing, radius, surface } = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? ACCOUNT_COLOR_SWATCHES[0]);
  const [kind, setKind] = useState<BudgetTemplateKind>(initial?.kind ?? 'month');
  const [icon, setIcon] = useState(initial?.icon ?? DEFAULT_TEMPLATE_ICON[initial?.kind ?? 'month']);

  // Un presupuesto de tipo Día es un evento con fecha propia — no tiene
  // sentido convertirlo a semanal/mensual (ni viceversa), así que su
  // periodo queda fijo una vez creado.
  const kindLocked = lockKind || initial?.kind === 'day';

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, color, kind, icon);
  };

  return (
    <View style={[styles.box, { borderColor: colors.surfaceBorder, borderWidth: surface.borderWidth, borderRadius: radius.lg, backgroundColor: colors.surfaceSolid }]}>
      <TextInput
        autoFocus
        value={name}
        onChangeText={setName}
        placeholder="Ej. Vacaciones, Días de clases…"
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.sm }]}
      />

      {!kindLocked && (
        <View>
          <Text style={[typography.micro, { color: colors.textTertiary, marginBottom: 6 }]}>Periodo</Text>
          <View style={styles.kindRow}>
            {EDITABLE_KINDS.map((k) => (
              <Pressable
                key={k}
                accessibilityLabel={`Periodo ${KIND_LABELS[k]}`}
                onPress={() => setKind(k)}
                style={[
                  styles.kindChip,
                  {
                    borderRadius: radius.pill,
                    borderColor: kind === k ? colors.accentFrom : colors.surfaceBorder,
                    backgroundColor: kind === k ? colors.accentSoft : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: kind === k ? colors.accentFrom : colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                  {KIND_LABELS[k]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Text style={[typography.micro, { color: colors.textTertiary }]}>Ícono</Text>
      <View style={styles.swatchRow}>
        {BUDGET_TEMPLATE_ICON_CHOICES.map((name) => (
          <Pressable
            key={name}
            accessibilityLabel={`Ícono ${name}`}
            onPress={() => setIcon(name)}
            style={[
              styles.iconChoice,
              { borderRadius: radius.pill, borderColor: icon === name ? colors.accentFrom : colors.surfaceBorder, backgroundColor: icon === name ? colors.accentSoft : 'transparent' },
            ]}
          >
            <Ionicons name={name as any} size={17} color={icon === name ? colors.accentFrom : colors.textSecondary} />
          </Pressable>
        ))}
      </View>

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

      <View style={styles.actions}>
        <Pressable onPress={onCancel}>
          <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Guardar presupuesto"
          onPress={handleSave}
          style={[styles.saveBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Guardar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 14, gap: 10 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kindChip: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 2 },
  iconChoice: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8 },
});

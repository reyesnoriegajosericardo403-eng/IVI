import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function parseAmount(text: string): number {
  const n = parseFloat(text.replace(/[$,\s]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

export function Field({ label, style, ...props }: TextInputProps & { label?: string }) {
  const { colors, typography, radius } = useTheme();
  return (
    <View style={{ gap: 4, flex: (style as any)?.flex }}>
      {label && <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.textTertiary}
        {...props}
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
      />
    </View>
  );
}

export function ChipRow<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  const { colors, typography, radius } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      {label && <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={String(opt.value)}
              accessibilityLabel={opt.label}
              onPress={() => onChange(opt.value)}
              style={[
                styles.chip,
                {
                  borderRadius: radius.pill,
                  borderColor: active ? colors.accentFrom : colors.surfaceBorder,
                  backgroundColor: active ? colors.accentSoft : 'transparent',
                },
              ]}
            >
              <Text style={{ color: active ? colors.accentFrom : colors.textSecondary, fontWeight: '700', fontSize: 13 }}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function FormActions({ onCancel, onSave, canSave, saveLabel = 'Guardar' }: { onCancel: () => void; onSave: () => void; canSave: boolean; saveLabel?: string }) {
  const { colors, radius } = useTheme();
  return (
    <View style={styles.actions}>
      <Pressable accessibilityLabel="Cancelar" onPress={onCancel}>
        <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={saveLabel}
        disabled={!canSave}
        onPress={onSave}
        style={[styles.saveBtn, { backgroundColor: canSave ? colors.accentFrom : colors.surfaceBorder, borderRadius: radius.pill }]}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{saveLabel}</Text>
      </Pressable>
    </View>
  );
}

export function SummaryLine({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' | 'muted' }) {
  const { colors, typography } = useTheme();
  const color = tone === 'positive' ? colors.success : tone === 'negative' ? colors.danger : tone === 'muted' ? colors.textTertiary : colors.textPrimary;
  return (
    <View style={styles.summaryLine}>
      <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>{label}</Text>
      <Text style={[typography.caption, { color, fontWeight: '700', fontVariant: ['tabular-nums'] }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 18, marginTop: 4 },
  saveBtn: { paddingHorizontal: 22, paddingVertical: 11 },
  summaryLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

import React from 'react';
import { Text, TextInput, View } from 'react-native';

import { DateField } from '@/components/DateField';
import { useTheme } from '@/theme/ThemeProvider';
import { RECURRENCE_PRESETS, type RecurrenceEnd, type RecurrencePreset } from '@/utils/recurrencePresets';

import { ChipRow } from './Chips';

export interface RecurrenceFormState {
  preset: RecurrencePreset | null;
  startDate: string;
  end: RecurrenceEnd;
}

// Editor de "cada cuánto se repite": preset + primera fecha + cómo termina. Todo el armado/validación vive en
// utils/recurrencePresets (probado); aquí solo se pinta.
export function RecurrenceEditor({
  value,
  onChange,
  startLabel = 'PRIMERA FECHA',
}: {
  value: RecurrenceFormState;
  onChange: (next: RecurrenceFormState) => void;
  startLabel?: string;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const set = (patch: Partial<RecurrenceFormState>) => onChange({ ...value, ...patch });
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>SE REPITE</Text>
        <ChipRow options={RECURRENCE_PRESETS} value={value.preset} onChange={(preset) => set({ preset })} />
      </View>
      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{startLabel}</Text>
        <DateField value={value.startDate} onChange={(startDate) => set({ startDate })} />
      </View>
      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>TERMINA</Text>
        <ChipRow
          options={[
            { id: 'never', label: 'Nunca' },
            { id: 'until', label: 'En una fecha' },
            { id: 'count', label: 'Tras N veces' },
          ]}
          value={value.end.mode}
          onChange={(mode) => set({ end: { mode: mode as RecurrenceEnd['mode'], endDate: value.end.endDate, count: value.end.count } })}
        />
        {value.end.mode === 'until' && <DateField value={value.end.endDate ?? ''} onChange={(endDate) => set({ end: { ...value.end, endDate } })} placeholder="Última fecha" />}
        {value.end.mode === 'count' && (
          <TextInput
            keyboardType="number-pad"
            value={value.end.count ? String(value.end.count) : ''}
            onChangeText={(t) => {
              const n = parseInt(t.replace(/\D/g, ''), 10);
              set({ end: { ...value.end, count: Number.isFinite(n) ? Math.min(n, 5000) : undefined } });
            }}
            placeholder="¿Cuántas veces?"
            placeholderTextColor={colors.textTertiary}
            style={{ color: colors.textPrimary, borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 }}
          />
        )}
      </View>
    </View>
  );
}

import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface ChipOption<T extends string | number> {
  id: T;
  label: string;
}

// Fila de opciones tipo "píldora" (una sola elección, o varias con `multi`).
export function ChipRow<T extends string | number>({
  options,
  value,
  onChange,
  multi,
  wrap = true,
}: {
  options: Array<ChipOption<T>>;
  value: T | T[] | null;
  onChange: (next: T) => void;
  multi?: boolean;
  wrap?: boolean;
}) {
  const { colors, radius } = useTheme();
  const isOn = (id: T) => (multi ? Array.isArray(value) && value.includes(id) : value === id);
  const chips = options.map((o) => {
    const on = isOn(o.id);
    return (
      <Pressable
        key={String(o.id)}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={o.label}
        onPress={() => onChange(o.id)}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderWidth: 1,
          borderRadius: radius.pill,
          borderColor: on ? colors.accentFrom : colors.surfaceBorder,
          backgroundColor: on ? colors.accentSoft : colors.surfaceSolid,
        }}
      >
        <Text style={{ color: on ? colors.accentFrom : colors.textSecondary, fontSize: 13, fontWeight: '600' }}>{o.label}</Text>
      </Pressable>
    );
  });
  if (wrap) return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{chips}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {chips}
    </ScrollView>
  );
}

export function SmallButton({
  label,
  onPress,
  tone = 'neutral',
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'neutral' | 'danger';
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const { colors, radius } = useTheme();
  const bg = tone === 'primary' ? colors.accentFrom : 'transparent';
  const fg = tone === 'primary' ? '#FFFFFF' : tone === 'danger' ? colors.danger : colors.textSecondary;
  const border = tone === 'primary' ? colors.accentFrom : tone === 'danger' ? colors.danger : colors.surfaceBorder;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderWidth: 1,
        borderRadius: radius.pill,
        borderColor: border,
        backgroundColor: bg,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      <Text style={{ color: fg, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

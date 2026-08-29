import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CalendarPicker } from '@/components/CalendarPicker';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDateDMY, todayISO } from '@/utils/date';

interface DateFieldProps {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
}

// Campo de fecha que abre un calendario en vez de pedir que se escriba el
// texto a mano — siempre muestra DD-MM-AAAA (spec 40/41).
export function DateField({ value, onChange, placeholder = 'Selecciona una fecha' }: DateFieldProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const [monthIso, setMonthIso] = useState(value || todayISO());

  return (
    <View>
      <Pressable
        onPress={() => {
          setMonthIso(value || todayISO());
          setOpen((v) => !v);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <Ionicons name="calendar-outline" size={16} color={colors.textTertiary} />
        <Text style={[typography.body, { color: value ? colors.textPrimary : colors.textTertiary, marginLeft: spacing.sm }]}>
          {value ? formatDateDMY(value) : placeholder}
        </Text>
      </Pressable>

      {open && (
        <View style={{ marginTop: spacing.sm, borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: radius.md, padding: spacing.sm }}>
          <CalendarPicker
            monthIso={monthIso}
            selectedIso={value}
            onChangeMonth={setMonthIso}
            onSelectDay={(iso) => {
              onChange(iso);
              setOpen(false);
            }}
          />
        </View>
      )}
    </View>
  );
}

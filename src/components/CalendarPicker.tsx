import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { addMonths, buildMonthGrid, formatDateDMY, monthLabel, todayISO, WEEKDAY_LABELS } from '@/utils/date';

interface CalendarPickerProps {
  monthIso: string;
  selectedIso?: string;
  onSelectDay: (iso: string) => void;
  onChangeMonth: (iso: string) => void;
  markedIsoDates?: Set<string>;
}

// Calendario mensual sin dependencias externas — se desliza hacia arriba
// (mes siguiente) o hacia abajo (mes anterior), además de las flechas para
// quien prefiera tocar (spec: "calendario interactivo o dinámico que
// puedas cambiar deslizando hacia arriba y hacia abajo").
export function CalendarPicker({ monthIso, selectedIso, onSelectDay, onChangeMonth, markedIsoDates }: CalendarPickerProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const today = todayISO();
  const weeks = buildMonthGrid(monthIso);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 16 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -30) onChangeMonth(addMonths(monthIso, 1));
        else if (gesture.dy > 30) onChangeMonth(addMonths(monthIso, -1));
      },
    })
  ).current;

  return (
    <View>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Mes anterior" onPress={() => onChangeMonth(addMonths(monthIso, -1))} style={styles.navBtn}>
          <Ionicons name="chevron-up" size={18} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.headline, { color: colors.textPrimary }]}>{monthLabel(monthIso)}</Text>
        <Pressable accessibilityLabel="Mes siguiente" onPress={() => onChangeMonth(addMonths(monthIso, 1))} style={styles.navBtn}>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View {...panResponder.panHandlers}>
        <View style={styles.weekRow}>
          {WEEKDAY_LABELS.map((w) => (
            <View key={w} style={styles.cell}>
              <Text style={[typography.micro, { color: colors.textTertiary }]}>{w}</Text>
            </View>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((cell) => {
              const isSelected = cell.iso === selectedIso;
              const isToday = cell.iso === today;
              const hasMark = markedIsoDates?.has(cell.iso);
              return (
                <Pressable
                  key={cell.iso}
                  accessibilityLabel={`Día ${formatDateDMY(cell.iso)}`}
                  onPress={() => onSelectDay(cell.iso)}
                  style={styles.cell}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      { borderRadius: radius.pill },
                      isSelected && { backgroundColor: colors.accentFrom },
                      !isSelected && isToday && { borderWidth: 1, borderColor: colors.accentFrom },
                    ]}
                  >
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: isSelected ? '#FFFFFF' : cell.inMonth ? colors.textPrimary : colors.textTertiary,
                          fontWeight: isToday || isSelected ? '700' : '400',
                        },
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </View>
                  {hasMark && !isSelected && <View style={[styles.dot, { backgroundColor: colors.accentFrom }]} />}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <Text style={[typography.micro, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xs }]}>
        Desliza hacia arriba o abajo para cambiar de mes
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 },
  navBtn: { padding: 4 },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  dayCircle: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: 2 },
});

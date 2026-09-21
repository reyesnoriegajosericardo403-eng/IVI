import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { surfaceBlur, surfaceShadow } from '@/theme/surfaceStyle';
import { useTheme } from '@/theme/ThemeProvider';

import { GlassSheen } from './GlassSheen';

export type ChartKind = 'line' | 'bar';
export type ChartPeriod = 'day' | 'week' | 'month';

const PERIOD_LABELS: Record<ChartPeriod, string> = { day: 'Día', week: 'Semana', month: 'Mes' };

// Control chico y discreto para elegir tipo de gráfica (línea/barras) y
// temporalidad (día/semana/mes) — spec: "una pequeña, discreta, bonita y
// útil dropdown en todas las graficas". Vidrio, pero más ligero que una
// tarjeta completa (menos blur, sin sombra dura).
export function ChartOptionsDropdown({
  chartType,
  onChangeChartType,
  period,
  onChangePeriod,
}: {
  chartType: ChartKind;
  onChangeChartType: (kind: ChartKind) => void;
  period: ChartPeriod;
  onChangePeriod: (period: ChartPeriod) => void;
}) {
  const { colors, typography, radius, surface } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.anchor}>
      <Pressable
        accessibilityLabel="Cambiar tipo de gráfica o periodo"
        onPress={() => setOpen((v) => !v)}
        style={[
          styles.trigger,
          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderWidth: surface.borderWidth, borderRadius: radius.pill },
          surfaceBlur(surface),
        ]}
      >
        <Ionicons name={chartType === 'line' ? 'trending-up-outline' : 'bar-chart-outline'} size={13} color={colors.textSecondary} />
        <Text style={[typography.micro, { color: colors.textSecondary, marginLeft: 4, fontWeight: '600' }]}>
          {PERIOD_LABELS[period]}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={colors.textTertiary} style={{ marginLeft: 2 }} />
      </Pressable>

      {open && (
        <>
          <Pressable accessibilityLabel="Cerrar opciones de gráfica" onPress={() => setOpen(false)} style={styles.backdrop} />
          <View
            style={[
              styles.panel,
              { backgroundColor: colors.surfaceSolid, borderColor: colors.surfaceBorder, borderWidth: surface.borderWidth, borderRadius: radius.md },
              surfaceShadow(surface),
              surfaceBlur(surface),
            ]}
          >
            {surface.blur > 0 && <GlassSheen radius={radius.md} intensity={0.6} />}
            <Text style={[typography.micro, { color: colors.textTertiary, marginBottom: 6 }]}>TIPO DE GRÁFICA</Text>
            <View style={styles.chipRow}>
              {(['line', 'bar'] as ChartKind[]).map((kind) => (
                <Pressable
                  key={kind}
                  accessibilityLabel={kind === 'line' ? 'Gráfica de línea' : 'Gráfica de barras'}
                  onPress={() => onChangeChartType(kind)}
                  style={[
                    styles.chip,
                    {
                      borderRadius: radius.pill,
                      borderColor: chartType === kind ? colors.accentFrom : colors.surfaceBorder,
                      backgroundColor: chartType === kind ? colors.accentSoft : 'transparent',
                    },
                  ]}
                >
                  <Ionicons
                    name={kind === 'line' ? 'trending-up-outline' : 'bar-chart-outline'}
                    size={14}
                    color={chartType === kind ? colors.accentFrom : colors.textSecondary}
                  />
                  <Text style={{ color: chartType === kind ? colors.accentFrom : colors.textSecondary, fontWeight: '600', fontSize: 12, marginLeft: 4 }}>
                    {kind === 'line' ? 'Línea' : 'Barras'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[typography.micro, { color: colors.textTertiary, marginTop: 10, marginBottom: 6 }]}>TEMPORALIDAD</Text>
            <View style={styles.chipRow}>
              {(['day', 'week', 'month'] as ChartPeriod[]).map((p) => (
                <Pressable
                  key={p}
                  accessibilityLabel={`Ver por ${PERIOD_LABELS[p].toLowerCase()}`}
                  onPress={() => onChangePeriod(p)}
                  style={[
                    styles.chip,
                    {
                      borderRadius: radius.pill,
                      borderColor: period === p ? colors.accentFrom : colors.surfaceBorder,
                      backgroundColor: period === p ? colors.accentSoft : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ color: period === p ? colors.accentFrom : colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                    {PERIOD_LABELS[p]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'relative' },
  trigger: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5 },
  backdrop: { position: 'absolute', top: -800, left: -800, width: 1800, height: 1800, zIndex: 40 },
  panel: { position: 'absolute', top: 32, right: 0, width: 200, padding: 12, overflow: 'hidden', zIndex: 50 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
});

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { BudgetTemplate, Currency } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { computeBudgetStatus, type UpcomingAssignmentSummary } from '@/utils/finance';
import { formatCurrency } from '@/utils/format';
import { rangeLabel } from '@/utils/budgetPeriods';

import { ProgressBar } from './ProgressBar';
import { KIND_LABELS, templateIcon } from './budgetTemplateMeta';

interface CategoryRow {
  categoryId: string;
  categoryName: string;
  planned: number;
  actual: number;
}

// Panel de acción a la derecha del calendario (imagen de referencia):
// presupuesto elegido, planeado/gastado, repetición, próximas semanas,
// detalle de gastos, y el botón de confirmar SIEMPRE visible al fondo
// (spec: "siempre visibles: presupuesto elegido... resumen de cambio...
// botón Asignar presupuesto").
export function BudgetActionPanel({
  template,
  planned,
  actual,
  currency,
  thresholds,
  upcoming,
  categoryBreakdown,
  pendingDays,
  canConfirm,
  confirmLabel,
  onConfirm,
  onOpenTemplate,
  onDeleteTemplate,
}: {
  template: BudgetTemplate | null;
  planned: number;
  actual: number;
  currency: Currency;
  thresholds: { attention: number; warning: number; exceeded: number };
  upcoming: UpcomingAssignmentSummary[];
  categoryBreakdown: CategoryRow[];
  pendingDays: number;
  canConfirm: boolean;
  confirmLabel: string;
  onConfirm: () => void;
  onOpenTemplate: () => void;
  onDeleteTemplate: () => void;
}) {
  const { colors, typography, spacing, radius, surface } = useTheme();
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [upcomingOpen, setUpcomingOpen] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);

  const percent = planned > 0 ? Math.round((actual / planned) * 100) : 0;
  const status = computeBudgetStatus(percent, thresholds);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.md }} showsVerticalScrollIndicator={false}>
        {template ? (
          <View style={[styles.card, { borderColor: colors.surfaceBorder, borderWidth: surface.borderWidth, borderRadius: radius.lg, backgroundColor: colors.surfaceSolid }]}>
            <View style={styles.headerRow}>
              <View style={[styles.iconBadge, { backgroundColor: template.color, borderRadius: radius.md }]}>
                <Ionicons name={templateIcon(template) as any} size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={[typography.headline, { color: colors.textPrimary }]}>{template.name}</Text>
                <Text style={[typography.caption, { color: colors.textTertiary }]}>{KIND_LABELS[template.kind]}</Text>
              </View>
              <Pressable accessibilityLabel={`Editar ${template.name}`} onPress={onOpenTemplate} hitSlop={8} style={{ padding: 4 }}>
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={[styles.statRow, { marginTop: spacing.md }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.micro, { color: colors.textTertiary }]}>Planeado</Text>
                <Text style={[typography.title, { color: colors.textPrimary }]}>{formatCurrency(planned, currency)}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={[typography.micro, { color: colors.textTertiary }]}>Gastado</Text>
                <Text style={[typography.title, { color: colors.textPrimary }]}>{formatCurrency(actual, currency)}</Text>
              </View>
            </View>

            <View style={{ marginTop: spacing.sm, gap: 6 }}>
              <ProgressBar percent={percent} status={status} />
              <View style={styles.statRow}>
                <Text style={[typography.micro, { color: colors.textSecondary }]}>
                  {planned > 0 ? `${percent}% del presupuesto` : 'Sin presupuesto definido'}
                </Text>
                <Text style={[typography.micro, { color: colors.textTertiary }]}>{formatCurrency(planned, currency)}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.card, { borderColor: colors.surfaceBorder, borderWidth: surface.borderWidth, borderRadius: radius.lg, backgroundColor: colors.surfaceSolid }]}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>Elige un presupuesto arriba para asignarlo a una fecha.</Text>
          </View>
        )}

        {template && (
          <CollapsibleRow
            icon="repeat-outline"
            title="Repetición"
            subtitle="Solo una vez"
            open={repeatOpen}
            onToggle={() => setRepeatOpen((v) => !v)}
          >
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Por ahora cada asignación cubre solo el rango de fechas que elijas. Repetir automáticamente cada
              semana o mes está en camino.
            </Text>
          </CollapsibleRow>
        )}

        {upcoming.length > 0 && (
          <CollapsibleRow icon="calendar-outline" title="Próximas semanas" open={upcomingOpen} onToggle={() => setUpcomingOpen((v) => !v)}>
            <View style={{ gap: spacing.xs }}>
              {upcoming.map((u) => (
                <View key={u.assignment.id} style={styles.upcomingRow}>
                  <Text style={[typography.caption, { color: colors.textTertiary, width: 92 }]}>
                    {rangeLabel(u.range.start.toISOString().slice(0, 10), u.range.end.toISOString().slice(0, 10))}
                  </Text>
                  <View style={[styles.iconBadgeSm, { backgroundColor: u.template.color }]}>
                    <Ionicons name={templateIcon(u.template) as any} size={11} color="#FFFFFF" />
                  </View>
                  <Text style={[typography.caption, { color: colors.textPrimary, flex: 1, marginLeft: 6, fontWeight: '600' }]} numberOfLines={1}>
                    {u.template.name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{formatCurrency(u.plannedExpense, currency)}</Text>
                </View>
              ))}
            </View>
          </CollapsibleRow>
        )}

        {categoryBreakdown.length > 0 && (
          <CollapsibleRow icon="list-outline" title="Detalle de gastos" open={detailOpen} onToggle={() => setDetailOpen((v) => !v)}>
            <View style={{ gap: 6 }}>
              {categoryBreakdown.slice(0, 8).map((c) => (
                <View key={c.categoryId} style={styles.upcomingRow}>
                  <Text style={[typography.caption, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                    {c.categoryName}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textTertiary }]}>
                    {c.planned > 0 ? `${formatCurrency(c.planned, currency)} plan · ` : 'Sin plan · '}
                    {formatCurrency(c.actual, currency)} real
                  </Text>
                </View>
              ))}
            </View>
          </CollapsibleRow>
        )}

        {template && !template.isDefault && (
          <Pressable accessibilityLabel={`Borrar ${template.name}`} onPress={onDeleteTemplate} style={styles.deleteRow}>
            <Ionicons name="trash-outline" size={14} color={colors.danger} />
            <Text style={{ color: colors.danger, fontWeight: '600', marginLeft: 6, fontSize: 13 }}>Borrar este presupuesto</Text>
          </Pressable>
        )}
      </ScrollView>

      <Pressable
        accessibilityLabel={confirmLabel}
        disabled={!canConfirm}
        onPress={onConfirm}
        style={[styles.confirmBtn, { borderRadius: radius.pill, backgroundColor: canConfirm ? colors.accentFrom : colors.surfaceBorder }]}
      >
        <Text style={{ color: canConfirm ? '#FFFFFF' : colors.textTertiary, fontWeight: '700' }}>{confirmLabel}</Text>
      </Pressable>
    </View>
  );
}

function CollapsibleRow({
  icon,
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { colors, typography, spacing, radius, surface } = useTheme();
  return (
    <View style={[styles.card, { borderColor: colors.surfaceBorder, borderWidth: surface.borderWidth, borderRadius: radius.lg, backgroundColor: colors.surfaceSolid }]}>
      <Pressable accessibilityLabel={`${open ? 'Ocultar' : 'Mostrar'} ${title}`} onPress={onToggle} style={styles.headerRow}>
        <Ionicons name={icon} size={17} color={colors.textSecondary} />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>{title}</Text>
          {subtitle && !open && <Text style={[typography.micro, { color: colors.textTertiary }]}>{subtitle}</Text>}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
      </Pressable>
      {open && <View style={{ marginTop: spacing.sm }}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  iconBadge: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  iconBadgeSm: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  confirmBtn: { paddingVertical: 15, alignItems: 'center', marginTop: 10 },
});

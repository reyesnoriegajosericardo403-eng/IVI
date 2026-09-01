import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { conceptExampleText, type BudgetConcept } from '@/data/budgetConcepts';
import type { Account, Currency } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDateDMY } from '@/utils/date';
import type { BudgetLine, BudgetStatus } from '@/utils/finance';
import { formatCurrency } from '@/utils/format';

import { CategoryIcon } from './CategoryIcon';
import { WEEKDAY_FULL_LABELS } from './ConceptBudgetForm';
import { GlassCard } from './GlassCard';
import { ProgressBar } from './ProgressBar';

const STATUS_LABEL: Record<BudgetStatus, string> = {
  normal: 'Normal',
  attention: 'Atención',
  warning: 'Advertencia',
  exceeded: 'Excedido',
};

// Renglón editable de un concepto de GASTO (Presupuesto y el onboarding
// comparten este mismo componente — lo que se anota aquí es el mismo
// presupuesto en los dos lados, spec: "esos datos se queden como su
// presupuesto ya definido").
export function ConceptRow({
  concept,
  line,
  scope,
  scopedBudgeted,
  actualNoBudget,
  currency,
  accounts,
  onEdit,
  onDelete,
}: {
  concept: BudgetConcept;
  line: BudgetLine | undefined;
  scope: 'month' | 'week';
  scopedBudgeted: (monthlyAmount: number) => number;
  actualNoBudget: number;
  currency: Currency;
  accounts?: Account[];
  onEdit: () => void;
  onDelete: (budgetId: string) => void;
}) {
  const includedNames = (line?.includedAccountIds ?? [])
    .map((id) => accounts?.find((a) => a.id === id)?.name)
    .filter((name): name is string => !!name);
  const exampleText = conceptExampleText(concept);
  const { colors, typography, spacing } = useTheme();
  const budgeted = line ? scopedBudgeted(line.budgeted) : 0;
  const percentUsed = line && budgeted > 0 ? Math.round((actualNoBudget / budgeted) * 100) : 0;

  return (
    <GlassCard style={{ gap: spacing.sm }}>
      <View style={styles.rowBetween}>
        <View style={[styles.rowCenter, { flex: 1 }]}>
          <CategoryIcon categoryId={concept.icon} size={16} />
          <View style={{ marginLeft: spacing.sm, flex: 1 }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>{concept.name}</Text>
            {!!exampleText && (
              <Text style={[typography.micro, { color: colors.textTertiary }]} numberOfLines={1}>
                Ej: {exampleText}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.rowCenter}>
          <Pressable accessibilityLabel={`Editar ${concept.name}`} onPress={onEdit} style={{ marginRight: line ? spacing.sm : 0 }}>
            <Ionicons name={line ? 'pencil-outline' : 'add-circle-outline'} size={18} color={line ? colors.textTertiary : colors.accentFrom} />
          </Pressable>
          {line && (
            <Pressable accessibilityLabel={`Eliminar presupuesto de ${concept.name}`} onPress={() => onDelete(line.budgetId)}>
              <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {line ? (
        <>
          <ProgressBar percent={percentUsed} status={line.status} />
          <View style={styles.rowBetween}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {formatCurrency(actualNoBudget, currency)} de {formatCurrency(budgeted, currency)}
              {scope === 'week' ? ' esta semana' : ' este mes'}
            </Text>
            <Text
              style={[
                typography.caption,
                {
                  fontWeight: '700',
                  color: line.status === 'exceeded' || line.status === 'warning' ? colors.danger : line.status === 'attention' ? colors.warning : colors.success,
                },
              ]}
            >
              {percentUsed}% · {STATUS_LABEL[line.status]}
            </Text>
          </View>
          {!!line.dayOfMonth && (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Se cobra el día {line.dayOfMonth} de cada mes.</Text>
          )}
          {line.dayOfWeek !== undefined && (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Se cobra cada {WEEKDAY_FULL_LABELS[line.dayOfWeek]}.</Text>
          )}
          {!!line.oneTimeDate && (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Ocurre el {formatDateDMY(line.oneTimeDate)}.</Text>
          )}
          {includedNames.length > 0 && (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Pagas con: {includedNames.join(', ')}</Text>
          )}
        </>
      ) : (
        <Text style={[typography.caption, { color: colors.textTertiary }]}>
          {actualNoBudget > 0
            ? `Ya llevas ${formatCurrency(actualNoBudget, currency)} sin presupuesto — toca + para definir uno.`
            : 'Sin presupuesto — toca + para definir uno.'}
        </Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
});

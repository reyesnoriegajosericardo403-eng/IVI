import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { conceptExampleText, type IncomeConcept } from '@/data/budgetConcepts';
import type { Account, Currency } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import type { BudgetLine } from '@/utils/finance';
import { formatCurrency } from '@/utils/format';

import { CategoryIcon } from './CategoryIcon';
import { WEEKDAY_FULL_LABELS } from './ConceptBudgetForm';
import { GlassCard } from './GlassCard';
import { ProgressBar } from './ProgressBar';

// Igual que ConceptRow pero con semántica de ingreso: llegar o pasar el
// monto esperado es bueno (verde), no una alarma — nunca se usa el rojo
// de "excedido" aquí, porque ganar más de lo esperado no es un problema.
export function IncomeConceptRow({
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
  concept: IncomeConcept;
  line: BudgetLine | undefined;
  scope: 'month' | 'week';
  scopedBudgeted: (monthlyAmount: number) => number;
  actualNoBudget: number;
  currency: Currency;
  accounts?: Account[];
  onEdit: () => void;
  onDelete: (budgetId: string) => void;
}) {
  const targetAccount = line?.targetAccountId ? accounts?.find((a) => a.id === line.targetAccountId) : undefined;
  const exampleText = conceptExampleText(concept);
  const { colors, typography, spacing } = useTheme();
  const budgeted = line ? scopedBudgeted(line.budgeted) : 0;
  const percentUsed = line && budgeted > 0 ? Math.round((actualNoBudget / budgeted) * 100) : 0;
  const met = percentUsed >= 100;

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
            <Pressable accessibilityLabel={`Eliminar esperado de ${concept.name}`} onPress={() => onDelete(line.budgetId)}>
              <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {line ? (
        <>
          <ProgressBar percent={Math.min(percentUsed, 100)} status={met ? 'normal' : 'attention'} />
          <View style={styles.rowBetween}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {formatCurrency(actualNoBudget, currency)} de {formatCurrency(budgeted, currency)} esperados
              {scope === 'week' ? ' esta semana' : ' este mes'}
            </Text>
            <Text style={[typography.caption, { fontWeight: '700', color: met ? colors.success : colors.warning }]}>{percentUsed}%</Text>
          </View>
          {!!line.dayOfMonth && (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              Normalmente te llega el día {line.dayOfMonth} de cada mes.
            </Text>
          )}
          {line.dayOfWeek !== undefined && (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              Normalmente te llega cada {WEEKDAY_FULL_LABELS[line.dayOfWeek]}.
            </Text>
          )}
          {!!targetAccount && (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>→ Entra a {targetAccount.name}</Text>
          )}
        </>
      ) : (
        <Text style={[typography.caption, { color: colors.textTertiary }]}>
          {actualNoBudget > 0
            ? `Ya llevas ${formatCurrency(actualNoBudget, currency)} sin un monto esperado — toca + para definirlo.`
            : 'Sin monto esperado — toca + para definirlo.'}
        </Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
});

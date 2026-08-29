import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/CategoryIcon';
import { GlassCard } from '@/components/GlassCard';
import { ProgressBar } from '@/components/ProgressBar';
import { DEFAULT_CATEGORIES } from '@/data/categories';
import { selectActiveBudgets, selectActiveTransactions } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { buildBudgetLines, spendByCategory, type BudgetStatus } from '@/utils/finance';
import { formatCurrency } from '@/utils/format';

const STATUS_LABEL: Record<BudgetStatus, string> = {
  normal: 'Normal',
  attention: 'Atención',
  warning: 'Advertencia',
  exceeded: 'Excedido',
};

const EXPENSE_CATEGORY_IDS = DEFAULT_CATEGORIES.filter((c) => c.id !== 'income').map((c) => c.id);

export default function Presupuesto() {
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const rawBudgets = useAppStore((s) => s.budgets);
  const rawTransactions = useAppStore((s) => s.transactions);
  const setBudget = useAppStore((s) => s.setBudget);
  const deleteBudget = useAppStore((s) => s.deleteBudget);

  const budgets = useMemo(() => selectActiveBudgets(rawBudgets), [rawBudgets]);
  const transactions = useMemo(() => selectActiveTransactions(rawTransactions), [rawTransactions]);

  const lines = buildBudgetLines(budgets, transactions, profile.budgetThresholds);
  const lineByCategory = new Map(lines.map((l) => [l.categoryId, l]));
  const spendNoBudget = spendByCategory(transactions);

  // Texto que el usuario está escribiendo por categoría, antes de guardar.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const totalBudgeted = lines.reduce((s, l) => s + l.budgeted, 0);
  const totalActual = lines.reduce((s, l) => s + l.actual, 0);

  const handleSave = (categoryId: string) => {
    const raw = drafts[categoryId];
    if (raw === undefined) return;
    const value = parseFloat(raw.replace(',', '.'));
    if (Number.isNaN(value) || value <= 0) return;
    setBudget({
      categoryId,
      monthlyAmount: value,
      currency: profile.primaryCurrency,
      thresholds: profile.budgetThresholds,
    });
    setDrafts((d) => {
      const next = { ...d };
      delete next[categoryId];
      return next;
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>Presupuesto</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {totalBudgeted > 0
              ? `${formatCurrency(totalActual, profile.primaryCurrency)} de ${formatCurrency(totalBudgeted, profile.primaryCurrency)} este mes`
              : 'Define cuánto planeas gastar por categoría'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.md }}>
        {EXPENSE_CATEGORY_IDS.map((categoryId) => {
          const category = DEFAULT_CATEGORIES.find((c) => c.id === categoryId)!;
          const line = lineByCategory.get(categoryId);
          const draft = drafts[categoryId];
          const hasDraftChange = draft !== undefined && draft !== '';
          const actualNoBudget = spendNoBudget[categoryId] ?? 0;

          return (
            <GlassCard key={categoryId} style={{ gap: spacing.sm }}>
              <View style={styles.rowBetween}>
                <View style={styles.rowCenter}>
                  <CategoryIcon categoryId={categoryId} size={16} />
                  <Text style={[typography.headline, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
                    {category.name}
                  </Text>
                </View>
                {line && (
                  <Pressable onPress={() => deleteBudget(line.budgetId)}>
                    <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                  </Pressable>
                )}
              </View>

              {line ? (
                <>
                  <ProgressBar percent={line.percentUsed} status={line.status} />
                  <View style={styles.rowBetween}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {formatCurrency(line.actual, profile.primaryCurrency)} de {formatCurrency(line.budgeted, profile.primaryCurrency)}
                    </Text>
                    <Text
                      style={[
                        typography.caption,
                        {
                          fontWeight: '700',
                          color:
                            line.status === 'exceeded' || line.status === 'warning'
                              ? colors.danger
                              : line.status === 'attention'
                                ? colors.warning
                                : colors.success,
                        },
                      ]}
                    >
                      {line.percentUsed}% · {STATUS_LABEL[line.status]}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.rowGap}>
                  <TextInput
                    value={draft ?? ''}
                    onChangeText={(v) => setDrafts((d) => ({ ...d, [categoryId]: v }))}
                    keyboardType="decimal-pad"
                    placeholder={actualNoBudget > 0 ? `Ya llevas ${formatCurrency(actualNoBudget, profile.primaryCurrency)}` : 'Monto mensual'}
                    placeholderTextColor={colors.textTertiary}
                    onSubmitEditing={() => handleSave(categoryId)}
                    style={[
                      styles.input,
                      { flex: 1, color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md },
                    ]}
                  />
                  <Pressable
                    onPress={() => handleSave(categoryId)}
                    disabled={!hasDraftChange}
                    style={[
                      styles.saveBtn,
                      { borderRadius: radius.md, backgroundColor: hasDraftChange ? colors.accentFrom : colors.surfaceBorder },
                    ]}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
              )}
            </GlassCard>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowGap: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  saveBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});

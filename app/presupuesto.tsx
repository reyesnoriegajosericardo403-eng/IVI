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
import { buildBudgetLines, type BudgetStatus } from '@/utils/finance';
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

  const [showForm, setShowForm] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');

  const budgets = useMemo(() => selectActiveBudgets(rawBudgets), [rawBudgets]);
  const transactions = useMemo(() => selectActiveTransactions(rawTransactions), [rawTransactions]);

  const lines = buildBudgetLines(budgets, transactions, profile.budgetThresholds);
  const availableCategories = EXPENSE_CATEGORY_IDS.filter((id) => !budgets.some((b) => b.categoryId === id));

  const handleAdd = () => {
    if (!categoryId || !amount) return;
    const value = parseFloat(amount.replace(',', '.'));
    if (Number.isNaN(value) || value <= 0) return;
    setBudget({
      categoryId,
      monthlyAmount: value,
      currency: profile.primaryCurrency,
      thresholds: profile.budgetThresholds,
    });
    setShowForm(false);
    setCategoryId(null);
    setAmount('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>Presupuesto</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Este mes</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.md }}>
        {lines.length === 0 && !showForm && (
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            Aún no has definido presupuesto por categoría. Agrega el primero.
          </Text>
        )}

        {lines.map((line) => (
          <GlassCard key={line.categoryId} style={{ gap: spacing.sm }}>
            <View style={styles.rowBetween}>
              <View style={styles.rowCenter}>
                <CategoryIcon categoryId={line.categoryId} size={16} />
                <Text style={[typography.headline, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
                  {line.categoryName}
                </Text>
              </View>
              <Pressable onPress={() => deleteBudget(line.budgetId)}>
                <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
              </Pressable>
            </View>
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
          </GlassCard>
        ))}

        {showForm ? (
          <GlassCard style={{ gap: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>CATEGORÍA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {availableCategories.map((id) => {
                const cat = DEFAULT_CATEGORIES.find((c) => c.id === id)!;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setCategoryId(id)}
                    style={[
                      styles.chip,
                      { borderRadius: radius.pill, borderColor: categoryId === id ? colors.accentFrom : colors.surfaceBorder, backgroundColor: categoryId === id ? colors.accentSoft : 'transparent' },
                    ]}
                  >
                    <Text style={{ color: categoryId === id ? colors.accentFrom : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="Monto mensual"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
            />
            <View style={styles.formActions}>
              <Pressable onPress={() => setShowForm(false)}>
                <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleAdd}
                style={[styles.saveBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Guardar</Text>
              </Pressable>
            </View>
          </GlassCard>
        ) : (
          availableCategories.length > 0 && (
            <Pressable
              onPress={() => setShowForm(true)}
              style={[styles.addBtn, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
            >
              <Ionicons name="add" size={18} color={colors.accentFrom} />
              <Text style={{ color: colors.accentFrom, fontWeight: '700', marginLeft: 6 }}>Agregar presupuesto</Text>
            </Pressable>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', paddingVertical: 14 },
});

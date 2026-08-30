import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { ProgressBar } from '@/components/ProgressBar';
import {
  selectActiveAccounts,
  selectActiveBudgets,
  selectActiveInvestments,
  selectActiveLiabilities,
  selectActiveTransactions,
} from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import {
  buildBudgetLines,
  computeFinancialHealth,
  computeNetWorth,
  spendInPeriod,
  type HealthFactorStatus,
} from '@/utils/finance';

const STATUS_ICON: Record<HealthFactorStatus, keyof typeof Ionicons.glyphMap> = {
  positive: 'checkmark-circle',
  attention: 'alert-circle',
  negative: 'close-circle',
};

const STATUS_TO_BAR = {
  positive: 'normal',
  attention: 'attention',
  negative: 'exceeded',
} as const;

export default function SaludFinanciera() {
  const { colors, typography, spacing } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const rawAccounts = useAppStore((s) => s.accounts);
  const rawInvestments = useAppStore((s) => s.investments);
  const rawLiabilities = useAppStore((s) => s.liabilities);
  const rawTransactions = useAppStore((s) => s.transactions);
  const rawBudgets = useAppStore((s) => s.budgets);
  const liveQuotes = useAppStore((s) => s.liveQuotes);

  const accounts = useMemo(() => selectActiveAccounts(rawAccounts), [rawAccounts]);
  const investments = useMemo(() => selectActiveInvestments(rawInvestments), [rawInvestments]);
  const liabilities = useMemo(() => selectActiveLiabilities(rawLiabilities), [rawLiabilities]);
  const transactions = useMemo(() => selectActiveTransactions(rawTransactions), [rawTransactions]);
  const budgets = useMemo(() => selectActiveBudgets(rawBudgets), [rawBudgets]);

  const netWorth = computeNetWorth(accounts, investments, liabilities, profile.primaryCurrency, liveQuotes);
  const monthlySpend = spendInPeriod(transactions);
  const emergencyFund = accounts.filter((a) => a.type === 'savings').reduce((sum, a) => sum + a.balance, 0);
  const budgetLines = buildBudgetLines(budgets, transactions, profile.budgetThresholds);

  const health = computeFinancialHealth({
    netWorth,
    emergencyFundBalance: emergencyFund,
    monthlySpend: monthlySpend || 1,
    budgetLines,
  });

  const statusColor = (status: HealthFactorStatus) =>
    status === 'positive' ? colors.success : status === 'attention' ? colors.warning : colors.danger;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>Salud financiera</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Cómo se calcula tu puntaje</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.md }}>
        <GlassCard style={{ gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.lg }}>
          <Text style={[typography.display, { color: colors.textPrimary, fontSize: 44 }]}>{health.score}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>de 100 puntos</Text>
          <Text style={[typography.headline, { color: colors.accentFrom, marginTop: spacing.xs }]}>{health.label}</Text>
        </GlassCard>

        <Text style={[typography.caption, { color: colors.textSecondary, paddingHorizontal: 4 }]}>
          Partes de una base de {health.baseScore} puntos. Cada factor suma o resta según tu situación real — nunca es un
          diagnóstico profesional, solo una guía transparente.
        </Text>

        {health.breakdown.map((factor) => (
          <GlassCard key={factor.key} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name={STATUS_ICON[factor.status]} size={20} color={statusColor(factor.status)} />
                <Text style={[typography.headline, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
                  {factor.title}
                </Text>
              </View>
              <Text style={[typography.headline, { color: statusColor(factor.status) }]}>
                +{factor.points}/{factor.maxPoints}
              </Text>
            </View>
            <ProgressBar percent={(factor.points / factor.maxPoints) * 100} status={STATUS_TO_BAR[factor.status]} />
            <Text style={[typography.body, { color: colors.textSecondary }]}>{factor.detail}</Text>
            {factor.suggestion && (
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: colors.accentSoft,
                  borderRadius: 10,
                  padding: spacing.sm,
                  marginTop: 2,
                }}
              >
                <Ionicons name="bulb-outline" size={16} color={colors.accentFrom} style={{ marginTop: 1 }} />
                <Text style={[typography.caption, { color: colors.accentFrom, marginLeft: spacing.sm, flex: 1 }]}>
                  {factor.suggestion}
                </Text>
              </View>
            )}
          </GlassCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

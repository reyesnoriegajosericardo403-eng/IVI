import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { findCategory, findSubcategory } from '@/data/categories';
import { CategoryIcon } from '@/components/CategoryIcon';
import { GlassCard } from '@/components/GlassCard';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Sparkline } from '@/components/Sparkline';
import { StatCard } from '@/components/StatCard';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency, formatPercent } from '@/utils/format';
import {
  buildBudgetLines,
  computeFinancialHealth,
  computeNetWorth,
  getNetWorthTrend,
  previousMonthSpend,
  spendInPeriod,
} from '@/utils/finance';

export default function Dashboard() {
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const accounts = useAppStore((s) => s.accounts);
  const investments = useAppStore((s) => s.investments);
  const liabilities = useAppStore((s) => s.liabilities);
  const transactions = useAppStore((s) => s.transactions);
  const budgets = useAppStore((s) => s.budgets);
  const netWorthHistory = useAppStore((s) => s.netWorthHistory);
  const demoDataLoaded = useAppStore((s) => s.demoDataLoaded);

  const netWorth = computeNetWorth(accounts, investments, liabilities, profile.primaryCurrency);
  const monthTrend = getNetWorthTrend(netWorthHistory, 30);

  const monthlySpend = spendInPeriod(transactions);
  const prevSpend = previousMonthSpend(transactions);
  const spendTrend = prevSpend > 0 ? ((monthlySpend - prevSpend) / prevSpend) * 100 : null;

  const budgetLines = buildBudgetLines(budgets, transactions, profile.budgetThresholds);
  const totalBudgeted = budgetLines.reduce((s, b) => s + b.budgeted, 0);
  const totalActual = budgetLines.reduce((s, b) => s + b.actual, 0);
  const overallPercent = totalBudgeted > 0 ? Math.round((totalActual / totalBudgeted) * 100) : 0;

  const emergencyFund = accounts
    .filter((a) => a.type === 'savings')
    .reduce((sum, a) => sum + a.balance, 0);

  const health = computeFinancialHealth({
    netWorth,
    emergencyFundBalance: emergencyFund,
    monthlySpend: monthlySpend || 1,
    budgetLines,
  });

  const sparkData = netWorthHistory.slice(-30).map((h) => h.netWorth);
  const recentTx = transactions.slice(0, 4);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.lg }}>
        <ScreenHeader title={`Hola, ${profile.name || 'tú'}`} subtitle="Así está tu dinero hoy" showSettings />

        {demoDataLoaded && (
          <View style={[styles.demoBanner, { backgroundColor: colors.accentSoft, borderRadius: radius.md }]}>
            <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700' }]}>
              MODO DEMO — estos datos son de ejemplo
            </Text>
          </View>
        )}

        <GlassCard style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Patrimonio neto</Text>
          <Text style={[typography.display, { color: colors.textPrimary }]}>
            {formatCurrency(netWorth.netWorth, profile.primaryCurrency)}
          </Text>
          {monthTrend !== null && (
            <Text style={[typography.caption, { color: monthTrend >= 0 ? colors.success : colors.danger }]}>
              {formatPercent(monthTrend)} en 30 días
            </Text>
          )}
          {sparkData.length >= 2 && (
            <View style={{ marginTop: spacing.sm }}>
              <Sparkline data={sparkData} color={colors.accentFrom} width={300} height={56} />
            </View>
          )}
          <Pressable onPress={() => router.push('/(tabs)/patrimonio')}>
            <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700', marginTop: 4 }]}>
              Ver detalle →
            </Text>
          </Pressable>
        </GlassCard>

        <View style={styles.rowGap}>
          <View style={{ flex: 1 }}>
            <StatCard
              label="Gasto del periodo"
              value={formatCurrency(monthlySpend, profile.primaryCurrency)}
              trendLabel={spendTrend !== null ? formatPercent(spendTrend) : undefined}
              trendPositive={spendTrend !== null ? spendTrend <= 0 : undefined}
            />
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/presupuesto')}>
            <StatCard
              label="Presupuesto usado"
              value={totalBudgeted > 0 ? `${overallPercent}%` : '—'}
              sub={totalBudgeted > 0 ? formatCurrency(totalActual, profile.primaryCurrency) : 'Configúralo aquí'}
            />
          </Pressable>
        </View>

        <GlassCard style={{ gap: spacing.sm }}>
          <View style={styles.spaceBetween}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Salud financiera</Text>
            <Text style={[typography.headline, { color: colors.accentFrom }]}>{health.score}/100</Text>
          </View>
          <ProgressBar percent={health.score} status={health.score >= 60 ? 'normal' : health.score >= 40 ? 'attention' : 'exceeded'} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{health.label}</Text>
        </GlassCard>

        <View>
          <View style={[styles.spaceBetween, { marginBottom: spacing.sm }]}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Movimientos recientes</Text>
            <Pressable onPress={() => router.push('/(tabs)/movimientos')}>
              <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700' }]}>Ver todos</Text>
            </Pressable>
          </View>
          <GlassCard style={{ gap: spacing.md }}>
            {recentTx.length === 0 && (
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                Aún no registras movimientos. Usa el botón de voz para agregar el primero.
              </Text>
            )}
            {recentTx.map((t) => (
              <View key={t.id} style={styles.txRow}>
                <CategoryIcon categoryId={t.categoryId} size={16} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={[typography.body, { color: colors.textPrimary }]}>
                    {t.merchant || findSubcategory(t.categoryId, t.subcategoryId)?.name || findCategory(t.categoryId)?.name}
                  </Text>
                </View>
                <Text
                  style={[
                    typography.headline,
                    { color: t.type === 'income' ? colors.success : colors.textPrimary },
                  ]}
                >
                  {t.type === 'income' ? '+' : '-'}
                  {formatCurrency(t.amount, t.currency)}
                </Text>
              </View>
            ))}
          </GlassCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  demoBanner: { paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' },
  rowGap: { flexDirection: 'row', gap: 12 },
  spaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  txRow: { flexDirection: 'row', alignItems: 'center' },
});

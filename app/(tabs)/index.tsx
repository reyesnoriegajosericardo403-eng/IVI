import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DonutChart } from '@/components/DonutChart';
import { GlassCard } from '@/components/GlassCard';
import { Sparkline } from '@/components/Sparkline';
import { useContentMaxWidth } from '@/hooks/useBreakpoint';
import {
  selectActiveAccounts,
  selectActiveBudgets,
  selectActiveInvestments,
  selectActiveLiabilities,
  selectActiveNetWorthHistory,
  selectActiveTransactions,
} from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { getBudgetBanner, getDailyBudgetTip, greetingIcon } from '@/utils/dashboardCopy';
import { formatCurrency, formatPercent } from '@/utils/format';
import {
  buildBudgetLines,
  computeNetWorth,
  getNetWorthTrend,
  periodKey,
  previousMonthSpend,
  previousPeriodAvailable,
  spendInPeriod,
  sumByTypeInPeriod,
  topSpendCategories,
  upcomingLiabilityReminders,
} from '@/utils/finance';

type Scope = 'month' | 'week';

export default function Dashboard() {
  const { colors, typography, spacing, radius } = useTheme();
  const maxWidth = useContentMaxWidth();
  const profile = useAppStore((s) => s.profile);
  const rawAccounts = useAppStore((s) => s.accounts);
  const rawInvestments = useAppStore((s) => s.investments);
  const rawLiabilities = useAppStore((s) => s.liabilities);
  const rawTransactions = useAppStore((s) => s.transactions);
  const rawBudgets = useAppStore((s) => s.budgets);
  const rawNetWorthHistory = useAppStore((s) => s.netWorthHistory);
  const demoDataLoaded = useAppStore((s) => s.demoDataLoaded);
  const liveQuotes = useAppStore((s) => s.liveQuotes);
  const budgetPeriods = useAppStore((s) => s.budgetPeriods);
  const ackBudgetPeriod = useAppStore((s) => s.ackBudgetPeriod);

  const accounts = useMemo(() => selectActiveAccounts(rawAccounts), [rawAccounts]);
  const investments = useMemo(() => selectActiveInvestments(rawInvestments), [rawInvestments]);
  const liabilities = useMemo(() => selectActiveLiabilities(rawLiabilities), [rawLiabilities]);
  const transactions = useMemo(() => selectActiveTransactions(rawTransactions), [rawTransactions]);
  const budgets = useMemo(() => selectActiveBudgets(rawBudgets), [rawBudgets]);
  const netWorthHistory = useMemo(() => selectActiveNetWorthHistory(rawNetWorthHistory), [rawNetWorthHistory]);

  const [summaryScope, setSummaryScope] = useState<Scope>('month');

  const netWorth = computeNetWorth(accounts, investments, liabilities, profile.primaryCurrency, liveQuotes);
  const monthTrend = getNetWorthTrend(netWorthHistory, 30);

  const monthlySpend = spendInPeriod(transactions);
  const prevSpend = previousMonthSpend(transactions);
  const spendTrend = prevSpend > 0 ? ((monthlySpend - prevSpend) / prevSpend) * 100 : null;

  // ---- "¿En qué gastaste tu dinero?" (siempre del mes en curso) ----
  const monthlyBudgetLines = buildBudgetLines(budgets, transactions, profile.budgetThresholds, new Date(), 'month');
  const monthBudgeted = monthlyBudgetLines.reduce((s, b) => s + b.budgeted, 0);
  const hasBudget = monthBudgeted > 0;
  const spendSlices = topSpendCategories(transactions, new Date(), 'month', 3);
  const SLICE_COLORS = [colors.success, colors.danger, colors.info, colors.accentFrom];
  const donutData = spendSlices.map((s, i) => ({ label: s.name, value: s.amount, color: SLICE_COLORS[i % SLICE_COLORS.length] }));
  const available = hasBudget ? Math.max(0, monthBudgeted - monthlySpend) : 0;

  // ---- Banner de presupuesto + tip (cambian por hora/día — spec) ----
  const budgetBanner = getBudgetBanner(hasBudget);
  const dailyTip = getDailyBudgetTip();

  // ---- Sobrante del periodo anterior (semana o mes) que sigue contando
  // como Disponible mientras el usuario no diga lo contrario — spec:
  // "¿seguimos con el mismo sobrante de dinero disponible?" ----
  const weekKey = periodKey('week');
  const monthKey = periodKey('month');
  const currentCarryOver = budgetPeriods[summaryScope].lastPeriodKey === (summaryScope === 'week' ? weekKey : monthKey)
    ? budgetPeriods[summaryScope].carryOver
    : 0;

  const pendingRollovers = useMemo(() => {
    const out: Array<{ scope: Scope; key: string; leftover: number }> = [];
    (['week', 'month'] as Scope[]).forEach((s) => {
      const key = s === 'week' ? weekKey : monthKey;
      const state = budgetPeriods[s];
      if (state.lastPeriodKey && state.lastPeriodKey !== key) {
        const leftover = previousPeriodAvailable(budgets, transactions, profile.budgetThresholds, s, new Date());
        if (leftover > 0) out.push({ scope: s, key, leftover });
      }
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, monthKey, budgetPeriods.week.lastPeriodKey, budgetPeriods.month.lastPeriodKey, budgets, transactions]);

  useEffect(() => {
    (['week', 'month'] as Scope[]).forEach((s) => {
      const key = s === 'week' ? weekKey : monthKey;
      const state = budgetPeriods[s];
      if (state.lastPeriodKey === null) {
        ackBudgetPeriod(s, key, 0);
        return;
      }
      if (state.lastPeriodKey !== key) {
        const leftover = previousPeriodAvailable(budgets, transactions, profile.budgetThresholds, s, new Date());
        if (leftover <= 0) ackBudgetPeriod(s, key, 0);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, monthKey]);

  // ---- "Tu resumen" (con toggle semana/mes) ----
  const summaryBudgetLines = buildBudgetLines(budgets, transactions, profile.budgetThresholds, new Date(), summaryScope);
  const summaryBudgeted = summaryBudgetLines.reduce((s, b) => s + b.budgeted, 0);
  const summarySpent = spendInPeriod(transactions, new Date(), summaryScope);
  const summarySaved = sumByTypeInPeriod(transactions, 'saving', new Date(), summaryScope);
  const summaryAvailable = summaryBudgeted > 0 ? Math.max(0, summaryBudgeted - summarySpent) + currentCarryOver : 0;
  const summaryTotal = summaryAvailable + summarySpent + summarySaved;

  // ---- Recordatorios reales (deudas por vencer) ----
  const reminders = upcomingLiabilityReminders(liabilities, 14).slice(0, 3);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  const sparkData = netWorthHistory.slice(-30).map((h) => h.netWorth);

  const reminderLabel = (daysUntil: number) => {
    if (daysUntil < 0) return `Venció hace ${Math.abs(daysUntil)} día${Math.abs(daysUntil) === 1 ? '' : 's'}`;
    if (daysUntil === 0) return 'Vence hoy';
    return `Vence en ${daysUntil} día${daysUntil === 1 ? '' : 's'}`;
  };

  const scopeLabel = (s: Scope) => (s === 'week' ? 'la semana pasada' : 'el mes pasado');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={[
          { padding: spacing.lg, paddingBottom: 140, gap: spacing.lg },
          maxWidth ? { maxWidth, width: '100%', alignSelf: 'center' } : null,
        ]}
      >
        <View style={[styles.greetingRow, { marginBottom: spacing.xs }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {greeting}, {profile.name || 'Hola'} {greetingIcon()}
            </Text>
            <Text style={[typography.title, { color: colors.textPrimary, marginTop: 2 }]} numberOfLines={1} adjustsFontSizeToFit>
              Así va tu dinero hoy
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Ajustes"
              onPress={() => router.push('/settings')}
              style={[styles.iconButton, { backgroundColor: colors.accentSoft }]}
            >
              <Ionicons name="settings-outline" size={20} color={colors.accentFrom} />
            </Pressable>
            <Pressable
              accessibilityLabel="Abrir copiloto IA"
              onPress={() => router.push('/(tabs)/ia')}
              style={[styles.iconButton, { backgroundColor: colors.accentSoft }]}
            >
              <Ionicons name="sparkles" size={20} color={colors.accentFrom} />
            </Pressable>
          </View>
        </View>

        {demoDataLoaded && (
          <View style={[styles.demoBanner, { backgroundColor: colors.accentSoft, borderRadius: radius.md }]}>
            <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700' }]}>
              MODO DEMO — estos datos son de ejemplo
            </Text>
          </View>
        )}

        {/* ---------- ¿Seguimos con el mismo sobrante disponible? ---------- */}
        {pendingRollovers.map((p) => (
          <View key={p.scope} style={[styles.rolloverCard, { backgroundColor: colors.accentFrom, borderRadius: radius.lg }]}>
            <View style={styles.rowCenter}>
              <Ionicons name="help-buoy-outline" size={22} color="#FFFFFF" />
              <Text style={[typography.headline, { color: '#FFFFFF', marginLeft: spacing.sm, flex: 1 }]}>
                Ya terminó {p.scope === 'week' ? 'la semana' : 'el mes'} pasad{p.scope === 'week' ? 'a' : 'o'}
              </Text>
            </View>
            <Text style={[typography.body, { color: 'rgba(255,255,255,0.9)' }]}>
              Te quedaron {formatCurrency(p.leftover, profile.primaryCurrency)} disponibles de {scopeLabel(p.scope)}. ¿Seguimos
              contando ese dinero como disponible para {p.scope === 'week' ? 'esta semana' : 'este mes'}?
            </Text>
            <View style={styles.rolloverActions}>
              <Pressable
                accessibilityLabel={`No mantener sobrante de ${p.scope === 'week' ? 'la semana' : 'el mes'} pasad${p.scope === 'week' ? 'a' : 'o'}`}
                onPress={() => ackBudgetPeriod(p.scope, p.key, 0)}
                style={[styles.rolloverBtnGhost, { borderRadius: radius.pill, borderColor: 'rgba(255,255,255,0.5)' }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>No, empezar en $0</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Sí mantener sobrante de ${p.scope === 'week' ? 'la semana' : 'el mes'} pasad${p.scope === 'week' ? 'a' : 'o'}`}
                onPress={() => ackBudgetPeriod(p.scope, p.key, p.leftover)}
                style={[styles.rolloverBtnSolid, { borderRadius: radius.pill }]}
              >
                <Text style={{ color: colors.accentFrom, fontWeight: '700' }}>Sí, sigue conmigo</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {/* ---------- ¿En qué gastaste tu dinero? ---------- */}
        <GlassCard style={{ gap: spacing.md }}>
          <View style={styles.spaceBetween}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>¿En qué gastaste tu dinero?</Text>
            <Pressable accessibilityLabel="Ver detalle de gastos" onPress={() => router.push('/(tabs)/movimientos')}>
              <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700' }]}>Ver detalle →</Text>
            </Pressable>
          </View>

          {spendSlices.length > 0 ? (
            <View style={styles.donutRow}>
              <View style={styles.donutWrap}>
                <DonutChart data={donutData} size={140} emptyColor={colors.divider} />
                <View style={styles.donutCenter} pointerEvents="none">
                  <Text style={[typography.micro, { color: colors.textTertiary }]}>
                    {hasBudget ? 'DISPONIBLE' : 'GASTADO'}
                  </Text>
                  <Text style={[typography.headline, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                    {formatCurrency(hasBudget ? available : monthlySpend, profile.primaryCurrency)}
                  </Text>
                  {hasBudget && (
                    <Text style={[typography.micro, { color: colors.textTertiary }]}>
                      de {formatCurrency(monthBudgeted, profile.primaryCurrency)}
                    </Text>
                  )}
                </View>
              </View>
              <View style={{ flex: 1, gap: spacing.sm, minWidth: 140 }}>
                {spendSlices.map((slice, i) => (
                  <View key={slice.categoryId} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }]} />
                    <Text style={[typography.caption, { color: colors.textPrimary, flex: 1, marginLeft: 8 }]} numberOfLines={1}>
                      {slice.name}
                    </Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700' }]}>
                        {Math.round(slice.percent)}%
                      </Text>
                      <Text style={[typography.micro, { color: colors.textTertiary }]}>
                        {formatCurrency(slice.amount, profile.primaryCurrency)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Aún no registras gastos este mes.</Text>
          )}
        </GlassCard>

        {/* ---------- Banner de presupuesto (cambia según haya presupuesto, hora y día) ---------- */}
        <Pressable
          accessibilityLabel={budgetBanner.cta}
          onPress={() => router.push('/presupuesto')}
          style={[styles.budgetBanner, { backgroundColor: colors.accentFrom, borderRadius: radius.lg }]}
        >
          <Ionicons name="clipboard-outline" size={32} color="rgba(255,255,255,0.85)" />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>{budgetBanner.title}</Text>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.85)', fontWeight: '700', marginTop: spacing.xs }]}>
              {budgetBanner.cta} →
            </Text>
          </View>
        </Pressable>

        <View style={[styles.tipCard, { backgroundColor: colors.accentSoft, borderRadius: radius.md }]}>
          <Ionicons name="bulb-outline" size={16} color={colors.accentFrom} />
          <Text style={[typography.caption, { color: colors.accentFrom, marginLeft: spacing.sm, flex: 1 }]}>{dailyTip}</Text>
        </View>

        {/* ---------- Tu resumen ---------- */}
        <View style={{ gap: spacing.sm }}>
          <View style={styles.spaceBetween}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Tu resumen</Text>
            <Pressable
              accessibilityLabel="Cambiar periodo del resumen"
              onPress={() => setSummaryScope((s) => (s === 'month' ? 'week' : 'month'))}
              style={styles.rowCenter}
            >
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                {summaryScope === 'month' ? 'Este mes' : 'Esta semana'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} style={{ marginLeft: 4 }} />
            </Pressable>
          </View>

          <View style={styles.summaryRow}>
            <GlassCard style={{ flex: 1, gap: 2 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Disponible</Text>
              <Text style={[typography.headline, { color: colors.success }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(summaryAvailable, profile.primaryCurrency)}
              </Text>
            </GlassCard>
            <GlassCard style={{ flex: 1, gap: 2 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Gastado</Text>
              <Text style={[typography.headline, { color: colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(summarySpent, profile.primaryCurrency)}
              </Text>
            </GlassCard>
            <GlassCard style={{ flex: 1, gap: 2 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Ahorrado</Text>
              <Text style={[typography.headline, { color: colors.info }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(summarySaved, profile.primaryCurrency)}
              </Text>
            </GlassCard>
          </View>

          {summaryTotal > 0 && (
            <View style={[styles.segmentedBar, { borderRadius: radius.pill }]}>
              {summaryAvailable > 0 && <View style={{ flex: summaryAvailable, backgroundColor: colors.success }} />}
              {summarySpent > 0 && <View style={{ flex: summarySpent, backgroundColor: colors.danger }} />}
              {summarySaved > 0 && <View style={{ flex: summarySaved, backgroundColor: colors.info }} />}
            </View>
          )}
        </View>

        {/* ---------- Comparación honesta vs. periodo anterior ---------- */}
        {spendTrend !== null && (
          <View
            style={[
              styles.compareCard,
              { backgroundColor: spendTrend <= 0 ? colors.accentSoft : 'transparent', borderColor: spendTrend > 0 ? colors.surfaceBorder : 'transparent', borderWidth: spendTrend > 0 ? 1 : 0, borderRadius: radius.lg },
            ]}
          >
            <Ionicons
              name={spendTrend <= 0 ? 'sparkles' : 'information-circle-outline'}
              size={28}
              color={spendTrend <= 0 ? colors.success : colors.textSecondary}
            />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.headline, { color: spendTrend <= 0 ? colors.success : colors.textPrimary }]}>
                {spendTrend <= 0 ? '¡Vas bien!' : 'Ojo con esto'}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Gastaste {formatCurrency(Math.abs(monthlySpend - prevSpend), profile.primaryCurrency)}{' '}
                {spendTrend <= 0 ? 'menos' : 'más'} que el mes pasado.
              </Text>
            </View>
          </View>
        )}

        {/* ---------- Recordatorios para ti ---------- */}
        {reminders.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Recordatorios para ti</Text>
            {reminders.map((r) => (
              <Pressable key={r.liabilityId} onPress={() => router.push('/(tabs)/patrimonio')}>
                <GlassCard style={styles.reminderRow}>
                  <View style={[styles.reminderIcon, { backgroundColor: colors.accentSoft, borderRadius: radius.pill }]}>
                    <Ionicons name="notifications-outline" size={18} color={colors.accentFrom} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                      Tu pago de {r.institution} {reminderLabel(r.daysUntil).toLowerCase()}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>No olvides pagar a tiempo.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </GlassCard>
              </Pressable>
            ))}
          </View>
        )}

        {/* ---------- Panorama completo (patrimonio) ---------- */}
        <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.sm }]}>TU PANORAMA COMPLETO</Text>

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  greetingRow: { flexDirection: 'row', alignItems: 'flex-start' },
  headerActions: { flexDirection: 'row', gap: 10, marginLeft: 12 },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  demoBanner: { paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' },
  spaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rolloverCard: { padding: 18, gap: 10 },
  rolloverActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  rolloverBtnGhost: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1.5 },
  rolloverBtnSolid: { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: '#FFFFFF' },
  txRow: { flexDirection: 'row', alignItems: 'center' },
  donutRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  donutWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 100 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  budgetBanner: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, marginTop: -8 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  segmentedBar: { flexDirection: 'row', height: 10, overflow: 'hidden' },
  compareCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  reminderRow: { flexDirection: 'row', alignItems: 'center' },
  reminderIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});

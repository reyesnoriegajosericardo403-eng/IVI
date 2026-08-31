import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarPicker } from '@/components/CalendarPicker';
import { CategoryIcon } from '@/components/CategoryIcon';
import { DonutChart } from '@/components/DonutChart';
import { GlassCard } from '@/components/GlassCard';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionToggle } from '@/components/SectionToggle';
import { findIncomeConcept } from '@/data/budgetConcepts';
import { findCategory, findSubcategory } from '@/data/categories';
import type { Transaction } from '@/data/types';
import { useContentMaxWidth } from '@/hooks/useBreakpoint';
import { selectActiveBudgets, selectActiveTransactions } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDateDMY, todayISO } from '@/utils/date';
import { formatCurrency, formatRelativeDay } from '@/utils/format';
import { buildBudgetLines, topSpendCategories, topSpendSubcategories } from '@/utils/finance';

interface Section {
  title: string;
  data: Transaction[];
}

function groupByDay(transactions: Transaction[]): Section[] {
  const map = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const key = t.date.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, data]) => ({ title: formatRelativeDay(data[0].date), data }));
}

export default function Movimientos() {
  const { colors, typography, spacing, radius } = useTheme();
  const maxWidth = useContentMaxWidth();
  const insets = useSafeAreaInsets();
  const profile = useAppStore((s) => s.profile);
  const rawTransactions = useAppStore((s) => s.transactions);
  const rawBudgets = useAppStore((s) => s.budgets);
  const transactions = useMemo(() => selectActiveTransactions(rawTransactions), [rawTransactions]);
  const budgets = useMemo(() => selectActiveBudgets(rawBudgets), [rawBudgets]);

  const [showCalendar, setShowCalendar] = useState(false);
  const [monthIso, setMonthIso] = useState(todayISO());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(true);

  const markedIsoDates = useMemo(() => new Set(transactions.map((t) => t.date.slice(0, 10))), [transactions]);

  const visibleTransactions = useMemo(
    () => (selectedDay ? transactions.filter((t) => t.date.slice(0, 10) === selectedDay) : transactions),
    [transactions, selectedDay]
  );

  const sections = useMemo(() => groupByDay(visibleTransactions), [visibleTransactions]);
  const flatData = useMemo(() => sections.flatMap((s) => [{ type: 'header' as const, title: s.title }, ...s.data.map((t) => ({ type: 'tx' as const, tx: t }))]), [sections]);

  // ---- Análisis: mismo donut del Dashboard + 2 gráficos con más detalle ----
  const spendSlices = topSpendCategories(transactions, new Date(), 'month', 3);
  const SLICE_COLORS = [colors.success, colors.danger, colors.info, colors.accentFrom];
  const donutData = spendSlices.map((s, i) => ({ label: s.name, value: s.amount, color: SLICE_COLORS[i % SLICE_COLORS.length] }));

  const topSubs = topSpendSubcategories(transactions, new Date(), 'month', 5);
  const maxSubAmount = Math.max(1, ...topSubs.map((s) => s.amount));

  const budgetLines = buildBudgetLines(budgets, transactions, profile.budgetThresholds);
  // Solo conceptos de GASTO — un ingreso arriba de lo esperado es buena
  // noticia, no un "punto crítico" que deba marcarse en rojo.
  const criticalLines = [...budgetLines]
    .filter((l) => l.budgeted > 0 && !findIncomeConcept(l.categoryId))
    .sort((a, b) => b.percentUsed - a.percentUsed)
    .slice(0, 5);

  const hasAnalysis = spendSlices.length > 0 || topSubs.length > 0 || criticalLines.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={[{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }, maxWidth ? { maxWidth, width: '100%', alignSelf: 'center' } : null]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <ScreenHeader title="Movimientos" subtitle={`${visibleTransactions.length} registrados`} />
          </View>
          <Pressable
            accessibilityLabel={showCalendar ? 'Ocultar calendario' : 'Ver calendario'}
            onPress={() => setShowCalendar((v) => !v)}
            style={[styles.calendarBtn, { backgroundColor: showCalendar ? colors.accentSoft : colors.surfaceSolid, borderRadius: radius.md }]}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.accentFrom} />
          </Pressable>
        </View>

        {showCalendar && (
          <GlassCard style={{ marginTop: spacing.md }}>
            <CalendarPicker
              monthIso={monthIso}
              selectedIso={selectedDay ?? undefined}
              onChangeMonth={setMonthIso}
              onSelectDay={(iso) => setSelectedDay((current) => (current === iso ? null : iso))}
              markedIsoDates={markedIsoDates}
            />
          </GlassCard>
        )}

        {selectedDay && (
          <Pressable onPress={() => setSelectedDay(null)} style={[styles.filterChip, { borderColor: colors.accentFrom, borderRadius: radius.pill }]}>
            <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700' }]}>
              {formatDateDMY(selectedDay)}
            </Text>
            <Ionicons name="close" size={14} color={colors.accentFrom} style={{ marginLeft: 6 }} />
          </Pressable>
        )}
      </View>

      {visibleTransactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name={selectedDay ? 'calendar-outline' : 'mic-outline'} size={40} color={colors.textTertiary} />
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }]}>
            {selectedDay
              ? 'No hay movimientos registrados ese día.'
              : 'Toca el botón de voz para registrar tu primer movimiento en segundos.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item, idx) => (item.type === 'header' ? `h-${item.title}-${idx}` : item.tx.id)}
          contentContainerStyle={[
            { padding: spacing.lg, paddingBottom: 140, gap: spacing.sm },
            maxWidth ? { maxWidth, width: '100%', alignSelf: 'center' } : null,
          ]}
          ListHeaderComponent={
            hasAnalysis ? (
              <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
                <SectionToggle title="Análisis de tus gastos" open={analysisOpen} onToggle={() => setAnalysisOpen((v) => !v)} />

                {analysisOpen && (
                  <View style={{ gap: spacing.md }}>
                    {spendSlices.length > 0 && (
                      <GlassCard style={{ gap: spacing.md }}>
                        <Text style={[typography.headline, { color: colors.textPrimary }]}>¿En qué gastaste tu dinero?</Text>
                        <View style={styles.donutRow}>
                          <DonutChart data={donutData} size={120} emptyColor={colors.divider} />
                          <View style={{ flex: 1, gap: spacing.xs, minWidth: 140 }}>
                            {spendSlices.map((slice, i) => (
                              <View key={slice.categoryId} style={styles.legendRow}>
                                <View style={[styles.legendDot, { backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }]} />
                                <Text style={[typography.caption, { color: colors.textPrimary, flex: 1, marginLeft: 8 }]} numberOfLines={1}>
                                  {slice.name}
                                </Text>
                                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                                  {Math.round(slice.percent)}%
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </GlassCard>
                    )}

                    {topSubs.length > 0 && (
                      <GlassCard style={{ gap: spacing.sm }}>
                        <Text style={[typography.headline, { color: colors.textPrimary }]}>Tus gastos más fuertes</Text>
                        {topSubs.map((s) => (
                          <View key={`${s.categoryId}::${s.subcategoryId}`} style={{ gap: 4 }}>
                            <View style={styles.rowBetween}>
                              <Text style={[typography.caption, { color: colors.textPrimary }]} numberOfLines={1}>
                                {s.name}
                              </Text>
                              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                                {formatCurrency(s.amount, profile.primaryCurrency)}
                              </Text>
                            </View>
                            <View style={[styles.barTrack, { backgroundColor: colors.divider, borderRadius: radius.pill }]}>
                              <View
                                style={[
                                  styles.barFill,
                                  { width: `${(s.amount / maxSubAmount) * 100}%`, backgroundColor: colors.accentFrom, borderRadius: radius.pill },
                                ]}
                              />
                            </View>
                          </View>
                        ))}
                      </GlassCard>
                    )}

                    {criticalLines.length > 0 && (
                      <GlassCard style={{ gap: spacing.sm }}>
                        <Text style={[typography.headline, { color: colors.textPrimary }]}>Presupuesto vs. real</Text>
                        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: -4 }]}>
                          Tus puntos más críticos este mes
                        </Text>
                        {criticalLines.map((line) => (
                          <View key={line.budgetId} style={{ gap: 4 }}>
                            <View style={styles.rowBetween}>
                              <Text style={[typography.caption, { color: colors.textPrimary }]} numberOfLines={1}>
                                {line.categoryName}
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
                                {line.percentUsed}%
                              </Text>
                            </View>
                            <ProgressBar percent={line.percentUsed} status={line.status} />
                            <Text style={[typography.micro, { color: colors.textTertiary }]}>
                              {formatCurrency(line.actual, profile.primaryCurrency)} de {formatCurrency(line.budgeted, profile.primaryCurrency)}
                            </Text>
                          </View>
                        ))}
                      </GlassCard>
                    )}
                  </View>
                )}
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.md, marginBottom: 2 }]}>
                  {item.title.toUpperCase()}
                </Text>
              );
            }
            const t = item.tx;
            const category = findCategory(t.categoryId);
            const subcategory = findSubcategory(t.categoryId, t.subcategoryId);
            return (
              <Pressable onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })}>
                <GlassCard style={styles.txCard}>
                  <CategoryIcon categoryId={t.categoryId} size={18} />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[typography.headline, { color: colors.textPrimary }]}>
                      {t.merchant || subcategory?.name || category?.name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {category?.name}
                      {subcategory ? ` · ${subcategory.name}` : ''}
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
                </GlassCard>
              </Pressable>
            );
          }}
        />
      )}

      <View
        pointerEvents="box-none"
        style={[styles.manualFabWrap, { bottom: (Platform.OS === 'ios' ? 58 : 54) + insets.bottom }]}
      >
        <Pressable
          accessibilityLabel="Registro manual"
          onPress={() => router.push('/transaction/new')}
          style={[styles.manualFab, { borderRadius: radius.pill, backgroundColor: colors.accentFrom }]}
        >
          <Ionicons name="create-outline" size={26} color="#FFFFFF" />
        </Pressable>
        <Text style={[typography.micro, { color: colors.textSecondary, fontWeight: '700', marginTop: 6 }]}>
          Registro manual
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  calendarBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  txCard: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  donutRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  barTrack: { height: 8, overflow: 'hidden' },
  barFill: { height: 8 },
  manualFabWrap: { position: 'absolute', right: 20, alignItems: 'center' },
  manualFab: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});

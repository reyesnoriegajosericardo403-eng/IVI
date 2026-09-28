import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { InstitutionCard } from '@/components/investments/InstitutionCard';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ASSET_CLASS_GROUP, ASSET_CLASS_LABELS, isMarketPriced, RISK_GROUP_LABELS, type RiskGroup } from '@/data/investmentMeta';
import { INSTITUTIONS, OTHER_INSTITUTION } from '@/data/institutions';
import type { AssetClass } from '@/data/types';
import { refreshMarketData } from '@/services/market/marketDataRefresh';
import { usePortfolio } from '@/services/investments/usePortfolio';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { toBaseCurrency } from '@/utils/finance';
import { formatCurrency, formatPercent, formatRelativeTime } from '@/utils/format';
import { isUsMarketOpenNow } from '@/utils/marketHours';

// Inversiones, primer nivel: tus instituciones (GBM, Nu, Cetesdirecto…) como
// tarjetas. Al entrar a una ves sus productos (Trading MX, Smart Cash…) y
// dentro de cada producto la tabla de tus activos.
export default function Inversiones() {
  const { colors, typography, spacing, radius } = useTheme();
  const { valued, byInstitution, baseCurrency, totals } = usePortfolio();
  const lastQuotesFetchedAt = useAppStore((s) => s.lastQuotesFetchedAt);
  const [refreshing, setRefreshing] = useState(false);

  const mine = useMemo(() => Array.from(byInstitution.values()).sort((a, b) => b.value - a.value), [byInstitution]);
  const available = INSTITUTIONS.filter((i) => !byInstitution.has(i.id));
  const hasMarketPriced = valued.some((v) => isMarketPriced(v.position) && v.position.quantity > 0);
  const marketOpen = isUsMarketOpenNow();
  const gainPercent = totals.invested > 0 ? (totals.gain / totals.invested) * 100 : 0;

  const byAssetClass = useMemo(() => {
    const map = new Map<AssetClass, number>();
    for (const { position } of valued) {
      if (position.assetClass !== 'cash' && position.quantity <= 0) continue;
      map.set(position.assetClass, (map.get(position.assetClass) ?? 0) + toBaseCurrency(position.amountInvested, position.currency, baseCurrency));
    }
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    return Array.from(map.entries())
      .map(([assetClass, amount]) => ({ assetClass, amount, percent: total > 0 ? (amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [valued, baseCurrency]);

  const byRiskGroup = useMemo(() => {
    const total = byAssetClass.reduce((a, r) => a + r.amount, 0);
    return (['fixed', 'variable'] as RiskGroup[])
      .map((group) => {
        const amount = byAssetClass.filter((r) => ASSET_CLASS_GROUP[r.assetClass] === group).reduce((a, r) => a + r.amount, 0);
        return { group, amount, percent: total > 0 ? (amount / total) * 100 : 0 };
      })
      .filter((r) => r.amount > 0);
  }, [byAssetClass]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshMarketData(true);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.lg }}>
        <ScreenHeader title="Inversiones" subtitle="Tus instituciones y lo que tienes en cada una" />

        <GlassCard style={{ gap: 4 }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Valor de tu portafolio</Text>
          <Text style={[typography.display, { color: colors.textPrimary, fontVariant: ['tabular-nums'] }]}>
            {formatCurrency(totals.value, baseCurrency)}
          </Text>
          {mine.length > 0 ? (
            <>
              <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Invertido</Text>
                <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700' }]}>
                  {formatCurrency(totals.invested, baseCurrency)}
                </Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Rendimiento</Text>
                <Text style={[typography.caption, { color: totals.gain >= 0 ? colors.success : colors.danger, fontWeight: '700' }]}>
                  {totals.gain >= 0 ? '+' : ''}
                  {formatCurrency(totals.gain, baseCurrency)} ({formatPercent(gainPercent)})
                </Text>
              </View>
              {totals.realizedPnL !== 0 && (
                <View style={styles.rowBetween}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Ganancia ya realizada en ventas</Text>
                  <Text style={[typography.caption, { color: totals.realizedPnL >= 0 ? colors.success : colors.danger, fontWeight: '700' }]}>
                    {totals.realizedPnL >= 0 ? '+' : ''}
                    {formatCurrency(totals.realizedPnL, baseCurrency)}
                  </Text>
                </View>
              )}
              {totals.anyEstimated && (
                <Text style={[typography.micro, { color: colors.textTertiary, marginTop: 4 }]}>
                  Incluye rendimientos estimados de ahorro, plazos y CETES con la tasa que registraste, antes de impuestos.
                </Text>
              )}
            </>
          ) : (
            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
              Elige abajo la institución donde tienes tu dinero para empezar.
            </Text>
          )}
        </GlassCard>

        {hasMarketPriced && (
          <GlassCard style={{ gap: spacing.xs }}>
            <View style={styles.rowBetween}>
              <View style={styles.row}>
                <View style={[styles.statusDot, { backgroundColor: marketOpen ? colors.success : colors.textTertiary }]} />
                <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 6 }]}>
                  {marketOpen ? 'Mercado de EE. UU. abierto' : 'Mercado de EE. UU. cerrado'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Actualizar precios"
                onPress={handleRefresh}
                disabled={refreshing}
                style={[styles.refreshBtn, { borderColor: colors.surfaceBorder, borderRadius: radius.pill, opacity: refreshing ? 0.6 : 1 }]}
              >
                <Ionicons name="refresh" size={14} color={colors.accentFrom} />
                <Text style={{ color: colors.accentFrom, fontWeight: '700', fontSize: 12, marginLeft: 4 }}>
                  {refreshing ? 'Actualizando…' : 'Actualizar precios'}
                </Text>
              </Pressable>
            </View>
            <Text style={[typography.micro, { color: colors.textTertiary }]}>
              {lastQuotesFetchedAt
                ? `Precios actualizados ${formatRelativeTime(lastQuotesFetchedAt)} · se actualizan solos cada 15 min con el mercado abierto.`
                : 'Aún no se han consultado precios en vivo.'}
            </Text>
          </GlassCard>
        )}

        {mine.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>MIS INSTITUCIONES</Text>
            <View style={styles.grid}>
              {mine.map((s) => {
                const pct = s.invested > 0 ? (s.gain / s.invested) * 100 : 0;
                return (
                  <InstitutionCard
                    key={s.institution.id}
                    institution={s.institution}
                    summary={{
                      value: formatCurrency(s.value, baseCurrency),
                      detail: `${s.productIds.size} producto${s.productIds.size === 1 ? '' : 's'} · ${s.positions} registro${s.positions === 1 ? '' : 's'}`,
                      gain: s.gain !== 0 ? { text: `${s.gain >= 0 ? '+' : ''}${formatCurrency(s.gain, baseCurrency)} (${formatPercent(pct)})`, positive: s.gain >= 0 } : undefined,
                    }}
                    onPress={() => router.push(`/institucion/${s.institution.id}`)}
                  />
                );
              })}
            </View>
          </View>
        )}

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {mine.length > 0 ? 'AGREGAR OTRA INSTITUCIÓN' : 'ELIGE DÓNDE INVIERTES'}
          </Text>
          <View style={styles.grid}>
            {available.map((inst) => (
              <InstitutionCard key={inst.id} institution={inst} onPress={() => router.push(`/institucion/${inst.id}`)} />
            ))}
            {!byInstitution.has(OTHER_INSTITUTION.id) && (
              <InstitutionCard institution={OTHER_INSTITUTION} onPress={() => router.push(`/institucion/${OTHER_INSTITUTION.id}`)} />
            )}
          </View>
        </View>

        {byAssetClass.length > 1 && (
          <GlassCard style={{ gap: spacing.sm }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Diversificación</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: -4 }]}>Por tipo de instrumento, sobre lo invertido</Text>
            {byAssetClass.map((row) => (
              <View key={row.assetClass} style={{ gap: 4 }}>
                <View style={styles.rowBetween}>
                  <Text style={[typography.caption, { color: colors.textPrimary }]}>{ASSET_CLASS_LABELS[row.assetClass]}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{Math.round(row.percent)}%</Text>
                </View>
                <ProgressBar percent={row.percent} status="normal" />
              </View>
            ))}
            {byRiskGroup.length > 0 && (
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                {byRiskGroup.map((r) => `${RISK_GROUP_LABELS[r.group]} ${Math.round(r.percent)}%`).join(' · ')}
              </Text>
            )}
          </GlassCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});

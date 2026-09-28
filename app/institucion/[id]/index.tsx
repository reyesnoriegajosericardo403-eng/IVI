import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { InstitutionMonogram } from '@/components/investments/InstitutionCard';
import { formatAsOf } from '@/components/investments/ProductInfo';
import { INSTITUTION_TYPE_LABELS, PRODUCT_MODEL_LABELS, findInstitution } from '@/data/institutions';
import { usePortfolio } from '@/services/investments/usePortfolio';
import { useTheme } from '@/theme/ThemeProvider';
import { toBaseCurrency } from '@/utils/finance';
import { formatCurrency, formatPercent } from '@/utils/format';

// Segundo nivel: una institución y sus productos/estrategias. Cada producto
// muestra lo que tienes ahí y la tasa o comisión de referencia.
export default function InstitutionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const institution = findInstitution(id);
  const { colors, typography, spacing, radius } = useTheme();
  const { valued, byInstitution, baseCurrency } = usePortfolio();
  const summary = byInstitution.get(institution.id);

  const productTotals = useMemo(() => {
    const map = new Map<string, { value: number; invested: number; gain: number; count: number }>();
    for (const v of valued) {
      if (v.placement.institution.id !== institution.id) continue;
      if (v.position.assetClass !== 'cash' && v.position.quantity <= 0) continue;
      const t = map.get(v.placement.product.id) ?? { value: 0, invested: 0, gain: 0, count: 0 };
      t.value += toBaseCurrency(v.valuation.value, v.position.currency, baseCurrency);
      t.invested += toBaseCurrency(v.position.amountInvested, v.position.currency, baseCurrency);
      t.gain += v.valuation.gain !== null ? toBaseCurrency(v.valuation.gain, v.position.currency, baseCurrency) : 0;
      t.count += 1;
      map.set(v.placement.product.id, t);
    }
    return map;
  }, [valued, institution.id, baseCurrency]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.lg }]}>
        <Pressable accessibilityLabel="Regresar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/inversiones'))}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.title, { color: colors.textPrimary, marginLeft: spacing.md, flex: 1 }]} numberOfLines={1}>
          {institution.name}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }}>
        <GlassCard style={{ gap: spacing.sm }}>
          <View style={styles.row}>
            <InstitutionMonogram institution={institution} size={52} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.micro, { color: colors.textTertiary }]}>
                {INSTITUTION_TYPE_LABELS[institution.type].toUpperCase()}
                {institution.formerly ? ` · ANTES ${institution.formerly.toUpperCase()}` : ''}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{institution.tagline}</Text>
            </View>
          </View>
          {summary ? (
            <View style={{ gap: 2 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Tu saldo aquí</Text>
              <Text style={[typography.display, { color: colors.textPrimary, fontVariant: ['tabular-nums'] }]}>
                {formatCurrency(summary.value, baseCurrency)}
              </Text>
              {summary.gain !== 0 && (
                <Text style={[typography.caption, { color: summary.gain >= 0 ? colors.success : colors.danger, fontWeight: '700' }]}>
                  {summary.gain >= 0 ? '+' : ''}
                  {formatCurrency(summary.gain, baseCurrency)}
                  {summary.invested > 0 ? ` (${formatPercent((summary.gain / summary.invested) * 100)})` : ''}
                </Text>
              )}
            </View>
          ) : (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              Todavía no registras nada aquí. Elige el producto donde tienes tu dinero.
            </Text>
          )}
          {institution.officialUrl && (
            <Pressable accessibilityLabel="Sitio oficial" onPress={() => Linking.openURL(institution.officialUrl!).catch(() => {})}>
              <Text style={[typography.micro, { color: colors.accentFrom }]}>Sitio oficial →</Text>
            </Pressable>
          )}
        </GlassCard>

        <Text style={[typography.caption, { color: colors.textSecondary }]}>PRODUCTOS</Text>
        {institution.products.map((product) => {
          const t = productTotals.get(product.id);
          const asOf = formatAsOf(product.asOf);
          const reference =
            product.referenceAnnualRate != null
              ? `Tasa de referencia ${product.referenceAnnualRate}% anual${asOf ? ` (${asOf})` : ''}`
              : product.model === 'cetes'
                ? 'Tasa en vivo de la subasta de Banxico'
                : product.commission.description;
          return (
            <Pressable
              key={product.id}
              accessibilityLabel={`Abrir ${product.name}`}
              onPress={() => router.push(`/institucion/${institution.id}/${product.id}`)}
            >
              <GlassCard style={{ gap: spacing.xs }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.headline, { color: colors.textPrimary }]}>{product.name}</Text>
                    <Text style={[typography.micro, { color: colors.textTertiary }]}>
                      {PRODUCT_MODEL_LABELS[product.model]} · {product.currency}
                    </Text>
                  </View>
                  {t ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700', fontVariant: ['tabular-nums'] }]}>
                        {formatCurrency(t.value, baseCurrency)}
                      </Text>
                      {t.gain !== 0 && (
                        <Text style={[typography.micro, { color: t.gain >= 0 ? colors.success : colors.danger, fontWeight: '700' }]}>
                          {t.gain >= 0 ? '+' : ''}
                          {formatCurrency(t.gain, baseCurrency)}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View style={[styles.addPill, { borderColor: colors.accentFrom, borderRadius: radius.pill }]}>
                      <Text style={{ color: colors.accentFrom, fontWeight: '700', fontSize: 12 }}>Agregar</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} style={{ marginLeft: spacing.sm }} />
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={2}>
                  {reference}
                </Text>
              </GlassCard>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  addPill: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },
});

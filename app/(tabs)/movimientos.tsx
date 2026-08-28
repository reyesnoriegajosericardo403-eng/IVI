import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/CategoryIcon';
import { GlassCard } from '@/components/GlassCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { findCategory, findSubcategory } from '@/data/categories';
import type { Transaction } from '@/data/types';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency, formatRelativeDay } from '@/utils/format';

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
  const transactions = useAppStore((s) => s.transactions);

  const sections = useMemo(() => groupByDay(transactions), [transactions]);
  const flatData = useMemo(() => sections.flatMap((s) => [{ type: 'header' as const, title: s.title }, ...s.data.map((t) => ({ type: 'tx' as const, tx: t }))]), [sections]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <ScreenHeader title="Movimientos" subtitle={`${transactions.length} registrados`} />
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="mic-outline" size={40} color={colors.textTertiary} />
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }]}>
            Toca el botón de voz para registrar tu primer movimiento en segundos.
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item, idx) => (item.type === 'header' ? `h-${item.title}-${idx}` : item.tx.id)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.sm }}
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

      <Pressable
        onPress={() => router.push('/transaction/new')}
        style={[styles.addBtn, { backgroundColor: colors.surfaceSolid, borderColor: colors.surfaceBorder, borderRadius: radius.pill }]}
      >
        <Ionicons name="add" size={20} color={colors.accentFrom} />
        <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700', marginLeft: 4 }]}>
          Registro manual
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  txCard: { flexDirection: 'row', alignItems: 'center' },
  addBtn: {
    position: 'absolute',
    right: 20,
    bottom: 130,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
});

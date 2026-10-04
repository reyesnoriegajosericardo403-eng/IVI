import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { CategoryIcon } from '@/components/CategoryIcon';
import { DateField } from '@/components/DateField';
import { GlassCard } from '@/components/GlassCard';
import { findCategory, findSubcategory } from '@/data/categories';
import type { Transaction } from '@/data/types';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { todayIsoLocal } from '@/utils/forecast';
import { formatCurrency } from '@/utils/format';
import { dayWithRelativeEs } from '@/utils/p3Labels';
import { addDaysIso } from '@/utils/recurrence';

import { SmallButton } from './Chips';

// Un movimiento PREVISTO con lo que se puede hacer con él: confirmar que ya ocurrió (con otro monto si cambió),
// marcar que no ocurrió o posponerlo. Nada mueve saldos hasta confirmar.
export function ForecastCard({ tx }: { tx: Transaction }) {
  const { colors, typography, spacing } = useTheme();
  const confirmForecast = useAppStore((s) => s.confirmForecast);
  const skipForecast = useAppStore((s) => s.skipForecast);
  const postponeForecast = useAppStore((s) => s.postponeForecast);
  const accountName = useAppStore((s) => s.accounts.find((a) => a.id === tx.accountId && !a.deletedAt)?.name);
  const [mode, setMode] = useState<'idle' | 'amount' | 'postpone'>('idle');
  const [amountText, setAmountText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const today = todayIsoLocal();
  const day = tx.date.slice(0, 10);
  const overdue = day < today;
  const category = findCategory(tx.categoryId);
  const sub = findSubcategory(tx.categoryId, tx.subcategoryId);
  const sign = tx.type === 'income' ? '+' : '-';

  const run = (res: { ok: boolean; error?: string }) => {
    if (!res.ok) setError(res.error ?? 'No se pudo.');
    else {
      setError(null);
      setMode('idle');
    }
  };

  const confirmWithAmount = () => {
    const v = parseFloat(amountText.replace(',', '.'));
    if (!Number.isFinite(v) || v <= 0) return setError('Escribe un monto mayor que cero.');
    run(confirmForecast(tx.id, { amount: v }));
  };

  return (
    <GlassCard style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <CategoryIcon categoryId={tx.categoryId} size={18} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]} numberOfLines={1}>
            {tx.merchant || sub?.name || category?.name}
          </Text>
          <Text style={[typography.caption, { color: overdue ? colors.warning : colors.textSecondary }]}>
            {dayWithRelativeEs(today, day)}
            {accountName ? ` · ${accountName}` : ''}
          </Text>
        </View>
        <Text style={[typography.headline, { color: tx.type === 'income' ? colors.success : colors.textPrimary }]}>
          {sign}
          {formatCurrency(tx.amount, tx.currency)}
        </Text>
      </View>

      {overdue && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
          <Text style={[typography.caption, { color: colors.warning, flex: 1 }]}>Ya pasó la fecha: confirma si ocurrió o márcalo como que no.</Text>
        </View>
      )}

      {mode === 'amount' && (
        <View style={{ gap: spacing.sm }}>
          <TextInput
            keyboardType="decimal-pad"
            value={amountText}
            onChangeText={setAmountText}
            placeholder={`Monto real (previsto ${formatCurrency(tx.amount, tx.currency)})`}
            placeholderTextColor={colors.textTertiary}
            style={{ color: colors.textPrimary, borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: 12, backgroundColor: colors.surfaceSolid, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 }}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SmallButton label="Confirmar" tone="primary" onPress={confirmWithAmount} />
            <SmallButton label="Cancelar" onPress={() => setMode('idle')} />
          </View>
        </View>
      )}

      {mode === 'postpone' && (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <SmallButton label="Mañana" onPress={() => run(postponeForecast(tx.id, addDaysIso(today, 1)))} />
            <SmallButton label="En una semana" onPress={() => run(postponeForecast(tx.id, addDaysIso(today, 7)))} />
            <SmallButton label="Cancelar" onPress={() => setMode('idle')} />
          </View>
          <DateField value="" onChange={(iso) => run(postponeForecast(tx.id, iso))} placeholder="Elegir otra fecha" />
        </View>
      )}

      {mode === 'idle' && (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <SmallButton label="Ya ocurrió" tone="primary" onPress={() => run(confirmForecast(tx.id))} />
          <SmallButton label="Otro monto" onPress={() => setMode('amount')} />
          <SmallButton label="Posponer" onPress={() => setMode('postpone')} />
          <SmallButton label="No ocurrió" tone="danger" onPress={() => run(skipForecast(tx.id))} />
        </View>
      )}

      {error && <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>}
    </GlassCard>
  );
}

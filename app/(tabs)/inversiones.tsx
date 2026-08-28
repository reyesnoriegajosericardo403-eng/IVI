import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ASSET_CLASSES, ASSET_CLASS_LABELS } from '@/data/investmentMeta';
import type { AssetClass, Currency, InvestmentPosition, SyncMeta } from '@/data/types';
import { selectActiveInvestments } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency } from '@/utils/format';

type Draft<T> = Omit<T, keyof SyncMeta>;

export default function Inversiones() {
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const rawInvestments = useAppStore((s) => s.investments);
  const addInvestment = useAppStore((s) => s.addInvestment);
  const deleteInvestment = useAppStore((s) => s.deleteInvestment);

  const [showForm, setShowForm] = useState(false);
  const investments = useMemo(() => selectActiveInvestments(rawInvestments), [rawInvestments]);

  const totalInvested = investments.reduce((sum, i) => sum + i.amountInvested, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.lg }}>
        <ScreenHeader title="Inversiones" subtitle="Tus posiciones registradas" />

        <GlassCard style={{ gap: 4 }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Total invertido</Text>
          <Text style={[typography.display, { color: colors.textPrimary }]}>
            {formatCurrency(totalInvested, profile.primaryCurrency)}
          </Text>
          <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
            Suma de montos invertidos por posición. El valor de mercado en vivo y el rendimiento llegan en la
            Fase 4, cuando se conecte una fuente de precios real.
          </Text>
        </GlassCard>

        {investments.length === 0 && !showForm && (
          <Text style={[typography.caption, { color: colors.textTertiary }]}>Aún no registras inversiones.</Text>
        )}

        {investments.map((inv) => (
          <GlassCard key={inv.id} style={styles.row}>
            <View style={[styles.tickerBadge, { backgroundColor: colors.accentSoft, borderRadius: radius.md }]}>
              <Text style={{ color: colors.accentFrom, fontWeight: '700', fontSize: 12 }}>{inv.ticker.slice(0, 4)}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.headline, { color: colors.textPrimary }]}>{inv.name}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {ASSET_CLASS_LABELS[inv.assetClass]} · {inv.quantity} u. · prom. {formatCurrency(inv.avgCostPrice, inv.currency)}
              </Text>
            </View>
            <Text style={[typography.headline, { color: colors.textPrimary, marginRight: spacing.sm }]}>
              {formatCurrency(inv.amountInvested, inv.currency)}
            </Text>
            <Pressable onPress={() => deleteInvestment(inv.id)}>
              <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
            </Pressable>
          </GlassCard>
        ))}

        {showForm ? (
          <InvestmentForm
            defaultCurrency={profile.primaryCurrency}
            onCancel={() => setShowForm(false)}
            onSave={(inv) => {
              addInvestment(inv);
              setShowForm(false);
            }}
          />
        ) : (
          <Pressable
            onPress={() => setShowForm(true)}
            style={[styles.addBtn, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
          >
            <Ionicons name="add" size={18} color={colors.accentFrom} />
            <Text style={{ color: colors.accentFrom, fontWeight: '700', marginLeft: 6 }}>Agregar inversión</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InvestmentForm({
  onSave,
  onCancel,
  defaultCurrency,
}: {
  onSave: (i: Draft<InvestmentPosition>) => void;
  onCancel: () => void;
  defaultCurrency: Currency;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [assetClass, setAssetClass] = useState<AssetClass>('stock');
  const [amountInvested, setAmountInvested] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [broker, setBroker] = useState('');

  const canSave =
    ticker.trim().length > 0 &&
    amountInvested.length > 0 &&
    avgPrice.length > 0 &&
    !Number.isNaN(parseFloat(amountInvested)) &&
    !Number.isNaN(parseFloat(avgPrice)) &&
    parseFloat(avgPrice) > 0;

  const handleSave = () => {
    const amount = parseFloat(amountInvested.replace(',', '.'));
    const price = parseFloat(avgPrice.replace(',', '.'));
    if (Number.isNaN(amount) || Number.isNaN(price) || price <= 0) return;
    onSave({
      ticker: ticker.trim().toUpperCase(),
      name: name.trim() || ticker.trim().toUpperCase(),
      assetClass,
      quantity: amount / price,
      avgCostPrice: price,
      currency,
      amountInvested: amount,
      purchaseDate: new Date().toISOString(),
      broker: broker.trim() || undefined,
    });
  };

  return (
    <GlassCard style={{ gap: spacing.md }}>
      <TextInput
        value={ticker}
        onChangeText={setTicker}
        placeholder="Ticker (ej. NVDA)"
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="characters"
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
      />
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Nombre del activo (opcional)"
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {ASSET_CLASSES.map((ac) => (
          <Pressable
            key={ac}
            onPress={() => setAssetClass(ac)}
            style={[
              styles.chip,
              { borderRadius: radius.pill, borderColor: assetClass === ac ? colors.accentFrom : colors.surfaceBorder, backgroundColor: assetClass === ac ? colors.accentSoft : 'transparent' },
            ]}
          >
            <Text style={{ color: assetClass === ac ? colors.accentFrom : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
              {ASSET_CLASS_LABELS[ac]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.twoCol}>
        <TextInput
          value={amountInvested}
          onChangeText={setAmountInvested}
          keyboardType="decimal-pad"
          placeholder="Monto invertido"
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { flex: 1, color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
        />
        <TextInput
          value={avgPrice}
          onChangeText={setAvgPrice}
          keyboardType="decimal-pad"
          placeholder="Precio de compra"
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { flex: 1, color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
        />
      </View>
      <View style={styles.twoCol}>
        {(['USD', 'MXN'] as Currency[]).map((c) => (
          <Pressable
            key={c}
            onPress={() => setCurrency(c)}
            style={[
              styles.currencyPill,
              { borderRadius: radius.pill, borderColor: currency === c ? colors.accentFrom : colors.surfaceBorder, backgroundColor: currency === c ? colors.accentSoft : 'transparent' },
            ]}
          >
            <Text style={{ color: currency === c ? colors.accentFrom : colors.textSecondary, fontWeight: '600' }}>{c}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={broker}
        onChangeText={setBroker}
        placeholder="Broker (opcional, ej. GBM)"
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
      />
      <View style={styles.formActions}>
        <Pressable onPress={onCancel}>
          <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
        </Pressable>
        <Pressable
          disabled={!canSave}
          onPress={handleSave}
          style={[styles.saveBtn, { backgroundColor: canSave ? colors.accentFrom : colors.surfaceBorder, borderRadius: radius.pill }]}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Guardar</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  tickerBadge: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', paddingVertical: 14 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  twoCol: { flexDirection: 'row', gap: 10 },
  currencyPill: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10 },
});

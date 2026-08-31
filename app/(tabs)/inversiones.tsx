import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateField } from '@/components/DateField';
import { GlassCard } from '@/components/GlassCard';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionToggle } from '@/components/SectionToggle';
import { Sparkline } from '@/components/Sparkline';
import {
  ASSET_CLASSES,
  ASSET_CLASS_GROUP,
  ASSET_CLASS_LABELS,
  findLiquidityPosition,
  LIQUIDITY_TICKER,
  RISK_GROUP_LABELS,
  type RiskGroup,
} from '@/data/investmentMeta';
import type { AssetClass, Currency, InvestmentPosition, SyncMeta } from '@/data/types';
import { refreshMarketData } from '@/services/market/marketDataRefresh';
import { selectActiveInvestments } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDateDMY, todayISO } from '@/utils/date';
import {
  applyInvestmentTransaction,
  investmentCurrentValue,
  investmentDailyChange,
  investmentUnrealizedPnL,
} from '@/utils/finance';
import { formatCurrency, formatPercent, formatRelativeTime } from '@/utils/format';
import { isUsMarketOpenNow } from '@/utils/marketHours';

type Draft<T> = Omit<T, keyof SyncMeta>;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export default function Inversiones() {
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const rawInvestments = useAppStore((s) => s.investments);
  const addInvestment = useAppStore((s) => s.addInvestment);
  const updateInvestment = useAppStore((s) => s.updateInvestment);
  const deleteInvestment = useAppStore((s) => s.deleteInvestment);
  const liveQuotes = useAppStore((s) => s.liveQuotes);
  const lastQuotesFetchedAt = useAppStore((s) => s.lastQuotesFetchedAt);
  const cetesRates = useAppStore((s) => s.cetesRates);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDefaultOperation, setEditingDefaultOperation] = useState<'buy' | 'sell'>('buy');
  const [carteraOpen, setCarteraOpen] = useState(false);
  const [carteraAction, setCarteraAction] = useState<'buy' | 'sell' | 'liquidity' | null>(null);
  const [liquidityDefaultCurrency, setLiquidityDefaultCurrency] = useState<Currency>(profile.primaryCurrency);
  const [refreshing, setRefreshing] = useState(false);
  const investments = useMemo(() => selectActiveInvestments(rawInvestments), [rawInvestments]);

  // Liquidez: efectivo disponible en la cartera, sin invertir todavía.
  // Se acredita sola al vender un activo y se ajusta a mano desde Cartera
  // → Depositar/retirar liquidez (spec: "cuando se venda una acción se
  // debe quedar el liquidez"). Nunca baja de cero.
  const adjustLiquidity = (delta: number, currency: Currency) => {
    const existing = findLiquidityPosition(investments, currency);
    const newAmount = Math.max(0, (existing?.amountInvested ?? 0) + delta);
    if (existing) {
      updateInvestment(existing.id, { quantity: newAmount, amountInvested: newAmount, avgCostPrice: 1 });
    } else if (newAmount > 0) {
      addInvestment({
        ticker: LIQUIDITY_TICKER,
        name: 'Liquidez',
        assetClass: 'cash',
        quantity: newAmount,
        avgCostPrice: 1,
        currency,
        amountInvested: newAmount,
        purchaseDate: todayISO(),
      });
    }
  };

  const totalInvested = investments.reduce((sum, i) => sum + i.amountInvested, 0);
  const totalRealizedPnL = investments.reduce((sum, i) => sum + (i.realizedPnL ?? 0), 0);
  const hasRealizedActivity = investments.some((i) => i.realizedPnL);
  const hasAnyLiveQuote = investments.some((i) => liveQuotes[i.ticker]);
  const totalCurrentValue = investments.reduce((sum, i) => sum + investmentCurrentValue(i, liveQuotes), 0);
  const totalUnrealizedPnL = investments.reduce((sum, i) => sum + (investmentUnrealizedPnL(i, liveQuotes) ?? 0), 0);
  const totalUnrealizedPercent = totalInvested > 0 ? (totalUnrealizedPnL / totalInvested) * 100 : 0;
  const totalDailyChange = investments.reduce((sum, i) => sum + (investmentDailyChange(i, liveQuotes) ?? 0), 0);
  const marketOpen = isUsMarketOpenNow();
  const hasCetesPosition = investments.some((i) => i.assetClass === 'cetes');

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    try {
      await refreshMarketData(true);
    } finally {
      setRefreshing(false);
    }
  };

  const byAssetClass = useMemo(() => {
    const map = new Map<AssetClass, number>();
    for (const inv of investments) {
      map.set(inv.assetClass, (map.get(inv.assetClass) ?? 0) + inv.amountInvested);
    }
    return Array.from(map.entries())
      .map(([assetClass, amount]) => ({ assetClass, amount, percent: totalInvested > 0 ? (amount / totalInvested) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [investments, totalInvested]);

  const byRiskGroup = useMemo(() => {
    const map = new Map<RiskGroup, number>();
    for (const inv of investments) {
      const group = ASSET_CLASS_GROUP[inv.assetClass];
      map.set(group, (map.get(group) ?? 0) + inv.amountInvested);
    }
    return (['fixed', 'variable'] as RiskGroup[]).map((group) => ({
      group,
      amount: map.get(group) ?? 0,
      percent: totalInvested > 0 ? ((map.get(group) ?? 0) / totalInvested) * 100 : 0,
    }));
  }, [investments, totalInvested]);

  const sellable = investments.filter((i) => i.assetClass !== 'cash');

  const cumulativeCapital = useMemo(() => {
    const sorted = [...investments].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));
    let running = 0;
    return sorted.map((inv) => {
      running += inv.amountInvested;
      return running;
    });
  }, [investments]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.lg }}>
        <ScreenHeader title="Inversiones" subtitle="Tus posiciones registradas" />

        {investments.length > 0 && (
          <GlassCard style={{ gap: spacing.sm }}>
            <View style={styles.rowBetween}>
              <View style={styles.row}>
                <View style={[styles.statusDot, { backgroundColor: marketOpen ? colors.success : colors.textTertiary }]} />
                <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 6 }]}>
                  {marketOpen ? 'Mercado de EE. UU. abierto' : 'Mercado de EE. UU. cerrado'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Actualizar precios"
                onPress={handleRefreshPrices}
                disabled={refreshing}
                style={[
                  styles.refreshBtn,
                  { borderColor: colors.surfaceBorder, borderRadius: radius.pill, opacity: refreshing ? 0.6 : 1 },
                ]}
              >
                <Ionicons name="refresh" size={14} color={colors.accentFrom} />
                <Text style={{ color: colors.accentFrom, fontWeight: '700', fontSize: 12, marginLeft: 4 }}>
                  {refreshing ? 'Actualizando…' : 'Actualizar precios'}
                </Text>
              </Pressable>
            </View>
            <Text style={[typography.micro, { color: colors.textTertiary }]}>
              {lastQuotesFetchedAt
                ? `Precios actualizados ${formatRelativeTime(lastQuotesFetchedAt)} · se reprograman solas cada 15 min mientras el mercado está abierto.`
                : 'Aún no se han consultado precios en vivo para tus posiciones.'}
            </Text>
          </GlassCard>
        )}

        <GlassCard style={{ gap: 4 }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Total invertido</Text>
          <Text style={[typography.display, { color: colors.textPrimary }]}>
            {formatCurrency(totalInvested, profile.primaryCurrency)}
          </Text>
          {hasAnyLiveQuote ? (
            <>
              <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Valor de mercado ahora</Text>
                <Text style={[typography.headline, { color: colors.textPrimary }]}>
                  {formatCurrency(totalCurrentValue, profile.primaryCurrency)}
                </Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Rendimiento no realizado</Text>
                <Text style={[typography.headline, { color: totalUnrealizedPnL >= 0 ? colors.success : colors.danger }]}>
                  {totalUnrealizedPnL >= 0 ? '+' : ''}
                  {formatCurrency(totalUnrealizedPnL, profile.primaryCurrency)} ({formatPercent(totalUnrealizedPercent)})
                </Text>
              </View>
              {totalDailyChange !== 0 && (
                <View style={styles.rowBetween}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Cambio de hoy</Text>
                  <Text
                    style={[
                      typography.caption,
                      { color: totalDailyChange >= 0 ? colors.success : colors.danger, fontWeight: '700' },
                    ]}
                  >
                    {totalDailyChange >= 0 ? '+' : ''}
                    {formatCurrency(totalDailyChange, profile.primaryCurrency)}
                  </Text>
                </View>
              )}
              <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                Calculado solo con las posiciones que tienen precio en vivo conectado. Las demás se cuentan por su
                monto invertido.
              </Text>
            </>
          ) : (
            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
              El valor de mercado en vivo y el rendimiento no realizado aparecen aquí en cuanto haya una cotización
              real disponible para tus tickers.
            </Text>
          )}
        </GlassCard>

        {hasRealizedActivity && (
          <GlassCard style={{ gap: 4 }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Rendimiento realizado</Text>
            <Text style={[typography.display, { color: totalRealizedPnL >= 0 ? colors.success : colors.danger }]}>
              {totalRealizedPnL >= 0 ? '+' : ''}
              {formatCurrency(totalRealizedPnL, profile.primaryCurrency)}
            </Text>
            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
              Ganancia o pérdida ya realizada en tus ventas, calculada solo con tus propios precios de compra y
              venta. No incluye posiciones que todavía no vendes.
            </Text>
          </GlassCard>
        )}

        {hasCetesPosition && cetesRates && (
          <GlassCard style={{ gap: spacing.sm }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Tasa CETES vigente</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: -4 }]}>
              Tasa oficial de rendimiento (Banxico) — no es un precio de mercado por unidad: los CETES se liquidan a
              su valor nominal al vencimiento, así que no calculamos una ganancia o pérdida que no existe.
            </Text>
            <View style={styles.cetesGrid}>
              {(
                [
                  ['28 DÍAS', cetesRates.d28],
                  ['91 DÍAS', cetesRates.d91],
                  ['182 DÍAS', cetesRates.d182],
                  ['364 DÍAS', cetesRates.d364],
                ] as const
              ).map(([label, rate]) => (
                <View key={label} style={styles.cetesCell}>
                  <Text style={[typography.micro, { color: colors.textTertiary }]}>{label}</Text>
                  <Text style={[typography.headline, { color: colors.textPrimary }]}>
                    {rate !== null ? `${rate.toFixed(2)}%` : '—'}
                  </Text>
                </View>
              ))}
            </View>
            {cetesRates.asOf && (
              <Text style={[typography.caption, { color: colors.textTertiary }]}>
                Última subasta: {/^\d{4}-\d{2}-\d{2}$/.test(cetesRates.asOf) ? formatDateDMY(cetesRates.asOf) : cetesRates.asOf}
              </Text>
            )}
          </GlassCard>
        )}

        {investments.length > 0 && (
          <GlassCard style={{ gap: spacing.sm }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Diversificación</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: -4 }]}>Por tipo de instrumento</Text>
            {byAssetClass.map((row) => (
              <View key={row.assetClass} style={{ gap: 4 }}>
                <View style={styles.rowBetween}>
                  <Text style={[typography.caption, { color: colors.textPrimary }]}>{ASSET_CLASS_LABELS[row.assetClass]}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{Math.round(row.percent)}%</Text>
                </View>
                <ProgressBar percent={row.percent} status="normal" />
              </View>
            ))}

            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              Renta fija vs. renta variable
            </Text>
            {byRiskGroup
              .filter((r) => r.amount > 0)
              .map((row) => (
                <View key={row.group} style={{ gap: 4 }}>
                  <View style={styles.rowBetween}>
                    <Text style={[typography.caption, { color: colors.textPrimary }]}>{RISK_GROUP_LABELS[row.group]}</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>{Math.round(row.percent)}%</Text>
                  </View>
                  <ProgressBar percent={row.percent} status="normal" />
                </View>
              ))}

            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.sm }]}>
              Diversificación por sector: no disponible — nuestra fuente de precios en vivo no incluye ese dato.
              No mostramos un sector inventado.
            </Text>
          </GlassCard>
        )}

        {cumulativeCapital.length >= 2 && (
          <GlassCard style={{ gap: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Capital invertido acumulado</Text>
            <Sparkline data={cumulativeCapital} color={colors.accentFrom} width={300} height={60} />
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              Muestra cómo ha crecido tu capital invertido según la fecha de alta de cada posición — no es una
              gráfica de rendimiento de mercado.
            </Text>
          </GlassCard>
        )}

        {investments.length === 0 && (
          <Text style={[typography.caption, { color: colors.textTertiary }]}>Aún no registras inversiones.</Text>
        )}

        {investments.map((inv) => {
          const quote = liveQuotes[inv.ticker];
          const currentValue = investmentCurrentValue(inv, liveQuotes);
          const unrealized = investmentUnrealizedPnL(inv, liveQuotes);
          const dailyChange = investmentDailyChange(inv, liveQuotes);

          return editingId === inv.id ? (
            <TransactionForm
              key={inv.id}
              position={inv}
              defaultOperation={editingDefaultOperation}
              onCancel={() => setEditingId(null)}
              onSave={(patch, sale) => {
                updateInvestment(inv.id, patch);
                if (sale && sale.proceeds > 0) adjustLiquidity(sale.proceeds, sale.currency);
                setEditingId(null);
              }}
            />
          ) : (
            <GlassCard key={inv.id} style={{ gap: spacing.xs }}>
              <View style={styles.row}>
                <View style={[styles.tickerBadge, { backgroundColor: colors.accentSoft, borderRadius: radius.md }]}>
                  <Text style={{ color: colors.accentFrom, fontWeight: '700', fontSize: 12 }}>{inv.ticker.slice(0, 4)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={[typography.headline, { color: colors.textPrimary }]}>{inv.name}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {inv.assetClass === 'cash'
                      ? 'Efectivo disponible en tu cartera'
                      : `${ASSET_CLASS_LABELS[inv.assetClass]} · ${inv.quantity} u. · prom. ${formatCurrency(inv.avgCostPrice, inv.currency)}`}
                  </Text>
                </View>
                <Text style={[typography.headline, { color: colors.textPrimary, marginRight: spacing.sm }]}>
                  {formatCurrency(currentValue, inv.currency)}
                </Text>
                <Pressable
                  accessibilityLabel={`Editar ${inv.ticker}`}
                  onPress={() => {
                    if (inv.assetClass === 'cash') {
                      setCarteraOpen(true);
                      setCarteraAction('liquidity');
                      setLiquidityDefaultCurrency(inv.currency);
                    } else {
                      setEditingId(inv.id);
                      setEditingDefaultOperation('buy');
                    }
                  }}
                  style={{ marginRight: spacing.sm }}
                >
                  <Ionicons name="pencil-outline" size={16} color={colors.textTertiary} />
                </Pressable>
                <Pressable accessibilityLabel={`Eliminar ${inv.ticker}`} onPress={() => deleteInvestment(inv.id)}>
                  <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                </Pressable>
              </View>
              {quote ? (
                <View style={{ marginLeft: 52, gap: 2 }}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Precio en vivo: {formatCurrency(quote.price, inv.currency)}
                    {quote.stale ? ' (último precio conocido)' : ''}
                  </Text>
                  <View style={styles.row}>
                    {unrealized !== null && (
                      <Text
                        style={[
                          typography.caption,
                          { color: unrealized >= 0 ? colors.success : colors.danger, fontWeight: '700' },
                        ]}
                      >
                        No realizado: {unrealized >= 0 ? '+' : ''}
                        {formatCurrency(unrealized, inv.currency)}
                      </Text>
                    )}
                    {dailyChange !== null && (
                      <Text
                        style={[
                          typography.caption,
                          { color: dailyChange >= 0 ? colors.success : colors.danger, marginLeft: spacing.sm },
                        ]}
                      >
                        Hoy: {dailyChange >= 0 ? '+' : ''}
                        {formatCurrency(dailyChange, inv.currency)}
                      </Text>
                    )}
                  </View>
                </View>
              ) : (
                <Text style={[typography.caption, { color: colors.textTertiary, marginLeft: 52 }]}>
                  {inv.assetClass === 'cetes'
                    ? 'Los CETES no tienen precio de mercado por unidad — revisa la tasa vigente arriba.'
                    : inv.assetClass === 'cash'
                      ? 'La liquidez no tiene precio de mercado: es efectivo listo para invertir o retirar.'
                      : `Precio en vivo no disponible para ${inv.ticker}.`}
                </Text>
              )}
              {!!inv.realizedPnL && (
                <Text
                  style={[
                    typography.caption,
                    { color: inv.realizedPnL >= 0 ? colors.success : colors.danger, marginLeft: 52 },
                  ]}
                >
                  Realizado: {inv.realizedPnL >= 0 ? '+' : ''}
                  {formatCurrency(inv.realizedPnL, inv.currency)}
                </Text>
              )}
              {inv.notes && (
                <Text style={[typography.caption, { color: colors.textTertiary, marginLeft: 52 }]}>{inv.notes}</Text>
              )}
            </GlassCard>
          );
        })}

        <SectionToggle
          title="Cartera"
          open={carteraOpen}
          onToggle={() => {
            setCarteraOpen((v) => !v);
            setCarteraAction(null);
          }}
        />

        {carteraOpen && (
          <View style={{ gap: spacing.sm }}>
            {carteraAction === null && (
              <>
                <Pressable
                  accessibilityLabel="Comprar activo"
                  onPress={() => setCarteraAction('buy')}
                  style={[styles.carteraOption, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.accentFrom} />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>Comprar activo</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      Registra una acción, ETF, FIBRA, CETE, bono, fondo o cripto nuevos
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  accessibilityLabel="Vender activo"
                  onPress={() => sellable.length > 0 && setCarteraAction('sell')}
                  style={[styles.carteraOption, { borderColor: colors.surfaceBorder, borderRadius: radius.md, opacity: sellable.length === 0 ? 0.5 : 1 }]}
                >
                  <Ionicons name="remove-circle-outline" size={20} color={colors.danger} />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>Vender activo</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {sellable.length === 0 ? 'Aún no tienes activos para vender' : 'Elige una posición existente y registra la venta'}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  accessibilityLabel="Depositar o retirar liquidez"
                  onPress={() => {
                    setCarteraAction('liquidity');
                    setLiquidityDefaultCurrency(profile.primaryCurrency);
                  }}
                  style={[styles.carteraOption, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
                >
                  <Ionicons name="cash-outline" size={20} color={colors.accentFrom} />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>Depositar o retirar liquidez</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      Efectivo disponible en tu cartera, listo para invertir cuando quieras
                    </Text>
                  </View>
                </Pressable>
              </>
            )}

            {carteraAction === 'buy' && (
              <InvestmentForm
                defaultCurrency={profile.primaryCurrency}
                onCancel={() => setCarteraAction(null)}
                onSave={(inv) => {
                  addInvestment(inv);
                  setCarteraAction(null);
                  setCarteraOpen(false);
                }}
              />
            )}

            {carteraAction === 'sell' && (
              <GlassCard style={{ gap: spacing.sm }}>
                <Text style={[typography.headline, { color: colors.textPrimary }]}>¿Qué quieres vender?</Text>
                {sellable.map((inv) => (
                  <Pressable
                    key={inv.id}
                    accessibilityLabel={`Vender ${inv.ticker}`}
                    onPress={() => {
                      setEditingId(inv.id);
                      setEditingDefaultOperation('sell');
                      setCarteraAction(null);
                      setCarteraOpen(false);
                    }}
                    style={[styles.sellRow, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
                  >
                    <Text style={[typography.body, { color: colors.textPrimary }]}>
                      {inv.ticker} · {inv.name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>{inv.quantity} u.</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setCarteraAction(null)}>
                  <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
                </Pressable>
              </GlassCard>
            )}

            {carteraAction === 'liquidity' && (
              <LiquidityForm
                investments={investments}
                defaultCurrency={liquidityDefaultCurrency}
                onCancel={() => setCarteraAction(null)}
                onSave={(delta, currency) => {
                  adjustLiquidity(delta, currency);
                  setCarteraAction(null);
                  setCarteraOpen(false);
                }}
              />
            )}
          </View>
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
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency === 'MXN' ? 'MXN' : 'USD');
  const [commission, setCommission] = useState('');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');

  const qtyNum = parseFloat(quantity.replace(',', '.'));
  const priceNum = parseFloat(price.replace(',', '.'));
  const commissionNum = parseFloat(commission.replace(',', '.')) || 0;

  const canSave =
    ticker.trim().length > 0 &&
    !Number.isNaN(qtyNum) &&
    qtyNum > 0 &&
    !Number.isNaN(priceNum) &&
    priceNum > 0 &&
    date.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const qty = round4(qtyNum);
    onSave({
      ticker: ticker.trim().toUpperCase(),
      name: name.trim() || ticker.trim().toUpperCase(),
      assetClass,
      quantity: qty,
      avgCostPrice: priceNum,
      currency,
      amountInvested: qty * priceNum + commissionNum,
      purchaseDate: date.trim(),
      fees: commissionNum || undefined,
      notes: notes.trim() || undefined,
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
        placeholder="Nombre de la empresa (opcional)"
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
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
          placeholder="Cantidad (hasta 4 decimales)"
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { flex: 1, color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
        />
        <TextInput
          value={price}
          onChangeText={setPrice}
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
        value={commission}
        onChangeText={setCommission}
        keyboardType="decimal-pad"
        placeholder="Comisión cobrada (opcional)"
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
      />
      <DateField value={date} onChange={setDate} placeholder="Fecha de la operación" />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Nota (opcional)"
        placeholderTextColor={colors.textTertiary}
        multiline
        style={[styles.input, styles.notesInput, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
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

function TransactionForm({
  position,
  defaultOperation = 'buy',
  onSave,
  onCancel,
}: {
  position: InvestmentPosition;
  defaultOperation?: 'buy' | 'sell';
  onSave: (patch: Partial<Draft<InvestmentPosition>>, sale?: { proceeds: number; currency: Currency }) => void;
  onCancel: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [operation, setOperation] = useState<'buy' | 'sell'>(defaultOperation);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [commission, setCommission] = useState('');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState(position.notes ?? '');

  const qtyNum = parseFloat(quantity.replace(',', '.'));
  const priceNum = parseFloat(price.replace(',', '.'));
  const commissionNum = parseFloat(commission.replace(',', '.')) || 0;

  const canSave =
    !Number.isNaN(qtyNum) &&
    qtyNum > 0 &&
    !Number.isNaN(priceNum) &&
    priceNum > 0 &&
    (operation === 'buy' || qtyNum <= position.quantity);

  const handleSave = () => {
    if (!canSave) return;
    const sellQty = round4(qtyNum);
    const result = applyInvestmentTransaction(position, {
      operation,
      quantity: sellQty,
      price: priceNum,
      commission: commissionNum,
    });
    const patch = {
      quantity: result.quantity,
      avgCostPrice: result.avgCostPrice,
      amountInvested: result.amountInvested,
      realizedPnL: result.realizedPnL,
      notes: notes.trim() || undefined,
    };
    if (operation === 'sell') {
      // El importe de la venta se acredita como liquidez — nunca
      // desaparece del seguimiento de la cartera (spec: "cuando se venda
      // una acción se debe quedar el liquidez").
      const proceeds = Math.min(sellQty, position.quantity) * priceNum - commissionNum;
      onSave(patch, { proceeds, currency: position.currency });
    } else {
      onSave(patch);
    }
  };

  return (
    <GlassCard style={{ gap: spacing.md }}>
      <Text style={[typography.headline, { color: colors.textPrimary }]}>{position.ticker} · {position.name}</Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: -8 }]}>
        Tienes {position.quantity} u. a un costo promedio de {formatCurrency(position.avgCostPrice, position.currency)}
      </Text>
      <View style={styles.twoCol}>
        {(['buy', 'sell'] as const).map((op) => (
          <Pressable
            key={op}
            accessibilityLabel={op === 'buy' ? 'Registrar compra' : 'Registrar venta'}
            onPress={() => setOperation(op)}
            style={[
              styles.opChip,
              { borderRadius: radius.pill, borderColor: operation === op ? colors.accentFrom : colors.surfaceBorder, backgroundColor: operation === op ? colors.accentSoft : 'transparent' },
            ]}
          >
            <Text style={{ color: operation === op ? colors.accentFrom : colors.textSecondary, fontWeight: '700' }}>
              {op === 'buy' ? 'Compra' : 'Venta'}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.twoCol}>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
          placeholder="Cantidad"
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { flex: 1, color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
        />
        <TextInput
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder={operation === 'buy' ? 'Precio de compra' : 'Precio de venta'}
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { flex: 1, color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
        />
      </View>
      {operation === 'sell' && qtyNum > position.quantity && (
        <Text style={[typography.caption, { color: colors.danger }]}>No puedes vender más de lo que tienes.</Text>
      )}
      <TextInput
        value={commission}
        onChangeText={setCommission}
        keyboardType="decimal-pad"
        placeholder="Comisión cobrada (opcional)"
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
      />
      <DateField value={date} onChange={setDate} placeholder="Fecha de la operación" />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Nota (opcional)"
        placeholderTextColor={colors.textTertiary}
        multiline
        style={[styles.input, styles.notesInput, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
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

function LiquidityForm({
  investments,
  defaultCurrency,
  onSave,
  onCancel,
}: {
  investments: InvestmentPosition[];
  defaultCurrency: Currency;
  onSave: (delta: number, currency: Currency) => void;
  onCancel: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [currency, setCurrency] = useState<Currency>(defaultCurrency === 'MXN' ? 'MXN' : 'USD');
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amountText, setAmountText] = useState('');

  // La liquidez se lleva POR MONEDA (vender una acción en USD no debe
  // mezclarse con tu efectivo en MXN) — hay que elegir cuál se está
  // depositando o retirando, en vez de asumir siempre la moneda
  // principal del perfil.
  const currentAmount = findLiquidityPosition(investments, currency)?.amountInvested ?? 0;
  const amountNum = parseFloat(amountText.replace(',', '.')) || 0;
  const canSave = amountNum > 0 && (mode === 'deposit' || amountNum <= currentAmount);

  return (
    <GlassCard style={{ gap: spacing.md }}>
      <Text style={[typography.headline, { color: colors.textPrimary }]}>Liquidez</Text>
      <View style={styles.twoCol}>
        {(['USD', 'MXN'] as Currency[]).map((c) => (
          <Pressable
            key={c}
            accessibilityLabel={`Liquidez en ${c}`}
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
      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: -4 }]}>
        Ahora tienes {formatCurrency(currentAmount, currency)} disponibles sin invertir.
      </Text>
      <View style={styles.twoCol}>
        {(['deposit', 'withdraw'] as const).map((m) => (
          <Pressable
            key={m}
            accessibilityLabel={m === 'deposit' ? 'Depositar liquidez' : 'Retirar liquidez'}
            onPress={() => setMode(m)}
            style={[
              styles.opChip,
              { borderRadius: radius.pill, borderColor: mode === m ? colors.accentFrom : colors.surfaceBorder, backgroundColor: mode === m ? colors.accentSoft : 'transparent' },
            ]}
          >
            <Text style={{ color: mode === m ? colors.accentFrom : colors.textSecondary, fontWeight: '700' }}>
              {m === 'deposit' ? 'Depositar' : 'Retirar'}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={amountText}
        onChangeText={setAmountText}
        keyboardType="decimal-pad"
        placeholder="Monto"
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
      />
      {mode === 'withdraw' && amountNum > currentAmount && (
        <Text style={[typography.caption, { color: colors.danger }]}>No puedes retirar más de lo que tienes en liquidez.</Text>
      )}
      <Text style={[typography.caption, { color: colors.textTertiary }]}>
        {mode === 'deposit'
          ? 'Súmalo cuando metas dinero a tu cartera para invertir después.'
          : 'Réstalo cuando saques ese efectivo de tu cartera — no lo mueve automáticamente a ninguna cuenta.'}
      </Text>
      <View style={styles.formActions}>
        <Pressable onPress={onCancel}>
          <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
        </Pressable>
        <Pressable
          disabled={!canSave}
          onPress={() => onSave(mode === 'deposit' ? amountNum : -amountNum, currency)}
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tickerBadge: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  cetesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cetesCell: { minWidth: '22%', gap: 2 },
  carteraOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1 },
  sellRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderWidth: 1 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  opChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1 },
  twoCol: { flexDirection: 'row', gap: 10 },
  currencyPill: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10 },
});

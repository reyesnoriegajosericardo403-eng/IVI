import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { SummaryLine } from '@/components/investments/FormBits';
import { HoldingsTable, type HoldingsColumn, type HoldingsRow } from '@/components/investments/HoldingsTable';
import { InstitutionMonogram } from '@/components/investments/InstitutionCard';
import {
  BuyForm,
  CashForm,
  CetesForm,
  FixedTermForm,
  MoveForm,
  SavingsAdjustForm,
  SavingsForm,
  SellForm,
} from '@/components/investments/InvestmentForms';
import { ProductInfo } from '@/components/investments/ProductInfo';
import { ASSET_CLASS_LABELS } from '@/data/investmentMeta';
import { findInstitution, OTHER_INSTITUTION } from '@/data/institutions';
import type { Currency, InvestmentPosition } from '@/data/types';
import { usePortfolio, type ValuedPosition } from '@/services/investments/usePortfolio';
import { addCetes, addFixedTerm, removePosition } from '@/store/investmentActions';
import { useTheme } from '@/theme/ThemeProvider';
import { todayISO } from '@/utils/date';
import { toBaseCurrency } from '@/utils/finance';
import { formatCurrency, formatPercent } from '@/utils/format';
import { dailyYieldEstimate, fixedTermEstimate, productLiquidity } from '@/utils/investmentModels';

type Panel =
  | { kind: 'buy'; presetId?: string }
  | { kind: 'sell'; id: string }
  | { kind: 'cash' }
  | { kind: 'savings' }
  | { kind: 'adjust'; id: string }
  | { kind: 'fixed' }
  | { kind: 'cetes' }
  | { kind: 'move'; id: string }
  | null;

const money = (n: number, c: Currency) => formatCurrency(n, c, 2);

function shortDate(iso: string | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

function trimNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

// Tercer nivel: un producto (p.ej. GBM → Trading USA) con la tabla de tus
// activos, igual que en la app de la institución, y las acciones que tienen
// sentido para su modelo de cálculo.
export default function ProductScreen() {
  const { id, product: productId } = useLocalSearchParams<{ id: string; product: string }>();
  const institution = findInstitution(id);
  const product = institution.products.find((p) => p.id === productId) ?? institution.products[0];
  const { colors, typography, spacing, radius } = useTheme();
  const { valued, byInstitution, cetesRates } = usePortfolio();
  const [panel, setPanel] = useState<Panel>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const here: ValuedPosition[] = useMemo(
    () =>
      valued.filter(
        (v) =>
          v.placement.institution.id === institution.id &&
          v.placement.product.id === product.id &&
          v.position.assetClass !== 'cash' &&
          v.position.quantity > 0
      ),
    [valued, institution.id, product.id]
  );
  const allPositions = useMemo(() => valued.map((v) => v.position), [valued]);
  const closedRealized = valued
    .filter((v) => v.placement.institution.id === institution.id && v.placement.product.id === product.id)
    .reduce((sum, v) => sum + toBaseCurrency(v.position.realizedPnL ?? 0, v.position.currency, product.currency), 0);

  const currencies: Currency[] = product.currency === 'USD' ? ['USD', 'MXN'] : ['MXN', 'USD'];
  const cash: Partial<Record<Currency, number>> = {};
  for (const c of currencies) cash[c] = productLiquidity(allPositions, institution.id, product.id, c)?.amountInvested ?? 0;
  const tierBasis = byInstitution.get(institution.id)?.invested ?? 0;
  const isMarket = product.model === 'brokerage' || product.model === 'fund' || product.model === 'crypto';

  // Esta pantalla habla en la moneda del producto (Trading USA en dólares, Cajitas en pesos).
  const shown: Currency = product.currency;
  const totalValue = here.reduce((s, v) => s + toBaseCurrency(v.valuation.value, v.position.currency, shown), 0);
  const totalInvested = here.reduce((s, v) => s + toBaseCurrency(v.position.amountInvested, v.position.currency, shown), 0);
  const totalGain = here.reduce((s, v) => s + (v.valuation.gain !== null ? toBaseCurrency(v.valuation.gain, v.position.currency, shown) : 0), 0);
  const cashTotal = currencies.reduce((s, c) => s + toBaseCurrency(cash[c] ?? 0, c, shown), 0);

  const selected = here.find((v) => v.position.id === selectedId) ?? null;
  const findPos = (pid: string) => valued.find((v) => v.position.id === pid)?.position;

  const closePanel = () => setPanel(null);
  const openPanel = (p: Panel) => {
    setPanel(p);
    setSelectedId(null);
    setConfirmDeleteId(null);
  };

  // ---------- Tabla según el modelo ----------
  // La moneda del producto se dice una vez arriba de la tabla; solo una
  // posición en otra moneda conserva su sufijo para no confundirse.
  const cell = (n: number, c: Currency) => {
    const full = formatCurrency(n, c, 2);
    return c === product.currency ? full.replace(/\s(MXN|USD)$/, '') : full;
  };
  const { columns, rows } = useMemo((): { columns: HoldingsColumn[]; rows: HoldingsRow[] } => {
    if (product.model === 'daily_yield') {
      return {
        columns: [
          { key: 'name', label: 'APARTADO', width: 120, align: 'left' },
          { key: 'balance', label: 'SALDO EST.', width: 112 },
          { key: 'gain', label: 'RENDIMIENTO', width: 104 },
          { key: 'rate', label: 'TASA', width: 64 },
          { key: 'month', label: 'AL MES', width: 92 },
        ],
        rows: here.map(({ position: p, valuation }) => {
          const monthly = dailyYieldEstimate(valuation.value, p.annualRate ?? 0, todayISO(), product.capAmount ?? null, new Date(Date.now() + 30 * 86_400_000)).gain;
          return {
            id: p.id,
            cells: {
              name: { text: p.name, sub: `desde ${shortDate(p.purchaseDate)}`, bold: true },
              balance: { text: cell(valuation.value, p.currency), bold: true },
              rate: { text: p.annualRate != null ? `${p.annualRate}%` : '—' },
              gain: { text: `+${cell(valuation.gain ?? 0, p.currency)}`, tone: 'positive' },
              month: { text: `+${cell(monthly, p.currency)}`, tone: 'muted' },
            },
          };
        }),
      };
    }
    if (product.model === 'fixed_term') {
      return {
        columns: [
          { key: 'name', label: 'INVERSIÓN', width: 120, align: 'left' },
          { key: 'final', label: 'AL VENCER', width: 112 },
          { key: 'due', label: 'VENCE', width: 84 },
          { key: 'amount', label: 'MONTO', width: 108 },
          { key: 'rate', label: 'TASA', width: 64 },
          { key: 'term', label: 'PLAZO', width: 64 },
        ],
        rows: here.map(({ position: p }) => {
          const est = fixedTermEstimate(p.amountInvested, p.annualRate ?? 0, p.termDays ?? 0, p.purchaseDate);
          return {
            id: p.id,
            cells: {
              name: { text: p.name, sub: est.matured ? 'Vencida' : `día ${est.daysElapsed} de ${p.termDays}`, bold: true },
              amount: { text: cell(p.amountInvested, p.currency) },
              rate: { text: p.annualRate != null ? `${p.annualRate}%` : '—' },
              term: { text: p.termDays ? `${p.termDays} d` : '—' },
              due: { text: shortDate(p.maturityDate ?? est.maturityDate), tone: est.matured ? 'negative' : undefined },
              final: { text: cell(est.atMaturity, p.currency), sub: `+${cell(est.interestAtMaturity, p.currency)}`, tone: 'positive', bold: true },
            },
          };
        }),
      };
    }
    if (product.model === 'cetes') {
      return {
        columns: [
          { key: 'name', label: 'EMISIÓN', width: 104, align: 'left' },
          { key: 'net', label: 'AL VENCER NETO', width: 124 },
          { key: 'due', label: 'VENCE', width: 84 },
          { key: 'invested', label: 'INVERTIDO', width: 108 },
          { key: 'titles', label: 'TÍTULOS', width: 72 },
          { key: 'rate', label: 'TASA', width: 64 },
        ],
        rows: here.map(({ position: p }) => {
          const atMaturity = p.quantity * 10;
          const isr = p.amountInvested * 0.009 * ((p.termDays ?? 28) / 365);
          const matured = !!p.maturityDate && p.maturityDate <= todayISO();
          return {
            id: p.id,
            cells: {
              name: { text: p.name.replace(' días', 'd'), sub: `compra ${shortDate(p.purchaseDate)}`, bold: true },
              titles: { text: String(p.quantity) },
              invested: { text: cell(p.amountInvested, 'MXN') },
              rate: { text: p.annualRate != null ? `${p.annualRate}%` : '—' },
              due: { text: shortDate(p.maturityDate), tone: matured ? 'negative' : undefined },
              net: { text: cell(atMaturity - isr, 'MXN'), sub: `+${cell(atMaturity - isr - p.amountInvested, 'MXN')}`, tone: 'positive', bold: true },
            },
          };
        }),
      };
    }
    return {
      columns: [
        { key: 'ticker', label: 'EMISORA', width: 96, align: 'left' },
        { key: 'value', label: 'VALOR', width: 112 },
        { key: 'gain', label: 'RENDIMIENTO', width: 112 },
        { key: 'qty', label: 'TÍTULOS', width: 72 },
        { key: 'price', label: 'PRECIO', width: 104 },
        { key: 'avg', label: 'COSTO PROM.', width: 104 },
      ],
      rows: here.map(({ position: p, valuation }) => {
        const price = valuation.live ? valuation.value / p.quantity : null;
        const pct = valuation.gain !== null && p.amountInvested > 0 ? (valuation.gain / p.amountInvested) * 100 : null;
        return {
          id: p.id,
          cells: {
            ticker: { text: p.ticker, sub: p.name !== p.ticker ? p.name : ASSET_CLASS_LABELS[p.assetClass], bold: true },
            qty: { text: trimNumber(p.quantity) },
            avg: { text: cell(p.avgCostPrice, p.currency) },
            price: price !== null ? { text: cell(price, p.currency), sub: 'en vivo' } : { text: 'Sin precio', tone: 'muted' },
            value: { text: cell(valuation.value, p.currency), bold: true },
            gain:
              valuation.gain !== null
                ? {
                    text: `${valuation.gain >= 0 ? '+' : ''}${cell(valuation.gain, p.currency)}`,
                    sub: pct !== null ? formatPercent(pct, 2) : undefined,
                    tone: valuation.gain >= 0 ? 'positive' : 'negative',
                  }
                : { text: '—', tone: 'muted' },
          },
        };
      }),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [here, product.model, product.capAmount, product.currency]);

  // ---------- Acciones principales ----------
  const primaryActions: Array<{ label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean }> = isMarket
    ? [
        { label: 'Comprar', icon: 'add-circle-outline', onPress: () => openPanel({ kind: 'buy' }) },
        {
          label: 'Vender',
          icon: 'remove-circle-outline',
          onPress: () => (here.length === 1 ? openPanel({ kind: 'sell', id: here[0].position.id }) : setPanel(null)),
          disabled: here.length === 0,
        },
        { label: 'Efectivo', icon: 'cash-outline', onPress: () => openPanel({ kind: 'cash' }) },
      ]
    : product.model === 'daily_yield'
      ? [{ label: 'Agregar saldo', icon: 'add-circle-outline', onPress: () => openPanel({ kind: 'savings' }) }]
      : product.model === 'fixed_term'
        ? [{ label: 'Nueva inversión', icon: 'add-circle-outline', onPress: () => openPanel({ kind: 'fixed' }) }]
        : [{ label: 'Comprar CETES', icon: 'add-circle-outline', onPress: () => openPanel({ kind: 'cetes' }) }];

  const renderPanel = () => {
    if (!panel) return null;
    const done = () => setPanel(null);
    switch (panel.kind) {
      case 'buy':
        return (
          <BuyForm
            institutionId={institution.id}
            product={product}
            tierBasis={tierBasis}
            cashAvailable={cash[panel.presetId ? findPos(panel.presetId)?.currency ?? product.currency : product.currency] ?? 0}
            preset={panel.presetId ? findPos(panel.presetId) : undefined}
            onDone={done}
            onCancel={closePanel}
          />
        );
      case 'sell': {
        const pos = findPos(panel.id);
        return pos ? <SellForm position={pos} product={product} tierBasis={tierBasis} onDone={done} onCancel={closePanel} /> : null;
      }
      case 'cash':
        return <CashForm institutionId={institution.id} product={product} currencies={currencies} balances={cash} onDone={done} onCancel={closePanel} />;
      case 'savings':
        return <SavingsForm institutionId={institution.id} product={product} onDone={done} onCancel={closePanel} />;
      case 'adjust': {
        const v = valued.find((x) => x.position.id === panel.id);
        return v ? <SavingsAdjustForm position={v.position} estimatedValue={v.valuation.value} onDone={done} onCancel={closePanel} /> : null;
      }
      case 'fixed':
        return <FixedTermForm institutionId={institution.id} product={product} onDone={done} onCancel={closePanel} />;
      case 'cetes':
        return <CetesForm institutionId={institution.id} product={product} cetesRates={cetesRates} onDone={done} onCancel={closePanel} />;
      case 'move': {
        const pos = findPos(panel.id);
        return pos ? <MoveForm position={pos} onDone={done} onCancel={closePanel} /> : null;
      }
    }
  };

  const reinvest = (p: InvestmentPosition) => {
    if (product.model === 'cetes') {
      const net = p.quantity * 10 - p.amountInvested * 0.009 * ((p.termDays ?? 28) / 365);
      const key = `d${p.termDays ?? 28}` as 'd28' | 'd91' | 'd182' | 'd364';
      const rate = cetesRates?.[key] ?? p.annualRate ?? 0;
      if (rate > 0) addCetes({ institutionId: institution.id, product, amount: net, annualRate: rate, termDays: p.termDays ?? 28, date: todayISO() });
    } else {
      const est = fixedTermEstimate(p.amountInvested, p.annualRate ?? 0, p.termDays ?? 28, p.purchaseDate);
      addFixedTerm({ institutionId: institution.id, product, name: p.name, amount: est.atMaturity, annualRate: p.annualRate ?? 0, termDays: p.termDays ?? 28, startDate: todayISO() });
    }
    removePosition(p);
    setSelectedId(null);
  };

  const renderDetail = (v: ValuedPosition) => {
    const p = v.position;
    const matured = !!p.maturityDate && p.maturityDate <= todayISO();
    const actions: Array<{ label: string; onPress: () => void; tone?: 'danger' }> = [];
    if (isMarket) {
      actions.push({ label: 'Comprar más', onPress: () => openPanel({ kind: 'buy', presetId: p.id }) });
      actions.push({ label: 'Vender', onPress: () => openPanel({ kind: 'sell', id: p.id }) });
    } else if (product.model === 'daily_yield') {
      actions.push({ label: 'Depositar / retirar / saldo real', onPress: () => openPanel({ kind: 'adjust', id: p.id }) });
    } else if (matured) {
      actions.push({ label: 'Reinvertir al mismo plazo', onPress: () => reinvest(p) });
    }
    actions.push({ label: 'Mover a otra institución', onPress: () => openPanel({ kind: 'move', id: p.id }) });
    actions.push({
      label: confirmDeleteId === p.id ? 'Toca otra vez para eliminar' : matured ? 'Ya lo retiré (eliminar)' : 'Eliminar registro',
      tone: 'danger',
      onPress: () => {
        if (confirmDeleteId === p.id) {
          removePosition(p);
          setSelectedId(null);
          setConfirmDeleteId(null);
        } else {
          setConfirmDeleteId(p.id);
        }
      },
    });

    return (
      <GlassCard style={{ gap: spacing.sm }}>
        <View style={styles.rowBetween}>
          <Text style={[typography.headline, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>
            {p.ticker === p.name || !isMarket ? p.name : `${p.ticker} · ${p.name}`}
          </Text>
          <Pressable accessibilityLabel="Cerrar detalle" onPress={() => setSelectedId(null)}>
            <Ionicons name="close" size={20} color={colors.textTertiary} />
          </Pressable>
        </View>
        <SummaryLine label={v.valuation.estimated ? 'Valor estimado hoy' : 'Valor'} value={money(v.valuation.value, p.currency)} />
        <SummaryLine label="Invertido" value={money(p.amountInvested, p.currency)} />
        {v.valuation.gain !== null && (
          <SummaryLine label="Rendimiento" value={`${v.valuation.gain >= 0 ? '+' : ''}${money(v.valuation.gain, p.currency)}`} tone={v.valuation.gain >= 0 ? 'positive' : 'negative'} />
        )}
        {!!p.realizedPnL && <SummaryLine label="Realizado en ventas" value={money(p.realizedPnL, p.currency)} tone={p.realizedPnL >= 0 ? 'positive' : 'negative'} />}
        {!!p.fees && <SummaryLine label="Comisiones pagadas" value={money(p.fees, p.currency)} tone="muted" />}
        {matured && <Text style={[typography.caption, { color: colors.warning }]}>Esta inversión ya venció.</Text>}
        <View style={{ gap: 6, marginTop: 4 }}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityLabel={a.label}
              onPress={a.onPress}
              style={[styles.detailAction, { borderColor: a.tone === 'danger' ? colors.danger : colors.surfaceBorder, borderRadius: radius.md }]}
            >
              <Text style={{ color: a.tone === 'danger' ? colors.danger : colors.textPrimary, fontWeight: '600' }}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>
    );
  };

  const liveCetes = product.model === 'cetes' && cetesRates;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.lg }]}>
        <Pressable
          accessibilityLabel="Regresar"
          onPress={() => (router.canGoBack() ? router.back() : router.replace(`/institucion/${institution.id}`))}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <View style={{ marginLeft: spacing.md }}>
          <InstitutionMonogram institution={institution} size={30} />
        </View>
        <View style={{ marginLeft: spacing.sm, flex: 1 }}>
          <Text style={[typography.micro, { color: colors.textTertiary }]} numberOfLines={1}>
            {institution.id === OTHER_INSTITUTION.id ? 'OTRAS INVERSIONES' : institution.name.toUpperCase()}
          </Text>
          <Text style={[typography.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {product.name}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }}>
        <GlassCard style={{ gap: 4 }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {isMarket ? 'Valor total (posiciones + efectivo)' : product.model === 'fixed_term' || product.model === 'cetes' ? 'Valor acumulado hoy' : 'Saldo estimado hoy'}
          </Text>
          <Text style={[typography.display, { color: colors.textPrimary, fontVariant: ['tabular-nums'] }]}>
            {formatCurrency(totalValue + (isMarket ? cashTotal : 0), shown, 2)}
          </Text>
          {totalGain !== 0 && (
            <Text style={[typography.caption, { color: totalGain >= 0 ? colors.success : colors.danger, fontWeight: '700' }]}>
              {totalGain >= 0 ? '+' : ''}
              {formatCurrency(totalGain, shown, 2)}
              {totalInvested > 0 ? ` (${formatPercent((totalGain / totalInvested) * 100, 2)})` : ''}
              {product.model !== 'brokerage' && product.model !== 'crypto' ? ' · estimado, antes de impuestos' : ''}
            </Text>
          )}
          {isMarket && (
            <View style={{ marginTop: spacing.sm, gap: 4 }}>
              <SummaryLine label="En posiciones" value={formatCurrency(totalValue, shown, 2)} />
              {currencies
                .filter((c) => (cash[c] ?? 0) > 0 || c === product.currency)
                .map((c) => (
                  <SummaryLine key={c} label={`Efectivo disponible ${c}`} value={money(cash[c] ?? 0, c)} />
                ))}
              {closedRealized !== 0 && (
                <SummaryLine label="Ganancia realizada en ventas" value={formatCurrency(closedRealized, shown, 2)} tone={closedRealized >= 0 ? 'positive' : 'negative'} />
              )}
            </View>
          )}
          <View style={[styles.actionsRow, { marginTop: spacing.md }]}>
            {primaryActions.map((a) => (
              <Pressable
                key={a.label}
                accessibilityLabel={a.label}
                disabled={a.disabled}
                onPress={a.onPress}
                style={[styles.actionBtn, { borderColor: colors.surfaceBorder, borderRadius: radius.pill, opacity: a.disabled ? 0.45 : 1 }]}
              >
                <Ionicons name={a.icon} size={16} color={colors.accentFrom} />
                <Text style={{ color: colors.accentFrom, fontWeight: '700', marginLeft: 6 }}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
          {isMarket && here.length > 1 && (
            <Text style={[typography.micro, { color: colors.textTertiary }]}>Para vender, toca la emisora en la tabla.</Text>
          )}
        </GlassCard>

        {renderPanel()}

        {liveCetes && (
          <GlassCard style={{ gap: spacing.sm }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Tasas de la última subasta</Text>
            <View style={styles.ratesGrid}>
              {(
                [
                  ['28 días', cetesRates.d28],
                  ['91 días', cetesRates.d91],
                  ['182 días', cetesRates.d182],
                  ['364 días', cetesRates.d364],
                ] as const
              ).map(([label, rate]) => (
                <View key={label} style={{ minWidth: '22%', gap: 2 }}>
                  <Text style={[typography.micro, { color: colors.textTertiary }]}>{label.toUpperCase()}</Text>
                  <Text style={[typography.headline, { color: colors.textPrimary }]}>{rate !== null ? `${rate.toFixed(2)}%` : '—'}</Text>
                </View>
              ))}
            </View>
            <Text style={[typography.micro, { color: colors.textTertiary }]}>Fuente: Banxico{cetesRates.asOf ? ` · ${cetesRates.asOf}` : ''}</Text>
          </GlassCard>
        )}

        <GlassCard padded={false} style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}>
          <Text style={[typography.caption, { color: colors.textSecondary, paddingVertical: spacing.xs }]}>
            {isMarket ? 'TUS POSICIONES' : product.model === 'cetes' ? 'TUS CETES' : product.model === 'fixed_term' ? 'TUS INVERSIONES' : 'TUS APARTADOS'}
          </Text>
          {rows.length > 0 && (
            <Text style={[typography.micro, { color: colors.textTertiary }]}>
              Cifras en {product.currency}
              {columns.reduce((w, c) => w + c.width, 0) > 340 ? ' · desliza la tabla para ver más columnas →' : ''}
            </Text>
          )}
          <HoldingsTable
            columns={columns}
            rows={rows}
            onRowPress={(rowId) => {
              setSelectedId((cur) => (cur === rowId ? null : rowId));
              setConfirmDeleteId(null);
              setPanel(null);
            }}
            emptyText={
              isMarket
                ? 'Aún no registras posiciones aquí. Toca "Comprar" para agregar la primera.'
                : 'Aún no registras nada aquí. Usa el botón de arriba para agregarlo.'
            }
          />
        </GlassCard>

        {selected && renderDetail(selected)}

        <ProductInfo product={product} initiallyOpen={here.length === 0} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  detailAction: { borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12 },
  ratesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});

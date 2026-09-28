import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { DateField } from '@/components/DateField';
import { GlassCard } from '@/components/GlassCard';
import { ASSET_CLASS_LABELS } from '@/data/investmentMeta';
import { ALL_INSTITUTIONS, type InstitutionProduct } from '@/data/institutions';
import type { AssetClass, Currency, InvestmentPosition } from '@/data/types';
import type { CetesRates } from '@/providers/types';
import {
  addCetes,
  addFixedTerm,
  addSavings,
  adjustProductCash,
  buyAsset,
  movePosition,
  rebaseSavings,
  sellAsset,
} from '@/store/investmentActions';
import { useTheme } from '@/theme/ThemeProvider';
import { todayISO } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import { cetesPurchase, dailyYieldEstimate, fixedTermEstimate, placePosition, tradeCommission } from '@/utils/investmentModels';

import { ChipRow, Field, FormActions, SummaryLine, parseAmount } from './FormBits';

const money = (n: number, c: Currency) => formatCurrency(n, c, 2);

function FormCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <GlassCard style={{ gap: spacing.md }}>
      <View style={{ gap: 2 }}>
        <Text style={[typography.headline, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle && <Text style={[typography.caption, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {children}
    </GlassCard>
  );
}

// ---------- Comprar (bolsa, fondos, cripto) ----------

export function BuyForm({
  institutionId,
  product,
  tierBasis,
  cashAvailable,
  preset,
  onDone,
  onCancel,
}: {
  institutionId: string;
  product: InstitutionProduct;
  tierBasis: number;
  cashAvailable: number;
  preset?: InvestmentPosition;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { colors, typography } = useTheme();
  const [ticker, setTicker] = useState(preset?.ticker ?? '');
  const [name, setName] = useState(preset?.name ?? '');
  const [assetClass, setAssetClass] = useState<AssetClass>(preset?.assetClass ?? product.assetClasses[0] ?? 'stock');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(todayISO());
  const [commissionText, setCommissionText] = useState<string | null>(null);
  const currency: Currency = preset?.currency ?? product.currency;

  const qty = parseAmount(quantity);
  const px = parseAmount(price);
  const gross = qty > 0 && px > 0 ? qty * px : 0;
  const suggested = tradeCommission(product.commission, gross, tierBasis);
  const commission = commissionText !== null ? parseAmount(commissionText) || 0 : suggested?.total ?? 0;
  const total = gross + commission;
  const canUseCash = cashAvailable > 0;
  const [payFromCash, setPayFromCash] = useState(canUseCash);
  const insufficient = payFromCash && total > cashAvailable + 0.005;
  const canSave = ticker.trim().length > 0 && qty > 0 && px > 0 && !insufficient;

  return (
    <FormCard title={preset ? `Comprar más ${preset.ticker}` : `Comprar en ${product.name}`} subtitle={`Operación en ${currency}`}>
      {!preset && (
        <>
          <Field value={ticker} onChangeText={setTicker} placeholder="Emisora / ticker (ej. VOO, WALMEX)" autoCapitalize="characters" />
          <Field value={name} onChangeText={setName} placeholder="Nombre (opcional)" />
          {product.assetClasses.length > 1 && (
            <ChipRow
              options={product.assetClasses.map((ac) => ({ value: ac, label: ASSET_CLASS_LABELS[ac] }))}
              value={assetClass}
              onChange={setAssetClass}
            />
          )}
        </>
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field style={{ flex: 1 }} label="Títulos" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="0" />
        <Field style={{ flex: 1 }} label="Precio por título" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" />
      </View>
      <Field
        label={suggested ? `Comisión (${(suggested.rate * 100).toFixed(3).replace(/0+$/, '')}%${product.commission.plusIVA ? ' + IVA' : ''}, editable)` : 'Comisión cobrada'}
        value={commissionText ?? (suggested ? suggested.total.toFixed(2) : '')}
        onChangeText={setCommissionText}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      <DateField value={date} onChange={setDate} placeholder="Fecha de la operación" />
      {gross > 0 && (
        <View style={{ gap: 4 }}>
          <SummaryLine label="Importe" value={money(gross, currency)} />
          <SummaryLine label="Comisión" value={money(commission, currency)} />
          <SummaryLine label="Total a pagar" value={money(total, currency)} />
        </View>
      )}
      {canUseCash && (
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: payFromCash }} onPress={() => setPayFromCash((v) => !v)}>
          <Text style={[typography.caption, { color: payFromCash ? colors.accentFrom : colors.textSecondary, fontWeight: '700' }]}>
            {payFromCash ? '☑' : '☐'} Pagar con tu efectivo disponible ({money(cashAvailable, currency)})
          </Text>
        </Pressable>
      )}
      {insufficient && <Text style={[typography.caption, { color: colors.danger }]}>No te alcanza el efectivo disponible.</Text>}
      <FormActions
        onCancel={onCancel}
        canSave={canSave}
        saveLabel="Registrar compra"
        onSave={() => {
          buyAsset({
            institutionId,
            product,
            ticker,
            name,
            assetClass,
            quantity: qty,
            price: px,
            commission,
            currency,
            date,
            payFromCash: payFromCash && canUseCash,
          });
          onDone();
        }}
      />
    </FormCard>
  );
}

// ---------- Vender ----------

export function SellForm({
  position,
  product,
  tierBasis,
  onDone,
  onCancel,
}: {
  position: InvestmentPosition;
  product: InstitutionProduct;
  tierBasis: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { colors, typography } = useTheme();
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [commissionText, setCommissionText] = useState<string | null>(null);
  const qty = parseAmount(quantity);
  const px = parseAmount(price);
  const gross = qty > 0 && px > 0 ? qty * px : 0;
  const suggested = tradeCommission(product.commission, gross, tierBasis);
  const commission = commissionText !== null ? parseAmount(commissionText) || 0 : suggested?.total ?? 0;
  const tooMany = qty > position.quantity + 1e-9;
  const realized = qty > 0 && px > 0 ? Math.min(qty, position.quantity) * (px - position.avgCostPrice) - commission : 0;
  const canSave = qty > 0 && px > 0 && !tooMany;

  return (
    <FormCard
      title={`Vender ${position.ticker}`}
      subtitle={`Tienes ${position.quantity} títulos a ${money(position.avgCostPrice, position.currency)} promedio`}
    >
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field style={{ flex: 1 }} label="Títulos" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="0" />
        <Field style={{ flex: 1 }} label="Precio de venta" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" />
      </View>
      <Pressable onPress={() => setQuantity(String(position.quantity))}>
        <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700' }]}>Vender todo</Text>
      </Pressable>
      <Field
        label="Comisión (editable)"
        value={commissionText ?? (suggested ? suggested.total.toFixed(2) : '')}
        onChangeText={setCommissionText}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      {tooMany && <Text style={[typography.caption, { color: colors.danger }]}>No puedes vender más títulos de los que tienes.</Text>}
      {gross > 0 && !tooMany && (
        <View style={{ gap: 4 }}>
          <SummaryLine label="Recibes (queda como efectivo disponible)" value={money(gross - commission, position.currency)} />
          <SummaryLine label="Ganancia o pérdida realizada" value={money(realized, position.currency)} tone={realized >= 0 ? 'positive' : 'negative'} />
        </View>
      )}
      <FormActions
        onCancel={onCancel}
        canSave={canSave}
        saveLabel="Registrar venta"
        onSave={() => {
          sellAsset(position, { quantity: qty, price: px, commission });
          onDone();
        }}
      />
    </FormCard>
  );
}

// ---------- Efectivo disponible (depositar / retirar) ----------

export function CashForm({
  institutionId,
  product,
  currencies,
  balances,
  onDone,
  onCancel,
}: {
  institutionId: string;
  product: InstitutionProduct;
  currencies: Currency[];
  balances: Partial<Record<Currency, number>>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { colors, typography } = useTheme();
  const [currency, setCurrency] = useState<Currency>(currencies[0]);
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const current = balances[currency] ?? 0;
  const value = parseAmount(amount);
  const canSave = value > 0 && (mode === 'deposit' || value <= current + 0.005);
  return (
    <FormCard title="Efectivo disponible" subtitle={`Ahora tienes ${money(current, currency)} sin invertir en ${product.name}.`}>
      {currencies.length > 1 && (
        <ChipRow options={currencies.map((c) => ({ value: c, label: c }))} value={currency} onChange={setCurrency} />
      )}
      <ChipRow
        options={[
          { value: 'deposit', label: 'Depositar' },
          { value: 'withdraw', label: 'Retirar' },
        ]}
        value={mode}
        onChange={setMode}
      />
      <Field value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Monto" />
      {mode === 'withdraw' && value > current + 0.005 && (
        <Text style={[typography.caption, { color: colors.danger }]}>No puedes retirar más de lo que tienes disponible.</Text>
      )}
      <FormActions
        onCancel={onCancel}
        canSave={canSave}
        onSave={() => {
          adjustProductCash(mode === 'deposit' ? value : -value, currency, institutionId, product.id);
          onDone();
        }}
      />
    </FormCard>
  );
}

// ---------- Ahorro con rendimiento diario ----------

export function SavingsForm({
  institutionId,
  product,
  onDone,
  onCancel,
}: {
  institutionId: string;
  product: InstitutionProduct;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { colors, typography } = useTheme();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState(product.referenceAnnualRate != null ? String(product.referenceAnnualRate) : '');
  const [date, setDate] = useState(todayISO());
  const value = parseAmount(amount);
  const r = parseAmount(rate);
  const canSave = value > 0 && r >= 0 && r < 100;
  const month = canSave ? dailyYieldEstimate(value, r, todayISO(), product.capAmount ?? null, new Date(Date.now() + 30 * 86_400_000)) : null;
  return (
    <FormCard title={`Agregar a ${product.name}`} subtitle="Registra tu saldo actual; VALU estima el rendimiento de cada día.">
      <Field value={name} onChangeText={setName} placeholder={`Nombre (ej. "Viaje", "Fondo de emergencia")`} />
      <Field label="Saldo actual" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
      <Field label="Tasa anual que ves en tu app (%)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="Ej. 6.5" />
      {product.rateNotes && <Text style={[typography.micro, { color: colors.textTertiary }]}>{product.rateNotes}</Text>}
      <DateField value={date} onChange={setDate} placeholder="Fecha de ese saldo" />
      {month && (
        <SummaryLine label="Rendimiento estimado en 30 días (antes de impuestos)" value={`+${money(month.gain, product.currency)}`} tone="positive" />
      )}
      <FormActions
        onCancel={onCancel}
        canSave={canSave}
        onSave={() => {
          addSavings({ institutionId, product, name, amount: value, annualRate: r, date });
          onDone();
        }}
      />
    </FormCard>
  );
}

export function SavingsAdjustForm({
  position,
  estimatedValue,
  onDone,
  onCancel,
}: {
  position: InvestmentPosition;
  estimatedValue: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { colors, typography } = useTheme();
  const [mode, setMode] = useState<'deposit' | 'withdraw' | 'real'>('deposit');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState(position.annualRate != null ? String(position.annualRate) : '');
  const value = parseAmount(amount);
  const r = parseAmount(rate);
  const next = mode === 'deposit' ? estimatedValue + value : mode === 'withdraw' ? estimatedValue - value : value;
  const validAmount = value > 0 && (mode !== 'withdraw' || value <= estimatedValue + 0.005);
  const rateChanged = Number.isFinite(r) && r !== position.annualRate;
  const canSave = (validAmount || (amount.trim() === '' && rateChanged)) && Number.isFinite(r) && r >= 0;
  return (
    <FormCard title={position.name} subtitle={`Saldo estimado hoy: ${money(estimatedValue, position.currency)}`}>
      <ChipRow
        options={[
          { value: 'deposit', label: 'Depositar' },
          { value: 'withdraw', label: 'Retirar' },
          { value: 'real', label: 'Poner saldo real' },
        ]}
        value={mode}
        onChange={setMode}
      />
      <Field
        label={mode === 'real' ? 'Saldo exacto que ves en tu app' : 'Monto'}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      <Field label="Tasa anual (%)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
      {mode === 'withdraw' && value > estimatedValue + 0.005 && (
        <Text style={[typography.caption, { color: colors.danger }]}>No puedes retirar más de tu saldo.</Text>
      )}
      {validAmount && <SummaryLine label="Nuevo saldo desde hoy" value={money(next, position.currency)} />}
      <FormActions
        onCancel={onCancel}
        canSave={canSave}
        onSave={() => {
          rebaseSavings(position, validAmount ? next : estimatedValue, { annualRate: r });
          onDone();
        }}
      />
    </FormCard>
  );
}

// ---------- Inversión a plazo fijo ----------

export function FixedTermForm({
  institutionId,
  product,
  onDone,
  onCancel,
}: {
  institutionId: string;
  product: InstitutionProduct;
  onDone: () => void;
  onCancel: () => void;
}) {
  const terms = product.termDays?.length ? product.termDays : [7, 28, 91, 182, 364];
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState(product.referenceAnnualRate != null ? String(product.referenceAnnualRate) : '');
  const [term, setTerm] = useState<number>(terms[terms.length > 1 ? 1 : 0]);
  const [startDate, setStartDate] = useState(todayISO());
  const { colors, typography } = useTheme();
  const value = parseAmount(amount);
  const r = parseAmount(rate);
  const canSave = value > 0 && r > 0 && r < 100;
  const est = canSave ? fixedTermEstimate(value, r, term, startDate) : null;
  return (
    <FormCard title={`Nueva inversión en ${product.name}`} subtitle="Interés simple sobre año de 360 días, como lo calculan los bancos.">
      <Field value={name} onChangeText={setName} placeholder="Nombre (opcional)" />
      <Field label="Monto" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
      <ChipRow label="Plazo" options={terms.map((t) => ({ value: t, label: `${t} días` }))} value={term} onChange={setTerm} />
      <Field label="Tasa anual (%)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="Ej. 7.5" />
      {product.rateNotes && <Text style={[typography.micro, { color: colors.textTertiary }]}>{product.rateNotes}</Text>}
      <DateField value={startDate} onChange={setStartDate} placeholder="Fecha de inicio" />
      {est && (
        <View style={{ gap: 4 }}>
          <SummaryLine label="Vence" value={est.maturityDate.split('-').reverse().join('/')} />
          <SummaryLine label="Intereses al vencer (antes de impuestos)" value={`+${money(est.interestAtMaturity, product.currency)}`} tone="positive" />
          <SummaryLine label="Recibes al vencer" value={money(est.atMaturity, product.currency)} />
        </View>
      )}
      <FormActions
        onCancel={onCancel}
        canSave={canSave}
        onSave={() => {
          addFixedTerm({ institutionId, product, name, amount: value, annualRate: r, termDays: term, startDate });
          onDone();
        }}
      />
    </FormCard>
  );
}

// ---------- CETES ----------

const CETES_RATE_KEY: Record<number, keyof CetesRates> = { 28: 'd28', 91: 'd91', 182: 'd182', 364: 'd364' };

export function CetesForm({
  institutionId,
  product,
  cetesRates,
  onDone,
  onCancel,
}: {
  institutionId: string;
  product: InstitutionProduct;
  cetesRates: CetesRates | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { colors, typography } = useTheme();
  const [term, setTerm] = useState(28);
  const liveRate = cetesRates ? (cetesRates[CETES_RATE_KEY[term]] as number | null) : null;
  const [amount, setAmount] = useState('');
  const [rateText, setRateText] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const rate = rateText !== null ? parseAmount(rateText) : liveRate ?? NaN;
  const value = parseAmount(amount);
  const purchase = value > 0 && rate > 0 ? cetesPurchase(value, rate, term) : null;
  const canSave = !!purchase && purchase.titles > 0;
  return (
    <FormCard title="Comprar CETES" subtitle="Al vencer recibes $10 por cada título; se retiene ISR de 0.90% anual.">
      <ChipRow
        label="Plazo"
        options={[28, 91, 182, 364].map((t) => ({ value: t, label: `${t} días` }))}
        value={term}
        onChange={(t) => {
          setTerm(t);
          setRateText(null);
        }}
      />
      <Field label="Monto a invertir" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Desde $100" />
      <Field
        label={liveRate !== null && rateText === null ? 'Tasa de la última subasta (Banxico, en vivo)' : 'Tasa anual (%)'}
        value={rateText ?? (liveRate !== null ? String(liveRate) : '')}
        onChangeText={setRateText}
        keyboardType="decimal-pad"
        placeholder="Ej. 7.20"
      />
      <DateField value={date} onChange={setDate} placeholder="Fecha de compra" />
      {purchase && (
        <View style={{ gap: 4 }}>
          <SummaryLine label="Precio por título" value={formatCurrency(purchase.price, 'MXN', 6)} />
          <SummaryLine label="Títulos" value={String(purchase.titles)} />
          <SummaryLine label="Inviertes" value={money(purchase.invested, 'MXN')} />
          {purchase.leftover > 0 && <SummaryLine label="Queda sin invertir" value={money(purchase.leftover, 'MXN')} tone="muted" />}
          <SummaryLine label="Retención ISR" value={`−${money(purchase.isrRetention, 'MXN')}`} tone="muted" />
          <SummaryLine label="Recibes al vencer (neto)" value={money(purchase.netAtMaturity, 'MXN')} tone="positive" />
        </View>
      )}
      {purchase && purchase.titles === 0 && (
        <Text style={[typography.caption, { color: colors.danger }]}>El monto no alcanza para un título.</Text>
      )}
      <FormActions
        onCancel={onCancel}
        canSave={canSave}
        saveLabel="Registrar CETES"
        onSave={() => {
          addCetes({ institutionId, product, amount: value, annualRate: rate, termDays: term, date });
          onDone();
        }}
      />
    </FormCard>
  );
}

// ---------- Mover una posición a otra institución/producto ----------

export function MoveForm({ position, onDone, onCancel }: { position: InvestmentPosition; onDone: () => void; onCancel: () => void }) {
  const { colors, typography } = useTheme();
  const current = placePosition(position);
  const options = useMemo(
    () =>
      ALL_INSTITUTIONS.flatMap((inst) =>
        inst.products
          .filter((p) => position.assetClass === 'cash' ? p.model === 'brokerage' : p.assetClasses.includes(position.assetClass))
          .map((p) => ({ key: `${inst.id}:${p.id}`, label: `${inst.name} · ${p.name}`, inst: inst.id, product: p.id }))
      ),
    [position.assetClass]
  );
  const [selected, setSelected] = useState(`${current.institution.id}:${current.product.id}`);
  return (
    <FormCard title={`Mover ${position.name}`} subtitle="Elige dónde tienes realmente esta inversión.">
      <View style={{ gap: 6 }}>
        {options.map((opt) => {
          const active = opt.key === selected;
          return (
            <Pressable key={opt.key} accessibilityLabel={opt.label} onPress={() => setSelected(opt.key)}>
              <Text style={[typography.body, { color: active ? colors.accentFrom : colors.textPrimary, fontWeight: active ? '700' : '400' }]}>
                {active ? '● ' : '○ '}
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <FormActions
        onCancel={onCancel}
        canSave={selected !== `${current.institution.id}:${current.product.id}`}
        saveLabel="Mover"
        onSave={() => {
          const opt = options.find((o) => o.key === selected);
          if (opt) movePosition(position, opt.inst, opt.product);
          onDone();
        }}
      />
    </FormCard>
  );
}

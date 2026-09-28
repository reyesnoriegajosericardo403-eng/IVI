import { findLiquidityPosition } from '@/data/investmentMeta';
import {
  ALL_INSTITUTIONS,
  FISCAL_MX_2026,
  OTHER_INSTITUTION,
  findInstitution,
  type Institution,
  type InstitutionProduct,
  type ProductCommission,
} from '@/data/institutions';
import type { AssetClass, InvestmentPosition } from '@/data/types';
import type { MarketQuote } from '@/providers/types';

// Un modelo de cálculo por tipo de producto (ver src/data/institutions.ts).
// Todo lo que no viene de un precio real de mercado se marca `estimated`
// para que la pantalla nunca lo presente como un dato confirmado.

const DAY_MS = 86_400_000;

export function daysSince(fromIso: string, now: Date = new Date()): number {
  const from = Date.parse(fromIso.length === 10 ? `${fromIso}T00:00:00` : fromIso);
  if (Number.isNaN(from)) return 0;
  return Math.max(0, Math.floor((now.getTime() - from) / DAY_MS));
}

export function addDaysIso(fromIso: string, days: number): string {
  const d = new Date(fromIso.length === 10 ? `${fromIso}T00:00:00` : fromIso);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ---------- Bolsa: comisión por operación ----------

export interface TradeCost {
  rate: number;
  commission: number;
  iva: number;
  total: number;
}

// `tierBasis`: lo que el usuario tiene invertido en esa institución — las
// casas de bolsa bajan la comisión según tu nivel de inversión.
export function tradeCommission(commission: ProductCommission, amount: number, tierBasis = 0): TradeCost | null {
  if (commission.tradePercent === null || amount <= 0) return null;
  let rate = commission.tradePercent;
  if (commission.tiers?.length) {
    const tier = commission.tiers.find((t) => t.upTo === null || tierBasis <= t.upTo);
    if (tier) rate = tier.percent;
  }
  let base = amount * rate;
  if (commission.minimum && base > 0 && base < commission.minimum) base = commission.minimum;
  const iva = commission.plusIVA ? base * FISCAL_MX_2026.ivaOnCommissions : 0;
  return { rate, commission: round2(base), iva: round2(iva), total: round2(base + iva) };
}

// ---------- Ahorro con rendimiento diario (Cajitas, Smart Cash...) ----------

export interface YieldEstimate {
  value: number;
  gain: number;
  days: number;
  // Parte del saldo sobre la que NO se estimó rendimiento (excede el tope).
  aboveCap: number;
}

export function dailyYieldEstimate(
  principal: number,
  annualRatePct: number,
  fromIso: string,
  capAmount: number | null = null,
  now: Date = new Date()
): YieldEstimate {
  const days = daysSince(fromIso, now);
  const earning = capAmount !== null ? Math.min(principal, capAmount) : principal;
  const aboveCap = principal - earning;
  const grown = earning * Math.pow(1 + annualRatePct / 100 / 365, days);
  const gain = grown - earning;
  return { value: round2(principal + gain), gain: round2(gain), days, aboveCap: round2(aboveCap) };
}

// ---------- Inversión a plazo fijo (pagarés, Hey, Klar, Ahorro Congelado) ----------

export interface FixedTermEstimate {
  accruedValue: number;
  atMaturity: number;
  interestAtMaturity: number;
  maturityDate: string;
  daysElapsed: number;
  matured: boolean;
}

// Interés simple, año comercial de 360 días (convención bancaria en México).
export function fixedTermEstimate(
  principal: number,
  annualRatePct: number,
  termDays: number,
  startIso: string,
  now: Date = new Date()
): FixedTermEstimate {
  const r = annualRatePct / 100;
  const elapsed = Math.min(daysSince(startIso, now), termDays);
  const interestAtMaturity = principal * r * (termDays / 360);
  return {
    accruedValue: round2(principal + principal * r * (elapsed / 360)),
    atMaturity: round2(principal + interestAtMaturity),
    interestAtMaturity: round2(interestAtMaturity),
    maturityDate: addDaysIso(startIso.slice(0, 10), termDays),
    daysElapsed: elapsed,
    matured: daysSince(startIso, now) >= termDays,
  };
}

// ---------- CETES ----------

export const CETES_FACE_VALUE = 10;

export interface CetesPurchase {
  price: number;
  titles: number;
  invested: number;
  leftover: number;
  atMaturity: number;
  isrRetention: number;
  netAtMaturity: number;
  netGain: number;
}

// La tasa de CETES es de rendimiento, base 360: precio = 10 / (1 + r·plazo/360).
export function cetesPurchase(amount: number, annualRatePct: number, termDays: number): CetesPurchase {
  const price = CETES_FACE_VALUE / (1 + (annualRatePct / 100) * (termDays / 360));
  const titles = Math.floor(amount / price);
  const invested = titles * price;
  const atMaturity = titles * CETES_FACE_VALUE;
  // Retención de ISR: 0.90% anual (2026) sobre el capital, proporcional al plazo.
  const isrRetention = invested * FISCAL_MX_2026.isrRetentionAnnualOnCapital * (termDays / 365);
  const netAtMaturity = atMaturity - isrRetention;
  return {
    price: round6(price),
    titles,
    invested: round2(invested),
    leftover: round2(amount - invested),
    atMaturity: round2(atMaturity),
    isrRetention: round2(isrRetention),
    netAtMaturity: round2(netAtMaturity),
    netGain: round2(netAtMaturity - invested),
  };
}

export function cetesAccruedValue(position: InvestmentPosition, now: Date = new Date()): number {
  const term = position.termDays ?? 28;
  const atMaturity = position.quantity * CETES_FACE_VALUE;
  const elapsed = Math.min(daysSince(position.purchaseDate, now), term);
  return round2(position.amountInvested + (atMaturity - position.amountInvested) * (elapsed / term));
}

// ---------- Valor de una posición según su modelo ----------

export interface PositionValuation {
  value: number;
  gain: number | null;
  estimated: boolean;
  live: boolean;
}

export function valuePosition(
  position: InvestmentPosition,
  product: InstitutionProduct | undefined,
  liveQuotes: Record<string, MarketQuote>,
  now: Date = new Date()
): PositionValuation {
  if (position.assetClass === 'cash') {
    return { value: position.amountInvested, gain: null, estimated: false, live: false };
  }
  const model = product?.model ?? 'brokerage';
  if (position.assetClass === 'cetes' && position.termDays) {
    const value = cetesAccruedValue(position, now);
    return { value, gain: round2(value - position.amountInvested), estimated: true, live: false };
  }
  if (model === 'daily_yield' && position.annualRate !== undefined) {
    const est = dailyYieldEstimate(position.amountInvested, position.annualRate, position.purchaseDate, product?.capAmount ?? null, now);
    return { value: est.value, gain: est.gain, estimated: true, live: false };
  }
  if (model === 'fixed_term' && position.annualRate !== undefined && position.termDays) {
    const est = fixedTermEstimate(position.amountInvested, position.annualRate, position.termDays, position.purchaseDate, now);
    return { value: est.accruedValue, gain: round2(est.accruedValue - position.amountInvested), estimated: true, live: false };
  }
  const quote = liveQuotes[position.ticker];
  if (quote) {
    const value = position.quantity * quote.price;
    return { value: round2(value), gain: round2(value - position.amountInvested), estimated: false, live: true };
  }
  return { value: position.amountInvested, gain: null, estimated: false, live: false };
}

// ---------- Dónde vive cada posición (institución → producto) ----------

export interface Placement {
  institution: Institution;
  product: InstitutionProduct;
}

function fallbackProduct(institution: Institution, assetClass: AssetClass): InstitutionProduct | undefined {
  return institution.products.find((p) => p.assetClasses.includes(assetClass));
}

export function placePosition(position: InvestmentPosition): Placement {
  const brokerKey = position.broker?.trim().toLowerCase();
  const institution = brokerKey
    ? ALL_INSTITUTIONS.find((i) => i.id === brokerKey) ??
      ALL_INSTITUTIONS.find((i) => i.name.toLowerCase() === brokerKey || i.formerly?.toLowerCase() === brokerKey)
    : undefined;
  if (institution) {
    const product =
      institution.products.find((p) => p.id === position.product) ??
      (position.assetClass === 'cash' ? institution.products.find((p) => p.model === 'brokerage') : undefined) ??
      fallbackProduct(institution, position.assetClass);
    if (product) return { institution, product };
  }
  const other = OTHER_INSTITUTION;
  const product =
    other.products.find((p) => p.id === position.product) ??
    (position.assetClass === 'cash' ? other.products[0] : fallbackProduct(other, position.assetClass)) ??
    other.products[0];
  return { institution: other, product };
}

export function positionsIn(positions: InvestmentPosition[], institutionId: string, productId?: string): InvestmentPosition[] {
  return positions.filter((p) => {
    const place = placePosition(p);
    return place.institution.id === institutionId && (productId === undefined || place.product.id === productId);
  });
}

// El efectivo disponible de un producto: la liquidez guarda la institución
// real; las posiciones antiguas sin institución caen en "Otras → Bolsa".
export function productLiquidity(positions: InvestmentPosition[], institutionId: string, productId: string, currency: InvestmentPosition['currency']) {
  if (institutionId === OTHER_INSTITUTION.id) {
    return (
      findLiquidityPosition(positions, currency, { broker: OTHER_INSTITUTION.id, product: productId }) ??
      (productId === OTHER_INSTITUTION.products[0].id ? findLiquidityPosition(positions, currency) : undefined)
    );
  }
  return findLiquidityPosition(positions, currency, { broker: institutionId, product: productId });
}

export function institutionName(id: string | undefined): string {
  return findInstitution(id).name;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

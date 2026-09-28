import { LIQUIDITY_TICKER } from '@/data/investmentMeta';
import { OTHER_INSTITUTION, type InstitutionProduct } from '@/data/institutions';
import type { AssetClass, Currency, InvestmentPosition, SyncMeta } from '@/data/types';
import { selectActiveInvestments } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { todayISO } from '@/utils/date';
import { applyInvestmentTransaction } from '@/utils/finance';
import { addDaysIso, cetesPurchase, placePosition, productLiquidity } from '@/utils/investmentModels';

// Operaciones de Inversiones por institución → producto. Todas terminan en
// addInvestment/updateInvestment/deleteInvestment del store, así que usan la
// misma cola de sincronización que el resto de la app.

type Draft = Omit<InvestmentPosition, keyof SyncMeta>;

function active(): InvestmentPosition[] {
  return selectActiveInvestments(useAppStore.getState().investments);
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// Efectivo disponible de un producto (liquidez). Nunca baja de cero.
export function adjustProductCash(delta: number, currency: Currency, institutionId: string, productId: string): void {
  const { addInvestment, updateInvestment } = useAppStore.getState();
  const existing = productLiquidity(active(), institutionId, productId, currency);
  const next = Math.max(0, round4((existing?.amountInvested ?? 0) + delta));
  if (existing) {
    updateInvestment(existing.id, { quantity: next, amountInvested: next, avgCostPrice: 1 });
  } else if (next > 0) {
    addInvestment({
      ticker: LIQUIDITY_TICKER,
      name: 'Efectivo disponible',
      assetClass: 'cash',
      quantity: next,
      avgCostPrice: 1,
      currency,
      amountInvested: next,
      purchaseDate: todayISO(),
      broker: institutionId,
      product: productId,
    });
  }
}

export interface BuyInput {
  institutionId: string;
  product: InstitutionProduct;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  quantity: number;
  price: number;
  commission: number;
  currency: Currency;
  date: string;
  notes?: string;
  payFromCash: boolean;
}

// Si ya tienes esa emisora en el mismo producto, se promedia el costo (como
// lo muestran las apps de bolsa); si no, se abre una posición nueva.
export function buyAsset(input: BuyInput): void {
  const { addInvestment, updateInvestment } = useAppStore.getState();
  const ticker = input.ticker.trim().toUpperCase();
  const qty = round4(input.quantity);
  const existing = active().find((p) => {
    if (p.assetClass === 'cash' || p.ticker !== ticker || p.currency !== input.currency) return false;
    const place = placePosition(p);
    return place.institution.id === input.institutionId && place.product.id === input.product.id;
  });
  if (existing) {
    const result = applyInvestmentTransaction(existing, { operation: 'buy', quantity: qty, price: input.price, commission: input.commission });
    updateInvestment(existing.id, {
      quantity: result.quantity,
      avgCostPrice: result.avgCostPrice,
      amountInvested: result.amountInvested,
      fees: round4((existing.fees ?? 0) + input.commission) || undefined,
    });
  } else {
    addInvestment({
      ticker,
      name: input.name.trim() || ticker,
      assetClass: input.assetClass,
      quantity: qty,
      avgCostPrice: input.price,
      currency: input.currency,
      amountInvested: qty * input.price + input.commission,
      purchaseDate: input.date,
      fees: input.commission || undefined,
      notes: input.notes?.trim() || undefined,
      broker: input.institutionId,
      product: input.product.id,
    });
  }
  if (input.payFromCash) {
    adjustProductCash(-(qty * input.price + input.commission), input.currency, input.institutionId, input.product.id);
  }
}

export function sellAsset(position: InvestmentPosition, sale: { quantity: number; price: number; commission: number }): void {
  const { updateInvestment } = useAppStore.getState();
  const qty = Math.min(round4(sale.quantity), position.quantity);
  const result = applyInvestmentTransaction(position, { operation: 'sell', quantity: qty, price: sale.price, commission: sale.commission });
  updateInvestment(position.id, {
    quantity: result.quantity,
    avgCostPrice: result.avgCostPrice,
    amountInvested: result.amountInvested,
    realizedPnL: result.realizedPnL,
  });
  // Lo que recibes por la venta queda como efectivo disponible en ese mismo producto.
  const proceeds = qty * sale.price - sale.commission;
  if (proceeds > 0) {
    const place = placePosition(position);
    adjustProductCash(proceeds, position.currency, place.institution.id, place.product.id);
  }
}

export interface SavingsInput {
  institutionId: string;
  product: InstitutionProduct;
  name: string;
  amount: number;
  annualRate: number;
  date: string;
}

export function addSavings(input: SavingsInput): void {
  useAppStore.getState().addInvestment({
    ticker: input.product.id.toUpperCase(),
    name: input.name.trim() || input.product.name,
    assetClass: input.product.assetClasses[0] ?? 'savings',
    quantity: input.amount,
    avgCostPrice: 1,
    currency: input.product.currency,
    amountInvested: input.amount,
    purchaseDate: input.date,
    annualRate: input.annualRate,
    broker: input.institutionId,
    product: input.product.id,
  });
}

// Ahorro diario: depositar, retirar o corregir con el saldo real re-basa la
// estimación — el nuevo saldo es el punto de partida desde hoy.
export function rebaseSavings(position: InvestmentPosition, newBalance: number, patch: Partial<Draft> = {}): void {
  const balance = Math.max(0, round4(newBalance));
  useAppStore.getState().updateInvestment(position.id, {
    quantity: balance,
    amountInvested: balance,
    avgCostPrice: 1,
    purchaseDate: todayISO(),
    ...patch,
  });
}

export interface FixedTermInput {
  institutionId: string;
  product: InstitutionProduct;
  name: string;
  amount: number;
  annualRate: number;
  termDays: number;
  startDate: string;
}

export function addFixedTerm(input: FixedTermInput): void {
  useAppStore.getState().addInvestment({
    ticker: `${input.product.id.toUpperCase()}_${input.termDays}D`,
    name: input.name.trim() || `${input.product.name} ${input.termDays} días`,
    assetClass: input.product.assetClasses[0] ?? 'savings',
    quantity: input.amount,
    avgCostPrice: 1,
    currency: input.product.currency,
    amountInvested: input.amount,
    purchaseDate: input.startDate,
    annualRate: input.annualRate,
    termDays: input.termDays,
    maturityDate: addDaysIso(input.startDate, input.termDays),
    broker: input.institutionId,
    product: input.product.id,
  });
}

export interface CetesInput {
  institutionId: string;
  product: InstitutionProduct;
  amount: number;
  annualRate: number;
  termDays: number;
  date: string;
}

export function addCetes(input: CetesInput): { titles: number } {
  const purchase = cetesPurchase(input.amount, input.annualRate, input.termDays);
  if (purchase.titles <= 0) return { titles: 0 };
  useAppStore.getState().addInvestment({
    ticker: `CETES${input.termDays}`,
    name: `CETES ${input.termDays} días`,
    assetClass: 'cetes',
    quantity: purchase.titles,
    avgCostPrice: purchase.price,
    currency: 'MXN',
    amountInvested: purchase.invested,
    purchaseDate: input.date,
    annualRate: input.annualRate,
    termDays: input.termDays,
    maturityDate: addDaysIso(input.date, input.termDays),
    broker: input.institutionId,
    product: input.product.id,
  });
  return { titles: purchase.titles };
}

export function movePosition(position: InvestmentPosition, institutionId: string, productId: string): void {
  useAppStore.getState().updateInvestment(position.id, {
    broker: institutionId === OTHER_INSTITUTION.id ? OTHER_INSTITUTION.id : institutionId,
    product: productId,
  });
}

export function removePosition(position: InvestmentPosition): void {
  useAppStore.getState().deleteInvestment(position.id);
}

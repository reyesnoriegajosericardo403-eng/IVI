import type { AssetClass, InvestmentPosition } from './types';

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  stock: 'Acción',
  etf: 'ETF',
  fibra: 'FIBRA',
  cetes: 'CETES',
  bond: 'Bono',
  fund: 'Fondo',
  crypto: 'Cripto',
  cash: 'Liquidez',
  other: 'Otro',
};

// 'cash' (Liquidez) se deja fuera a propósito: no es algo que se "compre"
// desde el formulario normal de inversión — se crea y se ajusta sola al
// vender un activo, o a mano desde Cartera → Depositar/retirar liquidez
// (spec: "cuando se venda una acción se debe quedar el liquidez").
export const ASSET_CLASSES: AssetClass[] = ['stock', 'etf', 'fibra', 'cetes', 'bond', 'fund', 'crypto', 'other'];

// Clasificación simplificada renta fija vs. variable para el panel de
// diversificación — una regla general, no un dato de mercado (spec:
// nunca inventar información que no tenemos, pero sí podemos aplicar
// categorías conocidas a los propios activos del usuario).
export type RiskGroup = 'fixed' | 'variable';

export const ASSET_CLASS_GROUP: Record<AssetClass, RiskGroup> = {
  cetes: 'fixed',
  bond: 'fixed',
  cash: 'fixed',
  stock: 'variable',
  etf: 'variable',
  fibra: 'variable',
  fund: 'variable',
  crypto: 'variable',
  other: 'variable',
};

export const RISK_GROUP_LABELS: Record<RiskGroup, string> = {
  fixed: 'Renta fija',
  variable: 'Renta variable',
};

// Ticker fijo y reservado para la posición de liquidez — nunca se
// inventa una posición de "efectivo" con datos de mercado; es solo el
// dinero que ya vendiste o depositaste y todavía no reinviertes (spec:
// "cuando se venda una acción se debe quedar el liquidez").
export const LIQUIDITY_TICKER = 'LIQUIDEZ';

export function findLiquidityPosition(
  investments: InvestmentPosition[],
  currency: InvestmentPosition['currency']
): InvestmentPosition | undefined {
  return investments.find((i) => i.assetClass === 'cash' && i.ticker === LIQUIDITY_TICKER && i.currency === currency);
}

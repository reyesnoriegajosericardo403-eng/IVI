import type { AssetClass } from './types';

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  stock: 'Acción',
  etf: 'ETF',
  fibra: 'FIBRA',
  cetes: 'CETES',
  bond: 'Bono',
  fund: 'Fondo',
  crypto: 'Cripto',
  other: 'Otro',
};

export const ASSET_CLASSES: AssetClass[] = ['stock', 'etf', 'fibra', 'cetes', 'bond', 'fund', 'crypto', 'other'];

// Clasificación simplificada renta fija vs. variable para el panel de
// diversificación — una regla general, no un dato de mercado (spec:
// nunca inventar información que no tenemos, pero sí podemos aplicar
// categorías conocidas a los propios activos del usuario).
export type RiskGroup = 'fixed' | 'variable';

export const ASSET_CLASS_GROUP: Record<AssetClass, RiskGroup> = {
  cetes: 'fixed',
  bond: 'fixed',
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

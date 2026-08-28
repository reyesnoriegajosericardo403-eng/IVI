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

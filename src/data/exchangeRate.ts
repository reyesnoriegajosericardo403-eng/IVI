// FASE 1: no hay conexión aún a una fuente de tipo de cambio en vivo.
// Este valor es una referencia estática y se muestra siempre etiquetada
// como "estimado" — nunca se presenta como dato de mercado real.
// En Fase 4 esto se reemplaza por una API financiera legítima (spec #18/#42).
export const REFERENCE_USD_MXN_RATE = 18.5;

export interface ExchangeRateInfo {
  rate: number;
  isLive: boolean;
  source: string;
  updatedAt: string;
}

export function getUsdMxnRate(): ExchangeRateInfo {
  return {
    rate: REFERENCE_USD_MXN_RATE,
    isLive: false,
    source: 'Valor de referencia (Fase 1) — no es tipo de cambio en vivo',
    updatedAt: new Date().toISOString(),
  };
}

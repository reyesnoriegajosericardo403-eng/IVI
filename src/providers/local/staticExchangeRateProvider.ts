import { getUsdMxnRate, REFERENCE_USD_MXN_RATE } from '@/data/exchangeRate';
import type { Currency } from '@/data/types';
import type { ExchangeRateInfo, ExchangeRateProvider } from '../types';

// Referencia estática — no es una fuente de mercado en vivo. Se mantiene
// separada de cualquier lógica de negocio para que en Fase 4 baste con
// registrar un ExchangeRateProvider real (ej. una API de tipo de cambio)
// sin tocar el resto de la app (spec 18, 42, 80).
export const staticExchangeRateProvider: ExchangeRateProvider = {
  name: 'static-reference',
  async getRate(from: Currency, to: Currency): Promise<ExchangeRateInfo> {
    if (from === to) {
      return { rate: 1, isLive: false, source: 'Misma moneda', updatedAt: new Date().toISOString() };
    }
    const usdMxn = getUsdMxnRate();
    if (from === 'USD' && to === 'MXN') return usdMxn;
    if (from === 'MXN' && to === 'USD') {
      return { ...usdMxn, rate: 1 / REFERENCE_USD_MXN_RATE };
    }
    // Otras monedas: sin tabla de referencia todavía en Fase 1.
    return { rate: 1, isLive: false, source: 'Sin fuente configurada para este par', updatedAt: new Date().toISOString() };
  },
};

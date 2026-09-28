import { useMemo } from 'react';

import type { Institution } from '@/data/institutions';
import type { Currency, InvestmentPosition } from '@/data/types';
import { selectActiveInvestments } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { toBaseCurrency } from '@/utils/finance';
import { placePosition, valuePosition, type Placement, type PositionValuation } from '@/utils/investmentModels';

export interface ValuedPosition {
  position: InvestmentPosition;
  placement: Placement;
  valuation: PositionValuation;
}

export interface InstitutionSummary {
  institution: Institution;
  value: number; // en moneda base
  invested: number; // en moneda base
  gain: number; // en moneda base, solo de posiciones con ganancia calculable
  productIds: Set<string>;
  positions: number;
  estimated: boolean;
}

// Una sola fuente de números para Inversiones: cada pantalla (portafolio,
// institución, producto) lee de aquí para que los totales siempre cuadren.
export function usePortfolio() {
  const rawInvestments = useAppStore((s) => s.investments);
  const liveQuotes = useAppStore((s) => s.liveQuotes);
  const cetesRates = useAppStore((s) => s.cetesRates);
  const baseCurrency = useAppStore((s) => s.profile.primaryCurrency);

  return useMemo(() => {
    const now = new Date();
    const positions = selectActiveInvestments(rawInvestments);
    const valued: ValuedPosition[] = positions.map((position) => {
      const placement = placePosition(position);
      return { position, placement, valuation: valuePosition(position, placement.product, liveQuotes, now) };
    });

    const toBase = (n: number, c: Currency) => toBaseCurrency(n, c, baseCurrency);
    const byInstitution = new Map<string, InstitutionSummary>();
    let totalValue = 0;
    let totalInvested = 0;
    let totalGain = 0;
    let anyEstimated = false;

    for (const v of valued) {
      const { position, placement, valuation } = v;
      // Una posición vendida por completo ya no cuenta como tenencia.
      if (position.assetClass !== 'cash' && position.quantity <= 0) continue;
      const value = toBase(valuation.value, position.currency);
      const invested = toBase(position.amountInvested, position.currency);
      const gain = valuation.gain !== null ? toBase(valuation.gain, position.currency) : 0;
      totalValue += value;
      totalInvested += invested;
      totalGain += gain;
      anyEstimated ||= valuation.estimated;
      const key = placement.institution.id;
      const summary = byInstitution.get(key) ?? {
        institution: placement.institution,
        value: 0,
        invested: 0,
        gain: 0,
        productIds: new Set<string>(),
        positions: 0,
        estimated: false,
      };
      summary.value += value;
      summary.invested += invested;
      summary.gain += gain;
      summary.productIds.add(placement.product.id);
      summary.positions += 1;
      summary.estimated ||= valuation.estimated;
      byInstitution.set(key, summary);
    }

    const realizedPnL = positions.reduce((sum, p) => sum + toBase(p.realizedPnL ?? 0, p.currency), 0);

    return {
      valued,
      byInstitution,
      baseCurrency,
      liveQuotes,
      cetesRates,
      totals: { value: totalValue, invested: totalInvested, gain: totalGain, realizedPnL, anyEstimated },
    };
  }, [rawInvestments, liveQuotes, cetesRates, baseCurrency]);
}

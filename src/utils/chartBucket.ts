import type { ChartPeriod } from '@/components/ChartOptionsDropdown';
import type { NetWorthSnapshot } from '@/data/types';

import { MONTH_SHORT, makePeriodKey, parsePeriodKey } from './budgetPeriods';

export interface BucketedSnapshot {
  key: string;
  label: string;
  snapshot: NetWorthSnapshot;
}

// Agrupa el historial (una entrada por día) en día/semana/mes — por semana
// o mes se queda con la última instantánea real de esa cubeta, nunca un
// promedio inventado. Devuelve la instantánea completa (no solo un
// número) para que la misma función sirva tanto a la gráfica de
// patrimonio neto como a la de activos/pasivos, sin desalinear fechas
// entre dos series bucketeadas por separado.
export function bucketNetWorthHistory(history: NetWorthSnapshot[], period: ChartPeriod, maxPoints: number): BucketedSnapshot[] {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  if (period === 'day') {
    return sorted.slice(-maxPoints).map((snapshot) => ({
      key: snapshot.date,
      label: String(new Date(`${snapshot.date}T00:00:00`).getDate()),
      snapshot,
    }));
  }
  const scope = period === 'week' ? 'week' : 'month';
  const byBucket = new Map<string, NetWorthSnapshot>();
  const order: string[] = [];
  for (const snapshot of sorted) {
    const key = makePeriodKey(scope, new Date(`${snapshot.date}T00:00:00`));
    if (!byBucket.has(key)) order.push(key);
    byBucket.set(key, snapshot);
  }
  return order.slice(-maxPoints).map((key) => {
    const snapshot = byBucket.get(key)!;
    const parsed = parsePeriodKey(key)!;
    const label = scope === 'month' ? MONTH_SHORT[parsed.start.getMonth()] : `${parsed.start.getDate()}/${parsed.start.getMonth() + 1}`;
    return { key, label, snapshot };
  });
}

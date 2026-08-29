import type { BudgetFrequency, BudgetPeriodicity } from '@/data/types';

// Convierte lo que el usuario captura (un monto por día, semana o mes, con
// una frecuencia opcional) al equivalente MENSUAL que el resto de la app
// usa para todo (spec 41: "calculadora dinámica de gastos").
//
// Semanas por mes promedio: 52 / 12 ≈ 4.33 — el mismo factor que pide el
// spec explícitamente en su ejemplo.
export const WEEKS_PER_MONTH = 4.33;

export const FREQUENCY_DAYS: Record<Exclude<BudgetFrequency, 'custom' | 'one_time'>, number> = {
  all_days: 7,
  weekdays: 5,
  weekends: 2,
};

export const PERIODICITY_LABELS: Record<BudgetPeriodicity, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
};

export const FREQUENCY_LABELS: Record<BudgetFrequency, string> = {
  all_days: 'Todos los días (7 días)',
  weekdays: 'Entre semana (5 días)',
  weekends: 'Fines de semana (2 días)',
  custom: 'Personalizado',
  one_time: 'Extemporáneo (evento único)',
};

export interface BudgetCalcInput {
  baseAmount: number;
  periodicity: BudgetPeriodicity;
  frequency?: BudgetFrequency;
  customDaysPerWeek?: number;
}

// Extemporáneo: el monto se suma directo, sin prorratear (spec: "gasto de
// evento único, como citas médicas o mantenimientos").
export function computeMonthlyAmount({ baseAmount, periodicity, frequency, customDaysPerWeek }: BudgetCalcInput): number {
  if (Number.isNaN(baseAmount) || baseAmount <= 0) return 0;

  if (periodicity === 'month') return baseAmount;
  if (periodicity === 'week') return baseAmount * WEEKS_PER_MONTH;

  // periodicity === 'day'
  if (frequency === 'one_time') return baseAmount;
  const days =
    frequency === 'custom'
      ? Math.min(6, Math.max(1, customDaysPerWeek ?? 1))
      : FREQUENCY_DAYS[frequency ?? 'all_days'];
  return baseAmount * days * WEEKS_PER_MONTH;
}

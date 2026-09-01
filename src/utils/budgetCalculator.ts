import type { BudgetFrequency, BudgetPeriodicity } from '@/data/types';
import { countMonthDaysMatching, daysInMonth } from './date';

// Convierte lo que el usuario captura (un monto por día, semana o mes, con
// una frecuencia opcional) al equivalente MENSUAL que el resto de la app
// usa para todo (spec 41: "calculadora dinámica de gastos").
//
// Semanas por mes: fijo en 4 (spec: "solo hay 4 semanas en el mes" — ya no
// se usa el promedio 52/12 ≈ 4.33, que sobrestimaba lo capturado por
// semana, ej. $100/semana daba $433/mes en vez de $400).
export const WEEKS_PER_MONTH = 4;

export const PERIODICITY_LABELS: Record<BudgetPeriodicity, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
};

export const FREQUENCY_LABELS: Record<BudgetFrequency, string> = {
  all_days: 'Todos los días',
  weekdays: 'Entre semana',
  weekends: 'Fines de semana',
  custom: 'Personalizado',
  one_time: 'Extemporáneo (evento único)',
};

export interface BudgetCalcInput {
  baseAmount: number;
  periodicity: BudgetPeriodicity;
  frequency?: BudgetFrequency;
  customDaysPerWeek?: number;
  // Mes contra el que se cuentan los días reales (spec: "en el caso de
  // septiembre de este año tiene 30 días") — por default, el mes en curso
  // al momento de guardar el presupuesto.
  referenceDate?: Date;
}

// Extemporáneo: el monto se suma directo, sin prorratear (spec: "gasto de
// evento único, como citas médicas o mantenimientos").
export function computeMonthlyAmount({ baseAmount, periodicity, frequency, customDaysPerWeek, referenceDate }: BudgetCalcInput): number {
  if (Number.isNaN(baseAmount) || baseAmount <= 0) return 0;

  if (periodicity === 'month') return baseAmount;
  if (periodicity === 'week') return baseAmount * WEEKS_PER_MONTH;

  // periodicity === 'day'
  if (frequency === 'one_time') return baseAmount;

  const ref = referenceDate ?? new Date();

  // "Todos los días", "entre semana" y "fines de semana" se calculan con
  // el número REAL de esos días en el mes de referencia (nunca un
  // promedio) — spec: "cada día va a estar entrando $1... en todo
  // septiembre $30", "depende de los días de entre semana que tenga el
  // mes específico".
  if (frequency === 'weekdays') return baseAmount * countMonthDaysMatching(ref, (d) => d >= 1 && d <= 5);
  if (frequency === 'weekends') return baseAmount * countMonthDaysMatching(ref, (d) => d === 0 || d === 6);
  if (frequency === 'custom') {
    const perWeek = Math.min(6, Math.max(1, customDaysPerWeek ?? 1));
    return baseAmount * perWeek * WEEKS_PER_MONTH;
  }
  // all_days (o sin frecuencia elegida)
  return baseAmount * daysInMonth(ref);
}

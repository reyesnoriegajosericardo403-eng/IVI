// Presets de repetición para la interfaz: la persona elige "cada mes" y una fecha, y aquí se arma la Recurrence completa.
// Puro (sin React) para poder probarlo. La definición de qué es una repetición válida vive en recurrence.ts.
import { parseYmd, validateRecurrence, type Recurrence } from './recurrence';

export type RecurrencePreset = 'daily' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'bimonthly' | 'quarterly' | 'yearly';

export const RECURRENCE_PRESETS: Array<{ id: RecurrencePreset; label: string }> = [
  { id: 'weekly', label: 'Cada semana' },
  { id: 'biweekly', label: 'Cada 2 semanas' },
  { id: 'semimonthly', label: 'Quincenal' },
  { id: 'monthly', label: 'Cada mes' },
  { id: 'bimonthly', label: 'Cada 2 meses' },
  { id: 'quarterly', label: 'Cada 3 meses' },
  { id: 'yearly', label: 'Cada año' },
  { id: 'daily', label: 'Cada día' },
];

export interface RecurrenceEnd {
  mode: 'never' | 'until' | 'count';
  endDate?: string;
  count?: number;
}

export function buildRecurrence(preset: RecurrencePreset, startDate: string, end: RecurrenceEnd = { mode: 'never' }): Recurrence {
  const p = parseYmd(startDate);
  const base: Recurrence = { frequency: 'monthly', interval: 1, startDate };
  switch (preset) {
    case 'daily': base.frequency = 'daily'; break;
    case 'weekly': base.frequency = 'weekly'; break;
    case 'biweekly': base.frequency = 'weekly'; base.interval = 2; break;
    case 'semimonthly': base.frequency = 'semimonthly'; break;
    case 'monthly': base.dayOfMonth = p?.d; break;
    case 'bimonthly': base.interval = 2; base.dayOfMonth = p?.d; break;
    case 'quarterly': base.interval = 3; base.dayOfMonth = p?.d; break;
    case 'yearly': base.frequency = 'yearly'; base.dayOfMonth = p?.d; base.month = p?.m; break;
  }
  if (end.mode === 'until' && end.endDate) base.endDate = end.endDate;
  if (end.mode === 'count' && end.count) base.count = end.count;
  return base;
}

// Inverso (para editar): qué preset describe esta repetición, o null si es algo más complejo (varios días de la semana, etc.).
export function presetOf(r: Recurrence): RecurrencePreset | null {
  switch (r.frequency) {
    case 'daily': return r.interval === 1 ? 'daily' : null;
    case 'weekly':
      if (r.weekdays && r.weekdays.length > 1) return null;
      return r.interval === 1 ? 'weekly' : r.interval === 2 ? 'biweekly' : null;
    case 'semimonthly': return !r.semimonthlyDays || (r.semimonthlyDays[0] === 15 && r.semimonthlyDays[1] === 31) ? 'semimonthly' : null;
    case 'monthly': return r.interval === 1 ? 'monthly' : r.interval === 2 ? 'bimonthly' : r.interval === 3 ? 'quarterly' : null;
    case 'yearly': return r.interval === 1 ? 'yearly' : null;
  }
}

export function endOf(r: Recurrence): RecurrenceEnd {
  if (r.endDate) return { mode: 'until', endDate: r.endDate };
  if (r.count) return { mode: 'count', count: r.count };
  return { mode: 'never' };
}

// Valida lo que la persona dejó en el formulario (fecha vacía, repeticiones = 0, etc.) con mensajes en español.
export function validateRecurrenceForm(preset: RecurrencePreset | null, startDate: string, end: RecurrenceEnd): string | null {
  if (!preset) return 'Elige cada cuánto se repite.';
  if (!startDate) return 'Elige la primera fecha.';
  if (end.mode === 'until' && !end.endDate) return 'Elige hasta qué fecha se repite.';
  if (end.mode === 'count' && (!end.count || end.count < 1)) return 'Escribe cuántas veces se repite (al menos 1).';
  return validateRecurrence(buildRecurrence(preset, startDate, end));
}

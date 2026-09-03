import { daysInMonth } from './date';

// Llaves de periodo para los presupuestos con nombre. Se prefijan con el
// tipo porque una semana y un día se verían idénticos ("2026-09-07") si
// solo se guardara la fecha: "week:2026-09-07" es la semana que arranca
// ese lunes, "day:2026-09-07" es ese día suelto.
//
// La semana arranca en LUNES, igual que `periodKey`/`isSameWeek` que ya
// existían para el sobrante entre periodos — no se inventa una convención
// nueva.

export type PeriodScope = 'week' | 'month' | 'day';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function startOfWeek(ref: Date): Date {
  const day = ref.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + diff);
}

export function makePeriodKey(scope: PeriodScope, ref: Date): string {
  if (scope === 'month') return `month:${ref.getFullYear()}-${pad(ref.getMonth() + 1)}`;
  if (scope === 'day') return `day:${ref.getFullYear()}-${pad(ref.getMonth() + 1)}-${pad(ref.getDate())}`;
  const monday = startOfWeek(ref);
  return `week:${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
}

export interface ParsedPeriod {
  scope: PeriodScope;
  // Rango inclusivo del periodo, en horas locales: start es 00:00 del
  // primer día y end es 23:59:59.999 del último.
  start: Date;
  end: Date;
}

export function parsePeriodKey(key: string): ParsedPeriod | null {
  const sep = key.indexOf(':');
  if (sep === -1) return null;
  const scope = key.slice(0, sep) as PeriodScope;
  const value = key.slice(sep + 1);
  const parts = value.split('-').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return null;

  if (scope === 'month') {
    const [year, month] = parts;
    if (parts.length !== 2) return null;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month - 1, daysInMonth(start), 23, 59, 59, 999);
    return { scope, start, end };
  }
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  const start = new Date(year, month - 1, day);
  if (scope === 'day') {
    return { scope, start, end: new Date(year, month - 1, day, 23, 59, 59, 999) };
  }
  if (scope === 'week') {
    const end = new Date(year, month - 1, day + 6, 23, 59, 59, 999);
    return { scope, start, end };
  }
  return null;
}

// Mueve una llave N periodos hacia adelante (o atrás con delta negativo),
// respetando su propio tipo: un mes salta de mes en mes, una semana de 7
// en 7 días, un día de día en día.
export function shiftPeriodKey(key: string, delta: number): string {
  const parsed = parsePeriodKey(key);
  if (!parsed) return key;
  const { scope, start } = parsed;
  if (scope === 'month') return makePeriodKey('month', new Date(start.getFullYear(), start.getMonth() + delta, 1));
  if (scope === 'week') {
    return makePeriodKey('week', new Date(start.getFullYear(), start.getMonth(), start.getDate() + delta * 7));
  }
  return makePeriodKey('day', new Date(start.getFullYear(), start.getMonth(), start.getDate() + delta));
}

// Texto para el encabezado: "Septiembre 2026", "7 – 13 sep 2026",
// "15 sep 2026".
export function periodKeyLabel(key: string): string {
  const parsed = parsePeriodKey(key);
  if (!parsed) return key;
  const { scope, start, end } = parsed;
  if (scope === 'month') return `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
  if (scope === 'day') return `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} ${start.getFullYear()}`;
  const sameMonth = start.getMonth() === end.getMonth();
  return sameMonth
    ? `${start.getDate()} – ${end.getDate()} ${MONTH_SHORT[start.getMonth()]} ${start.getFullYear()}`
    : `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTH_SHORT[end.getMonth()]} ${end.getFullYear()}`;
}

export function isDateInPeriodKey(date: Date, key: string): boolean {
  const parsed = parsePeriodKey(key);
  if (!parsed) return false;
  return date.getTime() >= parsed.start.getTime() && date.getTime() <= parsed.end.getTime();
}

// Orden cronológico por fecha de inicio — se usa para "aplica el cambio a
// los próximos N periodos que usen esta misma plantilla".
export function comparePeriodKeys(a: string, b: string): number {
  const pa = parsePeriodKey(a);
  const pb = parsePeriodKey(b);
  if (!pa || !pb) return a.localeCompare(b);
  return pa.start.getTime() - pb.start.getTime();
}

export function periodScopeOf(key: string): PeriodScope | null {
  return parsePeriodKey(key)?.scope ?? null;
}

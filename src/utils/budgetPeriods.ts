import { daysInMonth, parseISODate, toISODate } from './date';

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
// Exportado: también lo usan las etiquetas cortas del eje X en las
// gráficas de tendencia (temporalidad "mes").
export const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

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

// ============================================================
// Rangos de fechas arbitrarios (spec v2 "Plan de gastos"): además de
// day/week/month, una asignación puede cubrir cualquier tramo de fechas
// elegido a mano ("28 sep – 30 sep"). `startDate`/`endDate` en
// BudgetAssignment son la fuente de verdad para estas — periodKey queda
// solo como etiqueta/llave legible ("range:2026-09-28:2026-09-30").
// ============================================================

export interface DateRange {
  start: Date;
  end: Date;
}

export function makeRangeKey(startIso: string, endIso: string): string {
  return `range:${startIso}:${endIso}`;
}

// Rango real que cubre una asignación — SIEMPRE se resuelve desde
// startDate/endDate cuando están presentes (asignaciones nuevas); las
// asignaciones guardadas antes de este campo caen a derivar el rango de su
// periodKey (day/week/month), así ninguna asignación vieja se rompe.
export function getAssignmentRange(assignment: { periodKey: string; startDate?: string; endDate?: string }): DateRange | null {
  if (assignment.startDate && assignment.endDate) {
    const start = parseISODate(assignment.startDate);
    const end = parseISODate(assignment.endDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  const parsed = parsePeriodKey(assignment.periodKey);
  return parsed ? { start: parsed.start, end: parsed.end } : null;
}

export function rangeSpanDays(range: DateRange): number {
  return Math.round((range.end.getTime() - range.start.getTime()) / 86400000) + 1;
}

export function rangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.start.getTime() <= b.end.getTime() && b.start.getTime() <= a.end.getTime();
}

export function dateInRange(date: Date, range: DateRange): boolean {
  return date.getTime() >= range.start.getTime() && date.getTime() <= range.end.getTime();
}

// Todas las fechas ISO (AAAA-MM-DD) entre dos fechas, inclusive — para
// pintar la vista previa de un rango recién elegido en el calendario.
export function isoDatesBetween(startIso: string, endIso: string): string[] {
  const start = parseISODate(startIso);
  const end = parseISODate(endIso);
  const [from, to] = start.getTime() <= end.getTime() ? [start, end] : [end, start];
  const dates: string[] = [];
  for (const d = new Date(from); d.getTime() <= to.getTime(); d.setDate(d.getDate() + 1)) {
    dates.push(toISODate(d));
  }
  return dates;
}

// Texto para el encabezado/pastilla de fechas: "28 sep – 30 sep 2026" (un
// solo día: "28 sep 2026"; cruza de mes o año: se nombra cada extremo).
export function rangeLabel(startIso: string, endIso: string): string {
  const start = parseISODate(startIso);
  const end = parseISODate(endIso);
  if (startIso === endIso) return `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} ${start.getFullYear()}`;
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  return sameMonth
    ? `${start.getDate()} – ${end.getDate()} ${MONTH_SHORT[start.getMonth()]} ${start.getFullYear()}`
    : `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTH_SHORT[end.getMonth()]} ${end.getFullYear()}`;
}

// El periodo REAL de hoy está por terminar — para ofrecer "repetir el
// presupuesto anterior" justo cuando tiene sentido (spec: "cuando el
// presupuesto del mes esté acabando"), no todo el tiempo. Mes: últimos 3
// días. Semana: viernes, sábado o domingo (arranca en lunes).
export function isEndingSoon(key: string, ref = new Date()): boolean {
  const parsed = parsePeriodKey(key);
  if (!parsed) return false;
  if (parsed.scope === 'month') return daysInMonth(ref) - ref.getDate() <= 3;
  if (parsed.scope === 'week') return [5, 6, 0].includes(ref.getDay());
  return false;
}

// Utilidades de fecha sin dependencias externas. Todo el cálculo interno
// (orden, comparación, guardado) sigue usando AAAA-MM-DD, que ordena bien
// como texto y evita ambigüedades — solo la presentación al usuario usa
// DD-MM-AAAA (spec: "en el resto de calendarios de la app el orden debe
// ser DD-MM-AAAA").

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Acepta tanto "AAAA-MM-DD" como un timestamp ISO completo y siempre
// construye la fecha en hora local — evita el corrimiento de un día que
// causa `new Date("AAAA-MM-DD")` en zonas horarias negativas.
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function formatDateDMY(iso: string): string {
  const d = parseISODate(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

export function addMonths(iso: string, delta: number): string {
  const d = parseISODate(iso);
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  return toISODate(d);
}

export function monthLabel(iso: string): string {
  const d = parseISODate(iso);
  const label = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export interface CalendarCell {
  iso: string;
  day: number;
  inMonth: boolean;
}

// Cuadrícula de semanas (domingo a sábado) para el mes que contiene `iso`,
// incluyendo los días de relleno del mes anterior/siguiente para completar
// semanas completas.
export function buildMonthGrid(iso: string): CalendarCell[][] {
  const ref = parseISODate(iso);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: CalendarCell[] = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    cells.push({ iso: toISODate(new Date(year, month - 1, day)), day, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ iso: toISODate(new Date(year, month, day)), day, inMonth: true });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ iso: toISODate(new Date(year, month + 1, nextDay)), day: nextDay, inMonth: false });
    nextDay += 1;
  }

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export const WEEKDAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

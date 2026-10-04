// Reglas de recurrencia (P3): "cada mes el 5", "cada quincena", "cada 2 semanas los viernes", "cada año el 3 de marzo".
// Pura y determinista: solo trabaja con fechas de calendario AAAA-MM-DD (sin horas ni zonas horarias, nada que se corra de día).
// La usan los movimientos recurrentes, los avisos y las fechas de corte/pago de las tarjetas de crédito.
//
// Convenciones (todas documentadas porque el dinero depende de ellas):
// - Un día de mes que no existe ese mes se ajusta al ÚLTIMO día real: "el 31" en abril es 30; "el 30" en febrero es 28/29;
//   "el 29 de febrero" en un año no bisiesto es el 28. Por eso "el 31" equivale a "el último día del mes".
// - La semana empieza en LUNES (igual que el resto de la app). "Cada 2 semanas" cuenta desde la semana de `startDate`.
// - "Quincenal" (semimonthly) son DOS fechas por mes, por defecto el 15 y el último día (la quincena mexicana).
// - `startDate` es la primera fecha posible y ancla la fase de los intervalos ("cada 2 meses" desde enero = ene, mar, may…).
// - `endDate` es inclusivo; `count` limita cuántas ocurrencias totales existen (contadas desde `startDate`).

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'semimonthly';

export interface Recurrence {
  frequency: Frequency;
  interval: number; // cada N días/semanas/meses/años (≥ 1); ignorado en 'semimonthly'
  dayOfMonth?: number; // monthly/yearly: 1..31
  weekdays?: number[]; // weekly: 0=domingo … 6=sábado; por defecto el día de la semana de startDate
  month?: number; // yearly: 1..12; por defecto el mes de startDate
  semimonthlyDays?: [number, number]; // por defecto [15, 31] (31 = último día)
  startDate: string; // AAAA-MM-DD
  endDate?: string; // AAAA-MM-DD, inclusivo
  count?: number; // máximo de ocurrencias
}

// ---------- Calendario sin zonas horarias ----------

interface Ymd {
  y: number;
  m: number; // 1..12
  d: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const isoOf = ({ y, m, d }: Ymd): string => `${y}-${pad(m)}-${pad(d)}`;

export function parseYmd(iso: string): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const y = +match[1];
  const m = +match[2];
  const d = +match[3];
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

export const isLeap = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export function daysInMonth(y: number, m: number): number {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

// Días desde 1970-01-01 (aritmética entera: sin Date, sin husos horarios).
function toEpochDay({ y, m, d }: Ymd): number {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function fromEpochDay(z0: number): Ymd {
  const z = z0 + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return { y: m <= 2 ? y + 1 : y, m, d };
}

// 0 = domingo … 6 = sábado
export const weekdayOf = (ymd: Ymd): number => (((toEpochDay(ymd) + 4) % 7) + 7) % 7;

export function addDaysIso(iso: string, n: number): string {
  const p = parseYmd(iso);
  if (!p) return iso;
  return isoOf(fromEpochDay(toEpochDay(p) + n));
}

export function diffDaysIso(fromIso: string, toIso: string): number {
  const a = parseYmd(fromIso);
  const b = parseYmd(toIso);
  if (!a || !b) return NaN;
  return toEpochDay(b) - toEpochDay(a);
}

// Suma meses de calendario ajustando el día al último del mes destino (31 mar − 1 mes = 28/29 feb).
export function addMonthsIso(iso: string, n: number): string {
  const p = parseYmd(iso);
  if (!p) return iso;
  const total = p.y * 12 + (p.m - 1) + n;
  const y = Math.floor(total / 12);
  const m = (((total % 12) + 12) % 12) + 1;
  return isoOf({ y, m, d: Math.min(p.d, daysInMonth(y, m)) });
}

const clampDay = (y: number, m: number, d: number): number => Math.min(d, daysInMonth(y, m));

// ---------- Validación ----------

export function validateRecurrence(r: Recurrence): string | null {
  if (!r || typeof r !== 'object') return 'Falta la regla de repetición.';
  if (!parseYmd(r.startDate)) return 'La fecha de inicio no es válida.';
  if (r.endDate !== undefined && !parseYmd(r.endDate)) return 'La fecha de fin no es válida.';
  if (r.endDate !== undefined && r.endDate < r.startDate) return 'La fecha de fin es anterior a la de inicio.';
  if (!['daily', 'weekly', 'monthly', 'yearly', 'semimonthly'].includes(r.frequency)) return 'No reconozco cada cuánto se repite.';
  if (r.frequency !== 'semimonthly' && (!Number.isInteger(r.interval) || r.interval < 1 || r.interval > 366)) return 'El "cada cuánto" debe ser un número entero entre 1 y 366.';
  if (r.dayOfMonth !== undefined && (!Number.isInteger(r.dayOfMonth) || r.dayOfMonth < 1 || r.dayOfMonth > 31)) return 'El día del mes debe estar entre 1 y 31.';
  if (r.month !== undefined && (!Number.isInteger(r.month) || r.month < 1 || r.month > 12)) return 'El mes debe estar entre 1 y 12.';
  if (r.weekdays !== undefined && (r.weekdays.length === 0 || r.weekdays.some((w) => !Number.isInteger(w) || w < 0 || w > 6))) return 'Los días de la semana no son válidos.';
  if (r.semimonthlyDays !== undefined && (r.semimonthlyDays.length !== 2 || r.semimonthlyDays.some((d) => !Number.isInteger(d) || d < 1 || d > 31) || r.semimonthlyDays[0] === r.semimonthlyDays[1])) return 'Los dos días de la quincena no son válidos.';
  if (r.count !== undefined && (!Number.isInteger(r.count) || r.count < 1 || r.count > 5000)) return 'El número de repeticiones debe estar entre 1 y 5000.';
  return null;
}

// ---------- Generación de ocurrencias ----------

const SAFETY_CAP = 20000; // vueltas máximas de cualquier generador (nunca un ciclo infinito, aunque los datos vengan mal)

function* generate(r: Recurrence): Generator<string> {
  const start = parseYmd(r.startDate)!;
  const startEpoch = toEpochDay(start);
  const interval = r.frequency === 'semimonthly' ? 1 : Math.max(1, r.interval);
  let n = 0;
  const cap = r.count ?? Infinity;
  const end = r.endDate;

  const emit = function* (iso: string): Generator<string> {
    if (iso < r.startDate) return;
    if (end && iso > end) return;
    if (n >= cap) return;
    n++;
    yield iso;
  };

  if (r.frequency === 'daily') {
    for (let k = 0; k < SAFETY_CAP; k++) {
      const iso = isoOf(fromEpochDay(startEpoch + k * interval));
      if (end && iso > end) return;
      if (n >= cap) return;
      n++;
      yield iso;
    }
    return;
  }

  if (r.frequency === 'weekly') {
    const wds = (r.weekdays && r.weekdays.length ? r.weekdays : [weekdayOf(start)]).slice();
    // orden lunes→domingo
    const order = [...new Set(wds)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    const mondayEpoch = startEpoch - ((weekdayOf(start) + 6) % 7);
    for (let w = 0; w < SAFETY_CAP; w += interval) {
      for (const wd of order) {
        const iso = isoOf(fromEpochDay(mondayEpoch + w * 7 + ((wd + 6) % 7)));
        if (iso < r.startDate) continue;
        if (end && iso > end) return;
        if (n >= cap) return;
        n++;
        yield iso;
      }
    }
    return;
  }

  if (r.frequency === 'monthly') {
    const day = r.dayOfMonth ?? start.d;
    for (let k = 0; k < SAFETY_CAP; k += interval) {
      const total = start.y * 12 + (start.m - 1) + k;
      const y = Math.floor(total / 12);
      const m = (total % 12) + 1;
      const iso = isoOf({ y, m, d: clampDay(y, m, day) });
      if (iso < r.startDate) continue;
      if (end && iso > end) return;
      if (n >= cap) return;
      n++;
      yield iso;
    }
    return;
  }

  if (r.frequency === 'yearly') {
    const month = r.month ?? start.m;
    const day = r.dayOfMonth ?? start.d;
    for (let k = 0; k < 2000; k += interval) {
      const y = start.y + k;
      const iso = isoOf({ y, m: month, d: clampDay(y, month, day) });
      if (iso < r.startDate) continue;
      if (end && iso > end) return;
      if (n >= cap) return;
      n++;
      yield iso;
    }
    return;
  }

  // semimonthly: dos fechas por mes
  const [a, b] = (r.semimonthlyDays ?? [15, 31]).slice().sort((x, y) => x - y);
  for (let k = 0; k < SAFETY_CAP; k++) {
    const total = start.y * 12 + (start.m - 1) + k;
    const y = Math.floor(total / 12);
    const m = (total % 12) + 1;
    const pair = [clampDay(y, m, a), clampDay(y, m, b)];
    for (const d of [...new Set(pair)]) {
      const iso = isoOf({ y, m, d });
      if (iso < r.startDate) continue;
      if (end && iso > end) return;
      if (n >= cap) return;
      n++;
      yield iso;
    }
    if (end && isoOf({ y, m, d: 1 }) > end) return;
  }
}

// Todas las ocurrencias entre dos fechas (inclusive). Devuelve [] si la regla no es válida.
export function occurrencesBetween(r: Recurrence, fromIso: string, toIso: string, max = 500): string[] {
  if (validateRecurrence(r) !== null || !parseYmd(fromIso) || !parseYmd(toIso)) return [];
  const out: string[] = [];
  for (const iso of generate(r)) {
    if (iso > toIso) break;
    if (iso >= fromIso) {
      out.push(iso);
      if (out.length >= max) break;
    }
  }
  return out;
}

// La primera ocurrencia en o después de `fromIso` (o null si la regla ya terminó).
export function nextOccurrence(r: Recurrence, fromIso: string): string | null {
  if (validateRecurrence(r) !== null || !parseYmd(fromIso)) return null;
  for (const iso of generate(r)) if (iso >= fromIso) return iso;
  return null;
}

// La última ocurrencia ESTRICTAMENTE antes de `beforeIso` (para "¿cuándo fue el último corte?").
export function previousOccurrence(r: Recurrence, beforeIso: string): string | null {
  if (validateRecurrence(r) !== null || !parseYmd(beforeIso)) return null;
  let last: string | null = null;
  for (const iso of generate(r)) {
    if (iso >= beforeIso) break;
    last = iso;
  }
  return last;
}

// ---------- Texto en español ----------

const WEEKDAY_NAMES = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function describeRecurrence(r: Recurrence): string {
  const start = parseYmd(r.startDate);
  const every = (n: number, one: string, many: string) => (n === 1 ? `cada ${one}` : `cada ${n} ${many}`);
  switch (r.frequency) {
    case 'daily':
      return r.interval === 1 ? 'todos los días' : `cada ${r.interval} días`;
    case 'weekly': {
      const wds = (r.weekdays && r.weekdays.length ? r.weekdays : start ? [weekdayOf(start)] : []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
      const names = wds.map((w) => WEEKDAY_NAMES[w]);
      const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}` : names[0] ?? '';
      return r.interval === 1 ? `todos los ${list}` : `cada ${r.interval} semanas, los ${list}`;
    }
    case 'monthly': {
      const day = r.dayOfMonth ?? start?.d ?? 1;
      const dayText = day === 31 ? 'el último día' : `el día ${day}`;
      return `${every(r.interval, 'mes', 'meses')}, ${dayText}`;
    }
    case 'yearly': {
      const month = r.month ?? start?.m ?? 1;
      const day = r.dayOfMonth ?? start?.d ?? 1;
      return `${every(r.interval, 'año', 'años')}, el ${day} de ${MONTH_NAMES[month - 1]}`;
    }
    case 'semimonthly': {
      const [a, b] = (r.semimonthlyDays ?? [15, 31]).slice().sort((x, y) => x - y);
      const name = (d: number) => (d === 31 ? 'último día' : `día ${d}`);
      return a === 15 && b === 31 ? 'cada quincena (el 15 y el último día del mes)' : `dos veces al mes (el ${name(a)} y el ${name(b)})`;
    }
  }
}

// Fecha corta para mostrar: "5 oct 2026".
export function shortDateEs(iso: string): string {
  const p = parseYmd(iso);
  if (!p) return iso;
  return `${p.d} ${MONTH_NAMES[p.m - 1].slice(0, 3)} ${p.y}`;
}

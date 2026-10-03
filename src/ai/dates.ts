// Fechas, horas y periodos dichos/escritos en español de México ("ayer", "el 15 de marzo", "hace 3 días",
// "el viernes", "este mes", "a las 5 pm"). Pura y determinista: recibe `now` (no lee el reloj), así se prueba con
// un golden y nunca depende del día en que se corra. Prerrequisito de P3 (previsto, recurrencia, avisos) y de
// cualquier acción del chat con fecha (meta, vencimiento de deuda, movimiento de otro día).
//
// Convenciones:
// - Las fechas son AAAA-MM-DD en calendario LOCAL (igual que src/utils/date.ts); nunca se pasa por UTC.
// - `prefer` dice cómo resolver lo ambiguo ("el viernes", "el 15", "el 3 de oct" sin año):
//     'past'   → la última ocurrencia que ya pasó (registrar un gasto: "pagué la luz el viernes")
//     'future' → la próxima ocurrencia (avisos, fecha objetivo de una meta, vencimiento)
//     'auto'   → la más cercana a hoy
// - Nunca inventa: si no hay una fecha clara devuelve null; si faltaba el año/mes y se dedujo, `inferred: true`.
// - Las posiciones (`start`/`end`) son sobre el texto ORIGINAL, para poder recortar la frase antes de buscar
//   montos ("el 15 de marzo" no debe contar como un monto de 15).
import { addMonths, parseISODate, toISODate } from '@/utils/date';

export type DatePrefer = 'past' | 'future' | 'auto';
export type DateRelation = 'past' | 'today' | 'future';

export interface DateMention {
  iso: string; // AAAA-MM-DD
  relation: DateRelation;
  inferred: boolean;
  kind: 'absolute' | 'relative' | 'weekday' | 'dayOfMonth';
  text: string; // lo que se interpretó, tal como venía
  start: number;
  end: number;
}

export interface TimeMention {
  hour: number; // 0-23
  minute: number;
  text: string;
  start: number;
  end: number;
}

export interface PeriodMention {
  kind: 'week' | 'fortnight' | 'month' | 'year';
  from: string; // AAAA-MM-DD, inclusive
  to: string; // AAAA-MM-DD, inclusive
  inferred: boolean;
  text: string;
  start: number;
  end: number;
}

// ---------- Texto sin acentos, conservando dónde estaba cada letra en el original ----------

function fold(text: string): { norm: string; map: number[] } {
  let norm = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const folded = text[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (const c of folded) {
      norm += c;
      map.push(i);
    }
  }
  map.push(text.length);
  return { norm, map };
}

// ---------- Vocabulario ----------

const MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};
const MONTH_ABBR: Record<string, number> = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, sept: 9, set: 9, oct: 10, nov: 11, dic: 12 };
const WEEKDAYS: Record<string, number> = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
const SMALL_NUMBERS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14,
  quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, treinta: 30,
};
const DAY_WORDS: Record<string, number> = {
  primero: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14,
  quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30, 'treinta y uno': 31,
};

const MONTH_RE = Object.keys(MONTHS).join('|');
const ABBR_RE = 'sept|sep|set|ene|feb|mar|abr|may|jun|jul|ago|oct|nov|dic';
const WEEKDAY_RE = Object.keys(WEEKDAYS).join('|');
const DAYWORD_RE = Object.keys(DAY_WORDS).sort((a, b) => b.length - a.length).join('|');
const NUMWORD_RE = Object.keys(SMALL_NUMBERS).join('|');

// ---------- Aritmética de calendario local ----------

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const isoOf = (d: Date): string => toISODate(d);

function validDate(y: number, m: number, d: number): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

function relationOf(date: Date, today: Date): DateRelation {
  const a = isoOf(date);
  const b = isoOf(today);
  return a < b ? 'past' : a > b ? 'future' : 'today';
}

// Resta/suma meses de calendario respetando el fin de mes (31 de marzo − 1 mes = 28/29 de febrero).
function shiftMonths(d: Date, n: number): Date {
  const first = parseISODate(addMonths(isoOf(new Date(d.getFullYear(), d.getMonth(), 1)), n));
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last));
}

// De las ocurrencias de un día-mes en años cercanos, elige según `prefer`.
function pickDayMonth(day: number, month: number, now: Date, prefer: DatePrefer): Date | null {
  const today = startOfDay(now);
  const y = today.getFullYear();
  const cands = [y - 1, y, y + 1].map((yy) => validDate(yy, month, day)).filter((d): d is Date => d !== null);
  if (cands.length === 0) return null;
  const past = cands.filter((d) => d.getTime() <= today.getTime());
  const future = cands.filter((d) => d.getTime() >= today.getTime());
  if (prefer === 'past') return past.length ? past[past.length - 1] : null;
  if (prefer === 'future') return future.length ? future[0] : null;
  const p = past.length ? past[past.length - 1] : null;
  const f = future.length ? future[0] : null;
  if (p && f) return today.getTime() - p.getTime() <= f.getTime() - today.getTime() ? p : f;
  return p ?? f;
}

// "el 15" (solo día): este mes o el vecino, según `prefer`.
function pickDayOfMonth(day: number, now: Date, prefer: DatePrefer): Date | null {
  const today = startOfDay(now);
  const cands: Date[] = [];
  for (const delta of [-1, 0, 1]) {
    const base = new Date(today.getFullYear(), today.getMonth() + delta, 1);
    const d = validDate(base.getFullYear(), base.getMonth() + 1, day);
    if (d) cands.push(d);
  }
  const past = cands.filter((d) => d.getTime() <= today.getTime());
  const future = cands.filter((d) => d.getTime() >= today.getTime());
  if (prefer === 'past') return past.length ? past[past.length - 1] : null;
  if (prefer === 'future') return future.length ? future[0] : null;
  const p = past.length ? past[past.length - 1] : null;
  const f = future.length ? future[0] : null;
  if (p && f) return today.getTime() - p.getTime() <= f.getTime() - today.getTime() ? p : f;
  return p ?? f;
}

type WeekdayMode = 'pastish' | 'strictPast' | 'futureish' | 'strictFuture';
function weekdayDate(target: number, now: Date, mode: WeekdayMode): Date {
  const today = startOfDay(now);
  const dow = today.getDay();
  const back = (dow - target + 7) % 7;
  const ahead = (target - dow + 7) % 7;
  switch (mode) {
    case 'pastish':
      return addDays(today, -back);
    case 'strictPast':
      return addDays(today, -(back || 7));
    case 'futureish':
      return addDays(today, ahead);
    case 'strictFuture':
      return addDays(today, ahead || 7);
  }
}

const num = (s: string): number | null => {
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return SMALL_NUMBERS[s] ?? null;
};

function fullYear(s: string | undefined, fallback: number): number {
  if (!s) return fallback;
  const n = parseInt(s, 10);
  return s.length <= 2 ? 2000 + n : n;
}

// ---------- Fechas de un día ----------

interface Raw {
  start: number; // índices sobre el texto doblado
  end: number;
  priority: number; // menor = gana al traslaparse
  make: () => Omit<DateMention, 'text' | 'start' | 'end' | 'relation'> & { date: Date } | null;
}

const NOT_AFTER_DAY = /^\s*(?:pesos?\b|mil\b|k\b|mxn\b|usd\b|dolar|dlls\b|dls\b|millon|%|por\s+ciento|kilos?\b|kgs?\b|litros?\b|lts?\b|gb\b|mb\b|tb\b|piezas?\b)/;

export function findDateMentions(text: string, now: Date = new Date(), opts: { prefer?: DatePrefer } = {}): DateMention[] {
  const prefer = opts.prefer ?? 'auto';
  const { norm, map } = fold(text);
  const today = startOfDay(now);
  const raws: Raw[] = [];
  // `extend` alarga el final de la mención (p. ej. para incluir un año suelto "…de octubre 2026").
  function add(m: RegExpMatchArray, priority: number, make: Raw['make']): void;
  function add(m: RegExpMatchArray, priority: number, extend: number, make: Raw['make']): void;
  function add(m: RegExpMatchArray, priority: number, a: number | Raw['make'], b?: Raw['make']): void {
    const extend = typeof a === 'number' ? a : 0;
    const make = typeof a === 'number' ? b! : a;
    raws.push({ start: m.index!, end: m.index! + m[0].length + extend, priority, make });
  }
  // Un número de 4 cifras pegado a "de octubre" es el AÑO solo si es plausible y no es dinero ("…de octubre 2026"
  // sí; "…de octubre 4998 de renta" o "…de octubre 2500 pesos" no: eso es el monto).
  const bareYear = (endIdx: number): { year: string; len: number } | null => {
    const m = norm.slice(endIdx).match(/^(\s+)(\d{4})\b(?!\s*(?:pesos?|mxn|usd|dolares|dlls|dls|varos|lanas|k\b|mil\b))/);
    if (!m) return null;
    const y = parseInt(m[2], 10);
    return y >= today.getFullYear() - 30 && y <= today.getFullYear() + 5 ? { year: m[2], len: m[0].length } : null;
  };
  const all = (re: RegExp) => [...norm.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))];

  // 1) "15 de marzo", "el 3 de octubre del 2026", "quince de marzo", "3 de oct"
  for (const m of all(new RegExp(`\\b(?:el\\s+)?(?:dia\\s+)?(\\d{1,2}|${DAYWORD_RE})(?:o|ro|er|ero)?\\s+de\\s+(${MONTH_RE}|(?:${ABBR_RE})\\.?)(?:\\s+(?:de|del)\\s+(\\d{4}|\\d{2})\\b)?`, 'i'))) {
    const bare = m[3] ? null : bareYear(m.index! + m[0].length);
    add(m, 1, bare?.len ?? 0, () => {
      const day = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : DAY_WORDS[m[1]];
      const monthKey = m[2].replace(/\.$/, '');
      const month = MONTHS[monthKey] ?? MONTH_ABBR[monthKey];
      const yearStr = m[3] ?? bare?.year;
      if (!day || !month) return null;
      if (yearStr) {
        const d = validDate(fullYear(yearStr, today.getFullYear()), month, day);
        return d ? { date: d, iso: isoOf(d), inferred: false, kind: 'absolute' } : null;
      }
      const d = pickDayMonth(day, month, now, prefer);
      return d ? { date: d, iso: isoOf(d), inferred: true, kind: 'absolute' } : null;
    });
  }
  // 2) "3 oct", "15 mar 2026" (mes abreviado sin "de")
  for (const m of all(new RegExp(`\\b(?:el\\s+)?(\\d{1,2})\\s+(${ABBR_RE})\\.?\\b`, 'i'))) {
    const bare = bareYear(m.index! + m[0].length);
    add(m, 2, bare?.len ?? 0, () => {
      const d0 = parseInt(m[1], 10);
      const month = MONTH_ABBR[m[2]];
      if (bare) {
        const d = validDate(parseInt(bare.year, 10), month, d0);
        return d ? { date: d, iso: isoOf(d), inferred: false, kind: 'absolute' } : null;
      }
      const d = pickDayMonth(d0, month, now, prefer);
      return d ? { date: d, iso: isoOf(d), inferred: true, kind: 'absolute' } : null;
    });
  }
  // 3) numéricas: 15/03, 15/03/2026, 15-03-2026, 15.03.2026, 2026-03-15 (día/mes, como en México)
  for (const m of all(/(?<![\d.,])(\d{4})-(\d{2})-(\d{2})(?![\d])/)) {
    add(m, 1, () => {
      const d = validDate(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10));
      return d ? { date: d, iso: isoOf(d), inferred: false, kind: 'absolute' } : null;
    });
  }
  for (const m of all(/(?<![\d.,/-])(\d{1,2})[-.](\d{1,2})[-.](\d{4}|\d{2})(?![\d])/)) {
    add(m, 1, () => {
      const d = validDate(fullYear(m[3], today.getFullYear()), parseInt(m[2], 10), parseInt(m[1], 10));
      return d ? { date: d, iso: isoOf(d), inferred: false, kind: 'absolute' } : null;
    });
  }
  for (const m of all(/(?<![\d.,/-])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?(?![\d/])/)) {
    add(m, 1, () => {
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10);
      if (!m[3]) {
        // "1/2 kilo", "3/4 de taza": una fracción no es una fecha
        const after = norm.slice(m.index! + m[0].length);
        if (day < month && [2, 3, 4, 5, 8].includes(month)) return null;
        if (/^\s*(?:de\s+)?(?:kilos?|kgs?|litros?|lts?|tazas?|piezas?|metros?|cm|docenas?|k\b|l\b)/.test(after)) return null;
      }
      if (m[3]) {
        const d = validDate(fullYear(m[3], today.getFullYear()), month, day);
        return d ? { date: d, iso: isoOf(d), inferred: false, kind: 'absolute' } : null;
      }
      const d = pickDayMonth(day, month, now, prefer);
      return d ? { date: d, iso: isoOf(d), inferred: true, kind: 'absolute' } : null;
    });
  }

  // 4) palabras relativas
  const rel = (re: RegExp, priority: number, fn: (m: RegExpMatchArray) => Date | null, inferred = false) => {
    for (const m of all(re)) {
      add(m, priority, () => {
        const d = fn(m);
        return d ? { date: d, iso: isoOf(d), inferred, kind: 'relative' } : null;
      });
    }
  };
  rel(/\bpasado\s+manana\b/, 1, () => addDays(today, 2));
  rel(/\b(?:antes\s+de\s+ayer|antier|anteayer|anteanoche)\b/, 1, () => addDays(today, -2));
  rel(/\banoche\b/, 2, () => addDays(today, -1));
  rel(/\bayer\b/, 2, () => addDays(today, -1));
  rel(/\bhoy\b/, 2, () => today);
  rel(/\besta\s+(?:manana|tarde|noche|madrugada)\b/, 2, () => today);
  // "mañana" = día siguiente, salvo "en la mañana", "por la mañana", "esta mañana", "de la mañana"...
  for (const m of all(/\bmanana\b/)) {
    const before = norm.slice(Math.max(0, m.index! - 14), m.index!);
    if (/(?:\bla|\besta|\bde la|\bpor la|\ben la|\btoda la|\bpasado|\buna|\bbuenos dias en la)\s*$/.test(before) || /\b(?:de|en|por|la|esta)\s*$/.test(before)) continue;
    add(m, 3, () => ({ date: addDays(today, 1), iso: isoOf(addDays(today, 1)), inferred: false, kind: 'relative' }));
  }
  // "hace 3 días", "hace dos semanas", "hace un mes", "hace un par de días"
  for (const m of all(new RegExp(`\\bhace\\s+(\\d{1,3}|${NUMWORD_RE}|un\\s+par\\s+de)\\s+(dias?|semanas?|meses|mes|anos?)\\b`))) {
    add(m, 2, () => {
      const n = m[1].startsWith('un par') ? 2 : num(m[1]);
      if (n === null || n === 0) return null;
      const unit = m[2];
      const d = unit.startsWith('dia') ? addDays(today, -n) : unit.startsWith('semana') ? addDays(today, -7 * n) : unit.startsWith('mes') ? shiftMonths(today, -n) : shiftMonths(today, -12 * n);
      return { date: d, iso: isoOf(d), inferred: false, kind: 'relative' };
    });
  }
  // "en 3 días", "dentro de dos semanas" (NO "en 3 meses": suele ser "a 3 meses sin intereses")
  for (const m of all(new RegExp(`\\b(?:en|dentro\\s+de)\\s+(\\d{1,3}|${NUMWORD_RE})\\s+(dias?|semanas?)\\b`))) {
    add(m, 2, () => {
      const n = num(m[1]);
      if (n === null || n === 0) return null;
      const d = addDays(today, m[2].startsWith('dia') ? n : 7 * n);
      return { date: d, iso: isoOf(d), inferred: false, kind: 'relative' };
    });
  }
  rel(/\b(?:la\s+)?semana\s+pasada\b/, 3, () => addDays(today, -7), true);
  rel(/\bla\s+(?:proxima\s+semana|semana\s+que\s+(?:viene|entra))\b/, 3, () => addDays(today, 7), true);

  // 5a) "el martes de la semana pasada / de esta semana / de la próxima semana": el día de ESA semana (lunes a domingo)
  for (const m of all(new RegExp(`\\b(?:el\\s+)?(${WEEKDAY_RE})\\s+de\\s+(?:la\\s+semana\\s+(pasada|que\\s+viene|proxima|entrante)|la\\s+(proxima)\\s+semana|esta\\s+semana)\\b`))) {
    add(m, 2, () => {
      const target = WEEKDAYS[m[1]];
      const label = m[2] ?? m[3];
      const shift = !label ? 0 : label === 'pasada' ? -7 : 7;
      const monday = addDays(today, -((today.getDay() + 6) % 7) + shift);
      const d = addDays(monday, (target + 6) % 7);
      return { date: d, iso: isoOf(d), inferred: false, kind: 'weekday' };
    });
  }
  // 5) días de la semana
  for (const m of all(new RegExp(`(?<!\\b(?:los|cada|todos\\s+los|todas\\s+las)\\s)\\b(?:el\\s+)?(?:(proximo|pasado|ultimo|siguiente)\\s+)?(${WEEKDAY_RE})(?:\\s+(pasado|que\\s+viene|proximo|siguiente|entrante))?\\b`))) {
    const after = norm.slice(m.index! + m[0].length);
    const before = norm.slice(Math.max(0, m.index! - 14), m.index!);
    // "de lunes a viernes", "lunes a viernes": es un rango recurrente, no un día
    if (new RegExp(`^\\s*(?:a|al|hasta|y)\\s+(?:el\\s+)?(?:${WEEKDAY_RE})\\b`).test(after) || new RegExp(`(?:${WEEKDAY_RE})\\s+(?:a|al|hasta|y)\\s+(?:el\\s+)?$`).test(before)) continue;
    add(m, 3, () => {
      const target = WEEKDAYS[m[2]];
      const mod = m[1] ?? m[3];
      let mode: WeekdayMode = prefer === 'future' ? 'futureish' : 'pastish';
      if (mod === 'pasado' || mod === 'ultimo') mode = 'strictPast';
      else if (mod && /^(proximo|que viene|siguiente|entrante)$/.test(mod.replace(/\s+/g, ' '))) mode = 'strictFuture';
      const d = weekdayDate(target, now, mode);
      return { date: d, iso: isoOf(d), inferred: !mod, kind: 'weekday' };
    });
  }

  // 6) solo el día del mes: "el día 15", "el 15"
  for (const m of all(/\b(?:el\s+)?dia\s+(\d{1,2})\b/)) {
    add(m, 4, () => {
      const d = pickDayOfMonth(parseInt(m[1], 10), now, prefer);
      return d ? { date: d, iso: isoOf(d), inferred: true, kind: 'dayOfMonth' } : null;
    });
  }
  for (const m of all(/\bel\s+(\d{1,2})\b/)) {
    const after = norm.slice(m.index! + m[0].length);
    const okDe = /^\s*(?:de|del)\s+(?:este\s+mes|ese\s+mes|mes\b(?!\s+de\s))/.test(after);
    if (!okDe && (/^\s*(?:de|del)\b/.test(after) || NOT_AFTER_DAY.test(after) || /^\s*[./:]\s*\d/.test(after))) continue;
    add(m, 5, () => {
      const d = pickDayOfMonth(parseInt(m[1], 10), now, prefer);
      return d ? { date: d, iso: isoOf(d), inferred: true, kind: 'dayOfMonth' } : null;
    });
  }
  for (const m of all(/\bel\s+(?:primero|1ro|1o|1ero)\b(?!\s+de\s)/)) {
    add(m, 5, () => {
      const d = pickDayOfMonth(1, now, prefer);
      return d ? { date: d, iso: isoOf(d), inferred: true, kind: 'dayOfMonth' } : null;
    });
  }

  // Resolver traslapes (gana la prioridad menor; a igual prioridad, la más larga) y construir
  const sorted = raws.slice().sort((a, b) => a.priority - b.priority || b.end - b.start - (a.end - a.start) || a.start - b.start);
  const taken: Array<[number, number]> = [];
  const out: DateMention[] = [];
  for (const r of sorted) {
    if (taken.some(([s, e]) => r.start < e && r.end > s)) continue;
    const built = r.make();
    if (!built) continue;
    taken.push([r.start, r.end]);
    const start = map[r.start];
    const end = map[r.end];
    out.push({ iso: built.iso, relation: relationOf(built.date, today), inferred: built.inferred, kind: built.kind, text: text.slice(start, end), start, end });
  }
  return out.sort((a, b) => a.start - b.start);
}

export function extractDate(text: string, now: Date = new Date(), opts: { prefer?: DatePrefer } = {}): DateMention | null {
  return findDateMentions(text, now, opts)[0] ?? null;
}

// ---------- Horas ----------

export function findTimeMentions(text: string): TimeMention[] {
  const { norm, map } = fold(text);
  const found: Array<{ start: number; end: number; hour: number; minute: number }> = [];
  const push = (m: RegExpMatchArray, hour: number, minute: number) => {
    if (hour > 23 || minute > 59) return;
    found.push({ start: m.index!, end: m.index! + m[0].length, hour, minute });
  };
  const meridiem = (hour: number, tag: string | undefined): number => {
    if (!tag) return hour;
    if (tag === 'noche' && hour === 12) return 0; // "las 12 de la noche" es la medianoche
    if (/^(?:pm|p\.m\.|tarde|noche)$/.test(tag)) return hour < 12 ? hour + 12 : hour;
    if (/^(?:am|a\.m\.|manana|madrugada)$/.test(tag)) return hour === 12 ? 0 : hour;
    return hour;
  };
  // "a las 5 pm", "a las 5:30", "a las 8 de la noche", "a las 17 hrs", "a las cinco de la tarde", "a las 9 y media"
  const HOUR_WORDS = 'una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce';
  const hourWord = (w: string): number => ({ una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12 })[w] ?? NaN;
  for (const m of norm.matchAll(new RegExp(`\\ba\\s+las?\\s+(\\d{1,2}|${HOUR_WORDS})(?::(\\d{2}))?(?:\\s+(y\\s+media|y\\s+cuarto|menos\\s+cuarto))?(?:\\s*(am|pm|a\\.m\\.|p\\.m\\.)|\\s+de\\s+la\\s+(manana|tarde|noche|madrugada)|\\s*(?:hrs?|horas|h)\\b)?`, 'g'))) {
    let hour = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : hourWord(m[1]);
    let minute = m[2] ? parseInt(m[2], 10) : 0;
    if (m[3]) {
      if (m[3].endsWith('media')) minute = 30;
      else if (m[3].startsWith('y')) minute = 15;
      else {
        minute = 45;
        hour = hour === 1 ? 12 : hour - 1; // "las 5 menos cuarto" = 4:45
      }
    }
    if (Number.isNaN(hour)) continue;
    push(m, meridiem(hour, m[4] ?? m[5]), minute);
  }
  // "17:30", "5:30 pm"
  for (const m of norm.matchAll(/(?<![\d:.])(\d{1,2}):(\d{2})(?:\s*(am|pm|a\.m\.|p\.m\.)|\s*(?:hrs?|horas|h)\b)?(?![\d:])/g)) {
    if (found.some((f) => m.index! >= f.start && m.index! < f.end)) continue;
    push(m, meridiem(parseInt(m[1], 10), m[3]), parseInt(m[2], 10));
  }
  // "5 pm"
  for (const m of norm.matchAll(/(?<![\d:.,])(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)(?![a-z])/g)) {
    if (found.some((f) => m.index! >= f.start && m.index! < f.end)) continue;
    push(m, meridiem(parseInt(m[1], 10), m[2]), 0);
  }
  for (const m of norm.matchAll(/\b(?:al\s+)?mediodia\b/g)) push(m, 12, 0);
  for (const m of norm.matchAll(/\ba\s+medianoche\b/g)) push(m, 0, 0);

  return found
    .sort((a, b) => a.start - b.start)
    .filter((f, i, arr) => i === 0 || f.start >= arr[i - 1].end)
    .map((f) => ({ hour: f.hour, minute: f.minute, text: text.slice(map[f.start], map[f.end]), start: map[f.start], end: map[f.end] }));
}

export function extractTime(text: string): TimeMention | null {
  return findTimeMentions(text)[0] ?? null;
}

// ---------- Periodos ----------

const lastDayOfMonth = (y: number, m0: number): Date => new Date(y, m0 + 1, 0);

function monthPeriod(y: number, m0: number): { from: string; to: string } {
  return { from: isoOf(new Date(y, m0, 1)), to: isoOf(lastDayOfMonth(y, m0)) };
}

function weekPeriod(ref: Date): { from: string; to: string } {
  const back = (ref.getDay() + 6) % 7; // la semana arranca en LUNES (igual que src/utils/budgetPeriods.ts)
  const monday = addDays(startOfDay(ref), -back);
  return { from: isoOf(monday), to: isoOf(addDays(monday, 6)) };
}

function fortnightPeriod(ref: Date): { from: string; to: string } {
  const y = ref.getFullYear();
  const m0 = ref.getMonth();
  return ref.getDate() <= 15 ? { from: isoOf(new Date(y, m0, 1)), to: isoOf(new Date(y, m0, 15)) } : { from: isoOf(new Date(y, m0, 16)), to: isoOf(lastDayOfMonth(y, m0)) };
}

// "este mes", "el mes pasado", "la próxima quincena", "esta semana", "en diciembre", "en enero del 2027", "este año"
export function extractPeriod(text: string, now: Date = new Date(), opts: { prefer?: DatePrefer } = {}): PeriodMention | null {
  const prefer = opts.prefer ?? 'auto';
  const { norm, map } = fold(text);
  const today = startOfDay(now);
  const y = today.getFullYear();
  const m0 = today.getMonth();
  const hits: Array<{ start: number; end: number; build: () => Omit<PeriodMention, 'text' | 'start' | 'end'> | null }> = [];
  const add = (re: RegExp, build: (m: RegExpMatchArray) => Omit<PeriodMention, 'text' | 'start' | 'end'> | null) => {
    for (const m of norm.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))) hits.push({ start: m.index!, end: m.index! + m[0].length, build: () => build(m) });
  };
  const shiftedMonth = (delta: number) => {
    const d = new Date(y, m0 + delta, 1);
    return monthPeriod(d.getFullYear(), d.getMonth());
  };

  add(/\b(?:este|en\s+este|del)\s+mes\b(?!\s+(?:pasado|anterior|proximo|que\s+viene|siguiente|entrante|de\s+\w))/, () => ({ kind: 'month', ...shiftedMonth(0), inferred: false }));
  add(/\b(?:el\s+)?mes\s+(?:pasado|anterior)\b/, () => ({ kind: 'month', ...shiftedMonth(-1), inferred: false }));
  add(/\b(?:el\s+)?(?:proximo\s+mes|mes\s+(?:que\s+viene|siguiente|proximo|entrante))\b/, () => ({ kind: 'month', ...shiftedMonth(1), inferred: false }));
  add(/\besta\s+semana\b/, () => ({ kind: 'week', ...weekPeriod(today), inferred: false }));
  add(/\bla\s+semana\s+pasada\b/, () => ({ kind: 'week', ...weekPeriod(addDays(today, -7)), inferred: false }));
  add(/\bla\s+(?:proxima\s+semana|semana\s+que\s+(?:viene|entra))\b/, () => ({ kind: 'week', ...weekPeriod(addDays(today, 7)), inferred: false }));
  add(/\besta\s+quincena\b/, () => ({ kind: 'fortnight', ...fortnightPeriod(today), inferred: false }));
  add(/\bla\s+quincena\s+(?:pasada|anterior)\b/, () => {
    const ref = today.getDate() <= 15 ? new Date(y, m0 - 1, 16) : new Date(y, m0, 1);
    return { kind: 'fortnight', ...fortnightPeriod(ref), inferred: false };
  });
  add(/\bla\s+(?:proxima\s+quincena|quincena\s+(?:que\s+viene|siguiente|proxima))\b/, () => {
    const ref = today.getDate() <= 15 ? new Date(y, m0, 16) : new Date(y, m0 + 1, 1);
    return { kind: 'fortnight', ...fortnightPeriod(ref), inferred: false };
  });
  add(/\b(?:este\s+ano|en\s+el\s+ano)\b/, () => ({ kind: 'year', from: `${y}-01-01`, to: `${y}-12-31`, inferred: false }));
  add(/\b(?:el\s+)?ano\s+pasado\b/, () => ({ kind: 'year', from: `${y - 1}-01-01`, to: `${y - 1}-12-31`, inferred: false }));
  add(/\b(?:el\s+)?(?:proximo\s+ano|ano\s+que\s+viene)\b/, () => ({ kind: 'year', from: `${y + 1}-01-01`, to: `${y + 1}-12-31`, inferred: false }));
  // "en diciembre", "de marzo del 2027", "para enero"
  add(new RegExp(`\\b(?:en|de|para|durante|del\\s+mes\\s+de|el\\s+mes\\s+de|mes\\s+de)\\s+(${MONTH_RE})(?:\\s+(?:de|del)\\s+(\\d{4}))?\\b`), (m) => {
    const month0 = MONTHS[m[1]] - 1;
    if (m[2]) return { kind: 'month', ...monthPeriod(parseInt(m[2], 10), month0), inferred: false };
    let year = y;
    if (prefer === 'past' && month0 > m0) year = y - 1;
    else if (prefer === 'future' && month0 < m0) year = y + 1;
    else if (prefer === 'auto') {
      const dist = month0 - m0;
      if (dist > 6) year = y - 1;
      else if (dist < -6) year = y + 1;
    }
    return { kind: 'month', ...monthPeriod(year, month0), inferred: true };
  });
  add(/\b(?:en|para|del|durante)(?:\s+el)?\s+(20\d{2})\b/, (m) => ({ kind: 'year', from: `${m[1]}-01-01`, to: `${m[1]}-12-31`, inferred: false }));

  hits.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  for (const h of hits) {
    const built = h.build();
    if (!built) continue;
    const start = map[h.start];
    const end = map[h.end];
    return { ...built, text: text.slice(start, end), start, end };
  }
  return null;
}

// ---------- Utilidades para quien consume las menciones ----------

// Quita del texto los rangos dados (fechas y horas) — así "el 15 de marzo" o "a las 5" no cuentan como montos.
export function removeRanges(text: string, ranges: Array<{ start: number; end: number }>): string {
  if (ranges.length === 0) return text;
  const sorted = ranges.slice().sort((a, b) => a.start - b.start);
  let out = '';
  let pos = 0;
  for (const r of sorted) {
    if (r.start < pos) continue;
    out += text.slice(pos, r.start) + ' ';
    pos = r.end;
  }
  out += text.slice(pos);
  return out.replace(/\s{2,}/g, ' ').trim();
}

const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// "hoy", "ayer", "antier", "el lunes", "3 oct", "3 oct 2025" — para resúmenes cortos de confirmación.
export function describeDateEs(iso: string, now: Date = new Date()): string {
  const d = parseISODate(iso);
  const today = startOfDay(now);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'hoy';
  if (diff === -1) return 'ayer';
  if (diff === -2) return 'antier';
  if (diff === 1) return 'mañana';
  if (diff === 2) return 'pasado mañana';
  if (diff < 0 && diff >= -6) return `el ${WEEKDAY_NAMES[d.getDay()]}`;
  const base = `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
  return d.getFullYear() === today.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

// Fecha de un movimiento: mediodía local del día dicho (así ninguna zona horaria lo corre de día).
export function isoDateToTimestamp(iso: string): string {
  const d = parseISODate(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).toISOString();
}

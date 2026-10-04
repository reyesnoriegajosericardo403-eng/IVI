// "Cada mes", "cada quincena", "todos los viernes", "el 5 de cada mes", "cada 2 semanas", "cada año"… en español → una
// Recurrence (src/utils/recurrence.ts). Pura y determinista (recibe `now`). Nunca inventa: si no hay una repetición clara
// devuelve null. Devuelve también los rangos que ocupó para que quien llama los recorte antes de buscar montos y nombres
// ("cada 2 semanas" no es un monto de 2; "el 5 de cada mes" no es una fecha suelta).
import { toISODate } from '@/utils/date';
import { nextOccurrence, parseYmd, validateRecurrence, type Recurrence } from '@/utils/recurrence';

import { findDateMentions } from './dates';

export interface RecurrenceMention {
  recurrence: Recurrence;
  ranges: Array<{ start: number; end: number }>;
  text: string;
}

// Sin acentos ni mayúsculas, pero de la MISMA longitud que el original (así los índices valen para los dos).
function foldKeep(text: string): string {
  const map: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n', Á: 'a', É: 'e', Í: 'i', Ó: 'o', Ú: 'u', Ü: 'u', Ñ: 'n' };
  return text.replace(/[áéíóúüñÁÉÍÓÚÜÑ]/g, (c) => map[c]).toLowerCase();
}

const WEEKDAYS: Record<string, number> = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
const WD = '(domingo|lunes|martes|miercoles|jueves|viernes|sabado)s?';
const NUM_WORDS: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12 };
const N = '(\\d{1,3}|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)';
const numOf = (s: string): number => (/^\d+$/.test(s) ? parseInt(s, 10) : NUM_WORDS[s] ?? 1);
const UNIT_FREQ: Record<string, 'daily' | 'weekly' | 'monthly' | 'yearly'> = { dia: 'daily', dias: 'daily', semana: 'weekly', semanas: 'weekly', mes: 'monthly', meses: 'monthly', ano: 'yearly', anos: 'yearly' };

interface Hit {
  frequency: Recurrence['frequency'];
  interval: number;
  dayOfMonth?: number;
  weekdays?: number[];
  semimonthlyDays?: [number, number];
  start: number;
  end: number;
}

function matchCore(f: string): Hit | null {
  let m: RegExpMatchArray | null;
  const hit = (frequency: Hit['frequency'], interval: number, mm: RegExpMatchArray, extra: Partial<Hit> = {}): Hit => ({ frequency, interval, start: mm.index!, end: mm.index! + mm[0].length, ...extra });

  // Quincena: "cada quincena", "quincenal(mente)", "el 15 y 30 de cada mes", "los días 10 y 25 de cada mes"
  if ((m = f.match(/\b(?:los\s+dias\s+|el\s+dia\s+|los\s+|el\s+)?(\d{1,2})\s+y\s+(?:el\s+)?(\d{1,2})\s+de\s+cada\s+mes\b/)) && +m[1] !== +m[2] && +m[1] >= 1 && +m[1] <= 31 && +m[2] >= 1 && +m[2] <= 31) {
    const [a, b] = [+m[1], +m[2]].sort((x, y) => x - y);
    return hit('semimonthly', 1, m, { semimonthlyDays: [a, b] });
  }
  if ((m = f.match(/\b(?:cada\s+quincena|todas\s+las\s+quincenas|quincenal(?:es|mente)?)\b/))) return hit('semimonthly', 1, m);

  // Semanal por día: "cada viernes", "todos los lunes", "cada lunes y jueves"
  if ((m = f.match(new RegExp(`\\b(?:cada|todos\\s+los|los)\\s+${WD}(?:\\s*(?:,|y)\\s*${WD})*\\b`)))) {
    const days = [...m[0].matchAll(new RegExp(WD, 'g'))].map((x) => WEEKDAYS[x[1]]);
    if (days.length) return hit('weekly', 1, m, { weekdays: [...new Set(days)] });
  }
  // "cada 2 semanas", "cada dos meses", "cada 15 días", "cada año", "cada semana"
  if ((m = f.match(new RegExp(`\\bcada\\s+(?:${N}\\s+)?(dia(?!\\s+(?:el\\s+)?\\d{1,2}\\b)|dias|semanas?|meses|mes|anos?)\\b`)))) {
    const unit = UNIT_FREQ[m[2]];
    if (unit) {
      const interval = m[1] ? numOf(m[1]) : 1;
      if (interval >= 1 && interval <= 366) return hit(unit, interval, m);
    }
  }
  if ((m = f.match(/\btodos\s+los\s+(dias|meses|anos)\b/))) return hit(UNIT_FREQ[m[1]], 1, m);
  if ((m = f.match(/\b(mensual(?:es|mente)?|diari[oa]s?|diariamente|semanal(?:es|mente)?|anual(?:es|mente)?|bimestral(?:es|mente)?|trimestral(?:es|mente)?)\b/))) {
    const w = m[1];
    if (w.startsWith('mensual')) return hit('monthly', 1, m);
    if (w.startsWith('diari')) return hit('daily', 1, m);
    if (w.startsWith('semanal')) return hit('weekly', 1, m);
    if (w.startsWith('anual')) return hit('yearly', 1, m);
    if (w.startsWith('bimestral')) return hit('monthly', 2, m);
    return hit('monthly', 3, m);
  }
  return null;
}

// "el 5 de cada mes", "cada mes el 5", "cada día 5", "el último día del mes", "a fin de mes", "cada primero"
function matchDayOfMonth(f: string): { day: number; start: number; end: number } | null {
  let m: RegExpMatchArray | null;
  const out = (day: number, mm: RegExpMatchArray) => ({ day, start: mm.index!, end: mm.index! + mm[0].length });
  if ((m = f.match(/\b(?:el\s+)?(?:dia\s+)?(\d{1,2})\s+de\s+cada\s+(?:mes|ano)\b/)) && +m[1] >= 1 && +m[1] <= 31) return out(+m[1], m);
  if ((m = f.match(/\bcada\s+(?:mes|dia)\s+(?:el\s+)?(?:dia\s+)?(\d{1,2})\b(?!\s*(?:de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre))/)) && +m[1] >= 1 && +m[1] <= 31) {
    return out(+m[1], m);
  }
  if ((m = f.match(/\b(?:cada\s+)?(?:a\s+)?(?:fin(?:es)?\s+de\s+mes|ultimo\s+dia\s+(?:de\s+cada\s+|del\s+)mes|el\s+ultimo\s+dia\s+de\s+cada\s+mes)\b/))) return out(31, m);
  if ((m = f.match(/\b(?:el\s+)?primero\s+de\s+cada\s+mes\b|\bcada\s+primero\b/))) return out(1, m);
  return null;
}

export function findRecurrence(rawText: string, now: Date = new Date()): RecurrenceMention | null {
  if (rawText.length > 4000) return null;
  const f = foldKeep(rawText);
  const core = matchCore(f);
  const dom = matchDayOfMonth(f);
  // "el 5 de cada mes" sin más es mensual aunque no diga "cada mes" aparte
  let hit: Hit | null = core;
  if (!hit && dom) hit = { frequency: 'monthly', interval: 1, start: dom.start, end: dom.end };
  if (!hit) return null;

  const ranges: Array<{ start: number; end: number }> = [{ start: hit.start, end: hit.end }];
  let dayOfMonth = hit.dayOfMonth;
  if (dom && (hit.frequency === 'monthly' || hit.frequency === 'yearly')) {
    dayOfMonth = dom.day;
    if (dom.start < hit.start || dom.start >= hit.end) ranges.push({ start: dom.start, end: dom.end });
  }

  const rec: Recurrence = { frequency: hit.frequency, interval: hit.interval, startDate: toISODate(now) };
  if (hit.weekdays) rec.weekdays = hit.weekdays;
  if (hit.semimonthlyDays) rec.semimonthlyDays = hit.semimonthlyDays;

  // Fechas dichas FUERA de la repetición: "a partir del 1 de noviembre" (inicio), "hasta el 31 de diciembre" (fin), o el día
  // concreto de un pago mensual/anual ("cada mes el 5", "cada año el 15 de marzo").
  const inRanges = (d: { start: number; end: number }) => ranges.some((r) => d.start < r.end && d.end > r.start);
  const mentions = findDateMentions(rawText, now, { prefer: 'future' }).filter((d) => !inRanges(d));
  let start: string | undefined;
  for (const d of mentions) {
    const before = f.slice(0, d.start);
    const until = before.match(/\bhasta\s+(?:el\s+)?(?:dia\s+)?$/);
    const from = before.match(/\b(?:a\s+partir\s+(?:del?|de\s+el)|desde|empezando|comenzando|iniciando)\s+(?:el\s+)?(?:dia\s+)?$/);
    if (until) {
      rec.endDate = d.iso;
      ranges.push({ start: until.index!, end: d.end });
    } else if (from) {
      start = d.iso;
      ranges.push({ start: from.index!, end: d.end });
    } else if ((hit.frequency === 'monthly' || hit.frequency === 'yearly') && dayOfMonth === undefined && (d.kind === 'dayOfMonth' || d.kind === 'absolute')) {
      const p = parseYmd(d.iso);
      if (p) {
        dayOfMonth = p.d;
        if (hit.frequency === 'yearly') rec.month = p.m;
        ranges.push({ start: d.start, end: d.end });
      }
    } else if (hit.frequency === 'weekly' && !rec.weekdays && d.kind === 'weekday') {
      const p = parseYmd(d.iso);
      if (p) {
        rec.weekdays = [new Date(p.y, p.m - 1, p.d).getDay()];
        ranges.push({ start: d.start, end: d.end });
      }
    }
  }
  if (dayOfMonth !== undefined) rec.dayOfMonth = dayOfMonth;
  if (hit.frequency === 'yearly' && rec.month === undefined && dayOfMonth !== undefined) rec.month = now.getMonth() + 1;

  // "durante 6 meses", "por 12 meses", "6 veces"
  const unitOf: Record<string, string> = { daily: 'dias?', weekly: 'semanas?', monthly: 'meses', yearly: 'anos?', semimonthly: 'quincenas?' };
  const dur = f.match(new RegExp(`\\b(?:durante|por|por\\s+un\\s+total\\s+de)\\s+${N}\\s+(?:${unitOf[hit.frequency]}|veces)\\b`));
  if (dur) {
    rec.count = numOf(dur[1]);
    ranges.push({ start: dur.index!, end: dur.index! + dur[0].length });
  }

  // Primera fecha: la dicha, o la próxima vez que toca desde hoy.
  if (start) rec.startDate = start;
  else {
    const first = nextOccurrence({ ...rec, startDate: toISODate(now) }, toISODate(now));
    if (first) rec.startDate = first;
  }
  if (validateRecurrence(rec)) return null;
  return { recurrence: rec, ranges, text: rawText.slice(hit.start, hit.end) };
}

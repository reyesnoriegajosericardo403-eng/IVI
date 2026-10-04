// Calendario (.ics, RFC 5545) para llevar los avisos a Apple Calendar / Google Calendar / Outlook. Es el respaldo
// que no depende de nuestro servidor: aunque falle una notificación push, el teléfono suena con su propio calendario.
// Puro (sin React ni red). NUNCA lleva montos ni saldos: solo el título que escribió la persona.

export interface IcsEvent {
  uid: string; // estable: re-importar el archivo actualiza el evento en vez de duplicarlo
  date: string; // AAAA-MM-DD (evento de todo el día)
  title: string;
  description?: string;
  // alarmas: cuántos días antes y a qué hora (0 = ese mismo día). Por defecto: ese día a las 9:00.
  alarms?: Array<{ daysBefore: number; time?: string }>;
}

const CRLF = '\r\n';

export function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// Las líneas de más de 75 octetos se parten (RFC 5545 §3.1); la continuación empieza con un espacio.
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let curBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (curBytes + b > limit) {
      out.push(cur);
      cur = '';
      curBytes = 0;
      limit = 74; // el espacio de continuación cuenta
    }
    cur += ch;
    curBytes += b;
  }
  out.push(cur);
  return out.join(CRLF + ' ');
}

const compact = (iso: string): string => iso.replace(/-/g, '');
const utcStamp = (d: Date): string => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

// Desplazamiento de una alarma relativa al INICIO del día del evento: "2 días antes a las 9:00" = −(2·24h − 9h) = −39h.
export function alarmTrigger(daysBefore: number, time = '09:00'): string {
  const [h, m] = time.split(':').map(Number);
  const totalMin = daysBefore * 24 * 60 - ((h || 0) * 60 + (m || 0));
  if (totalMin === 0) return 'PT0S';
  const sign = totalMin > 0 ? '-' : '';
  const abs = Math.abs(totalMin);
  const hh = Math.floor(abs / 60);
  const mm = abs % 60;
  return `${sign}PT${hh}H${mm ? `${mm}M` : ''}`;
}

export function buildIcs(events: IcsEvent[], opts: { calendarName?: string; now?: Date } = {}): string {
  const now = opts.now ?? new Date();
  const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VALU Finance AI//Avisos//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  if (opts.calendarName) lines.push(`X-WR-CALNAME:${escapeIcsText(opts.calendarName)}`);
  const seen = new Set<string>();
  for (const e of events) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || seen.has(e.uid)) continue;
    seen.add(e.uid);
    const [y, mo, d] = e.date.split('-').map(Number);
    const next = new Date(Date.UTC(y, mo - 1, d + 1)).toISOString().slice(0, 10); // DTEND de un evento de día completo es exclusivo
    lines.push('BEGIN:VEVENT', `UID:${e.uid}@valu.app`, `DTSTAMP:${utcStamp(now)}`, `DTSTART;VALUE=DATE:${compact(e.date)}`, `DTEND;VALUE=DATE:${compact(next)}`, `SUMMARY:${escapeIcsText(e.title.slice(0, 120))}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeIcsText(e.description.slice(0, 500))}`);
    lines.push('TRANSP:TRANSPARENT');
    for (const a of e.alarms ?? [{ daysBefore: 0, time: '09:00' }]) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeIcsText(e.title.slice(0, 120))}`, `TRIGGER;RELATED=START:${alarmTrigger(a.daysBefore, a.time)}`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}

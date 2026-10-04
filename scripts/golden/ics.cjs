// Pruebas del generador de calendario .ics (src/utils/ics.ts).
//   node scripts/golden/ics.cjs [--show]
require('./ts-hook.cjs');
const assert = require('assert');
const I = require('@/utils/ics');

let ok = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); ok++; if (process.argv.includes('--show')) console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name, '\n     ', String(e.stack || e.message).split('\n').slice(0, 3).join('\n      ')); }
};
const NOW = new Date('2026-10-04T12:00:00Z');
const unfold = (s) => s.replace(/\r\n /g, '');

t('estructura válida: BEGIN/END, CRLF, versión, un VEVENT por evento', () => {
  const ics = I.buildIcs([{ uid: 'a', date: '2026-10-15', title: 'Pago de la tarjeta' }, { uid: 'b', date: '2026-10-20', title: 'Renta' }], { now: NOW, calendarName: 'VALU' });
  assert(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0'));
  assert(ics.endsWith('END:VCALENDAR\r\n'));
  assert.strictEqual((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.strictEqual((ics.match(/END:VEVENT/g) || []).length, 2);
  assert(!/[^\r]\n/.test(ics), 'todos los saltos son CRLF');
});
t('evento de día completo: DTSTART/DTEND con DTEND exclusivo (también al cambiar de mes y de año)', () => {
  const u = unfold(I.buildIcs([{ uid: 'a', date: '2026-10-31', title: 'x' }, { uid: 'b', date: '2026-12-31', title: 'y' }, { uid: 'c', date: '2028-02-28', title: 'z' }], { now: NOW }));
  assert(u.includes('DTSTART;VALUE=DATE:20261031\r\nDTEND;VALUE=DATE:20261101'));
  assert(u.includes('DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101'));
  assert(u.includes('DTSTART;VALUE=DATE:20280228\r\nDTEND;VALUE=DATE:20280229'), 'bisiesto');
});
t('UID estable y distinto por evento; se descartan duplicados y fechas inválidas', () => {
  const ics = I.buildIcs([{ uid: 'a', date: '2026-10-15', title: 'x' }, { uid: 'a', date: '2026-10-16', title: 'dup' }, { uid: 'c', date: 'mañana', title: 'mala' }], { now: NOW });
  assert.strictEqual((ics.match(/BEGIN:VEVENT/g) || []).length, 1);
  assert(ics.includes('UID:a@valu.app'));
  assert.strictEqual(I.buildIcs([{ uid: 'a', date: '2026-10-15', title: 'x' }], { now: NOW }), I.buildIcs([{ uid: 'a', date: '2026-10-15', title: 'x' }], { now: NOW }));
});
t('el texto se escapa (coma, punto y coma, diagonal, salto de línea)', () => {
  assert.strictEqual(I.escapeIcsText('a, b; c \\ d\ne'), 'a\\, b\; c \\\\ d\\ne');
  const u = unfold(I.buildIcs([{ uid: 'a', date: '2026-10-15', title: 'Luz, agua; gas' }], { now: NOW }));
  assert(u.includes('SUMMARY:Luz\\, agua\; gas'));
});
t('ninguna línea pasa de 75 octetos (acentos y emojis incluidos) y desplegar devuelve el texto original', () => {
  const title = 'Pago de la tarjeta de crédito de la tienda departamental con acentos áéíóú ñ 💳 muy largo muy largo';
  const ics = I.buildIcs([{ uid: 'a', date: '2026-10-15', title, description: title + title }], { now: NOW });
  for (const line of ics.split('\r\n')) assert(new TextEncoder().encode(line).length <= 75, `${line.length}: ${line}`);
  assert(unfold(ics).includes(`SUMMARY:${I.escapeIcsText(title)}`));
  assert(unfold(ics).includes(`DESCRIPTION:${I.escapeIcsText(title + title)}`));
});
t('alarmas: ese día 9:00 = +PT9H… se expresan relativas al inicio del día', () => {
  assert.strictEqual(I.alarmTrigger(0, '09:00'), 'PT9H');
  assert.strictEqual(I.alarmTrigger(1, '09:00'), '-PT15H');
  assert.strictEqual(I.alarmTrigger(3, '08:30'), '-PT63H30M');
  assert.strictEqual(I.alarmTrigger(0, '00:00'), 'PT0S');
});
t('por defecto hay una alarma; puede haber varias (3 días antes y el mismo día)', () => {
  const one = I.buildIcs([{ uid: 'a', date: '2026-10-15', title: 'x' }], { now: NOW });
  assert.strictEqual((one.match(/BEGIN:VALARM/g) || []).length, 1);
  const many = I.buildIcs([{ uid: 'a', date: '2026-10-15', title: 'x', alarms: [{ daysBefore: 3 }, { daysBefore: 1 }, { daysBefore: 0 }] }], { now: NOW });
  assert.strictEqual((many.match(/BEGIN:VALARM/g) || []).length, 3);
  assert(many.includes('TRIGGER;RELATED=START:-PT63H'));
});
t('un título vacío o enorme no rompe el archivo', () => {
  const ics = I.buildIcs([{ uid: 'a', date: '2026-10-15', title: '' }, { uid: 'b', date: '2026-10-15', title: 'x'.repeat(5000) }], { now: NOW });
  assert.strictEqual((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
  for (const line of ics.split('\r\n')) assert(new TextEncoder().encode(line).length <= 75);
});
t('cero eventos produce un calendario vacío pero válido', () => {
  const ics = I.buildIcs([], { now: NOW });
  assert(ics.includes('BEGIN:VCALENDAR') && ics.includes('END:VCALENDAR') && !ics.includes('VEVENT'));
});

console.log(`\nCalendario .ics: ${ok} OK, ${fail} fallan`);
process.exit(fail ? 1 : 0);

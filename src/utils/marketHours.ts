// Horario aproximado del mercado accionario de EE. UU. (NYSE/Nasdaq):
// lunes a viernes, 9:30–16:00 hora del este (America/New_York). No
// contempla días festivos del mercado (Acción de Gracias, Navidad, etc.)
// — es una aproximación honesta, no una fuente oficial de calendario
// bursátil. Sirve para no gastar llamadas al proveedor de precios cuando
// claramente no tiene caso (spec: "no tiene caso actualizar el precio de
// acciones cuando no está" abierto el mercado).
export function isUsMarketOpenNow(date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  const isWeekday = !['Sat', 'Sun'].includes(weekday);
  const minutesSinceMidnight = hour * 60 + minute;
  const isDuringSession = minutesSinceMidnight >= 9 * 60 + 30 && minutesSinceMidnight < 16 * 60;

  return isWeekday && isDuringSession;
}

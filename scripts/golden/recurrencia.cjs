// Pruebas de las reglas de recurrencia (src/utils/recurrence.ts). Los valores esperados son HECHOS DE CALENDARIO escritos a
// mano (el 3 de octubre de 2026 es sábado; 2028 es bisiesto; 2100 no), nunca copiados de la salida del código.
//   node scripts/golden/recurrencia.cjs [--show]
require('./ts-hook.cjs');
const assert = require('assert');
const R = require('@/utils/recurrence');

let ok = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); ok++; if (process.argv.includes('--show')) console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name, '\n     ', String(e.message).split('\n').slice(0, 3).join('\n      ')); }
};
const rule = (frequency, startDate, extra = {}) => ({ frequency, interval: 1, startDate, ...extra });
const occ = (r, from, to) => R.occurrencesBetween(r, from, to);

// ---------- calendario ----------
t('día de la semana: 2026-10-03 es sábado; 2000-01-01 sábado; 1970-01-01 jueves; 2028-02-29 martes', () => {
  assert.strictEqual(R.weekdayOf(R.parseYmd('2026-10-03')), 6);
  assert.strictEqual(R.weekdayOf(R.parseYmd('2000-01-01')), 6);
  assert.strictEqual(R.weekdayOf(R.parseYmd('1970-01-01')), 4);
  assert.strictEqual(R.weekdayOf(R.parseYmd('2028-02-29')), 2);
});
t('años bisiestos: 2024 y 2028 sí; 2100 y 2026 no; 2000 sí', () => {
  assert.deepStrictEqual([2024, 2028, 2100, 2026, 2000].map(R.isLeap), [true, true, false, false, true]);
});
t('parseYmd rechaza fechas imposibles', () => {
  for (const bad of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '2026-1-1', 'hola', '', '2026-12-32']) assert.strictEqual(R.parseYmd(bad), null, bad);
  assert.notStrictEqual(R.parseYmd('2028-02-29'), null);
});
t('diffDaysIso: 3 oct → 25 dic 2026 = 83; antes → negativo; mismo día 0; cruza año bisiesto', () => {
  assert.strictEqual(R.diffDaysIso('2026-10-03', '2026-12-25'), 83);
  assert.strictEqual(R.diffDaysIso('2026-12-25', '2026-10-03'), -83);
  assert.strictEqual(R.diffDaysIso('2026-10-03', '2026-10-03'), 0);
  assert.strictEqual(R.diffDaysIso('2028-02-28', '2028-03-01'), 2);
  assert.strictEqual(R.diffDaysIso('2027-02-28', '2027-03-01'), 1);
});
t('addDaysIso cruza mes, año y bisiesto', () => {
  assert.strictEqual(R.addDaysIso('2026-12-31', 1), '2027-01-01');
  assert.strictEqual(R.addDaysIso('2028-02-28', 1), '2028-02-29');
  assert.strictEqual(R.addDaysIso('2027-02-28', 1), '2027-03-01');
  assert.strictEqual(R.addDaysIso('2026-03-01', -1), '2026-02-28');
  assert.strictEqual(R.addDaysIso('2026-10-03', 0), '2026-10-03');
  assert.strictEqual(R.addDaysIso('2026-10-03', 365), '2027-10-03');
});
t('addMonthsIso ajusta al último día del mes', () => {
  assert.strictEqual(R.addMonthsIso('2026-01-31', 1), '2026-02-28');
  assert.strictEqual(R.addMonthsIso('2026-03-31', -1), '2026-02-28');
  assert.strictEqual(R.addMonthsIso('2028-01-31', 1), '2028-02-29');
  assert.strictEqual(R.addMonthsIso('2026-11-30', 3), '2027-02-28');
  assert.strictEqual(R.addMonthsIso('2026-12-15', 1), '2027-01-15');
  assert.strictEqual(R.addMonthsIso('2026-01-15', -1), '2025-12-15');
  assert.strictEqual(R.addMonthsIso('2026-05-31', 1), '2026-06-30');
});

// ---------- mensual ----------
t('mensual el 31: respeta meses cortos (ene 31, feb 28, mar 31, abr 30…)', () => {
  assert.deepStrictEqual(occ(rule('monthly', '2026-01-31', { dayOfMonth: 31 }), '2026-01-01', '2026-06-30'), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30']);
});
t('mensual el 30 en febrero bisiesto → 29; en no bisiesto → 28', () => {
  assert.deepStrictEqual(occ(rule('monthly', '2028-01-30', { dayOfMonth: 30 }), '2028-01-01', '2028-03-31'), ['2028-01-30', '2028-02-29', '2028-03-30']);
  assert.deepStrictEqual(occ(rule('monthly', '2027-01-30', { dayOfMonth: 30 }), '2027-01-01', '2027-03-31'), ['2027-01-30', '2027-02-28', '2027-03-30']);
});
t('mensual por defecto usa el día de la fecha de inicio', () => {
  assert.deepStrictEqual(occ(rule('monthly', '2026-10-05'), '2026-10-01', '2027-01-31'), ['2026-10-05', '2026-11-05', '2026-12-05', '2027-01-05']);
});
t('mensual: si el día ya pasó en el mes de inicio, la primera es la del mes siguiente', () => {
  assert.deepStrictEqual(occ(rule('monthly', '2026-10-20', { dayOfMonth: 5 }), '2026-10-01', '2026-12-31'), ['2026-11-05', '2026-12-05']);
});
t('cada 2 meses desde enero: ene, mar, may… (la fase se ancla al inicio)', () => {
  assert.deepStrictEqual(occ(rule('monthly', '2026-01-15', { interval: 2, dayOfMonth: 15 }), '2026-01-01', '2026-08-31'), ['2026-01-15', '2026-03-15', '2026-05-15', '2026-07-15']);
});
t('cada 3 meses (trimestral) cruza el año', () => {
  assert.deepStrictEqual(occ(rule('monthly', '2026-11-10', { interval: 3 }), '2026-01-01', '2027-12-31'), ['2026-11-10', '2027-02-10', '2027-05-10', '2027-08-10', '2027-11-10']);
});
t('cada 12 meses equivale a anual', () => {
  assert.deepStrictEqual(occ(rule('monthly', '2026-03-15', { interval: 12 }), '2026-01-01', '2028-12-31'), ['2026-03-15', '2027-03-15', '2028-03-15']);
});

// ---------- quincenal ----------
t('quincena por defecto: 15 y último día (feb 2026: 15 y 28; mar: 15 y 31)', () => {
  assert.deepStrictEqual(occ(rule('semimonthly', '2026-02-01'), '2026-02-01', '2026-03-31'), ['2026-02-15', '2026-02-28', '2026-03-15', '2026-03-31']);
});
t('quincena en febrero bisiesto: 15 y 29', () => {
  assert.deepStrictEqual(occ(rule('semimonthly', '2028-02-01'), '2028-02-01', '2028-02-29'), ['2028-02-15', '2028-02-29']);
});
t('quincena empezando el día 20: la primera es el último día de ese mes', () => {
  assert.deepStrictEqual(occ(rule('semimonthly', '2026-10-20'), '2026-10-01', '2026-11-30'), ['2026-10-31', '2026-11-15', '2026-11-30']);
});
t('quincena personalizada 1 y 16', () => {
  assert.deepStrictEqual(occ(rule('semimonthly', '2026-10-01', { semimonthlyDays: [1, 16] }), '2026-10-01', '2026-11-30'), ['2026-10-01', '2026-10-16', '2026-11-01', '2026-11-16']);
});
t('quincena con días 30 y 31 en febrero no duplica el 28', () => {
  assert.deepStrictEqual(occ(rule('semimonthly', '2026-02-01', { semimonthlyDays: [30, 31] }), '2026-02-01', '2026-03-31'), ['2026-02-28', '2026-03-30', '2026-03-31']);
});

// ---------- semanal ----------
t('semanal por defecto: el día de la semana del inicio (sábado 3 oct)', () => {
  assert.deepStrictEqual(occ(rule('weekly', '2026-10-03'), '2026-10-01', '2026-10-31'), ['2026-10-03', '2026-10-10', '2026-10-17', '2026-10-24', '2026-10-31']);
});
t('lunes y jueves, empezando un jueves (1 oct): jue 1, lun 5, jue 8, lun 12…', () => {
  assert.deepStrictEqual(occ(rule('weekly', '2026-10-01', { weekdays: [1, 4] }), '2026-10-01', '2026-10-15'), ['2026-10-01', '2026-10-05', '2026-10-08', '2026-10-12', '2026-10-15']);
});
t('cada 2 semanas los viernes desde el viernes 2 oct: 2, 16, 30', () => {
  assert.deepStrictEqual(occ(rule('weekly', '2026-10-02', { interval: 2, weekdays: [5] }), '2026-10-01', '2026-11-05'), ['2026-10-02', '2026-10-16', '2026-10-30']);
});
t('domingo cuenta como el ÚLTIMO día de la semana (semana lunes→domingo): inicio sábado con [0] da el domingo siguiente', () => {
  assert.deepStrictEqual(occ(rule('weekly', '2026-10-03', { weekdays: [0] }), '2026-10-01', '2026-10-20'), ['2026-10-04', '2026-10-11', '2026-10-18']);
});
t('semanal con días repetidos o desordenados sale una sola vez y en orden', () => {
  assert.deepStrictEqual(occ(rule('weekly', '2026-10-05', { weekdays: [5, 1, 5, 1] }), '2026-10-05', '2026-10-11'), ['2026-10-05', '2026-10-09']);
});

// ---------- diaria ----------
t('cada 3 días', () => {
  assert.deepStrictEqual(occ(rule('daily', '2026-10-01', { interval: 3 }), '2026-10-01', '2026-10-13'), ['2026-10-01', '2026-10-04', '2026-10-07', '2026-10-10', '2026-10-13']);
});
t('todos los días cruza fin de mes y de año', () => {
  assert.deepStrictEqual(occ(rule('daily', '2026-12-30'), '2026-12-29', '2027-01-02'), ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
});

// ---------- anual ----------
t('anual desde un 29 de febrero: 28 en años normales, 29 en bisiestos', () => {
  assert.deepStrictEqual(occ(rule('yearly', '2024-02-29'), '2024-01-01', '2028-12-31'), ['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']);
});
t('anual con mes y día explícitos: si ya pasó este año, la primera es la del año siguiente', () => {
  assert.deepStrictEqual(occ(rule('yearly', '2026-10-03', { month: 3, dayOfMonth: 15 }), '2026-01-01', '2029-12-31'), ['2027-03-15', '2028-03-15', '2029-03-15']);
});
t('cada 2 años', () => {
  assert.deepStrictEqual(occ(rule('yearly', '2026-06-01', { interval: 2 }), '2026-01-01', '2032-12-31'), ['2026-06-01', '2028-06-01', '2030-06-01', '2032-06-01']);
});

// ---------- límites: fin, cantidad ----------
t('endDate es inclusivo', () => {
  assert.deepStrictEqual(occ(rule('monthly', '2026-01-05', { endDate: '2026-03-05' }), '2026-01-01', '2026-12-31'), ['2026-01-05', '2026-02-05', '2026-03-05']);
  assert.deepStrictEqual(occ(rule('monthly', '2026-01-05', { endDate: '2026-03-04' }), '2026-01-01', '2026-12-31'), ['2026-01-05', '2026-02-05']);
});
t('count limita el total desde el inicio, aunque se consulte un rango posterior', () => {
  const r = rule('monthly', '2026-01-05', { count: 3 });
  assert.deepStrictEqual(occ(r, '2026-01-01', '2026-12-31'), ['2026-01-05', '2026-02-05', '2026-03-05']);
  assert.deepStrictEqual(occ(r, '2026-02-10', '2026-12-31'), ['2026-03-05']);
  assert.deepStrictEqual(occ(r, '2026-06-01', '2026-12-31'), []);
});
t('count 1 = una sola vez; count en semanal con 2 días', () => {
  assert.deepStrictEqual(occ(rule('monthly', '2026-10-05', { count: 1 }), '2026-01-01', '2027-12-31'), ['2026-10-05']);
  assert.deepStrictEqual(occ(rule('weekly', '2026-10-05', { weekdays: [1, 3], count: 3 }), '2026-10-01', '2026-12-31'), ['2026-10-05', '2026-10-07', '2026-10-12']);
});
t('rango que termina antes del inicio → vacío', () => {
  assert.deepStrictEqual(occ(rule('monthly', '2026-10-05'), '2026-01-01', '2026-09-30'), []);
});

// ---------- siguiente / anterior ----------
t('nextOccurrence: en o después de una fecha; incluye el mismo día', () => {
  const r = rule('monthly', '2026-01-20', { dayOfMonth: 20 });
  assert.strictEqual(R.nextOccurrence(r, '2026-10-03'), '2026-10-20');
  assert.strictEqual(R.nextOccurrence(r, '2026-10-20'), '2026-10-20');
  assert.strictEqual(R.nextOccurrence(r, '2026-10-21'), '2026-11-20');
  assert.strictEqual(R.nextOccurrence(r, '2026-12-21'), '2027-01-20');
});
t('nextOccurrence devuelve null si la regla ya terminó', () => {
  assert.strictEqual(R.nextOccurrence(rule('monthly', '2026-01-05', { endDate: '2026-03-05' }), '2026-04-01'), null);
  assert.strictEqual(R.nextOccurrence(rule('monthly', '2026-01-05', { count: 2 }), '2026-03-01'), null);
});
t('previousOccurrence: estrictamente antes de una fecha', () => {
  const r = rule('monthly', '2026-01-20', { dayOfMonth: 20 });
  assert.strictEqual(R.previousOccurrence(r, '2026-10-20'), '2026-09-20');
  assert.strictEqual(R.previousOccurrence(r, '2026-10-21'), '2026-10-20');
  assert.strictEqual(R.previousOccurrence(r, '2026-01-20'), null);
});

// ---------- validación ----------
t('validateRecurrence rechaza reglas inválidas con mensaje', () => {
  const bad = [
    rule('monthly', '2026-02-30'), rule('monthly', '2026-01-05', { interval: 0 }), rule('monthly', '2026-01-05', { interval: 1.5 }), rule('monthly', '2026-01-05', { dayOfMonth: 32 }),
    rule('weekly', '2026-01-05', { weekdays: [7] }), rule('weekly', '2026-01-05', { weekdays: [] }), rule('yearly', '2026-01-05', { month: 13 }),
    rule('monthly', '2026-01-05', { endDate: '2025-12-31' }), rule('monthly', '2026-01-05', { count: 0 }), rule('semimonthly', '2026-01-05', { semimonthlyDays: [15, 15] }),
    { frequency: 'cada rato', interval: 1, startDate: '2026-01-05' }, rule('monthly', '2026-01-05', { interval: 1000 }), null, undefined,
  ];
  for (const r of bad) assert.strictEqual(typeof R.validateRecurrence(r), 'string', JSON.stringify(r));
  assert.strictEqual(R.validateRecurrence(rule('monthly', '2026-01-05')), null);
});
t('una regla inválida nunca genera fechas ni se cicla', () => {
  assert.deepStrictEqual(occ(rule('monthly', '2026-02-30'), '2026-01-01', '2026-12-31'), []);
  assert.strictEqual(R.nextOccurrence(rule('monthly', '2026-01-05', { interval: 0 }), '2026-01-01'), null);
});

// ---------- texto ----------
t('describeRecurrence en español', () => {
  assert.strictEqual(R.describeRecurrence(rule('monthly', '2026-01-05', { dayOfMonth: 5 })), 'cada mes, el día 5');
  assert.strictEqual(R.describeRecurrence(rule('monthly', '2026-01-31', { dayOfMonth: 31 })), 'cada mes, el último día');
  assert.strictEqual(R.describeRecurrence(rule('monthly', '2026-01-05', { interval: 3 })), 'cada 3 meses, el día 5');
  assert.strictEqual(R.describeRecurrence(rule('semimonthly', '2026-01-01')), 'cada quincena (el 15 y el último día del mes)');
  assert.strictEqual(R.describeRecurrence(rule('weekly', '2026-10-03')), 'todos los sábados');
  assert.strictEqual(R.describeRecurrence(rule('weekly', '2026-10-01', { weekdays: [4, 1] })), 'todos los lunes y jueves');
  assert.strictEqual(R.describeRecurrence(rule('weekly', '2026-10-02', { interval: 2, weekdays: [5] })), 'cada 2 semanas, los viernes');
  assert.strictEqual(R.describeRecurrence(rule('daily', '2026-10-01')), 'todos los días');
  assert.strictEqual(R.describeRecurrence(rule('daily', '2026-10-01', { interval: 3 })), 'cada 3 días');
  assert.strictEqual(R.describeRecurrence(rule('yearly', '2026-03-15')), 'cada año, el 15 de marzo');
  assert.strictEqual(R.shortDateEs('2026-10-05'), '5 oct 2026');
});

// ---------- propiedades (fuzz determinista) ----------
let seed = 424242;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
t('propiedades: 4,000 reglas al azar → fechas válidas, ascendentes, sin repetir, dentro de [inicio, fin], count respetado, día correcto', () => {
  for (let i = 0; i < 4000; i++) {
    const y = ri(2024, 2030), m = ri(1, 12), d = ri(1, R.daysInMonth(y, m));
    const startDate = R.isoOf({ y, m, d });
    const freq = ['daily', 'weekly', 'monthly', 'yearly', 'semimonthly'][ri(0, 4)];
    const r = { frequency: freq, interval: ri(1, 5), startDate };
    if (freq === 'monthly' || freq === 'yearly') r.dayOfMonth = ri(1, 31);
    if (freq === 'yearly') r.month = ri(1, 12);
    if (freq === 'weekly' && rnd() < 0.6) r.weekdays = Array.from({ length: ri(1, 3) }, () => ri(0, 6));
    if (freq === 'semimonthly' && rnd() < 0.5) { const a = ri(1, 30); r.semimonthlyDays = [a, a + ri(1, 31 - a)]; }
    if (rnd() < 0.3) r.count = ri(1, 12);
    if (rnd() < 0.3) r.endDate = R.addDaysIso(startDate, ri(0, 900));
    assert.strictEqual(R.validateRecurrence(r), null, JSON.stringify(r));
    const to = R.addDaysIso(startDate, 1500);
    const list = R.occurrencesBetween(r, startDate, to, 3000);
    for (let k = 0; k < list.length; k++) {
      const p = R.parseYmd(list[k]);
      assert(p, `fecha inválida ${list[k]} en ${JSON.stringify(r)}`);
      assert(list[k] >= startDate && (!r.endDate || list[k] <= r.endDate), `fuera de rango ${list[k]} en ${JSON.stringify(r)}`);
      if (k > 0) assert(list[k] > list[k - 1], `no ascendente ${list[k - 1]} → ${list[k]} en ${JSON.stringify(r)}`);
      if (freq === 'monthly') assert.strictEqual(p.d, Math.min(r.dayOfMonth ?? R.parseYmd(startDate).d, R.daysInMonth(p.y, p.m)), `día ${list[k]} en ${JSON.stringify(r)}`);
      if (freq === 'weekly') assert((r.weekdays ?? [R.weekdayOf(R.parseYmd(startDate))]).includes(R.weekdayOf(p)), `weekday ${list[k]} en ${JSON.stringify(r)}`);
    }
    if (r.count) assert(list.length <= r.count, `count excedido en ${JSON.stringify(r)}`);
    // consistencia: nextOccurrence desde cada ocurrencia devuelve la misma; desde el día siguiente, la que sigue
    if (list.length >= 2) {
      assert.strictEqual(R.nextOccurrence(r, list[0]), list[0]);
      assert.strictEqual(R.nextOccurrence(r, R.addDaysIso(list[0], 1)), list[1]);
      assert.strictEqual(R.previousOccurrence(r, list[1]), list[0]);
    }
  }
});
t('rendimiento: diaria durante 10 años y consulta de un mes lejano < 100 ms', () => {
  const r = rule('daily', '2016-01-01');
  const t0 = process.hrtime.bigint();
  const list = occ(r, '2026-10-01', '2026-10-31');
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.strictEqual(list.length, 31);
  assert(ms < 100, `${ms.toFixed(0)} ms`);
});

// ---------- presets de la interfaz ----------
const P = require('@/utils/recurrencePresets');
t('presets: cada preset arma una repetición válida y presetOf lo reconoce de vuelta', () => {
  for (const { id } of P.RECURRENCE_PRESETS) {
    const r = P.buildRecurrence(id, '2026-10-05');
    assert.strictEqual(R.validateRecurrence(r), null, id);
    assert.strictEqual(P.presetOf(r), id, id);
    assert(R.nextOccurrence(r, '2026-10-05'), id);
  }
});
t('presets: mensual el 31 cae en el último día de cada mes; semanal usa el día de la semana de la primera fecha', () => {
  const m = P.buildRecurrence('monthly', '2026-01-31');
  assert.deepStrictEqual(R.occurrencesBetween(m, '2026-01-01', '2026-04-30'), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  const w = P.buildRecurrence('weekly', '2026-10-05'); // lunes
  assert.deepStrictEqual(R.occurrencesBetween(w, '2026-10-01', '2026-10-20'), ['2026-10-05', '2026-10-12', '2026-10-19']);
});
t('presets: fin por fecha o por número de veces, y validación del formulario', () => {
  const u = P.buildRecurrence('monthly', '2026-10-05', { mode: 'until', endDate: '2026-12-31' });
  assert.deepStrictEqual(R.occurrencesBetween(u, '2026-10-01', '2027-06-01'), ['2026-10-05', '2026-11-05', '2026-12-05']);
  const c = P.buildRecurrence('weekly', '2026-10-05', { mode: 'count', count: 2 });
  assert.strictEqual(R.occurrencesBetween(c, '2026-10-01', '2027-06-01').length, 2);
  assert.deepStrictEqual(P.endOf(u), { mode: 'until', endDate: '2026-12-31' });
  assert(P.validateRecurrenceForm(null, '2026-10-05', { mode: 'never' }));
  assert(P.validateRecurrenceForm('monthly', '', { mode: 'never' }));
  assert(P.validateRecurrenceForm('monthly', '2026-10-05', { mode: 'count', count: 0 }));
  assert(P.validateRecurrenceForm('monthly', '2026-10-05', { mode: 'until', endDate: '2026-01-01' }));
  assert.strictEqual(P.validateRecurrenceForm('monthly', '2026-10-05', { mode: 'never' }), null);
});

console.log(`\nRecurrencia: ${ok} OK, ${fail} fallan`);
process.exit(fail ? 1 : 0);

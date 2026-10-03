// Planificador del chat — conjunto SELLADO (escrito DESPUÉS de dejar pasando planes.cjs, sin correrlo antes). Se corre UNA
// sola vez (node scripts/golden/run-planes.cjs); su % es el que se reporta. Hoy = sábado 2026-10-03.
// Cuentas: BBVA 5000, Nu 1200, Morralla 300, Santander 800 (+ tarjeta Liverpool). Metas: Viaje 3000/20000, Laptop 500/30000, Moto 0/40000.
// Deudas: Banorte 8000 (vence 20-oct), Coppel 3000, Elektra 1500.
// expect: { kind: 'single'|'plan'|'clarification'|'none'|'reply', ... }
//   single: { type, args }       plan: { types: [...], args: [ {..}, ... ] }      clarification: { field }
// args comprueba solo un subconjunto de campos. "yesterday" = el movimiento quedó en el día de AYER.
const S = (type, args = {}) => ({ kind: 'single', type, args });
const P = (types, args = []) => ({ kind: 'plan', types, args });
const C = (field) => ({ kind: 'clarification', field });
const NONE = { kind: 'none' };
const T = 'transfer_between_accounts', CG = 'contribute_to_goal', WG = 'withdraw_from_goal', AT = 'add_transaction', AG = 'add_goal', UD = 'update_goal_date', UL = 'update_liability_due_date';

module.exports = [
  // ---- una sola acción ----
  ['pásale 300 de BBVA a Nu', S(T, { fromAccountName: 'BBVA', toAccountName: 'Nu', amount: 300 })],
  ['transfiérele 1000 a Nu desde BBVA', S(T, { fromAccountName: 'BBVA', toAccountName: 'Nu', amount: 1000 })],
  ['mueve mil pesos de mi cuenta Nu a mi BBVA', S(T, { fromAccountName: 'Nu', toAccountName: 'BBVA', amount: 1000 })],
  ['quiero pasar 2500 de BBVA a Morralla', S(T, { fromAccountName: 'BBVA', toAccountName: 'Morralla', amount: 2500 })],
  ['manda 150 de Santander a Nu', S(T, { fromAccountName: 'Santander', toAccountName: 'Nu', amount: 150 })],
  ['aporta 1500 a mi meta Viaje', S(CG, { goalName: 'Viaje', amount: 1500 })],
  ['ahorra 200 en mi meta Viaje', S(CG, { goalName: 'Viaje', amount: 200 })],
  ['mete 400 a la meta del Viaje', S(CG, { goalName: 'Viaje', amount: 400 })],
  ['abónale 600 a la meta Laptop', S(CG, { goalName: 'Laptop', amount: 600 })],
  ['crea una meta de ahorro llamada Casa con 200000', S(AG, { name: 'Casa', targetAmount: 200000 })],
  ['agrega la meta Auto de 250000 para el 20 de junio', S(AG, { name: 'Auto', targetAmount: 250000, targetDate: '2027-06-20' })],
  ['nueva meta Bici 8000', S(AG, { name: 'Bici', targetAmount: 8000 })],
  ['agrega la deuda Famsa de 3500', S('add_liability', { institution: 'Famsa', balance: 3500 })],
  ['ya solo debo 6000 en la deuda Banorte', S('update_liability_balance', { institution: 'Banorte', balance: 6000 })],
  ['cambia mi deuda Coppel a 2800', S('update_liability_balance', { institution: 'Coppel', balance: 2800 })],
  ['borra la meta Laptop', S('delete_goal', { goalName: 'Laptop' })],
  ['elimina mi cuenta Santander', S('delete_account', { accountName: 'Santander' })],
  ['presupuesta 6000 para comida', S('set_budget_line', { monthlyAmount: 6000 })],
  ['sácale 300 a mi cuenta BBVA', S(AT, { transactionType: 'expense', amount: 300, accountName: 'BBVA' })],
  ['agrégale 1000 a mi Nu', S(AT, { transactionType: 'income', amount: 1000, accountName: 'Nu' })],
  ['retira 800 de mi meta Viaje', S(WG, { goalName: 'Viaje', amount: 800 })],
  ['sácale 200 a la meta Viaje', S(WG, { goalName: 'Viaje', amount: 200 })],
  ['cambia la fecha de mi meta Laptop al 30 de noviembre', S(UD, { goalName: 'Laptop', targetDate: '2026-11-30' })],
  ['la meta Moto es para el 1 de marzo', S(UD, { goalName: 'Moto', targetDate: '2027-03-01' })],
  ['Banorte vence el día 28', S(UL, { institution: 'Banorte', dueDate: '2026-10-28' })],
  ['cambia el día de pago de Coppel al 5 de noviembre', S(UL, { institution: 'Coppel', dueDate: '2026-11-05' })],
  ['borra la deuda Elektra', S('delete_liability', { institution: 'Elektra' })],
  ['sácale 200 a mi Morralla ayer', S(AT, { transactionType: 'expense', amount: 200, accountName: 'Morralla', date: 'yesterday' })],
  // ---- no son acciones: las contesta el copiloto de lectura ----
  ['cuánto tengo en BBVA', NONE],
  ['qué meta va más avanzada', NONE],
  ['gracias', NONE],
  ['registra 200 de tacos', NONE], // por diseño: el chat no registra un gasto suelto (eso es la captura); ver docs
  // ---- falta un dato: pregunta ----
  ['transfiere de BBVA a Santander', C('amount')],
  ['aporta a mi meta Laptop', C('amount')],
  ['crea la meta Boda', C('amount')],
  ['retira de mi meta Viaje', C('amount')],
  ['cambia la fecha de mi meta Moto al 3 de septiembre de 2026', C('date')],
  ['aporta 100 a mi meta Fantasma', C('goal')],
  // ---- varias acciones: plan ----
  ['transfiere 500 de BBVA a Nu y aporta 200 a mi meta Viaje', P([T, CG], [{ amount: 500 }, { amount: 200 }])],
  ['aporta 100 a mi meta Viaje, luego transfiere 400 de BBVA a Morralla', P([CG, T], [{ amount: 100 }, { amount: 400 }])],
  ['transfiere 1000 de BBVA a Nu; aporta 500 a mi meta Viaje; registra 120 de súper en Morralla', P([T, CG, AT], [{}, {}, { amount: 120, accountName: 'Morralla', subcategoryId: 'food_supermarket' }])],
  ['aporta 300 a mi meta Viaje y retira 100 de mi meta Laptop', P([CG, WG], [{ goalName: 'Viaje' }, { goalName: 'Laptop' }])],
  ['registra 200 de tacos ayer en BBVA y registra 300 de gasolina antier en BBVA', P([AT, AT], [{ amount: 200, date: 'yesterday' }, { amount: 300 }])],
  ['primero transfiere 500 de BBVA a Nu y después aporta 300 a mi meta Viaje', P([T, CG])],
  ['transfiere 500 de BBVA a Nu, aporta 300 a mi meta Viaje y retira 100 de mi meta Laptop', P([T, CG, WG])],
  ['borra la meta Moto y crea la meta Scooter de 15000', P(['delete_goal', AG], [{ goalName: 'Moto' }, { name: 'Scooter', targetAmount: 15000 }])],
  ['agrega la meta Cámara de 12000 y aporta 500 a la meta Cámara', P([AG, CG])],
  ['cambia la fecha de mi meta Viaje al 15 de enero y aporta 200 a mi meta Viaje', P([UD, CG], [{ targetDate: '2027-01-15' }, { amount: 200 }])],
  ['Banorte vence el 25 y Coppel vence el 28', P([UL, UL], [{ institution: 'Banorte', dueDate: '2026-10-25' }, { institution: 'Coppel', dueDate: '2026-10-28' }])],
  ['el viernes pagué 450 de luz en BBVA y el sábado compré 120 de pan en Morralla', P([AT, AT], [{ amount: 450, subcategoryId: 'house_electricity' }, { amount: 120, accountName: 'Morralla' }])],
  ['ayer pagué 300 de gasolina en BBVA y hoy compré 90 de café en Morralla', P([AT, AT], [{ amount: 300, date: 'yesterday' }, { amount: 90 }])],
  ['transfiere 500 de BBVA a Nu y luego dime cuánto me queda', S(T, { amount: 500 })],
  ['aporta 100 a mi meta Viaje y aporta 100 a mi meta Viaje', P([CG, CG])],
  ['transfiere 9000 de BBVA a Nu y aporta 100 a mi meta Viaje', P([T, CG])],
  ['registra 90 de café y transfiere 500 de BBVA a Nu', C('account')],
];

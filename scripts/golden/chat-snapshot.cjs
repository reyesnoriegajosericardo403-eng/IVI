// Foto de lo que responde el reconocimiento de comandos del chat (src/ai/chatIntentParser.ts) para una lista de frases
// típicas — sirve para comprobar que un cambio en el parser no altera lo que ya funcionaba.
//   node scripts/golden/chat-snapshot.cjs > foto.json
require('./ts-hook.cjs');
const { detectChatIntent } = require('@/ai/chatIntentParser');
const base = { createdAt: 'x', updatedAt: 'x', version: 1 };
const ctx = {
  accounts: [
    { ...base, id: 'a1', name: 'BBVA', type: 'bank', balance: 5000, currency: 'MXN' },
    { ...base, id: 'a2', name: 'Nu', type: 'savings', balance: 1200, currency: 'MXN' },
    { ...base, id: 'a3', name: 'Morralla', type: 'cash', balance: 300, currency: 'MXN' },
  ],
  goals: [
    { ...base, id: 'g1', name: 'Viaje', targetAmount: 20000, currentAmount: 3000, currency: 'MXN', targetDate: '2026-12-01' },
    { ...base, id: 'g2', name: 'Laptop', targetAmount: 30000, currentAmount: 500, currency: 'MXN' },
  ],
  liabilities: [
    { ...base, id: 'l1', institution: 'Banorte', type: 'credit_card', balance: 8000, currency: 'MXN', dueDate: '2026-10-20' },
    { ...base, id: 'l2', institution: 'Liverpool', type: 'credit_card', balance: 2500, currency: 'MXN' },
  ],
  templateBudgetLines: [{ ...base, id: 'b1', templateId: 't1', categoryId: 'concept_food', monthlyAmount: 4000, currency: 'MXN' }],
  recentTransactions: [],
  primaryCurrency: 'MXN',
  today: '2026-10-03',
};
const NOW = new Date(2026, 9, 3, 15, 30);
const PHRASES = [
  'transfiere 500 de BBVA a Nu', 'pasa 1000 de Nu a BBVA', 'mueve 200 de mi Morralla a mi BBVA', 'manda 300 de BBVA a Nu', 'transfiere de BBVA a Nu',
  'agrega la cuenta Santander con 3000', 'crea una cuenta de ahorro llamada Hey con 500', 'abre la cuenta Banamex', 'borra la cuenta Nu', 'elimina mi cuenta Morralla',
  'crea la meta Moto con objetivo de 30000', 'agrega una meta llamada Casa de 500000', 'crea la meta Laptop de 20000', 'crea la meta Boda 150000', 'crea la meta Auto',
  'aporta 300 a mi meta Viaje', 'agrégale 500 a mi meta Viaje', 'abona 200 a la meta Laptop', 'suma 100 a la meta Viaje', 'aporta a mi meta Viaje',
  'borra la meta Viaje', 'elimina la meta Laptop', 'quita la meta Viaje',
  'agrega la deuda Coppel con 4000', 'crea una deuda Elektra de 2500', 'borra la deuda Liverpool', 'actualiza la deuda Banorte a 7000', 'cambia la deuda Banorte a 6500', 'debo 9000 en la deuda Banorte',
  'presupuesta 5000 para comida', 'pon 3000 de presupuesto para renta', 'borra el presupuesto de comida', 'presupuesto de transporte 1500',
  'agrégale 500 a mi Nu', 'sácale 200 a mi Morralla', 'quítale 300 a mi cuenta BBVA', 'deposité 1000 a mi Nu', 'retiré 500 de mi BBVA',
  'cuánto gasté en comida este mes', 'cuál es mi patrimonio', 'hola', '¿qué pasa de enero a febrero?',
  // nuevas (antes se enrutaban mal o no se entendían)
  'retira 500 de mi meta Viaje', 'quítale 500 a mi meta Viaje', 'saca 200 de la meta Laptop', 'resta 100 a la meta Viaje',
  'cambia la fecha de mi meta Viaje al 15 de enero', 'mueve la fecha de la meta Laptop para el 20 de diciembre', 'la meta Viaje es para el 15 de enero',
  'crea la meta Laptop de 20000 para el 15 de diciembre', 'agrega la meta Boda con 150000 para el 20 de junio',
  'la deuda Banorte vence el 25', 'cambia el vencimiento de la deuda Banorte al 25 de octubre', 'el pago de Liverpool es el día 28', 'cambia la fecha de pago de la tarjeta Banorte al 5 de noviembre',
  'cambia el vencimiento de Banorte al día 25 y la deuda Liverpool vence el 30',
];
const out = {};
for (const s of PHRASES) {
  const r = detectChatIntent(s, ctx, NOW);
  out[s] = r ? (r.ok ? { type: r.action.type, args: r.action.args, summary: r.summary } : { err: r.reason, ask: r.clarification ? r.clarification.missing.map((m) => m.slot) : undefined }) : null;
}
console.log(JSON.stringify(out, null, 1));

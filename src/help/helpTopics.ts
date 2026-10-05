// Ayuda contextual (P4). Un tema por pantalla; el botón ⓘ de cada pantalla abre su tema y /ayuda los lista todos.
// Los ejemplos de chat marcados como 'accion' se verifican en scripts/golden/ayuda.cjs contra el planificador real:
// si una frase de ayuda deja de entenderse, la prueba falla (la ayuda no puede prometer lo que la app no hace).

export type HelpTopicId =
  | 'inicio'
  | 'movimientos'
  | 'captura'
  | 'patrimonio'
  | 'presupuesto'
  | 'metas'
  | 'inversiones'
  | 'tarjetas'
  | 'recurrentes'
  | 'avisos'
  | 'notificaciones'
  | 'chat'
  | 'ia-propia'
  | 'privacidad'
  | 'instalar';

export interface HelpExample {
  text: string;
  // 'accion' = el chat la convierte en una acción que confirmas; 'pregunta' = la responde sin cambiar nada.
  kind: 'accion' | 'pregunta';
}

export interface HelpTopic {
  id: HelpTopicId;
  title: string;
  // Ruta de la pantalla a la que pertenece (para la prueba que comprueba que existe).
  route: string;
  summary: string;
  steps: string[];
  tips?: string[];
  examples?: HelpExample[];
  // Qué datos toca o envía esta función (se muestra al final, para que nadie se lleve sorpresas).
  privacy?: string;
  keywords: string[];
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'inicio',
    title: 'Inicio',
    route: 'app/(tabs)/index.tsx',
    summary: 'Tu resumen del mes: cuánto tienes, cuánto has gastado y qué viene.',
    steps: [
      'Arriba ves tu patrimonio neto: lo que tienes menos lo que debes.',
      'Más abajo, el gasto del mes y tus presupuestos.',
      'Toca el micrófono o el «+» para registrar un movimiento sin salir de aquí.',
    ],
    keywords: ['resumen', 'patrimonio', 'inicio', 'empezar'],
  },
  {
    id: 'movimientos',
    title: 'Movimientos',
    route: 'app/(tabs)/movimientos.tsx',
    summary: 'Todo lo que has gastado, ganado o movido. Los previstos son lo que aún no pasa y no cambian tus saldos hasta que los confirmas.',
    steps: [
      'Usa el selector para alternar entre «Registrados» (ya ocurrieron) y «Previstos» (lo que viene).',
      'Un previsto se confirma cuando sucede, se marca «no ocurrió» si no pasó, o se pospone a otra fecha.',
      'Registro manual: para un movimiento con todos sus datos (cuenta, categoría, fecha).',
    ],
    tips: ['Un movimiento previsto nunca mueve el saldo de tu cuenta: solo lo hace al confirmarlo.'],
    examples: [
      { text: 'confirma la renta', kind: 'accion' },
      { text: 'qué tengo previsto esta semana', kind: 'pregunta' },
    ],
    keywords: ['gasto', 'ingreso', 'previsto', 'confirmar', 'transferencia', 'historial'],
  },
  {
    id: 'captura',
    title: 'Captura por voz o texto',
    route: 'app/capture.tsx',
    summary: 'Registra un gasto hablando o escribiendo, como se lo dirías a una persona.',
    steps: [
      'Mantén presionado el micrófono para grabar y suéltalo (o toca «Detener y guardar»).',
      'VALU entiende monto, comercio, categoría, cuenta y fecha de lo que dijiste, y te lo muestra antes de guardar.',
      'Si se equivoca de categoría, corrígela: VALU recuerda la corrección para la próxima vez.',
    ],
    tips: ['Puedes dictar varios movimientos en una sola frase.', 'Si tu navegador no permite el micrófono, escribe la frase.'],
    privacy: 'La frase se interpreta en tu dispositivo. Solo viaja a un proveedor de IA si tú conectaste tu propia clave.',
    keywords: ['voz', 'dictar', 'micrófono', 'registrar', 'categoría'],
  },
  {
    id: 'patrimonio',
    title: 'Patrimonio',
    route: 'app/(tabs)/patrimonio.tsx',
    summary: 'Tus cuentas, deudas e inversiones en un solo lugar, con su evolución en el tiempo.',
    steps: [
      'Cada cuenta muestra su saldo; con «+» y «−» lo ajustas.',
      'Las deudas (y lo que te deben) suman o restan al patrimonio neto según el caso.',
      'Desde aquí abres tus tarjetas de crédito y la salud financiera.',
    ],
    tips: ['El saldo de una tarjeta de crédito es lo que debes: gastar lo sube, pagar lo baja.'],
    examples: [
      { text: 'págale 500 a Coppel desde BBVA', kind: 'accion' },
      { text: 'cuánto me deben en total', kind: 'pregunta' },
    ],
    keywords: ['cuentas', 'saldo', 'deudas', 'préstamo', 'activos', 'pasivos', 'neto'],
  },
  {
    id: 'presupuesto',
    title: 'Presupuesto',
    route: 'app/presupuesto.tsx',
    summary: 'Decide cuánto gastar por categoría cada mes y mira qué tan avanzado vas.',
    steps: [
      'Asigna un monto mensual a cada categoría; la barra muestra cuánto llevas.',
      'Las plantillas te dejan guardar un plan y aplicarlo a varios meses.',
      'Un mes puede tener excepciones sin tocar el resto.',
    ],
    keywords: ['presupuesto', 'plantilla', 'categoría', 'mensual', 'límite'],
  },
  {
    id: 'metas',
    title: 'Metas',
    route: 'app/(tabs)/metas.tsx',
    summary: 'Lo que estás ahorrando: un viaje, un fondo de emergencia, una compra grande.',
    steps: [
      'Crea una meta con su monto objetivo y fecha.',
      '«Aportar» y «Retirar» suman o restan dinero de la meta.',
      'Una aportación periódica se programa como pago recurrente.',
    ],
    tips: ['Para que el chat entienda que hablas de una meta, di la palabra «meta» y su nombre.'],
    examples: [
      { text: 'aporta 500 a mi meta de viaje', kind: 'accion' },
      { text: 'cada mes ahorro 1000 en mi meta Laptop', kind: 'accion' },
    ],
    keywords: ['ahorro', 'meta', 'objetivo', 'aportar', 'fondo'],
  },
  {
    id: 'inversiones',
    title: 'Inversiones',
    route: 'app/(tabs)/inversiones.tsx',
    summary: 'Tus instituciones, los productos que tienes en cada una y sus activos.',
    steps: [
      'Elige una institución, luego un producto (por ejemplo CETES o una cuenta de bolsa).',
      'Registra compras, ventas y dividendos de cada activo.',
      '«Actualizar precios» consulta precios públicos de mercado.',
    ],
    tips: ['Los montos que ves son lo que invertiste; el valor en vivo depende de la última actualización de precios.'],
    examples: [{ text: 'me pagaron 150 de dividendos de FUNO11', kind: 'accion' }],
    privacy: 'Al actualizar precios solo se consulta el símbolo del activo, nunca tus cantidades ni montos.',
    keywords: ['inversión', 'acciones', 'cetes', 'dividendo', 'fibra', 'bolsa'],
  },
  {
    id: 'tarjetas',
    title: 'Tarjetas de crédito',
    route: 'app/tarjetas.tsx',
    summary: 'Para que nunca se te pase tu fecha de corte ni tu fecha de pago.',
    steps: [
      'En cada tarjeta captura el día de corte y el día límite de pago; la fecha de pago se calcula sola.',
      'VALU te muestra cuánto pagar para no generar intereses y si estás al corriente, pendiente o vencido.',
      'Te avisa antes del corte y varias veces antes del pago, y puedes bajar las fechas a tu calendario (.ics).',
      '«Ya pagué» registra el pago y descuenta de la cuenta que elijas.',
    ],
    tips: [
      'Los gastos con la tarjeta suben su saldo. Si registraste gastos viejos con el signo anterior, ajusta el saldo con «+» y «−».',
      'Las compras a meses sin intereses todavía no se modelan por separado.',
    ],
    examples: [
      { text: 'mi tarjeta Oro corta el 15 y paga el 5', kind: 'accion' },
      { text: 'cuánto debo pagar de mi tarjeta', kind: 'pregunta' },
    ],
    privacy: 'Las fechas se guardan con tu cuenta. Los avisos al teléfono nunca incluyen montos.',
    keywords: ['tarjeta', 'corte', 'pago', 'intereses', 'límite', 'fecha'],
  },
  {
    id: 'recurrentes',
    title: 'Pagos recurrentes',
    route: 'app/recurrentes.tsx',
    summary: 'Renta, suscripciones, sueldo: lo que se repite y que VALU prevé por ti.',
    steps: [
      'Define cada cuánto se repite (semanal, quincenal, mensual, anual), desde cuándo y hasta cuándo.',
      'VALU crea los previstos de los próximos meses; tú los confirmas cuando suceden.',
      'Puedes pausar, reanudar o terminar un pago, y cambiar su monto hacia adelante.',
    ],
    tips: ['El día 31 significa «el último día del mes»: en febrero cae el 28 o 29.'],
    examples: [
      { text: 'pago Netflix de 199 cada día 12', kind: 'accion' },
      { text: 'pausa el gimnasio', kind: 'accion' },
    ],
    keywords: ['recurrente', 'suscripción', 'renta', 'repetir', 'quincena', 'sueldo'],
  },
  {
    id: 'avisos',
    title: 'Avisos y recordatorios',
    route: 'app/avisos.tsx',
    summary: 'Recordatorios propios que te insisten hasta que confirmes que ya lo hiciste.',
    steps: [
      'Crea un aviso con fecha y hora; añade avisos previos (por ejemplo 3 días antes).',
      'Elige cuántas veces insistir (hasta 3) y cada cuánto.',
      'Cuando llega, puedes confirmarlo, posponerlo o cancelarlo.',
    ],
    tips: ['De 10 de la noche a 7 de la mañana no se mandan reintentos para no despertarte.'],
    examples: [
      { text: 'recuérdame pagar la luz el 15', kind: 'accion' },
      { text: 'cancela el aviso de pagar el predial', kind: 'accion' },
    ],
    privacy: 'Los avisos al teléfono nunca muestran montos ni saldos; sí el título que escribiste, que se ve en la pantalla bloqueada.',
    keywords: ['recordatorio', 'aviso', 'alarma', 'insistir', 'posponer'],
  },
  {
    id: 'notificaciones',
    title: 'Notificaciones en el teléfono',
    route: 'app/notificaciones.tsx',
    summary: 'Los avisos llegan como cualquier otra app, aunque VALU esté cerrada.',
    steps: [
      'Vienen activadas: al primer toque tras iniciar sesión, el teléfono te pide permiso.',
      'En iPhone, primero agrega VALU a la pantalla de inicio (Compartir → Agregar a pantalla de inicio) y ábrela desde ahí.',
      'El interruptor «Recibir avisos» las apaga en este dispositivo; «Enviar aviso de prueba» comprueba que llegan.',
    ],
    tips: ['Si bloqueaste el permiso, se cambia en Ajustes del teléfono → VALU → Notificaciones.'],
    privacy: 'Se guarda un identificador técnico de tu teléfono para poder enviarte avisos. Se borra al apagarlas o al eliminar tu cuenta.',
    keywords: ['notificación', 'push', 'permiso', 'iphone', 'android', 'prueba'],
  },
  {
    id: 'chat',
    title: 'Chat con VALU',
    route: 'app/(tabs)/ia.tsx',
    summary: 'Un agente de IA que conoce tus números: pregúntale, pídele que registre o programe, o que te aconseje.',
    steps: [
      'Escribe o dicta lo que quieres, como se lo dirías a una persona. Para responder consulta tus datos reales (movimientos, presupuesto, tarjetas…).',
      'Antes de cambiar algo siempre te muestra un resumen; nada se aplica hasta que confirmas manteniendo presionado.',
      'Si le cuentas algo estable («cobro cada quincena»), lo recuerda para la próxima. Lo ves y lo borras en Ajustes → IA.',
    ],
    tips: [
      'Bajo cada respuesta ves si contestó la IA o el motor local, y por qué no hubo IA cuando eso pasa.',
      'Sin conexión o sin IA, VALU sigue respondiendo con su motor local.',
    ],
    examples: [
      { text: 'recuérdame pagar la luz el 15', kind: 'accion' },
      { text: 'aporta 500 a mi meta de viaje', kind: 'accion' },
      { text: 'cuánto gasté este mes', kind: 'pregunta' },
    ],
    privacy: 'La IA recibe tu mensaje y solo los datos que consulta para responder; nunca tus notas.',
    keywords: ['chat', 'asistente', 'agente', 'ia', 'pregunta', 'plan', 'confirmar'],
  },
  {
    id: 'ia-propia',
    title: 'IA de VALU',
    route: 'app/ai-settings.tsx',
    summary: 'El cerebro de VALU: viene incluido, se apaga cuando quieras y opcionalmente usa tu propia clave.',
    steps: [
      'En Ajustes → IA ves si la IA está activa, con qué proveedor y cuántas consultas te quedan hoy.',
      '«Probar la IA ahora» confirma que responde.',
      'Opcional: conecta tu propia clave (Gemini, Claude, ChatGPT o Grok) para no tener límite diario; el costo lo cubre tu cuenta.',
    ],
    tips: ['En Privacidad y datos puedes ocultar a la IA los nombres de personas y comercios.'],
    privacy: 'Tu clave propia y lo que el agente recuerda se quedan en este dispositivo. Supabase solo cuenta tus consultas del día.',
    keywords: ['ia', 'inteligencia artificial', 'agente', 'clave', 'claude', 'chatgpt', 'gemini', 'grok', 'api', 'memoria'],
  },
  {
    id: 'privacidad',
    title: 'Privacidad y datos',
    route: 'app/privacidad.tsx',
    summary: 'Qué guardamos, qué sale de tu teléfono y cómo llevarte o borrar todo.',
    steps: [
      'Ahí ves, función por función, qué viaja y a dónde.',
      '«Exportar mis datos» descarga todo en un archivo.',
      '«Eliminar mi cuenta» borra todo de la nube de forma permanente.',
    ],
    keywords: ['privacidad', 'datos', 'exportar', 'eliminar', 'borrar', 'seguridad'],
  },
  {
    id: 'instalar',
    title: 'Instalar VALU',
    route: 'app/instalar.tsx',
    summary: 'Agrega VALU a la pantalla de inicio para usarla como una app y recibir avisos.',
    steps: [
      'iPhone/iPad: Safari → Compartir → «Agregar a pantalla de inicio».',
      'Android: Chrome → menú ⋮ → «Instalar app».',
      'Ábrela desde el nuevo ícono.',
    ],
    keywords: ['instalar', 'pantalla de inicio', 'app', 'pwa'],
  },
];

export function getHelpTopic(id: HelpTopicId): HelpTopic {
  return HELP_TOPICS.find((t) => t.id === id) ?? HELP_TOPICS[0];
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function searchHelp(query: string): HelpTopic[] {
  const q = norm(query).trim();
  if (!q) return HELP_TOPICS;
  const words = q.split(/\s+/);
  return HELP_TOPICS.filter((t) => {
    const hay = norm([t.title, t.summary, ...t.keywords, ...t.steps].join(' '));
    return words.every((w) => hay.includes(w));
  });
}

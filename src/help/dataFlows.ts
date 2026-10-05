// Inventario de todo lo que sale del dispositivo (auditoría de privacidad, P4). Es la única fuente: la pantalla
// «Privacidad y datos» lo muestra y scripts/golden/privacidad.cjs comprueba que coincide con el código
// (cada host al que la app o las funciones llaman debe aparecer aquí, y cada tabla debe borrarse con la cuenta).

export interface DataFlow {
  id: string;
  title: string;
  // ¿Se activa solo o requiere una acción tuya?
  trigger: 'siempre_con_cuenta' | 'si_lo_activas' | 'al_usarlo';
  what: string; // qué viaja
  notWhat: string; // qué NO viaja
  where: string; // a dónde
  hosts: string[]; // dominios externos que recibe el dato (para la prueba automática)
}

export const DATA_FLOWS: DataFlow[] = [
  {
    id: 'nube',
    title: 'Tu cuenta y la sincronización',
    trigger: 'siempre_con_cuenta',
    what: 'Lo que capturas: cuentas, movimientos (reales y previstos), presupuestos, metas, inversiones, deudas, pagos recurrentes, avisos, fechas de tarjeta, categorías aprendidas y tu perfil.',
    notWhat: 'Tu clave de IA propia, lo que recuerda el agente y tu preferencia de ocultar nombres: se quedan en este dispositivo.',
    where: 'Tu propio proyecto de Supabase, con acceso restringido a tu usuario (seguridad por filas). Si no inicias sesión, nada sale.',
    hosts: [],
  },
  {
    id: 'avisos',
    title: 'Avisos en el teléfono',
    trigger: 'si_lo_activas',
    what: 'Un identificador técnico de tu teléfono para poder enviarte avisos, y el título del aviso que tú escribiste (se verá en la pantalla bloqueada).',
    notWhat: 'Montos o saldos calculados por VALU.',
    where: 'Tu Supabase y el servicio de notificaciones de Apple, Google o Mozilla, que entrega el aviso a tu teléfono.',
    hosts: ['push.apple.com', 'fcm.googleapis.com', 'push.services.mozilla.com'],
  },
  {
    id: 'ia',
    title: 'IA de VALU (agente)',
    trigger: 'al_usarlo',
    what: 'Cuando usas el chat (o la captura por voz no entiende algo): tu mensaje, lo último de esa conversación, lo que VALU recuerda de ti y SOLO los datos que el agente consulta para responder (por ejemplo, tus movimientos de un mes o el estado de una tarjeta).',
    notWhat: 'Tus notas, ni todo tu historial de golpe. Con «Ocultar nombres a mi IA», tampoco nombres de personas ni comercios. Se apaga en Ajustes → IA.',
    where: 'Tu función ai-agent en Supabase, que lo manda al proveedor configurado (Gemini de Google por defecto; Claude, ChatGPT o Grok si se cambia o si conectas tu clave). Con el nivel gratuito de Gemini, Google puede usar el contenido para mejorar sus productos. Supabase solo guarda cuántas consultas haces al día, nunca el contenido.',
    hosts: ['generativelanguage.googleapis.com', 'api.anthropic.com', 'api.openai.com', 'api.x.ai'],
  },
  {
    id: 'precios',
    title: 'Precios de mercado',
    trigger: 'al_usarlo',
    what: 'Solo los símbolos de los activos (por ejemplo FUNO11) al tocar «Actualizar precios».',
    notWhat: 'Tus cantidades, montos o cuentas.',
    where: 'Una función de tu Supabase que consulta Finnhub, Yahoo Finance y Banxico.',
    hosts: ['finnhub.io', 'query1.finance.yahoo.com', 'www.banxico.org.mx'],
  },
  {
    id: 'local',
    title: 'Lo que nunca sale de tu teléfono',
    trigger: 'siempre_con_cuenta',
    what: 'La interpretación de lo que dictas o escribes, el cálculo de fechas de tarjeta y recurrencias, y el catálogo de categorías se resuelven en tu dispositivo.',
    notWhat: 'No usamos análisis de uso, anuncios ni rastreadores de terceros.',
    where: 'Solo en este dispositivo.',
    hosts: [],
  },
];

// Todas las tablas con datos de la persona; todas se borran en cascada al eliminar la cuenta
// (la prueba lo verifica leyendo las migraciones).
export const ALL_HOSTS = DATA_FLOWS.flatMap((f) => f.hosts);

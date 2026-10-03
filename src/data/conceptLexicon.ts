// Léxico de CONCEPTOS financieros que no son una categoría de gasto sino una MODALIDAD del movimiento:
// repartido entre varios, deuda a favor o en contra, recurrente, a plazos, deducible, reembolsable, en otra
// moneda o previsto a futuro. Hoy solo los lee `detectConcepts` (src/ai/concepts.ts); están listos para que
// P2/P3 (planificador multi-acción, previstos, recurrencia, "me deben") los conecten a pantallas reales sin
// volver a escribir vocabulario. Frases en español coloquial de México; se comparan sin acentos y por
// palabra completa.
export type ConceptTag =
  | 'shared_split' // se dividió entre varias personas (pareja, roomies, amigos)
  | 'owed_to_me' // alguien me debe / presté
  | 'i_owe' // yo debo / me prestaron
  | 'settlement' // se liquidó una cuenta pendiente entre personas
  | 'recurring' // se repite cada cierto tiempo
  | 'installments' // pagos a meses / plazos
  | 'tax_deductible' // se pidió factura / es deducible
  | 'reimbursable' // lo va a pagar o reembolsar otra persona/empresa
  | 'foreign_currency' // en dólares/euros u otra moneda
  | 'planned'; // todavía no ocurre: previsto / recordatorio

export const CONCEPT_LEXICON: Record<ConceptTag, string[]> = {
  shared_split: [
    'dividimos', 'dividimos la cuenta', 'dividimos el gasto', 'dividimos la renta', 'dividimos el súper', 'dividimos el uber', 'dividimos entre todos', 'dividido entre', 'cuenta dividida', 'a medias', 'la mitad', 'mitad y mitad', 'mi mitad', 'mi parte', 'su parte',
    'mi parte de', 'la parte de', 'partes iguales', 'a partes iguales', 'cada quien lo suyo', 'cada quien su parte', 'cada quien pagó', 'entre los dos', 'entre los tres', 'entre los cuatro', 'entre todos', 'entre roomies', 'entre amigos', 'entre compas', 'cooperamos', 'cooperación', 'coperacha',
    'vaquita', 'hicimos una vaca', 'hicimos vaquita', 'a escote', 'a cuenta compartida', 'cuenta compartida', 'gasto compartido', 'gastos compartidos', 'gastos de la casa compartida', 'depa compartido', 'casa compartida', 'cuarto compartido', 'split', 'splitwise', 'tricount', 'go dutch',
    'roomie', 'roomies', 'roommate', 'roommates', 'compañero de cuarto', 'compañera de cuarto', 'compañeros de cuarto', 'compañeros de depa', 'compañeros de casa', 'mis roomies', 'con mi roomie', 'con mis roomies',
    'nos tocó a', 'nos tocó de', 'me tocó pagar', 'me tocaron', 'nos tocaron', 'tocó a cada uno', 'tocó a cada quien', 'entre varios', 'compartimos',
  ],
  owed_to_me: [
    'me debe', 'me deben', 'me debía', 'me debían', 'me quedó a deber', 'me quedaron a deber', 'me quedó a deber', 'me falta que me pague', 'me falta que me paguen', 'no me ha pagado', 'no me han pagado', 'aún no me paga', 'todavía no me paga', 'todavía me debe', 'todavía me deben',
    'le presté', 'les presté', 'le fié', 'les fié', 'le adelanté', 'les adelanté', 'adelanté el pago de', 'le cubrí', 'les cubrí', 'pagué por él', 'pagué por ella', 'pagué por ellos', 'pagué por todos', 'pagué la cuenta de todos', 'pendiente de cobrar', 'por cobrar', 'cuenta por cobrar', 'cuentas por cobrar',
    'me va a pagar', 'me van a pagar', 'me lo va a pagar', 'me lo van a pagar', 'me lo regresa', 'me lo regresan', 'me lo devuelve', 'me lo devuelven', 'me lo paga después', 'me lo paga luego', 'me lo paga mañana', 'me lo paga el lunes', 'me debe lana', 'me debe dinero', 'me debe la mitad', 'me debe su parte',
    'le fíe', 'préstamo a un amigo', 'préstamo a mi amigo', 'préstamo a mi roomie', 'préstamo a mi hermano', 'préstamo a mi hermana', 'préstamo a mi mamá', 'préstamo a mi papá', 'préstamo a mi compa', 'le presté a mi', 'le presté dinero', 'le presté lana', 'les presté dinero', 'les presté lana',
  ],
  i_owe: [
    'le debo', 'les debo', 'te debo', 'debo dinero', 'debo lana', 'debo la mitad', 'debo mi parte', 'me prestó', 'me prestaron', 'me fió', 'me fiaron', 'me adelantó', 'me adelantaron', 'me cubrió', 'me cubrieron', 'pagó por mí', 'pagaron por mí', 'me quedé a deber', 'le quedé a deber', 'les quedé a deber',
    'pendiente de pagar', 'por pagar', 'cuenta por pagar', 'cuentas por pagar', 'tengo que pagarle', 'tengo que pagarles', 'le tengo que pagar', 'les tengo que pagar', 'se lo debo', 'se la debo', 'se los debo', 'se las debo', 'adeudo con', 'adeudo a', 'deuda con', 'deuda a', 'mi deuda con',
    'pedí prestado', 'pedí un préstamo', 'me prestó mi amigo', 'me prestó mi mamá', 'me prestó mi papá', 'me prestó mi hermano', 'me prestó mi roomie', 'me prestó mi pareja', 'me prestó mi jefe', 'le voy a pagar', 'les voy a pagar', 'le debía', 'les debía',
  ],
  settlement: [
    'te pagué lo que te debía', 'le pagué lo que le debía', 'les pagué lo que les debía', 'pagué lo que debía', 'pagué lo que le debo', 'ya nos pusimos al corriente', 'nos pusimos al corriente', 'ya quedamos a mano', 'quedamos a mano', 'saldamos cuentas', 'saldé cuentas', 'saldé la cuenta', 'saldamos la cuenta',
    'ajuste de cuentas', 'ajustamos cuentas', 'cuentas claras', 'cuentas saldadas', 'liquidé la deuda', 'liquidamos la deuda', 'liquidé lo que debía', 'liquidamos lo que debíamos', 'te devolví', 'le devolví', 'les devolví', 'le regresé', 'les regresé', 'te regresé', 'me pagó lo que me debía', 'me pagaron lo que me debían', 'me regresó lo que le presté',
    'me devolvió lo que le presté', 'ya me pagó', 'ya me pagaron', 'ya me regresó', 'ya me devolvió', 'ya pagué lo que debía', 'ya le pagué', 'ya les pagué', 'ya quedó saldado', 'quedó saldada', 'quedó pagada la deuda', 'deuda saldada',
  ],
  recurring: [
    'cada mes', 'cada quincena', 'cada semana', 'cada año', 'cada dos semanas', 'cada tres meses', 'cada seis meses', 'cada trimestre', 'cada semestre', 'cada día', 'cada lunes', 'cada martes', 'cada miércoles', 'cada jueves', 'cada viernes', 'cada sábado', 'cada domingo', 'cada fin de semana',
    'todos los meses', 'todas las quincenas', 'todas las semanas', 'todos los años', 'todos los días', 'todos los lunes', 'todos los viernes', 'todos los fines de semana', 'mensual', 'mensuales', 'mensualmente', 'quincenal', 'quincenales', 'quincenalmente', 'semanal', 'semanales', 'semanalmente',
    'bimestral', 'bimestrales', 'trimestral', 'trimestrales', 'semestral', 'semestrales', 'recurrente', 'recurrentes', 'recurrencia', 'se repite', 'se repite cada', 'que se repita', 'repetir cada', 'de forma recurrente', 'cargo recurrente', 'pago recurrente', 'cobro recurrente', 'cargo automático',
    'pago automático', 'cobro automático', 'domiciliado', 'domiciliada', 'domiciliación', 'pago domiciliado', 'cargo domiciliado', 'suscripción', 'suscripciones', 'mensualidad', 'mensualidades', 'abono mensual', 'abono quincenal', 'abono semanal', 'pago mensual', 'pago quincenal', 'pago semanal', 'pago anual', 'renovación anual', 'plan anual', 'suscripción anual', 'membresía anual', 'cargo anual', 'cobro anual',
    'renovación mensual', 'renovación automática', 'siempre el día', 'el día 1 de cada mes', 'el día 15 de cada mes', 'el día 30 de cada mes', 'los días 15 y 30', 'los 15 y 30', 'los primeros de cada mes', 'a principio de mes', 'a fin de mes', 'a mitad de mes', 'gasto fijo', 'gastos fijos', 'ingreso fijo', 'ingresos fijos',
  ],
  installments: [
    'a meses', 'a meses sin intereses', 'meses sin intereses', 'msi', 'a msi', 'a 3 meses', 'a 6 meses', 'a 9 meses', 'a 12 meses', 'a 18 meses', 'a 24 meses', 'a 36 meses', 'a 48 meses', 'a tres meses', 'a seis meses', 'a nueve meses', 'a doce meses', 'a dieciocho meses', 'a veinticuatro meses', 'a 3 msi', 'a 6 msi', 'a 12 msi', 'a 18 msi', 'a 24 msi',
    'en mensualidades', 'en pagos', 'en parcialidades', 'en cuotas', 'en abonos', 'en quincenas', 'a plazos', 'a pagos', 'a quincenas', 'a mensualidades', 'a parcialidades', 'a cuotas', 'a abonos', 'con mensualidades', 'con parcialidades', 'con abonos', 'mensualidades sin intereses', 'parcialidades sin intereses',
    'pagos diferidos', 'pago diferido', 'diferido a', 'diferí', 'diferido a meses', 'plan de pagos', 'plan de mensualidades', 'financiado', 'financiada', 'financiamiento', 'lo financié', 'lo pagué a meses', 'lo compré a meses', 'lo compré a plazos', 'lo compré a crédito', 'lo estoy pagando', 'lo voy pagando', 'lo voy a pagar a meses',
    'kueski', 'kueski pay', 'aplazo', 'klarna', 'afterpay', 'compra ahora paga después', 'compra ahora, paga después', 'paga después', 'paga luego', 'compra a quincenas', 'a quincenas con', 'enganche y mensualidades', 'enganche y abonos', 'abonos semanales', 'abonos quincenales', 'abonos mensuales',
  ],
  tax_deductible: [
    'deducible', 'deducibles', 'es deducible', 'son deducibles', 'gasto deducible', 'gastos deducibles', 'deducible de impuestos', 'deducción', 'deducciones', 'deducción personal', 'deducciones personales', 'para deducir', 'para deducirlo', 'para deducirla', 'lo voy a deducir', 'lo puedo deducir', 'se puede deducir', 'con factura', 'sin factura', 'con cfdi', 'sin cfdi', 'con recibo deducible',
    'pedí factura', 'pedí mi factura', 'pedí la factura', 'pedir factura', 'pedir la factura', 'me dieron factura', 'me dieron la factura', 'me facturaron', 'me van a facturar', 'me mandaron la factura', 'me mandaron el cfdi', 'solicité factura', 'solicité la factura', 'solicitar factura', 'facturar', 'facturé', 'factura', 'facturas', 'cfdi', 'cfdis',
    'comprobante fiscal', 'comprobantes fiscales', 'comprobante deducible', 'recibo deducible', 'recibos deducibles', 'recibo de honorarios', 'iva acreditable', 'iva retenido', 'isr retenido', 'retención de iva', 'retención de isr', 'retenciones', 'declaración anual', 'declaración mensual', 'para la declaración', 'para mi declaración', 'para el sat', 'del sat', 'ante el sat',
    'gastos médicos deducibles', 'colegiaturas deducibles', 'intereses hipotecarios deducibles', 'donativos deducibles', 'ppr deducible', 'seguro de gastos médicos deducible', 'aportación deducible', 'gasto de mi negocio', 'gasto del negocio', 'gasto de mi empresa', 'gasto de la empresa', 'gasto de trabajo', 'gasto profesional', 'gastos profesionales', 'gasto operativo',
  ],
  reimbursable: [
    'me lo reembolsan', 'me lo van a reembolsar', 'me lo reembolsaron', 'reembolsable', 'reembolsables', 'para reembolso', 'para que me lo reembolsen', 'pedir reembolso', 'solicitar reembolso', 'solicité reembolso', 'solicitud de reembolso', 'reembolso pendiente', 'reembolso por llegar', 'me van a reembolsar', 'me van a regresar', 'me lo regresan', 'me lo regresa la empresa', 'me lo paga la empresa',
    'lo paga la empresa', 'lo paga la oficina', 'lo paga mi jefe', 'lo paga el trabajo', 'lo paga la escuela', 'lo paga el seguro', 'lo cubre el seguro', 'lo cubre la empresa', 'lo cubre mi seguro', 'a cuenta de la empresa', 'a cuenta de la oficina', 'a cuenta del trabajo', 'a cuenta del cliente', 'por cuenta de la empresa', 'por cuenta del cliente',
    'gasto de trabajo', 'viáticos', 'viático', 'viáticos del trabajo', 'viáticos de la empresa', 'gastos de viaje de trabajo', 'gastos de viaje del trabajo', 'gastos por reembolsar', 'gasto por reembolsar', 'por reembolsar', 'a reembolsar', 'a recuperar', 'por recuperar', 'lo recupero', 'lo voy a recuperar',
    'lo adelanté para la empresa', 'lo adelanté para el trabajo', 'lo adelanté para la oficina', 'adelanté los gastos del viaje', 'adelanté los gastos del trabajo', 'pagué de mi bolsa', 'pagué de mi bolsillo', 'de mi bolsa', 'de mi bolsillo', 'puse de mi bolsa', 'puse de mi bolsillo', 'lo puse yo', 'lo pagué yo y me lo regresan',
  ],
  foreign_currency: [
    'dólares', 'dolares', 'dólar', 'dolar', 'usd', 'u$d', 'dlls', 'dls', 'en dólares', 'en dolares', 'euros', 'euro', 'eur', 'en euros', 'libra esterlina', 'gbp', 'en libras', 'yenes', 'yen', 'jpy', 'en yenes', 'pesos colombianos', 'pesos argentinos', 'pesos chilenos', 'dólares canadienses',
    'dólares americanos', 'dólares estadounidenses', 'moneda extranjera', 'divisa', 'divisas', 'en el extranjero', 'del extranjero', 'tipo de cambio', 'al tipo de cambio', 'a como estaba el dólar', 'a como está el dólar', 'a 17 pesos el dólar', 'a 18 pesos el dólar', 'a 19 pesos el dólar', 'a 20 pesos el dólar', 'cambié dólares', 'cambié euros', 'compré dólares', 'compré euros',
    'billete verde', 'billetes verdes', 'lanas en dólares', 'lana en dólares', 'en moneda extranjera', 'cargo en el extranjero', 'compra en el extranjero', 'compra internacional', 'compras internacionales', 'pago en el extranjero', 'pago internacional', 'pagos internacionales',
  ],
  planned: [
    'voy a pagar', 'voy a comprar', 'voy a gastar', 'voy a depositar', 'voy a transferir', 'voy a apartar', 'voy a ahorrar', 'voy a invertir', 'voy a cobrar', 'voy a recibir', 'tengo que pagar', 'tengo que comprar', 'tengo que depositar', 'tengo que transferir', 'tengo que apartar', 'me toca pagar', 'me toca comprar', 'me toca depositar', 'me toca transferir',
    'me toca el próximo', 'me toca la próxima', 'debo pagar', 'debo comprar', 'debo depositar', 'debo transferir', 'debería pagar', 'necesito pagar', 'necesito comprar', 'necesito depositar', 'necesito transferir', 'por pagar', 'por comprar', 'por depositar', 'por transferir', 'pendiente de pago', 'pendiente de compra', 'pendiente por pagar',
    'próximo mes', 'el próximo mes', 'mes que viene', 'el mes que viene', 'próxima semana', 'la próxima semana', 'semana que viene', 'la semana que viene', 'próxima quincena', 'la próxima quincena', 'quincena que viene', 'la quincena que viene', 'este fin de semana', 'el fin que viene',
    'para el viernes', 'para el lunes', 'para fin de mes', 'para fin de año', 'para diciembre', 'para enero', 'para febrero', 'para marzo', 'para abril', 'para mayo', 'para junio', 'para julio', 'para agosto', 'para septiembre', 'para octubre', 'para noviembre',
    'previsto', 'prevista', 'previstos', 'previstas', 'gasto previsto', 'ingreso previsto', 'pago previsto', 'cobro previsto', 'proyectado', 'proyectada', 'presupuestado', 'presupuestada', 'agendar', 'agéndame', 'agéndalo', 'programar', 'prográmame', 'prográmalo', 'recuérdame', 'recuérdame pagar', 'recuérdame cobrar', 'recordatorio', 'recordatorios', 'recordar', 'avísame', 'avísame cuando',
    'cuando me llegue', 'cuando me paguen', 'cuando cobre', 'cuando me depositen', 'cuando llegue la quincena', 'cuando llegue la nómina', 'cuando llegue el aguinaldo', 'en cuanto me paguen', 'en cuanto cobre', 'en cuanto me depositen', 'una vez que me paguen', 'una vez que cobre',
  ],
};

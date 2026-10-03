// Frases "desempatadoras": le ganan a una frase larga de OTRA subcategoría que también aparece en el texto
// ("pagué mi crédito del infonavit": gana Hipoteca y no "pagué mi crédito" → Préstamo personal). Parecen
// redundantes si se prueban solas, por eso scripts/golden/packs.cjs NUNCA poda este archivo.
// Cada una nació de una falla real de las pruebas: agrega aquí las que vayas encontrando.
export const PACK_PROTEGIDAS: Record<string, string[]> = {
  house_mortgage: [
    'crédito del infonavit', 'crédito de infonavit', 'pagué mi crédito del infonavit',
    'pagué el crédito del infonavit', 'pago de mi crédito del infonavit', 'crédito del fovissste',
    'pagué el crédito del fovissste',
  ],
  ent_gambling: [
    'boletos de la lotería', 'boletos de lotería', 'boleto de lotería', 'boleto de la lotería',
    'compré boletos de la lotería', 'compré boletos de lotería', 'décimos de lotería', 'boletos del sorteo',
    'boletos de la rifa', 'boletos de rifa',
  ],
  life_family_support: [
    'le mandé dinero a mi mamá', 'le mandé dinero a mi papá', 'le mandé dinero a mis papás',
    'le mandé dinero a mi familia', 'le mandé dinero a mi abuela', 'le mandé dinero a mi hermano',
    'le mandé dinero a mi hermana', 'les mandé dinero a mis papás', 'mandé dinero a mi mamá',
    'mandé dinero a mis papás', 'mandé dinero a mi familia', 'le di dinero a mi mamá', 'le di dinero a mis papás',
    'le transferí dinero a mi mamá', 'le deposité dinero a mi mamá', 'le mandé a mi mamá', 'le mandé a mis papás',
    'le di a mi mamá', 'le di a mis papás',
  ],
  food_fastfood: [
    'tacos de birria', 'tacos de pastor', 'tacos de suadero', 'tacos de carnitas', 'tacos de bistec',
    'tacos de canasta', 'tacos de guisado', 'tacos de cabeza', 'tacos de lengua', 'tacos de tripa',
    'tacos de chorizo', 'tacos de pescado', 'tacos de camarón', 'tacos de barbacoa', 'tacos de cochinita',
    'tacos de arrachera', 'tacos de carne asada', 'tacos de res', 'tacos de pollo', 'tacos de papa', 'tacos de nopal',
    'tacos de hongos', 'tacos de al pastor', 'tacos de de birria', 'tacos de dorados', 'tacos de sudados',
    'tacos de campechanos', 'tacos de gobernador', 'tacos de árabes', 'tacos de al carbón', 'consomé de birria',
    'tacos con consomé', 'tacos de birria con consomé', 'quesabirria con consomé',
  ],
  food_bakery: [
    'pastel de cumpleaños de mi mamá', 'pastel de cumpleaños de mi papá', 'pastel de cumpleaños de mi hijo',
    'pastel de cumpleaños de mi hija', 'pastel de cumpleaños de mi novia', 'pastel de cumpleaños de mi novio',
    'pastel para la oficina', 'pastel para la jefa', 'pastel para el jefe', 'pastel para la escuela',
    'pastel para la fiesta', 'pastel para la reunión', 'pastel para el festejo',
  ],
  inc_reimbursement: [
    'me regresó', 'me devolvió', 'me reembolsó', 'me regresó lo de', 'me regresó lo del', 'me devolvió lo de',
    'me devolvió lo del', 'me pagó lo de', 'me pagó lo del', 'me regresó lo que gasté', 'me regresó el dinero de',
    'me regresaron lo de', 'me regresaron lo del', 'me devolvieron lo de', 'me devolvieron lo del',
  ],
  fee_fx: [
    'comisión por enviar dinero al extranjero', 'comisión por mandar dinero al extranjero', 'dinero al extranjero',
    'enviar dinero al extranjero', 'mandar dinero al extranjero', 'envío de dinero al extranjero',
    'envío de dinero al exterior', 'enviar dinero al exterior',
  ],
  trans_public: [
    'tarjeta del metro', 'recarga de la tarjeta del metro', 'recarga de tarjeta del metro', 'recarga del metro',
    'recargué el metro', 'tarjeta de movilidad', 'recarga de la tarjeta de movilidad', 'tarjeta del metrobús',
    'recarga de la tarjeta del metrobús',
  ],
  trans_maintenance: [
    'lavaron mi coche', 'lavaron mi carro', 'lavaron mi auto', 'lavaron el coche', 'lavaron el carro',
    'lavaron el auto', 'lavé el coche', 'lavé mi coche', 'lavé el carro', 'lavé mi carro', 'lavé el auto',
    'le lavaron el carro', 'le lavé el carro', 'lavado del coche', 'lavado del carro',
  ],
  sav_wedding_fund: [
    'para la boda', 'para mi boda', 'para casarme', 'para el anillo', 'para la luna de miel', 'para el compromiso',
  ],
  sav_house_downpayment: [
    'para el enganche', 'para mi enganche', 'para la casa', 'para mi casa', 'para el depa', 'para comprar casa',
    'para comprar un depa',
  ],
  sav_vacation: [
    'para vacaciones', 'para mis vacaciones', 'para el viaje', 'para mi viaje', 'para las vacaciones',
  ],
  sav_emergency: [
    'para emergencias', 'para imprevistos', 'para el fondo de emergencia', 'para mi fondo de emergencia',
  ],
  sav_retirement: [
    'para el retiro', 'para mi retiro', 'para mi jubilación', 'para mi afore', 'para mi ppr',
  ],
  sav_education_fund: [
    'para estudios', 'para la universidad', 'para la maestría', 'para el posgrado',
  ],
  debt_creditcard: [
    'lo que debía en la tarjeta', 'lo que debo en la tarjeta', 'todo lo que debía en la tarjeta',
    'todo lo que debo en la tarjeta', 'debía en la tarjeta', 'debo en la tarjeta', 'lo que debía de la tarjeta',
    'lo que debo de la tarjeta', 'deuda de nu', 'deuda con nu', 'mi deuda de nu', 'mi deuda con nu',
    'pagué mi deuda de nu', 'pagué la deuda de nu', 'deuda de nubank', 'deuda con nubank', 'mi deuda de nubank',
    'mi deuda con nubank', 'pagué mi deuda de nubank', 'pagué la deuda de nubank', 'deuda de bbva', 'deuda con bbva',
    'mi deuda de bbva', 'mi deuda con bbva', 'pagué mi deuda de bbva', 'pagué la deuda de bbva', 'deuda de banamex',
    'deuda con banamex', 'mi deuda de banamex', 'mi deuda con banamex', 'pagué mi deuda de banamex',
    'pagué la deuda de banamex', 'deuda de santander', 'deuda con santander', 'mi deuda de santander',
    'mi deuda con santander', 'pagué mi deuda de santander', 'pagué la deuda de santander', 'deuda de hsbc',
    'deuda con hsbc', 'mi deuda de hsbc', 'mi deuda con hsbc', 'pagué mi deuda de hsbc', 'pagué la deuda de hsbc',
    'deuda de banorte', 'deuda con banorte', 'mi deuda de banorte', 'mi deuda con banorte',
    'pagué mi deuda de banorte', 'pagué la deuda de banorte', 'deuda de scotiabank', 'deuda con scotiabank',
    'mi deuda de scotiabank', 'mi deuda con scotiabank', 'pagué mi deuda de scotiabank',
    'pagué la deuda de scotiabank', 'deuda de inbursa', 'deuda con inbursa', 'mi deuda de inbursa',
    'mi deuda con inbursa', 'pagué mi deuda de inbursa', 'pagué la deuda de inbursa', 'deuda de mercado pago',
    'deuda con mercado pago', 'mi deuda de mercado pago', 'mi deuda con mercado pago',
    'pagué mi deuda de mercado pago', 'pagué la deuda de mercado pago', 'deuda de rappi', 'deuda con rappi',
    'mi deuda de rappi', 'mi deuda con rappi', 'pagué mi deuda de rappi', 'pagué la deuda de rappi', 'deuda de klar',
    'deuda con klar', 'mi deuda de klar', 'mi deuda con klar', 'pagué mi deuda de klar', 'pagué la deuda de klar',
    'deuda de stori', 'deuda con stori', 'mi deuda de stori', 'mi deuda con stori', 'pagué mi deuda de stori',
    'pagué la deuda de stori', 'deuda de hey banco', 'deuda con hey banco', 'mi deuda de hey banco',
    'mi deuda con hey banco', 'pagué mi deuda de hey banco', 'pagué la deuda de hey banco', 'deuda de amex',
    'deuda con amex', 'mi deuda de amex', 'mi deuda con amex', 'pagué mi deuda de amex', 'pagué la deuda de amex',
    'deuda de american express', 'deuda con american express', 'mi deuda de american express',
    'mi deuda con american express', 'pagué mi deuda de american express', 'pagué la deuda de american express',
    'deuda de coppel', 'deuda con coppel', 'mi deuda de coppel', 'mi deuda con coppel', 'pagué mi deuda de coppel',
    'pagué la deuda de coppel', 'deuda de liverpool', 'deuda con liverpool', 'mi deuda de liverpool',
    'mi deuda con liverpool', 'pagué mi deuda de liverpool', 'pagué la deuda de liverpool', 'deuda de walmart',
    'deuda con walmart', 'mi deuda de walmart', 'mi deuda con walmart', 'pagué mi deuda de walmart',
    'pagué la deuda de walmart', 'deuda de costco', 'deuda con costco', 'mi deuda de costco', 'mi deuda con costco',
    'pagué mi deuda de costco', 'pagué la deuda de costco', 'deuda de azteca', 'deuda con azteca',
    'mi deuda de azteca', 'mi deuda con azteca', 'pagué mi deuda de azteca', 'pagué la deuda de azteca',
    'deuda de bancoppel', 'deuda con bancoppel', 'mi deuda de bancoppel', 'mi deuda con bancoppel',
    'pagué mi deuda de bancoppel', 'pagué la deuda de bancoppel',
  ],
  fee_bank: [
    'cuota anual de la tarjeta', 'cuota anual de mi tarjeta', 'cuota anual de tarjeta',
    'cuota anual de la tarjeta platinum', 'cuota anual de la tarjeta oro', 'cuota anual de la tarjeta de crédito',
    'anualidad de la tarjeta platinum', 'anualidad de la tarjeta oro',
  ],
};

import type { CategoryDef } from './types';

// Catálogo inicial de categorías (spec sección 10). El usuario puede
// agregar, editar, eliminar y reordenar — esto es el set por defecto.
export const DEFAULT_CATEGORIES: CategoryDef[] = [
  {
    id: 'miscellaneous',
    name: 'Miscelánea',
    icon: 'miscellaneous',
    subcategories: [
      { id: 'misc_clothing', name: 'Ropa', keywords: ['ropa', 'playera', 'pantalón', 'zapatos', 'tienda de ropa', 'tenis', 'shein', 'zara', 'h&m', 'pull and bear'] },
      { id: 'misc_wellness', name: 'Bienestar', keywords: ['bienestar', 'spa', 'masaje'] },
      {
        id: 'misc_personal_care',
        name: 'Cuidado personal',
        keywords: ['cuidado personal', 'barbería', 'salón', 'estética', 'corte de pelo', 'uñas', 'maquillaje', 'skincare', 'perfume'],
      },
      { id: 'misc_shopping', name: 'Compras', keywords: ['compras', 'compré', 'tienda'] },
      { id: 'misc_electronics', name: 'Electrónica', keywords: ['electrónica', 'celular', 'laptop', 'audífonos'] },
      { id: 'misc_other', name: 'Otros', keywords: [] },
      {
        id: 'misc_software',
        name: 'Apps y software',
        keywords: ['app', 'software', 'licencia', 'hosting', 'dominio', 'github', 'claude', 'chatgpt', 'api', 'app store', 'google play', 'canva', 'figma'],
      },
      { id: 'misc_cloud', name: 'Almacenamiento en la nube', keywords: ['nube', 'icloud', 'google one', 'dropbox'] },
    ],
  },
  {
    id: 'savings',
    name: 'Ahorros',
    icon: 'savings',
    subcategories: [
      { id: 'sav_emergency', name: 'Fondo de emergencia', keywords: ['fondo de emergencia', 'emergencia', 'fondo de paz'] },
      { id: 'sav_vacation', name: 'Vacaciones', keywords: ['vacaciones', 'viaje ahorro'] },
      { id: 'sav_retirement', name: 'Retiro', keywords: ['retiro', 'afore', 'pensión'] },
      { id: 'sav_goals', name: 'Metas', keywords: ['meta', 'metas'] },
      { id: 'sav_other', name: 'Otros ahorros', keywords: ['ahorro', 'ahorré', 'metí lana', 'guardé'] },
      { id: 'sav_goals_short', name: 'Metas a corto plazo', keywords: ['meta corto plazo', 'meta a corto plazo'] },
      { id: 'sav_goals_long', name: 'Metas a mediano/largo plazo', keywords: ['meta largo plazo', 'meta mediano plazo'] },
      { id: 'sav_house_downpayment', name: 'Enganche de casa', keywords: ['enganche', 'enganche de casa'] },
    ],
  },
  {
    id: 'housing',
    name: 'Alojamiento y servicios',
    icon: 'housing',
    subcategories: [
      { id: 'house_rent', name: 'Renta', keywords: ['renta'] },
      { id: 'house_mortgage', name: 'Hipoteca', keywords: ['hipoteca'] },
      { id: 'house_insurance', name: 'Seguro', keywords: ['seguro de casa', 'seguro hogar'] },
      {
        id: 'house_phone',
        name: 'Teléfono',
        keywords: [
          'teléfono', 'celular plan', 'plan telefónico', 'telcel', 'at&t', 'movistar', 'bait', 'pillofon',
          'plan celular', 'telefonía', 'datos', 'datos pal celular', 'recarga', 'saldo',
        ],
      },
      { id: 'house_internet', name: 'Internet', keywords: ['internet', 'wifi', 'telmex', 'izzi', 'totalplay', 'megacable'] },
      { id: 'house_electricity', name: 'Electricidad', keywords: ['luz', 'electricidad', 'cfe'] },
      { id: 'house_water', name: 'Agua', keywords: ['agua', 'sacmex'] },
      { id: 'house_gas', name: 'Gas', keywords: ['gas', 'gas lp', 'cilindro de gas', 'gas natural', 'naturgy'] },
      {
        id: 'house_maintenance',
        name: 'Mantenimiento',
        keywords: ['mantenimiento casa', 'cuota', 'predial', 'depósito', 'roomie', 'coperacha luz'],
      },
      { id: 'house_services', name: 'Servicios', keywords: ['servicios'] },
      { id: 'house_condofees', name: 'Cuota de condominio', keywords: ['condominio', 'cuota de mantenimiento', 'administración'] },
      { id: 'house_furniture', name: 'Muebles', keywords: ['muebles'] },
      { id: 'house_appliances', name: 'Electrodomésticos', keywords: ['electrodoméstico', 'refrigerador', 'lavadora'] },
    ],
  },
  {
    id: 'food',
    name: 'Comida y bebidas',
    icon: 'food',
    subcategories: [
      {
        id: 'food_supermarket',
        name: 'Supermercado',
        keywords: [
          'súper', 'supermercado', 'walmart', 'soriana', 'despensa', 'mandado', 'abarrotes', 'tortilla', 'tortillas',
          'masa', 'tomate', 'jitomate', 'cebolla', 'ajo', 'chile', 'serrano', 'jalapeño', 'poblano', 'habanero',
          'aguacate', 'limón', 'papa', 'zanahoria', 'calabaza', 'chayote', 'nopal', 'nopales', 'cilantro', 'perejil',
          'epazote', 'lechuga', 'fruta', 'verdura', 'manzana', 'plátano', 'sandía', 'melón', 'papaya', 'limones',
          'naranja', 'pollo', 'pechuga', 'bistec', 'carne', 'molida', 'chuleta', 'tocino', 'jamón', 'salchicha',
          'queso', 'panela', 'oaxaca', 'manchego', 'cotija', 'leche', 'lala', 'alpura', 'nutrileche', 'huevo',
          'huevos', 'bachoco', 'bimbo', 'bolillo', 'telera', 'pan dulce', 'aceite', 'nutrioli', 'sal', 'azúcar',
          'pimienta', 'knorr', 'consomé', 'frijol', 'frijoles', 'arroz', 'lentejas', 'sopa', 'pasta', 'maruchan',
          'atún', 'sardina', 'mayonesa', 'mccormick', 'catsup', 'crema', 'garrafón', 'epura', 'bonafont', 'ciel',
          'agua embotellada', 'papel de baño', 'pétalo', 'cottonelle', 'jabón', 'zote', 'fabuloso', 'pinol', 'cloro',
          'detergente', 'suavitel', 'ariel', 'foca', 'roma', 'shampoo', 'desodorante', 'pasta de dientes', 'colgate',
          'cepillo', 'servilletas', 'bolsas de basura',
        ],
      },
      {
        id: 'food_restaurant',
        name: 'Restaurante',
        keywords: [
          'restaurante', 'comida en restaurante', 'vips', 'toks', 'sanborns', 'casa toño', 'desayuno',
          'comida con amigos', 'cena', 'propina', 'servicio', 'refresco', 'coca', 'coca cola', 'pepsi', 'boing',
          'jugo', 'agua fresca', 'horchata', 'jamaica', 'snack',
        ],
      },
      { id: 'food_coffee', name: 'Café', keywords: ['café', 'starbucks', 'café de grano', 'nescafé', 'latte', 'capuchino', 'espresso', 'frappé', 'té', 'tisana', 'andatti'] },
      {
        id: 'food_alcohol',
        name: 'Alcohol',
        keywords: [
          'alcohol', 'cerveza', 'peda', 'copas', 'chela', 'chelas', 'cheve', 'caguama', 'caguamón', 'misil',
          'victoria', 'corona', 'tecate', 'indio', 'modelo', 'michelada', 'gomichela', 'licuachela', 'azulito',
          'pitufo', 'vodka', 'tequila', 'ron', 'bacardí', 'whisky', 'mezcal', 'vino', 'pisto', 'pomo', 'chupe',
          'six', 'cartón', 'hielos', 'mezcladores', 'agua mineral', 'peñafiel', 'precopeo', 'after',
        ],
      },
      {
        id: 'food_fastfood',
        name: 'Comida rápida',
        keywords: [
          'comida rápida', 'mcdonalds', 'burger', 'tacos', 'pastor', 'suadero', 'tripa', 'carnitas', 'barbacoa',
          'canasta', 'guisado', 'quesadilla', 'gordita', 'sopes', 'pambazo', 'huarache', 'tlacoyo', 'machete',
          'tamal', 'guajolota', 'atole', 'champurrado', 'torta', 'cubana', 'chilaquiles', 'esquites', 'elote',
          'pizza', 'hamburguesa', 'hot dog', 'jocho', 'pollo frito', 'kfc', 'burger king', 'carls jr', 'subway',
          'dominos', 'little caesars', 'garnacha', 'puestito', 'antojo', 'comida corrida', 'fonda', 'fondita',
          'menú del día', 'cubierto',
        ],
      },
      { id: 'food_snacks', name: 'Snacks', keywords: ['snacks', 'botana', 'chicharrón', 'dorilocos', 'papitas', 'doritos', 'cheetos', 'sabritas', 'rufles', 'tostitos', 'jicaleta'] },
      { id: 'food_sweets', name: 'Dulces', keywords: ['dulces', 'chocolates', 'galletas', 'concha', 'churro', 'nieves', 'helado'] },
      { id: 'food_delivery', name: 'Delivery', keywords: ['delivery', 'uber eats', 'rappi', 'didi food'] },
      { id: 'food_other', name: 'Otros', keywords: ['comida'] },
      { id: 'food_market', name: 'Mercado', keywords: ['mercado', 'tianguis'] },
      { id: 'food_bakery', name: 'Panadería', keywords: ['panadería', 'pan'] },
      { id: 'food_organic', name: 'Orgánico y nutrición', keywords: ['orgánico', 'nutrición'] },
    ],
  },
  {
    id: 'entertainment',
    name: 'Entretenimiento',
    icon: 'entertainment',
    subcategories: [
      { id: 'ent_cinema', name: 'Cine', keywords: ['cine', 'película', 'cinépolis', 'cinemex', 'boletos', 'palomitas'] },
      { id: 'ent_concerts', name: 'Conciertos', keywords: ['concierto', 'ticketmaster', 'festival', 'toquín'] },
      { id: 'ent_hobbies', name: 'Hobbies', keywords: ['hobby', 'pasatiempo'] },
      { id: 'ent_videogames', name: 'Videojuegos', keywords: ['videojuego', 'steam', 'playstation'] },
      { id: 'ent_sports', name: 'Deportes', keywords: ['deporte', 'gimnasio', 'gym'] },
      { id: 'ent_bowling', name: 'Boliche', keywords: ['boliche'] },
      { id: 'ent_clubs', name: 'Discotecas', keywords: ['antro', 'discoteca', 'cover', 'bar', 'cantina', 'botanero'] },
      {
        id: 'ent_streaming',
        name: 'Streaming',
        keywords: [
          'netflix', 'streaming', 'disney+', 'hbo', 'spotify', 'youtube premium', 'amazon prime', 'max',
          'disney plus', 'apple tv', 'crunchyroll', 'game pass', 'playstation plus', 'nintendo switch online',
        ],
      },
      { id: 'ent_subscriptions', name: 'Suscripciones', keywords: ['suscripción', 'membresía'] },
      { id: 'ent_events', name: 'Eventos', keywords: ['evento', 'teatro', 'museo', 'partido', 'estadio'] },
      { id: 'ent_vacation', name: 'Vacaciones', keywords: ['vacaciones'] },
      { id: 'ent_other', name: 'Otros', keywords: ['entretenimiento', 'vida social'] },
      { id: 'ent_karaoke', name: 'Karaoke y bares', keywords: ['karaoke', 'bar', 'antro'] },
      { id: 'ent_amusement', name: 'Parques de diversiones', keywords: ['parque de diversiones', 'feria'] },
    ],
  },
  {
    id: 'lifestyle',
    name: 'Estilo de vida',
    icon: 'lifestyle',
    subcategories: [
      { id: 'life_gifts', name: 'Regalos', keywords: ['regalo', 'cumpleaños'] },
      { id: 'life_pets', name: 'Mascotas', keywords: ['mascota', 'perro', 'gato', 'veterinario', 'croquetas', 'arena'] },
      { id: 'life_donations', name: 'Donaciones', keywords: ['donación', 'donativo'] },
      { id: 'life_personal', name: 'Compras personales', keywords: ['compra personal'] },
      { id: 'life_travel', name: 'Viajes', keywords: ['viaje', 'vuelo', 'hotel'] },
      { id: 'life_experiences', name: 'Experiencias', keywords: ['experiencia'] },
      { id: 'life_other', name: 'Otros', keywords: [] },
      { id: 'life_family_support', name: 'Apoyo familiar', keywords: ['apoyo familiar', 'le di a mi mamá', 'le di a mi papá', 'ayuda familiar'] },
      { id: 'life_community', name: 'Causas comunitarias', keywords: ['voluntariado', 'causa comunitaria'] },
      { id: 'life_celebration', name: 'Celebraciones familiares', keywords: ['celebración', 'cumpleaños familiar', 'posada'] },
    ],
  },
  {
    id: 'health',
    name: 'Salud',
    icon: 'health',
    subcategories: [
      { id: 'health_doctor', name: 'Médico', keywords: ['doctor', 'médico', 'consulta', 'análisis', 'laboratorio'] },
      {
        id: 'health_pharmacy',
        name: 'Farmacia',
        keywords: [
          'farmacia', 'medicina', 'simi', 'farmacia del ahorro', 'medicinas', 'pastillas', 'paracetamol',
          'ibuprofeno', 'antibiótico', 'curitas', 'merthiolate',
        ],
      },
      { id: 'health_dentist', name: 'Dentista', keywords: ['dentista'] },
      { id: 'health_mental', name: 'Salud mental', keywords: ['psicólogo', 'terapia', 'psiquiatra'] },
      { id: 'health_hygiene', name: 'Aseo personal', keywords: ['aseo personal', 'toallas femeninas', 'tampones', 'copa menstrual', 'condones'] },
      { id: 'health_insurance', name: 'Seguro médico', keywords: ['seguro médico', 'seguro de gastos médicos'] },
      { id: 'health_other', name: 'Otros', keywords: ['salud'] },
      { id: 'health_vision', name: 'Óptica', keywords: ['óptica', 'lentes', 'anteojos'] },
      { id: 'health_supplements', name: 'Vitaminas y suplementos', keywords: ['vitaminas', 'suplementos'] },
    ],
  },
  {
    id: 'income',
    name: 'Ingresos',
    icon: 'income',
    subcategories: [
      { id: 'inc_salary', name: 'Salario', keywords: ['sueldo', 'salario', 'nómina', 'me pagaron', 'quincena', 'depósito', 'transferencia'], incomeKind: 'fixed' },
      { id: 'inc_allowance', name: 'Mesada', keywords: ['mesada', 'domingo'], incomeKind: 'fixed' },
      { id: 'inc_bonus', name: 'Bonos', keywords: ['bono', 'aguinaldo', 'utilidades'], incomeKind: 'variable' },
      { id: 'inc_investments', name: 'Inversiones', keywords: ['rendimiento inversión', 'rendimientos'], incomeKind: 'variable' },
      { id: 'inc_dividends', name: 'Dividendos', keywords: ['dividendo'], incomeKind: 'variable' },
      { id: 'inc_interest', name: 'Intereses', keywords: ['interés', 'intereses'], incomeKind: 'variable' },
      { id: 'inc_freelance', name: 'Freelance', keywords: ['freelance', 'chamba', 'proyecto'], incomeKind: 'variable' },
      { id: 'inc_gifts', name: 'Regalos', keywords: ['me regalaron'], incomeKind: 'variable' },
      { id: 'inc_sales', name: 'Ventas', keywords: ['venta', 'vendí'], incomeKind: 'variable' },
      { id: 'inc_other', name: 'Otros', keywords: ['ingreso'], incomeKind: 'variable' },
    ],
  },
  {
    id: 'transport',
    name: 'Transporte',
    icon: 'transport',
    subcategories: [
      { id: 'trans_uber', name: 'Uber', keywords: ['uber'] },
      { id: 'trans_didi', name: 'DiDi', keywords: ['didi'] },
      { id: 'trans_taxi', name: 'Taxi', keywords: ['taxi', 'indriver', 'cabify', 'viaje en app'] },
      {
        id: 'trans_public',
        name: 'Transporte público',
        keywords: [
          'metro', 'camión', 'metrobús', 'transporte público', 'ruta', 'mb', 'trolebús', 'trole', 'tren ligero',
          'cablebús', 'mexibús', 'suburbano', 'pumabús', 'rtp', 'pasaje', 'recarga tarjeta', 'movilidad integrada',
        ],
      },
      { id: 'trans_gas', name: 'Gasolina', keywords: ['gasolina', 'gasolinera', 'gas', 'magna', 'verde', 'premium', 'roja', 'diesel'] },
      { id: 'trans_flights', name: 'Vuelos', keywords: ['vuelo', 'avión', 'aeroméxico', 'volaris'] },
      { id: 'trans_carrental', name: 'Renta de coche', keywords: ['renta de coche', 'renta de auto'] },
      { id: 'trans_parking', name: 'Estacionamiento', keywords: ['estacionamiento', 'pensión', 'parquímetro', 'viene viene', 'franelero'] },
      { id: 'trans_tolls', name: 'Peajes', keywords: ['peaje', 'caseta', 'tag', 'pase'] },
      {
        id: 'trans_maintenance',
        name: 'Mantenimiento',
        keywords: ['taller', 'mantenimiento coche', 'mecánico', 'refacción', 'llanta', 'talacha', 'vulcanizadora', 'lavado', 'autolavado', 'verificación', 'tenencia'],
      },
      { id: 'trans_other', name: 'Otros', keywords: ['transporte'] },
      { id: 'trans_school', name: 'Transporte escolar', keywords: ['transporte escolar', 'camión escolar'] },
      { id: 'trans_microbus', name: 'Microbús', keywords: ['micro', 'microbús', 'pesero', 'pecera'] },
      { id: 'trans_combi', name: 'Combi', keywords: ['combi'] },
      { id: 'trans_bikeshare', name: 'Bici o scooter compartido', keywords: ['ecobici', 'scooter', 'bici pública'] },
    ],
  },
  {
    id: 'debt',
    name: 'Deudas',
    icon: 'debt',
    subcategories: [
      { id: 'debt_creditcard', name: 'Tarjeta de crédito', keywords: ['tarjeta de crédito', 'pago tarjeta'] },
      { id: 'debt_student', name: 'Préstamo estudiantil', keywords: ['préstamo estudiantil'] },
      { id: 'debt_personal', name: 'Préstamo personal', keywords: ['préstamo personal'] },
      { id: 'debt_mortgage', name: 'Hipoteca', keywords: ['hipoteca deuda'] },
      { id: 'debt_other', name: 'Otros', keywords: ['deuda'] },
      { id: 'debt_car_loan', name: 'Crédito automotriz', keywords: ['crédito auto', 'crédito automotriz'] },
      { id: 'debt_appliance', name: 'Crédito de muebles/electrodomésticos', keywords: ['crédito de muebles', 'a meses sin intereses'] },
    ],
  },
  {
    id: 'investments',
    name: 'Inversiones',
    icon: 'investments',
    subcategories: [
      { id: 'inv_stocks', name: 'Acciones', keywords: ['acción', 'acciones', 'bolsa', 'gbm', 'gbm+', 'kuspit'] },
      { id: 'inv_etfs', name: 'ETFs', keywords: ['etf', 'voo', 'qqq', 'ivv'] },
      { id: 'inv_fibras', name: 'FIBRAs', keywords: ['fibra', 'funo', 'vesta', 'prologis', 'terrafina', 'macquarie', 'danhos', 'danos', 'educa'] },
      { id: 'inv_cetes', name: 'CETES', keywords: ['cetes', 'cetesdirecto', 'udibonos', 'bonddía', 'bonddia'] },
      { id: 'inv_bonds', name: 'Bonos', keywords: ['bono'] },
      { id: 'inv_funds', name: 'Fondos', keywords: ['fondo de inversión'] },
      { id: 'inv_crypto', name: 'Criptomonedas', keywords: ['cripto', 'criptomonedas', 'bitcoin', 'ethereum', 'bitso', 'binance'] },
      { id: 'inv_other', name: 'Otros', keywords: ['invertí', 'inversión', 'aportación ppr'] },
    ],
  },
  {
    id: 'education',
    name: 'Educación y desarrollo',
    icon: 'education',
    subcategories: [
      {
        id: 'edu_tuition',
        name: 'Colegiaturas e inscripción',
        keywords: ['colegiatura', 'colegiaturas', 'inscripción', 'unam', 'facultad', 'credencial', 'título'],
      },
      {
        id: 'edu_supplies',
        name: 'Materiales y papelería',
        keywords: ['copias', 'impresiones', 'engargolado', 'papelería', 'libros', 'plumones', 'libretas', 'cuadernos', 'material escolar', 'mochila'],
      },
      { id: 'edu_courses', name: 'Cursos y certificaciones', keywords: ['curso', 'diplomado', 'examen', 'certificación'] },
      { id: 'edu_other', name: 'Otros', keywords: [] },
    ],
  },
];

export function findCategory(categoryId: string): CategoryDef | undefined {
  return DEFAULT_CATEGORIES.find((c) => c.id === categoryId);
}

export function findSubcategory(categoryId: string, subcategoryId: string) {
  return findCategory(categoryId)?.subcategories.find((s) => s.id === subcategoryId);
}

// Subcategoría razonable cuando el usuario elige solo la categoría general
// (p. ej. al completar información faltante en la captura rápida).
export function fallbackSubcategoryId(categoryId: string): string {
  const cat = findCategory(categoryId);
  if (!cat || cat.subcategories.length === 0) return '';
  const other = cat.subcategories.find((s) => s.id.endsWith('_other'));
  return (other ?? cat.subcategories[0]).id;
}

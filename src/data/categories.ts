import type { CategoryDef, SubcategoryDef } from './types';

// Catálogo inicial de categorías (spec sección 10). El usuario puede
// agregar, editar, eliminar y reordenar — esto es el set por defecto.
// Ampliado ~25% por categoría el 2026-09-02 (catálogo v9) — cada
// subcategoría nueva queda mapeada a un concepto real de Presupuesto en
// src/data/budgetConcepts.ts (o marcada excludedFromBudget a propósito),
// nunca huérfana en silencio.
export const DEFAULT_CATEGORIES: CategoryDef[] = [
  {
    id: 'miscellaneous',
    name: 'Miscelánea',
    icon: 'miscellaneous',
    subcategories: [
      {
        id: 'misc_clothing',
        name: 'Ropa',
        keywords: ['ropa', 'playera', 'pantalón', 'zapatos', 'tienda de ropa', 'tenis', 'shein', 'zara', 'h&m', 'pull and bear', 'chamarra', 'saco', 'vestido'],
        excludedFromBudget: true,
      },
      { id: 'misc_wellness', name: 'Bienestar', keywords: ['bienestar', 'spa', 'masaje', 'temazcal'] },
      {
        id: 'misc_personal_care',
        name: 'Cuidado personal',
        keywords: ['cuidado personal', 'barbería', 'salón', 'estética', 'corte de pelo', 'uñas', 'maquillaje', 'skincare', 'perfume', 'tinte', 'facial'],
      },
      { id: 'misc_shopping', name: 'Compras', keywords: ['compras', 'compré', 'tienda', 'amazon', 'mercado libre'], excludedFromBudget: true },
      { id: 'misc_electronics', name: 'Electrónica', keywords: ['electrónica', 'celular', 'laptop', 'audífonos', 'cargador', 'cable usb', 'tablet', 'ipad'] },
      { id: 'misc_other', name: 'Otros', keywords: [], excludedFromBudget: true },
      {
        id: 'misc_software',
        name: 'Apps y software',
        keywords: ['app', 'software', 'licencia', 'hosting', 'dominio', 'github', 'claude', 'chatgpt', 'api', 'app store', 'google play', 'canva', 'figma'],
      },
      { id: 'misc_cloud', name: 'Almacenamiento en la nube', keywords: ['nube', 'icloud', 'google one', 'dropbox', 'drive'] },
      {
        id: 'misc_repairs',
        name: 'Reparación de aparatos',
        keywords: ['reparación de celular', 'cambio de pantalla', 'servicio técnico', 'taller de electrónica'],
      },
      {
        id: 'misc_second_hand',
        name: 'Segunda mano y trueque',
        keywords: ['segunda mano', 'trueque', 'venta de garage', 'facebook marketplace'],
        excludedFromBudget: true,
      },
    ],
  },
  {
    id: 'savings',
    name: 'Ahorros',
    icon: 'savings',
    subcategories: [
      { id: 'sav_emergency', name: 'Fondo de emergencia', keywords: ['fondo de emergencia', 'emergencia', 'fondo de paz'] },
      { id: 'sav_vacation', name: 'Vacaciones', keywords: ['vacaciones', 'viaje ahorro', 'fondo viaje'] },
      { id: 'sav_retirement', name: 'Retiro', keywords: ['retiro', 'afore', 'pensión', 'ppr'] },
      { id: 'sav_goals', name: 'Metas', keywords: ['meta', 'metas', 'ahorro programado'] },
      { id: 'sav_other', name: 'Otros ahorros', keywords: ['ahorro', 'ahorré', 'metí lana', 'guardé'] },
      { id: 'sav_goals_short', name: 'Metas a corto plazo', keywords: ['meta corto plazo', 'meta a corto plazo'] },
      { id: 'sav_goals_long', name: 'Metas a mediano/largo plazo', keywords: ['meta largo plazo', 'meta mediano plazo'] },
      { id: 'sav_house_downpayment', name: 'Enganche de casa', keywords: ['enganche', 'enganche de casa', 'ahorro vivienda'] },
      {
        id: 'sav_education_fund',
        name: 'Fondo para estudios',
        keywords: ['fondo educativo', 'ahorro para estudios', 'fondo universidad', 'ahorro colegiatura'],
      },
      {
        id: 'sav_wedding_fund',
        name: 'Fondo para boda/evento grande',
        keywords: ['fondo para la boda', 'ahorro evento', 'ahorro xv años'],
      },
    ],
  },
  {
    id: 'housing',
    name: 'Alojamiento y servicios',
    icon: 'housing',
    subcategories: [
      { id: 'house_rent', name: 'Renta', keywords: ['renta', 'alquiler', 'pago departamento'] },
      { id: 'house_mortgage', name: 'Hipoteca', keywords: ['hipoteca', 'crédito hipotecario', 'infonavit', 'fovissste'] },
      { id: 'house_insurance', name: 'Seguro', keywords: ['seguro de casa', 'seguro hogar', 'póliza hogar'] },
      {
        id: 'house_phone',
        name: 'Teléfono',
        keywords: [
          'teléfono', 'celular plan', 'plan telefónico', 'telcel', 'at&t', 'movistar', 'bait', 'pillofon',
          'plan celular', 'telefonía', 'datos', 'datos pal celular', 'recarga', 'saldo',
        ],
      },
      { id: 'house_internet', name: 'Internet', keywords: ['internet', 'wifi', 'telmex', 'izzi', 'totalplay', 'megacable', 'fibra óptica'] },
      { id: 'house_electricity', name: 'Electricidad', keywords: ['luz', 'electricidad', 'cfe', 'recibo de luz'] },
      { id: 'house_water', name: 'Agua', keywords: ['agua', 'sacmex', 'recibo del agua'] },
      { id: 'house_gas', name: 'Gas', keywords: ['gas', 'gas lp', 'cilindro de gas', 'gas natural', 'naturgy', 'tanque de gas'] },
      {
        id: 'house_maintenance',
        name: 'Mantenimiento',
        keywords: ['mantenimiento casa', 'cuota', 'predial', 'depósito', 'roomie', 'coperacha luz', 'reparación fuga', 'cerrajero', 'plomero', 'electricista'],
      },
      { id: 'house_services', name: 'Servicios', keywords: ['servicios'] },
      { id: 'house_condofees', name: 'Cuota de condominio', keywords: ['condominio', 'cuota de mantenimiento', 'administración', 'vigilancia edificio'] },
      { id: 'house_furniture', name: 'Muebles', keywords: ['muebles', 'colchón', 'sala', 'comedor', 'escritorio', 'silla ergonómica'] },
      { id: 'house_appliances', name: 'Electrodomésticos', keywords: ['electrodoméstico', 'refrigerador', 'lavadora', 'microondas', 'licuadora', 'estufa', 'secadora'] },
      { id: 'house_moving', name: 'Mudanza', keywords: ['mudanza', 'flete', 'camioneta de mudanza'] },
      { id: 'house_security', name: 'Seguridad y alarmas', keywords: ['alarma', 'cámaras de seguridad', 'caseta de vigilancia', 'monitoreo'] },
      { id: 'house_laundry_service', name: 'Lavandería y tintorería', keywords: ['lavandería', 'tintorería', 'lavado de ropa', 'planchado'] },
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
      { id: 'food_market', name: 'Mercado', keywords: ['mercado', 'tianguis', 'sobre ruedas'] },
      { id: 'food_bakery', name: 'Panadería', keywords: ['panadería', 'pan', 'expendio de pan'] },
      { id: 'food_organic', name: 'Orgánico y nutrición', keywords: ['orgánico', 'nutrición', 'suplementos alimenticios', 'proteína', 'keto'] },
      { id: 'food_juice_bar', name: 'Jugos y licuados', keywords: ['jugo natural', 'licuado', 'smoothie', 'juguería'] },
      { id: 'food_catering', name: 'Banquetes y eventos', keywords: ['banquete', 'catering', 'buffet de evento', 'mesa de dulces'] },
      { id: 'food_water_delivery', name: 'Garrafón y agua a domicilio', keywords: ['garrafón a domicilio', 'servicio de agua', 'repartidor de agua'] },
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
      { id: 'ent_videogames', name: 'Videojuegos', keywords: ['videojuego', 'steam', 'playstation', 'xbox', 'nintendo'] },
      { id: 'ent_sports', name: 'Deportes', keywords: ['deporte', 'gimnasio', 'gym', 'smart fit', 'cancha'] },
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
      { id: 'ent_amusement', name: 'Parques de diversiones', keywords: ['parque de diversiones', 'feria', 'six flags'] },
      { id: 'ent_escape_room', name: 'Cuartos de escape', keywords: ['cuarto de escape', 'escape room'] },
      { id: 'ent_arcade', name: 'Arcadas y maquinitas', keywords: ['arcada', 'maquinitas', 'ficha de arcada', 'vr arena'] },
      { id: 'ent_billiards', name: 'Billar y dominó', keywords: ['billar', 'pool', 'dominó', 'mesa de billar'] },
      { id: 'ent_photography', name: 'Fotografía y recuerdos de eventos', keywords: ['fotógrafo', 'cabina de fotos', 'recuerditos', 'photobooth'] },
    ],
  },
  {
    id: 'lifestyle',
    name: 'Estilo de vida',
    icon: 'lifestyle',
    subcategories: [
      { id: 'life_gifts', name: 'Regalos', keywords: ['regalo', 'cumpleaños', 'intercambio'] },
      { id: 'life_pets', name: 'Mascotas', keywords: ['mascota', 'perro', 'gato', 'veterinario', 'croquetas', 'arena', 'estética canina'] },
      { id: 'life_donations', name: 'Donaciones', keywords: ['donación', 'donativo', 'colecta'] },
      { id: 'life_personal', name: 'Compras personales', keywords: ['compra personal'] },
      { id: 'life_travel', name: 'Viajes', keywords: ['viaje', 'vuelo', 'hotel', 'airbnb'] },
      { id: 'life_experiences', name: 'Experiencias', keywords: ['experiencia', 'tour', 'escapada'] },
      { id: 'life_other', name: 'Otros', keywords: [] },
      { id: 'life_family_support', name: 'Apoyo familiar', keywords: ['apoyo familiar', 'le di a mi mamá', 'le di a mi papá', 'ayuda familiar', 'dinero para la casa'] },
      { id: 'life_community', name: 'Causas comunitarias', keywords: ['voluntariado', 'causa comunitaria'] },
      { id: 'life_celebration', name: 'Celebraciones familiares', keywords: ['celebración', 'cumpleaños familiar', 'posada', 'aniversario'] },
      { id: 'life_self_improvement', name: 'Desarrollo personal', keywords: ['coaching', 'desarrollo personal', 'retiro espiritual'] },
      { id: 'life_social_clubs', name: 'Membresías sociales', keywords: ['club social', 'membresía club', 'country club', 'cuota de club'] },
      { id: 'life_wedding', name: 'Bodas y despedidas', keywords: ['boda', 'despedida de soltero', 'despedida de soltera', 'xv años', 'baby shower'] },
    ],
  },
  {
    id: 'health',
    name: 'Salud',
    icon: 'health',
    subcategories: [
      {
        id: 'health_doctor',
        name: 'Médico',
        keywords: ['doctor', 'médico', 'consulta', 'análisis', 'laboratorio', 'pediatra', 'ginecólogo', 'urólogo', 'cardiólogo', 'gastroenterólogo', 'homeópata'],
      },
      {
        id: 'health_pharmacy',
        name: 'Farmacia',
        keywords: [
          'farmacia', 'medicina', 'simi', 'farmacia del ahorro', 'medicinas', 'pastillas', 'paracetamol',
          'ibuprofeno', 'antibiótico', 'curitas', 'merthiolate', 'jarabe', 'gasas', 'receta médica',
        ],
      },
      { id: 'health_dentist', name: 'Dentista', keywords: ['dentista', 'ortodoncista', 'limpieza dental', 'caries', 'endodoncia', 'brackets'] },
      { id: 'health_mental', name: 'Salud mental', keywords: ['psicólogo', 'terapia', 'psiquiatra', 'terapeuta', 'sesión psicológica'] },
      { id: 'health_hygiene', name: 'Aseo personal', keywords: ['aseo personal', 'toallas femeninas', 'tampones', 'copa menstrual', 'condones', 'preservativos', 'lubricante'] },
      { id: 'health_insurance', name: 'Seguro médico', keywords: ['seguro médico', 'seguro de gastos médicos', 'sgmm', 'póliza de salud'] },
      { id: 'health_other', name: 'Otros', keywords: ['salud'] },
      { id: 'health_vision', name: 'Óptica', keywords: ['óptica', 'lentes', 'anteojos', 'armazones', 'lentes de contacto', 'graduación de lentes'] },
      { id: 'health_supplements', name: 'Vitaminas y suplementos', keywords: ['vitaminas', 'suplementos', 'omega 3', 'magnesio', 'colágeno'] },
      {
        id: 'health_specialists',
        name: 'Especialidades médicas',
        keywords: ['podólogo', 'oftalmólogo', 'dermatólogo', 'nutriólogo', 'fisioterapeuta', 'optometrista', 'traumatólogo', 'neurólogo'],
      },
      {
        id: 'health_labs',
        name: 'Estudios y laboratorio',
        keywords: ['estudios clínicos', 'análisis de sangre', 'rayos x', 'ultrasonido', 'resonancia', 'tomografía', 'check up'],
      },
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
      { id: 'trans_flights', name: 'Vuelos', keywords: ['vuelo', 'avión', 'aeroméxico', 'volaris', 'vivaaerobus'] },
      { id: 'trans_carrental', name: 'Renta de coche', keywords: ['renta de coche', 'renta de auto', 'hertz'] },
      { id: 'trans_parking', name: 'Estacionamiento', keywords: ['estacionamiento', 'pensión', 'parquímetro', 'viene viene', 'franelero', 'valet parking'] },
      { id: 'trans_tolls', name: 'Peajes', keywords: ['peaje', 'caseta', 'tag', 'pase', 'iave'] },
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
      { id: 'trans_mototaxi', name: 'Mototaxi', keywords: ['mototaxi', 'moto taxi', 'motorratón'] },
      { id: 'trans_ferry', name: 'Ferry y lancha', keywords: ['ferry', 'lancha', 'transbordador', 'panga'] },
      { id: 'trans_car_insurance', name: 'Seguro de auto', keywords: ['seguro de auto', 'seguro del carro', 'póliza de auto', 'gnp auto', 'qualitas'] },
      { id: 'trans_bike', name: 'Bicicleta propia', keywords: ['bicicleta', 'refacciones de bici', 'candado de bici', 'casco de bici'] },
    ],
  },
  {
    id: 'debt',
    name: 'Deudas',
    icon: 'debt',
    subcategories: [
      { id: 'debt_creditcard', name: 'Tarjeta de crédito', keywords: ['tarjeta de crédito', 'pago tarjeta', 'pago mínimo', 'pago para no generar intereses'] },
      { id: 'debt_student', name: 'Préstamo estudiantil', keywords: ['préstamo estudiantil', 'crédito educativo'] },
      { id: 'debt_personal', name: 'Préstamo personal', keywords: ['préstamo personal', 'prestamista', 'tanda'] },
      { id: 'debt_mortgage', name: 'Hipoteca', keywords: ['hipoteca deuda', 'saldo hipotecario'] },
      { id: 'debt_other', name: 'Otros', keywords: ['deuda', 'pagaré'] },
      { id: 'debt_car_loan', name: 'Crédito automotriz', keywords: ['crédito auto', 'crédito automotriz', 'mensualidad carro'] },
      { id: 'debt_appliance', name: 'Crédito de muebles/electrodomésticos', keywords: ['crédito de muebles', 'a meses sin intereses', 'coppel', 'elektra'] },
      { id: 'debt_payday_loan', name: 'Préstamo de nómina o empeño', keywords: ['empeño', 'monte de piedad', 'préstamo de nómina', 'crédito rápido', 'prestaentresemana'] },
      { id: 'debt_medical', name: 'Deuda médica', keywords: ['deuda médica', 'plan de pagos hospital', 'financiamiento médico'] },
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
      { id: 'inv_bonds', name: 'Bonos', keywords: ['bono', 'bonos gubernamentales'] },
      { id: 'inv_funds', name: 'Fondos', keywords: ['fondo de inversión', 'fondo indexado'] },
      { id: 'inv_crypto', name: 'Criptomonedas', keywords: ['cripto', 'criptomonedas', 'bitcoin', 'ethereum', 'bitso', 'binance'] },
      { id: 'inv_other', name: 'Otros', keywords: ['invertí', 'inversión', 'aportación ppr'] },
      { id: 'inv_real_estate', name: 'Bienes raíces (inversión)', keywords: ['inversión inmobiliaria', 'crowdfunding inmobiliario', 'terreno inversión', 'fideicomiso'] },
      { id: 'inv_p2p_lending', name: 'Préstamos entre personas (fintech)', keywords: ['p2p lending', 'yotepresto', 'cumplo'] },
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
        keywords: ['colegiatura', 'colegiaturas', 'inscripción', 'unam', 'facultad', 'credencial', 'título', 'reincorporación'],
      },
      {
        id: 'edu_supplies',
        name: 'Materiales y papelería',
        keywords: ['copias', 'impresiones', 'engargolado', 'papelería', 'libros', 'plumones', 'libretas', 'cuadernos', 'material escolar', 'mochila', 'bata de laboratorio'],
      },
      { id: 'edu_courses', name: 'Cursos y certificaciones', keywords: ['curso', 'diplomado', 'examen', 'certificación', 'platzi', 'udemy', 'coursera'] },
      { id: 'edu_other', name: 'Otros', keywords: ['educación'] },
      { id: 'edu_tutoring', name: 'Clases particulares y regularización', keywords: ['clases particulares', 'regularización', 'tutor', 'asesoría escolar'] },
    ],
  },
];

export function findCategory(categoryId: string): CategoryDef | undefined {
  return DEFAULT_CATEGORIES.find((c) => c.id === categoryId);
}

export function findSubcategory(categoryId: string, subcategoryId: string) {
  return findCategory(categoryId)?.subcategories.find((s) => s.id === subcategoryId);
}

// Valor por defecto del toggle "excluir de presupuesto" al elegir esta
// categoría/subcategoría en el registro manual o por voz — algunas
// subcategorías (ej. Ropa/Compras/Otros de Miscelánea) no pertenecen a
// ningún concepto de Presupuesto a propósito (catálogo v7).
export function isExcludedFromBudgetByDefault(categoryId: string, subcategoryId: string): boolean {
  return findSubcategory(categoryId, subcategoryId)?.excludedFromBudget ?? false;
}

// Busca una subcategoría por id sin conocer de antemano su categoría real
// — seguro porque cada id de subcategoría ya trae su propio prefijo único
// (trans_, food_, ent_...), así que nunca hay dos categorías con el mismo
// id de subcategoría. Se usa para mostrar el nombre real de una "ficha"
// de presupuesto por subcategoría (spec: fichas dentro de un concepto,
// ej. Uber/Microbús/Metro dentro de "Transporte cotidiano").
export function findSubcategoryAnyCategory(subcategoryId: string): { category: CategoryDef; subcategory: SubcategoryDef } | undefined {
  for (const category of DEFAULT_CATEGORIES) {
    const subcategory = category.subcategories.find((s) => s.id === subcategoryId);
    if (subcategory) return { category, subcategory };
  }
  return undefined;
}

// Subcategoría razonable cuando el usuario elige solo la categoría general
// (p. ej. al completar información faltante en la captura rápida).
export function fallbackSubcategoryId(categoryId: string): string {
  const cat = findCategory(categoryId);
  if (!cat || cat.subcategories.length === 0) return '';
  const other = cat.subcategories.find((s) => s.id.endsWith('_other'));
  return (other ?? cat.subcategories[0]).id;
}

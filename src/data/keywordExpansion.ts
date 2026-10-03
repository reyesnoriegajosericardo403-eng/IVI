// Ampliación del catálogo de palabras clave (P1, 2026-10-03).
//
// Cómo habla la gente en México de cada subcategoría — marcas, productos, verbos y
// frases completas. El motor local (src/ai/localParser.ts) las suma a las que ya
// trae cada subcategoría en categories.ts; la palabra MÁS LARGA que coincida gana,
// así que una frase ("cambio de aceite") le gana a una palabra suelta ("aceite").
//
// Reglas para agregar palabras (cada una nace de una falla real del golden set):
//  - Si es ambigua sola, ponla como frase ("cuota del club", no "cuota").
//  - No pongas palabras de uso diario sin significado de gasto ("casa", "mes", "pago").
//  - El plural/singular lo genera el motor solo; el género (o/a) NO — agrégalo aquí.
//  - Después de editar: node scripts/golden/run-golden.cjs  (no debe bajar ningún %).
export const EXTRA_KEYWORDS: Record<string, string[]> = {
  // ---------- Miscelánea ----------
  misc_clothing: [
    'jeans', 'mezclilla', 'pantalones', 'pantalón de mezclilla', 'short', 'shorts', 'bermuda', 'falda', 'blusa', 'camisa', 'camiseta',
    'sudadera', 'hoodie', 'suéter', 'abrigo', 'gabardina', 'chaqueta', 'chaleco', 'bufanda', 'guantes', 'gorra', 'sombrero', 'cinturón',
    'corbata', 'traje', 'calcetines', 'calcetas', 'ropa interior', 'boxers', 'calzones', 'brasier', 'pijama', 'traje de baño', 'bikini',
    'zapatillas', 'botas', 'botines', 'sandalias', 'huaraches', 'converse', 'nike', 'adidas', 'puma', 'vans', 'bershka', 'pull&bear',
    'forever 21', 'ropa deportiva', 'leggins', 'playera polo', 'bolso', 'reloj', 'joyería', 'anillo', 'collar', 'aretes', 'pulsera',
    'ropa nueva', 'outfit', 'uniforme de trabajo', 'blazer', 'vestido de fiesta', 'lentes de sol',
  ],
  misc_wellness: ['masajes', 'reiki', 'acupuntura', 'sauna', 'jacuzzi', 'baño de vapor', 'sesión de reiki', 'aromaterapia', 'masaje de espalda', 'masaje relajante', 'circuito de spa', 'día de spa', 'tina de flotación'],
  misc_personal_care: [
'me corté el cabello', 'me corté el pelo', 'corte de cabello', 'cortarme el cabello', 'corté el cabello',     'peluquería', 'salón de belleza', 'barbero', 'corte de cabello', 'mechas', 'balayage', 'alaciado', 'keratina', 'peinado', 'manicure',
    'pedicure', 'uñas acrílicas', 'uñas de gel', 'arreglo de uñas', 'depilación', 'depilación láser', 'cera', 'rímel', 'labial',
    'base de maquillaje', 'colonia', 'crema facial', 'sérum', 'protector solar', 'acondicionador', 'pestañas', 'extensiones de pestañas',
    'cejas', 'microblading', 'rasuradora', 'tinte de cabello', 'tratamiento capilar', 'cuidado de la piel', 'limpieza facial',
  ],
  misc_shopping: ['compra', 'compras en línea', 'compra en línea', 'pedido en línea', 'temu', 'aliexpress', 'liverpool', 'palacio de hierro', 'sears', 'ebay', 'shein pedido', 'tienda departamental', 'centro comercial', 'plaza comercial', 'outlet', 'compras de amazon', 'pedido de amazon'],
  misc_electronics: [
    'audifonos', 'airpods', 'bocina', 'bocinas', 'usb', 'power bank', 'batería portátil', 'teléfono nuevo', 'iphone', 'samsung', 'xiaomi',
    'computadora', 'pc', 'monitor', 'teclado', 'mouse', 'mouse inalámbrico', 'ratón', 'webcam', 'impresora', 'memoria usb', 'disco duro', 'ssd', 'smartwatch',
    'reloj inteligente', 'apple watch', 'tele', 'televisor', 'smart tv', 'cámara', 'gopro', 'drone', 'bocina bluetooth', 'adaptador', 'funda de celular', 'mica',
    'celular nuevo', 'laptop nueva', 'tablet nueva', 'accesorios de celular',
  ],
  misc_software: ['chatgpt', 'chat gpt', 'claude', 'gemini', 'copilot', 'midjourney', 'suscripción de chatgpt', 'apps', 'openai', 'notion', 'canva', 'photoshop', 'office', 'microsoft 365', 'office 365', 'zoom', 'slack', 'vpn', 'nordvpn', 'antivirus', 'wordpress', 'shopify', 'figma', 'midjourney', 'copilot', 'cursor', 'vercel', 'aws', 'play store', 'suscripción de software', 'licencia de software', 'licencia de office', 'suscripción a claude', 'suscripción a chatgpt', 'adobe'],
  misc_cloud: ['onedrive', 'almacenamiento en la nube', 'espacio en la nube', 'espacio en icloud', 'almacenamiento de icloud', 'plan de icloud', 'plan de google one'],
  misc_repairs: [
'reparación de mi celular', 'reparación de mi laptop', 'reparación de mi compu', 'reparación de mi tele', 'arreglar mi celular', 'arreglar el celular', 'arreglar celular', 'reparar mi celular', 'reparar celular', 'reparación de celular', 'arreglar la pantalla', 'mandé a arreglar', 'mandé a reparar',     'reparación de celular', 'reparación de laptop', 'reparación de computadora', 'reparación de tele', 'reparación de pantalla', 'reparación de aparatos',
    'arreglo de celular', 'arreglo de la tele', 'arreglo de laptop', 'arreglo de computadora', 'arreglo de la compu', 'soporte técnico', 'cambio de batería',
    'formateo de laptop', 'servicio técnico de la laptop', 'arreglé mi celular', 'arreglé la laptop', 'reparación del celular',
  ],
  misc_second_hand: ['de segunda mano', 'usado', 'garage sale', 'marketplace', 'mercado de pulgas', 'tianguis de pulgas', 'tianguis de usados', 'algo de segunda mano'],

  // ---------- Alojamiento y servicios ----------
  house_rent: ['rentas', 'renta del depa', 'renta del departamento', 'renta del cuarto', 'renta de la casa', 'renta del mes', 'pago de renta', 'pago del departamento', 'pago de la renta', 'cuota de renta', 'renta del local'],
  house_mortgage: ['pago de la hipoteca', 'mensualidad de la hipoteca', 'cofinavit', 'crédito infonavit', 'crédito de vivienda', 'abono a la hipoteca', 'pago del infonavit', 'mensualidad del infonavit'],
  house_insurance: ['seguro del hogar', 'póliza del hogar', 'seguro de vivienda', 'seguro contra sismos', 'seguro de departamento', 'seguro de la casa'],
  house_phone: [
'saldo a mi celular', 'saldo al celular', 'saldo en mi celular', 'saldo del celular', 'saldo para el celular', 'saldo celular',     'telefono', 'unefon', 'bait', 'virgin mobile', 'weex', 'pillofon', 'recarga', 'recarga de saldo', 'recarga telcel', 'recarga de celular', 'saldo',
    'plan de celular', 'plan de datos', 'datos móviles', 'megas', 'paquete de datos', 'línea telefónica', 'recibo del celular', 'recibo del teléfono', 'telefonía',
    'pago del plan', 'renta del celular', 'tiempo aire',
  ],
  house_internet: [
    'wi-fi', 'axtel', 'tv de paga', 'televisión por cable', 'sky', 'dish', 'paquete de internet', 'recibo del internet', 'recibo de internet', 'fibra óptica',
    'módem', 'internet del depa', 'internet de la casa', 'pago del internet', 'cable',
  ],
  house_electricity: ['recibo de la luz', 'pago de luz', 'pago de la luz', 'energía eléctrica', 'consumo eléctrico', 'luz del depa', 'cuenta de luz', 'recibo de electricidad', 'la luz'],
  house_water: ['recibo de agua', 'pago del agua', 'pago de agua', 'cuenta del agua', 'agua potable', 'pipa de agua', 'recibo del agua', 'el agua'],
  house_gas: ['recarga de gas', 'gas estacionario', 'tanque estacionario', 'llenado del tanque estacionario', 'gas de la casa', 'gas de la estufa', 'gas del boiler', 'gas del calentador', 'cilindro', 'pipa de gas', 'gas para el boiler', 'gas del depa'],
  house_maintenance: [
'señora que me ayuda', 'señora de la limpieza', 'señora del aseo', 'ayuda con la limpieza', 'la que me ayuda con la limpieza', 'empleada doméstica', 'muchacha del aseo',     'mantenimiento de la casa', 'pintor', 'albañil', 'herrero', 'carpintero', 'pintura', 'pintura para la casa', 'impermeabilizante', 'impermeabilizar',
    'reparación del baño', 'arreglo del baño', 'arreglo de la casa', 'reparación de la casa', 'goteras', 'fuga de agua', 'tinaco', 'jardinero', 'fumigación',
    'limpieza de la casa', 'señora de la limpieza', 'empleada doméstica', 'trabajadora del hogar', 'ferretería', 'materiales de construcción', 'cemento', 'herramienta',
    'focos', 'depósito de garantía', 'depósito de renta', 'depósito del departamento', 'obra', 'remodelación', 'arreglo de la regadera', 'destape de drenaje',
  ],
  house_condofees: ['cuota de condominio', 'administración del edificio', 'vigilancia del edificio', 'mantenimiento del edificio', 'cuota del edificio', 'cuota del fraccionamiento', 'cuota de la privada', 'mantenimiento de la privada', 'mantenimiento del fraccionamiento', 'cuota vecinal', 'cuota de mantenimiento del edificio'],
  house_furniture: [
    'mueble', 'sillón', 'sofá', 'cama', 'litera', 'buró', 'cómoda', 'librero', 'estante', 'closet', 'ropero', 'mesa', 'mesa de centro', 'silla', 'tapete', 'alfombra',
    'cortinas', 'persianas', 'lámpara', 'espejo', 'cabecera', 'recámara', 'base de cama', 'cobijas', 'sábanas', 'edredón', 'ikea', 'escritorio nuevo', 'comedor nuevo', 'sala nueva',
    'colchón nuevo',
  ],
  house_appliances: [
    'refri', 'secadora', 'horno', 'tostador', 'cafetera', 'batidora', 'procesadora', 'olla de presión', 'olla de cocción lenta', 'arrocera', 'freidora de aire',
    'air fryer', 'aspiradora', 'robot aspirador', 'plancha', 'ventilador', 'aire acondicionado', 'minisplit', 'calentador', 'boiler', 'estufa nueva', 'extractor', 'purificador de aire',
    'humidificador', 'lavavajillas', 'electrodomésticos',
  ],
  house_moving: ['camión de mudanza', 'cajas para la mudanza', 'cajas de mudanza', 'cargadores', 'mudanceros', 'servicio de mudanza', 'flete de mudanza', 'camioneta de mudanza'],
  house_security: ['cámara de seguridad', 'cerradura', 'cerradura nueva', 'chapa nueva', 'portón eléctrico', 'videoportero', 'sistema de alarma', 'monitoreo de alarma', 'guardia de seguridad', 'seguridad privada', 'cerco eléctrico', 'alarma de la casa'],
  house_laundry_service: ['lavar la ropa', 'servicio de lavandería', 'lavandería de autoservicio', 'planchaduría', 'lavado en seco', 'lavar cobijas', 'lavar las cobijas en la lavandería', 'tintorería de saco'],

  // ---------- Comida y bebidas ----------
  food_supermarket: [
    'costco', 'chedraui', 'walmart', 'soriana', 'alsuper', 'sams', "sam's", 'city market', 'la comer', 'heb', 'h-e-b', 'bodega aurrera', 'aurrera', 'superama', 'tortilla', 'tomate', 'cebolla', 'limones', 'limón', 'papas', 'zanahoria',
    'lechuga', 'verdura', 'fruta', 'frutas', 'plátano', 'manzana', 'naranja', 'carne', 'pollo', 'res', 'cerdo', 'pescado', 'jamón', 'salchicha', 'tocino', 'queso',
    'crema', 'leche', 'huevo', 'mantequilla', 'yogurt', 'cereal', 'arroz', 'frijol', 'lentejas', 'sopa', 'aceite', 'azúcar', 'harina', 'refresco', 'refrescos',
    'papel higiénico', 'servilletas', 'suavizante', 'jabón', 'cloro', 'pinol', 'abarrotes', 'tienda de abarrotes', 'tiendita', 'víveres', 'carnicería', 'pollería', 'verdulería',
    'fruta y verdura', 'frutas y verduras', 'carne molida', 'bistec', 'atún', 'mayonesa', 'salsa', 'especias', 'galletas saladas', 'pan de caja',
  ],
  food_restaurant: [
    'restaurant', 'cena', 'cena en restaurante', 'desayuno en el restaurante', 'desayuno', 'almuerzo', 'fonda', 'comida en la fonda', 'cenaduría', 'marisquería', 'mariscos',
    'sushi', 'parrilla', 'chilis', "chili's", 'applebees', 'wings', 'alitas', 'bistró', 'brunch', 'comida con la familia', 'comida con amigos', 'cena con amigos',
    'cena romántica', 'cena con mi pareja', 'comida de trabajo', 'comida de negocios', 'comer fuera', 'salimos a comer', 'salimos a cenar', 'el fogoncito', 'el cardenal',
    'café de olla', 'buffet de restaurante', 'propina', 'cuenta del restaurante',
  ],
  food_coffee: ['cafetería', 'cappuccino', 'americano', 'espresso', 'expreso', 'moka', 'frappé', 'frappuccino', 'chai', 'chai latte', 'matcha', 'cafecito', 'dunkin', 'tim hortons', 'punta del cielo', 'italian coffee', 'cielito querido', 'café de especialidad', 'flat white'],
  food_alcohol: [
'vino', 'vinos', 'compré vino', 'vino para la cena', 'vino tinto', 'vino blanco',     'cervezas', 'michelada', 'cartón de cervezas', 'vino', 'vino tinto', 'vino blanco', 'tequila', 'mezcal', 'whisky', 'whiskey', 'ron', 'vodka', 'ginebra', 'brandy',
    'coñac', 'champagne', 'prosecco', 'sidra', 'pulque', 'licor', 'licores', 'chupe', 'bebidas alcohólicas', 'vinoteca', 'licorería', 'caguamón', 'botella de ron',
    'botella de tequila', 'botella de whisky', 'botella de vino', 'six de cervezas', 'cheves', 'heineken', 'tecate', 'barrilito',
  ],
  food_fastfood: [
    'mcdonalds', "mcdonald's", 'burger king', 'kfc', "carl's jr", 'dominos', "domino's", 'little caesars', 'pizza hut', 'papa johns', 'subway', 'el pollo loco', 'taco bell',
    'taco', 'tacos al pastor', 'tacos de pastor', 'tacos de suadero', 'tacos de canasta', 'tacos de guisado', 'tortas', 'torta', 'hamburguesas', 'hot dog', 'hot dogs',
    'pizza', 'pizzas', 'tamal', 'elote', 'esquites', 'quesadillas', 'quesadilla', 'gorditas', 'sopes', 'tlayudas', 'tostadas', 'flautas', 'enchiladas', 'pozole',
    'menudo', 'birria', 'barbacoa', 'carnitas', 'cochinita', 'nuggets', 'burritos', 'antojitos', 'garnachas', 'taquería', 'tacos al vapor', 'pollo frito', 'papas fritas',
    'hamburguesa', 'comida callejera', 'puesto de tacos', 'tacos de pollo', 'tacos de carnitas', 'tacos de bistec', 'tacos dorados', 'molletes', 'chilaquiles', 'huaraches',
  ],
  food_snacks: [
    'botanas', 'papas', 'sabritas', 'ruffles', 'fritos', 'cacahuates', 'nueces', 'pistaches', 'semillas', 'pepitas', 'chicharrones', 'churritos', 'pringles',
    'barritas', 'barra de cereal', 'frituras', 'chips', 'totopos', 'cheetos', 'takis', 'doritos', 'chamoy', 'cacahuates japoneses', 'palomitas',
  ],
  food_sweets: [
    'helado', 'helados', 'nieve', 'paleta', 'paletas', 'churro', 'churros', 'gomitas', 'chicles', 'chicle', 'caramelos', 'mazapán', 'dulce de leche', 'cajeta',
    'postre', 'postres', 'brownie', 'donas', 'donuts', 'krispy kreme', 'cheesecake', 'golosinas', 'dulcería', 'jamoncillo', 'tamarindo', 'paletería', 'nevería',
    'frappé de helado', 'malteada', 'waffle', 'wafle',
  ],
  food_delivery: ['pedido a domicilio', 'comida a domicilio', 'a domicilio', 'domicilio', 'pedido de comida', 'envío de comida', 'repartidor', 'propina del repartidor', 'cornershop', 'pedí comida', 'pedimos comida', 'uber eats', 'didi food', 'rappi'],
  food_market: ['frutas y verduras', 'fruta y verdura', 'frutas y verduras en el mercado', 'en el mercado', 'mercado', 'mercado sobre ruedas', 'sobre ruedas', 'mercado de la esquina', 'frutas en el mercado', 'mercado municipal', 'central de abasto', 'tianguis orgánico', 'el mercado', 'mercadito', 'mercado de'],
  food_bakery: [
    'bolillo', 'bolillos', 'telera', 'pan de caja', 'pan blanco', 'pan integral', 'cuernito', 'cuernitos', 'croissant', 'baguette', 'pan de muerto', 'rosca de reyes', 'rosca',
    'pastel', 'pasteles', 'pastelería', 'panqué', 'dona', 'conchas', 'concha', 'orejas', 'empanadas', 'panadero', 'bimbo', 'pan dulce', 'pan francés', 'pan recién hecho',
  ],
  food_organic: [
    'orgánica', 'orgánicos', 'orgánicas', 'comida orgánica', 'productos orgánicos', 'proteína en polvo', 'whey', 'dieta keto', 'tienda naturista', 'naturista', 'granola',
    'semillas de chía', 'chía', 'avena', 'miel', 'tofu', 'vegano', 'vegana', 'productos veganos', 'sin gluten', 'comida saludable', 'dieta', 'plan alimenticio',
    'leche de almendra', 'leche de avena', 'verduras orgánicas', 'frutas orgánicas',
  ],
  food_juice_bar: ['licuado', 'licuado de plátano', 'licuado de fresa', 'smoothie', 'smoothies', 'jugo', 'jugos', 'jugo de naranja', 'licuados', 'agua de frutas', 'agua fresca', 'aguas frescas', 'agua de horchata', 'horchata', 'jamaica', 'limonada', 'naranjada', 'jugo verde', 'jugo de zanahoria', 'smoothies', 'juguería', 'agua de jamaica'],
  food_catering: ['taquiza', 'taquiza para la fiesta', 'buffet para el evento', 'buffet de evento', 'servicio de comida para evento', 'banquetera', 'comida para la fiesta', 'barra libre', 'coffee break', 'hora loca', 'banquetes', 'servicio de banquete', 'mesa de postres'],
  food_water_delivery: ['garrafon', 'garrafones', 'agua purificada', 'purificadora', 'rellenar el garrafón', 'agua de garrafón', 'garrafón de agua', 'garrafón a domicilio', 'repartidor de agua', 'ciel', 'epura'],

  // ---------- Entretenimiento ----------
  ent_cinema: ['cinemark', 'entradas al cine', 'boletos de cine', 'boletos del cine', 'boletos de la película', 'palomitas del cine', 'combo de cine', 'combo del cine', 'sala vip', 'función de cine', 'cine 4dx', 'ir al cine', 'película en el cine'],
  ent_concerts: ['entradas al concierto', 'boletos del concierto', 'boletos de concierto', 'boletos para el concierto', 'entradas al festival', 'corona capital', 'vive latino', 'pal norte', 'auditorio nacional', 'foro sol', 'conciertos', 'boletos del festival', 'pase de festival', 'concierto de'],
  ent_hobbies: ['mi hobby', 'hobbies', 'coleccionable', 'coleccionables', 'colección', 'legos', 'lego', 'figuras de colección', 'manga', 'cómics', 'comics', 'material de arte', 'instrumento musical', 'guitarra', 'pesca', 'manualidades', 'tejido', 'costura', 'rompecabezas', 'juegos de mesa', 'cartas magic', 'warhammer', 'modelismo', 'cosas de mi pasatiempo'],
  ent_videogames: ['videojuegos', 'ps5', 'ps4', 'switch', 'juego de ps5', 'juego de switch', 'juego de xbox', 'pavos', 'fortnite', 'v-bucks', 'robux', 'roblox', 'minecraft', 'epic games', 'game pass', 'xbox game pass', 'ps plus', 'playstation plus', 'nintendo online', 'control de ps5', 'consola', 'gamestop', 'dlc', 'pase de batalla', 'juego nuevo'],
  ent_sports: [
    'deporte', 'deportes', 'cancha de fútbol', 'renta de cancha', 'clase de box', 'clase de crossfit', 'crossfit', 'boxeo', 'spinning', 'yoga', 'pilates', 'zumba', 'natación', 'alberca',
    'clase de natación', 'torneo', 'liga de fútbol', 'fútbol', 'básquetbol', 'pádel', 'golf', 'campo de golf', 'mensualidad del gym', 'mensualidad del gimnasio', 'membresía del gimnasio',
    'inscripción al gym', 'sport city', 'sports world', 'anytime fitness', 'entrenador personal', 'personal trainer', 'clase de baile', 'clase de yoga', 'clase de pilates', 'artes marciales',
    'karate', 'judo', 'taekwondo', 'jiu jitsu', 'escalada', 'rocódromo', 'inscripción a la carrera', 'ciclismo',
  ],
  ent_bowling: ['bolos', 'pista de boliche', 'una partida de boliche', 'partida de boliche', 'boliche con amigos', 'zona de boliche'],
  ent_clubs: ['antros', 'discotecas', 'bares', 'el antro', 'el antro con amigos', 'noche de antro', 'club nocturno', 'table dance', 'cervecería', 'cervecería artesanal', 'pulquería', 'mezcalería', 'salir de fiesta', 'reservado', 'mesa en el antro', 'botella en el antro', 'copa en el bar', 'fui a un bar', 'cantina'],
  ent_streaming: [
    'disney plus', 'hbo max', 'prime video', 'amazon prime', 'prime', 'apple tv', 'apple music', 'tidal', 'deezer', 'youtube music', 'paramount+', 'paramount plus', 'star+', 'star plus',
    'claro video', 'vix', 'crunchyroll', 'twitch', 'mubi', 'blim', 'hulu', 'peacock', 'audible', 'plataforma de streaming', 'suscripción de netflix', 'suscripción de spotify',
    'spotify premium', 'spotify familiar', 'netflix premium', 'youtube premium',
  ],
  ent_subscriptions: ['suscripciones', 'membresías', 'suscripción mensual', 'suscripción anual', 'membresía anual', 'membresía mensual', 'cuota mensual', 'patreon'],
  ent_events: [
    'eventos', 'partido', 'partido de fútbol', 'entradas al estadio', 'boletos del partido', 'boletos para el partido', 'obra de teatro', 'exposición', 'exposiciones', 'expo', 'feria del libro', 'lucha libre',
    'corrida de toros', 'ópera', 'ballet', 'stand up', 'stand-up', 'show de comedia', 'espectáculo', 'entradas al museo', 'boletos del museo', 'zoológico', 'acuario', 'planetario',
    'jardín botánico', 'zona arqueológica', 'boletos del teatro', 'cirque du soleil', 'circo', 'buffet para el evento',
  ],
  ent_karaoke: ['noche de karaoke', 'karaoke con amigos', 'karaoke bar', 'bar de karaoke'],
  ent_amusement: ['parque de diversiones', 'ferias', 'la feria', 'la feria del pueblo', 'entradas a la feria', 'parque acuático', 'parque temático', 'juegos mecánicos', 'montaña rusa', 'kidzania', 'selva mágica', 'reino animal', 'xcaret', 'xel-ha', 'aquopolis', 'six flags méxico'],
  ent_escape_room: ['cuarto de escape con amigos', 'escape rooms', 'sala de escape', 'juego de escape'],
  ent_arcade: ['arcadas', 'fichas de arcada', 'fichas', 'realidad virtual', 'juegos de maquinitas', 'game zone', 'hora de maquinitas', 'vr arena'],
  ent_billiards: ['mesa de billar', 'renta de mesa de billar', 'mesa de pool', 'salón de billar', 'billares', 'hora de billar', 'dardos'],
  ent_photography: ['fotógrafo', 'sesión de fotos', 'sesión de fotografía', 'photo booth', 'sesión fotográfica', 'cabina de fotos', 'recuerditos', 'photobooth'],

  // ---------- Estilo de vida ----------
  life_gifts: [
    'regalos', 'regalo de cumpleaños', 'regalo de navidad', 'regalo de aniversario', 'regalo para mi novia', 'regalo para mi novio', 'regalo para mi mamá', 'regalo para mi papá', 'un regalo',
    'regalito', 'intercambio navideño', 'secret santa', 'amigo secreto', 'un detallito', 'ramo de flores', 'arreglo floral', 'tarjeta de regalo', 'gift card', 'regalo de graduación',
    'regalo del día de las madres', 'regalo del día del padre', 'regalo de san valentín', 'flores',
  ],
  life_pets: [
    'mascotas', 'perros', 'gatos', 'veterinaria', 'arena para gato', 'arena para el gato', 'comida del perro', 'comida para perro', 'comida de gato', 'comida del gato', 'alimento para perro',
    'correa', 'juguete para perro', 'juguete para el perro', 'vacunas del perro', 'vacuna del perro', 'peluquería canina', 'estética canina', 'estética para perros', 'baño del perro', 'guardería canina',
    'paseador de perros', 'hotel para mascotas', 'hamster', 'cachorro', 'petco', 'petsmart', 'pet shop', 'tienda de mascotas', 'antipulgas', 'desparasitante', 'croquetas para perro',
  ],
  life_donations: ['cruz roja', 'teletón', 'caridad', 'donación a la cruz roja', 'limosna', 'diezmo', 'ofrenda', 'donar', 'donaciones', 'aportación voluntaria', 'fundación', 'donativo a'],
  life_travel: [
    'viajes', 'hoteles', 'hostal', 'hostel', 'hospedaje', 'hospedaje en la playa', 'reservación de hotel', 'reserva de hotel', 'booking', 'expedia', 'despegar', 'paquete de viaje',
    'viaje de vacaciones', 'cabaña', 'renta de cabaña', 'casa de campo', 'resort', 'todo incluido', 'hotel todo incluido', 'pasaporte', 'seguro de viaje', 'maleta', 'equipaje',
    'boletos de viaje', 'agencia de viajes', 'crucero', 'cruceros',
  ],
  life_experiences: [
    'experiencia', 'experiencias', 'tours', 'escapada', 'escapada de fin de semana', 'paseo en globo', 'tour gastronómico', 'cata', 'cata de vino', 'experiencia gastronómica', 'paracaídas',
    'bungee', 'rafting', 'senderismo', 'campamento', 'glamping', 'buceo', 'snorkel', 'safari', 'excursión', 'excursiones', 'visita guiada', 'tirolesa', 'clase de cocina', 'taller de cerámica',
  ],
  life_family_support: [
'a mis papás', 'a mi mamá', 'a mi papá', 'a mis padres', 'a mi madre', 'a mi padre', 'a mi abuela', 'a mi abuelo', 'a mis abuelos', 'a mi hermano', 'a mi hermana', 'a mis hijos', 'a mi familia',     'le di a mi hermano', 'le di a mi hermana', 'le di a mi abuela', 'le mandé a mi mamá', 'le mandé dinero a mi mamá', 'le mandé dinero a mi papá', 'dinero para mis papás', 'gasto de mis papás',
    'apoyo a mi mamá', 'apoyo a mis papás', 'mesada a mi hijo', 'pensión alimenticia', 'manutención', 'pensión para mis hijos', 'gastos de mis papás', 'le ayudé a mi mamá', 'ayuda a mi familia',
    'remesa', 'remesas', 'ayuda para mi familia', 'dinero para la casa de mis papás',
  ],
  life_community: ['cooperación', 'cooperación para la limpieza de la colonia', 'cooperación vecinal', 'faena', 'faena vecinal', 'trabajo comunitario', 'comité vecinal', 'mayordomía', 'fiesta patronal', 'cooperación de la fiesta del pueblo', 'causa comunitaria'],
  life_celebration: [
    'celebraciones', 'posadas', 'aniversario', 'fiesta de aniversario', 'cena de navidad', 'cena de año nuevo', 'cena de fin de año', 'comida de navidad', 'comida del día de las madres',
    'comida del día del padre', 'festejo', 'festejos', 'piñata', 'piñatas', 'fiesta de cumpleaños', 'fiesta infantil', 'pastel de cumpleaños', 'globos', 'decoración de fiesta', 'fiesta sorpresa',
    'reunión familiar', 'comida familiar', 'día de muertos', 'reyes magos', 'nochebuena', 'cena navideña', 'navidad', 'año nuevo',
  ],
  life_self_improvement: ['coach', 'coach de vida', 'taller de autoestima', 'curso de oratoria', 'mentoría', 'mentor', 'constelaciones familiares', 'tarot', 'astrología', 'retiro', 'conferencia', 'meditación', 'taller de meditación', 'seminario de desarrollo personal'],
  life_social_clubs: ['membresía del club', 'cuota del club', 'cuota de club', 'club de golf', 'cuota del club de golf', 'club deportivo', 'club de leones', 'club rotario', 'club de playa', 'club hípico', 'club de yates', 'club alemán', 'club de industriales', 'casino español'],
  life_wedding: [
    'bodas', 'despedida', 'quince años', 'xv', 'traje de novio', 'anillos de boda', 'salón de bodas', 'wedding planner', 'luna de miel', 'boda civil', 'ceremonia religiosa',
    'invitaciones de boda', 'mesa de regalos', 'bautizo', 'primera comunión', 'comunión', 'graduación', 'fiesta de graduación', 'revelación de género', 'gender reveal', 'regalo de boda', 'vestido de novia',
  ],

  // ---------- Salud ----------
  health_doctor: ['doctora', 'consulta médica', 'consulta con el doctor', 'consulta con el médico', 'consulta con el médico general', 'médico general', 'urgencias', 'sala de urgencias', 'hospital', 'clínica', 'cita médica', 'cita con el doctor', 'chequeo', 'chequeo médico', 'check up', 'revisión médica', 'honorarios médicos', 'consulta de especialidad', 'enfermera', 'curación'],
  health_pharmacy: [
    'farmacias similares', 'similares', 'farmacia guadalajara', 'benavides', 'farmacia san pablo', 'pastilla', 'jarabe', 'paracetamol', 'ibuprofeno', 'aspirina', 'antibiótico', 'antibióticos', 'antiinflamatorio',
    'analgésico', 'receta', 'recetas', 'inyecciones', 'inyección', 'gotas', 'pomada', 'curitas', 'gasas', 'termómetro', 'vendas', 'cubrebocas', 'anticonceptivos', 'pastillas anticonceptivas',
    'omeprazol', 'loratadina', 'suero', 'medicamento', 'medicamentos', 'medicina para la gripa', 'medicina de la tos',
  ],
  health_dentist: ['dental', 'odontólogo', 'odontología', 'muela', 'extracción de muela', 'corona dental', 'resina', 'blanqueamiento', 'blanqueamiento dental', 'carillas', 'invisalign', 'retenedor', 'ortodoncia', 'prótesis dental', 'implante dental', 'revisión dental', 'consulta con el dentista', 'limpieza dental'],
  health_mental: ['psicóloga', 'sesión psicológica', 'sesión con la psicóloga', 'sesión con el psicólogo', 'terapia de pareja', 'terapia psicológica', 'terapia familiar', 'terapia de lenguaje', 'consulta psicológica', 'salud mental', 'psicoterapia', 'psicoanalista', 'analista', 'terapia online', 'terapia semanal', 'sesión de terapia'],
  health_hygiene: ['toallas sanitarias', 'pañales', 'pañales para bebé', 'toallitas húmedas', 'pasta dental', 'cepillo de dientes', 'hilo dental', 'enjuague bucal', 'rastrillos', 'jabón íntimo', 'protectores diarios', 'test de embarazo', 'prueba de embarazo', 'lubricante', 'anticonceptivo', 'tampón'],
  health_insurance: ['seguro de salud', 'seguro de gastos médicos mayores', 'gastos médicos mayores', 'gmm', 'seguro dental', 'seguro de vida', 'póliza de vida', 'imss voluntario', 'cuota imss', 'pago del seguro de gastos médicos mayores'],
  health_vision: ['lentes graduados', 'examen de la vista', 'examen visual', 'micas', 'líquido para lentes', 'cirugía láser', 'lasik', 'armazón', 'gafas', 'devlyn', 'lentes nuevos', 'cambio de lentes', 'lentes de contacto'],
  health_supplements: ['vitamina d', 'vitamina c', 'multivitamínico', 'multivitamínicos', 'creatina', 'probióticos', 'melatonina', 'zinc', 'hierro', 'calcio', 'b12', 'vitamina b12', 'complemento alimenticio', 'complementos alimenticios', 'gnc', 'herbalife', 'suplemento', 'vitamina'],
  health_specialists: [
    'endocrinólogo', 'gastroenterólogo', 'neurólogo', 'urólogo', 'otorrinolaringólogo', 'otorrino', 'alergólogo', 'reumatólogo', 'oncólogo', 'neumólogo', 'nefrólogo', 'quiropráctico', 'osteópata',
    'terapia física', 'fisioterapia', 'rehabilitación', 'nutrióloga', 'dermatóloga', 'ginecóloga', 'especialista', 'consulta con especialista', 'cirujano', 'cirugía', 'médico especialista',
    'acupunturista', 'homeópata', 'dermatología', 'oftalmología', 'cardiólogo', 'ginecólogo', 'traumatólogo', 'podólogo',
  ],
  health_labs: [
    'análisis de sangre', 'examen de sangre', 'electrocardiograma', 'ecocardiograma', 'mastografía', 'papanicolau', 'papanicolaou', 'biometría hemática', 'química sanguínea', 'examen de orina',
    'análisis de orina', 'prueba covid', 'prueba de covid', 'pcr', 'laboratorio clínico', 'estudios de laboratorio', 'chopo', 'radiografía', 'radiografías', 'endoscopía', 'colonoscopía',
    'densitometría', 'estudio de sangre', 'pruebas de laboratorio', 'perfil de lípidos', 'examen médico', 'rayos x', 'ultrasonidos',
  ],

  // ---------- Ahorros ----------
  sav_education_fund: ['para estudios', 'para la universidad', 'para la escuela', 'para la carrera', 'para mi maestría', 'para la colegiatura'],

  // ---------- Ingresos ----------
  inc_salary: ['depósito de nómina', 'pago quincenal', 'pago de nómina', 'mi sueldo', 'mi pago', 'pago semanal', 'raya', 'la raya', 'pago de la quincena', 'mi quincena', 'sueldo base', 'mi nómina'],
  inc_allowance: ['mi mesada', 'la mesada', 'semanada', 'dinero de mis papás'],
  inc_bonus: ['bonos', 'ptu', 'reparto de utilidades', 'bono de productividad', 'bono por desempeño', 'bono anual', 'prima vacacional', 'caja de ahorro', 'comisión', 'comisiones', 'gratificación', 'compensación', 'finiquito', 'liquidación', 'bono navideño'],
  inc_investments: ['rendimiento de inversión', 'ganancia de mis inversiones', 'ganancias de inversión', 'ganancia de capital', 'ganancias en bolsa', 'rendimiento de cetes', 'rendimientos de cetes', 'rendimiento'],
  inc_dividends: ['dividendos', 'dividendos de mis acciones', 'pago de dividendos', 'dividendo trimestral'],
  inc_interest: ['intereses', 'interés del banco', 'intereses del banco', 'intereses de la cuenta', 'intereses ganados', 'interés ganado', 'rendimiento de la cuenta', 'rendimientos de nu'],
  inc_freelance: ['chambas', 'chamba extra', 'chambita', 'chambita extra', 'trabajo freelance', 'un proyecto', 'pago de un proyecto', 'trabajo extra', 'honorarios', 'asesoría', 'pago de cliente', 'pago de un cliente', 'servicio profesional', 'trabajo independiente', 'trabajito', 'un trabajo freelance'],
  inc_gifts: ['dinero de regalo', 'me regalaron dinero', 'regalo en efectivo', 'me dieron dinero', 'me dieron de regalo', 'dinero de cumpleaños', 'me regalaron', 'regalaron'],
  inc_sales: ['ventas', 'vendi', 'vendimos', 'vendí mi bici', 'vendí un celular', 'vendí ropa usada', 'vendí mi coche', 'venta de usados', 'venta en marketplace', 'ventas del día', 'ingresos por ventas', 'vendí'],
  inc_other: ['ingresos', 'otros ingresos', 'entrada de dinero', 'devolución', 'reembolso', 'reembolsos', 'devolución de impuestos', 'devolución del sat', 'cashback', 'premio', 'premio de lotería', 'sorteo', 'herencia', 'indemnización'],

  // ---------- Transporte ----------
  trans_uber: ['un uber', 'uber al trabajo', 'uber a casa', 'uber xl', 'uber black', 'uber pool', 'uber moto', 'viaje en uber', 'uber a la oficina', 'uber al aeropuerto', 'uber de regreso'],
  trans_didi: ['un didi', 'didi a la oficina', 'viaje en didi', 'didi moto', 'didi al aeropuerto'],
  trans_taxi: ['taxis', 'in driver', 'un taxi', 'taxi al aeropuerto', 'taxi de sitio', 'sitio de taxis', 'radio taxi', 'bolt', 'viaje en taxi', 'viaje en cabify'],
  trans_public: [
    'camion', 'metrobus', 'tarjeta del metro', 'tarjeta de movilidad', 'recarga de la tarjeta de movilidad', 'recarga del metro', 'recarga de metro', 'recarga de tarjeta', 'pasaje', 'pasajes',
    'boleto del metro', 'boletos del metro', 'cablebús', 'tren ligero', 'trolebús', 'tren suburbano', 'suburbano', 'mexibús', 'tren interurbano', 'tren maya', 'autobús', 'ado', 'boleto de autobús',
    'boletos de autobús', 'central de autobuses', 'flecha amarilla', 'estrella blanca', 'primera plus', 'etn', 'metrorrey', 'siteur', 'macrobús', 'tarjeta de transporte', 'pasaje del camión',
    'pasaje del metro', 'pasaje en camión', 'transporte público',
  ],
  trans_gas: ['gasolina premium', 'gasolina magna', 'pemex', 'shell', 'combustible', 'cargué gasolina', 'llené el tanque', 'llenar el tanque', 'gas del coche', 'carga de gasolina', 'lleno de gasolina', 'tanque lleno', 'g500', 'oxxo gas'],
  trans_flights: [
    'vuelos', 'avion', 'aeromexico', 'viva aerobus', 'boletos de avión', 'boleto de avión', 'vuelo a cancún', 'vuelo redondo', 'boletos de avion', 'interjet', 'magnicharters', 'american airlines',
    'united airlines', 'delta', 'copa airlines', 'avianca', 'jetblue', 'southwest', 'latam', 'iberia', 'air france', 'klm', 'lufthansa', 'maleta documentada', 'equipaje documentado', 'tarifa aeroportuaria',
    'vuelo a monterrey', 'vuelo a guadalajara', 'vuelo a tijuana', 'vuelo a la ciudad de méxico',
  ],
  trans_carrental: ['renta de carro', 'avis', 'europcar', 'sixt', 'renta de camioneta', 'renta de van', 'auto rentado', 'carro rentado', 'rentamos un carro', 'renta de vehículo', 'arrendadora', 'renta de coche', 'renta de auto', 'hertz'],
  trans_parking: ['estacionamientos', 'parquímetros', 'valet', 'parking', 'estacionamiento del centro comercial', 'pensión del estacionamiento', 'pensión de auto', 'ecoparq', 'boleto de estacionamiento', 'estacionamiento del aeropuerto', 'lugar de estacionamiento', 'pensión del coche'],
  trans_tolls: ['casetas', 'casetas a cuernavaca', 'caseta de cobro', 'autopista', 'cuota de autopista', 'capufe', 'telepeaje', 'tag de telepeaje', 'recarga del tag', 'recarga de tag', 'pago de caseta', 'pago de peaje', 'casetas de la autopista', 'tag iave'],
  trans_maintenance: [
'servicio de mi coche', 'servicio de mi carro', 'servicio del coche', 'servicio del carro', 'servicio de mi moto', 'servicio de mi camioneta',     'mantenimiento del carro', 'mantenimiento del coche', 'mecanico', 'refacciones', 'llanta', 'llantas', 'llanta nueva', 'afinación', 'frenos', 'pastillas de freno', 'balatas', 'batería del coche',
    'batería del carro', 'amortiguadores', 'suspensión', 'clutch', 'embrague', 'alineación', 'balanceo', 'alineación y balanceo', 'lavado de coche', 'lavado de carro', 'autolavado', 'car wash',
    'verificación', 'verificación vehicular', 'tenencia', 'refrendo', 'multa', 'multas', 'grúa', 'servicio del coche', 'servicio del carro', 'servicio del auto', 'revisión del coche', 'anticongelante',
    'limpiaparabrisas', 'radiador', 'cambio de llanta', 'vulcanizadora', 'cambio de aceite', 'aceite del coche',
  ],
  trans_school: ['ruta escolar', 'ruta de la escuela', 'la ruta de la escuela', 'transporte de los niños', 'transporte de los niños a la escuela', 'camioneta de la escuela', 'transporte del colegio', 'autobús escolar', 'transporte escolar', 'camión escolar'],
  trans_microbus: ['micros', 'microbus', 'peseros', 'colectivo', 'colectivos', 'taxi colectivo', 'transporte colectivo', 'el micro', 'la micro'],
  trans_combi: ['combis', 'la combi', 'combi a la escuela', 'combi al trabajo', 'pasaje de la combi', 'combi del pueblo'],
  trans_bikeshare: ['renta de scooter', 'renta de bici', 'bici compartida', 'mobike', 'patineta eléctrica', 'monopatín', 'bicicleta compartida', 'mibici', 'membresía ecobici', 'scooters', 'ecobici'],
  trans_mototaxi: ['mototaxis', 'un mototaxi', 'bicitaxi', 'tuk tuk', 'moto-taxi', 'taxi moto', 'moto taxi', 'motoratón'],
  trans_ferry: ['boleto del ferry', 'ferry a cozumel', 'ferry a isla mujeres', 'ferry a holbox', 'lancha a isla mujeres', 'barco', 'boleto de barco', 'balsa', 'boleto de lancha', 'lancha a holbox'],
  trans_car_insurance: [
    'seguro de coche', 'seguro de carro', 'seguro del coche', 'póliza del carro', 'póliza del coche', 'gnp', 'qualitas auto', 'axa auto', 'chubb', 'hdi', 'mapfre', 'seguro vehicular',
    'seguro del vehículo', 'seguro de la camioneta', 'seguro de moto', 'seguro obligatorio', 'cobertura amplia', 'renovación del seguro del coche', 'seguro de auto', 'seguro del carro',
  ],
  trans_bike: ['bici', 'una bici', 'bicicleta', 'una bicicleta', 'compré una bici', 'bicicletas', 'refacciones de la bici', 'luces para la bici', 'cámara para la bici', 'llanta de bici', 'cadena de bici', 'mantenimiento de bici', 'mantenimiento de la bicicleta', 'bici nueva', 'mi bici', 'accesorios de bici', 'bicicletería', 'pedales', 'cámara de bici', 'refacciones de bici'],

  // ---------- Deudas ----------
  debt_creditcard: [
    'pago de la tarjeta', 'pago de tarjeta', 'pago de mi tarjeta', 'abono a la tarjeta', 'abono a la tarjeta de crédito', 'pago de tarjeta de crédito', 'liquidé la tarjeta', 'tarjeta bbva', 'tarjeta banamex',
    'tarjeta santander', 'tarjeta nu', 'tarjeta hsbc', 'tarjeta banorte', 'tarjeta citibanamex', 'tarjeta liverpool', 'tarjeta departamental', 'corte de la tarjeta', 'tdc', 'estado de cuenta',
    'pago del estado de cuenta', 'amex', 'american express', 'pago de la tdc',
  ],
  debt_student: ['crédito estudiantil', 'préstamo universitario', 'crédito universitario', 'educafin', 'préstamo para estudios', 'abono al crédito educativo', 'abono del crédito educativo', 'pago del préstamo de la universidad', 'crédito educativo', 'préstamo estudiantil'],
  debt_personal: [
    'tandas', 'abono del préstamo', 'abono al préstamo', 'pago del préstamo', 'préstamo', 'préstamos', 'le debo', 'pagué lo que debía', 'pago a mi amigo', 'deuda con un amigo', 'préstamo de un amigo',
    'le pagué lo que le debía', 'mi deuda', 'abono a mi deuda', 'kueski', 'aplazo', 'crédito personal', 'préstamo bancario', 'crédito bancario', 'préstamo familiar', 'pago de mi tanda', 'préstamo personal', 'prestamista',
  ],
  debt_mortgage: ['abono a la hipoteca deuda', 'pago extra a la hipoteca', 'liquidación de hipoteca', 'saldo hipotecario', 'hipoteca deuda'],
  debt_car_loan: [
    'crédito del auto', 'crédito del coche', 'crédito del carro', 'mensualidad del carro', 'mensualidad del auto', 'mensualidad del coche', 'pago del crédito del coche', 'pago del crédito del auto',
    'abono del auto', 'abono del carro', 'abono del coche', 'financiamiento del auto', 'financiamiento del coche', 'financiera del auto', 'crédito de la camioneta', 'mensualidad de la camioneta',
    'abono de la camioneta', 'pago del coche', 'pago del carro', 'pago del auto', 'crédito auto', 'crédito automotriz',
  ],
  debt_appliance: [
'tarjeta de coppel', 'tarjeta de elektra', 'tarjeta de liverpool', 'tarjeta de famsa', 'tarjeta coppel', 'tarjeta elektra',     'meses sin intereses', 'msi', 'pago de coppel', 'abono a elektra', 'abono a coppel', 'crédito coppel', 'crédito elektra', 'crédito de electrodomésticos', 'crédito de la tele', 'abono de la tele',
    'abono de la lavadora', 'abono del refri', 'mensualidad de la sala', 'mensualidad de los muebles', 'abono de muebles', 'crédito de la sala', 'crédito de la lavadora', 'abonos de coppel', 'italika',
    'crédito en tienda', 'crédito de la tienda', 'famsa', 'crédito famsa', 'abono famsa', 'a meses sin intereses', 'crédito de muebles',
  ],
  debt_payday_loan: [
    'casa de empeño', 'desempeño', 'desempeñar', 'empeñé', 'préstamo exprés', 'préstamo express', 'préstamo rápido', 'crédito express', 'microcrédito', 'dinero rápido', 'mi préstamo de nómina',
    'adelanto de nómina', 'adelanto de sueldo', 'monte de piedad', 'crédito rápido', 'préstamo de nómina', 'prestaentresemana', 'empeño',
  ],
  debt_medical: ['plan de pagos hospital', 'cuenta del hospital', 'abono al hospital', 'pago del hospital', 'abono de la cirugía', 'pago de la cirugía', 'pagos del hospital', 'crédito médico', 'deuda del hospital', 'factura del hospital', 'deuda médica', 'financiamiento médico', 'plan de pagos del hospital', 'pago de la cuenta del hospital'],

  // ---------- Inversiones ----------
  inv_stocks: [
    'casa de bolsa', 'bmv', 'bolsa mexicana', 'acciones de apple', 'apple', 'tesla', 'microsoft', 'nvidia', 'alphabet', 'walmex', 'femsa', 'cemex', 'bursátil', 'trading', 'robinhood',
    'interactive brokers', 'etoro', 'actinver', 'bursanet', 'sic', 'sistema internacional de cotizaciones', 'acciones de tesla', 'acciones de amazon', 'acciones de google', 'acciones de meta',
  ],
  inv_etfs: ['etfs', 'spy', 'vti', 'vwo', 'iwm', 'naftrac', 'vanguard', 'ishares', 's&p 500', 'sp500', 'nasdaq', 'fondo cotizado', 'fondos cotizados'],
  inv_fibras: ['fibras', 'fibra uno', 'fibra danhos', 'danhos', 'fibra mty', 'fibra monterrey', 'fibra shop', 'fibra hotel', 'fibra inn', 'fibra storage', 'fibra educa', 'fibra nova', 'fibras inmobiliarias'],
  inv_cetes: ['bondes', 'bondes d', 'bonos m', 'bono m', 'bonos tasa fija', 'tesorería', 'certificados de la tesorería', 'cetes a 28 días', 'cetes a 91 días', 'cetes 28', 'cetes 91', 'cetes 182', 'cetes 364', 'tasa cetes', 'cetes directo', 'bonos udi', 'udibono'],
  inv_bonds: ['bonos del gobierno', 'bonos corporativos', 'bono corporativo', 'obligaciones', 'obligaciones corporativas', 'bonos soberanos', 'bonos del tesoro', 't-bills', 'treasuries', 'bonos americanos', 'deuda corporativa', 'papel comercial', 'pagarés bancarios'],
  inv_funds: ['fondos de inversión', 'fondos indexados', 'fondo mutuo', 'fondos mutuos', 'fondo de deuda', 'fondo de renta variable', 'sociedad de inversión', 'sociedades de inversión', 'fondo gbm', 'fondo actinver', 'siefore', 'money market', 'mercado de dinero', 'fondos', 'fondo'],
  inv_crypto: [
    'criptos', 'criptomoneda', 'btc', 'eth', 'ether', 'solana', 'cardano', 'dogecoin', 'doge', 'xrp', 'ripple', 'litecoin', 'usdt', 'tether', 'usdc', 'stablecoin', 'stablecoins', 'coinbase', 'kraken',
    'bybit', 'okx', 'metamask', 'nft', 'nfts', 'altcoins', 'altcoin', 'polygon', 'bnb', 'avalanche', 'chainlink', 'shiba',
  ],
  inv_other: ['inversion', 'inversiones', 'aportación voluntaria', 'aportación voluntaria afore', 'plan personal de retiro', 'plan de retiro', 'seguro de ahorro', 'oro', 'plata', 'monedas de oro', 'centenarios', 'onzas de oro', 'onza', 'metales preciosos', 'obra de arte', 'invertí en un negocio', 'capital semilla', 'startup', 'crowdfunding'],
  inv_real_estate: ['terreno', 'preventa', 'preventa de departamento', 'departamento en preventa', 'lote', 'lotes', 'inmueble', 'inmuebles', 'bienes raíces', 'casa para renta', 'propiedad', 'propiedades', 'fideicomiso inmobiliario', 'tokenización'],
  inv_p2p_lending: ['prestadero', 'kubo financiero', 'kubo', 'afluenta', 'cuenta p2p', 'mutuo', 'préstamos p2p', 'inversión p2p', 'p2p'],

  // ---------- Educación ----------
  edu_tuition: [
    'colegiaturas', 'reinscripción', 'la colegiatura de la universidad', 'inscripción de la prepa', 'cuota de la facultad', 'cuota de inscripción', 'mensualidad de la escuela', 'mensualidad del colegio',
    'mensualidad de la universidad', 'pago de la escuela', 'pago de la universidad', 'pago del colegio', 'colegio', 'escuela', 'universidad', 'prepa', 'preparatoria', 'secundaria', 'primaria', 'kínder', 'kinder',
    'guardería', 'estancia infantil', 'tec de monterrey', 'ibero', 'uvm', 'anáhuac', 'ipn', 'uam', 'itam', 'udg', 'buap', 'semestre', 'cuatrimestre', 'matrícula', 'cuota escolar', 'cuota de la escuela',
    'titulación', 'trámite de titulación', 'examen de admisión', 'examen de ingreso', 'comipems', 'propedéutico', 'posgrado', 'maestría', 'doctorado',
  ],
  edu_supplies: [
    'impresión', 'útiles escolares', 'útiles', 'cuaderno', 'cuadernos', 'mochila', 'mochila para la escuela', 'lápices', 'plumas', 'pluma', 'bolígrafos', 'colores', 'crayolas', 'tijeras', 'pegamento',
    'resistol', 'calculadora', 'juego de geometría', 'folders', 'carpetas', 'hojas blancas', 'cartulinas', 'cartulina', 'marcadores', 'uniforme escolar', 'uniformes', 'libro', 'libros de texto',
    'libro de texto', 'antología', 'fotocopias', 'fotocopia', 'impresiones a color', 'tinta', 'cartucho', 'tóner', 'material escolar', 'lista de útiles', 'papelería escolar', 'lonchera', 'diccionario',
  ],
  edu_courses: [
    'cursos', 'examen de certificación', 'certificaciones', 'curso de inglés', 'curso de excel', 'certificación de excel', 'duolingo', 'duolingo plus', 'linkedin learning', 'skillshare', 'masterclass',
    'domestika', 'crehana', 'edx', 'datacamp', 'codecademy', 'bootcamp', 'curso en línea', 'curso online', 'clase en línea', 'toefl', 'ielts', 'examen de inglés', 'clases de inglés', 'clase de inglés',
    'curso de idiomas', 'curso de programación', 'curso de python', 'capacitación', 'capacitaciones', 'webinar', 'congreso', 'pmp',
  ],
  edu_tutoring: ['clase particular', 'tutora', 'tutores', 'asesorías', 'asesoría', 'clase de matemáticas', 'clases de matemáticas', 'profesor particular', 'maestro particular', 'maestra particular', 'clases de regularización', 'clases de refuerzo', 'refuerzo escolar', 'asesoría de tesis', 'clases particulares', 'regularización', 'tutor', 'asesoría escolar'],
};

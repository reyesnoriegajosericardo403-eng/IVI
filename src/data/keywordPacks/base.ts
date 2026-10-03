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
export const PACK_BASE: Record<string, string[]> = {
  misc_clothing: [
    'jeans', 'mezclilla', 'pantalones', 'shorts', 'bermuda', 'falda', 'blusa', 'camisa', 'camiseta', 'sudadera',
    'hoodie', 'suéter', 'abrigo', 'gabardina', 'chaqueta', 'chaleco', 'bufanda', 'guantes', 'gorra', 'sombrero',
    'cinturón', 'corbata', 'traje', 'calcetines', 'calcetas', 'boxers', 'calzones', 'brasier', 'pijama', 'bikini',
    'zapatillas', 'botas', 'botines', 'sandalias', 'converse', 'nike', 'adidas', 'puma', 'vans', 'bershka',
    'pull&bear', 'forever 21', 'leggins', 'bolso', 'reloj', 'joyería', 'anillo', 'collar', 'aretes', 'pulsera',
    'outfit', 'blazer', 'lentes de sol',
  ],
  misc_wellness: [
    'masajes', 'reiki', 'acupuntura', 'sauna', 'jacuzzi', 'baño de vapor', 'aromaterapia',
  ],
  misc_personal_care: [
    'me corté el pelo', 'corte de cabello', 'cortarme el cabello', 'corté el cabello', 'peluquería', 'barbero',
    'mechas', 'balayage', 'alaciado', 'keratina', 'peinado', 'manicure', 'pedicure', 'uñas acrílicas', 'uñas de gel',
    'arreglo de uñas', 'depilación', 'cera', 'rímel', 'labial', 'colonia', 'sérum', 'protector solar',
    'acondicionador', 'pestañas', 'cejas', 'microblading', 'rasuradora', 'tratamiento capilar', 'cuidado de la piel',
  ],
  misc_shopping: [
    'compra', 'pedido en línea', 'temu', 'aliexpress', 'liverpool', 'palacio de hierro', 'sears', 'ebay',
    'shein pedido', 'centro comercial', 'plaza comercial',
  ],
  misc_electronics: [
    'audifonos', 'airpods', 'bocina', 'bocinas', 'usb', 'power bank', 'batería portátil', 'teléfono nuevo', 'iphone',
    'samsung', 'xiaomi', 'computadora', 'monitor', 'teclado', 'mouse', 'ratón', 'webcam', 'impresora', 'disco duro',
    'ssd', 'smartwatch', 'reloj inteligente', 'apple watch', 'tele', 'televisor', 'smart tv', 'cámara', 'gopro',
    'drone', 'adaptador', 'mica',
  ],
  misc_software: [
    'chatgpt', 'chat gpt', 'claude', 'gemini', 'copilot', 'midjourney', 'apps', 'openai', 'notion', 'canva',
    'photoshop', 'office', 'microsoft 365', 'zoom', 'slack', 'vpn', 'nordvpn', 'antivirus', 'wordpress', 'shopify',
    'figma', 'cursor', 'vercel', 'aws', 'play store', 'adobe',
  ],
  misc_cloud: [
    'onedrive',
  ],
  misc_repairs: [
    'reparación de mi celular', 'reparación de mi laptop', 'reparación de mi compu', 'reparación de mi tele',
    'arreglar mi celular', 'arreglar el celular', 'arreglar celular', 'reparar mi celular', 'reparar celular',
    'reparación de celular', 'arreglar la pantalla', 'mandé a arreglar', 'mandé a reparar', 'reparación de laptop',
    'reparación de computadora', 'reparación de tele', 'reparación de pantalla', 'reparación de aparatos',
    'arreglo de celular', 'arreglo de la tele', 'arreglo de laptop', 'arreglo de computadora', 'arreglo de la compu',
    'soporte técnico', 'cambio de batería', 'formateo de laptop', 'arreglé mi celular', 'arreglé la laptop',
    'reparación del celular',
  ],
  misc_second_hand: [
    'usado', 'garage sale', 'marketplace', 'mercado de pulgas', 'tianguis de pulgas', 'tianguis de usados',
  ],
  house_rent: [
    'rentas', 'pago del departamento',
  ],
  house_mortgage: [
    'cofinavit', 'crédito de vivienda',
  ],
  house_insurance: [
    'seguro del hogar', 'póliza del hogar', 'seguro de vivienda', 'seguro contra sismos', 'seguro de departamento',
    'seguro de la casa',
  ],
  house_phone: [
    'saldo a mi celular', 'saldo al celular', 'saldo en mi celular', 'saldo del celular', 'saldo para el celular',
    'saldo celular', 'telefono', 'unefon', 'bait', 'weex', 'pillofon', 'recarga', 'recarga de celular', 'saldo',
    'plan de celular', 'megas', 'línea telefónica', 'recibo del celular', 'telefonía', 'pago del plan',
    'renta del celular', 'tiempo aire',
  ],
  house_internet: [
    'wi-fi', 'axtel', 'tv de paga', 'sky', 'dish', 'fibra óptica', 'módem', 'cable',
  ],
  house_electricity: [
    'energía eléctrica', 'consumo eléctrico',
  ],
  house_gas: [
    'recarga de gas', 'tanque estacionario', 'gas de la estufa', 'gas del boiler', 'gas del calentador', 'cilindro',
    'gas para el boiler',
  ],
  house_maintenance: [
    'ayuda con la limpieza', 'mantenimiento de la casa', 'pintor', 'albañil', 'herrero', 'carpintero', 'pintura',
    'impermeabilizante', 'impermeabilizar', 'reparación del baño', 'arreglo del baño', 'arreglo de la casa',
    'reparación de la casa', 'goteras', 'fuga de agua', 'tinaco', 'fumigación', 'ferretería',
    'materiales de construcción', 'cemento', 'herramienta', 'focos', 'obra', 'remodelación', 'arreglo de la regadera',
    'destape de drenaje',
  ],
  house_condofees: [
    'vigilancia del edificio', 'mantenimiento del edificio', 'cuota del edificio', 'cuota del fraccionamiento',
    'cuota de la privada', 'mantenimiento de la privada', 'mantenimiento del fraccionamiento', 'cuota vecinal',
  ],
  house_furniture: [
    'mueble', 'sillón', 'sofá', 'cama', 'litera', 'buró', 'cómoda', 'librero', 'estante', 'ropero', 'mesa', 'silla',
    'tapete', 'alfombra', 'cortinas', 'persianas', 'lámpara', 'espejo', 'cabecera', 'recámara', 'cobijas', 'sábanas',
    'edredón', 'ikea',
  ],
  house_appliances: [
    'refri', 'secadora', 'horno', 'tostador', 'cafetera', 'batidora', 'procesadora', 'olla de presión',
    'olla de cocción lenta', 'arrocera', 'freidora de aire', 'air fryer', 'aspiradora', 'robot aspirador', 'plancha',
    'ventilador', 'aire acondicionado', 'minisplit', 'calentador', 'extractor', 'lavavajillas', 'electrodomésticos',
  ],
  house_moving: [
    'cargadores', 'mudanceros',
  ],
  house_security: [
    'cámara de seguridad', 'cerradura', 'chapa nueva', 'portón eléctrico', 'videoportero', 'guardia de seguridad',
    'seguridad privada', 'cerco eléctrico',
  ],
  house_laundry_service: [
    'lavar la ropa', 'planchaduría', 'lavado en seco', 'lavar cobijas',
  ],
  food_supermarket: [
    'costco', 'chedraui', 'walmart', 'soriana', 'alsuper', 'sams', 'sam\'s', 'city market', 'la comer', 'heb',
    'h-e-b', 'aurrera', 'superama', 'tortilla', 'tomate', 'cebolla', 'limones', 'limón', 'zanahoria', 'lechuga',
    'verdura', 'fruta', 'frutas', 'plátano', 'manzana', 'naranja', 'carne', 'pollo', 'res', 'cerdo', 'pescado',
    'jamón', 'salchicha', 'tocino', 'queso', 'crema', 'leche', 'huevo', 'mantequilla', 'yogurt', 'cereal', 'arroz',
    'frijol', 'lentejas', 'sopa', 'aceite', 'azúcar', 'harina', 'refresco', 'refrescos', 'papel higiénico',
    'servilletas', 'suavizante', 'jabón', 'cloro', 'pinol', 'abarrotes', 'tiendita', 'víveres', 'carnicería',
    'pollería', 'verdulería', 'atún', 'mayonesa', 'salsa', 'especias', 'galletas saladas', 'pan de caja',
  ],
  food_restaurant: [
    'restaurant', 'cena', 'desayuno', 'almuerzo', 'fonda', 'cenaduría', 'marisquería', 'mariscos', 'sushi',
    'parrilla', 'chilis', 'applebees', 'wings', 'alitas', 'bistró', 'brunch', 'comida con la familia',
    'comida con amigos', 'comida de trabajo', 'comida de negocios', 'comer fuera', 'salimos a comer',
    'salimos a cenar', 'el fogoncito', 'el cardenal', 'café de olla', 'propina',
  ],
  food_coffee: [
    'cafetería', 'cappuccino', 'americano', 'espresso', 'expreso', 'moka', 'frappé', 'frappuccino', 'chai', 'matcha',
    'cafecito', 'dunkin', 'tim hortons', 'punta del cielo', 'italian coffee', 'cielito querido', 'flat white',
  ],
  food_alcohol: [
    'vino', 'vinos', 'vino para la cena', 'cervezas', 'michelada', 'tequila', 'mezcal', 'whisky', 'whiskey', 'ron',
    'vodka', 'ginebra', 'brandy', 'coñac', 'champagne', 'prosecco', 'sidra', 'pulque', 'licor', 'licores', 'chupe',
    'bebidas alcohólicas', 'vinoteca', 'licorería', 'caguamón', 'cheves', 'heineken', 'tecate', 'barrilito',
  ],
  food_fastfood: [
    'mcdonalds', 'kfc', 'carl\'s jr', 'dominos', 'domino\'s', 'little caesars', 'papa johns', 'subway',
    'el pollo loco', 'taco', 'tortas', 'torta', 'hamburguesas', 'hot dog', 'hot dogs', 'pizza', 'pizzas', 'tamal',
    'elote', 'esquites', 'quesadillas', 'quesadilla', 'gorditas', 'sopes', 'tlayudas', 'tostadas', 'flautas',
    'enchiladas', 'pozole', 'menudo', 'birria', 'barbacoa', 'carnitas', 'cochinita', 'nuggets', 'burritos',
    'antojitos', 'garnachas', 'taquería', 'pollo frito', 'papas fritas', 'hamburguesa', 'comida callejera',
    'tacos de pollo', 'tacos de bistec', 'molletes', 'chilaquiles', 'huaraches',
  ],
  food_snacks: [
    'botanas', 'papas', 'sabritas', 'ruffles', 'fritos', 'cacahuates', 'nueces', 'pistaches', 'semillas', 'pepitas',
    'chicharrones', 'churritos', 'pringles', 'barritas', 'barra de cereal', 'frituras', 'chips', 'totopos', 'cheetos',
    'takis', 'doritos', 'chamoy',
  ],
  food_sweets: [
    'helado', 'helados', 'nieve', 'paleta', 'paletas', 'churro', 'churros', 'gomitas', 'chicles', 'chicle',
    'caramelos', 'mazapán', 'dulce de leche', 'cajeta', 'postre', 'postres', 'brownie', 'donas', 'donuts',
    'krispy kreme', 'cheesecake', 'golosinas', 'dulcería', 'jamoncillo', 'tamarindo', 'paletería', 'nevería',
    'frappé de helado', 'malteada', 'waffle', 'wafle',
  ],
  food_delivery: [
    'domicilio', 'pedido de comida', 'envío de comida', 'repartidor', 'cornershop', 'pedí comida', 'pedimos comida',
    'uber eats', 'didi food', 'rappi',
  ],
  food_market: [
    'frutas y verduras en el mercado', 'mercado', 'sobre ruedas', 'central de abasto', 'mercadito',
  ],
  food_bakery: [
    'bolillo', 'bolillos', 'telera', 'cuernito', 'cuernitos', 'croissant', 'baguette', 'rosca', 'pastel', 'pasteles',
    'pastelería', 'panqué', 'dona', 'conchas', 'orejas', 'empanadas', 'panadero',
  ],
  food_organic: [
    'orgánica', 'orgánicos', 'orgánicas', 'whey', 'granola', 'semillas de chía', 'chía', 'avena', 'miel', 'tofu',
    'vegano', 'vegana', 'sin gluten', 'comida saludable', 'dieta', 'plan alimenticio', 'leche de almendra',
    'leche de avena',
  ],
  food_juice_bar: [
    'licuado', 'licuado de plátano', 'smoothie', 'smoothies', 'jugos', 'jugo de naranja', 'licuados',
    'agua de frutas', 'aguas frescas', 'agua de horchata', 'limonada', 'naranjada', 'jugo verde', 'jugo de zanahoria',
    'juguería', 'agua de jamaica',
  ],
  food_catering: [
    'taquiza', 'buffet para el evento', 'buffet de evento', 'banquetera', 'comida para la fiesta', 'barra libre',
    'coffee break', 'hora loca', 'banquetes', 'mesa de postres',
  ],
  food_water_delivery: [
    'garrafones', 'agua purificada', 'purificadora', 'rellenar el garrafón', 'agua de garrafón',
    'garrafón a domicilio', 'repartidor de agua', 'ciel', 'epura',
  ],
  ent_cinema: [
    'cinemark', 'sala vip',
  ],
  ent_concerts: [
    'corona capital', 'vive latino', 'pal norte', 'auditorio nacional', 'foro sol', 'conciertos',
  ],
  ent_hobbies: [
    'hobbies', 'coleccionable', 'coleccionables', 'colección', 'manga', 'cómics', 'material de arte',
    'instrumento musical', 'guitarra', 'pesca', 'manualidades', 'tejido', 'costura', 'juegos de mesa', 'warhammer',
    'modelismo',
  ],
  ent_videogames: [
    'videojuegos', 'ps5', 'ps4', 'switch', 'pavos', 'fortnite', 'v-bucks', 'robux', 'roblox', 'minecraft',
    'epic games', 'ps plus', 'consola', 'gamestop', 'dlc', 'pase de batalla', 'juego nuevo',
  ],
  ent_sports: [
    'deporte', 'deportes', 'clase de box', 'crossfit', 'boxeo', 'spinning', 'yoga', 'pilates', 'zumba', 'natación',
    'alberca', 'torneo', 'fútbol', 'básquetbol', 'pádel', 'golf', 'inscripción al gym', 'sport city', 'sports world',
    'anytime fitness', 'personal trainer', 'clase de baile', 'artes marciales', 'karate', 'judo', 'taekwondo',
    'jiu jitsu', 'escalada', 'rocódromo', 'inscripción a la carrera', 'ciclismo',
  ],
  ent_bowling: [
    'bolos',
  ],
  ent_clubs: [
    'antros', 'discotecas', 'bares', 'club nocturno', 'cervecería', 'pulquería', 'mezcalería', 'salir de fiesta',
    'reservado', 'copa en el bar', 'cantina',
  ],
  ent_streaming: [
    'amazon prime', 'prime', 'apple tv', 'apple music', 'tidal', 'deezer', 'youtube music', 'paramount+',
    'paramount plus', 'star+', 'star plus', 'claro video', 'vix', 'crunchyroll', 'twitch', 'mubi', 'blim', 'hulu',
    'peacock', 'audible', 'youtube premium',
  ],
  ent_subscriptions: [
    'suscripciones', 'membresías', 'cuota mensual', 'patreon',
  ],
  ent_events: [
    'eventos', 'partido', 'exposición', 'exposiciones', 'expo', 'feria del libro', 'lucha libre', 'ópera', 'ballet',
    'stand up', 'stand-up', 'espectáculo', 'zoológico', 'acuario', 'planetario', 'jardín botánico',
    'zona arqueológica', 'cirque du soleil', 'circo', 'buffet para el evento',
  ],
  ent_amusement: [
    'parque de diversiones', 'ferias', 'parque acuático', 'parque temático', 'juegos mecánicos', 'montaña rusa',
    'kidzania', 'selva mágica', 'reino animal', 'xcaret', 'xel-ha', 'aquopolis',
  ],
  ent_escape_room: [
    'escape rooms', 'sala de escape', 'juego de escape',
  ],
  ent_arcade: [
    'arcadas', 'realidad virtual', 'game zone', 'vr arena',
  ],
  ent_billiards: [
    'mesa de pool', 'billares', 'dardos',
  ],
  ent_photography: [
    'fotógrafo', 'sesión de fotos', 'sesión de fotografía', 'photo booth', 'sesión fotográfica', 'cabina de fotos',
    'recuerditos', 'photobooth',
  ],
  life_gifts: [
    'regalos', 'regalo de navidad', 'regalito', 'secret santa', 'amigo secreto', 'arreglo floral',
    'regalo de graduación', 'flores',
  ],
  life_pets: [
    'mascotas', 'perros', 'gatos', 'veterinaria', 'correa', 'juguete para perro', 'juguete para el perro',
    'peluquería canina', 'estética canina', 'estética para perros', 'guardería canina', 'hamster', 'cachorro',
    'petco', 'petsmart', 'pet shop', 'antipulgas', 'desparasitante',
  ],
  life_donations: [
    'cruz roja', 'teletón', 'caridad', 'limosna', 'diezmo', 'ofrenda', 'donar', 'donaciones', 'aportación voluntaria',
    'fundación',
  ],
  life_travel: [
    'viajes', 'hoteles', 'hostal', 'hostel', 'hospedaje', 'booking', 'expedia', 'despegar', 'viaje de vacaciones',
    'cabaña', 'casa de campo', 'todo incluido', 'maleta', 'equipaje', 'crucero', 'cruceros',
  ],
  life_experiences: [
    'experiencia', 'experiencias', 'tours', 'escapada', 'paseo en globo', 'cata', 'cata de vino', 'paracaídas',
    'bungee', 'rafting', 'senderismo', 'campamento', 'glamping', 'buceo', 'snorkel', 'safari', 'excursión',
    'excursiones', 'visita guiada', 'tirolesa', 'clase de cocina', 'taller de cerámica',
  ],
  life_family_support: [
    'a mis papás', 'a mi mamá', 'a mi papá', 'a mis padres', 'a mi madre', 'a mi padre', 'a mi abuela', 'a mi abuelo',
    'a mis abuelos', 'a mi hermano', 'a mi hermana', 'a mis hijos', 'a mi familia', 'dinero para mis papás',
    'gasto de mis papás', 'mesada a mi hijo', 'pensión para mis hijos', 'gastos de mis papás', 'remesa', 'remesas',
    'ayuda para mi familia',
  ],
  life_community: [
    'cooperación', 'faena', 'trabajo comunitario', 'comité vecinal', 'mayordomía', 'fiesta patronal',
    'causa comunitaria',
  ],
  life_celebration: [
    'celebraciones', 'posadas', 'fiesta de aniversario', 'cena de fin de año', 'comida del día del padre', 'festejo',
    'festejos', 'piñata', 'piñatas', 'fiesta de cumpleaños', 'fiesta infantil', 'pastel de cumpleaños', 'globos',
    'decoración de fiesta', 'fiesta sorpresa', 'reunión familiar', 'comida familiar', 'día de muertos', 'nochebuena',
    'cena navideña', 'navidad', 'año nuevo',
  ],
  life_self_improvement: [
    'coach', 'taller de autoestima', 'curso de oratoria', 'mentoría', 'mentor', 'constelaciones familiares', 'tarot',
    'astrología', 'retiro', 'conferencia', 'meditación',
  ],
  life_social_clubs: [
    'cuota del club', 'cuota de club', 'club de golf', 'club alemán', 'casino español',
  ],
  life_wedding: [
    'bodas', 'despedida', 'quince años', 'traje de novio', 'anillos de boda', 'salón de bodas', 'wedding planner',
    'ceremonia religiosa', 'mesa de regalos', 'bautizo', 'comunión', 'graduación', 'revelación de género',
    'gender reveal', 'regalo de boda', 'vestido de novia',
  ],
  health_doctor: [
    'doctora', 'cita médica', 'chequeo', 'check up', 'revisión médica', 'curación',
  ],
  health_pharmacy: [
    'similares', 'benavides', 'pastilla', 'jarabe', 'paracetamol', 'ibuprofeno', 'aspirina', 'antibiótico',
    'antibióticos', 'antiinflamatorio', 'analgésico', 'receta', 'recetas', 'inyecciones', 'inyección', 'gotas',
    'pomada', 'curitas', 'gasas', 'termómetro', 'vendas', 'cubrebocas', 'anticonceptivos', 'omeprazol', 'loratadina',
    'suero', 'medicamento', 'medicamentos',
  ],
  health_dentist: [
    'dental', 'odontólogo', 'odontología', 'muela', 'corona dental', 'resina', 'blanqueamiento', 'carillas',
    'invisalign', 'retenedor', 'ortodoncia', 'consulta con el dentista',
  ],
  health_mental: [
    'psicóloga', 'sesión psicológica', 'consulta psicológica', 'salud mental', 'psicoterapia', 'psicoanalista',
    'analista',
  ],
  health_hygiene: [
    'toallas sanitarias', 'toallitas húmedas', 'pasta dental', 'cepillo de dientes', 'hilo dental', 'rastrillos',
    'jabón íntimo', 'protectores diarios', 'test de embarazo', 'prueba de embarazo', 'lubricante', 'anticonceptivo',
  ],
  health_insurance: [
    'seguro de salud', 'gastos médicos mayores', 'gmm', 'seguro dental',
  ],
  health_vision: [
    'examen de la vista', 'examen visual', 'micas', 'cirugía láser', 'lasik', 'armazón', 'gafas', 'devlyn',
  ],
  health_supplements: [
    'multivitamínico', 'multivitamínicos', 'creatina', 'probióticos', 'melatonina', 'zinc', 'hierro', 'calcio', 'b12',
    'complemento alimenticio', 'complementos alimenticios', 'gnc', 'herbalife', 'suplemento', 'vitamina',
  ],
  health_specialists: [
    'endocrinólogo', 'gastroenterólogo', 'neurólogo', 'urólogo', 'otorrinolaringólogo', 'otorrino', 'alergólogo',
    'reumatólogo', 'oncólogo', 'neumólogo', 'nefrólogo', 'quiropráctico', 'osteópata', 'terapia física',
    'fisioterapia', 'rehabilitación', 'nutrióloga', 'dermatóloga', 'ginecóloga', 'especialista', 'cirujano',
    'acupunturista', 'homeópata', 'dermatología', 'oftalmología', 'cardiólogo', 'ginecólogo', 'traumatólogo',
    'podólogo',
  ],
  health_labs: [
    'análisis de sangre', 'examen de sangre', 'electrocardiograma', 'ecocardiograma', 'mastografía', 'papanicolau',
    'papanicolaou', 'biometría hemática', 'química sanguínea', 'examen de orina', 'análisis de orina', 'prueba covid',
    'prueba de covid', 'pcr', 'laboratorio clínico', 'estudios de laboratorio', 'chopo', 'radiografía',
    'radiografías', 'endoscopía', 'colonoscopía', 'densitometría', 'pruebas de laboratorio', 'perfil de lípidos',
    'examen médico', 'rayos x', 'ultrasonidos',
  ],
  sav_education_fund: [
    'para estudios', 'para la universidad', 'para la escuela', 'para la carrera', 'para mi maestría',
    'para la colegiatura',
  ],
  inc_salary: [
    'pago quincenal', 'mi pago', 'pago semanal', 'raya',
  ],
  inc_allowance: [
    'semanada', 'dinero de mis papás',
  ],
  inc_bonus: [
    'bonos', 'ptu', 'prima vacacional', 'caja de ahorro', 'comisión', 'comisiones', 'gratificación', 'compensación',
    'finiquito', 'liquidación',
  ],
  inc_investments: [
    'ganancia de mis inversiones', 'ganancias de inversión', 'ganancia de capital', 'ganancias en bolsa',
    'rendimiento',
  ],
  inc_dividends: [
    'dividendos',
  ],
  inc_interest: [
    'intereses', 'rendimiento de la cuenta', 'rendimientos de nu',
  ],
  inc_freelance: [
    'chambas', 'chambita', 'trabajo extra', 'honorarios', 'asesoría', 'pago de cliente', 'pago de un cliente',
    'servicio profesional', 'trabajo independiente', 'trabajito',
  ],
  inc_gifts: [
    'dinero de regalo', 'regalo en efectivo', 'me dieron dinero', 'me dieron de regalo', 'dinero de cumpleaños',
    'regalaron',
  ],
  inc_sales: [
    'ventas', 'vendi', 'vendimos',
  ],
  trans_uber: [
    'uber pool', 'viaje en uber', 'uber al aeropuerto',
  ],
  trans_didi: [
    'viaje en didi', 'didi al aeropuerto',
  ],
  trans_taxi: [
    'taxis', 'in driver', 'taxi al aeropuerto', 'bolt', 'viaje en taxi',
  ],
  trans_public: [
    'camion', 'metrobus', 'tarjeta de movilidad', 'recarga del metro', 'recarga de metro', 'recarga de tarjeta',
    'pasaje', 'pasajes', 'cablebús', 'tren ligero', 'trolebús', 'suburbano', 'mexibús', 'tren interurbano',
    'tren maya', 'autobús', 'ado', 'central de autobuses', 'flecha amarilla', 'estrella blanca', 'primera plus',
    'etn', 'metrorrey', 'siteur', 'macrobús', 'tarjeta de transporte', 'transporte público',
  ],
  trans_gas: [
    'pemex', 'shell', 'combustible', 'llené el tanque', 'llenar el tanque', 'gas del coche', 'tanque lleno', 'g500',
    'oxxo gas',
  ],
  trans_flights: [
    'vuelos', 'avion', 'aeromexico', 'viva aerobus', 'interjet', 'magnicharters', 'american airlines',
    'united airlines', 'delta', 'copa airlines', 'avianca', 'jetblue', 'southwest', 'latam', 'iberia', 'air france',
    'klm', 'lufthansa', 'maleta documentada', 'equipaje documentado', 'tarifa aeroportuaria',
  ],
  trans_carrental: [
    'renta de carro', 'avis', 'europcar', 'sixt', 'renta de camioneta', 'renta de van', 'auto rentado',
    'carro rentado', 'rentamos un carro', 'renta de vehículo', 'arrendadora', 'renta de coche', 'renta de auto',
    'hertz',
  ],
  trans_parking: [
    'estacionamientos', 'parquímetros', 'valet', 'parking', 'ecoparq',
  ],
  trans_tolls: [
    'casetas', 'autopista', 'capufe', 'telepeaje', 'recarga del tag', 'recarga de tag',
  ],
  trans_maintenance: [
    'servicio de mi coche', 'servicio de mi carro', 'servicio del coche', 'servicio del carro', 'servicio de mi moto',
    'servicio de mi camioneta', 'mantenimiento del carro', 'mantenimiento del coche', 'mecanico', 'refacciones',
    'llanta', 'llantas', 'afinación', 'frenos', 'pastillas de freno', 'balatas', 'batería del coche',
    'batería del carro', 'amortiguadores', 'suspensión', 'clutch', 'embrague', 'alineación', 'balanceo', 'autolavado',
    'car wash', 'verificación', 'grúa', 'servicio del auto', 'revisión del coche', 'anticongelante',
    'limpiaparabrisas', 'radiador', 'vulcanizadora', 'cambio de aceite', 'aceite del coche',
  ],
  trans_school: [
    'ruta escolar', 'ruta de la escuela', 'transporte de los niños', 'camioneta de la escuela',
    'transporte del colegio', 'autobús escolar', 'transporte escolar', 'camión escolar',
  ],
  trans_microbus: [
    'micros', 'peseros', 'colectivo', 'colectivos', 'transporte colectivo',
  ],
  trans_combi: [
    'combis', 'combi a la escuela',
  ],
  trans_bikeshare: [
    'renta de bici', 'bici compartida', 'mobike', 'patineta eléctrica', 'monopatín', 'bicicleta compartida', 'mibici',
    'scooters', 'ecobici',
  ],
  trans_mototaxi: [
    'mototaxis', 'bicitaxi', 'tuk tuk', 'moto-taxi', 'taxi moto', 'moto taxi', 'motoratón',
  ],
  trans_ferry: [
    'barco', 'balsa',
  ],
  trans_car_insurance: [
    'seguro de coche', 'seguro de carro', 'seguro del coche', 'póliza del carro', 'póliza del coche', 'gnp', 'chubb',
    'hdi', 'mapfre', 'seguro vehicular', 'seguro del vehículo', 'seguro de la camioneta', 'seguro de moto',
    'seguro obligatorio', 'cobertura amplia', 'seguro de auto', 'seguro del carro',
  ],
  trans_bike: [
    'bici', 'bicicleta', 'bicicletas', 'refacciones de la bici', 'llanta de bici', 'bicicletería', 'pedales',
    'cámara de bici', 'refacciones de bici',
  ],
  debt_creditcard: [
    'pago de la tarjeta', 'pago de tarjeta', 'abono a la tarjeta', 'liquidé la tarjeta', 'tarjeta bbva',
    'tarjeta banamex', 'tarjeta santander', 'tarjeta nu', 'tarjeta hsbc', 'tarjeta banorte', 'tarjeta citibanamex',
    'tarjeta liverpool', 'tarjeta departamental', 'corte de la tarjeta', 'tdc', 'estado de cuenta', 'amex',
    'american express',
  ],
  debt_student: [
    'crédito estudiantil', 'préstamo universitario', 'crédito universitario', 'educafin', 'préstamo para estudios',
    'crédito educativo', 'préstamo estudiantil',
  ],
  debt_personal: [
    'tandas', 'préstamo', 'préstamos', 'le debo', 'pagué lo que debía', 'pago a mi amigo', 'deuda con un amigo',
    'le pagué lo que le debía', 'mi deuda', 'crédito personal', 'crédito bancario', 'prestamista',
  ],
  debt_mortgage: [
    'pago extra a la hipoteca', 'liquidación de hipoteca', 'saldo hipotecario', 'hipoteca deuda',
  ],
  debt_car_loan: [
    'crédito del auto', 'crédito del coche', 'crédito del carro', 'mensualidad del carro', 'mensualidad del auto',
    'mensualidad del coche', 'abono del auto', 'abono del carro', 'abono del coche', 'financiamiento del auto',
    'financiamiento del coche', 'financiera del auto', 'crédito de la camioneta', 'mensualidad de la camioneta',
    'abono de la camioneta', 'pago del coche', 'pago del carro', 'pago del auto', 'crédito auto',
    'crédito automotriz',
  ],
  debt_appliance: [
    'tarjeta de liverpool', 'meses sin intereses', 'msi', 'crédito de electrodomésticos', 'crédito de la tele',
    'abono de la tele', 'abono de la lavadora', 'abono del refri', 'mensualidad de la sala',
    'mensualidad de los muebles', 'abono de muebles', 'crédito de la sala', 'crédito de la lavadora', 'italika',
    'crédito en tienda', 'crédito de la tienda', 'famsa', 'crédito de muebles',
  ],
  debt_payday_loan: [
    'desempeño', 'desempeñar', 'empeñé', 'préstamo express', 'préstamo rápido', 'crédito express', 'microcrédito',
    'dinero rápido', 'adelanto de nómina', 'adelanto de sueldo', 'monte de piedad', 'crédito rápido',
    'préstamo de nómina', 'prestaentresemana', 'empeño',
  ],
  debt_medical: [
    'plan de pagos hospital', 'abono al hospital', 'pago del hospital', 'abono de la cirugía', 'pago de la cirugía',
    'pagos del hospital', 'crédito médico', 'deuda del hospital', 'factura del hospital', 'deuda médica',
    'financiamiento médico',
  ],
  inv_stocks: [
    'bmv', 'apple', 'tesla', 'microsoft', 'nvidia', 'alphabet', 'walmex', 'femsa', 'cemex', 'bursátil', 'robinhood',
    'interactive brokers', 'etoro', 'actinver', 'bursanet', 'sic', 'sistema internacional de cotizaciones',
  ],
  inv_etfs: [
    'etfs', 'spy', 'vti', 'vwo', 'iwm', 'naftrac', 'vanguard', 'ishares', 's&p 500', 'sp500', 'nasdaq',
    'fondo cotizado', 'fondos cotizados',
  ],
  inv_fibras: [
    'fibras', 'danhos',
  ],
  inv_cetes: [
    'bondes', 'bonos m', 'bono m', 'bonos tasa fija', 'tesorería', 'bonos udi', 'udibono',
  ],
  inv_bonds: [
    'obligaciones', 't-bills', 'treasuries', 'deuda corporativa', 'papel comercial', 'pagarés bancarios',
  ],
  inv_funds: [
    'sociedad de inversión', 'sociedades de inversión', 'fondo actinver', 'siefore', 'money market',
    'mercado de dinero', 'fondos', 'fondo',
  ],
  inv_crypto: [
    'criptos', 'criptomoneda', 'btc', 'eth', 'ether', 'solana', 'cardano', 'dogecoin', 'doge', 'xrp', 'ripple',
    'litecoin', 'usdt', 'tether', 'usdc', 'stablecoins', 'coinbase', 'kraken', 'bybit', 'okx', 'metamask', 'nft',
    'nfts', 'altcoins', 'polygon', 'bnb', 'avalanche', 'chainlink', 'shiba',
  ],
  inv_real_estate: [
    'terreno', 'preventa', 'lote', 'lotes', 'inmueble', 'inmuebles', 'bienes raíces', 'casa para renta', 'propiedad',
    'propiedades', 'tokenización',
  ],
  inv_p2p_lending: [
    'prestadero', 'kubo', 'afluenta', 'mutuo', 'p2p',
  ],
  edu_tuition: [
    'colegiaturas', 'reinscripción', 'colegio', 'escuela', 'universidad', 'prepa', 'preparatoria', 'secundaria',
    'primaria', 'kínder', 'tec de monterrey', 'ibero', 'uvm', 'anáhuac', 'ipn', 'uam', 'itam', 'udg', 'buap',
    'semestre', 'cuatrimestre', 'matrícula', 'cuota escolar', 'trámite de titulación', 'posgrado', 'maestría',
    'doctorado',
  ],
  edu_supplies: [
    'impresión', 'útiles', 'cuaderno', 'cuadernos', 'mochila', 'mochila para la escuela', 'plumas', 'pluma',
    'bolígrafos', 'colores', 'crayolas', 'tijeras', 'pegamento', 'resistol', 'calculadora', 'juego de geometría',
    'folders', 'carpetas', 'hojas blancas', 'cartulinas', 'cartulina', 'marcadores', 'uniformes', 'libro',
    'antología', 'fotocopias', 'fotocopia', 'tinta', 'cartucho', 'tóner', 'material escolar', 'lonchera',
    'diccionario',
  ],
  edu_courses: [
    'cursos', 'certificaciones', 'duolingo', 'linkedin learning', 'skillshare', 'masterclass', 'domestika', 'crehana',
    'edx', 'datacamp', 'codecademy', 'clase en línea', 'capacitación', 'capacitaciones', 'webinar', 'congreso', 'pmp',
  ],
  edu_tutoring: [
    'clase particular', 'tutora', 'tutores', 'asesorías', 'asesoría', 'clase de matemáticas', 'clases de matemáticas',
    'profesor particular', 'maestro particular', 'maestra particular', 'clases de refuerzo', 'refuerzo escolar',
    'clases particulares', 'regularización', 'tutor',
  ],
};

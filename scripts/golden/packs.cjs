// Herramientas para los paquetes de palabras clave (src/data/keywordPacks/*.ts).
//   node scripts/golden/packs.cjs format             — ordena, quita repetidas y reescribe los archivos
//   node scripts/golden/packs.cjs prune [--dry] [--include-base]
//                                                    — quita las palabras que NO aportan nada
//   node scripts/golden/packs.cjs stats              — cuántas palabras hay y cuántas aportan
//
// "No aporta" = el catálogo, SIN esa palabra, ya clasifica su mismo texto en la misma subcategoría
// (ej. "pago del predial" cuando "predial" ya existe) o la palabra está repetida en otra subcategoría
// de la misma categoría y nunca se usaría (gana la primera). Se evalúa en orden de más palabras a
// menos, para que las frases largas dependan de las cortas y no al revés.
require('./ts-hook.cjs');
const fs = require('fs');
const path = require('path');
const P = require('../../src/ai/localParser.ts');
const { DEFAULT_CATEGORIES: D } = require('../../src/data/categories.ts');

const DIR = path.join(__dirname, '../../src/data/keywordPacks');
const cmd = process.argv[2];
const dry = process.argv.includes('--dry');
const includeBase = process.argv.includes('--include-base');

const packFiles = fs.readdirSync(DIR).filter((f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'extended.ts').sort();
// protegidas.ts: frases desempatadoras que parecen redundantes aisladas; nunca se podan
const NEVER_PRUNE = new Set(['protegidas.ts']);
const subToCat = new Map(); for (const c of D) for (const s of c.subcategories) subToCat.set(s.id, c.id);
const typeOf = (cat) => (cat === 'income' ? 'income' : cat === 'savings' ? 'saving' : cat === 'investments' ? 'investment_buy' : 'expense');
const q = (k) => "'" + k.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

function loadPack(file) {
  const src = fs.readFileSync(path.join(DIR, file), 'utf8');
  const m = src.match(/export const (\w+): Record<string, string\[\]> = \{/);
  const header = src.slice(0, m.index);
  const mod = require(path.join(DIR, file));
  return { file, header, name: m[1], data: mod[m[1]] };
}

function writePack(pk) {
  const lines = [];
  for (const [sub, kws] of Object.entries(pk.data)) {
    if (!kws.length) continue;
    lines.push(`  ${sub}: [`);
    let cur = '   ';
    for (const k of kws) {
      const piece = ' ' + q(k) + ',';
      if ((cur + piece).length > 118) { lines.push(cur); cur = '   ' + piece; } else cur += piece;
    }
    lines.push(cur, '  ],');
  }
  fs.writeFileSync(path.join(DIR, pk.file), `${pk.header}export const ${pk.name}: Record<string, string[]> = {\n${lines.join('\n')}\n};\n`);
}

// Palabras sueltas demasiado ambiguas para ser una clave (significan otra cosa en el habla diaria):
// aquí nunca entran; la marca sí puede entrar acompañada ("cerveza sol", "leche nido").
const AMBIGUOUS_BARE = new Set(['sol', 'ley', 'indio', 'victoria', 'leon', 'extra', 'seven', 'blue', 'nan', 'nido', 'fresca', 'roma', 'ace', 'viva', 'foca', 'tide', 'sal', 'col', 'ron', 'gin', 'ate', 'pay', 'kiss', 'kisses',
  'bara', 'neto', 'lucas', 'shot', 'bomba', 'bombas', 'cava', 'sidra', 'perfume', 'pelon', 'rosa', 'puffs', 'la rosa', 'vero', 'agave', 'miel', 'sazonador', 'moka', 'wonder', 'jugo', 'cubana', 'paloma', 'palomas', 'trident', 'pasta', 'puré', 'pure', 'mango', 'pandora', 'limpia', 'limpias', 'unas', 'regalo para mí', 'regalo para mi mismo', 'regalo para mí misma', 'me regalé', 'cosas varias', 'varias cosas', 'cositas', 'unas cositas', 'un gusto', 'un gustito', 'sombra', 'base', 'top', 'tops', 'polo', 'trusa', 'cadena', 'cadenas', 'ondas', 'rizos', 'barba', 'cejas', 'secado', 'nails', 'cosméticos', 'cosmeticos', 'cd', 'cds', 'dvd', 'libro', 'libros', 'revista', 'revistas', 'comic', 'comics', 'cómic', 'cómics', 'envío', 'envíos', 'paquete', 'paquetes', 'compra', 'compras', 'oferta', 'ofertas', 'descuento', 'descuentos', 'promoción', 'promociones', 'barata', 'la barata', 'remate', 'remates', 'liquidación', 'liquidaciones', 'rebajas', 'bazar', 'bazares', 'el bazar', 'usado', 'usada', 'usados', 'usadas', 'subasta', 'subastas', 'tianguis', 'el tianguis', 'rastro', 'el rastro', 'pulgas', 'las pulgas', 'segunda', 'de segunda', 'vintage', 'antigüedad', 'antigüedades', 'antiguedades', 'trueque', 'oficina', 'la oficina', 'act', 'ap', 'ib', 'pet', 'ket', 'cae', 'cpe', 'fce', 'ccna', 'paa', 'tec', 'up', 'uv', 'uam', 'ipn', 'curso', 'cursos', 'colegio', 'el colegio', 'escuela', 'la escuela', 'prepa', 'la prepa', 'secundaria', 'primaria', 'kinder', 'kínder', 'universidad', 'la universidad', 'licenciatura', 'ingeniería', 'maestría', 'maestria', 'doctorado', 'taller', 'talleres', 'seminario', 'seminarios', 'tutor', 'tutora', 'tutores', 'asesoría', 'asesorías', 'instructor', 'instructora', 'boleta', 'boletas', 'agenda', 'colores', 'regla', 'reglas', 'carpeta', 'carpetas', 'folder', 'folders', 'mochila', 'mochilas', 'portafolio', 'maletín', 'maletin', 'estuche', 'tijeras', 'cartón', 'tampón', 'sellos', 'clips', 'vitrina', 'vitrinas', 'mostrador', 'maquinaria', 'inventario', 'mercancía', 'insumos', 'consumibles', 'volante', 'volantes', 'anuncios', 'publicidad', 'logotipo', 'branding', 'empaque', 'empaques', 'etiquetas', 'etiquetas adhesivas', 'burbuja', 'playo', 'emplaye', 'proveedor', 'proveedores', 'mensajería', 'paquetería', 'ups', 'dhl', 'fedex', 'box', 'predator', 'hp', 'one', 'ultra', 'max', 'prime', 'google', 'discord', 'kick', 'secret', 'now', 'oasis', 'excellence', 'dreams', 'secrets', 'legion', 'nitro', 'vivo', 'poco', 'honor', 'mega', 'neon', 'render', 'bubble', 'monday', 'miro', 'poe', 'cursor', 'v0', 'make', 'ally', 'beta', 'luz', 'on', 'ana', 'ace', 'rog', 'alexa', 'echo', 'nest', 'tecate', 'blue', 'vacuna', 'vacunas', 'fiesta', 'fiestas', 'la fiesta', 'reunión', 'reuniones', 'convivio', 'convivios', 'navidad', 'la navidad', 'cumple', 'el cumple', 'cumpleaños', 'el cumpleaños', 'mi cumpleaños',
  'su cumpleaños', 'festejo', 'festejos', 'posada', 'posadas', 'la posada', 'celebración', 'celebraciones', 'baile', 'banda', 'trío', 'pachanga', 'pachangas', 'convivencia', 'año nuevo', 'el año nuevo', 'fin de año', 'el fin de año', 'noche vieja',
  'cuartos', 'banda', 'bandas', 'motor', 'marcha', 'plato', 'platos', 'escape', 'cambios', 'espejos', 'espejo', 'faro', 'faros', 'calavera', 'calaveras', 'terminal', 'terminales', 'sensor', 'sensores', 'batería', 'bateria', 'baterías',
  'cerámico', 'resortes', 'bujes', 'cofre', 'defensa', 'defensas', 'asiento', 'asientos', 'copa', 'azul', 'gol', 'delta', 'giant', 'cube', 'turbo', 'scott', 'spirit', 'american', 'united', 'national', 'budget', 'dollar', 'enterprise',
  'alamo', 'tap', 'swiss', 'ana', 'jal', 'sky', 'dirección', 'direccion', 'radiador', 'alternador', 'transmisión', 'transmision', 'inversor', 'generador', 'planta', 'foco', 'focos', 'cable', 'cables', 'switch', 'router', 'cuadro', 'cuadros', 'mesa', 'mesas', 'silla', 'sillas', 'cama', 'camas', 'sala', 'estante', 'estantes', 'adorno', 'adornos']);
const AMBIG_NORM = new Set([...AMBIGUOUS_BARE].map((w) => P.normalize(w)));
// quita repetidas (por texto normalizado) dentro de una misma subcategoría
function dedupe(pk) {
  let removed = 0;
  for (const sub of Object.keys(pk.data)) {
    const seen = new Set(); const out = [];
    for (const k of pk.data[sub]) { const n = P.normalize(k); if (seen.has(n) || (AMBIG_NORM.has(n) && pk.file !== 'base.ts')) { removed++; continue; } seen.add(n); out.push(k); }
    pk.data[sub] = out;
  }
  return removed;
}

if (cmd === 'format') {
  for (const f of packFiles) { const pk = loadPack(f); const r = dedupe(pk); writePack(pk); console.log(f.padEnd(24), 'repetidas quitadas:', r); }
} else if (cmd === 'prune' || cmd === 'stats') {
  const idx = P.__auditKeywordIndex();
  const packs = packFiles.map(loadPack).filter((p) => !NEVER_PRUNE.has(p.file) && (includeBase || cmd === 'stats' || p.file !== 'base.ts'));
  const entryOf = (n, cat) => (idx.byKeyword.get(n) || []).find((e) => e.categoryId === cat);
  const cands = [];
  const report = {};
  for (const pk of packs) {
    report[pk.file] = { escritas: 0, repetidaOtraSub: 0, redundantes: 0, aportan: 0 };
    for (const [sub, kws] of Object.entries(pk.data)) {
      const cat = subToCat.get(sub);
      if (!cat) { console.log('SUBCATEGORÍA INEXISTENTE en', pk.file, sub); process.exitCode = 1; continue; }
      for (const k of kws) {
        report[pk.file].escritas++;
        const n = P.normalize(k);
        const e = entryOf(n, cat);
        if (!e || e.subcategoryId !== sub) { cands.push({ pk, sub, k, n, dead: true, e }); report[pk.file].repetidaOtraSub++; continue; }
        cands.push({ pk, sub, k, n, e, type: typeOf(cat), words: n.split(' ').length });
      }
    }
  }
  // quién genera cada variante de número (plural/singular): una palabra que es variante de otra ya existente sobra
  const variantOf = new Map();
  for (const e of idx.entries) for (const v of P.__auditNumberVariants(e.kw)) { if (!variantOf.has(v)) variantOf.set(v, []); variantOf.get(v).push(e); }
  // una frase que CONTIENE vocabulario de otra subcategoría suele ser un desempatador: no se poda
  const overlaps = (c) => {
    const toks = c.n.split(' ');
    for (let i = 0; i < toks.length; i++) {
      let ph = '';
      for (let k = i; k < toks.length; k++) {
        ph = ph ? ph + ' ' + toks[k] : toks[k];
        if (ph === c.n) continue;
        for (const e of idx.byKeyword.get(ph) || []) if (e !== c.e && e.subcategoryId !== c.sub && e.score > 1 && typeOfFam(e.categoryId) === typeOfFam(c.e.categoryId)) return true;
      }
    }
    return false;
  };
  const typeOfFam = (cat) => (['income', 'savings', 'investments'].includes(cat) ? cat : 'expense');
  const live = cands.filter((c) => !c.dead).sort((a, b) => b.words - a.words || b.n.length - a.n.length);
  const excluded = new Set();
  const redundant = new Set();
  for (const c of live) {
    const own = new Set(P.__auditNumberVariants(c.n)); // las variantes de la propia palabra no cuentan (sería circular)
    const prods = (variantOf.get(c.n) || []).filter((x) => x !== c.e && !own.has(x.kw) && !excluded.has(x) && x.categoryId === c.e.categoryId && x.subcategoryId === c.sub);
    if (prods.length) { redundant.add(c); report[c.pk.file].redundantes++; excluded.add(c.e); continue; }
    excluded.add(c.e);
    const b = P.__auditBestExact(c.k, c.type, excluded);
    if (overlaps(c)) { excluded.delete(c.e); continue; }
    const isDefault = ['inc_other', 'sav_other', 'inv_other'].includes(c.sub);
    if ((b && b.subcategoryId === c.sub) || (!b && isDefault)) { redundant.add(c); report[c.pk.file].redundantes++; } else excluded.delete(c.e);
  }
  let tot = 0, keep = 0;
  console.log('paquete'.padEnd(22), 'escritas repetidas redundantes aportan');
  for (const [f, r] of Object.entries(report)) {
    r.aportan = r.escritas - r.repetidaOtraSub - r.redundantes;
    tot += r.escritas; keep += r.aportan;
    console.log(f.padEnd(22), String(r.escritas).padStart(7), String(r.repetidaOtraSub).padStart(8), String(r.redundantes).padStart(11), String(r.aportan).padStart(7));
  }
  console.log('TOTAL'.padEnd(22), String(tot).padStart(7), ''.padStart(8), ''.padStart(11), String(keep).padStart(7));
  if (cmd === 'prune' && !dry) {
    for (const pk of packs) {
      for (const sub of Object.keys(pk.data)) {
        pk.data[sub] = pk.data[sub].filter((k) => !cands.some((c) => c.pk === pk && c.sub === sub && c.k === k && (c.dead || redundant.has(c))));
      }
      writePack(pk);
    }
    console.log('paquetes reescritos sin las palabras que no aportan');
  }
  if (process.argv.includes('--list')) for (const c of cands.filter((x) => x.dead || redundant.has(x))) console.log(c.dead ? 'REPETIDA ' : 'REDUNDANTE', c.pk.file, c.sub, '«' + c.k + '»', c.dead && c.e ? '→ ' + c.e.subcategoryId : '');
} else if (cmd === 'resolve') {
  // Palabras repetidas entre subcategorías de la misma categoría: gana la primera del catálogo, que
  // no siempre es la correcta. Política: (1) la subcategoría NUEVA se queda con la palabra y se quita
  // de la vieja; (2) entre vieja y paquete nuevo gana la vieja (el paquete no le roba nada).
  const NEW_SUBS = new Set(['tax_income', 'tax_property', 'tax_vehicle', 'tax_procedures', 'tax_legal', 'tax_accounting', 'tax_fines', 'tax_social', 'fee_bank', 'fee_fx',
    'house_domestic', 'misc_work', 'ent_gambling', 'life_partner', 'life_children', 'life_funeral', 'health_hospital', 'health_homecare', 'health_equipment', 'health_life_insurance',
    'inc_reimbursement', 'inc_rental', 'inc_support', 'debt_interest', 'debt_bnpl', 'sav_tax_reserve', 'sav_group', 'sav_kids', 'inv_metals', 'inv_forex', 'edu_exams']);
  const ORIGINAL_PACKS = new Set(['base.ts']);
  // decisiones tomadas a mano (la política de abajo no alcanza)
  const PREFER = { 'expense|terapia de pareja': 'health_mental', 'expense|renta de scooter': 'trans_bikeshare', 'expense|cuota del club de golf': 'life_social_clubs', 'expense|cerradura nueva': 'house_security', 'expense|fruta y verdura': 'food_supermarket', 'expense|frutas y verduras': 'food_supermarket', 'expense|uniformes escolares': 'edu_supplies', 'expense|uniforme escolar': 'edu_supplies', 'expense|vitamina c': 'health_supplements', 'expense|consejeria de pareja': 'health_mental', 'expense|consejeria matrimonial': 'health_mental', 'expense|bordado': 'ent_hobbies', 'expense|cartas de magic': 'ent_hobbies', 'expense|timbre inteligente': 'house_security', 'expense|cerradura inteligente': 'house_security', 'expense|aspiradora robot': 'house_appliances', 'expense|robot aspiradora': 'house_appliances', 'expense|cafeteras': 'house_appliances', 'expense|cafetera de goteo': 'house_appliances', 'expense|cafetera italiana': 'house_appliances', 'expense|cafetera oster': 'house_appliances', 'expense|sandwichera': 'house_appliances', 'expense|dispensador de agua': 'house_appliances', 'expense|instalacion de alarma': 'house_security', 'expense|lavado de tapiceria': 'house_laundry_service', 'expense|ukulele': 'ent_hobbies', 'expense|ukelele': 'ent_hobbies', 'expense|domino': 'ent_billiards', 'expense|disney': 'ent_streaming', 'expense|taller de fotografia': 'ent_photography', 'expense|coach de vida': 'life_self_improvement', 'expense|life coach': 'life_self_improvement', 'expense|transporte de la escuela': 'trans_school', 'expense|transporte de la prepa': 'trans_school', 'expense|transporte de la universidad': 'trans_school', 'expense|servicio de transporte escolar': 'trans_school', 'expense|bajaj': 'trans_mototaxi', 'expense|pague mis deudas': 'debt_other', 'expense|pague la cuenta pendiente': 'debt_other', 'expense|pague mi adeudo': 'debt_other', 'expense|pago de adeudo': 'debt_other', 'expense|abono al adeudo': 'debt_other', 'expense|abono de la ortodoncia': 'debt_medical', 'expense|abono de los brackets': 'debt_medical', 'expense|abono del dentista': 'debt_medical', 'income|rendimientos de mis inversiones': 'inc_investments', 'expense|sanborns': 'food_restaurant', 'expense|tianguis': 'food_market', 'expense|outlet': 'misc_shopping', 'expense|dia de spa': 'misc_wellness', 'expense|circuito de spa': 'misc_wellness', 'expense|circuito hidrotermal': 'misc_wellness', 'expense|temazcal medicinal': 'misc_wellness', 'expense|retiro de meditacion': 'misc_wellness', 'expense|retiro de yoga': 'misc_wellness', 'expense|natura': 'misc_personal_care', 'expense|protector solar facial': 'misc_personal_care', 'expense|desodorantes': 'health_hygiene', 'expense|crema corporal': 'health_hygiene', 'expense|crema para manos': 'health_hygiene', 'expense|crema para pies': 'health_hygiene', 'expense|locion corporal': 'health_hygiene', 'expense|gel de bano': 'health_hygiene', 'expense|costo de envio': 'food_delivery', 'expense|cargo por envio': 'food_delivery', 'expense|compra grande': 'food_supermarket', 'expense|panini': 'food_coffee', 'expense|reebok': 'misc_clothing', 'expense|new balance': 'misc_clothing', 'expense|skechers': 'misc_clothing', 'expense|suburbia': 'misc_clothing', 'expense|walmart en linea': 'food_delivery', 'savings|ahorro para la luna de miel': 'sav_wedding_fund', 'income|bono de puntualidad': 'inc_bonus', 'income|bono de asistencia': 'inc_bonus', 'income|ingresos de mi negocio': 'inc_sales', 'investments|bonos del gobierno': 'inv_bonds', 'investments|bonos gubernamentales': 'inv_bonds', 'investments|bonos de gobierno': 'inv_bonds', 'investments|bonos del gobierno de mexico': 'inv_bonds', 'investments|finsus inversion': 'inv_cetes', 'investments|inversion en finsus': 'inv_cetes', 'expense|laptop para la escuela': 'edu_supplies', 'expense|curso de cocina': 'edu_courses', 'expense|cuota de la escuela': 'edu_tuition', 'expense|sat': 'tax_income', 'expense|feria': 'ent_amusement', 'expense|ferias': 'ent_amusement', 'expense|la feria': 'ent_amusement', 'expense|escapada de fin de semana': 'life_experiences', 'expense|escapada': 'life_experiences', 'expense|tour gastronomico': 'life_experiences', 'expense|expo': 'ent_events', 'expense|cargo por servicio de boleto': 'ent_concerts', 'expense|strava premium': 'ent_subscriptions', 'expense|show de magia': 'life_celebration', 'expense|maleta de cabina': 'trans_flights', 'expense|maleta de mano': 'trans_flights', 'expense|viaje de luna de miel': 'life_wedding', 'expense|taller de pintura': 'life_experiences', 'expense|noche buena': 'life_celebration', 'expense|pinata para la fiesta': 'life_celebration', 'expense|seguro funerario': 'health_life_insurance', 'expense|seguro de gastos funerarios': 'health_life_insurance', 'expense|suplementos alimenticios': 'health_supplements', 'expense|naturista': 'health_supplements', 'expense|espirulina': 'health_supplements', 'expense|chlorella': 'health_supplements', 'expense|moringa': 'health_supplements', 'expense|maca': 'health_supplements', 'expense|curcuma': 'health_supplements', 'expense|ashwagandha': 'health_supplements', 'expense|colageno hidrolizado': 'health_supplements', 'expense|omega-3': 'health_supplements', 'expense|probiotico': 'health_supplements', 'expense|prebioticos': 'health_supplements', 'expense|psyllium': 'health_supplements', 'expense|cuenta del hospital': 'debt_medical', 'expense|purificador de aire': 'house_appliances', 'expense|humidificador': 'house_appliances', 'expense|clinica': 'health_doctor', 'expense|honorarios medicos': 'health_doctor', 'expense|consulta de psiquiatria': 'health_mental', 'expense|electrolit': 'food_supermarket', 'expense|suero oral': 'health_pharmacy', 'expense|fibra': 'health_supplements', 'expense|rappi farmacia': 'food_delivery', 'expense|inmovilizador': 'tax_fines', 'expense|palomitas': 'food_snacks', 'expense|polleria': 'food_supermarket', 'expense|tortillas de harina': 'food_supermarket', 'expense|danonino': 'food_snacks', 'expense|cacahuates japoneses': 'food_snacks', 'expense|botana': 'food_snacks', 'expense|botanas': 'food_snacks', 'expense|botanitas': 'food_snacks', 'expense|chocolate abuelita': 'food_sweets', 'expense|leche de avena': 'food_organic', 'expense|leche de almendra': 'food_organic', 'expense|leche de soya': 'food_organic', 'expense|leche de coco': 'food_organic', 'expense|cuernito': 'food_bakery', 'expense|cuernitos': 'food_bakery', 'expense|pay de limon': 'food_bakery', 'expense|bar': 'ent_clubs', 'expense|tianguis de comida': 'food_market', 'expense|mercado de comida': 'food_market', 'expense|pan de elote': 'food_bakery', 'expense|cacahuates enchilados': 'food_snacks', 'expense|cita para el imss': 'tax_social', 'expense|cita para el issste': 'tax_social', 'expense|cita para la afore': 'tax_social', 'expense|mantecadas': 'food_bakery', 'expense|cita para el infonavit': 'tax_social', 'expense|remesa': 'life_family_support', 'expense|remesas': 'life_family_support', 'expense|deposito de garantia': 'house_rent', 'expense|deposito del departamento': 'house_rent', 'expense|deposito de renta': 'house_rent', 'expense|roomie': 'house_rent',
    'expense|prestamo para estudiar': 'debt_student', 'expense|credito de la moto': 'debt_car_loan', 'expense|mensualidad de la moto': 'debt_car_loan', 'expense|abono de la moto': 'debt_car_loan', 'expense|credito para la moto': 'debt_car_loan' };
  const catsPath = path.join(__dirname, '../../src/data/categories.ts');
  let catsSrc = fs.readFileSync(catsPath, 'utf8');
  const packs = packFiles.map(loadPack);
  const where = new Map(); // key cat|n -> [{sub, src, k}]
  const fam = (cat) => (['income', 'savings', 'investments'].includes(cat) ? cat : 'expense');
  const add = (sub, src, k) => { const cat = subToCat.get(sub); const key = fam(cat) + '|' + P.normalize(k); if (!where.has(key)) where.set(key, []); where.get(key).push({ sub, src, k }); };
  for (const c of D) for (const sb of c.subcategories) for (const k of sb.keywords) {
    // ¿viene de un paquete o de categories.ts? se distingue abajo con el contenido de los paquetes
    add(sb.id, 'cat', k);
  }
  const packHas = new Map(); for (const pk of packs) for (const [sub, kws] of Object.entries(pk.data)) for (const k of kws) packHas.set(pk.file + '|' + sub + '|' + k, true);
  const actions = []; const manual = [];
  for (const [key, list] of where) {
    const subs = [...new Set(list.map((x) => x.sub))];
    if (subs.length < 2) continue;
    const isNew = subs.filter((x) => NEW_SUBS.has(x));
    const winner = PREFER[key] || (isNew.length === 1 ? isNew[0] : null);
    if (winner) { for (const x of list.filter((y) => y.sub !== winner)) actions.push({ ...x, why: 'la subcategoría nueva ' + winner + ' se la queda' }); continue; }
    // vieja vs. paquete: gana la que NO viene de un paquete nuevo
    const fromNewPack = (x) => packs.some((pk) => !ORIGINAL_PACKS.has(pk.file) && (pk.data[x.sub] || []).some((k) => P.normalize(k) === key.split('|')[1]));
    const olds = list.filter((x) => !fromNewPack(x)); const news = list.filter(fromNewPack);
    if (olds.length && news.length && new Set(olds.map((x) => x.sub)).size === 1) { for (const x of news.filter((y) => y.sub !== olds[0].sub)) actions.push({ ...x, why: 'la palabra ya era de ' + olds[0].sub }); continue; }
    manual.push({ key, subs });
  }
  const seen = new Set(); let removed = 0;
  for (const a of actions) {
    const id = a.sub + '|' + P.normalize(a.k); if (seen.has(id)) continue; seen.add(id);
    if (dry) { console.log('quitar de', a.sub.padEnd(22), '«' + a.k + '» —', a.why); continue; }
    // paquetes
    for (const pk of packs) { const arr = pk.data[a.sub]; if (arr) { const n = arr.length; pk.data[a.sub] = arr.filter((k) => P.normalize(k) !== P.normalize(a.k)); if (pk.data[a.sub].length !== n) { pk.dirty = true; removed++; } } }
    // categories.ts (palabras base de la subcategoría)
    const at = catsSrc.indexOf("id: '" + a.sub + "'"); if (at >= 0) {
      const ks = catsSrc.indexOf('keywords: [', at); const ke = catsSrc.indexOf(']', ks);
      const block = catsSrc.slice(ks, ke); const nb = block.replace(new RegExp("'" + a.k.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + "',?\\s*"), '');
      if (nb !== block) { catsSrc = catsSrc.slice(0, ks) + nb + catsSrc.slice(ke); removed++; }
    }
  }
  if (!dry) { for (const pk of packs) if (pk.dirty) writePack(pk); fs.writeFileSync(catsPath, catsSrc); console.log('palabras quitadas de la subcategoría equivocada:', removed); }
  else console.log('acciones:', seen.size);
  console.log('\nSIN RESOLVER (revisar a mano):'); for (const m of manual) console.log('  ', m.key, '→', m.subs.join(' | '));
} else {
  console.log('uso: node scripts/golden/packs.cjs format|prune [--dry]|resolve [--dry] [--include-base] [--list]|stats');
}

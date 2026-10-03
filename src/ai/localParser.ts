import { DEFAULT_CATEGORIES } from '@/data/categories';
import type { Currency, TransactionType } from '@/data/types';

// Intérprete local de lenguaje natural — Fase 1.
// Cubre los patrones más comunes del spec (monto + categoría + comercio)
// sin depender de una API externa todavía. En Fase 3 esto se sustituye o se
// complementa con Claude para cobertura completa de lenguaje natural,
// aprendizaje de preferencias y manejo de errores de pronunciación.
// Regla del spec: si falta información crítica, se debe preguntar — nunca
// inventar el dato (sección 39-42).

export interface ParsedCapture {
  type: TransactionType;
  amount: number | null;
  currency: Currency;
  categoryId: string | null;
  subcategoryId: string | null;
  merchant?: string;
  missing: Array<'amount' | 'category'>;
  rawText: string;
  // Cuenta asignada al guardar (tarjeta de transporte, cuenta destino de
  // presupuesto o efectivo de respaldo) — se llena en app/capture.tsx,
  // nunca aquí, porque el parser no conoce las cuentas del usuario.
  accountId?: string;
}

// Vocabulario para armar números DICTADOS EN PALABRAS, incluyendo números
// compuestos ("cincuenta y cinco" = 55, "ciento veinte" = 120, "mil
// quinientos" = 1500) — antes solo se reconocía una palabra suelta, así
// que "cincuenta y cinco pesos" se leía como 50, no 55 (catálogo v7,
// módulo text-to-number).
const UNITS: Record<string, number> = {
  cero: 0,
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
};
const TEENS: Record<string, number> = {
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
};
const TWENTIES: Record<string, number> = {
  veinte: 20,
  veintiuno: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
};
const TENS: Record<string, number> = {
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
};
const HUNDREDS: Record<string, number> = {
  cien: 100,
  ciento: 100,
  cientos: 100,
  doscientos: 200,
  trescientos: 300,
  cuatrocientos: 400,
  quinientos: 500,
  seiscientos: 600,
  setecientos: 700,
  ochocientos: 800,
  novecientos: 900,
};

// "un"/"uno"/"una" solos son casi siempre un artículo ("un café"), no una
// cantidad — solo cuentan como monto si están pegados a una palabra de
// moneda ("un peso"), nunca como número suelto en medio de una frase.
const ARTICLE_AMBIGUOUS = new Set(['un', 'uno', 'una']);
const CURRENCY_WORDS = new Set(['peso', 'pesos', 'pesitos', 'dolar', 'dolares', 'usd', 'mxn', 'dls', 'dlls', 'varos', 'baros']);

const NUMBER_WORD_TOKENS = new Set<string>([
  'y',
  ...Object.keys(UNITS),
  ...Object.keys(TEENS),
  ...Object.keys(TWENTIES),
  ...Object.keys(TENS),
  ...Object.keys(HUNDREDS),
  'mil',
]);

// Convierte una racha de palabras numéricas ya identificada (ej.
// ['doscientos','cincuenta','y','cinco']) a su valor (255). Devuelve null
// si la racha no forma un número válido — nunca inventa un valor a medias.
function wordRunToNumber(run: string[]): number | null {
  let total = 0;
  let current = 0;
  let matchedAny = false;
  for (const w of run) {
    if (w === 'y') continue;
    if (HUNDREDS[w] !== undefined) {
      current += HUNDREDS[w];
    } else if (TENS[w] !== undefined) {
      current += TENS[w];
    } else if (TWENTIES[w] !== undefined) {
      current += TWENTIES[w];
    } else if (TEENS[w] !== undefined) {
      current += TEENS[w];
    } else if (UNITS[w] !== undefined) {
      current += UNITS[w];
    } else if (w === 'mil') {
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
    } else {
      continue;
    }
    matchedAny = true;
  }
  return matchedAny ? total + current : null;
}

interface AmountCandidate {
  value: number;
  tokenIndex: number; // índice del último token que forma este número
}

// Encuentra todas las cantidades escritas en palabras dentro de una lista
// de tokens ya normalizados, junto con en qué posición terminan (para
// poder ver qué palabra sigue después, ej. "pesos").
function findWordNumberCandidates(tokens: string[]): AmountCandidate[] {
  const candidates: AmountCandidate[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (!NUMBER_WORD_TOKENS.has(tokens[i]) || tokens[i] === 'y') {
      i++;
      continue;
    }
    let j = i;
    while (j < tokens.length && NUMBER_WORD_TOKENS.has(tokens[j])) {
      // "y" solo cuenta si sigue otra palabra numérica después (no al
      // final de la racha, ej. "cincuenta y" solo sin nada más).
      if (tokens[j] === 'y' && !(j + 1 < tokens.length && NUMBER_WORD_TOKENS.has(tokens[j + 1]) && tokens[j + 1] !== 'y')) break;
      j++;
    }
    const run = tokens.slice(i, j);
    const value = wordRunToNumber(run);
    if (value !== null) {
      const isAmbiguousArticle = run.length === 1 && ARTICLE_AMBIGUOUS.has(run[0]);
      const nextToken = tokens[j];
      if (!isAmbiguousArticle || CURRENCY_WORDS.has(nextToken)) {
        candidates.push({ value, tokenIndex: j - 1 });
      }
    }
    i = j;
  }
  return candidates;
}

// Normaliza a minúsculas, sin acentos y sin puntuación — así "café", "CAFÉ"
// y "cafe." (como suele transcribir voz-a-texto) comparan igual. Se aplica
// tanto al texto dictado como a cada palabra clave del catálogo antes de
// buscar coincidencias (spec: "normalizar el string: lowercase, eliminar
// acentos, puntos y comas").
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,;:!¡¿?"'()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Coincidencia por LÍMITE DE PALABRA, no por subcadena cruda — un
// `.includes()` simple deja que "renta" (Alojamiento) dispare con
// cualquier monto en "cuaRENTA" pesos, o que "agua" (Alojamiento) dispare
// con "AGUAkate" — ambos números/palabras reales, no la categoría (bug
// descubierto al probar el catálogo v7, ya existía antes de estos cambios).
function containsKeywordAsWord(normalizedText: string, normalizedKeyword: string): boolean {
  const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`).test(normalizedText);
}

// Distancia de edición (Levenshtein): cuántos cambios de un carácter
// (insertar, borrar, sustituir) hacen falta para convertir "a" en "b". Se
// usa para tolerar errores de dictado/tecleo (ej. "totillas" vs
// "tortillas") sin inventar coincidencias con palabras que de verdad son
// distintas (catálogo v7, corrección difusa).
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[n];
}

// Palabras tan genéricas que nunca deberían ganarle a una palabra específica:
// "compré el pan" es Panadería, no Compras; "comida del perro" es Mascotas.
// Solo cuentan si no hay NINGUNA otra coincidencia.
const WEAK_KEYWORDS = new Set([
  'compre', 'compras', 'comida', 'tienda', 'pago', 'servicio', 'servicios',
  'boleto', 'boletos', 'ahorre', 'guarde', 'ahorro', 'ahorros', 'inverti', 'inversion', 'invertir', 'ingreso', 'ingresos',
  'pasaje', 'pasajes', 'suscripcion', 'suscripciones', 'membresia', 'membresias',
]);

const KNOWN_MERCHANTS: Array<{ name: string; keyword: string; categoryId: string; subcategoryId: string }> = [
  { name: 'Starbucks', keyword: 'starbucks', categoryId: 'food', subcategoryId: 'food_coffee' },
  { name: 'Netflix', keyword: 'netflix', categoryId: 'entertainment', subcategoryId: 'ent_streaming' },
  { name: 'Uber', keyword: 'uber', categoryId: 'transport', subcategoryId: 'trans_uber' },
  { name: 'DiDi', keyword: 'didi', categoryId: 'transport', subcategoryId: 'trans_didi' },
  { name: 'Spotify', keyword: 'spotify', categoryId: 'entertainment', subcategoryId: 'ent_streaming' },
];

interface KeywordEntry {
  kw: string; // normalizada
  categoryId: string;
  subcategoryId: string;
  score: number;
}

// Plural/singular de la última palabra ("cines"↔"cine", "inscripciones"↔
// "inscripcion"). Solo número, nunca género: bolsa↔bolso, cuenta↔cuento son
// palabras distintas y mezclarlas clasificaría mal.
function numberVariants(kw: string): string[] {
  const parts = kw.split(' ');
  const w = parts[parts.length - 1];
  const out = new Set<string>();
  if (w.length >= 4 && /^[a-z]+$/.test(w)) {
    if (w.endsWith('s')) {
      if (w.length >= 5) out.add(w.slice(0, -1));
      if (w.endsWith('es') && w.length >= 7) out.add(w.slice(0, -2));
    } else if (/[aeiou]$/.test(w)) out.add(w + 's');
    else if (w.endsWith('z')) out.add(w.slice(0, -1) + 'ces');
    else out.add(w + 'es');
  }
  return [...out].map((v) => [...parts.slice(0, -1), v].join(' '));
}

// Índice único: catálogo (en orden, para desempates) + comercios + variantes.
// Se arma una vez; así cada frase solo recorre una lista ya normalizada.
let keywordIndex: KeywordEntry[] | null = null;
function getKeywordIndex(): KeywordEntry[] {
  if (keywordIndex) return keywordIndex;
  const seen = new Set<string>();
  const out: KeywordEntry[] = [];
  const push = (kw: string, categoryId: string, subcategoryId: string) => {
    const n = normalize(kw);
    // misma palabra puede vivir en categorías distintas (p. ej. "bono": ingreso e inversión);
    // el tipo de movimiento decide cuál aplica. Dentro de una categoría gana la primera.
    const key = `${n}|${categoryId}`;
    if (n.length <= 2 || seen.has(key)) return;
    seen.add(key);
    out.push({ kw: n, categoryId, subcategoryId, score: WEAK_KEYWORDS.has(n) ? 1 : n.length });
  };
  for (const category of DEFAULT_CATEGORIES) {
    for (const sub of category.subcategories) {
      for (const kw of sub.keywords) push(kw, category.id, sub.id);
    }
  }
  for (const m of KNOWN_MERCHANTS) push(m.keyword, m.categoryId, m.subcategoryId);
  // variantes después de TODAS las exactas: nunca le quitan una palabra a otra subcategoría
  for (const e of [...out]) {
    for (const v of numberVariants(e.kw)) push(v, e.categoryId, e.subcategoryId);
  }
  keywordIndex = out;
  return out;
}

// Qué categorías tienen sentido según el tipo de movimiento: un gasto nunca se
// clasifica como "Sueldo" ni como "Ahorro", y un ahorro nunca como "Café".
function categoryAllowed(type: TransactionType, categoryId: string): boolean {
  if (type === 'income') return categoryId === 'income';
  if (type === 'saving') return categoryId === 'savings';
  if (type === 'investment_buy') return categoryId === 'investments';
  return categoryId !== 'income' && categoryId !== 'savings' && categoryId !== 'investments';
}

// Solo se corrigen palabras sueltas de al menos 6 letras (una frase de
// varias palabras, o una palabra corta con typo, son demasiado riesgosas
// de adivinar — ej. "chicle" a 1 letra de "chile" corrigiendo mal hacia
// una categoría distinta) y con una distancia de edición chica en
// proporción a su largo — igual que el umbral de similitud ~0.80 del spec.
const FUZZY_MIN_KEYWORD_LENGTH = 7;

// Typos dentro de una FRASE ("reparasion de celular" → "reparación de celular"):
// la ventana de palabras debe coincidir salvo UNA palabra larga con una letra de
// diferencia. Compite contra las coincidencias exactas por largo, porque una
// frase casi exacta es mejor señal que una palabra suelta exacta ("celular").
function fuzzyPhraseMatch(tokens: string[], type: TransactionType): KeywordEntry | null {
  let best: KeywordEntry | null = null;
  for (const e of getKeywordIndex()) {
    if (e.score === 1 || !e.kw.includes(' ') || (best && e.score <= best.score)) continue;
    if (!categoryAllowed(type, e.categoryId)) continue;
    const words = e.kw.split(' ');
    if (words.length > tokens.length) continue;
    for (let i = 0; i + words.length <= tokens.length; i++) {
      let diffs = 0;
      let ok = true;
      for (let j = 0; j < words.length && ok; j++) {
        const a = tokens[i + j];
        const b = words[j];
        if (a === b) continue;
        if (a.length >= 6 && b.length >= 6 && a[0] === b[0] && Math.abs(a.length - b.length) <= 1 && levenshteinDistance(a, b) === 1) diffs++;
        else ok = false;
      }
      if (ok && diffs === 1) {
        best = e;
        break;
      }
    }
  }
  return best;
}

function fuzzyMatchCategory(tokens: string[], type: TransactionType): { categoryId: string; subcategoryId: string } | null {
  let best: { categoryId: string; subcategoryId: string; distance: number } | null = null;
  for (const e of getKeywordIndex()) {
    if (e.kw.includes(' ') || e.kw.length < FUZZY_MIN_KEYWORD_LENGTH || e.score === 1) continue;
    if (!categoryAllowed(type, e.categoryId)) continue;
    const maxAllowed = e.kw.length <= 10 ? 1 : 2;
    for (const tok of tokens) {
      if (tok.length < FUZZY_MIN_KEYWORD_LENGTH || Math.abs(tok.length - e.kw.length) > maxAllowed) continue;
      const distance = levenshteinDistance(tok, e.kw);
      if (distance > 0 && distance <= maxAllowed && (!best || distance < best.distance)) {
        best = { categoryId: e.categoryId, subcategoryId: e.subcategoryId, distance };
      }
    }
  }
  return best ? { categoryId: best.categoryId, subcategoryId: best.subcategoryId } : null;
}

// "gas" a secas está en las palabras clave tanto de Transporte→Gasolina
// como de Alojamiento→Gas — sin esta regla, cuál gana era cosa del orden
// del catálogo, no de lo que la persona quiso decir. Se usa el resto de la
// frase para desempatar (catálogo v7, matriz de inferencia contextual).
const GAS_CAR_CONTEXT = ['magna', 'premium', 'diesel', 'gasolinera', 'coche', 'carro', 'auto', 'camioneta', 'tanque lleno', 'litros'];
const GAS_HOME_CONTEXT = ['lp', 'cilindro', 'natural', 'naturgy', 'casa', 'estufa', 'boiler', 'calentador', 'tanque estacionario', 'pipa', 'depa', 'departamento'];

function disambiguateGas(normalizedText: string): { categoryId: string; subcategoryId: string } | 'ambiguous' | null {
  if (!/\bgas\b/.test(normalizedText)) return null;
  const hasCarContext = GAS_CAR_CONTEXT.some((w) => containsKeywordAsWord(normalizedText, w));
  const hasHomeContext = GAS_HOME_CONTEXT.some((w) => containsKeywordAsWord(normalizedText, w));
  if (hasCarContext && !hasHomeContext) return { categoryId: 'transport', subcategoryId: 'trans_gas' };
  if (hasHomeContext && !hasCarContext) return { categoryId: 'housing', subcategoryId: 'house_gas' };
  // "gas" sin ninguna pista: puede ser el del coche o el de la casa. Se pregunta,
  // no se adivina — salvo que otra palabra más específica de la frase decida.
  return 'ambiguous';
}

const DIGIT_TOKEN_RE = /^\$?(\d{1,3}(?:[,.]\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)$/;

// Tokeniza para buscar montos CONSERVANDO el punto y la coma que van dentro de
// un número ("$1,250.75", "824.5") — `normalize` los borra (sirve para palabras,
// pero partía "$1,301" en "1" y "301" y se leía como 1 peso).
function amountTokens(text: string): string[] {
  const t = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[;:!¡¿?"'()]/g, ' ')
    .replace(/[.,](?=\s|$)/g, ' ')
    .replace(/([^\d\s])[.,]/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
  return t.split(' ').filter(Boolean);
}

const WORD_UNITS = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const WORD_TEENS = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve'];
const WORD_TWENTIES = ['veinte', 'veintiuno', 'veintidos', 'veintitres', 'veinticuatro', 'veinticinco', 'veintiseis', 'veintisiete', 'veintiocho', 'veintinueve'];
const WORD_TENS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const WORD_HUNDREDS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

// 1..999 como palabras ya normalizadas — para convertir "5 mil" en "cinco mil".
function intToWordTokens(n: number): string[] {
  const out: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0) out.push(n === 100 ? 'cien' : WORD_HUNDREDS[h]);
  if (rest === 0) return out;
  if (rest < 10) out.push(WORD_UNITS[rest]);
  else if (rest < 20) out.push(WORD_TEENS[rest - 10]);
  else if (rest < 30) out.push(WORD_TWENTIES[rest - 20]);
  else {
    out.push(WORD_TENS[Math.floor(rest / 10)]);
    if (rest % 10) out.push('y', WORD_UNITS[rest % 10]);
  }
  return out;
}

// "5 mil" -> "cinco mil", "dos lucas" -> "dos mil", "5k" -> 5000. Así el resto
// del motor solo tiene que entender números en palabras.
function expandThousands(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const next = tokens[i + 1];
    if (/^\d{1,3}$/.test(tok) && (next === 'mil' || next === 'luca' || next === 'lucas')) {
      const n = parseInt(tok, 10);
      if (n >= 1 && n <= 999) {
        out.push(...intToWordTokens(n));
        continue;
      }
    }
    if (tok === 'luca' || tok === 'lucas') {
      out.push('mil');
      continue;
    }
    const k = tok.match(/^\$?(\d+(?:\.\d+)?)k$/);
    if (k) {
      out.push(String(parseFloat(k[1]) * 1000));
      continue;
    }
    out.push(tok);
  }
  return out;
}

// Extrae el monto de la frase dictada/escrita, aceptando dígitos ("50",
// "$1,500", "824.5") y números en palabras ("cincuenta y cinco", "5 mil").
// Con más de un número en la frase (cantidad + precio: "3 tacos 60", "medio
// kilo de huevo por cuarenta pesos") se prefiere el pegado a una palabra de
// moneda; si no hay, el MAYOR — el precio casi siempre es mayor que la cantidad.
export function extractAmount(text: string): number | null {
  const tokens = expandThousands(amountTokens(text));
  const candidates: AmountCandidate[] = [];

  tokens.forEach((tok, idx) => {
    const digitMatch = tok.match(DIGIT_TOKEN_RE);
    if (digitMatch) {
      const value = parseFloat(digitMatch[1].replace(/,/g, ''));
      if (!Number.isNaN(value)) candidates.push({ value, tokenIndex: idx });
    }
  });
  candidates.push(...findWordNumberCandidates(tokens));

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].value;

  const nearCurrency = candidates.filter((c) => CURRENCY_WORDS.has(tokens[c.tokenIndex + 1]) || CURRENCY_WORDS.has(tokens[c.tokenIndex + 2]));
  if (nearCurrency.length > 0) return nearCurrency[0].value;

  return Math.max(...candidates.map((c) => c.value));
}

function extractCurrency(text: string): Currency {
  const lower = text.toLowerCase();
  if (/(d[óo]lar|\busd\b|u\$d|\bdlls?\b|\bdls\b)/.test(lower)) {
    return 'USD';
  }
  return 'MXN';
}

// Verbos de gasto: si aparecen, palabras como "nómina" o "sueldo" son lo que se
// PAGA ("pagué la nómina de mi empleada", "préstamo de nómina"), no un ingreso.
const EXPENSE_VERBS_RE = /\b(pague|pagamos|gaste|gastamos|compre|compramos|abone|abono|presta|prestamo|credito)\b/;

function extractType(text: string): TransactionType {
  const t = normalize(text);
  if (
    /\binvert(i|imos|ido)\b/.test(t) ||
    /\b(compre|compramos)\b.*\b(accion|acciones|etf|etfs|cetes|bono|bonos|bitcoin|btc|ethereum|eth|cripto|criptos|criptomonedas|fibra|fibras|udibonos)\b/.test(t) ||
    /\b(meti|metimos|puse)\b.*\b(cetes|cetesdirecto|gbm|bolsa|bitso|binance|etf)\b/.test(t)
  ) {
    return 'investment_buy';
  }
  if (
    /\b(ahorre|ahorramos|guarde|guardamos|aparte|separe)\b/.test(t) ||
    /\b(meti|metimos|aporte|aportamos|puse|deposite)\b.*\b(ahorro|ahorros|fondo|meta|metas|afore|retiro|ppr)\b/.test(t)
  ) {
    return 'saving';
  }
  if (
    /\bme (pagaron|pago|depositaron|deposito|transfirieron|abonaron|regalaron)\b/.test(t) ||
    /\bme (dieron|llego|llegaron|cayo|cayeron)\b.*\b(sueldo|salario|nomina|quincena|aguinaldo|bono|mesada|utilidades|ptu|intereses|dividendos|pago)\b/.test(t) ||
    /\b(cobre|cobramos|recibi|recibimos|vendi|vendimos)\b/.test(t) ||
    /\bingreso\b/.test(t) ||
    (!EXPENSE_VERBS_RE.test(t) && /\b(sueldo|salario|nomina|aguinaldo|quincena|mesada|dividendo|dividendos|rendimiento|rendimientos|bono|ptu|finiquito|gratificacion)\b/.test(t))
  ) {
    return 'income';
  }
  return 'expense';
}

function extractCategory(text: string, type: TransactionType): { categoryId: string | null; subcategoryId: string | null; merchant?: string } {
  const normalizedText = normalize(text);
  const padded = ` ${normalizedText} `;

  let gasAmbiguous = false;
  if (type === 'expense') {
    const gas = disambiguateGas(normalizedText);
    if (gas === 'ambiguous') gasAmbiguous = true;
    else if (gas) return gas;
  }

  // La palabra clave más larga que coincida gana — así "barbacoa" (comida
  // rápida) no se confunde con la coincidencia parcial más corta "bar"
  // (discotecas) que también aparece dentro de esa palabra. Las palabras
  // genéricas (WEAK_KEYWORDS) valen 1: solo ganan si no hay nada mejor.
  let best: KeywordEntry | null = null;
  for (const e of getKeywordIndex()) {
    if (!categoryAllowed(type, e.categoryId)) continue;
    if (gasAmbiguous && e.kw === 'gas') continue;
    if (best && e.score <= best.score) continue;
    if (padded.includes(` ${e.kw} `)) best = e;
  }

  const phrase = fuzzyPhraseMatch(normalizedText.split(' ').filter(Boolean), type);
  if (phrase && (!best || phrase.score - 1 > best.score)) best = phrase;

  if (gasAmbiguous && (!best || best.score === 1)) return { categoryId: null, subcategoryId: null };

  if (best) {
    const bestKw = best.kw;
    const merchant = KNOWN_MERCHANTS.find((m) => normalize(m.keyword) === bestKw)?.name;
    return { categoryId: best.categoryId, subcategoryId: best.subcategoryId, merchant };
  }

  // Sin coincidencia exacta: se intenta con tolerancia a errores de
  // dictado/tecleo antes de rendirse y pedirle la categoría a la persona.
  const fuzzy = fuzzyMatchCategory(normalizedText.split(' ').filter(Boolean), type);
  if (fuzzy) return fuzzy;

  // El tipo de movimiento ya dice a qué familia pertenece: un ingreso sin más pistas
  // es "Ingresos › Otros", no una pregunta. Solo los gastos piden categoría.
  if (type === 'income') return { categoryId: 'income', subcategoryId: 'inc_other' };
  if (type === 'saving') return { categoryId: 'savings', subcategoryId: 'sav_other' };
  if (type === 'investment_buy') return { categoryId: 'investments', subcategoryId: 'inv_other' };

  return { categoryId: null, subcategoryId: null };
}

export interface CustomCategoryMapping {
  categoryId: string;
  subcategoryId: string;
  updatedAt: string; // ISO — la corrección más reciente gana si dos se pisan
}

// Conectores/verbos comunes que NUNCA deben aprenderse como pista de
// categoría, aunque sobrevivan al filtro de longitud — sin esto, "tengo"
// o "compré" terminarían "enseñando" una categoría falsa la próxima vez
// que aparezcan en cualquier frase (catálogo v7, memoria de mapeo personal).
const LEARNING_STOPWORDS = new Set([
  'para', 'esta', 'este', 'estas', 'estos', 'esas', 'esos', 'pero',
  'como', 'cuando', 'donde', 'porque', 'tambien', 'ademas', 'entonces',
  'hoy', 'ayer', 'manana', 'siempre', 'nunca', 'ahora', 'luego', 'otra', 'otro',
  'compre', 'compré', 'pague', 'pagué', 'gaste', 'gasté', 'hice', 'fui',
  'tengo', 'necesito', 'quiero', 'creo',
]);

const MIN_LEARNABLE_WORD_LENGTH = 4;

// Palabras "con contenido" de una frase — quita números, moneda y
// conectores comunes, así solo queda lo que de verdad describe DE QUÉ es
// el gasto. Se usa tanto para aprender (guardar la corrección) como para
// aplicar lo ya aprendido (buscar esas mismas palabras la próxima vez).
export function extractLearnableKeywords(text: string): string[] {
  const tokens = normalize(text).split(' ').filter(Boolean);
  const out: string[] = [];
  for (const tok of tokens) {
    if (tok.length < MIN_LEARNABLE_WORD_LENGTH) continue;
    if (NUMBER_WORD_TOKENS.has(tok) || CURRENCY_WORDS.has(tok) || LEARNING_STOPWORDS.has(tok)) continue;
    if (!out.includes(tok)) out.push(tok);
  }
  return out;
}

// Aplica lo que la persona ya enseñó antes (corrigió una categoría que
// VALU no supo adivinar sola). Tiene prioridad sobre el catálogo y sobre
// el proveedor de IA conectado — es SU manera de nombrar las cosas, más
// específica que cualquier palabra clave genérica (catálogo v7, pipeline
// paso 3: "mapeo personal", antes de volver a preguntar la categoría).
export function applyCustomMapping(result: ParsedCapture, mappings: Record<string, CustomCategoryMapping>): ParsedCapture {
  if (result.type !== 'expense' || Object.keys(mappings).length === 0) return result;
  for (const tok of extractLearnableKeywords(result.rawText)) {
    const mapping = mappings[tok];
    if (mapping) {
      return {
        ...result,
        categoryId: mapping.categoryId,
        subcategoryId: mapping.subcategoryId,
        missing: result.missing.filter((m) => m !== 'category'),
      };
    }
  }
  return result;
}

export type AccountAdjustmentDirection = 'increment' | 'decrement';

export interface AccountAdjustment {
  direction: AccountAdjustmentDirection;
  // Fragmento de texto con el nombre de cuenta mencionado ("Nu", "mi
  // Morralla", "BBVA") — se resuelve contra las cuentas reales del
  // usuario en app/capture.tsx, porque este archivo no las conoce.
  accountNameHint: string;
}

// Todas las formas comunes de decir "le entró dinero a esta cuenta" —
// verbo en infinitivo, imperativo (tú y con "-le"), y primera persona del
// pretérito, sin acentos (ya normalizado). "cayo"/"cayeron" cubre el uso
// coloquial "me cayeron 500 a mi Nu" (spec: catálogo v9, "verbos de
// incremento positivo", ampliado con muchas más variantes reales).
export const ACCOUNT_INCREMENT_WORDS = new Set([
  'agregar', 'agrega', 'agregale', 'agrego', 'agregue',
  'sumar', 'suma', 'sumale', 'sumo', 'sume',
  'depositar', 'deposita', 'depositale', 'deposito', 'deposite',
  'abonar', 'abona', 'abonale', 'abono', 'abone',
  'ingresar', 'ingresa', 'ingresale', 'ingreso', 'ingrese',
  'meter', 'mete', 'metele', 'meti',
  'echar', 'echa', 'echale', 'eche',
  'incrementar', 'incrementa', 'incrementale',
  'fondear', 'fondea', 'fondeale', 'fondeo', 'fondee',
  'anadir', 'anade', 'anadele',
  'cargar', 'carga', 'cargale',
  'recargar', 'recarga', 'recargale',
  'entraron', 'entro', 'entrando',
  'cayo', 'cayeron', 'cayendo',
]);

// Todas las formas comunes de decir "le sacaron dinero a esta cuenta" —
// sin traslape con verbos de gasto normal ("pagué", "gasté", "compré"),
// que deben seguir clasificándose como gasto de categoría, no como este
// ajuste genérico de saldo (spec: catálogo v9, "verbos de decremento
// negativo").
const ACCOUNT_DECREMENT_WORDS = new Set([
  'quitar', 'quita', 'quitale', 'quito', 'quite',
  'sacar', 'saca', 'sacale', 'saco', 'saque',
  'restar', 'resta', 'restale', 'resto', 'reste',
  'disminuir', 'disminuye', 'disminuyele', 'disminuyo',
  'retirar', 'retira', 'retirale', 'retiro', 'retire',
  'descontar', 'descuenta', 'descuentale', 'descuento', 'descuente',
  'bajale', 'baje',
  'reducir', 'reduce', 'reducele', 'reduzco',
]);

// Frase que de verdad nombra una cuenta ("a mi Nu", "de mi Morralla", "en
// mi BBVA", "a la tarjeta de Santander") — exigir esto ADEMÁS del verbo
// evita que una frase de gasto normal ("pagué 65 de café") se confunda
// con un ajuste de cuenta, porque un gasto normal no trae esta forma.
const ACCOUNT_REF_REGEX = /\b(?:(?:a|de|en)\s+)?(?:mi|la|el|tu)\s+([a-z0-9ñáéíóú][a-z0-9ñáéíóú\s]*?)(?=$|[.,;]| y | con )/;

// Detecta si la frase describe agregarle o quitarle dinero a una cuenta
// específica en vez de un gasto/ingreso categorizado normal — ej. "agrégale
// 500 a mi Nu" o "sácale 200 a mi Morralla". Devuelve null si no hay un
// verbo Y una cuenta mencionada con claridad; nunca adivina (catálogo v9).
// Antes del verbo, estas palabras lo vuelven SUSTANTIVO ("pagué el depósito de
// la renta", "mi retiro"), no la orden de mover dinero.
const NOUN_MARKERS = new Set(['el', 'un', 'mi', 'su', 'tu', 'del', 'al', 'este', 'ese', 'otro']);
// "ingreso 5000 de mi sueldo": el "mi X" es de dónde viene el dinero, no una cuenta.
const INCOME_SOURCE_WORDS = new Set(['sueldo', 'salario', 'nomina', 'quincena', 'trabajo', 'empresa', 'jefe', 'mama', 'papa', 'abuela', 'abuelo', 'cliente', 'pension', 'mesada', 'aguinaldo', 'bono']);

export function detectAccountAdjustment(rawText: string): AccountAdjustment | null {
  const normalized = normalize(rawText);
  const tokens = normalized.split(' ').filter(Boolean);
  const isVerbAt = (set: Set<string>, i: number) => set.has(tokens[i]) && !(i > 0 && NOUN_MARKERS.has(tokens[i - 1]));
  const hasIncrement = tokens.some((_, i) => isVerbAt(ACCOUNT_INCREMENT_WORDS, i));
  const hasDecrement = tokens.some((_, i) => isVerbAt(ACCOUNT_DECREMENT_WORDS, i));
  if (!hasIncrement && !hasDecrement) return null;

  const accountMatch = normalized.match(ACCOUNT_REF_REGEX);
  if (!accountMatch) return null;
  const accountNameHint = accountMatch[1].trim();
  if (accountNameHint.length < 2) return null;
  if (/\d/.test(accountNameHint) || INCOME_SOURCE_WORDS.has(accountNameHint.split(' ')[0])) return null;

  return { direction: hasIncrement ? 'increment' : 'decrement', accountNameHint };
}

// Divide una sola grabación/nota en varios movimientos cuando el usuario
// dijo/escribió más de uno de golpe (spec: "necesito anotar 3 cosas a la
// vez"). Se corta en comas, ";", saltos de línea, "y también"/"y además" y en
// la "y" suelta — pero SOLO donde de verdad empieza otro movimiento: un pedazo
// sin monto ("pan", "refrescos y postre") se pega al movimiento con monto más
// cercano en vez de volverse un movimiento aparte ("pan y leche 50 pesos" es UNO).
// La "y" que une un número compuesto ("cincuenta y cinco") nunca corta.
const HARD_SPLIT_REGEX = /(\n+|,+|;+|\s+y también\s+|\s+y además\s+|\s+también\s+|\s+además\s+)/gi;

function isStandaloneNumberWord(word: string | undefined): boolean {
  if (!word) return false;
  const w = normalize(word);
  return w !== 'y' && NUMBER_WORD_TOKENS.has(w);
}

function splitOnStandaloneY(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const parts: string[] = [];
  let current: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const isY = normalize(words[i]) === 'y';
    if (isY && !(isStandaloneNumberWord(words[i - 1]) && isStandaloneNumberWord(words[i + 1]))) {
      parts.push(current.join(' '));
      current = [];
      continue;
    }
    current.push(words[i]);
  }
  parts.push(current.join(' '));
  return parts;
}

// El separador original, listo para volver a pegar dos pedazos ("," -> ", ").
function joinSep(sep: string | undefined): string {
  if (!sep) return ' ';
  return /^[,;]+$/.test(sep) ? sep + ' ' : sep;
}

export function splitCaptureSegments(rawText: string): string[] {
  // pedazos y los separadores originales que hay ENTRE ellos (seps[i] va antes de segs[i+1])
  const segs: string[] = [];
  const seps: string[] = [];
  const pieces = rawText.split(HARD_SPLIT_REGEX);
  for (let i = 0; i < pieces.length; i += 2) {
    const ys = splitOnStandaloneY(pieces[i]);
    ys.forEach((s, j) => {
      if (segs.length > 0) seps.push(j === 0 ? joinSep(pieces[i - 1]) : ' y ');
      segs.push(s);
    });
  }

  const out: string[] = [];
  let pending = '';
  let pendingLead = '';
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (seg.trim().length === 0) continue;
    const sepBefore = i > 0 ? seps[i - 1] : '';
    if (extractAmount(seg) !== null) {
      out.push(pending ? pending + sepBefore + seg : seg);
      pending = '';
      pendingLead = '';
    } else if (pending) {
      pending += sepBefore + seg;
    } else {
      pending = seg;
      pendingLead = sepBefore;
    }
  }
  if (pending) {
    if (out.length > 0) out[out.length - 1] += pendingLead + pending;
    else out.push(pending);
  }
  const cleaned = out.map((s) => s.trim()).filter((s) => s.length > 1);
  return cleaned.length > 0 ? cleaned : [rawText.trim()];
}

export function parseCaptureText(rawText: string): ParsedCapture {
  const type = extractType(rawText);
  const amount = extractAmount(rawText);
  const currency = extractCurrency(rawText);
  const { categoryId, subcategoryId, merchant } = extractCategory(rawText, type);

  const missing: ParsedCapture['missing'] = [];
  if (amount === null) missing.push('amount');
  if (!categoryId && type === 'expense') missing.push('category');

  return { type, amount, currency, categoryId, subcategoryId, merchant, missing, rawText };
}

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
const CURRENCY_WORDS = new Set(['peso', 'pesos', 'dolar', 'dolares', 'usd', 'mxn']);

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
function normalize(text: string): string {
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

// Solo se corrigen palabras sueltas de al menos 6 letras (una frase de
// varias palabras, o una palabra corta con typo, son demasiado riesgosas
// de adivinar — ej. "chicle" a 1 letra de "chile" corrigiendo mal hacia
// una categoría distinta) y con una distancia de edición chica en
// proporción a su largo — igual que el umbral de similitud ~0.80 del spec.
const FUZZY_MIN_KEYWORD_LENGTH = 6;

function fuzzyMatchCategory(tokens: string[]): { categoryId: string; subcategoryId: string } | null {
  let best: { categoryId: string; subcategoryId: string; distance: number } | null = null;
  for (const category of DEFAULT_CATEGORIES) {
    for (const sub of category.subcategories) {
      for (const kw of sub.keywords) {
        const normalizedKw = normalize(kw);
        if (normalizedKw.includes(' ') || normalizedKw.length < FUZZY_MIN_KEYWORD_LENGTH) continue;
        const maxAllowed = Math.min(2, Math.floor(normalizedKw.length * 0.3));
        for (const tok of tokens) {
          if (tok.length < FUZZY_MIN_KEYWORD_LENGTH) continue;
          const distance = levenshteinDistance(tok, normalizedKw);
          if (distance > 0 && distance <= maxAllowed && (!best || distance < best.distance)) {
            best = { categoryId: category.id, subcategoryId: sub.id, distance };
          }
        }
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
const GAS_HOME_CONTEXT = ['lp', 'cilindro', 'natural', 'naturgy', 'casa', 'estufa', 'boiler', 'calentador', 'tanque estacionario'];

function disambiguateGas(normalizedText: string): { categoryId: string; subcategoryId: string } | null {
  if (!/\bgas\b/.test(normalizedText)) return null;
  const hasCarContext = GAS_CAR_CONTEXT.some((w) => containsKeywordAsWord(normalizedText, w));
  const hasHomeContext = GAS_HOME_CONTEXT.some((w) => containsKeywordAsWord(normalizedText, w));
  if (hasCarContext && !hasHomeContext) return { categoryId: 'transport', subcategoryId: 'trans_gas' };
  if (hasHomeContext && !hasCarContext) return { categoryId: 'housing', subcategoryId: 'house_gas' };
  return null;
}

const KNOWN_MERCHANTS: Array<{ name: string; keyword: string; categoryId: string; subcategoryId: string }> = [
  { name: 'Starbucks', keyword: 'starbucks', categoryId: 'food', subcategoryId: 'food_coffee' },
  { name: 'Netflix', keyword: 'netflix', categoryId: 'entertainment', subcategoryId: 'ent_streaming' },
  { name: 'Uber', keyword: 'uber', categoryId: 'transport', subcategoryId: 'trans_uber' },
  { name: 'DiDi', keyword: 'didi', categoryId: 'transport', subcategoryId: 'trans_didi' },
  { name: 'Spotify', keyword: 'spotify', categoryId: 'entertainment', subcategoryId: 'ent_streaming' },
];

const DIGIT_TOKEN_RE = /^\$?(\d{1,3}(?:[,.]\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)$/;

// Extrae el monto de la frase dictada/escrita, aceptando tanto dígitos
// ("50", "$1,500") como números en palabras ("cincuenta y cinco"). Cuando
// hay más de un número en la frase (ej. "medio kilo de huevo por cuarenta
// pesos" trae dos cantidades: la del kilo y la del precio), se prefiere el
// que está pegado a una palabra de moneda — los demás son cantidades de
// otra cosa (kilos, litros...), no dinero (catálogo v7, text-to-number).
function extractAmount(text: string): number | null {
  const tokens = normalize(text).split(' ').filter(Boolean);
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

  return candidates[0].value;
}

function extractCurrency(text: string): Currency {
  const lower = text.toLowerCase();
  if (lower.includes('dólar') || lower.includes('dolar') || lower.includes('usd') || lower.includes('u$d')) {
    return 'USD';
  }
  return 'MXN';
}

function extractType(text: string): TransactionType {
  const lower = text.toLowerCase();
  if (/(me pag|sueldo|salario|ingreso|nómina|nomina|me deposit)/.test(lower)) return 'income';
  if (/(met[íi] .*(ahorro|fondo)|ahorr[ée]|guard[ée])/.test(lower)) return 'saving';
  if (/(compr[ée].*(acci[oó]n|acciones|etf|cetes|bono)|invert[íi])/.test(lower)) return 'investment_buy';
  return 'expense';
}

function extractCategory(text: string): { categoryId: string | null; subcategoryId: string | null; merchant?: string } {
  const normalizedText = normalize(text);

  for (const m of KNOWN_MERCHANTS) {
    if (containsKeywordAsWord(normalizedText, normalize(m.keyword))) {
      return { categoryId: m.categoryId, subcategoryId: m.subcategoryId, merchant: m.name };
    }
  }

  const gasMatch = disambiguateGas(normalizedText);
  if (gasMatch) return gasMatch;

  // La palabra clave más larga que coincida gana — así "barbacoa" (comida
  // rápida) no se confunde con la coincidencia parcial más corta "bar"
  // (discotecas) que también aparece dentro de esa palabra.
  let best: { categoryId: string; subcategoryId: string; score: number } | null = null;
  for (const category of DEFAULT_CATEGORIES) {
    for (const sub of category.subcategories) {
      for (const kw of sub.keywords) {
        const normalizedKw = normalize(kw);
        if (normalizedKw.length > 2 && containsKeywordAsWord(normalizedText, normalizedKw)) {
          const score = normalizedKw.length;
          if (!best || score > best.score) {
            best = { categoryId: category.id, subcategoryId: sub.id, score };
          }
        }
      }
    }
  }

  if (best) return { categoryId: best.categoryId, subcategoryId: best.subcategoryId };

  // Sin coincidencia exacta: se intenta con tolerancia a errores de
  // dictado/tecleo antes de rendirse y pedirle la categoría a la persona.
  const fuzzy = fuzzyMatchCategory(normalizedText.split(' ').filter(Boolean));
  if (fuzzy) return fuzzy;

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

// Divide una sola grabación/nota en varios movimientos cuando el usuario
// dijo/escribió más de uno de golpe (spec: "necesito anotar 3 cosas a la
// vez"). Heurística simple por conectores comunes en español — cada
// segmento se parsea por separado con el proveedor de IA configurado.
// Los conectores largos ("y también", "y además") se cortan siempre; la
// "y" suelta NO se corta cuando une un número compuesto ("cincuenta y
// cinco"), solo cuando de verdad separa dos movimientos distintos.
const HARD_SPLIT_REGEX = /\n+|,+|;+|\s+y también\s+|\s+y además\s+|\s+también\s+|\s+además\s+/gi;

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

export function splitCaptureSegments(rawText: string): string[] {
  const roughSegments = rawText.split(HARD_SPLIT_REGEX);
  const segments = roughSegments
    .flatMap((s) => splitOnStandaloneY(s))
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
  return segments.length > 0 ? segments : [rawText.trim()];
}

export function parseCaptureText(rawText: string): ParsedCapture {
  const type = extractType(rawText);
  const amount = extractAmount(rawText);
  const currency = extractCurrency(rawText);
  const { categoryId, subcategoryId, merchant } = extractCategory(rawText);

  const missing: ParsedCapture['missing'] = [];
  if (amount === null) missing.push('amount');
  if (!categoryId && type === 'expense') missing.push('category');

  return { type, amount, currency, categoryId, subcategoryId, merchant, missing, rawText };
}

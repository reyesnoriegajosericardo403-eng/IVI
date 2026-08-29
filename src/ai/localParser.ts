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
}

const NUMBER_WORDS: Record<string, number> = {
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
  diez: 10,
  once: 11,
  doce: 12,
  veinte: 20,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
  cien: 100,
  cientos: 100,
  doscientos: 200,
  trescientos: 300,
  quinientos: 500,
  mil: 1000,
};

const KNOWN_MERCHANTS: Array<{ name: string; keyword: string; categoryId: string; subcategoryId: string }> = [
  { name: 'Starbucks', keyword: 'starbucks', categoryId: 'food', subcategoryId: 'food_coffee' },
  { name: 'Netflix', keyword: 'netflix', categoryId: 'entertainment', subcategoryId: 'ent_streaming' },
  { name: 'Uber', keyword: 'uber', categoryId: 'transport', subcategoryId: 'trans_uber' },
  { name: 'DiDi', keyword: 'didi', categoryId: 'transport', subcategoryId: 'trans_didi' },
  { name: 'Spotify', keyword: 'spotify', categoryId: 'entertainment', subcategoryId: 'ent_streaming' },
];

function extractAmount(text: string): number | null {
  const numericMatch = text.match(/(\d{1,3}(?:[,.]\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/);
  if (numericMatch) {
    const normalized = numericMatch[1].replace(/,/g, '');
    const value = parseFloat(normalized);
    if (!Number.isNaN(value)) return value;
  }

  const words = text.toLowerCase().split(/\s+/);
  for (const w of words) {
    if (NUMBER_WORDS[w] !== undefined) return NUMBER_WORDS[w];
  }
  return null;
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
  const lower = text.toLowerCase();

  for (const m of KNOWN_MERCHANTS) {
    if (lower.includes(m.keyword)) {
      return { categoryId: m.categoryId, subcategoryId: m.subcategoryId, merchant: m.name };
    }
  }

  let best: { categoryId: string; subcategoryId: string; score: number } | null = null;
  for (const category of DEFAULT_CATEGORIES) {
    for (const sub of category.subcategories) {
      for (const kw of sub.keywords) {
        if (kw.length > 2 && lower.includes(kw)) {
          const score = kw.length;
          if (!best || score > best.score) {
            best = { categoryId: category.id, subcategoryId: sub.id, score };
          }
        }
      }
    }
  }

  if (best) return { categoryId: best.categoryId, subcategoryId: best.subcategoryId };
  return { categoryId: null, subcategoryId: null };
}

// Divide una sola grabación/nota en varios movimientos cuando el usuario
// dijo/escribió más de uno de golpe (spec: "necesito anotar 3 cosas a la
// vez"). Heurística simple por conectores comunes en español — cada
// segmento se parsea por separado con el proveedor de IA configurado.
const SEGMENT_SPLIT_REGEX = /\n+|,+|;+|\s+y también\s+|\s+y además\s+|\s+también\s+|\s+además\s+|\s+y\s+/gi;

export function splitCaptureSegments(rawText: string): string[] {
  const segments = rawText
    .split(SEGMENT_SPLIT_REGEX)
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

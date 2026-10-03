import { CONCEPT_LEXICON, type ConceptTag } from '@/data/conceptLexicon';
import { normalize } from './localParser';

export type { ConceptTag };

// Frases del léxico normalizadas, agrupadas por número de palabras para buscarlas directo en la frase.
let phraseTag: Map<string, ConceptTag> | null = null;
let maxWords = 1;

function getPhraseIndex(): Map<string, ConceptTag> {
  if (phraseTag) return phraseTag;
  const map = new Map<string, ConceptTag>();
  for (const tag of Object.keys(CONCEPT_LEXICON) as ConceptTag[]) {
    for (const phrase of CONCEPT_LEXICON[tag]) {
      const n = normalize(phrase);
      if (n.length < 2 || map.has(n)) continue;
      map.set(n, tag);
      maxWords = Math.max(maxWords, n.split(' ').length);
    }
  }
  phraseTag = map;
  return map;
}

// Números sueltos que también cuentan: "a 12 meses", "a 18 msi", "cada 2 semanas", "cada 15 días".
const INSTALLMENT_RE = /\ba (\d{1,2}) (?:meses|msi|quincenas|mensualidades|pagos|parcialidades)\b/;
const RECURRING_RE = /\bcada (\d{1,2}) (?:dias|semanas|quincenas|meses|anos)\b/;

// Detecta modalidades del movimiento (repartido, deuda, recurrente, a plazos, deducible, reembolsable, otra
// moneda, previsto) en una frase dictada o escrita. NO decide categoría ni monto: eso lo hace parseCaptureText.
// Hoy ninguna pantalla lo consume; es el punto de enganche para P2/P3 (ver docs/memoria-proyecto/03-motor-clasificacion.md).
export function detectConcepts(text: string): ConceptTag[] {
  const index = getPhraseIndex();
  const t = normalize(text);
  const tokens = t.split(' ').filter(Boolean);
  const found = new Set<ConceptTag>();
  for (let i = 0; i < tokens.length; i++) {
    let phrase = '';
    for (let n = 1; n <= maxWords && i + n <= tokens.length; n++) {
      phrase = n === 1 ? tokens[i] : `${phrase} ${tokens[i + n - 1]}`;
      const tag = index.get(phrase);
      if (tag) found.add(tag);
    }
  }
  if (INSTALLMENT_RE.test(t)) found.add('installments');
  if (RECURRING_RE.test(t)) found.add('recurring');
  // liquidar una cuenta ya incluye "lo que debía": la liquidación manda sobre las etiquetas de deuda
  if (found.has('settlement')) {
    found.delete('i_owe');
    found.delete('owed_to_me');
  }
  return [...found];
}

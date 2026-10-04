// "De entre las cosas que YA existen, la que se nombra en el texto" (la de nombre más largo). Más seguro que capturar lo que
// sigue a una palabra clave: solo se actúa sobre algo real. Comparte la regla con chatIntentParser.ts.
import { normalize } from './localParser';

export function findMentionedName<T>(normalizedText: string, items: T[], getName: (i: T) => string): { found?: T; many: boolean } {
  const hay = ` ${normalizedText} `;
  const hits: Array<{ item: T; len: number }> = [];
  for (const item of items) {
    const n = normalize(getName(item));
    if (n.length >= 2 && hay.includes(` ${n} `)) hits.push({ item, len: n.length });
  }
  hits.sort((a, b) => b.len - a.len);
  // varios con el MISMO nombre más largo = ambiguo; uno que contiene a otro no cuenta como ambiguo
  const many = hits.length > 1 && hits[0].len === hits[1].len;
  return { found: hits[0]?.item, many };
}

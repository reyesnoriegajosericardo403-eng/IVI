import type { ParsedCapture } from '@/ai/localParser';
import { parseCaptureText as parseLocally } from '@/ai/localParser';
import { DEFAULT_CATEGORIES, findSubcategory } from '@/data/categories';
import type { AIInterpreterProvider } from '../types';
import type { LLMClient } from './types';

const CATEGORY_CATALOG = DEFAULT_CATEGORIES.map((c) => ({
  categoryId: c.id,
  subcategories: c.subcategories.map((s) => s.id),
}));

const SYSTEM_PROMPT = `Interpretas un movimiento financiero dicho o escrito en español coloquial mexicano (ej. "65 pesos de café", "compré 150 dólares de NVIDIA a 109") y devuelves ÚNICAMENTE un objeto JSON, sin texto adicional, sin bloques de código, con esta forma exacta:

{"type":"expense|income|saving|investment_buy","amount":number|null,"currency":"MXN|USD","categoryId":"id o null","subcategoryId":"id o null","merchant":"string o null"}

Reglas:
- "type" por defecto es "expense" salvo que sea claramente un ingreso, ahorro o compra de inversión.
- "categoryId" y "subcategoryId" DEBEN ser exactamente uno de este catálogo (nunca inventes otro id): ${JSON.stringify(CATEGORY_CATALOG)}
- Si no puedes determinar el monto o la categoría con confianza, usa null en ese campo — nunca inventes un valor.
- "currency" es "MXN" salvo que se mencionen dólares/USD explícitamente.
- Responde solo el JSON, nada más.`;

function extractJson(raw: string): any | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// Respaldado por el proveedor de IA que el usuario conectó. Si la
// respuesta no es JSON válido, o el proveedor falla (sin conexión, clave
// inválida, etc.), cae al intérprete local basado en reglas — la captura
// rápida nunca debe romperse por un problema de red (spec 20, 42).
export function createLLMAIInterpreterProvider(client: LLMClient, providerName: string): AIInterpreterProvider {
  return {
    name: providerName,
    async parseCaptureText(text: string): Promise<ParsedCapture> {
      try {
        const raw = await client.chat(SYSTEM_PROMPT, [{ role: 'user', content: text }]);
        const json = extractJson(raw);
        if (!json) return parseLocally(text);

        const categoryId: string | null = json.categoryId ?? null;
        const subcategoryId: string | null = json.subcategoryId ?? null;
        const validSubcategory = categoryId && subcategoryId ? findSubcategory(categoryId, subcategoryId) : undefined;

        const missing: ParsedCapture['missing'] = [];
        if (json.amount === null || json.amount === undefined) missing.push('amount');
        if (!validSubcategory && json.type === 'expense') missing.push('category');

        return {
          type: json.type ?? 'expense',
          amount: typeof json.amount === 'number' ? json.amount : null,
          currency: json.currency === 'USD' ? 'USD' : 'MXN',
          categoryId: validSubcategory ? categoryId : null,
          subcategoryId: validSubcategory ? subcategoryId : null,
          merchant: json.merchant ?? undefined,
          missing,
          rawText: text,
        };
      } catch {
        return parseLocally(text);
      }
    },
  };
}

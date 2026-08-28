import type { CopilotContext } from '@/ai/localCopilot';
import type { CopilotProvider } from '../types';
import { buildFinancialContextSummary } from './financialContext';
import type { LLMClient } from './types';

const SYSTEM_PROMPT = `Eres el copiloto financiero de VALU, una app de finanzas personales. Respondes en español, de forma breve y directa (2-4 frases, sin encabezados ni listas largas).

Reglas estrictas:
- Responde ÚNICAMENTE usando los datos en el JSON que te comparte el usuario a continuación. Es la información financiera real de esta persona.
- Nunca inventes cifras, precios de mercado, tipos de cambio ni datos que no estén en el JSON.
- Si no tienes datos suficientes para responder algo, dilo claramente en vez de adivinar.
- No prometas ni ejecutes acciones (comprar, vender, transferir dinero) — solo analizas y sugieres.
- El monto invertido en cada posición NO es su valor de mercado actual; acláralo si es relevante para la pregunta.`;

// Cualquier proveedor de modelo de lenguaje (Claude, ChatGPT, Gemini, Grok
// — el que el usuario haya conectado con su propia clave) responde
// preguntas usando exactamente el mismo prompt y el mismo resumen de
// datos. Solo cambia qué LLMClient se le inyecta (spec 80, 81).
export function createLLMCopilotProvider(client: LLMClient, providerName: string): CopilotProvider {
  return {
    name: providerName,
    async answerQuestion(question: string, ctx: CopilotContext): Promise<string> {
      const summary = buildFinancialContextSummary(ctx);
      const systemPrompt = `${SYSTEM_PROMPT}\n\nDatos financieros del usuario (JSON):\n${JSON.stringify(summary)}`;
      try {
        return await client.chat(systemPrompt, [{ role: 'user', content: question }]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        return `No pude conectar con tu IA (${providerName}): ${message}`;
      }
    },
  };
}

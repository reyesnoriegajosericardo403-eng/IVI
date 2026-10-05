import { aiEnabled } from '@/ai/agent/settings';
import { agentChat } from '@/ai/agent/transport';
import { parseCaptureText as parseLocally, type ParsedCapture } from '@/ai/localParser';
import { findSubcategory } from '@/data/categories';

import type { LLMClient } from '../llm/types';
import type { AIInterpreterProvider } from '../types';

// La IA como cliente simple de texto (sin herramientas), por la misma función ai-agent.
export const agentLLMClient: LLMClient = {
  async chat(systemPrompt, messages) {
    const res = await agentChat({
      system: systemPrompt,
      messages: messages.map((m) => (m.role === 'user' ? { role: 'user' as const, text: m.content } : { role: 'assistant' as const, text: m.content })),
      json: true,
      temperature: 0,
      maxTokens: 800,
    });
    return res.text;
  },
};

// Se descarga solo la primera vez que la captura necesita a la IA.
let aiInterpreter: AIInterpreterProvider | null = null;
async function getAiInterpreter(): Promise<AIInterpreterProvider> {
  if (!aiInterpreter) {
    const { createLLMAIInterpreterProvider } = await import('../llm/LLMAIInterpreterProvider');
    aiInterpreter = createLLMAIInterpreterProvider(agentLLMClient, 'VALU IA');
  }
  return aiInterpreter;
}

function complete(p: ParsedCapture): boolean {
  return p.amount !== null && !p.missing.includes('category');
}

// Captura por voz/texto: primero el motor local (instantáneo, sin conexión, 26 mil palabras); la IA solo entra cuando el
// local no entendió el monto o la categoría. Lo que el local sí entendió nunca se pierde.
export const hybridInterpreterProvider: AIInterpreterProvider = {
  name: 'valu-hybrid',
  async parseCaptureText(text) {
    const local = parseLocally(text);
    if (complete(local) || !aiEnabled()) return local;
    const ai = await (await getAiInterpreter()).parseCaptureText(text); // ya cae al local si la IA falla
    const aiCategory = ai.categoryId && ai.subcategoryId && findSubcategory(ai.categoryId, ai.subcategoryId) ? { categoryId: ai.categoryId, subcategoryId: ai.subcategoryId } : null;
    const categoryId = local.missing.includes('category') ? (aiCategory?.categoryId ?? local.categoryId) : local.categoryId;
    const subcategoryId = local.missing.includes('category') ? (aiCategory?.subcategoryId ?? local.subcategoryId) : local.subcategoryId;
    const amount = local.amount ?? ai.amount;
    const type = local.missing.includes('category') && aiCategory ? ai.type : local.type;
    const missing: ParsedCapture['missing'] = [];
    if (amount === null) missing.push('amount');
    if (!categoryId || !subcategoryId) missing.push('category');
    return { ...local, type, amount, currency: local.amount !== null ? local.currency : ai.currency, categoryId, subcategoryId, merchant: local.merchant ?? ai.merchant, missing };
  },
};

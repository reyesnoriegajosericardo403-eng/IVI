import type { ChatMessage } from '@/ai/chatTypes';

// Archivo aparte y pequeño a propósito: el chat lo usa al enviar, y así no arrastra al paquete inicial todo el agente
// (que se carga solo cuando se usa: ver src/providers/agent/agentActionProvider.ts).
const HISTORY_TURNS = 12;
const HISTORY_CHARS = 1200;

// Historial de la conversación como texto (lo último primero se recorta). Las propuestas llevan su estado, para que la IA
// sepa si la persona las confirmó o no.
export function historyFromMessages(messages: ChatMessage[]): Array<{ role: 'user' | 'assistant'; text: string }> {
  const out: Array<{ role: 'user' | 'assistant'; text: string }> = [];
  for (const msg of messages.slice(-HISTORY_TURNS)) {
    let text = msg.text ?? '';
    if (msg.role === 'assistant') {
      if (msg.action) text += `\n[Propuse: ${msg.action.summary} · estado: ${msg.action.status}]`;
      if (msg.plan) text += `\n[Propuse un plan de ${msg.plan.steps.length} pasos (${msg.plan.steps.map((s) => s.summary).join('; ')}) · estado: ${msg.plan.status}]`;
    }
    text = text.trim();
    if (!text) continue;
    out.push({ role: msg.role, text: text.length > HISTORY_CHARS ? `${text.slice(0, HISTORY_CHARS)}…` : text });
  }
  return out;
}

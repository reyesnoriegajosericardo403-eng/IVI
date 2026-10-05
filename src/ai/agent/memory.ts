// Memoria del agente: datos estables que la persona le cuenta a VALU ("cobro cada quincena", "ahorro para una casa")
// para no tener que repetirlos. Vive solo en este dispositivo (no se sube a la nube), se ve y se borra en Ajustes → IA,
// y entra en cada conversación con la IA como contexto.

export interface AgentMemoryItem {
  id: string;
  text: string;
  createdAt: string;
}

export const MAX_MEMORY_ITEMS = 30;
export const MAX_MEMORY_CHARS = 200;

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Limpia el texto; null si no sirve (vacío, muy corto o idéntico a uno que ya está).
export function cleanMemoryText(text: unknown, existing: AgentMemoryItem[]): string | null {
  if (typeof text !== 'string') return null;
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, MAX_MEMORY_CHARS);
  if (clean.length < 4) return null;
  const n = norm(clean);
  if (existing.some((m) => norm(m.text) === n)) return null;
  return clean;
}

// Agrega al final; si se pasa del tope, olvida primero lo más viejo.
export function appendMemory(list: AgentMemoryItem[], item: AgentMemoryItem): AgentMemoryItem[] {
  const next = [...list, item];
  return next.length > MAX_MEMORY_ITEMS ? next.slice(next.length - MAX_MEMORY_ITEMS) : next;
}

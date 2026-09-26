import type { AccountType, Currency, LiabilityType } from '@/data/types';

// Tipos del chat de IA con capacidad de escritura (spec: "modificar,
// quitar o agregar datos dentro de la app"). Deliberadamente NO extienden
// `SyncMeta` (data/types.ts): conversaciones y mensajes son locales a este
// dispositivo, sin sincronizar a Supabase (ver Contexto del plan), así que
// no necesitan id de sincronización ni borrado suave — se borran directo.

// Catálogo CERRADO de lo que la IA puede proponer — un tipo fuera de esta
// lista no se puede ni compilar como despachable (aiApplyAction en
// useAppStore.ts hace un switch exhaustivo sobre esto). Nunca incluye
// código, ajustes, autenticación ni el sistema de estilos — solo las
// entidades de datos del propio usuario.
export type AIActionType =
  | 'add_transaction'
  | 'add_account'
  | 'delete_account'
  | 'add_goal'
  | 'contribute_to_goal'
  | 'update_goal_target'
  | 'delete_goal'
  | 'add_liability'
  | 'update_liability_balance'
  | 'delete_liability'
  | 'set_budget_line'
  | 'delete_budget_line'
  | 'delete_transaction';

// Un tipo de argumentos angosto por acción — nunca un parche genérico
// (spec del plan: "tipos angostos, nunca parches genéricos") — así el
// modelo no puede "ayudar" cambiando un campo que nadie pidió, y el texto
// de la tarjeta de confirmación siempre es determinista.
export interface AddTransactionArgs {
  transactionType: 'expense' | 'income';
  amount: number;
  currency: Currency;
  categoryId: string;
  subcategoryId: string;
  accountId: string;
  accountName: string;
  merchant?: string;
}
export interface AddAccountArgs {
  name: string;
  accountType: AccountType;
  currency: Currency;
  balance: number;
}
export interface DeleteAccountArgs {
  accountId: string;
  accountName: string;
}
export interface AddGoalArgs {
  name: string;
  targetAmount: number;
  currency: Currency;
}
export interface ContributeToGoalArgs {
  goalId: string;
  goalName: string;
  amount: number;
  currency: Currency;
}
export interface UpdateGoalTargetArgs {
  goalId: string;
  goalName: string;
  targetAmount: number;
  currency: Currency;
}
export interface DeleteGoalArgs {
  goalId: string;
  goalName: string;
}
export interface AddLiabilityArgs {
  institution: string;
  liabilityType: LiabilityType;
  balance: number;
  currency: Currency;
}
export interface UpdateLiabilityBalanceArgs {
  liabilityId: string;
  institution: string;
  balance: number;
  currency: Currency;
}
export interface DeleteLiabilityArgs {
  liabilityId: string;
  institution: string;
}
export interface SetBudgetLineArgs {
  categoryId: string;
  categoryName: string;
  monthlyAmount: number;
  currency: Currency;
}
export interface DeleteBudgetLineArgs {
  lineId: string;
  categoryName: string;
}
export interface DeleteTransactionArgs {
  transactionId: string;
  transactionSummary: string;
}

// Unión discriminada usada por el catálogo (src/ai/actionCatalog.ts) y por
// `aiApplyAction` (useAppStore.ts) para que el switch de despacho sea
// exhaustivo y a prueba de tipos — nunca se puede despachar un tipo que no
// esté aquí.
export type ResolvedAction =
  | { type: 'add_transaction'; args: AddTransactionArgs }
  | { type: 'add_account'; args: AddAccountArgs }
  | { type: 'delete_account'; args: DeleteAccountArgs }
  | { type: 'add_goal'; args: AddGoalArgs }
  | { type: 'contribute_to_goal'; args: ContributeToGoalArgs }
  | { type: 'update_goal_target'; args: UpdateGoalTargetArgs }
  | { type: 'delete_goal'; args: DeleteGoalArgs }
  | { type: 'add_liability'; args: AddLiabilityArgs }
  | { type: 'update_liability_balance'; args: UpdateLiabilityBalanceArgs }
  | { type: 'delete_liability'; args: DeleteLiabilityArgs }
  | { type: 'set_budget_line'; args: SetBudgetLineArgs }
  | { type: 'delete_budget_line'; args: DeleteBudgetLineArgs }
  | { type: 'delete_transaction'; args: DeleteTransactionArgs };

export type AIActionStatus = 'proposed' | 'applied' | 'dismissed' | 'failed';

// Lo que de verdad se guarda en un mensaje del chat. `summary` SIEMPRE se
// genera por código a partir de `args` ya validados (actionCatalog.ts) —
// nunca es la prosa libre del modelo, para que la tarjeta de confirmación
// jamás pueda describir algo distinto de lo que en realidad va a aplicar.
export interface AIActionProposal {
  id: string;
  type: AIActionType;
  args: Record<string, unknown>;
  summary: string;
  status: AIActionStatus;
  createdAt: string;
  appliedAt?: string;
  error?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  // Solo en mensajes del asistente que proponen una acción sobre datos.
  action?: AIActionProposal;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastPreview: string;
}

function normalizeForFrequency(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.,;:!¡¿?"'()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// "Frecuentes" se deriva EN VIVO de los mensajes reales, igual que
// `spendByCategory`/`computeNetWorth` (src/utils/finance.ts) derivan todo
// en vivo en vez de mantener un contador aparte que hay que sincronizar y
// acotar por separado. Cuenta mensajes de usuario iguales (normalizados)
// entre TODAS las conversaciones, y devuelve el texto original más
// reciente de cada grupo, ordenado por frecuencia y luego por qué tan
// reciente es.
export function topFrequentQuestions(messages: ChatMessage[], limit: number): string[] {
  const groups = new Map<string, { count: number; lastText: string; lastAt: string }>();
  for (const m of messages) {
    if (m.role !== 'user') continue;
    const key = normalizeForFrequency(m.text);
    if (key.length < 3) continue;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      if (m.createdAt >= existing.lastAt) {
        existing.lastText = m.text;
        existing.lastAt = m.createdAt;
      }
    } else {
      groups.set(key, { count: 1, lastText: m.text, lastAt: m.createdAt });
    }
  }
  return Array.from(groups.values())
    .sort((a, b) => b.count - a.count || (a.lastAt < b.lastAt ? 1 : -1))
    .slice(0, limit)
    .map((g) => g.lastText);
}

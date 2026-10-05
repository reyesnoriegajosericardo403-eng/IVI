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
  | 'withdraw_from_goal'
  | 'update_goal_target'
  | 'update_goal_date'
  | 'delete_goal'
  | 'add_liability'
  | 'update_liability_balance'
  | 'update_liability_due_date'
  | 'delete_liability'
  | 'set_budget_line'
  | 'delete_budget_line'
  | 'delete_transaction'
  | 'transfer_between_accounts'
  // ---- P3 ----
  | 'add_forecast'
  | 'confirm_forecast'
  | 'skip_forecast'
  | 'postpone_forecast'
  | 'add_recurring'
  | 'add_recurring_contribution'
  | 'update_recurring_amount'
  | 'pause_recurring'
  | 'resume_recurring'
  | 'end_recurring'
  | 'add_reminder'
  | 'cancel_reminder'
  | 'pay_liability'
  | 'settle_liability'
  | 'register_dividend'
  | 'set_card_dates';

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
  // Día PASADO (o hoy) en que ocurrió, como mediodía local en ISO; sin esto es "ahora".
  date?: string;
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
  targetDate?: string; // AAAA-MM-DD
}
export interface ContributeToGoalArgs {
  goalId: string;
  goalName: string;
  amount: number;
  currency: Currency;
}
export interface WithdrawFromGoalArgs {
  goalId: string;
  goalName: string;
  amount: number;
  currency: Currency;
}
export interface UpdateGoalDateArgs {
  goalId: string;
  goalName: string;
  targetDate: string; // AAAA-MM-DD
}
export interface UpdateLiabilityDueDateArgs {
  liabilityId: string;
  institution: string;
  dueDate: string; // AAAA-MM-DD
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
export interface TransferBetweenAccountsArgs {
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  currency: Currency;
}

// ---------- P3: previsto, recurrentes, avisos, deudas y dividendos ----------

// Los ids de cuentas/metas/deudas pueden ser "virtuales" (`virtual:account:nu`) cuando el paso se refiere a algo que
// crea un paso ANTERIOR del mismo plan: el ejecutor los cambia por el id real recién creado (src/ai/virtualIds.ts).
export interface AddForecastArgs {
  transactionType: 'expense' | 'income';
  amount: number;
  currency: Currency;
  categoryId: string;
  subcategoryId: string;
  accountId: string;
  accountName: string;
  merchant?: string;
  date: string; // AAAA-MM-DD, hoy o futuro
}
export interface ConfirmForecastArgs {
  forecastId: string;
  label: string; // "Renta (5 oct)"
  amount?: number; // si ya ocurrió con otro monto
}
export interface SkipForecastArgs {
  forecastId: string;
  label: string;
}
export interface PostponeForecastArgs {
  forecastId: string;
  label: string;
  newDate: string; // AAAA-MM-DD, hoy o futuro
}
export interface RecurrenceArgs {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'semimonthly';
  interval: number;
  startDate: string;
  dayOfMonth?: number;
  weekdays?: number[];
  month?: number;
  endDate?: string;
  count?: number;
}
export interface AddRecurringArgs {
  name: string;
  transactionType: 'expense' | 'income';
  amount: number;
  currency: Currency;
  categoryId: string;
  subcategoryId: string;
  accountId: string;
  accountName: string;
  recurrence: RecurrenceArgs;
}
export interface AddRecurringContributionArgs {
  name: string;
  goalId: string;
  goalName: string;
  amount: number;
  currency: Currency;
  recurrence: RecurrenceArgs;
}
export interface UpdateRecurringAmountArgs {
  ruleId: string;
  ruleName: string;
  amount: number;
  currency: Currency;
}
export interface PauseRecurringArgs {
  ruleId: string;
  ruleName: string;
}
export interface ResumeRecurringArgs {
  ruleId: string;
  ruleName: string;
}
export interface EndRecurringArgs {
  ruleId: string;
  ruleName: string;
}
export interface AddReminderArgs {
  title: string;
  date?: string; // una sola vez
  recurrence?: RecurrenceArgs;
  timeOfDay: string; // HH:MM
  advanceDays: number[];
  maxAttempts: number;
}
export interface CancelReminderArgs {
  reminderId: string;
  title: string;
}
export interface PayLiabilityArgs {
  liabilityId: string;
  institution: string;
  amount: number;
  currency: Currency;
  owedToMe: boolean; // true = te pagaron a ti (cobro)
  accountId?: string;
  accountName?: string;
}
export interface SettleLiabilityArgs {
  liabilityId: string;
  institution: string;
}
export interface SetCardDatesArgs {
  accountId: string;
  accountName: string;
  cutoffDay: number;
  dueDay: number;
}
export interface RegisterDividendArgs {
  investmentId: string;
  ticker: string;
  amount: number;
  currency: Currency;
  accountId?: string;
  accountName?: string;
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
  | { type: 'withdraw_from_goal'; args: WithdrawFromGoalArgs }
  | { type: 'update_goal_target'; args: UpdateGoalTargetArgs }
  | { type: 'update_goal_date'; args: UpdateGoalDateArgs }
  | { type: 'delete_goal'; args: DeleteGoalArgs }
  | { type: 'add_liability'; args: AddLiabilityArgs }
  | { type: 'update_liability_balance'; args: UpdateLiabilityBalanceArgs }
  | { type: 'update_liability_due_date'; args: UpdateLiabilityDueDateArgs }
  | { type: 'delete_liability'; args: DeleteLiabilityArgs }
  | { type: 'set_budget_line'; args: SetBudgetLineArgs }
  | { type: 'delete_budget_line'; args: DeleteBudgetLineArgs }
  | { type: 'delete_transaction'; args: DeleteTransactionArgs }
  | { type: 'transfer_between_accounts'; args: TransferBetweenAccountsArgs }
  | { type: 'add_forecast'; args: AddForecastArgs }
  | { type: 'confirm_forecast'; args: ConfirmForecastArgs }
  | { type: 'skip_forecast'; args: SkipForecastArgs }
  | { type: 'postpone_forecast'; args: PostponeForecastArgs }
  | { type: 'add_recurring'; args: AddRecurringArgs }
  | { type: 'add_recurring_contribution'; args: AddRecurringContributionArgs }
  | { type: 'update_recurring_amount'; args: UpdateRecurringAmountArgs }
  | { type: 'pause_recurring'; args: PauseRecurringArgs }
  | { type: 'resume_recurring'; args: ResumeRecurringArgs }
  | { type: 'end_recurring'; args: EndRecurringArgs }
  | { type: 'add_reminder'; args: AddReminderArgs }
  | { type: 'cancel_reminder'; args: CancelReminderArgs }
  | { type: 'pay_liability'; args: PayLiabilityArgs }
  | { type: 'settle_liability'; args: SettleLiabilityArgs }
  | { type: 'register_dividend'; args: RegisterDividendArgs }
  | { type: 'set_card_dates'; args: SetCardDatesArgs };

// 'skipped' solo lo usan los pasos de un plan que no se llegaron a ejecutar porque uno anterior falló.
export type AIActionStatus = 'proposed' | 'applied' | 'dismissed' | 'failed' | 'skipped';

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

// ---------- Contratos de Fase 2 (docs/03_fase2_contratos_v1.md §1-§5), versión 1 ----------

// Qué dato le falta al catálogo para construir una acción (§2). `field` es el vocabulario cerrado de lo que
// puede faltar; `slot` es la clave del candidato que la respuesta de la persona va a llenar; `prompt` es la
// pregunta ya redactada por código (nunca prosa libre de un modelo).
export interface MissingField {
  field: 'account' | 'amount' | 'category' | 'goal' | 'liability' | 'currency' | 'date' | 'name' | 'forecast' | 'rule' | 'reminder' | 'investment' | 'recurrence';
  slot: string;
  prompt: string;
}

// Una pregunta de aclaración pendiente: qué acción se estaba armando y con qué datos. La respuesta de la
// persona se aplica sobre ESTE mismo candidato y se reintenta el MISMO resolver (§2): no se reinicia nada.
export interface PendingClarification {
  contractVersion: 1;
  type: AIActionType;
  candidate: Record<string, unknown>;
  missing: MissingField[];
  // Pasos que ya estaban resueltos en el mismo mensaje (un plan con un paso por aclarar). Se conservan
  // en el orden original y `index` dice dónde entra el paso que falta.
  resolvedSteps?: Array<{ type: AIActionType; args: Record<string, unknown>; summary: string }>;
  index?: number;
  status: 'open' | 'answered' | 'superseded';
}

export type PlanStatus = 'proposed' | 'applying' | 'applied' | 'partially_applied' | 'dismissed' | 'failed';

// Cómo quedan las cuentas/metas/deudas si se aplican todos los pasos EN ORDEN (§4). Se calcula sobre una
// copia; nada se escribe hasta confirmar.
export interface PlanEffect {
  kind: 'account' | 'goal' | 'liability';
  id: string;
  name: string;
  currency: Currency;
  before: number;
  after: number;
}

export interface ActionPlan {
  id: string;
  contractVersion: 1;
  steps: AIActionProposal[]; // cada paso sigue siendo una acción validada del catálogo, sin cambios
  status: PlanStatus;
  effects: PlanEffect[];
  warnings: string[];
  createdAt: string;
  appliedAt?: string;
}

// Lo que devuelve un proveedor al interpretar un mensaje del chat (contrato §1, versión 1, aditivo): `action`
// +`summary` (una sola acción, como siempre), `plan` (varias, como una unidad) o `clarification` (falta un dato).
export interface InterpretedMessage {
  reply: string;
  action?: ResolvedAction;
  summary?: string;
  plan?: { steps: Array<{ action: ResolvedAction; summary: string }>; effects: PlanEffect[]; warnings: string[] };
  clarification?: PendingClarification;
  // true cuando el mensaje era la respuesta a una pregunta pendiente (para marcarla como contestada)
  handledClarification?: boolean;
  // Quién contestó: la IA (agente) o el motor local, y por qué no hubo IA si se intentó (se muestra bajo el mensaje).
  meta?: ChatMessageMeta;
}

export interface ChatMessageMeta {
  engine: 'ai' | 'local';
  label?: string; // "Gemini · gemini-3.5-flash"
  notice?: string; // "Respondí sin IA: …"
  tools?: string[]; // herramientas que consultó el agente
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  // Solo en mensajes del asistente que proponen una acción sobre datos.
  action?: AIActionProposal;
  // Solo en mensajes del asistente que proponen VARIAS acciones como una unidad (P2).
  plan?: ActionPlan;
  // Solo en mensajes del asistente que preguntan un dato que faltó (P2).
  clarification?: PendingClarification;
  meta?: ChatMessageMeta;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastPreview: string;
  pinned?: boolean;
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

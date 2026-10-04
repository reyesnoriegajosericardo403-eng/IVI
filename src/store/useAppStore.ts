import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  type ActionPlan,
  type AddAccountArgs,
  type AddForecastArgs,
  type AddGoalArgs,
  type AddLiabilityArgs,
  type AddRecurringArgs,
  type AddRecurringContributionArgs,
  type AddReminderArgs,
  type AddTransactionArgs,
  type AIActionProposal,
  type AIActionStatus,
  type AIActionType,
  type ChatConversation,
  type CancelReminderArgs,
  type ChatMessage,
  type ConfirmForecastArgs,
  type ContributeToGoalArgs,
  type DeleteAccountArgs,
  type DeleteBudgetLineArgs,
  type DeleteGoalArgs,
  type DeleteLiabilityArgs,
  type DeleteTransactionArgs,
  type EndRecurringArgs,
  type PauseRecurringArgs,
  type PayLiabilityArgs,
  type PostponeForecastArgs,
  type RegisterDividendArgs,
  type ResumeRecurringArgs,
  type SetBudgetLineArgs,
  type SettleLiabilityArgs,
  type SkipForecastArgs,
  type TransferBetweenAccountsArgs,
  type UpdateRecurringAmountArgs,
  type UpdateGoalDateArgs,
  type UpdateGoalTargetArgs,
  type UpdateLiabilityBalanceArgs,
  type UpdateLiabilityDueDateArgs,
  type WithdrawFromGoalArgs,
} from '@/ai/chatTypes';
import { executePlan, recoverInterruptedPlan } from '@/ai/planExecutor';
import { extractLearnableKeywords, type CustomCategoryMapping } from '@/ai/localParser';
import { CASH_ACCOUNT_COLOR } from '@/data/accountColors';
import type {
  Account,
  AuditLogEntry,
  Budget,
  BudgetAssignment,
  BudgetTemplate,
  CategoryMappingRecord,
  Currency,
  Goal,
  PeriodBudgetOverride,
  RecurringRule,
  Reminder,
  ReminderOccurrence,
  TemplateBudgetLine,
  InvestmentPosition,
  Liability,
  NetWorthSnapshot,
  SyncMeta,
  Transaction,
  UserProfile,
} from '@/data/types';
import type { SyncQueueEntry, SyncTable } from '@/services/sync/types';
import type { VisualStyleDefinition } from '@/theme/visualStyles';
import type { CetesRates, MarketQuote } from '@/providers/types';
import { nextAssignmentsOfTemplate } from '@/utils/finance';
import { makeRangeKey } from '@/utils/budgetPeriods';
import { generateId } from '@/utils/id';
import { accountDeltasForTransaction, mergeDeltas, reverseDeltas, signedDeltaForAccount } from '@/utils/ledger';
import { noonIso } from '@/utils/forecast';
import {
  forecastIdFor,
  forecastsToPause,
  forecastsToResume,
  occurrencesToPause,
  occurrencesToResume,
  planReminderOccurrences,
  planRuleForecasts,
  reconcileReminderOccurrences,
  reconcileRuleForecasts,
  todayOf,
} from '@/utils/materialize';
import { addDaysIso, validateRecurrence, type Recurrence } from '@/utils/recurrence';
import { substituteVirtualIds, virtualIdFor, virtualKindOf } from '@/ai/virtualIds';
import { applyPayment, directionOf, PAYMENT_SUBCATEGORY, validateLiabilityPayment } from '@/utils/debts';
import { normalizeAdvanceDays, normalizeIntervalMinutes, REMINDER_DEFAULTS, validateReminderDraft, validateRuleDraft, type ReminderDraft, type RuleDraft } from '@/utils/p3Validation';

// Color de la plantilla "Mi presupuesto" — neutro a propósito: es la que
// aplica cuando un periodo no tiene ninguna otra asignada, así que no
// debe competir visualmente con las que la persona sí eligió.
const DEFAULT_TEMPLATE_COLOR = '#64748B';

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  primaryCurrency: 'MXN',
  onboardingComplete: false,
  themePreference: 'system',
  budgetThresholds: { attention: 70, warning: 90, exceeded: 100 },
};

// Estado de "¿ya reconocimos el cambio de semana/mes?" por periodicidad —
// lastPeriodKey es la última clave de periodo que el usuario ya confirmó
// (o para la que no había nada que confirmar), y carryOver es el sobrante
// del periodo anterior que sigue contando como Disponible mientras
// lastPeriodKey sea el periodo actual (spec: "¿seguimos con el mismo
// sobrante de dinero disponible?").
interface BudgetPeriodState {
  lastPeriodKey: string | null;
  carryOver: number;
}

const DEFAULT_BUDGET_PERIODS: { week: BudgetPeriodState; month: BudgetPeriodState } = {
  week: { lastPeriodKey: null, carryOver: 0 },
  month: { lastPeriodKey: null, carryOver: 0 },
};

// Tope de palabras que la memoria de correcciones recuerda por cuenta —
// evita que crezca sin límite; al llegar al tope se olvidan primero las
// correcciones más viejas (spec: "límite por cuenta de 50 palabras").
const MAX_CUSTOM_MAPPINGS = 50;

// Da a un registro nuevo su identidad de sincronización (spec 75, 77, 83).
function withNewMeta<T extends object>(draft: T): T & SyncMeta {
  const now = new Date().toISOString();
  return { ...draft, id: generateId(), createdAt: now, updatedAt: now } as T & SyncMeta;
}

function touch<T extends SyncMeta>(record: T, patch: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): T {
  return { ...record, ...patch, updatedAt: new Date().toISOString() } as T;
}

// Fusión "el que escribió más recientemente gana" por id (spec 76, 77).
// El servidor es la autoridad sobre updated_at, así que esto es seguro
// incluso si el reloj de este dispositivo está desincronizado.
function mergeByUpdatedAt<T extends SyncMeta>(local: T[], remote: T[]): T[] {
  const byId = new Map(local.map((r) => [r.id, r]));
  for (const remoteRecord of remote) {
    const localRecord = byId.get(remoteRecord.id);
    if (!localRecord || remoteRecord.updatedAt > localRecord.updatedAt) {
      byId.set(remoteRecord.id, remoteRecord);
    }
  }
  return Array.from(byId.values());
}

export type Draft<T> = Omit<T, keyof SyncMeta>;

// Resultado de una acción del store que puede fallar por una regla de negocio (el mensaje se muestra tal cual).
export interface StoreResult {
  ok: boolean;
  error?: string;
}

// Cómo se avisa de una regla recurrente (por defecto: un aviso el día a las 9:00).
export interface RuleReminderOptions {
  remind?: boolean;
  advanceDays?: number[];
  timeOfDay?: string;
  maxAttempts?: number;
  push?: boolean;
}
const OK: StoreResult = { ok: true };
const fail = (error: string): StoreResult => ({ ok: false, error });

function upsertById<T extends { id: string }>(list: T[], record: T): T[] {
  const i = list.findIndex((x) => x.id === record.id);
  if (i === -1) return [...list, record];
  const next = list.slice();
  next[i] = record;
  return next;
}

interface AppState {
  profile: UserProfile;
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  // Presupuestos con nombre aplicables a periodos del calendario — ver
  // los tipos en data/types.ts. `budgets` (arriba) se conserva tal cual:
  // es el esquema anterior y la fuente de los eventos de un día que ya
  // existían antes de esta función.
  budgetTemplates: BudgetTemplate[];
  templateBudgetLines: TemplateBudgetLine[];
  budgetAssignments: BudgetAssignment[];
  periodBudgetOverrides: PeriodBudgetOverride[];
  goals: Goal[];
  investments: InvestmentPosition[];
  liabilities: Liability[];
  netWorthHistory: NetWorthSnapshot[];
  auditLog: AuditLogEntry[];
  pendingSync: SyncQueueEntry[];
  lastSyncedAt: string | null;
  hasHydrated: boolean;

  budgetPeriods: { week: BudgetPeriodState; month: BudgetPeriodState };
  ackBudgetPeriod: (scope: 'week' | 'month', periodKey: string, carryOver: number) => void;

  // "Memoria" de correcciones de categoría — cuando la persona le dice a
  // VALU cuál es la categoría correcta de algo que no supo clasificar
  // solo, se recuerda esa palabra para la próxima vez, sin depender de
  // ningún proveedor de IA (spec: catálogo v7, "mapeo personal"). Viaja con
  // la cuenta (tabla `category_mappings`, migración 0022): se sincroniza como lo demás y solo la persona
  // dueña lo ve (RLS). Es la capa PERSONAL de la red de palabras; el vocabulario común va en la app.
  customCategoryMappings: Record<string, CustomCategoryMapping>;
  // true cuando las palabras que ya existían ANTES de la sincronización se encolaron una vez para subirse.
  customMappingsSeeded: boolean;
  seedMappingSync: () => void;
  learnCategoryMapping: (rawText: string, categoryId: string, subcategoryId: string) => void;
  clearCustomCategoryMappings: () => void;

  // Cotizaciones en vivo — deliberadamente FUERA de lo que se persiste
  // (ver partialize abajo): es un valor de "ahora mismo", no un dato
  // financiero del usuario, y no debe acumularse como historial (spec:
  // "no se deben quedar en el historial o en alguna base de datos").
  liveQuotes: Record<string, MarketQuote>;
  lastQuotesFetchedAt: string | null;
  setLiveQuotes: (quotes: Record<string, MarketQuote | null>) => void;
  // Tasa CETES (Banxico) — misma lógica que liveQuotes: un valor de
  // "ahora mismo" que nunca se acumula como historial.
  cetesRates: CetesRates | null;
  setCetesRates: (rates: CetesRates | null) => void;

  // Estilos visuales publicados desde Supabase — se guardan para que la
  // app conserve el estilo elegido aunque abra sin conexión.
  remoteVisualStyles: VisualStyleDefinition[];
  setRemoteVisualStyles: (styles: VisualStyleDefinition[]) => void;
  // `isPermanent` decide si además se recuerda como "a este regreso si el
  // temporal caduca".
  setVisualStyle: (id: string, isPermanent: boolean) => void;

  setHasHydrated: (v: boolean) => void;
  completeOnboarding: (profile: Partial<UserProfile>) => void;
  // Igual que completeOnboarding pero SIN forzar onboardingComplete —
  // para guardar nombre/moneda a medio del flujo de bienvenida (encuesta,
  // presupuesto) sin marcarlo como terminado todavía, así una recarga a
  // mitad del flujo no manda a alguien directo al dashboard.
  updateProfileDraft: (patch: Partial<UserProfile>) => void;
  setThemePreference: (pref: UserProfile['themePreference']) => void;

  // `profileDirty` marca que el perfil local tiene cambios que todavía no
  // se confirmaron en Supabase — persiste junto con el resto del estado,
  // así que si el intento de subida se interrumpe (la app se cierra, el
  // celular pierde señal) la marca sigue viva y el próximo runSync() la
  // vuelve a intentar. Antes de esto, un cambio de perfil (nombre, foto de
  // fondo...) se subía una sola vez sin reintentos ni confirmación — si esa
  // subida fallaba en silencio, la próxima sesión traía de vuelta el perfil
  // viejo de Supabase y "borraba" el cambio (bug reportado: el nombre y la
  // foto volvían a como estaban antes tras cerrar la app).
  profileDirty: boolean;
  markProfileDirty: () => void;
  markProfileSynced: () => void;
  // Usado SOLO al adoptar el perfil remoto en el login (useProfileReconciliation) —
  // a diferencia de completeOnboarding, no marca profileDirty porque el
  // perfil que llega YA está sincronizado, re-subirlo sería un viaje
  // redondo inútil.
  adoptRemoteProfile: (profile: Partial<UserProfile>) => void;

  addTransaction: (draft: Draft<Transaction>) => Transaction;
  updateTransaction: (id: string, patch: Partial<Draft<Transaction>>) => void;
  deleteTransaction: (id: string) => void;

  // ---------- P3: previsto vs. real ----------
  // Un previsto NUNCA mueve saldos ni cuenta en nada real (ver utils/ledger.ts); confirmarlo lo vuelve real.
  addForecast: (draft: Draft<Transaction>) => Transaction;
  confirmForecast: (id: string, opts?: { date?: string; amount?: number; accountId?: string }) => StoreResult;
  skipForecast: (id: string) => StoreResult; // "no ocurrió"
  reopenForecast: (id: string) => StoreResult; // deshacer un "no ocurrió"
  postponeForecast: (id: string, newDateIso: string) => StoreResult;

  // ---------- P3: movimientos recurrentes ----------
  recurringRules: RecurringRule[];
  createRule: (draft: RuleDraft, opts?: RuleReminderOptions) => StoreResult & { rule?: RecurringRule };
  updateRule: (id: string, patch: Partial<RuleDraft>) => StoreResult;
  pauseRule: (id: string) => StoreResult;
  resumeRule: (id: string) => StoreResult;
  endRule: (id: string) => StoreResult; // termina la regla: ya no genera y se quitan sus previstos futuros
  deleteRule: (id: string) => StoreResult;

  // ---------- P3: avisos ----------
  reminders: Reminder[];
  reminderOccurrences: ReminderOccurrence[];
  createReminder: (draft: ReminderDraft) => StoreResult & { reminder?: Reminder };
  updateReminder: (id: string, patch: Partial<ReminderDraft>) => StoreResult;
  pauseReminder: (id: string) => StoreResult;
  resumeReminder: (id: string) => StoreResult;
  cancelReminder: (id: string) => StoreResult;
  confirmOccurrence: (id: string) => StoreResult; // "ya ocurrió"
  markOccurrenceNotHappened: (id: string) => StoreResult; // "no ocurrió"
  skipOccurrence: (id: string) => StoreResult; // omitir ESTA vez de una serie
  postponeOccurrence: (id: string, to: { minutes?: number; untilIso?: string }) => StoreResult;
  dismissOccurrence: (id: string) => StoreResult; // "enterado" (aviso previo)
  // Genera los previstos y las ocurrencias que falten (idempotente). Se llama al abrir la app, al volver a primer plano y tras
  // cada cambio en reglas o avisos.
  runMaterialization: (now?: Date) => { forecasts: number; occurrences: number };
  // Marca por tabla opcional del motor de sincronización (ver SyncEngine).
  optionalSyncedAt: Record<string, string>;
  setOptionalSyncedAt: (table: string, iso: string) => void;

  addAccount: (draft: Draft<Account>) => void;
  updateAccount: (id: string, patch: Partial<Draft<Account>>) => void;
  deleteAccount: (id: string) => void;
  // Garantiza que siempre exista una cuenta de efectivo para elegir al
  // registrar (spec: "en la vida real también te pueden pagar en
  // efectivo... también hace gastos... en efectivo") — el paso de
  // Cuentas del onboarding solo la crea si la persona anotó un saldo, así
  // que quien lo dejó en blanco se quedaba sin poder elegir efectivo
  // nunca. Se crea en $0 (nunca un saldo inventado) y no hace nada si ya
  // existe una cuenta de efectivo activa.
  ensureCashAccount: () => void;

  setBudget: (draft: Draft<Budget>) => void;
  deleteBudget: (id: string) => void;

  // ---- Presupuestos con nombre + calendario ----
  // Crea la plantilla "Mi presupuesto" y le pasa los presupuestos que ya
  // existían, la primera vez que se abre Presupuesto tras esta versión.
  // Idempotente: no hace nada si ya hay una plantilla por defecto.
  ensureDefaultBudgetTemplate: () => void;
  addBudgetTemplate: (draft: Draft<BudgetTemplate>) => string;
  updateBudgetTemplate: (id: string, patch: Partial<Draft<BudgetTemplate>>) => void;
  deleteBudgetTemplate: (id: string) => void;
  // Busca por (templateId, categoryId), no solo por categoryId — cada
  // plantilla tiene su propio juego de montos.
  setTemplateBudgetLine: (draft: Draft<TemplateBudgetLine>) => void;
  deleteTemplateBudgetLine: (id: string) => void;
  // Multiplica monthlyAmount de todos los renglones de una plantilla por
  // `factor` en una sola actualización — para cuando se cambia su
  // periodo (semanal↔mensual) y hay que re-escalar los montos.
  rescaleTemplateLines: (templateId: string, factor: number) => void;
  assignTemplateToPeriod: (templateId: string, periodKey: string) => void;
  unassignPeriod: (periodKey: string) => void;
  // Asigna una plantilla a un rango de fechas arbitrario elegido a mano en
  // el calendario (spec v2 "Plan de gastos") — a diferencia de
  // assignTemplateToPeriod, SIEMPRE crea una asignación nueva (nunca
  // reemplaza una existente por periodKey): dos rangos pueden traslaparse
  // a propósito, y quien gana cada día lo decide resolveTemplateForDate
  // (el rango más corto), nunca un upsert silencioso.
  assignTemplateToRange: (templateId: string, startDateIso: string, endDateIso: string) => string;
  removeBudgetAssignment: (id: string) => void;
  // Guarda el ajuste de un renglón para un periodo. `propagate` decide a
  // dónde más se aplica (spec: "sí / no / personalizado 1-24"):
  // 'none' solo este periodo, 'all' también la plantilla completa, o un
  // número N = los próximos N periodos que usen esa misma plantilla.
  // `currency` viaja en el patch porque se necesita si el cambio termina
  // escribiéndose en la plantilla; el ajuste de periodo en sí no la usa
  // (hereda la de su renglón).
  setPeriodOverride: (
    periodKey: string,
    categoryId: string,
    patch: Omit<Draft<PeriodBudgetOverride>, 'assignmentId' | 'categoryId'> & { currency: Currency },
    propagate: 'none' | 'all' | number
  ) => void;
  clearPeriodOverride: (periodKey: string, categoryId: string) => void;

  addGoal: (draft: Draft<Goal>) => void;
  updateGoal: (id: string, patch: Partial<Draft<Goal>>) => void;
  contributeToGoal: (id: string, amount: number) => void;
  deleteGoal: (id: string) => void;

  addInvestment: (draft: Draft<InvestmentPosition>) => void;
  updateInvestment: (id: string, patch: Partial<Draft<InvestmentPosition>>) => void;
  deleteInvestment: (id: string) => void;

  addLiability: (draft: Draft<Liability>) => void;
  updateLiability: (id: string, patch: Partial<Draft<Liability>>) => void;
  deleteLiability: (id: string) => void;
  // ---------- P3: deudas ampliadas ----------
  // Pagar una deuda (o cobrar lo que te deben): baja el saldo, avanza las cuotas, registra el movimiento en la cuenta elegida y,
  // si llega a cero, la deuda queda saldada. Sin cuenta solo ajusta la deuda (ya lo pagaste fuera de VALU).
  payLiability: (id: string, opts: { amount: number; accountId?: string; date?: string }) => StoreResult & { transactionId?: string };
  settleLiability: (id: string) => StoreResult; // marcar como saldada sin movimiento (se pagó por otro lado o se perdonó)
  reopenLiability: (id: string, balance: number) => StoreResult;
  // Dividendo recibido de una inversión: ingreso en la cuenta elegida y suma a lo recibido por esa posición.
  registerDividend: (investmentId: string, opts: { amount: number; accountId?: string; date?: string }) => StoreResult & { transactionId?: string };

  recordNetWorthSnapshot: (draft: Draft<NetWorthSnapshot>) => void;

  // ---- Chat de IA: conversaciones + acciones sobre datos ----
  // Local-only a propósito (no `SyncMeta`, no `enqueue`) — ver Contexto en
  // el plan de esta función: es historial de conversación, no un dato
  // financiero que necesite sincronizarse entre dispositivos.
  conversations: ChatConversation[];
  chatMessages: ChatMessage[];
  activeConversationId: string | null;
  startConversation: () => string;
  setActiveConversation: (id: string | null) => void;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'createdAt'>) => ChatMessage;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  toggleConversationPinned: (id: string) => void;
  clearAllConversations: () => void;
  updateActionStatus: (messageId: string, status: AIActionStatus, patch?: { appliedAt?: string; error?: string }) => void;
  // Único punto donde una acción propuesta por el chat de IA de verdad
  // toca datos reales — re-valida que lo referenciado siga existiendo
  // (la propuesta pudo haberse armado hace rato) y despacha a la acción
  // hermana real correspondiente. Nunca crea lógica de negocio nueva: solo
  // reenvía a addAccount/deleteGoal/etc., las mismas que ya usa toda la UI.
  aiApplyAction: (action: AIActionProposal) => { ok: boolean; error?: string };
  // Aplica un PLAN de varias acciones (contrato §5): idempotente por mensaje (lee el estado guardado, no el
  // objeto que le pase la pantalla), en orden, sin revertir ni continuar si un paso falla, con auditoría.
  // Marca una pregunta de aclaración como contestada o superada (la persona cambió de tema).
  setClarificationStatus: (messageId: string, status: 'answered' | 'superseded') => void;
  aiApplyPlan: (messageId: string) => { ok: boolean; status: ActionPlan['status']; error?: string };
  // Cierra los planes que quedaron en 'applying' porque la app se cerró a la mitad (se llama al rehidratar).
  recoverInterruptedPlans: () => void;
  // Cancelar un plan que aún no se aplicó (solo desde 'proposed').
  dismissPlan: (messageId: string) => void;

  clearSyncQueueEntries: (ids: string[]) => void;
  setLastSyncedAt: (iso: string) => void;
  mergeRemoteRecords: (table: SyncTable, records: unknown[]) => void;

  resetAll: () => void;
}

// Un renglón de `category_mappings` a partir de una palabra aprendida (la llave es la propia palabra).
function mappingRecord(keyword: string, m: CustomCategoryMapping, deletedAt?: string): CategoryMappingRecord {
  return {
    id: keyword,
    keyword,
    categoryId: m.categoryId,
    subcategoryId: m.subcategoryId,
    createdAt: m.createdAt ?? m.updatedAt,
    updatedAt: deletedAt ?? m.updatedAt,
    deletedAt,
  };
}

// Mezcla lo que llegó de la nube con lo local: gana la corrección más reciente por palabra; un borrado
// (deletedAt) quita la palabra local solo si no se volvió a aprender DESPUÉS.
export function mergeRemoteMappings(
  local: Record<string, CustomCategoryMapping>,
  remote: CategoryMappingRecord[]
): Record<string, CustomCategoryMapping> {
  const next = { ...local };
  for (const r of remote) {
    const mine = next[r.keyword];
    if (r.deletedAt) {
      if (mine && mine.updatedAt <= r.updatedAt) delete next[r.keyword];
      continue;
    }
    if (!mine || mine.updatedAt < r.updatedAt) {
      next[r.keyword] = { categoryId: r.categoryId, subcategoryId: r.subcategoryId, updatedAt: r.updatedAt, createdAt: r.createdAt };
    }
  }
  return next;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      // Encola un cambio para que el SyncEngine lo empuje a Supabase.
      // Los registros demo nunca se sincronizan (spec: los datos de
      // demostración nunca se mezclan con datos reales).
      function enqueue(table: SyncTable, recordId: string, op: 'upsert' | 'delete', payload?: Record<string, unknown>, isDemo?: boolean) {
        if (isDemo) return;
        const entry: SyncQueueEntry = {
          id: generateId(),
          table,
          recordId,
          op,
          payload,
          queuedAt: new Date().toISOString(),
          attempts: 0,
        };
        set((s) => ({ pendingSync: [...s.pendingSync, entry] }));
      }

      // Encola varios registros de una misma tabla con UN solo cambio de estado (generar 90 días de previstos no debe
      // copiar la cola 90 veces).
      function enqueueMany(table: SyncTable, records: Array<SyncMeta & { isDemo?: boolean }>) {
        if (records.length === 0) return;
        const queuedAt = new Date().toISOString();
        const entries: SyncQueueEntry[] = records
          .filter((r) => !r.isDemo)
          .map((r) => ({ id: generateId(), table, recordId: r.id, op: 'upsert' as const, payload: r as unknown as Record<string, unknown>, queuedAt, attempts: 0 }));
        if (entries.length) set((s) => ({ pendingSync: [...s.pendingSync, ...entries] }));
      }

      const parseOk = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(new Date(`${day}T12:00:00`).getTime());

      function patchTransaction(id: string, patch: Partial<Transaction>): Transaction | undefined {
        const cur = get().transactions.find((x) => x.id === id);
        if (!cur) return undefined;
        const next = touch(cur, patch as Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>);
        set((s) => ({ transactions: s.transactions.map((x) => (x.id === id ? next : x)) }));
        enqueue('transactions', id, 'upsert', next as unknown as Record<string, unknown>, next.isDemo);
        return next;
      }
      function putRule(rule: RecurringRule) {
        set((s) => ({ recurringRules: upsertById(s.recurringRules, rule) }));
        enqueue('recurring_rules', rule.id, 'upsert', rule as unknown as Record<string, unknown>);
      }
      function patchRule(id: string, patch: Partial<RecurringRule>): RecurringRule | undefined {
        const cur = get().recurringRules.find((x) => x.id === id);
        if (!cur) return undefined;
        const next = touch(cur, patch as Partial<Omit<RecurringRule, 'id' | 'createdAt' | 'updatedAt'>>);
        putRule(next);
        return next;
      }
      function putReminder(reminder: Reminder) {
        set((s) => ({ reminders: upsertById(s.reminders, reminder) }));
        enqueue('reminders', reminder.id, 'upsert', reminder as unknown as Record<string, unknown>);
      }
      function patchReminder(id: string, patch: Partial<Reminder>): Reminder | undefined {
        const cur = get().reminders.find((x) => x.id === id);
        if (!cur) return undefined;
        const next = touch(cur, patch as Partial<Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>>);
        putReminder(next);
        return next;
      }
      function putOccurrence(o: ReminderOccurrence) {
        set((s) => ({ reminderOccurrences: upsertById(s.reminderOccurrences, o) }));
        enqueue('reminder_occurrences', o.id, 'upsert', o as unknown as Record<string, unknown>);
      }
      function patchOccurrence(id: string, patch: Partial<ReminderOccurrence>): ReminderOccurrence | undefined {
        const cur = get().reminderOccurrences.find((x) => x.id === id);
        if (!cur) return undefined;
        const next = touch(cur, patch as Partial<Omit<ReminderOccurrence, 'id' | 'createdAt' | 'updatedAt'>>);
        putOccurrence(next);
        return next;
      }

      // Aplica lo que devuelve reconcileRuleForecasts (crear / actualizar / quitar previstos).
      function applyForecastDiff(diff: ReturnType<typeof reconcileRuleForecasts>) {
        const nowIso = new Date().toISOString();
        if (diff.create.length) {
          set((s) => ({ transactions: [...diff.create, ...s.transactions] }));
          enqueueMany('transactions', diff.create);
        }
        for (const u of diff.update) patchTransaction(u.id, u.patch);
        for (const id of diff.remove) patchTransaction(id, { deletedAt: nowIso } as Partial<Transaction>);
      }

      // Cancela lo que quede abierto de una serie.
      function cancelOpenOccurrences(reminderId: string) {
        const nowIso = new Date().toISOString();
        for (const o of get().reminderOccurrences) {
          if (o.reminderId === reminderId && !o.deletedAt && ['pending', 'sent', 'paused'].includes(o.status)) {
            patchOccurrence(o.id, { status: 'cancelled', nextAttemptAt: undefined, resolvedAt: nowIso });
          }
        }
      }

      // Después de cambiar horario/fechas/avisos de una serie: reconcilia sus ocurrencias futuras.
      function resyncReminderOccurrences(reminderId: string) {
        const s = get();
        const rem = s.reminders.find((r) => r.id === reminderId);
        if (!rem) return;
        const nowD = new Date();
        const diff = reconcileReminderOccurrences(rem, new Map(s.recurringRules.map((r) => [r.id, r])), s.reminderOccurrences, todayOf(nowD), nowD.toISOString());
        const nowIso = nowD.toISOString();
        for (const id of diff.cancel) patchOccurrence(id, { status: 'cancelled', nextAttemptAt: undefined, resolvedAt: nowIso });
        for (const r of diff.revive) patchOccurrence(r.id, r.patch);
        for (const u of diff.update) patchOccurrence(u.id, u.patch);
        if (diff.create.length) {
          set((st) => ({ reminderOccurrences: [...st.reminderOccurrences, ...diff.create] }));
          enqueueMany('reminder_occurrences', diff.create);
        }
      }

      function endOrDeleteRule(id: string, remove: boolean): StoreResult {
        const cur = get().recurringRules.find((r) => r.id === id && !r.deletedAt);
        if (!cur) return fail('Esa regla ya no existe.');
        const nowIso = new Date().toISOString();
        const todayIso = todayOf(new Date());
        patchRule(id, remove ? ({ status: 'ended', endedAt: cur.endedAt ?? nowIso, deletedAt: nowIso } as Partial<RecurringRule>) : { status: 'ended', endedAt: nowIso });
        // los previstos que faltaban por ocurrir nunca fueron dinero: se quitan; lo ya confirmado/omitido queda como historia
        for (const t of get().transactions) {
          if (t.recurringRuleId === id && !t.deletedAt && (t.status === 'forecast' || t.status === 'paused') && t.date.slice(0, 10) >= todayIso) {
            patchTransaction(t.id, { deletedAt: nowIso } as Partial<Transaction>);
          }
        }
        for (const rem of get().reminders.filter((r) => r.sourceType === 'rule' && r.sourceId === id && !r.deletedAt)) {
          patchReminder(rem.id, { status: 'cancelled' });
          cancelOpenOccurrences(rem.id);
        }
        return OK;
      }

      // Confirmar un previsto: pasa a real y el ledger recién ahí mueve los saldos.
      function confirmForecastInternal(id: string, opts?: { date?: string; amount?: number; accountId?: string }): StoreResult {
        const s = get();
        const tx = s.transactions.find((x) => x.id === id);
        if (!tx || tx.deletedAt) return fail('Ese movimiento previsto ya no existe.');
        if (tx.status !== 'forecast') return fail(tx.status === 'posted' || !tx.status ? 'Ese movimiento ya está registrado.' : 'Ese movimiento ya no está previsto.');
        const todayIso = todayOf(new Date());
        const plannedDay = tx.date.slice(0, 10);
        const day = (opts?.date ?? (plannedDay <= todayIso ? plannedDay : todayIso)).slice(0, 10);
        if (!parseOk(day)) return fail('La fecha no es válida.');
        if (day > todayIso) return fail('Un movimiento real no puede ser de una fecha futura: si todavía no pasa, déjalo como previsto.');
        const amount = opts?.amount ?? tx.amount;
        if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return fail('El monto debe ser un número mayor que cero.');
        const accountId = opts?.accountId ?? tx.accountId;
        if (accountId && !s.accounts.some((a) => a.id === accountId && !a.deletedAt)) return fail('La cuenta de ese movimiento ya no existe.');
        if (tx.type === 'transfer' && tx.toAccountId && !s.accounts.some((a) => a.id === tx.toAccountId && !a.deletedAt)) return fail('La cuenta destino ya no existe.');
        // updateTransaction revierte el efecto anterior (ninguno: era previsto) y aplica el nuevo
        get().updateTransaction(id, { status: 'posted', date: noonIso(day), amount, accountId, confirmedAt: new Date().toISOString() } as Partial<Draft<Transaction>>);
        logAudit({ entityType: 'transaction', entityId: id, action: 'create', summary: `Previsto confirmado: ${tx.merchant ?? tx.subcategoryId} (${amount})`, newValue: amount });
        return OK;
      }

      // Cuando un previsto se confirma / omite / pospone por su cuenta, su aviso de la misma fecha se cierra (así no sigue insistiendo).
      function settleOccurrencesForForecast(tx: Transaction | undefined, status: 'confirmed' | 'not_occurred' | 'skipped') {
        if (!tx?.recurringRuleId) return;
        const planned = (tx.plannedDate ?? tx.date).slice(0, 10);
        const nowIso = new Date().toISOString();
        for (const o of get().reminderOccurrences) {
          if (!o.deletedAt && o.sourceType === 'rule' && o.sourceId === tx.recurringRuleId && o.eventDate === planned && ['pending', 'sent'].includes(o.status)) {
            patchOccurrence(o.id, { status: o.offsetDays === 0 ? status : 'dismissed', nextAttemptAt: undefined, resolvedAt: nowIso });
          }
        }
      }

      function openOccurrence(id: string): ReminderOccurrence | string {
        const occ = get().reminderOccurrences.find((x) => x.id === id && !x.deletedAt);
        if (!occ) return 'Ese aviso ya no existe.';
        if (!['pending', 'sent'].includes(occ.status)) return 'Ese aviso ya fue atendido.';
        return occ;
      }

      // Cierra una ocurrencia y los avisos previos del mismo evento que ya no hacen falta.
      function resolveOccurrence(occ: ReminderOccurrence, status: ReminderOccurrence['status']) {
        const nowIso = new Date().toISOString();
        patchOccurrence(occ.id, { status, nextAttemptAt: undefined, resolvedAt: nowIso });
        if (occ.offsetDays === 0) {
          for (const o of get().reminderOccurrences) {
            if (o.reminderId === occ.reminderId && o.eventDate === occ.eventDate && o.offsetDays > 0 && !o.deletedAt && ['pending', 'sent'].includes(o.status)) {
              patchOccurrence(o.id, { status: 'dismissed', nextAttemptAt: undefined, resolvedAt: nowIso });
            }
          }
        }
      }

      // Lo que una ocurrencia HACE además de cerrarse, según de dónde venga: una regla de movimientos confirma/omite su previsto;
      // una aportación periódica a una meta aporta al confirmar. Si el efecto falla, la ocurrencia NO se cierra.
      function applyOccurrenceEffect(occ: ReminderOccurrence, what: 'confirm' | 'not_occurred' | 'skip'): StoreResult {
        if (occ.sourceType !== 'rule' || !occ.sourceId) return OK;
        const rule = get().recurringRules.find((r) => r.id === occ.sourceId);
        if (!rule) return OK;
        if (rule.kind === 'goal_contribution') {
          if (what !== 'confirm') return OK;
          const goal = get().goals.find((g) => g.id === rule.goalId && !g.deletedAt);
          if (!goal) return fail('La meta de esa aportación ya no existe.');
          get().contributeToGoal(goal.id, rule.amount);
          logAudit({ entityType: 'goal', entityId: goal.id, action: 'update', summary: `Aportación periódica confirmada: ${rule.name}`, newValue: rule.amount });
          return OK;
        }
        const fc = get().transactions.find((x) => x.id === forecastIdFor(rule.id, occ.eventDate));
        if (!fc || fc.deletedAt || fc.status !== 'forecast') return OK; // ya no hay previsto que tocar
        if (what === 'confirm') return confirmForecastInternal(fc.id);
        patchTransaction(fc.id, { status: 'skipped' });
        return OK;
      }

      function logAudit(entry: Omit<AuditLogEntry, keyof SyncMeta>) {
        const record = withNewMeta(entry);
        set((s) => ({ auditLog: [record, ...s.auditLog] }));
        enqueue('audit_log', record.id, 'upsert', record as unknown as Record<string, unknown>);
      }

      // Mueve saldo REAL entre cuentas cuando se crea, edita o borra un
      // movimiento — así el saldo de Patrimonio siempre refleja lo que de
      // verdad se registró (spec: "sentido lógico real de cómo se mueve el
      // dinero"). No genera entradas de auditoría propias — el movimiento
      // en sí ya queda registrado en Transacciones.
      function applyAccountDeltas(deltasList: ReturnType<typeof accountDeltasForTransaction>) {
        const merged = mergeDeltas(deltasList);
        if (merged.size === 0) return;
        set((s) => ({
          accounts: s.accounts.map((a) =>
            merged.has(a.id) ? touch(a, { balance: a.balance + signedDeltaForAccount(a, merged.get(a.id) ?? 0) } as Partial<Account>) : a
          ),
        }));
        const accounts = get().accounts;
        for (const accountId of merged.keys()) {
          const acc = accounts.find((a) => a.id === accountId);
          if (acc) enqueue('accounts', acc.id, 'upsert', acc as unknown as Record<string, unknown>, acc.isDemo);
        }
      }

      return {
        profile: DEFAULT_PROFILE,
        profileDirty: false,
        transactions: [],
        accounts: [],
        budgets: [],
        budgetTemplates: [],
        templateBudgetLines: [],
        budgetAssignments: [],
        periodBudgetOverrides: [],
        goals: [],
        investments: [],
        liabilities: [],
        netWorthHistory: [],
        auditLog: [],
        pendingSync: [],
        lastSyncedAt: null,
        hasHydrated: false,
        remoteVisualStyles: [],
        liveQuotes: {},
        lastQuotesFetchedAt: null,
        cetesRates: null,
        budgetPeriods: DEFAULT_BUDGET_PERIODS,
        customCategoryMappings: {},
        customMappingsSeeded: false,
        recurringRules: [],
        reminders: [],
        reminderOccurrences: [],
        optionalSyncedAt: {},
        conversations: [],
        chatMessages: [],
        activeConversationId: null,

        ackBudgetPeriod: (scope, periodKey, carryOver) =>
          set((s) => ({
            budgetPeriods: { ...s.budgetPeriods, [scope]: { lastPeriodKey: periodKey, carryOver } },
          })),

        learnCategoryMapping: (rawText, categoryId, subcategoryId) => {
          const keywords = extractLearnableKeywords(rawText);
          if (keywords.length === 0) return;
          const updatedAt = new Date().toISOString();
          const dropped: Array<[string, CustomCategoryMapping]> = [];
          set((s) => {
            const next = { ...s.customCategoryMappings };
            for (const kw of keywords) next[kw] = { categoryId, subcategoryId, updatedAt, createdAt: next[kw]?.createdAt ?? updatedAt };
            // Tope de MAX_CUSTOM_MAPPINGS palabras por cuenta — si se pasa,
            // se olvidan primero las correcciones más viejas (por
            // updatedAt), nunca las más recientes.
            const entries = Object.entries(next);
            if (entries.length > MAX_CUSTOM_MAPPINGS) {
              entries.sort((a, b) => a[1].updatedAt.localeCompare(b[1].updatedAt));
              const toDrop = entries.length - MAX_CUSTOM_MAPPINGS;
              for (let i = 0; i < toDrop; i++) {
                dropped.push([entries[i][0], entries[i][1]]);
                delete next[entries[i][0]];
              }
            }
            return { customCategoryMappings: next };
          });
          // A la cola de sincronización: lo aprendido sube; lo que el tope olvidó se marca borrado para que
          // otro dispositivo no lo vuelva a traer.
          const current = get().customCategoryMappings;
          for (const kw of keywords) if (current[kw]) enqueue('category_mappings', kw, 'upsert', mappingRecord(kw, current[kw]) as unknown as Record<string, unknown>);
          for (const [kw, m] of dropped) enqueue('category_mappings', kw, 'delete', mappingRecord(kw, m, updatedAt) as unknown as Record<string, unknown>);
        },
        clearCustomCategoryMappings: () => {
          const now = new Date().toISOString();
          const before = get().customCategoryMappings;
          set({ customCategoryMappings: {} });
          // "Olvidar lo aprendido" también debe llegar a la nube y a los demás dispositivos.
          for (const [kw, m] of Object.entries(before)) enqueue('category_mappings', kw, 'delete', mappingRecord(kw, m, now) as unknown as Record<string, unknown>);
        },
        seedMappingSync: () => {
          if (get().customMappingsSeeded) return;
          for (const [kw, m] of Object.entries(get().customCategoryMappings)) {
            enqueue('category_mappings', kw, 'upsert', mappingRecord(kw, m) as unknown as Record<string, unknown>);
          }
          set({ customMappingsSeeded: true });
        },

        setLiveQuotes: (quotes) =>
          set((s) => {
            const next = { ...s.liveQuotes };
            let updatedAny = false;
            for (const [ticker, quote] of Object.entries(quotes)) {
              if (quote) {
                next[ticker] = quote;
                updatedAny = true;
              }
            }
            // Solo se avanza "actualizado hace X" cuando de verdad llegó al
            // menos una cotización — si todo vino null (relevo caído, sin
            // clave configurada) no se debe aparentar una actualización que
            // no ocurrió.
            return {
              liveQuotes: next,
              lastQuotesFetchedAt: updatedAny ? new Date().toISOString() : s.lastQuotesFetchedAt,
            };
          }),

        setCetesRates: (rates) => set(() => (rates ? { cetesRates: rates } : {})),

        setHasHydrated: (v) => set({ hasHydrated: v }),

        completeOnboarding: (profile) =>
          set((s) => ({ profile: { ...s.profile, ...profile, onboardingComplete: true }, profileDirty: true })),

        updateProfileDraft: (patch) => set((s) => ({ profile: { ...s.profile, ...patch }, profileDirty: true })),

        setThemePreference: (pref) =>
          set((s) => ({ profile: { ...s.profile, themePreference: pref }, profileDirty: true })),

        setRemoteVisualStyles: (styles) => set({ remoteVisualStyles: styles }),

        setVisualStyle: (id, isPermanent) =>
          set((s) => ({
            profile: {
              ...s.profile,
              visualStyle: id,
              // Solo los permanentes se recuerdan como destino de regreso:
              // si el usuario elige uno temporal y este caduca, vuelve al
              // permanente anterior y no se queda sin estilo.
              lastPermanentVisualStyle: isPermanent ? id : s.profile.lastPermanentVisualStyle,
            },
            profileDirty: true,
          })),

        markProfileDirty: () => set({ profileDirty: true }),
        markProfileSynced: () => set({ profileDirty: false }),

        adoptRemoteProfile: (profile) =>
          set((s) => ({ profile: { ...s.profile, ...profile, onboardingComplete: true }, profileDirty: false })),

        addTransaction: (draft) => {
          const tx = withNewMeta(draft);
          set((s) => ({ transactions: [tx, ...s.transactions] }));
          enqueue('transactions', tx.id, 'upsert', tx as unknown as Record<string, unknown>, tx.isDemo);
          applyAccountDeltas(accountDeltasForTransaction(tx));
          return tx;
        },
        updateTransaction: (id, patch) => {
          const current = get().transactions.find((t) => t.id === id);
          if (!current) return;
          const updated = touch(current, patch);
          set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? updated : t)) }));
          enqueue('transactions', id, 'upsert', updated as unknown as Record<string, unknown>, updated.isDemo);
          // Revierte el efecto de la cuenta/monto/tipo anterior y aplica el
          // nuevo — evita saldos fantasma al cambiar de cuenta o corregir
          // un movimiento (spec: registro de voz mal asignado se corrige
          // después en Movimientos).
          applyAccountDeltas([...reverseDeltas(accountDeltasForTransaction(current)), ...accountDeltasForTransaction(updated)]);
        },
        deleteTransaction: (id) => {
          const current = get().transactions.find((t) => t.id === id);
          if (!current) return;
          const updated = touch(current, { deletedAt: new Date().toISOString() } as Partial<Transaction>);
          set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? updated : t)) }));
          enqueue('transactions', id, 'delete', updated as unknown as Record<string, unknown>, updated.isDemo);
          applyAccountDeltas(reverseDeltas(accountDeltasForTransaction(current)));
        },

        addAccount: (draft) => {
          const account = withNewMeta(draft);
          set((s) => ({ accounts: [...s.accounts, account] }));
          enqueue('accounts', account.id, 'upsert', account as unknown as Record<string, unknown>, account.isDemo);
        },
        ensureCashAccount: () => {
          const hasCash = get().accounts.some((a) => a.type === 'cash' && !a.deletedAt);
          if (hasCash) return;
          const account = withNewMeta({
            name: 'Efectivo',
            type: 'cash',
            currency: get().profile.primaryCurrency,
            balance: 0,
            color: CASH_ACCOUNT_COLOR,
          } as Draft<Account>);
          set((s) => ({ accounts: [...s.accounts, account] }));
          enqueue('accounts', account.id, 'upsert', account as unknown as Record<string, unknown>, account.isDemo);
        },
        updateAccount: (id, patch) => {
          const current = get().accounts.find((a) => a.id === id);
          if (!current) return;
          const updated = touch(current, patch);
          set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? updated : a)) }));
          enqueue('accounts', id, 'upsert', updated as unknown as Record<string, unknown>, updated.isDemo);
          if (patch.balance !== undefined && patch.balance !== current.balance) {
            logAudit({
              entityType: 'account',
              entityId: id,
              action: 'update',
              summary: `Saldo de "${current.name}": ${current.balance} → ${patch.balance}`,
              previousValue: current.balance,
              newValue: patch.balance,
            });
          }
        },
        deleteAccount: (id) => {
          const current = get().accounts.find((a) => a.id === id);
          if (!current) return;
          const updated = touch(current, { deletedAt: new Date().toISOString() } as Partial<Account>);
          set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? updated : a)) }));
          enqueue('accounts', id, 'delete', updated as unknown as Record<string, unknown>, updated.isDemo);
        },

        setBudget: (draft) =>
          set((s) => {
            const existing = s.budgets.find((x) => x.categoryId === draft.categoryId);
            const record = existing ? touch(existing, draft) : withNewMeta(draft);
            enqueue('budgets', record.id, 'upsert', record as unknown as Record<string, unknown>);
            return {
              budgets: existing ? s.budgets.map((x) => (x.categoryId === draft.categoryId ? record : x)) : [...s.budgets, record],
            };
          }),
        deleteBudget: (id) => {
          const current = get().budgets.find((b) => b.id === id);
          if (!current) return;
          const updated = touch(current, { deletedAt: new Date().toISOString() } as Partial<Budget>);
          set((s) => ({ budgets: s.budgets.map((b) => (b.id === id ? updated : b)) }));
          enqueue('budgets', id, 'delete', updated as unknown as Record<string, unknown>);
        },

        ensureDefaultBudgetTemplate: () => {
          const state = get();
          const existing = state.budgetTemplates.find((t) => t.isDefault && !t.deletedAt);
          const template =
            existing ??
            withNewMeta({
              name: 'Mi presupuesto',
              kind: 'month',
              color: DEFAULT_TEMPLATE_COLOR,
              isDefault: true,
            } as Draft<BudgetTemplate>);

          // Lo que ya existía en `budgets` pasa a ser el contenido de esta
          // plantilla, para que nadie vea su presupuesto "desaparecer" al
          // actualizar. `budgets` NO se borra: sigue siendo el respaldo del
          // esquema anterior y la fuente de los eventos de un día.
          //
          // Se vuelve a revisar en cada llamada (no solo al crear la
          // plantilla) porque los presupuestos del esquema anterior pueden
          // llegar DESPUÉS, cuando termina de sincronizar desde Supabase —
          // si solo se migrara la primera vez, esos se quedarían fuera.
          const alreadyMigrated = new Set(
            state.templateBudgetLines.filter((l) => l.templateId === template.id && !l.deletedAt).map((l) => l.categoryId)
          );
          const migrated = state.budgets
            .filter((b) => !b.deletedAt && !alreadyMigrated.has(b.categoryId))
            .map((b) =>
              withNewMeta({
                templateId: template.id,
                categoryId: b.categoryId,
                monthlyAmount: b.monthlyAmount,
                currency: b.currency,
                periodicity: b.periodicity,
                frequency: b.frequency,
                customDaysPerWeek: b.customDaysPerWeek,
                baseAmount: b.baseAmount,
                dayOfMonth: b.dayOfMonth,
                dayOfWeek: b.dayOfWeek,
                oneTimeDate: b.oneTimeDate,
                targetAccountId: b.targetAccountId,
                includedAccountIds: b.includedAccountIds,
              } as Draft<TemplateBudgetLine>)
            );

          if (existing && migrated.length === 0) return;

          if (!existing) {
            enqueue('budget_templates', template.id, 'upsert', template as unknown as Record<string, unknown>);
          }
          for (const line of migrated) {
            enqueue('template_budget_lines', line.id, 'upsert', line as unknown as Record<string, unknown>);
          }
          set((s) => ({
            budgetTemplates: existing ? s.budgetTemplates : [...s.budgetTemplates, template],
            templateBudgetLines: [...s.templateBudgetLines, ...migrated],
          }));
        },
        addBudgetTemplate: (draft) => {
          const template = withNewMeta(draft);
          set((s) => ({ budgetTemplates: [...s.budgetTemplates, template] }));
          enqueue('budget_templates', template.id, 'upsert', template as unknown as Record<string, unknown>);
          return template.id;
        },
        updateBudgetTemplate: (id, patch) => {
          const current = get().budgetTemplates.find((t) => t.id === id);
          if (!current) return;
          const updated = touch(current, patch);
          set((s) => ({ budgetTemplates: s.budgetTemplates.map((t) => (t.id === id ? updated : t)) }));
          enqueue('budget_templates', id, 'upsert', updated as unknown as Record<string, unknown>);
        },
        deleteBudgetTemplate: (id) => {
          const current = get().budgetTemplates.find((t) => t.id === id);
          // La plantilla por defecto es el respaldo de todo periodo sin
          // asignación — borrarla dejaría periodos sin presupuesto.
          if (!current || current.isDefault) return;
          const now = new Date().toISOString();
          const updated = touch(current, { deletedAt: now } as Partial<BudgetTemplate>);
          set((s) => ({
            budgetTemplates: s.budgetTemplates.map((t) => (t.id === id ? updated : t)),
            // Sus renglones y asignaciones se van con ella (borrado suave).
            templateBudgetLines: s.templateBudgetLines.map((l) =>
              l.templateId === id && !l.deletedAt ? touch(l, { deletedAt: now } as Partial<TemplateBudgetLine>) : l
            ),
            budgetAssignments: s.budgetAssignments.map((a) =>
              a.templateId === id && !a.deletedAt ? touch(a, { deletedAt: now } as Partial<BudgetAssignment>) : a
            ),
          }));
          enqueue('budget_templates', id, 'delete', updated as unknown as Record<string, unknown>);
        },
        setTemplateBudgetLine: (draft) =>
          set((s) => {
            const existing = s.templateBudgetLines.find(
              (l) => l.templateId === draft.templateId && l.categoryId === draft.categoryId && !l.deletedAt
            );
            const record = existing ? touch(existing, draft) : withNewMeta(draft);
            enqueue('template_budget_lines', record.id, 'upsert', record as unknown as Record<string, unknown>);
            return {
              templateBudgetLines: existing
                ? s.templateBudgetLines.map((l) => (l.id === existing.id ? record : l))
                : [...s.templateBudgetLines, record],
            };
          }),
        deleteTemplateBudgetLine: (id) => {
          const current = get().templateBudgetLines.find((l) => l.id === id);
          if (!current) return;
          const updated = touch(current, { deletedAt: new Date().toISOString() } as Partial<TemplateBudgetLine>);
          set((s) => ({ templateBudgetLines: s.templateBudgetLines.map((l) => (l.id === id ? updated : l)) }));
          enqueue('template_budget_lines', id, 'delete', updated as unknown as Record<string, unknown>);
        },
        rescaleTemplateLines: (templateId, factor) =>
          set((s) => {
            const now = new Date().toISOString();
            const updated = s.templateBudgetLines.map((l) => {
              if (l.templateId !== templateId || l.deletedAt) return l;
              const record = { ...l, monthlyAmount: l.monthlyAmount * factor, updatedAt: now };
              enqueue('template_budget_lines', record.id, 'upsert', record as unknown as Record<string, unknown>);
              return record;
            });
            return { templateBudgetLines: updated };
          }),
        assignTemplateToPeriod: (templateId, periodKey) =>
          set((s) => {
            const existing = s.budgetAssignments.find((a) => a.periodKey === periodKey && !a.deletedAt);
            const record = existing
              ? touch(existing, { templateId } as Partial<BudgetAssignment>)
              : withNewMeta({ templateId, periodKey } as Draft<BudgetAssignment>);
            enqueue('budget_assignments', record.id, 'upsert', record as unknown as Record<string, unknown>);
            return {
              budgetAssignments: existing
                ? s.budgetAssignments.map((a) => (a.id === existing.id ? record : a))
                : [...s.budgetAssignments, record],
            };
          }),
        unassignPeriod: (periodKey) => {
          const current = get().budgetAssignments.find((a) => a.periodKey === periodKey && !a.deletedAt);
          if (!current) return;
          const now = new Date().toISOString();
          const updated = touch(current, { deletedAt: now } as Partial<BudgetAssignment>);
          set((s) => ({
            budgetAssignments: s.budgetAssignments.map((a) => (a.id === current.id ? updated : a)),
            // Los ajustes que colgaban de esa asignación dejan de aplicar.
            periodBudgetOverrides: s.periodBudgetOverrides.map((o) =>
              o.assignmentId === current.id && !o.deletedAt ? touch(o, { deletedAt: now } as Partial<PeriodBudgetOverride>) : o
            ),
          }));
          enqueue('budget_assignments', current.id, 'delete', updated as unknown as Record<string, unknown>);
        },
        assignTemplateToRange: (templateId, startDateIso, endDateIso) => {
          const periodKey = makeRangeKey(startDateIso, endDateIso);
          const record = withNewMeta({ templateId, periodKey, startDate: startDateIso, endDate: endDateIso } as Draft<BudgetAssignment>);
          set((s) => ({ budgetAssignments: [...s.budgetAssignments, record] }));
          enqueue('budget_assignments', record.id, 'upsert', record as unknown as Record<string, unknown>);
          return record.id;
        },
        removeBudgetAssignment: (id) => {
          const current = get().budgetAssignments.find((a) => a.id === id && !a.deletedAt);
          if (!current) return;
          const now = new Date().toISOString();
          const updated = touch(current, { deletedAt: now } as Partial<BudgetAssignment>);
          set((s) => ({
            budgetAssignments: s.budgetAssignments.map((a) => (a.id === id ? updated : a)),
            periodBudgetOverrides: s.periodBudgetOverrides.map((o) =>
              o.assignmentId === id && !o.deletedAt ? touch(o, { deletedAt: now } as Partial<PeriodBudgetOverride>) : o
            ),
          }));
          enqueue('budget_assignments', id, 'delete', updated as unknown as Record<string, unknown>);
        },
        setPeriodOverride: (periodKey, categoryId, patch, propagate) => {
          const state = get();
          const assignment = state.budgetAssignments.find((a) => a.periodKey === periodKey && !a.deletedAt);
          // Sin asignación explícita el periodo está usando la plantilla
          // por defecto: ahí no hay "solo este periodo" que valga, se
          // edita la plantilla directo (es justo lo que la persona ve).
          if (!assignment) {
            const fallback = state.budgetTemplates.find((t) => t.isDefault && !t.deletedAt);
            if (!fallback || patch.monthlyAmount === null) return;
            get().setTemplateBudgetLine({
              templateId: fallback.id,
              categoryId,
              ...patch,
              monthlyAmount: patch.monthlyAmount,
            } as Draft<TemplateBudgetLine>);
            return;
          }

          const { currency: _currency, ...overridePatch } = patch;
          const writeOverride = (assignmentId: string) => {
            const existing = get().periodBudgetOverrides.find(
              (o) => o.assignmentId === assignmentId && o.categoryId === categoryId && !o.deletedAt
            );
            const record = existing
              ? touch(existing, { ...overridePatch, categoryId } as Partial<PeriodBudgetOverride>)
              : withNewMeta({ ...overridePatch, assignmentId, categoryId } as Draft<PeriodBudgetOverride>);
            enqueue('period_budget_overrides', record.id, 'upsert', record as unknown as Record<string, unknown>);
            set((s) => ({
              periodBudgetOverrides: existing
                ? s.periodBudgetOverrides.map((o) => (o.id === existing.id ? record : o))
                : [...s.periodBudgetOverrides, record],
            }));
          };

          writeOverride(assignment.id);

          if (propagate === 'all') {
            // Además del periodo actual, el cambio se vuelve parte de la
            // plantilla: aplica a todo periodo que la use y no tenga ya su
            // propio ajuste.
            if (patch.monthlyAmount !== null) {
              get().setTemplateBudgetLine({
                templateId: assignment.templateId,
                categoryId,
                ...patch,
                monthlyAmount: patch.monthlyAmount,
              } as Draft<TemplateBudgetLine>);
            }
            return;
          }
          if (typeof propagate === 'number' && propagate > 0) {
            const upcoming = nextAssignmentsOfTemplate(
              assignment.templateId,
              periodKey,
              get().budgetAssignments.filter((a) => !a.deletedAt),
              propagate
            );
            for (const next of upcoming) writeOverride(next.id);
          }
        },
        clearPeriodOverride: (periodKey, categoryId) => {
          const state = get();
          const assignment = state.budgetAssignments.find((a) => a.periodKey === periodKey && !a.deletedAt);
          if (!assignment) return;
          const current = state.periodBudgetOverrides.find(
            (o) => o.assignmentId === assignment.id && o.categoryId === categoryId && !o.deletedAt
          );
          if (!current) return;
          const updated = touch(current, { deletedAt: new Date().toISOString() } as Partial<PeriodBudgetOverride>);
          set((s) => ({ periodBudgetOverrides: s.periodBudgetOverrides.map((o) => (o.id === current.id ? updated : o)) }));
          enqueue('period_budget_overrides', current.id, 'delete', updated as unknown as Record<string, unknown>);
        },

        addGoal: (draft) => {
          const goal = withNewMeta(draft);
          set((s) => ({ goals: [...s.goals, goal] }));
          enqueue('goals', goal.id, 'upsert', goal as unknown as Record<string, unknown>, goal.isDemo);
        },
        updateGoal: (id, patch) => {
          const current = get().goals.find((g) => g.id === id);
          if (!current) return;
          const updated = touch(current, patch);
          set((s) => ({ goals: s.goals.map((g) => (g.id === id ? updated : g)) }));
          enqueue('goals', id, 'upsert', updated as unknown as Record<string, unknown>, updated.isDemo);
        },
        contributeToGoal: (id, amount) => {
          const current = get().goals.find((g) => g.id === id);
          if (!current) return;
          const updated = touch(current, { currentAmount: current.currentAmount + amount });
          set((s) => ({ goals: s.goals.map((g) => (g.id === id ? updated : g)) }));
          enqueue('goals', id, 'upsert', updated as unknown as Record<string, unknown>, updated.isDemo);
        },
        deleteGoal: (id) => {
          const current = get().goals.find((g) => g.id === id);
          if (!current) return;
          const updated = touch(current, { deletedAt: new Date().toISOString() } as Partial<Goal>);
          set((s) => ({ goals: s.goals.map((g) => (g.id === id ? updated : g)) }));
          enqueue('goals', id, 'delete', updated as unknown as Record<string, unknown>, updated.isDemo);
        },

        addInvestment: (draft) => {
          const inv = withNewMeta(draft);
          set((s) => ({ investments: [...s.investments, inv] }));
          enqueue('investments', inv.id, 'upsert', inv as unknown as Record<string, unknown>, inv.isDemo);
        },
        updateInvestment: (id, patch) => {
          const current = get().investments.find((i) => i.id === id);
          if (!current) return;
          const updated = touch(current, patch);
          set((s) => ({ investments: s.investments.map((i) => (i.id === id ? updated : i)) }));
          enqueue('investments', id, 'upsert', updated as unknown as Record<string, unknown>, updated.isDemo);
        },
        deleteInvestment: (id) => {
          const current = get().investments.find((i) => i.id === id);
          if (!current) return;
          const updated = touch(current, { deletedAt: new Date().toISOString() } as Partial<InvestmentPosition>);
          set((s) => ({ investments: s.investments.map((i) => (i.id === id ? updated : i)) }));
          enqueue('investments', id, 'delete', updated as unknown as Record<string, unknown>, updated.isDemo);
        },

        addLiability: (draft) => {
          const liab = withNewMeta(draft);
          set((s) => ({ liabilities: [...s.liabilities, liab] }));
          enqueue('liabilities', liab.id, 'upsert', liab as unknown as Record<string, unknown>, liab.isDemo);
        },
        updateLiability: (id, patch) => {
          const current = get().liabilities.find((l) => l.id === id);
          if (!current) return;
          const updated = touch(current, patch);
          set((s) => ({ liabilities: s.liabilities.map((l) => (l.id === id ? updated : l)) }));
          enqueue('liabilities', id, 'upsert', updated as unknown as Record<string, unknown>, updated.isDemo);
          if (patch.balance !== undefined && patch.balance !== current.balance) {
            logAudit({
              entityType: 'liability',
              entityId: id,
              action: 'update',
              summary: `Saldo de deuda "${current.institution}": ${current.balance} → ${patch.balance}`,
              previousValue: current.balance,
              newValue: patch.balance,
            });
          }
        },
        deleteLiability: (id) => {
          const current = get().liabilities.find((l) => l.id === id);
          if (!current) return;
          const updated = touch(current, { deletedAt: new Date().toISOString() } as Partial<Liability>);
          set((s) => ({ liabilities: s.liabilities.map((l) => (l.id === id ? updated : l)) }));
          enqueue('liabilities', id, 'delete', updated as unknown as Record<string, unknown>, updated.isDemo);
        },

        payLiability: (id, opts) => {
          const s = get();
          const l = s.liabilities.find((x) => x.id === id);
          if (!l) return fail('Esa deuda ya no existe.');
          const account = opts.accountId ? s.accounts.find((a) => a.id === opts.accountId && !a.deletedAt) : undefined;
          const err = validateLiabilityPayment(l, opts.amount, account, !!opts.accountId);
          if (err) return fail(err);
          const todayIso = todayOf(new Date());
          const day = (opts.date ?? todayIso).slice(0, 10);
          if (!parseOk(day)) return fail('La fecha no es válida.');
          if (day > todayIso) return fail('Un pago no puede ser de una fecha futura.');
          const owe = directionOf(l) === 'owe';
          let transactionId: string | undefined;
          if (account) {
            const tx = get().addTransaction({
              type: owe ? 'expense' : 'income',
              amount: opts.amount,
              currency: l.currency,
              categoryId: owe ? 'debt' : 'income',
              subcategoryId: owe ? PAYMENT_SUBCATEGORY[l.type] : 'inc_reimbursement',
              merchant: l.counterparty || l.institution,
              accountId: account.id,
              date: day === todayIso ? new Date().toISOString() : noonIso(day),
              notes: owe ? `Pago de deuda: ${l.institution}` : `Cobro: ${l.institution}`,
              origin: 'manual',
              liabilityId: l.id,
            });
            transactionId = tx.id;
          }
          const effect = applyPayment(l, opts.amount, new Date().toISOString());
          get().updateLiability(l.id, effect as Partial<Draft<Liability>>);
          logAudit({
            entityType: 'liability',
            entityId: l.id,
            action: 'update',
            summary: `${owe ? 'Pago' : 'Cobro'} de ${opts.amount} en "${l.institution}"${effect.status === 'settled' ? ' — deuda saldada' : ''}`,
            previousValue: l.balance,
            newValue: effect.balance,
          });
          return { ok: true, transactionId };
        },
        settleLiability: (id) => {
          const l = get().liabilities.find((x) => x.id === id);
          if (!l || l.deletedAt) return fail('Esa deuda ya no existe.');
          if (l.status === 'settled') return fail('Esa deuda ya está saldada.');
          get().updateLiability(id, { balance: 0, status: 'settled', settledAt: new Date().toISOString(), installmentsPaid: l.installmentCount ?? l.installmentsPaid } as Partial<Draft<Liability>>);
          logAudit({ entityType: 'liability', entityId: id, action: 'update', summary: `Deuda "${l.institution}" marcada como saldada`, previousValue: l.balance, newValue: 0 });
          return OK;
        },
        reopenLiability: (id, balance) => {
          const l = get().liabilities.find((x) => x.id === id);
          if (!l || l.deletedAt) return fail('Esa deuda ya no existe.');
          if (l.status !== 'settled') return fail('Esa deuda no está saldada.');
          if (typeof balance !== 'number' || !Number.isFinite(balance) || balance <= 0) return fail('El saldo debe ser mayor que cero.');
          get().updateLiability(id, { balance, status: 'active', settledAt: undefined } as Partial<Draft<Liability>>);
          return OK;
        },
        registerDividend: (investmentId, opts) => {
          const s = get();
          const inv = s.investments.find((i) => i.id === investmentId && !i.deletedAt);
          if (!inv) return fail('Esa inversión ya no existe.');
          if (typeof opts.amount !== 'number' || !Number.isFinite(opts.amount) || opts.amount <= 0) return fail('El monto debe ser un número mayor que cero.');
          const account = opts.accountId ? s.accounts.find((a) => a.id === opts.accountId && !a.deletedAt) : undefined;
          if (opts.accountId && !account) return fail('La cuenta que elegiste ya no existe.');
          if (account?.isLiability) return fail('Un dividendo no puede entrar a una tarjeta de crédito: elige una cuenta de efectivo, banco o inversión.');
          if (account && account.currency !== inv.currency) return fail('La cuenta y la inversión usan monedas distintas; todavía no puedo convertir entre ellas.');
          const todayIso = todayOf(new Date());
          const day = (opts.date ?? todayIso).slice(0, 10);
          if (!parseOk(day)) return fail('La fecha no es válida.');
          if (day > todayIso) return fail('Un dividendo recibido no puede ser de una fecha futura.');
          let transactionId: string | undefined;
          if (account) {
            const tx = get().addTransaction({
              type: 'income',
              amount: opts.amount,
              currency: inv.currency,
              categoryId: 'income',
              subcategoryId: 'inc_dividends',
              merchant: inv.ticker,
              accountId: account.id,
              date: day === todayIso ? new Date().toISOString() : noonIso(day),
              notes: `Dividendo: ${inv.name}`,
              origin: 'manual',
            });
            transactionId = tx.id;
          }
          get().updateInvestment(inv.id, { dividendsReceived: Math.round(((inv.dividendsReceived ?? 0) + opts.amount) * 100) / 100 });
          logAudit({ entityType: 'investment', entityId: inv.id, action: 'update', summary: `Dividendo de ${opts.amount} en ${inv.ticker}`, newValue: opts.amount });
          return { ok: true, transactionId };
        },

        recordNetWorthSnapshot: (draft) =>
          set((s) => {
            const existing = s.netWorthHistory.find((h) => h.date === draft.date);
            const record = existing ? touch(existing, draft) : withNewMeta(draft);
            enqueue('net_worth_snapshots', record.id, 'upsert', record as unknown as Record<string, unknown>, record.isDemo);
            const withoutToday = s.netWorthHistory.filter((h) => h.date !== draft.date);
            return { netWorthHistory: [...withoutToday, record].sort((a, b) => a.date.localeCompare(b.date)) };
          }),

        startConversation: () => {
          const id = generateId();
          const now = new Date().toISOString();
          const conversation: ChatConversation = { id, title: 'Nueva conversación', createdAt: now, updatedAt: now, lastPreview: '' };
          set((s) => ({ conversations: [conversation, ...s.conversations], activeConversationId: id }));
          return id;
        },
        setActiveConversation: (id) => set({ activeConversationId: id }),
        addChatMessage: (msg) => {
          const message: ChatMessage = { ...msg, id: generateId(), createdAt: new Date().toISOString() };
          set((s) => ({
            chatMessages: [...s.chatMessages, message],
            conversations: s.conversations.map((c) =>
              c.id === message.conversationId
                ? {
                    ...c,
                    updatedAt: message.createdAt,
                    lastPreview: message.text.slice(0, 80),
                    // El título se fija con el primer mensaje del usuario —
                    // los siguientes ya no lo cambian.
                    title: c.title === 'Nueva conversación' && message.role === 'user' ? message.text.slice(0, 40) : c.title,
                  }
                : c
            ),
          }));
          return message;
        },
        deleteConversation: (id) => {
          set((s) => ({
            conversations: s.conversations.filter((c) => c.id !== id),
            chatMessages: s.chatMessages.filter((m) => m.conversationId !== id),
            activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
          }));
        },
        renameConversation: (id, title) => {
          const trimmed = title.trim();
          if (!trimmed) return;
          set((s) => ({ conversations: s.conversations.map((c) => (c.id === id ? { ...c, title: trimmed } : c)) }));
        },
        toggleConversationPinned: (id) => {
          set((s) => ({ conversations: s.conversations.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)) }));
        },
        clearAllConversations: () => {
          set({ conversations: [], chatMessages: [], activeConversationId: null });
        },
        updateActionStatus: (messageId, status, patch) => {
          set((s) => ({
            chatMessages: s.chatMessages.map((m) =>
              m.id === messageId && m.action ? { ...m, action: { ...m.action, status, ...patch } } : m
            ),
          }));
        },
        aiApplyAction: (action) => {
          // Contrato de idempotencia (docs/03_fase2_contratos_v1.md, §5): esta es
          // la única puerta de escritura real para acciones de IA — debe negarse
          // a aplicar una propuesta que ya no está en 'proposed', sin importar
          // cuántas veces o desde dónde se le llame con el mismo objeto.
          if (action.status !== 'proposed') {
            return { ok: false, error: 'Esta acción ya fue procesada.' };
          }
          const state = get();
          switch (action.type) {
            case 'add_transaction': {
              const args = action.args as unknown as AddTransactionArgs;
              const account = state.accounts.find((a) => a.id === args.accountId && !a.deletedAt);
              if (!account) return { ok: false, error: `La cuenta "${args.accountName}" ya no existe.` };
              state.addTransaction({
                type: args.transactionType,
                amount: args.amount,
                currency: args.currency,
                categoryId: args.categoryId,
                subcategoryId: args.subcategoryId,
                accountId: args.accountId,
                merchant: args.merchant,
                date: args.date ?? new Date().toISOString(),
                origin: 'manual',
                notes: 'Agregado desde el chat de IA',
              });
              return { ok: true };
            }
            case 'transfer_between_accounts': {
              const args = action.args as unknown as TransferBetweenAccountsArgs;
              const fromAccount = state.accounts.find((a) => a.id === args.fromAccountId && !a.deletedAt);
              if (!fromAccount) return { ok: false, error: `La cuenta "${args.fromAccountName}" ya no existe.` };
              const toAccount = state.accounts.find((a) => a.id === args.toAccountId && !a.deletedAt);
              if (!toAccount) return { ok: false, error: `La cuenta "${args.toAccountName}" ya no existe.` };
              state.addTransaction({
                type: 'transfer',
                amount: args.amount,
                currency: args.currency,
                categoryId: 'transfer',
                subcategoryId: 'transfer_own',
                accountId: args.fromAccountId,
                toAccountId: args.toAccountId,
                merchant: `${fromAccount.name} → ${toAccount.name}`,
                date: new Date().toISOString(),
                origin: 'manual',
                notes: 'Agregado desde el chat de IA',
              });
              return { ok: true };
            }
            case 'add_account': {
              const args = action.args as unknown as AddAccountArgs;
              state.addAccount({ name: args.name, type: args.accountType, currency: args.currency, balance: args.balance });
              return { ok: true };
            }
            case 'delete_account': {
              const args = action.args as unknown as DeleteAccountArgs;
              const account = state.accounts.find((a) => a.id === args.accountId && !a.deletedAt);
              if (!account) return { ok: false, error: `La cuenta "${args.accountName}" ya no existe.` };
              state.deleteAccount(args.accountId);
              return { ok: true };
            }
            case 'add_goal': {
              const args = action.args as unknown as AddGoalArgs;
              state.addGoal({ name: args.name, targetAmount: args.targetAmount, currentAmount: 0, currency: args.currency, targetDate: args.targetDate });
              return { ok: true };
            }
            case 'contribute_to_goal': {
              const args = action.args as unknown as ContributeToGoalArgs;
              const goal = state.goals.find((g) => g.id === args.goalId && !g.deletedAt);
              if (!goal) return { ok: false, error: `La meta "${args.goalName}" ya no existe.` };
              state.contributeToGoal(args.goalId, args.amount);
              return { ok: true };
            }
            case 'withdraw_from_goal': {
              const args = action.args as unknown as WithdrawFromGoalArgs;
              const goal = state.goals.find((g) => g.id === args.goalId && !g.deletedAt);
              if (!goal) return { ok: false, error: `La meta "${args.goalName}" ya no existe.` };
              // La propuesta pudo armarse hace rato: se vuelve a comprobar contra lo que la meta tiene AHORA.
              if (args.amount > goal.currentAmount) return { ok: false, error: `La meta "${args.goalName}" ya solo tiene ${goal.currentAmount}: no alcanza para retirar ${args.amount}.` };
              state.contributeToGoal(args.goalId, -args.amount);
              return { ok: true };
            }
            case 'update_goal_date': {
              const args = action.args as unknown as UpdateGoalDateArgs;
              const goal = state.goals.find((g) => g.id === args.goalId && !g.deletedAt);
              if (!goal) return { ok: false, error: `La meta "${args.goalName}" ya no existe.` };
              state.updateGoal(args.goalId, { targetDate: args.targetDate });
              return { ok: true };
            }
            case 'update_liability_due_date': {
              const args = action.args as unknown as UpdateLiabilityDueDateArgs;
              const liability = state.liabilities.find((l) => l.id === args.liabilityId && !l.deletedAt);
              if (!liability) return { ok: false, error: `La deuda "${args.institution}" ya no existe.` };
              state.updateLiability(args.liabilityId, { dueDate: args.dueDate });
              return { ok: true };
            }
            case 'update_goal_target': {
              const args = action.args as unknown as UpdateGoalTargetArgs;
              const goal = state.goals.find((g) => g.id === args.goalId && !g.deletedAt);
              if (!goal) return { ok: false, error: `La meta "${args.goalName}" ya no existe.` };
              state.updateGoal(args.goalId, { targetAmount: args.targetAmount });
              return { ok: true };
            }
            case 'delete_goal': {
              const args = action.args as unknown as DeleteGoalArgs;
              const goal = state.goals.find((g) => g.id === args.goalId && !g.deletedAt);
              if (!goal) return { ok: false, error: `La meta "${args.goalName}" ya no existe.` };
              state.deleteGoal(args.goalId);
              return { ok: true };
            }
            case 'add_liability': {
              const args = action.args as unknown as AddLiabilityArgs;
              state.addLiability({ institution: args.institution, type: args.liabilityType, balance: args.balance, currency: args.currency });
              return { ok: true };
            }
            case 'update_liability_balance': {
              const args = action.args as unknown as UpdateLiabilityBalanceArgs;
              const liability = state.liabilities.find((l) => l.id === args.liabilityId && !l.deletedAt);
              if (!liability) return { ok: false, error: `La deuda "${args.institution}" ya no existe.` };
              state.updateLiability(args.liabilityId, { balance: args.balance });
              return { ok: true };
            }
            case 'delete_liability': {
              const args = action.args as unknown as DeleteLiabilityArgs;
              const liability = state.liabilities.find((l) => l.id === args.liabilityId && !l.deletedAt);
              if (!liability) return { ok: false, error: `La deuda "${args.institution}" ya no existe.` };
              state.deleteLiability(args.liabilityId);
              return { ok: true };
            }
            case 'set_budget_line': {
              const args = action.args as unknown as SetBudgetLineArgs;
              state.ensureDefaultBudgetTemplate();
              const template = get().budgetTemplates.find((t) => t.isDefault && !t.deletedAt);
              if (!template) return { ok: false, error: 'No se pudo preparar tu presupuesto por defecto.' };
              state.setTemplateBudgetLine({
                templateId: template.id,
                categoryId: args.categoryId,
                monthlyAmount: args.monthlyAmount,
                currency: args.currency,
              });
              return { ok: true };
            }
            case 'delete_budget_line': {
              const args = action.args as unknown as DeleteBudgetLineArgs;
              const line = state.templateBudgetLines.find((l) => l.id === args.lineId && !l.deletedAt);
              if (!line) return { ok: false, error: `El renglón de "${args.categoryName}" ya no existe.` };
              state.deleteTemplateBudgetLine(args.lineId);
              return { ok: true };
            }
            case 'delete_transaction': {
              const args = action.args as unknown as DeleteTransactionArgs;
              const tx = state.transactions.find((t) => t.id === args.transactionId && !t.deletedAt);
              if (!tx) return { ok: false, error: 'Ese movimiento ya no existe.' };
              state.deleteTransaction(args.transactionId);
              return { ok: true };
            }
            case 'add_forecast': {
              const args = action.args as unknown as AddForecastArgs;
              const account = state.accounts.find((a) => a.id === args.accountId && !a.deletedAt);
              if (!account) return { ok: false, error: `La cuenta "${args.accountName}" ya no existe.` };
              if (args.date < todayOf(new Date())) return { ok: false, error: 'Esa fecha ya pasó: un movimiento previsto es de hoy en adelante.' };
              state.addForecast({
                type: args.transactionType,
                amount: args.amount,
                currency: args.currency,
                categoryId: args.categoryId,
                subcategoryId: args.subcategoryId,
                accountId: args.accountId,
                merchant: args.merchant,
                date: noonIso(args.date),
                origin: 'manual',
                notes: 'Previsto desde el chat de IA',
              });
              return { ok: true };
            }
            case 'confirm_forecast': {
              const args = action.args as unknown as ConfirmForecastArgs;
              return state.confirmForecast(args.forecastId, args.amount !== undefined ? { amount: args.amount } : undefined);
            }
            case 'skip_forecast': {
              const args = action.args as unknown as SkipForecastArgs;
              return state.skipForecast(args.forecastId);
            }
            case 'postpone_forecast': {
              const args = action.args as unknown as PostponeForecastArgs;
              return state.postponeForecast(args.forecastId, args.newDate);
            }
            case 'add_recurring': {
              const args = action.args as unknown as AddRecurringArgs;
              return state.createRule({
                kind: 'transaction',
                name: args.name,
                amount: args.amount,
                currency: args.currency,
                txType: args.transactionType,
                categoryId: args.categoryId,
                subcategoryId: args.subcategoryId,
                merchant: args.name,
                accountId: args.accountId,
                recurrence: args.recurrence as Recurrence,
              });
            }
            case 'add_recurring_contribution': {
              const args = action.args as unknown as AddRecurringContributionArgs;
              return state.createRule({ kind: 'goal_contribution', name: args.name, amount: args.amount, currency: args.currency, goalId: args.goalId, recurrence: args.recurrence as Recurrence });
            }
            case 'update_recurring_amount': {
              const args = action.args as unknown as UpdateRecurringAmountArgs;
              return state.updateRule(args.ruleId, { amount: args.amount });
            }
            case 'pause_recurring':
              return state.pauseRule((action.args as unknown as PauseRecurringArgs).ruleId);
            case 'resume_recurring':
              return state.resumeRule((action.args as unknown as ResumeRecurringArgs).ruleId);
            case 'end_recurring':
              return state.endRule((action.args as unknown as EndRecurringArgs).ruleId);
            case 'add_reminder': {
              const args = action.args as unknown as AddReminderArgs;
              return state.createReminder({
                title: args.title,
                date: args.date,
                recurrence: args.recurrence as Recurrence | undefined,
                timeOfDay: args.timeOfDay,
                advanceDays: args.advanceDays,
                maxAttempts: args.maxAttempts,
                push: true,
              });
            }
            case 'cancel_reminder':
              return state.cancelReminder((action.args as unknown as CancelReminderArgs).reminderId);
            case 'pay_liability': {
              const args = action.args as unknown as PayLiabilityArgs;
              return state.payLiability(args.liabilityId, { amount: args.amount, accountId: args.accountId });
            }
            case 'settle_liability':
              return state.settleLiability((action.args as unknown as SettleLiabilityArgs).liabilityId);
            case 'register_dividend': {
              const args = action.args as unknown as RegisterDividendArgs;
              return state.registerDividend(args.investmentId, { amount: args.amount, accountId: args.accountId });
            }
            default: {
              const exhaustiveCheck: never = action.type;
              return { ok: false, error: `Tipo de acción no reconocido: ${exhaustiveCheck}` };
            }
          }
        },

        aiApplyPlan: (messageId) => {
          const message = get().chatMessages.find((m) => m.id === messageId);
          const plan = message?.plan;
          if (!message || !plan) return { ok: false, status: 'failed', error: 'No encontré ese plan.' };
          const writePlan = (next: ActionPlan) =>
            set((s) => ({ chatMessages: s.chatMessages.map((m) => (m.id === messageId ? { ...m, plan: next } : m)) }));

          const virtualMap: Record<string, string> = {};
          // Ids que existen ANTES de cada paso, para saber cuál registro creó (auditoría).
          let before = { tx: new Set<string>(), goals: new Set<string>(), accounts: new Set<string>(), liabilities: new Set<string>() };
          const snapshot = () => ({
            tx: new Set(get().transactions.map((x) => x.id)),
            goals: new Set(get().goals.map((x) => x.id)),
            accounts: new Set(get().accounts.map((x) => x.id)),
            liabilities: new Set(get().liabilities.map((x) => x.id)),
          });
          const created = (key: 'tx' | 'goals' | 'accounts' | 'liabilities') => {
            const list = key === 'tx' ? get().transactions : key === 'goals' ? get().goals : key === 'accounts' ? get().accounts : get().liabilities;
            return list.find((x) => !before[key].has(x.id))?.id;
          };

          const result = executePlan(plan, {
            persist: writePlan,
            apply: (step) => {
              before = snapshot();
              // Ids virtuales (`virtual:account:nu`): se cambian por los reales de lo que un paso anterior ya creó.
              const sub = substituteVirtualIds(step.args, virtualMap);
              if (sub.unresolved.length) return { ok: false, error: 'Este paso depende de algo que un paso anterior no llegó a crear.' };
              const res = get().aiApplyAction(sub.args === step.args ? step : { ...step, args: sub.args });
              if (res.ok) {
                const vid = virtualIdFor(step.type, step.args);
                const kind = virtualKindOf(step.type);
                const realId = kind === 'account' ? created('accounts') : kind === 'goal' ? created('goals') : kind === 'liability' ? created('liabilities') : undefined;
                if (vid && realId) virtualMap[vid] = realId;
              }
              return res;
            },
            onStepApplied: (step, index) => {
              const label = `Chat IA · plan ${plan.id.slice(0, 8)} · paso ${index + 1}: ${step.summary}`;
              const a = step.args as Record<string, any>;
              switch (step.type) {
                case 'add_transaction':
                  logAudit({ entityType: 'transaction', entityId: created('tx') ?? step.id, action: 'create', summary: label, newValue: a.amount });
                  break;
                case 'transfer_between_accounts':
                  logAudit({ entityType: 'transaction', entityId: created('tx') ?? step.id, action: 'create', summary: label, newValue: a.amount });
                  break;
                case 'delete_transaction':
                  logAudit({ entityType: 'transaction', entityId: a.transactionId, action: 'delete', summary: label });
                  break;
                case 'add_account':
                  logAudit({ entityType: 'account', entityId: created('accounts') ?? step.id, action: 'create', summary: label, newValue: a.balance });
                  break;
                case 'delete_account':
                  logAudit({ entityType: 'account', entityId: a.accountId, action: 'delete', summary: label });
                  break;
                case 'add_goal':
                  logAudit({ entityType: 'goal', entityId: created('goals') ?? step.id, action: 'create', summary: label, newValue: a.targetAmount });
                  break;
                case 'contribute_to_goal':
                  logAudit({ entityType: 'goal', entityId: a.goalId, action: 'update', summary: label, newValue: a.amount });
                  break;
                case 'update_goal_target':
                  logAudit({ entityType: 'goal', entityId: a.goalId, action: 'update', summary: label, newValue: a.targetAmount });
                  break;
                case 'withdraw_from_goal':
                  logAudit({ entityType: 'goal', entityId: a.goalId, action: 'update', summary: label, newValue: -a.amount });
                  break;
                case 'update_goal_date':
                  logAudit({ entityType: 'goal', entityId: a.goalId, action: 'update', summary: label });
                  break;
                case 'update_liability_due_date':
                  logAudit({ entityType: 'liability', entityId: a.liabilityId, action: 'update', summary: label });
                  break;
                case 'delete_goal':
                  logAudit({ entityType: 'goal', entityId: a.goalId, action: 'delete', summary: label });
                  break;
                case 'delete_liability':
                  logAudit({ entityType: 'liability', entityId: a.liabilityId, action: 'delete', summary: label });
                  break;
                case 'add_liability':
                  logAudit({ entityType: 'liability', entityId: created('liabilities') ?? step.id, action: 'create', summary: label, newValue: a.balance });
                  break;
                case 'set_budget_line':
                  logAudit({ entityType: 'budget', entityId: get().templateBudgetLines.find((l) => l.categoryId === a.categoryId && !l.deletedAt)?.id ?? step.id, action: 'update', summary: label, newValue: a.monthlyAmount });
                  break;
                case 'delete_budget_line':
                  logAudit({ entityType: 'budget', entityId: a.lineId, action: 'delete', summary: label });
                  break;
                case 'add_forecast':
                  logAudit({ entityType: 'transaction', entityId: created('tx') ?? step.id, action: 'create', summary: label, newValue: a.amount });
                  break;
                case 'skip_forecast':
                case 'postpone_forecast':
                  logAudit({ entityType: 'transaction', entityId: a.forecastId, action: 'update', summary: label });
                  break;
                case 'confirm_forecast':
                case 'pay_liability':
                case 'settle_liability':
                case 'register_dividend':
                  break; // la acción del store ya deja su propia entrada de auditoría (con el monto)
                case 'add_recurring':
                case 'add_recurring_contribution':
                case 'update_recurring_amount':
                case 'pause_recurring':
                case 'resume_recurring':
                case 'end_recurring':
                case 'add_reminder':
                case 'cancel_reminder':
                  break; // reglas y avisos no tienen entidad en la bitácora de saldos: el propio plan guardado en el chat es el rastro
                case 'update_liability_balance':
                  break; // updateLiability ya deja su propia entrada de auditoría con el saldo anterior y el nuevo
                default: {
                  const exhaustive: never = step.type;
                  void exhaustive;
                }
              }
            },
          });
          return { ok: result.ok, status: result.status, error: result.error };
        },
        dismissPlan: (messageId) => {
          set((s) => ({
            chatMessages: s.chatMessages.map((m) =>
              m.id === messageId && m.plan?.status === 'proposed'
                ? { ...m, plan: { ...m.plan, status: 'dismissed', steps: m.plan.steps.map((st) => ({ ...st, status: 'dismissed' })) } }
                : m
            ),
          }));
        },
        setClarificationStatus: (messageId, status) => {
          set((s) => ({
            chatMessages: s.chatMessages.map((m) => (m.id === messageId && m.clarification ? { ...m, clarification: { ...m.clarification, status } } : m)),
          }));
        },
        recoverInterruptedPlans: () => {
          set((s) => ({
            chatMessages: s.chatMessages.map((m) => (m.plan?.status === 'applying' ? { ...m, plan: recoverInterruptedPlan(m.plan) } : m)),
          }));
        },

        // =====================================================================================================
        // P3 — previsto vs. real, movimientos recurrentes y avisos. La lógica de fechas y generación vive en utils/*
        // (pura y probada); aquí solo se aplican los cambios, se encolan para sincronizar y se auditan.
        // =====================================================================================================
        addForecast: (draft) => {
          const tx = withNewMeta({ ...draft, status: 'forecast' as const, plannedDate: draft.plannedDate ?? draft.date, origin: draft.origin ?? 'manual' });
          set((s) => ({ transactions: [tx, ...s.transactions] }));
          enqueue('transactions', tx.id, 'upsert', tx as unknown as Record<string, unknown>, tx.isDemo);
          return tx;
        },
        confirmForecast: (id, opts) => {
          const res = confirmForecastInternal(id, opts);
          if (res.ok) settleOccurrencesForForecast(get().transactions.find((x) => x.id === id), 'confirmed');
          return res;
        },
        skipForecast: (id) => {
          const tx = get().transactions.find((x) => x.id === id);
          if (!tx || tx.deletedAt) return fail('Ese movimiento previsto ya no existe.');
          if (tx.status !== 'forecast' && tx.status !== 'paused') return fail('Ese movimiento ya no está previsto.');
          patchTransaction(id, { status: 'skipped' });
          settleOccurrencesForForecast(tx, 'not_occurred');
          return OK;
        },
        reopenForecast: (id) => {
          const tx = get().transactions.find((x) => x.id === id);
          if (!tx || tx.deletedAt) return fail('Ese movimiento previsto ya no existe.');
          if (tx.status !== 'skipped') return fail('Solo se puede reabrir un previsto marcado como "no ocurrió".');
          patchTransaction(id, { status: 'forecast' });
          return OK;
        },
        postponeForecast: (id, newDateIso) => {
          const tx = get().transactions.find((x) => x.id === id);
          if (!tx || tx.deletedAt) return fail('Ese movimiento previsto ya no existe.');
          if (tx.status !== 'forecast') return fail('Ese movimiento ya no está previsto.');
          const day = newDateIso.slice(0, 10);
          if (!parseOk(day)) return fail('La fecha no es válida.');
          if (day < todayOf(new Date())) return fail('Para posponerlo elige una fecha de hoy en adelante.');
          patchTransaction(id, { date: noonIso(day), plannedDate: tx.plannedDate ?? tx.date });
          settleOccurrencesForForecast(tx, 'skipped'); // el aviso de la fecha vieja ya no aplica
          return OK;
        },

        createRule: (draft, opts) => {
          const s = get();
          const error = validateRuleDraft(draft, { accounts: s.accounts, goals: s.goals });
          if (error) return fail(error);
          const rule = withNewMeta<Omit<RecurringRule, keyof SyncMeta>>({
            kind: draft.kind,
            name: draft.name.trim(),
            status: 'active',
            recurrence: draft.recurrence,
            amount: draft.amount,
            currency: draft.currency,
            txType: draft.txType,
            categoryId: draft.categoryId,
            subcategoryId: draft.subcategoryId,
            merchant: draft.merchant,
            accountId: draft.accountId,
            toAccountId: draft.toAccountId,
            goalId: draft.goalId,
            notes: draft.notes,
          });
          putRule(rule);
          if (opts?.remind !== false) {
            const goalName = rule.kind === 'goal_contribution' ? s.goals.find((g) => g.id === rule.goalId)?.name : undefined;
            const reminder = withNewMeta<Omit<Reminder, keyof SyncMeta>>({
              kind: 'rule',
              title: goalName ? `Aportar a ${goalName}` : rule.name,
              sourceType: 'rule',
              sourceId: rule.id,
              timeOfDay: opts?.timeOfDay ?? REMINDER_DEFAULTS.timeOfDay,
              advanceDays: normalizeAdvanceDays(opts?.advanceDays),
              maxAttempts: Math.max(1, Math.min(3, opts?.maxAttempts ?? REMINDER_DEFAULTS.maxAttempts)),
              attemptIntervalMinutes: REMINDER_DEFAULTS.attemptIntervalMinutes,
              push: opts?.push ?? REMINDER_DEFAULTS.push,
              status: 'active',
            });
            putReminder(reminder);
          }
          get().runMaterialization();
          return { ok: true, rule: get().recurringRules.find((r) => r.id === rule.id) };
        },
        updateRule: (id, patch) => {
          const s = get();
          const cur = s.recurringRules.find((r) => r.id === id && !r.deletedAt);
          if (!cur) return fail('Esa regla ya no existe.');
          if (cur.status === 'ended') return fail('Esa regla ya terminó.');
          const merged = { ...cur, ...patch } as RecurringRule;
          const error = validateRuleDraft(merged, { accounts: s.accounts, goals: s.goals });
          if (error) return fail(error);
          // si cambió cuándo ocurre, el avance de generación se reinicia: reconcile se encarga de lo que sobre/falte
          const next = patchRule(id, { ...patch, name: patch.name ? patch.name.trim() : cur.name } as Partial<RecurringRule>)!;
          const todayIso = todayOf(new Date());
          const nowIso = new Date().toISOString();
          const diff = reconcileRuleForecasts(next, get().transactions, todayIso, nowIso);
          applyForecastDiff(diff);
          // el aviso de la regla sigue su nombre y sus fechas
          for (const rem of get().reminders.filter((r) => r.sourceType === 'rule' && r.sourceId === id && !r.deletedAt)) {
            if (patch.name && rem.kind === 'rule' && next.kind === 'transaction') patchReminder(rem.id, { title: next.name });
            resyncReminderOccurrences(rem.id);
          }
          return OK;
        },
        pauseRule: (id) => {
          const cur = get().recurringRules.find((r) => r.id === id && !r.deletedAt);
          if (!cur) return fail('Esa regla ya no existe.');
          if (cur.status !== 'active') return fail(cur.status === 'paused' ? 'Esa regla ya está en pausa.' : 'Esa regla ya terminó.');
          const todayIso = todayOf(new Date());
          patchRule(id, { status: 'paused', pausedAt: new Date().toISOString() });
          for (const txId of forecastsToPause(get().transactions, id, todayIso)) patchTransaction(txId, { status: 'paused' });
          for (const rem of get().reminders.filter((r) => r.sourceType === 'rule' && r.sourceId === id && !r.deletedAt && r.status === 'active')) {
            for (const oid of occurrencesToPause(get().reminderOccurrences, rem.id, todayIso)) patchOccurrence(oid, { status: 'paused', nextAttemptAt: undefined });
          }
          return OK;
        },
        resumeRule: (id) => {
          const cur = get().recurringRules.find((r) => r.id === id && !r.deletedAt);
          if (!cur) return fail('Esa regla ya no existe.');
          if (cur.status !== 'paused') return fail(cur.status === 'active' ? 'Esa regla ya está activa.' : 'Esa regla ya terminó.');
          const todayIso = todayOf(new Date());
          // lo que cayó durante la pausa no se genera: la generación retoma desde hoy
          patchRule(id, { status: 'active', pausedAt: undefined, generatedUntil: addDaysIso(todayIso, -1) });
          const res = forecastsToResume(get().transactions, id, todayIso);
          for (const txId of res.reopen) patchTransaction(txId, { status: 'forecast' });
          for (const txId of res.skip) patchTransaction(txId, { status: 'skipped' });
          for (const rem of get().reminders.filter((r) => r.sourceType === 'rule' && r.sourceId === id && !r.deletedAt && r.status === 'active')) {
            const o = occurrencesToResume(get().reminderOccurrences, rem.id, todayIso);
            const nowIso = new Date().toISOString();
            for (const oid of o.reopen) {
              const occ = get().reminderOccurrences.find((x) => x.id === oid)!;
              const stale = new Date(occ.scheduledFor).getTime() < Date.now() - 48 * 3600_000;
              patchOccurrence(oid, { status: 'pending', nextAttemptAt: occ.push && !stale ? occ.scheduledFor : undefined });
            }
            for (const oid of o.skip) patchOccurrence(oid, { status: 'skipped', resolvedAt: nowIso });
          }
          get().runMaterialization();
          return OK;
        },
        endRule: (id) => endOrDeleteRule(id, false),
        deleteRule: (id) => endOrDeleteRule(id, true),

        createReminder: (draft) => {
          const error = validateReminderDraft(draft);
          if (error) return fail(error);
          const reminder = withNewMeta<Omit<Reminder, keyof SyncMeta>>({
            kind: draft.kind ?? 'custom',
            title: draft.title.trim(),
            note: draft.note,
            sourceType: draft.sourceType,
            sourceId: draft.sourceId,
            recurrence: draft.recurrence,
            date: draft.recurrence ? undefined : draft.date,
            timeOfDay: draft.timeOfDay ?? REMINDER_DEFAULTS.timeOfDay,
            advanceDays: normalizeAdvanceDays(draft.advanceDays),
            maxAttempts: draft.maxAttempts ?? REMINDER_DEFAULTS.maxAttempts,
            attemptIntervalMinutes: normalizeIntervalMinutes(draft.attemptIntervalMinutes),
            push: draft.push ?? REMINDER_DEFAULTS.push,
            status: 'active',
          });
          putReminder(reminder);
          get().runMaterialization();
          return { ok: true, reminder };
        },
        updateReminder: (id, patch) => {
          const cur = get().reminders.find((r) => r.id === id && !r.deletedAt);
          if (!cur) return fail('Ese aviso ya no existe.');
          if (cur.status === 'cancelled') return fail('Ese aviso ya está cancelado.');
          const merged = { ...cur, ...patch } as Reminder;
          const error = validateReminderDraft(merged);
          if (error) return fail(error);
          const next: Partial<Reminder> = { ...patch };
          if (patch.title !== undefined) next.title = patch.title.trim();
          if (patch.advanceDays !== undefined) next.advanceDays = normalizeAdvanceDays(patch.advanceDays);
          if (patch.attemptIntervalMinutes !== undefined) next.attemptIntervalMinutes = normalizeIntervalMinutes(patch.attemptIntervalMinutes);
          if (patch.recurrence) next.date = undefined;
          if (patch.date && !patch.recurrence) next.recurrence = undefined;
          patchReminder(id, next);
          resyncReminderOccurrences(id);
          return OK;
        },
        pauseReminder: (id) => {
          const cur = get().reminders.find((r) => r.id === id && !r.deletedAt);
          if (!cur) return fail('Ese aviso ya no existe.');
          if (cur.status !== 'active') return fail(cur.status === 'paused' ? 'Ese aviso ya está en pausa.' : 'Ese aviso ya está cancelado.');
          patchReminder(id, { status: 'paused' });
          for (const oid of occurrencesToPause(get().reminderOccurrences, id, todayOf(new Date()))) patchOccurrence(oid, { status: 'paused', nextAttemptAt: undefined });
          return OK;
        },
        resumeReminder: (id) => {
          const cur = get().reminders.find((r) => r.id === id && !r.deletedAt);
          if (!cur) return fail('Ese aviso ya no existe.');
          if (cur.status !== 'paused') return fail(cur.status === 'active' ? 'Ese aviso ya está activo.' : 'Ese aviso ya está cancelado.');
          const todayIso = todayOf(new Date());
          patchReminder(id, { status: 'active', generatedUntil: addDaysIso(todayIso, -1) });
          const res = occurrencesToResume(get().reminderOccurrences, id, todayIso);
          const nowIso = new Date().toISOString();
          for (const oid of res.reopen) {
            const occ = get().reminderOccurrences.find((x) => x.id === oid)!;
            const stale = new Date(occ.scheduledFor).getTime() < Date.now() - 48 * 3600_000;
            patchOccurrence(oid, { status: 'pending', nextAttemptAt: occ.push && !stale ? occ.scheduledFor : undefined });
          }
          for (const oid of res.skip) patchOccurrence(oid, { status: 'skipped', resolvedAt: nowIso });
          get().runMaterialization();
          return OK;
        },
        cancelReminder: (id) => {
          const cur = get().reminders.find((r) => r.id === id && !r.deletedAt);
          if (!cur) return fail('Ese aviso ya no existe.');
          if (cur.status === 'cancelled') return fail('Ese aviso ya está cancelado.');
          patchReminder(id, { status: 'cancelled' });
          cancelOpenOccurrences(id);
          return OK;
        },
        confirmOccurrence: (id) => {
          const occ = openOccurrence(id);
          if (typeof occ === 'string') return fail(occ);
          // Un aviso previo ("faltan 3 días") solo se da por enterado: no tiene nada que confirmar.
          if (occ.offsetDays > 0) return get().dismissOccurrence(id);
          const effect = applyOccurrenceEffect(occ, 'confirm');
          if (!effect.ok) return effect;
          resolveOccurrence(occ, 'confirmed');
          return OK;
        },
        markOccurrenceNotHappened: (id) => {
          const occ = openOccurrence(id);
          if (typeof occ === 'string') return fail(occ);
          if (occ.offsetDays > 0) return fail('Eso es un aviso previo: confírmalo cuando llegue el día.');
          const effect = applyOccurrenceEffect(occ, 'not_occurred');
          if (!effect.ok) return effect;
          resolveOccurrence(occ, 'not_occurred');
          return OK;
        },
        skipOccurrence: (id) => {
          const occ = openOccurrence(id);
          if (typeof occ === 'string') return fail(occ);
          if (occ.offsetDays > 0) return get().dismissOccurrence(id);
          const effect = applyOccurrenceEffect(occ, 'skip');
          if (!effect.ok) return effect;
          resolveOccurrence(occ, 'skipped');
          return OK;
        },
        postponeOccurrence: (id, to) => {
          const occ = openOccurrence(id);
          if (typeof occ === 'string') return fail(occ);
          let when: number;
          if (to.untilIso) when = new Date(to.untilIso).getTime();
          else if (to.minutes && to.minutes > 0) when = Date.now() + to.minutes * 60_000;
          else return fail('Dime hasta cuándo lo pospongo.');
          if (!Number.isFinite(when) || when <= Date.now()) return fail('Elige un momento que todavía no haya pasado.');
          if (when > Date.now() + 366 * 86400_000) return fail('No puedo posponerlo más de un año.');
          const iso = new Date(when).toISOString();
          patchOccurrence(id, {
            scheduledFor: iso,
            status: 'pending',
            attemptsMade: 0,
            nextAttemptAt: occ.push ? iso : undefined,
            postponedCount: (occ.postponedCount ?? 0) + 1,
            resolvedAt: undefined,
          });
          return OK;
        },
        dismissOccurrence: (id) => {
          const occ = openOccurrence(id);
          if (typeof occ === 'string') return fail(occ);
          resolveOccurrence(occ, 'dismissed');
          return OK;
        },

        runMaterialization: (nowArg) => {
          const nowD = nowArg ?? new Date();
          const nowIso = nowD.toISOString();
          const todayIso = todayOf(nowD);
          const s = get();
          if (s.recurringRules.length === 0 && s.reminders.length === 0) return { forecasts: 0, occurrences: 0 };
          const existingTx = new Set(s.transactions.map((x) => x.id));
          const newTx: Transaction[] = [];
          const rulePatches = new Map<string, string>();
          for (const rule of s.recurringRules) {
            const g = planRuleForecasts(rule, existingTx, todayIso, nowIso);
            for (const f of g.forecasts) {
              existingTx.add(f.id);
              newTx.push(f);
            }
            if (g.generatedUntil && g.generatedUntil !== rule.generatedUntil) rulePatches.set(rule.id, g.generatedUntil);
          }
          const rulesMap = new Map(s.recurringRules.map((r) => [r.id, r]));
          const existingOcc = new Set(s.reminderOccurrences.map((o) => o.id));
          const newOcc: ReminderOccurrence[] = [];
          const reminderPatches = new Map<string, string>();
          for (const rem of s.reminders) {
            const g = planReminderOccurrences(rem, rulesMap, existingOcc, todayIso, nowIso);
            for (const o of g.occurrences) {
              existingOcc.add(o.id);
              newOcc.push(o);
            }
            if (g.generatedUntil && g.generatedUntil !== rem.generatedUntil) reminderPatches.set(rem.id, g.generatedUntil);
          }
          if (newTx.length === 0 && newOcc.length === 0 && rulePatches.size === 0 && reminderPatches.size === 0) return { forecasts: 0, occurrences: 0 };
          const patchedRules = s.recurringRules.filter((r) => rulePatches.has(r.id)).map((r) => touch(r, { generatedUntil: rulePatches.get(r.id) }));
          const patchedReminders = s.reminders.filter((r) => reminderPatches.has(r.id)).map((r) => touch(r, { generatedUntil: reminderPatches.get(r.id) }));
          set((st) => ({
            transactions: newTx.length ? [...newTx, ...st.transactions] : st.transactions,
            recurringRules: st.recurringRules.map((r) => patchedRules.find((p) => p.id === r.id) ?? r),
            reminders: st.reminders.map((r) => patchedReminders.find((p) => p.id === r.id) ?? r),
            reminderOccurrences: newOcc.length ? [...st.reminderOccurrences, ...newOcc] : st.reminderOccurrences,
          }));
          enqueueMany('transactions', newTx);
          enqueueMany('recurring_rules', patchedRules);
          enqueueMany('reminders', patchedReminders);
          enqueueMany('reminder_occurrences', newOcc);
          return { forecasts: newTx.length, occurrences: newOcc.length };
        },
        setOptionalSyncedAt: (table, iso) => set((st) => ({ optionalSyncedAt: { ...st.optionalSyncedAt, [table]: iso } })),

        clearSyncQueueEntries: (ids) =>
          set((s) => ({ pendingSync: s.pendingSync.filter((e) => !ids.includes(e.id)) })),

        setLastSyncedAt: (iso) => set({ lastSyncedAt: iso }),

        mergeRemoteRecords: (table, records) =>
          set((s) => {
            switch (table) {
              case 'accounts':
                return { accounts: mergeByUpdatedAt(s.accounts, records as Account[]) };
              case 'transactions':
                return { transactions: mergeByUpdatedAt(s.transactions, records as Transaction[]) };
              case 'budgets':
                return { budgets: mergeByUpdatedAt(s.budgets, records as Budget[]) };
              case 'goals':
                return { goals: mergeByUpdatedAt(s.goals, records as Goal[]) };
              case 'investments':
                return { investments: mergeByUpdatedAt(s.investments, records as InvestmentPosition[]) };
              case 'liabilities':
                return { liabilities: mergeByUpdatedAt(s.liabilities, records as Liability[]) };
              case 'net_worth_snapshots':
                return { netWorthHistory: mergeByUpdatedAt(s.netWorthHistory, records as NetWorthSnapshot[]) };
              case 'audit_log':
                return { auditLog: mergeByUpdatedAt(s.auditLog, records as AuditLogEntry[]) };
              case 'category_mappings':
                return { customCategoryMappings: mergeRemoteMappings(s.customCategoryMappings, records as CategoryMappingRecord[]) };
              case 'recurring_rules':
                return { recurringRules: mergeByUpdatedAt(s.recurringRules, records as RecurringRule[]) };
              case 'reminders':
                return { reminders: mergeByUpdatedAt(s.reminders, records as Reminder[]) };
              case 'reminder_occurrences':
                return { reminderOccurrences: mergeByUpdatedAt(s.reminderOccurrences, records as ReminderOccurrence[]) };
              default:
                return {};
            }
          }),

        resetAll: () =>
          set({
            profile: DEFAULT_PROFILE,
            profileDirty: false,
            transactions: [],
            accounts: [],
            budgets: [],
            budgetTemplates: [],
            templateBudgetLines: [],
            budgetAssignments: [],
            periodBudgetOverrides: [],
            goals: [],
            investments: [],
            liabilities: [],
            netWorthHistory: [],
            auditLog: [],
            pendingSync: [],
            lastSyncedAt: null,
            budgetPeriods: DEFAULT_BUDGET_PERIODS,
            customCategoryMappings: {},
            recurringRules: [],
            reminders: [],
            reminderOccurrences: [],
            optionalSyncedAt: {},
            conversations: [],
            chatMessages: [],
            activeConversationId: null,
          }),
      };
    },
    {
      name: 'valu-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.recoverInterruptedPlans();
        state?.seedMappingSync();
        state?.setHasHydrated(true);
      },
      // liveQuotes/lastQuotesFetchedAt/cetesRates quedan fuera a propósito
      // — son un valor de "ahora mismo" que se vuelve a pedir al abrir la
      // app, nunca algo que deba sobrevivir como historial guardado.
      partialize: (state) => {
        const { liveQuotes: _liveQuotes, lastQuotesFetchedAt: _lastQuotesFetchedAt, cetesRates: _cetesRates, ...rest } = state;
        return rest;
      },
    }
  )
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  type AddAccountArgs,
  type AddGoalArgs,
  type AddLiabilityArgs,
  type AddTransactionArgs,
  type AIActionProposal,
  type AIActionStatus,
  type AIActionType,
  type ChatConversation,
  type ChatMessage,
  type ContributeToGoalArgs,
  type DeleteAccountArgs,
  type DeleteBudgetLineArgs,
  type DeleteGoalArgs,
  type DeleteLiabilityArgs,
  type DeleteTransactionArgs,
  type SetBudgetLineArgs,
  type UpdateGoalTargetArgs,
  type UpdateLiabilityBalanceArgs,
} from '@/ai/chatTypes';
import { extractLearnableKeywords, type CustomCategoryMapping } from '@/ai/localParser';
import { CASH_ACCOUNT_COLOR } from '@/data/accountColors';
import type {
  Account,
  AuditLogEntry,
  Budget,
  BudgetAssignment,
  BudgetTemplate,
  Currency,
  Goal,
  PeriodBudgetOverride,
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
import { generateId } from '@/utils/id';
import { accountDeltasForTransaction, mergeDeltas, reverseDeltas } from '@/utils/ledger';

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
  // ningún proveedor de IA (spec: catálogo v7, "mapeo personal"). Solo
  // vive en este dispositivo — no se sincroniza a Supabase todavía.
  customCategoryMappings: Record<string, CustomCategoryMapping>;
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

  addTransaction: (draft: Draft<Transaction>) => void;
  updateTransaction: (id: string, patch: Partial<Draft<Transaction>>) => void;
  deleteTransaction: (id: string) => void;

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
  updateActionStatus: (messageId: string, status: AIActionStatus, patch?: { appliedAt?: string; error?: string }) => void;
  // Único punto donde una acción propuesta por el chat de IA de verdad
  // toca datos reales — re-valida que lo referenciado siga existiendo
  // (la propuesta pudo haberse armado hace rato) y despacha a la acción
  // hermana real correspondiente. Nunca crea lógica de negocio nueva: solo
  // reenvía a addAccount/deleteGoal/etc., las mismas que ya usa toda la UI.
  aiApplyAction: (action: AIActionProposal) => { ok: boolean; error?: string };

  clearSyncQueueEntries: (ids: string[]) => void;
  setLastSyncedAt: (iso: string) => void;
  mergeRemoteRecords: (table: SyncTable, records: unknown[]) => void;

  resetAll: () => void;
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
            merged.has(a.id) ? touch(a, { balance: a.balance + (merged.get(a.id) ?? 0) } as Partial<Account>) : a
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
          set((s) => {
            const next = { ...s.customCategoryMappings };
            for (const kw of keywords) next[kw] = { categoryId, subcategoryId, updatedAt };
            // Tope de MAX_CUSTOM_MAPPINGS palabras por cuenta — si se pasa,
            // se olvidan primero las correcciones más viejas (por
            // updatedAt), nunca las más recientes.
            const entries = Object.entries(next);
            if (entries.length > MAX_CUSTOM_MAPPINGS) {
              entries.sort((a, b) => a[1].updatedAt.localeCompare(b[1].updatedAt));
              const toDrop = entries.length - MAX_CUSTOM_MAPPINGS;
              for (let i = 0; i < toDrop; i++) delete next[entries[i][0]];
            }
            return { customCategoryMappings: next };
          });
        },
        clearCustomCategoryMappings: () => set({ customCategoryMappings: {} }),

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
          set((s) => ({ profile: { ...s.profile, ...profile, onboardingComplete: true } })),

        updateProfileDraft: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

        setThemePreference: (pref) =>
          set((s) => ({ profile: { ...s.profile, themePreference: pref } })),

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
          })),

        addTransaction: (draft) => {
          const tx = withNewMeta(draft);
          set((s) => ({ transactions: [tx, ...s.transactions] }));
          enqueue('transactions', tx.id, 'upsert', tx as unknown as Record<string, unknown>, tx.isDemo);
          applyAccountDeltas(accountDeltasForTransaction(tx));
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
        updateActionStatus: (messageId, status, patch) => {
          set((s) => ({
            chatMessages: s.chatMessages.map((m) =>
              m.id === messageId && m.action ? { ...m, action: { ...m.action, status, ...patch } } : m
            ),
          }));
        },
        aiApplyAction: (action) => {
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
              state.addGoal({ name: args.name, targetAmount: args.targetAmount, currentAmount: 0, currency: args.currency });
              return { ok: true };
            }
            case 'contribute_to_goal': {
              const args = action.args as unknown as ContributeToGoalArgs;
              const goal = state.goals.find((g) => g.id === args.goalId && !g.deletedAt);
              if (!goal) return { ok: false, error: `La meta "${args.goalName}" ya no existe.` };
              state.contributeToGoal(args.goalId, args.amount);
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
            default: {
              const exhaustiveCheck: never = action.type;
              return { ok: false, error: `Tipo de acción no reconocido: ${exhaustiveCheck}` };
            }
          }
        },

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
              default:
                return {};
            }
          }),

        resetAll: () =>
          set({
            profile: DEFAULT_PROFILE,
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

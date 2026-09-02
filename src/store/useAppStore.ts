import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { extractLearnableKeywords, type CustomCategoryMapping } from '@/ai/localParser';
import type {
  Account,
  AuditLogEntry,
  Budget,
  Goal,
  InvestmentPosition,
  Liability,
  NetWorthSnapshot,
  SyncMeta,
  Transaction,
  UserProfile,
} from '@/data/types';
import type { SyncQueueEntry, SyncTable } from '@/services/sync/types';
import type { CetesRates, MarketQuote } from '@/providers/types';
import { generateId } from '@/utils/id';
import { accountDeltasForTransaction, mergeDeltas, reverseDeltas } from '@/utils/ledger';

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

type Draft<T> = Omit<T, keyof SyncMeta>;

interface AppState {
  profile: UserProfile;
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
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

  setBudget: (draft: Draft<Budget>) => void;
  deleteBudget: (id: string) => void;

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
        goals: [],
        investments: [],
        liabilities: [],
        netWorthHistory: [],
        auditLog: [],
        pendingSync: [],
        lastSyncedAt: null,
        hasHydrated: false,
        liveQuotes: {},
        lastQuotesFetchedAt: null,
        cetesRates: null,
        budgetPeriods: DEFAULT_BUDGET_PERIODS,
        customCategoryMappings: {},

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
            goals: [],
            investments: [],
            liabilities: [],
            netWorthHistory: [],
            auditLog: [],
            pendingSync: [],
            lastSyncedAt: null,
            budgetPeriods: DEFAULT_BUDGET_PERIODS,
            customCategoryMappings: {},
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  buildDemoAccounts,
  buildDemoGoals,
  buildDemoInvestments,
  buildDemoLiabilities,
  buildDemoNetWorthHistory,
  buildDemoTransactions,
} from '@/data/demoData';
import type {
  Account,
  Budget,
  Goal,
  InvestmentPosition,
  Liability,
  NetWorthSnapshot,
  Transaction,
  UserProfile,
} from '@/data/types';

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  primaryCurrency: 'MXN',
  onboardingComplete: false,
  themePreference: 'system',
  budgetThresholds: { attention: 70, warning: 90, exceeded: 100 },
};

interface AppState {
  profile: UserProfile;
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  goals: Goal[];
  investments: InvestmentPosition[];
  liabilities: Liability[];
  netWorthHistory: NetWorthSnapshot[];
  demoDataLoaded: boolean;
  hasHydrated: boolean;

  setHasHydrated: (v: boolean) => void;
  completeOnboarding: (profile: Partial<UserProfile>) => void;
  setThemePreference: (pref: UserProfile['themePreference']) => void;

  addTransaction: (tx: Transaction) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  addAccount: (a: Account) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  setBudget: (b: Budget) => void;
  deleteBudget: (id: string) => void;

  addGoal: (g: Goal) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  contributeToGoal: (id: string, amount: number) => void;
  deleteGoal: (id: string) => void;

  addInvestment: (i: InvestmentPosition) => void;
  updateInvestment: (id: string, patch: Partial<InvestmentPosition>) => void;
  deleteInvestment: (id: string) => void;

  addLiability: (l: Liability) => void;
  updateLiability: (id: string, patch: Partial<Liability>) => void;
  deleteLiability: (id: string) => void;

  recordNetWorthSnapshot: (snapshot: NetWorthSnapshot) => void;

  loadDemoData: () => void;
  clearDemoData: () => void;
  resetAll: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      transactions: [],
      accounts: [],
      budgets: [],
      goals: [],
      investments: [],
      liabilities: [],
      netWorthHistory: [],
      demoDataLoaded: false,
      hasHydrated: false,

      setHasHydrated: (v) => set({ hasHydrated: v }),

      completeOnboarding: (profile) =>
        set((s) => ({ profile: { ...s.profile, ...profile, onboardingComplete: true } })),

      setThemePreference: (pref) =>
        set((s) => ({ profile: { ...s.profile, themePreference: pref } })),

      addTransaction: (tx) => set((s) => ({ transactions: [tx, ...s.transactions] })),
      updateTransaction: (id, patch) =>
        set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

      addAccount: (a) => set((s) => ({ accounts: [...s.accounts, a] })),
      updateAccount: (id, patch) =>
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      deleteAccount: (id) => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),

      setBudget: (b) =>
        set((s) => {
          const exists = s.budgets.some((x) => x.categoryId === b.categoryId);
          return {
            budgets: exists
              ? s.budgets.map((x) => (x.categoryId === b.categoryId ? b : x))
              : [...s.budgets, b],
          };
        }),
      deleteBudget: (id) => set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),

      addGoal: (g) => set((s) => ({ goals: [...s.goals, g] })),
      updateGoal: (id, patch) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      contributeToGoal: (id, amount) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g)),
        })),
      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      addInvestment: (i) => set((s) => ({ investments: [...s.investments, i] })),
      updateInvestment: (id, patch) =>
        set((s) => ({ investments: s.investments.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      deleteInvestment: (id) => set((s) => ({ investments: s.investments.filter((i) => i.id !== id) })),

      addLiability: (l) => set((s) => ({ liabilities: [...s.liabilities, l] })),
      updateLiability: (id, patch) =>
        set((s) => ({ liabilities: s.liabilities.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      deleteLiability: (id) => set((s) => ({ liabilities: s.liabilities.filter((l) => l.id !== id) })),

      recordNetWorthSnapshot: (snapshot) =>
        set((s) => {
          const withoutToday = s.netWorthHistory.filter((h) => h.date !== snapshot.date);
          return { netWorthHistory: [...withoutToday, snapshot].sort((a, b) => a.date.localeCompare(b.date)) };
        }),

      loadDemoData: () =>
        set(() => ({
          demoDataLoaded: true,
          accounts: buildDemoAccounts(),
          transactions: buildDemoTransactions(),
          investments: buildDemoInvestments(),
          goals: buildDemoGoals(),
          liabilities: buildDemoLiabilities(),
          netWorthHistory: buildDemoNetWorthHistory(),
        })),

      clearDemoData: () =>
        set((s) => ({
          demoDataLoaded: false,
          accounts: s.accounts.filter((a) => !a.isDemo),
          transactions: s.transactions.filter((t) => !t.isDemo),
          investments: s.investments.filter((i) => !i.isDemo),
          goals: s.goals.filter((g) => !g.isDemo),
          liabilities: s.liabilities.filter((l) => !l.isDemo),
          netWorthHistory: s.netWorthHistory.filter((h) => !h.isDemo),
        })),

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
          demoDataLoaded: false,
        }),
    }),
    {
      name: 'valu-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

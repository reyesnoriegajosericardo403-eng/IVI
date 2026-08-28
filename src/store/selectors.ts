import type { Account, Budget, Goal, InvestmentPosition, Liability, NetWorthSnapshot, Transaction } from '@/data/types';

// El store guarda TODOS los registros, incluidos los borrados suavemente
// (deletedAt) — se necesitan para auditoría y sincronización (spec 73-85).
// La interfaz siempre debe leer a través de estos selectores "activos".
const isActive = <T extends { deletedAt?: string }>(record: T) => !record.deletedAt;

export const selectActiveTransactions = (transactions: Transaction[]): Transaction[] => transactions.filter(isActive);
export const selectActiveAccounts = (accounts: Account[]): Account[] => accounts.filter(isActive);
export const selectActiveBudgets = (budgets: Budget[]): Budget[] => budgets.filter(isActive);
export const selectActiveGoals = (goals: Goal[]): Goal[] => goals.filter(isActive);
export const selectActiveInvestments = (investments: InvestmentPosition[]): InvestmentPosition[] => investments.filter(isActive);
export const selectActiveLiabilities = (liabilities: Liability[]): Liability[] => liabilities.filter(isActive);
export const selectActiveNetWorthHistory = (history: NetWorthSnapshot[]): NetWorthSnapshot[] => history.filter(isActive);

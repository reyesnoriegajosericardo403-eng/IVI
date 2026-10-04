import type {
  Account,
  RecurringRule,
  Reminder,
  ReminderOccurrence,
  Budget,
  BudgetAssignment,
  BudgetTemplate,
  Goal,
  InvestmentPosition,
  Liability,
  NetWorthSnapshot,
  PeriodBudgetOverride,
  TemplateBudgetLine,
  Transaction,
} from '@/data/types';

// El store guarda TODOS los registros, incluidos los borrados suavemente
// (deletedAt) — se necesitan para auditoría y sincronización (spec 73-85).
// La interfaz siempre debe leer a través de estos selectores "activos".
const isActive = <T extends { deletedAt?: string }>(record: T) => !record.deletedAt;

// Movimientos REALES. Los previstos (status 'forecast', 'skipped', 'paused') nunca entran aquí: así ninguna pantalla,
// gráfica, presupuesto ni resumen puede contar como real algo que todavía no pasó.
export const isPostedTransaction = (t: Transaction): boolean => !t.status || t.status === 'posted';
export const selectActiveTransactions = (transactions: Transaction[]): Transaction[] => transactions.filter((t) => isActive(t) && isPostedTransaction(t));
// Previstos vigentes (todavía por ocurrir o por confirmar).
export const selectForecastTransactions = (transactions: Transaction[]): Transaction[] => transactions.filter((t) => isActive(t) && t.status === 'forecast');
export const selectActiveAccounts = (accounts: Account[]): Account[] => accounts.filter(isActive);
export const selectActiveBudgets = (budgets: Budget[]): Budget[] => budgets.filter(isActive);
export const selectActiveBudgetTemplates = (templates: BudgetTemplate[]): BudgetTemplate[] => templates.filter(isActive);
export const selectActiveTemplateBudgetLines = (lines: TemplateBudgetLine[]): TemplateBudgetLine[] => lines.filter(isActive);
export const selectActiveBudgetAssignments = (assignments: BudgetAssignment[]): BudgetAssignment[] => assignments.filter(isActive);
export const selectActivePeriodOverrides = (overrides: PeriodBudgetOverride[]): PeriodBudgetOverride[] => overrides.filter(isActive);
export const selectActiveGoals = (goals: Goal[]): Goal[] => goals.filter(isActive);
export const selectActiveInvestments = (investments: InvestmentPosition[]): InvestmentPosition[] => investments.filter(isActive);
export const selectActiveLiabilities = (liabilities: Liability[]): Liability[] => liabilities.filter(isActive);
export const selectActiveNetWorthHistory = (history: NetWorthSnapshot[]): NetWorthSnapshot[] => history.filter(isActive);
export const selectActiveRecurringRules = (rules: RecurringRule[]): RecurringRule[] => rules.filter(isActive);
export const selectActiveReminders = (reminders: Reminder[]): Reminder[] => reminders.filter(isActive);
export const selectActiveOccurrences = (occurrences: ReminderOccurrence[]): ReminderOccurrence[] => occurrences.filter(isActive);

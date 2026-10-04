import type {
  Account,
  AuditLogEntry,
  Budget,
  BudgetAssignment,
  BudgetTemplate,
  CategoryMappingRecord,
  Goal,
  InvestmentPosition,
  Liability,
  NetWorthSnapshot,
  PeriodBudgetOverride,
  RecurringRule,
  Reminder,
  ReminderOccurrence,
  TemplateBudgetLine,
  Transaction,
} from '@/data/types';
import type { Repository } from '../repository';
import type { SyncTable } from '../sync/types';
import { supabase } from './client';
import {
  accountFromRow,
  accountToRow,
  auditLogFromRow,
  auditLogToRow,
  budgetAssignmentFromRow,
  budgetAssignmentToRow,
  budgetFromRow,
  budgetTemplateFromRow,
  budgetTemplateToRow,
  budgetToRow,
  categoryMappingFromRow,
  categoryMappingToRow,
  goalFromRow,
  goalToRow,
  investmentFromRow,
  investmentToRow,
  liabilityFromRow,
  liabilityToRow,
  netWorthSnapshotFromRow,
  netWorthSnapshotToRow,
  periodBudgetOverrideFromRow,
  periodBudgetOverrideToRow,
  recurringRuleFromRow,
  recurringRuleToRow,
  reminderFromRow,
  reminderOccurrenceFromRow,
  reminderOccurrenceToRow,
  reminderToRow,
  templateBudgetLineFromRow,
  templateBudgetLineToRow,
  transactionFromRow,
  transactionToRow,
} from './mappers';

// Fábrica genérica: cada entidad solo necesita decir su tabla y cómo
// convertir entre el objeto de dominio y la fila de Postgres. Evita
// repetir la misma lógica de "select/upsert filtrado por usuario" siete
// veces (spec 78: toda la comunicación pasa por un único punto por tabla).
function createSupabaseRepository<T>(
  table: string,
  toRow: (userId: string, record: T) => Record<string, unknown>,
  fromRow: (row: any) => T,
  // Columnas que identifican un renglón al hacer upsert (por defecto, `id`).
  onConflict = 'id'
): Repository<T> {
  return {
    async list(userId: string, updatedSince?: string): Promise<T[]> {
      if (!supabase) throw new Error('Supabase no está configurado todavía.');
      let query = supabase.from(table).select('*').eq('user_id', userId);
      if (updatedSince) query = query.gt('updated_at', updatedSince);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(fromRow);
    },
    async upsert(userId: string, record: T): Promise<void> {
      if (!supabase) throw new Error('Supabase no está configurado todavía.');
      const row = toRow(userId, record);
      const { error } = await supabase.from(table).upsert(row, { onConflict });
      if (error) throw error;
    },
  };
}

export const accountsRepository: Repository<Account> = createSupabaseRepository('accounts', accountToRow, accountFromRow);
export const transactionsRepository: Repository<Transaction> = createSupabaseRepository('transactions', transactionToRow, transactionFromRow);
export const budgetsRepository: Repository<Budget> = createSupabaseRepository('budgets', budgetToRow, budgetFromRow);
export const goalsRepository: Repository<Goal> = createSupabaseRepository('goals', goalToRow, goalFromRow);
export const investmentsRepository: Repository<InvestmentPosition> = createSupabaseRepository('investments', investmentToRow, investmentFromRow);
export const liabilitiesRepository: Repository<Liability> = createSupabaseRepository('liabilities', liabilityToRow, liabilityFromRow);
export const netWorthSnapshotsRepository: Repository<NetWorthSnapshot> = createSupabaseRepository(
  'net_worth_snapshots',
  netWorthSnapshotToRow,
  netWorthSnapshotFromRow
);
export const auditLogRepository: Repository<AuditLogEntry> = createSupabaseRepository('audit_log', auditLogToRow, auditLogFromRow);
export const budgetTemplatesRepository: Repository<BudgetTemplate> = createSupabaseRepository(
  'budget_templates',
  budgetTemplateToRow,
  budgetTemplateFromRow
);
export const templateBudgetLinesRepository: Repository<TemplateBudgetLine> = createSupabaseRepository(
  'template_budget_lines',
  templateBudgetLineToRow,
  templateBudgetLineFromRow
);
export const budgetAssignmentsRepository: Repository<BudgetAssignment> = createSupabaseRepository(
  'budget_assignments',
  budgetAssignmentToRow,
  budgetAssignmentFromRow
);
export const periodBudgetOverridesRepository: Repository<PeriodBudgetOverride> = createSupabaseRepository(
  'period_budget_overrides',
  periodBudgetOverrideToRow,
  periodBudgetOverrideFromRow
);

// La llave de esta tabla es (user_id, keyword), no un `id` aparte (ver migración 0022).
export const categoryMappingsRepository: Repository<CategoryMappingRecord> = createSupabaseRepository(
  'category_mappings',
  categoryMappingToRow,
  categoryMappingFromRow,
  'user_id,keyword'
);

// P3 (migración 0023)
export const recurringRulesRepository: Repository<RecurringRule> = createSupabaseRepository('recurring_rules', recurringRuleToRow, recurringRuleFromRow);
export const remindersRepository: Repository<Reminder> = createSupabaseRepository('reminders', reminderToRow, reminderFromRow);
export const reminderOccurrencesRepository: Repository<ReminderOccurrence> = createSupabaseRepository('reminder_occurrences', reminderOccurrenceToRow, reminderOccurrenceFromRow);

// Usado por el SyncEngine para resolver, a partir del nombre de tabla en
// una entrada de la cola de sincronización, qué repositorio invocar.
export const repositoryByTable: Record<SyncTable, Repository<any>> = {
  accounts: accountsRepository,
  transactions: transactionsRepository,
  budgets: budgetsRepository,
  budget_templates: budgetTemplatesRepository,
  template_budget_lines: templateBudgetLinesRepository,
  budget_assignments: budgetAssignmentsRepository,
  period_budget_overrides: periodBudgetOverridesRepository,
  goals: goalsRepository,
  investments: investmentsRepository,
  liabilities: liabilitiesRepository,
  net_worth_snapshots: netWorthSnapshotsRepository,
  audit_log: auditLogRepository,
  category_mappings: categoryMappingsRepository,
  recurring_rules: recurringRulesRepository,
  reminders: remindersRepository,
  reminder_occurrences: reminderOccurrencesRepository,
};

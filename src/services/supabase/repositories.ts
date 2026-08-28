import type {
  Account,
  AuditLogEntry,
  Budget,
  Goal,
  InvestmentPosition,
  Liability,
  NetWorthSnapshot,
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
  budgetFromRow,
  budgetToRow,
  goalFromRow,
  goalToRow,
  investmentFromRow,
  investmentToRow,
  liabilityFromRow,
  liabilityToRow,
  netWorthSnapshotFromRow,
  netWorthSnapshotToRow,
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
  fromRow: (row: any) => T
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
      const { error } = await supabase.from(table).upsert(row, { onConflict: 'id' });
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

// Usado por el SyncEngine para resolver, a partir del nombre de tabla en
// una entrada de la cola de sincronización, qué repositorio invocar.
export const repositoryByTable: Record<SyncTable, Repository<any>> = {
  accounts: accountsRepository,
  transactions: transactionsRepository,
  budgets: budgetsRepository,
  goals: goalsRepository,
  investments: investmentsRepository,
  liabilities: liabilitiesRepository,
  net_worth_snapshots: netWorthSnapshotsRepository,
  audit_log: auditLogRepository,
};

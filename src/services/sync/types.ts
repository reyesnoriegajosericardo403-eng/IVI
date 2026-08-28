// Tipos del motor de sincronización. La app cliente NUNCA es la fuente de
// verdad (spec sección 71): cada cambio local se anota aquí como pendiente
// y el SyncEngine (src/services/sync/SyncEngine.ts) se encarga de llevarlo
// al backend central cuando hay conexión, con reintentos.

export type SyncTable =
  | 'accounts'
  | 'transactions'
  | 'budgets'
  | 'goals'
  | 'investments'
  | 'liabilities'
  | 'net_worth_snapshots'
  | 'audit_log';

export type SyncOp = 'upsert' | 'delete';

export interface SyncQueueEntry {
  id: string; // id de la propia entrada de cola (UUID)
  table: SyncTable;
  recordId: string; // id del registro de dominio afectado
  op: SyncOp;
  payload?: Record<string, unknown>; // snapshot completo del registro (upsert)
  queuedAt: string; // ISO
  attempts: number;
  lastError?: string;
}

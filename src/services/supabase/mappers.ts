// Traducción entre los objetos de dominio (camelCase) y las filas de
// Postgres (snake_case). Mantener esto en un solo archivo evita que el
// formato de la base de datos se filtre al resto de la app (spec 70).
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

export function accountToRow(userId: string, a: Account) {
  return {
    id: a.id,
    user_id: userId,
    name: a.name,
    institution: a.institution ?? null,
    type: a.type,
    currency: a.currency,
    balance: a.balance,
    is_liability: a.isLiability ?? false,
    is_demo: a.isDemo ?? false,
    created_at: a.createdAt,
    deleted_at: a.deletedAt ?? null,
  };
}

export function accountFromRow(row: any): Account {
  return {
    id: row.id,
    name: row.name,
    institution: row.institution ?? undefined,
    type: row.type,
    currency: row.currency,
    balance: Number(row.balance),
    isLiability: row.is_liability,
    isDemo: row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export function transactionToRow(userId: string, t: Transaction) {
  return {
    id: t.id,
    user_id: userId,
    type: t.type,
    amount: t.amount,
    currency: t.currency,
    category_id: t.categoryId,
    subcategory_id: t.subcategoryId,
    merchant: t.merchant ?? null,
    account_id: t.accountId ?? null,
    to_account_id: t.toAccountId ?? null,
    occurred_at: t.date,
    notes: t.notes ?? null,
    origin: t.origin,
    is_demo: t.isDemo ?? false,
    created_at: t.createdAt,
    deleted_at: t.deletedAt ?? null,
  };
}

export function transactionFromRow(row: any): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    currency: row.currency,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    merchant: row.merchant ?? undefined,
    accountId: row.account_id ?? undefined,
    toAccountId: row.to_account_id ?? undefined,
    date: row.occurred_at,
    notes: row.notes ?? undefined,
    origin: row.origin,
    isDemo: row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export function budgetToRow(userId: string, b: Budget) {
  return {
    id: b.id,
    user_id: userId,
    category_id: b.categoryId,
    monthly_amount: b.monthlyAmount,
    currency: b.currency,
    threshold_attention: b.thresholds.attention,
    threshold_warning: b.thresholds.warning,
    threshold_exceeded: b.thresholds.exceeded,
    created_at: b.createdAt,
    deleted_at: b.deletedAt ?? null,
  };
}

export function budgetFromRow(row: any): Budget {
  return {
    id: row.id,
    categoryId: row.category_id,
    monthlyAmount: Number(row.monthly_amount),
    currency: row.currency,
    thresholds: {
      attention: row.threshold_attention,
      warning: row.threshold_warning,
      exceeded: row.threshold_exceeded,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export function goalToRow(userId: string, g: Goal) {
  return {
    id: g.id,
    user_id: userId,
    name: g.name,
    target_amount: g.targetAmount,
    current_amount: g.currentAmount,
    currency: g.currency,
    target_date: g.targetDate ?? null,
    is_demo: g.isDemo ?? false,
    created_at: g.createdAt,
    deleted_at: g.deletedAt ?? null,
  };
}

export function goalFromRow(row: any): Goal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: Number(row.target_amount),
    currentAmount: Number(row.current_amount),
    currency: row.currency,
    targetDate: row.target_date ?? undefined,
    isDemo: row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export function investmentToRow(userId: string, i: InvestmentPosition) {
  return {
    id: i.id,
    user_id: userId,
    ticker: i.ticker,
    name: i.name,
    asset_class: i.assetClass,
    quantity: i.quantity,
    avg_cost_price: i.avgCostPrice,
    currency: i.currency,
    amount_invested: i.amountInvested,
    purchase_date: i.purchaseDate,
    broker: i.broker ?? null,
    fees: i.fees ?? null,
    dividends_received: i.dividendsReceived ?? null,
    realized_pnl: i.realizedPnL ?? null,
    notes: i.notes ?? null,
    is_demo: i.isDemo ?? false,
    created_at: i.createdAt,
    deleted_at: i.deletedAt ?? null,
  };
}

export function investmentFromRow(row: any): InvestmentPosition {
  return {
    id: row.id,
    ticker: row.ticker,
    name: row.name,
    assetClass: row.asset_class,
    quantity: Number(row.quantity),
    avgCostPrice: Number(row.avg_cost_price),
    currency: row.currency,
    amountInvested: Number(row.amount_invested),
    purchaseDate: row.purchase_date,
    broker: row.broker ?? undefined,
    fees: row.fees != null ? Number(row.fees) : undefined,
    dividendsReceived: row.dividends_received != null ? Number(row.dividends_received) : undefined,
    realizedPnL: row.realized_pnl != null ? Number(row.realized_pnl) : undefined,
    notes: row.notes ?? undefined,
    isDemo: row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export function liabilityToRow(userId: string, l: Liability) {
  return {
    id: l.id,
    user_id: userId,
    type: l.type,
    institution: l.institution,
    balance: l.balance,
    interest_rate: l.interestRate ?? null,
    min_payment: l.minPayment ?? null,
    due_date: l.dueDate ?? null,
    monthly_payment: l.monthlyPayment ?? null,
    start_date: l.startDate ?? null,
    estimated_payoff_date: l.estimatedPayoffDate ?? null,
    currency: l.currency,
    notes: l.notes ?? null,
    is_demo: l.isDemo ?? false,
    created_at: l.createdAt,
    deleted_at: l.deletedAt ?? null,
  };
}

export function liabilityFromRow(row: any): Liability {
  return {
    id: row.id,
    type: row.type,
    institution: row.institution,
    balance: Number(row.balance),
    interestRate: row.interest_rate != null ? Number(row.interest_rate) : undefined,
    minPayment: row.min_payment != null ? Number(row.min_payment) : undefined,
    dueDate: row.due_date ?? undefined,
    monthlyPayment: row.monthly_payment != null ? Number(row.monthly_payment) : undefined,
    startDate: row.start_date ?? undefined,
    estimatedPayoffDate: row.estimated_payoff_date ?? undefined,
    currency: row.currency,
    notes: row.notes ?? undefined,
    isDemo: row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export function netWorthSnapshotToRow(userId: string, n: NetWorthSnapshot) {
  return {
    id: n.id,
    user_id: userId,
    snapshot_date: n.date,
    assets: n.assets,
    liabilities: n.liabilities,
    net_worth: n.netWorth,
    currency: n.currency,
    is_demo: n.isDemo ?? false,
    created_at: n.createdAt,
    deleted_at: n.deletedAt ?? null,
  };
}

export function netWorthSnapshotFromRow(row: any): NetWorthSnapshot {
  return {
    id: row.id,
    date: row.snapshot_date,
    assets: Number(row.assets),
    liabilities: Number(row.liabilities),
    netWorth: Number(row.net_worth),
    currency: row.currency,
    isDemo: row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export function auditLogToRow(userId: string, entry: AuditLogEntry) {
  return {
    id: entry.id,
    user_id: userId,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    action: entry.action,
    summary: entry.summary,
    previous_value: entry.previousValue ?? null,
    new_value: entry.newValue ?? null,
    created_at: entry.createdAt,
    deleted_at: entry.deletedAt ?? null,
  };
}

export function auditLogFromRow(row: any): AuditLogEntry {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    summary: row.summary,
    previousValue: row.previous_value != null ? Number(row.previous_value) : undefined,
    newValue: row.new_value != null ? Number(row.new_value) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

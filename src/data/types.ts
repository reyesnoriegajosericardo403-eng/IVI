// Tipos centrales del dominio financiero de VALU.
// Todo monto se guarda como número en la moneda original de la transacción/cuenta.
//
// Todas las entidades sincronizables comparten SyncMeta: un id único global
// (UUID, nunca fecha+monto+categoría), createdAt/updatedAt para resolver
// conflictos de sincronización (last-write-wins) y deletedAt como borrado
// suave — nunca se elimina un registro financiero de verdad, solo se marca
// como eliminado, para poder auditar y recuperar (spec secciones 73-85).

export interface SyncMeta {
  id: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  deletedAt?: string; // ISO — presente si el registro fue "eliminado" (soft delete)
}

export type Currency = 'MXN' | 'USD' | 'EUR' | 'CAD' | 'GBP';

export type TransactionType =
  | 'expense' // gasto
  | 'income' // ingreso
  | 'transfer' // transferencia entre cuentas propias
  | 'saving' // aportación a ahorro
  | 'investment_buy' // compra de inversión
  | 'investment_sell'; // venta de inversión

export type TransactionOrigin = 'voice' | 'manual' | 'import' | 'broker' | 'automatic';

export interface CategoryDef {
  id: string;
  name: string;
  icon: keyof typeof import('./iconMap').CATEGORY_ICONS;
  subcategories: SubcategoryDef[];
}

export interface SubcategoryDef {
  id: string;
  name: string;
  keywords: string[]; // sinónimos/palabras clave para clasificación por voz/texto
  // Solo aplica a las subcategorías de "income" — separa ingresos fijos
  // (salario, mesada) de variables/eventuales (spec: presupuesto por
  // ingresos fijos vs. variables).
  incomeKind?: 'fixed' | 'variable';
}

export interface Transaction extends SyncMeta {
  type: TransactionType;
  amount: number;
  currency: Currency;
  categoryId: string;
  subcategoryId: string;
  merchant?: string;
  accountId?: string;
  toAccountId?: string; // para transferencias
  date: string; // ISO — fecha financiera del movimiento (distinta de createdAt/updatedAt)
  notes?: string;
  origin: TransactionOrigin;
  isDemo?: boolean;
}

export type AccountType = 'cash' | 'bank' | 'credit_card' | 'investment' | 'savings';

export interface Account extends SyncMeta {
  name: string;
  institution?: string;
  type: AccountType;
  currency: Currency;
  balance: number;
  isLiability?: boolean;
  isDemo?: boolean;
}

export type BudgetPeriodicity = 'day' | 'week' | 'month';
export type BudgetFrequency = 'all_days' | 'weekdays' | 'weekends' | 'custom' | 'one_time';

export interface Budget extends SyncMeta {
  // Puede ser el id de una categoría (esquema anterior) o el id de un
  // concepto de presupuesto (esquema nuevo, spec 41) — buildBudgetLines
  // reconoce ambos, así que un presupuesto ya guardado nunca se pierde.
  categoryId: string;
  monthlyAmount: number;
  currency: Currency;
  thresholds: {
    attention: number; // ej. 70
    warning: number; // ej. 90
    exceeded: number; // ej. 100
  };
  // Metadatos de cómo se calculó monthlyAmount, para poder reabrir el
  // formulario con los mismos controles — monthlyAmount sigue siendo la
  // única cifra que el resto de la app necesita leer.
  periodicity?: BudgetPeriodicity;
  frequency?: BudgetFrequency;
  customDaysPerWeek?: number;
  baseAmount?: number;
}

export interface Goal extends SyncMeta {
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  targetDate?: string;
  isDemo?: boolean;
}

export type AssetClass = 'stock' | 'etf' | 'fibra' | 'cetes' | 'bond' | 'fund' | 'crypto' | 'other';

export interface InvestmentPosition extends SyncMeta {
  ticker: string;
  name: string;
  assetClass: AssetClass;
  quantity: number;
  avgCostPrice: number;
  currency: Currency;
  amountInvested: number;
  purchaseDate: string; // fecha financiera de compra
  broker?: string;
  fees?: number;
  dividendsReceived?: number;
  // Ganancia o pérdida ya realizada al vender parte de la posición —
  // calculada solo con datos reales del usuario (precio de venta vs.
  // costo promedio), nunca con precios de mercado inventados.
  realizedPnL?: number;
  notes?: string;
  isDemo?: boolean;
}

export type LiabilityType = 'credit_card' | 'student_loan' | 'personal_loan' | 'mortgage' | 'other';

export interface Liability extends SyncMeta {
  type: LiabilityType;
  institution: string;
  balance: number;
  interestRate?: number;
  minPayment?: number;
  dueDate?: string;
  monthlyPayment?: number;
  startDate?: string;
  estimatedPayoffDate?: string;
  currency: Currency;
  notes?: string;
  isDemo?: boolean;
}

export interface UserProfile {
  name: string;
  primaryCurrency: Currency;
  onboardingComplete: boolean;
  themePreference: 'light' | 'dark' | 'system';
  budgetThresholds: {
    attention: number;
    warning: number;
    exceeded: number;
  };
}

export interface NetWorthSnapshot extends SyncMeta {
  date: string; // YYYY-MM-DD — clave natural (una entrada por día)
  assets: number;
  liabilities: number;
  netWorth: number;
  currency: Currency;
  isDemo?: boolean;
}

// Registro de auditoría para cambios importantes (spec sección 84).
// Se genera del lado del cliente al editar saldos/registros sensibles y se
// sincroniza igual que cualquier otra entidad; en Supabase además hay
// triggers que registran cambios de saldo automáticamente por si el
// cliente no lo hizo.
export type AuditAction = 'create' | 'update' | 'delete';

export interface AuditLogEntry extends SyncMeta {
  entityType: 'account' | 'transaction' | 'budget' | 'goal' | 'investment' | 'liability';
  entityId: string;
  action: AuditAction;
  summary: string; // ej. "Saldo de cuenta: $20,000 → $25,000"
  previousValue?: number;
  newValue?: number;
}

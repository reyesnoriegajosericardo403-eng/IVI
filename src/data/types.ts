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
  // Esta subcategoría no pertenece a ningún concepto de Presupuesto
  // (Necesidades/Deseos/Ahorro) a propósito — el gasto se sigue guardando
  // normal en Movimientos, solo no cuenta en las barras de presupuesto.
  // Se usa como valor por defecto de "excluir de presupuesto" al registrar
  // manualmente (spec: catálogo v7, "afecta_presupuesto"/"excluido_presupuesto").
  excludedFromBudget?: boolean;
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
  // El usuario puede excluir un movimiento puntual de todos los cálculos de
  // presupuesto (ej. algo que le van a reembolsar) sin dejar de registrarlo
  // — sigue apareciendo en Movimientos, solo no cuenta en sumas/gráficas de
  // presupuesto.
  excludeFromBudget?: boolean;
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
  // Color de la ficha en Cuentas/Patrimonio — el efectivo siempre es verde
  // fijo, las demás cuentas eligen entre una paleta de colores (spec:
  // "en el caso de efectivo debe ser un verde").
  color?: string;
  // Marca la cuenta a la que se cargan por default los gastos de transporte
  // público (metro, camión, microbús...) al registrar por voz o manual —
  // spec: "importantísima para que... los primeros a los que se deben
  // realizar los cargos".
  isTransportCard?: boolean;
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
  // Día del mes en que normalmente llega/se cobra (periodicidad "Mes") —
  // aplica tanto a ingresos como a gastos (ej. "la renta se carga el 5 de
  // cada mes"). Nunca mayor al número real de días de ese mes.
  dayOfMonth?: number;
  // Día de la semana en que normalmente llega/se cobra (periodicidad
  // "Semana") — 0 = domingo … 6 = sábado (mismo criterio que Date#getDay).
  dayOfWeek?: number;
  // Fecha exacta del gasto/ingreso único (periodicidad "Día" + frecuencia
  // "Extemporáneo") — ISO AAAA-MM-DD, nunca un día de mes reciclado entre
  // meses porque es un evento de una sola vez.
  oneTimeDate?: string;
  // Solo aplica a conceptos de INGRESO: a qué cuenta entra ese dinero — se
  // usa para preseleccionar la cuenta al registrar ese ingreso por voz o
  // manual (spec: "hacia dónde va a ir ese ingreso").
  targetAccountId?: string;
  // Solo aplica a conceptos de GASTO: cuentas con las que normalmente se
  // paga este tipo de gasto (opcional) — se usan como opciones al
  // registrar y para la preselección automática (spec: "seleccionar las
  // cuentas con las que normalmente pagas eso"). Vacío/undefined = todas
  // las cuentas activas son válidas.
  includedAccountIds?: string[];
}

export interface Goal extends SyncMeta {
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  targetDate?: string;
  isDemo?: boolean;
}

export type AssetClass = 'stock' | 'etf' | 'fibra' | 'cetes' | 'bond' | 'fund' | 'crypto' | 'cash' | 'other';

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

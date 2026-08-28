// Tipos centrales del dominio financiero de VALU.
// Todo monto se guarda como número en la moneda original de la transacción/cuenta.

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
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  categoryId: string;
  subcategoryId: string;
  merchant?: string;
  accountId?: string;
  toAccountId?: string; // para transferencias
  date: string; // ISO
  notes?: string;
  origin: TransactionOrigin;
  isDemo?: boolean;
  createdAt: string;
}

export type AccountType = 'cash' | 'bank' | 'credit_card' | 'investment' | 'savings';

export interface Account {
  id: string;
  name: string;
  institution?: string;
  type: AccountType;
  currency: Currency;
  balance: number;
  isLiability?: boolean;
  lastUpdated: string;
  isDemo?: boolean;
}

export interface Budget {
  id: string;
  categoryId: string;
  monthlyAmount: number;
  currency: Currency;
  thresholds: {
    attention: number; // ej. 70
    warning: number; // ej. 90
    exceeded: number; // ej. 100
  };
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  targetDate?: string;
  createdAt: string;
  isDemo?: boolean;
}

export type AssetClass = 'stock' | 'etf' | 'fibra' | 'cetes' | 'bond' | 'fund' | 'crypto' | 'other';

export interface InvestmentPosition {
  id: string;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  quantity: number;
  avgCostPrice: number;
  currency: Currency;
  amountInvested: number;
  purchaseDate: string;
  broker?: string;
  fees?: number;
  dividendsReceived?: number;
  notes?: string;
  isDemo?: boolean;
}

export type LiabilityType = 'credit_card' | 'student_loan' | 'personal_loan' | 'mortgage' | 'other';

export interface Liability {
  id: string;
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

export interface NetWorthSnapshot {
  date: string; // ISO (día), formato YYYY-MM-DD
  assets: number;
  liabilities: number;
  netWorth: number;
  currency: Currency;
  isDemo?: boolean;
}

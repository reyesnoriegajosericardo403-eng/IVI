import type { AccountType, LiabilityType } from './types';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Efectivo',
  bank: 'Banco',
  credit_card: 'Tarjeta de crédito',
  investment: 'Inversión',
  savings: 'Ahorro',
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  cash: 'cash-outline',
  bank: 'business-outline',
  credit_card: 'card-outline',
  investment: 'bar-chart-outline',
  savings: 'wallet-outline',
};

export const LIABILITY_TYPE_LABELS: Record<LiabilityType, string> = {
  credit_card: 'Tarjeta de crédito',
  student_loan: 'Préstamo estudiantil',
  personal_loan: 'Préstamo personal',
  mortgage: 'Hipoteca',
  other: 'Otra deuda',
};

import type { Account, Goal, InvestmentPosition, Liability, NetWorthSnapshot, Transaction } from './types';

// Datos de demostración — SIEMPRE marcados con isDemo: true.
// Nunca se mezclan con datos reales del usuario (spec sección 56).
// Sirven para que el dashboard no se sienta vacío en la primera exploración.

const iso = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

export function buildDemoAccounts(): Account[] {
  return [
    { id: 'demo_acc_cash', name: 'Efectivo', type: 'cash', currency: 'MXN', balance: 1200, lastUpdated: iso(0), isDemo: true },
    { id: 'demo_acc_bank', name: 'Cuenta principal', institution: 'Banco Demo', type: 'bank', currency: 'MXN', balance: 42500, lastUpdated: iso(0), isDemo: true },
    { id: 'demo_acc_savings', name: 'Fondo de emergencia', institution: 'Banco Demo', type: 'savings', currency: 'MXN', balance: 28000, lastUpdated: iso(0), isDemo: true },
    { id: 'demo_acc_credit', name: 'Tarjeta de crédito', institution: 'Banco Demo', type: 'credit_card', currency: 'MXN', balance: 6300, isLiability: true, lastUpdated: iso(0), isDemo: true },
  ];
}

export function buildDemoTransactions(): Transaction[] {
  const now = new Date().toISOString();
  return [
    { id: 'demo_tx_1', type: 'expense', amount: 65, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_coffee', merchant: 'Starbucks', date: iso(0), origin: 'voice', isDemo: true, createdAt: now },
    { id: 'demo_tx_2', type: 'expense', amount: 189, currency: 'MXN', categoryId: 'transport', subcategoryId: 'trans_uber', merchant: 'Uber', date: iso(1), origin: 'voice', isDemo: true, createdAt: now },
    { id: 'demo_tx_3', type: 'expense', amount: 520, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_restaurant', date: iso(2), origin: 'manual', isDemo: true, createdAt: now },
    { id: 'demo_tx_4', type: 'expense', amount: 199, currency: 'MXN', categoryId: 'entertainment', subcategoryId: 'ent_streaming', merchant: 'Netflix', date: iso(4), origin: 'voice', isDemo: true, createdAt: now },
    { id: 'demo_tx_5', type: 'income', amount: 24000, currency: 'MXN', categoryId: 'income', subcategoryId: 'inc_salary', date: iso(5), origin: 'manual', isDemo: true, createdAt: now },
    { id: 'demo_tx_6', type: 'expense', amount: 1450, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_supermarket', date: iso(6), origin: 'manual', isDemo: true, createdAt: now },
    { id: 'demo_tx_7', type: 'saving', amount: 2000, currency: 'MXN', categoryId: 'savings', subcategoryId: 'sav_emergency', date: iso(7), origin: 'voice', isDemo: true, createdAt: now },
    { id: 'demo_tx_8', type: 'expense', amount: 340, currency: 'MXN', categoryId: 'transport', subcategoryId: 'trans_gas', date: iso(9), origin: 'manual', isDemo: true, createdAt: now },
    { id: 'demo_tx_9', type: 'expense', amount: 890, currency: 'MXN', categoryId: 'lifestyle', subcategoryId: 'life_gifts', date: iso(11), origin: 'manual', isDemo: true, createdAt: now },
    { id: 'demo_tx_10', type: 'expense', amount: 120, currency: 'MXN', categoryId: 'health', subcategoryId: 'health_pharmacy', date: iso(13), origin: 'voice', isDemo: true, createdAt: now },
  ];
}

export function buildDemoInvestments(): InvestmentPosition[] {
  return [
    {
      id: 'demo_inv_1',
      ticker: 'NVDA',
      name: 'NVIDIA Corp.',
      assetClass: 'stock',
      quantity: 1.376,
      avgCostPrice: 109,
      currency: 'USD',
      amountInvested: 150,
      purchaseDate: iso(30),
      broker: 'GBM',
      isDemo: true,
    },
    {
      id: 'demo_inv_2',
      ticker: 'CETESMX',
      name: 'CETES 28 días',
      assetClass: 'cetes',
      quantity: 5000,
      avgCostPrice: 1,
      currency: 'MXN',
      amountInvested: 5000,
      purchaseDate: iso(60),
      broker: 'GBM',
      isDemo: true,
    },
  ];
}

export function buildDemoGoals(): Goal[] {
  return [
    { id: 'demo_goal_1', name: 'Vacaciones', targetAmount: 20000, currentAmount: 8000, currency: 'MXN', targetDate: iso(-120), createdAt: iso(30), isDemo: true },
  ];
}

export function buildDemoLiabilities(): Liability[] {
  // Nota: la tarjeta de crédito ya se cuenta como pasivo en buildDemoAccounts
  // (demo_acc_credit). Aquí se modela una deuda distinta para no duplicar
  // el mismo pasivo dos veces en el patrimonio neto.
  return [
    {
      id: 'demo_liab_1',
      type: 'personal_loan',
      institution: 'Préstamo personal',
      balance: 9500,
      interestRate: 24,
      minPayment: 950,
      currency: 'MXN',
      isDemo: true,
    },
  ];
}

export function buildDemoNetWorthHistory(): NetWorthSnapshot[] {
  const snapshots: NetWorthSnapshot[] = [];
  const days = 60;
  const endNetWorth = 63675; // debe coincidir con el patrimonio neto real que producen buildDemoAccounts/Investments/Liabilities
  const startNetWorth = 56800;
  for (let i = days; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const progress = (days - i) / days;
    const wobble = Math.sin(i / 4) * 350;
    const netWorth = Math.round(startNetWorth + (endNetWorth - startNetWorth) * progress + wobble);
    const liabilities = 15800;
    snapshots.push({
      date: d.toISOString().slice(0, 10),
      assets: netWorth + liabilities,
      liabilities,
      netWorth,
      currency: 'MXN',
      isDemo: true,
    });
  }
  return snapshots;
}

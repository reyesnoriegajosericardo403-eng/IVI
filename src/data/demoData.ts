import type { Account, Goal, InvestmentPosition, Liability, NetWorthSnapshot, SyncMeta, Transaction } from './types';

// Datos de demostración — SIEMPRE marcados con isDemo: true.
// Nunca se mezclan con datos reales del usuario (spec sección 56) y nunca
// se sincronizan con el backend. Los ids son fijos y legibles (no UUID)
// porque nunca viajan a Supabase — solo existen en el caché local.
// Sirven para que el dashboard no se sienta vacío en la primera exploración.

const iso = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

function demoMeta(id: string, createdAtIso: string = new Date().toISOString()): SyncMeta {
  return { id, createdAt: createdAtIso, updatedAt: createdAtIso };
}

export function buildDemoAccounts(): Account[] {
  return [
    { ...demoMeta('demo_acc_cash'), name: 'Efectivo', type: 'cash', currency: 'MXN', balance: 1200, isDemo: true },
    { ...demoMeta('demo_acc_bank'), name: 'Cuenta principal', institution: 'Banco Demo', type: 'bank', currency: 'MXN', balance: 42500, isDemo: true },
    { ...demoMeta('demo_acc_savings'), name: 'Fondo de emergencia', institution: 'Banco Demo', type: 'savings', currency: 'MXN', balance: 28000, isDemo: true },
    { ...demoMeta('demo_acc_credit'), name: 'Tarjeta de crédito', institution: 'Banco Demo', type: 'credit_card', currency: 'MXN', balance: 6300, isLiability: true, isDemo: true },
  ];
}

export function buildDemoTransactions(): Transaction[] {
  return [
    { ...demoMeta('demo_tx_1', iso(0)), type: 'expense', amount: 65, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_coffee', merchant: 'Starbucks', date: iso(0), origin: 'voice', isDemo: true },
    { ...demoMeta('demo_tx_2', iso(1)), type: 'expense', amount: 189, currency: 'MXN', categoryId: 'transport', subcategoryId: 'trans_uber', merchant: 'Uber', date: iso(1), origin: 'voice', isDemo: true },
    { ...demoMeta('demo_tx_3', iso(2)), type: 'expense', amount: 520, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_restaurant', date: iso(2), origin: 'manual', isDemo: true },
    { ...demoMeta('demo_tx_4', iso(4)), type: 'expense', amount: 199, currency: 'MXN', categoryId: 'entertainment', subcategoryId: 'ent_streaming', merchant: 'Netflix', date: iso(4), origin: 'voice', isDemo: true },
    { ...demoMeta('demo_tx_5', iso(5)), type: 'income', amount: 24000, currency: 'MXN', categoryId: 'income', subcategoryId: 'inc_salary', date: iso(5), origin: 'manual', isDemo: true },
    { ...demoMeta('demo_tx_6', iso(6)), type: 'expense', amount: 1450, currency: 'MXN', categoryId: 'food', subcategoryId: 'food_supermarket', date: iso(6), origin: 'manual', isDemo: true },
    { ...demoMeta('demo_tx_7', iso(7)), type: 'saving', amount: 2000, currency: 'MXN', categoryId: 'savings', subcategoryId: 'sav_emergency', date: iso(7), origin: 'voice', isDemo: true },
    { ...demoMeta('demo_tx_8', iso(9)), type: 'expense', amount: 340, currency: 'MXN', categoryId: 'transport', subcategoryId: 'trans_gas', date: iso(9), origin: 'manual', isDemo: true },
    { ...demoMeta('demo_tx_9', iso(11)), type: 'expense', amount: 890, currency: 'MXN', categoryId: 'lifestyle', subcategoryId: 'life_gifts', date: iso(11), origin: 'manual', isDemo: true },
    { ...demoMeta('demo_tx_10', iso(13)), type: 'expense', amount: 120, currency: 'MXN', categoryId: 'health', subcategoryId: 'health_pharmacy', date: iso(13), origin: 'voice', isDemo: true },
  ];
}

export function buildDemoInvestments(): InvestmentPosition[] {
  return [
    {
      ...demoMeta('demo_inv_1', iso(30)),
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
      ...demoMeta('demo_inv_2', iso(60)),
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
    {
      ...demoMeta('demo_goal_1', iso(30)),
      name: 'Vacaciones',
      targetAmount: 20000,
      currentAmount: 8000,
      currency: 'MXN',
      targetDate: iso(-120),
      isDemo: true,
    },
  ];
}

export function buildDemoLiabilities(): Liability[] {
  // Nota: la tarjeta de crédito ya se cuenta como pasivo en buildDemoAccounts
  // (demo_acc_credit). Aquí se modela una deuda distinta para no duplicar
  // el mismo pasivo dos veces en el patrimonio neto.
  return [
    {
      ...demoMeta('demo_liab_1'),
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
    const dateIso = d.toISOString();
    const progress = (days - i) / days;
    const wobble = Math.sin(i / 4) * 350;
    const netWorth = Math.round(startNetWorth + (endNetWorth - startNetWorth) * progress + wobble);
    const liabilities = 15800;
    snapshots.push({
      ...demoMeta(`demo_nw_${d.toISOString().slice(0, 10)}`, dateIso),
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

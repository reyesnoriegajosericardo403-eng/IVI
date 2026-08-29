import { DEFAULT_CATEGORIES } from '@/data/categories';
import { getUsdMxnRate } from '@/data/exchangeRate';
import type {
  Account,
  Budget,
  Currency,
  InvestmentPosition,
  Liability,
  NetWorthSnapshot,
  Transaction,
} from '@/data/types';

// Todas las funciones aquí son puras: reciben datos del store y devuelven
// cifras derivadas. Ningún número de mercado se inventa — si algo depende
// de una fuente externa (tipo de cambio), se marca explícitamente.

export function toBaseCurrency(amount: number, currency: Currency, base: Currency): number {
  if (currency === base) return amount;
  const { rate } = getUsdMxnRate();
  if (currency === 'USD' && base === 'MXN') return amount * rate;
  if (currency === 'MXN' && base === 'USD') return amount / rate;
  return amount; // otras monedas: Fase 2+ con tabla de tipos de cambio completa
}

export interface NetWorthBreakdown {
  assets: number;
  liabilities: number;
  netWorth: number;
}

export function computeNetWorth(
  accounts: Account[],
  investments: InvestmentPosition[],
  liabilities: Liability[],
  baseCurrency: Currency
): NetWorthBreakdown {
  const accountAssets = accounts
    .filter((a) => !a.isLiability)
    .reduce((sum, a) => sum + toBaseCurrency(a.balance, a.currency, baseCurrency), 0);

  const accountLiabilities = accounts
    .filter((a) => a.isLiability)
    .reduce((sum, a) => sum + toBaseCurrency(a.balance, a.currency, baseCurrency), 0);

  const investmentAssets = investments.reduce(
    (sum, i) => sum + toBaseCurrency(i.amountInvested, i.currency, baseCurrency),
    0
  );

  const otherLiabilities = liabilities.reduce(
    (sum, l) => sum + toBaseCurrency(l.balance, l.currency, baseCurrency),
    0
  );

  const assets = accountAssets + investmentAssets;
  const liabilitiesTotal = accountLiabilities + otherLiabilities;

  return { assets, liabilities: liabilitiesTotal, netWorth: assets - liabilitiesTotal };
}

export function isSameMonth(iso: string, ref = new Date()): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export function spendInPeriod(transactions: Transaction[], ref = new Date()): number {
  return transactions
    .filter((t) => t.type === 'expense' && isSameMonth(t.date, ref))
    .reduce((sum, t) => sum + t.amount, 0);
}

export function spendByCategory(transactions: Transaction[], ref = new Date()): Record<string, number> {
  const result: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== 'expense' || !isSameMonth(t.date, ref)) continue;
    result[t.categoryId] = (result[t.categoryId] ?? 0) + t.amount;
  }
  return result;
}

export type BudgetStatus = 'normal' | 'attention' | 'warning' | 'exceeded';

export interface BudgetLine {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  budgeted: number;
  actual: number;
  percentUsed: number;
  status: BudgetStatus;
}

export function computeBudgetStatus(
  percentUsed: number,
  thresholds: { attention: number; warning: number; exceeded: number }
): BudgetStatus {
  if (percentUsed >= thresholds.exceeded) return 'exceeded';
  if (percentUsed >= thresholds.warning) return 'warning';
  if (percentUsed >= thresholds.attention) return 'attention';
  return 'normal';
}

export function buildBudgetLines(
  budgets: Budget[],
  transactions: Transaction[],
  thresholds: { attention: number; warning: number; exceeded: number },
  ref = new Date()
): BudgetLine[] {
  const spend = spendByCategory(transactions, ref);
  return budgets.map((b) => {
    const actual = spend[b.categoryId] ?? 0;
    const percentUsed = b.monthlyAmount > 0 ? Math.round((actual / b.monthlyAmount) * 100) : 0;
    const category = DEFAULT_CATEGORIES.find((c) => c.id === b.categoryId);
    return {
      budgetId: b.id,
      categoryId: b.categoryId,
      categoryName: category?.name ?? b.categoryId,
      budgeted: b.monthlyAmount,
      actual,
      percentUsed,
      status: computeBudgetStatus(percentUsed, thresholds),
    };
  });
}

// Busca el snapshot más cercano a "hace N días" y devuelve el % de cambio
// contra el snapshot más reciente. Devuelve null si no hay suficiente
// historial — nunca se inventa una tendencia (spec sección 42).
export function getNetWorthTrend(history: NetWorthSnapshot[], daysAgo: number): number | null {
  if (history.length < 2) return null;
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const targetTime = new Date(latest.date).getTime() - daysAgo * 86400000;

  let closest: NetWorthSnapshot | null = null;
  let closestDiff = Infinity;
  for (const snap of sorted) {
    const diff = Math.abs(new Date(snap.date).getTime() - targetTime);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = snap;
    }
  }

  if (!closest || closest.date === latest.date) return null;
  // Exige que el snapshot encontrado esté razonablemente cerca del objetivo
  // (dentro del 60% de la ventana solicitada); si no, no hay historial
  // suficiente todavía para esa ventana.
  if (closestDiff > daysAgo * 86400000 * 0.6) return null;
  if (closest.netWorth === 0) return null;

  return ((latest.netWorth - closest.netWorth) / Math.abs(closest.netWorth)) * 100;
}

export function previousMonthSpend(transactions: Transaction[]): number {
  const ref = new Date();
  ref.setMonth(ref.getMonth() - 1);
  return spendInPeriod(transactions, ref);
}

export type HealthFactorStatus = 'positive' | 'attention' | 'negative';

export interface HealthFactor {
  key: string;
  title: string;
  status: HealthFactorStatus;
  points: number;
  maxPoints: number;
  detail: string;
  suggestion?: string;
}

export interface InvestmentTxInput {
  operation: 'buy' | 'sell';
  quantity: number;
  price: number;
  commission: number;
}

export interface InvestmentTxResult {
  quantity: number;
  avgCostPrice: number;
  amountInvested: number;
  realizedPnL: number;
}

// Aplica una compra o venta a una posición existente, usando solo los
// números que el propio usuario captura (nunca un precio de mercado
// inventado). En una venta, el costo promedio de las acciones que
// quedan no cambia — solo se retira, a costo promedio, la parte
// vendida, y la diferencia contra el precio de venta se vuelve
// ganancia o pérdida realizada.
export function applyInvestmentTransaction(
  position: { quantity: number; avgCostPrice: number; amountInvested: number; realizedPnL?: number },
  tx: InvestmentTxInput
): InvestmentTxResult {
  if (tx.operation === 'buy') {
    const quantity = position.quantity + tx.quantity;
    const amountInvested = position.amountInvested + tx.quantity * tx.price + tx.commission;
    return {
      quantity,
      avgCostPrice: quantity > 0 ? amountInvested / quantity : 0,
      amountInvested,
      realizedPnL: position.realizedPnL ?? 0,
    };
  }

  const sellQty = Math.min(tx.quantity, position.quantity);
  const quantity = Math.max(0, position.quantity - sellQty);
  const costBasisRemoved = sellQty * position.avgCostPrice;
  const proceeds = sellQty * tx.price - tx.commission;
  return {
    quantity,
    avgCostPrice: position.avgCostPrice,
    amountInvested: Math.max(0, position.amountInvested - costBasisRemoved),
    realizedPnL: (position.realizedPnL ?? 0) + (proceeds - costBasisRemoved),
  };
}

export interface FinancialHealth {
  score: number;
  label: string;
  factors: string[];
  suggestions: string[];
  baseScore: number;
  breakdown: HealthFactor[];
}

// Heurística simple y transparente — no es un diagnóstico financiero
// profesional (spec sección 23). Todo el puntaje se puede explicar con
// el desglose que se devuelve en `breakdown`.
export function computeFinancialHealth(params: {
  netWorth: NetWorthBreakdown;
  emergencyFundBalance: number;
  monthlySpend: number;
  budgetLines: BudgetLine[];
}): FinancialHealth {
  const { netWorth, emergencyFundBalance, monthlySpend, budgetLines } = params;
  const baseScore = 50;
  let score = baseScore;
  const factors: string[] = [];
  const suggestions: string[] = [];
  const breakdown: HealthFactor[] = [];

  if (netWorth.netWorth > 0) {
    score += 15;
    factors.push('Patrimonio neto positivo');
    breakdown.push({
      key: 'netWorth',
      title: 'Patrimonio neto',
      status: 'positive',
      points: 15,
      maxPoints: 15,
      detail: 'Tus activos valen más que tus deudas.',
    });
  } else {
    factors.push('Patrimonio neto negativo');
    suggestions.push('Trabaja en reducir tus pasivos para tener patrimonio positivo.');
    breakdown.push({
      key: 'netWorth',
      title: 'Patrimonio neto',
      status: 'negative',
      points: 0,
      maxPoints: 15,
      detail: 'Tus deudas superan el valor de tus activos.',
      suggestion: 'Trabaja en reducir tus pasivos para tener patrimonio positivo.',
    });
  }

  const monthsCovered = monthlySpend > 0 ? emergencyFundBalance / monthlySpend : 0;
  if (monthsCovered >= 3) {
    score += 20;
    factors.push('Fondo de emergencia cubre 3+ meses');
    breakdown.push({
      key: 'emergencyFund',
      title: 'Fondo de emergencia',
      status: 'positive',
      points: 20,
      maxPoints: 20,
      detail: `Cubre ${monthsCovered.toFixed(1)} meses de tu gasto — cumple el mínimo recomendado de 3.`,
    });
  } else if (monthsCovered > 0) {
    score += 8;
    factors.push(`Fondo de emergencia cubre ${monthsCovered.toFixed(1)} meses`);
    suggestions.push('Aumenta tu fondo de emergencia hasta cubrir al menos 3 meses de gasto.');
    breakdown.push({
      key: 'emergencyFund',
      title: 'Fondo de emergencia',
      status: 'attention',
      points: 8,
      maxPoints: 20,
      detail: `Cubre ${monthsCovered.toFixed(1)} de los 3 meses recomendados.`,
      suggestion: 'Aumenta tu fondo de emergencia hasta cubrir al menos 3 meses de gasto.',
    });
  } else {
    suggestions.push('Empieza un fondo de emergencia, aunque sea con aportaciones pequeñas.');
    breakdown.push({
      key: 'emergencyFund',
      title: 'Fondo de emergencia',
      status: 'negative',
      points: 0,
      maxPoints: 20,
      detail: 'Aún no tienes ahorro identificado como fondo de emergencia.',
      suggestion: 'Empieza un fondo de emergencia, aunque sea con aportaciones pequeñas.',
    });
  }

  const exceededCount = budgetLines.filter((b) => b.status === 'exceeded').length;
  if (budgetLines.length > 0) {
    if (exceededCount === 0) {
      score += 15;
      factors.push('Presupuesto bajo control');
      breakdown.push({
        key: 'budget',
        title: 'Presupuesto',
        status: 'positive',
        points: 15,
        maxPoints: 15,
        detail: 'Ninguna categoría con presupuesto está excedida este mes.',
      });
    } else {
      factors.push(`${exceededCount} categoría(s) excedida(s)`);
      suggestions.push('Revisa las categorías que excedieron su presupuesto este mes.');
      breakdown.push({
        key: 'budget',
        title: 'Presupuesto',
        status: 'negative',
        points: 0,
        maxPoints: 15,
        detail: `${exceededCount} categoría(s) excedieron su presupuesto este mes.`,
        suggestion: 'Revisa las categorías que excedieron su presupuesto este mes.',
      });
    }
  } else {
    breakdown.push({
      key: 'budget',
      title: 'Presupuesto',
      status: 'attention',
      points: 0,
      maxPoints: 15,
      detail: 'Aún no has definido presupuestos por categoría, así que no suma ni resta puntos.',
      suggestion: 'Define presupuestos por categoría para que este factor cuente en tu puntaje.',
    });
  }

  score = Math.max(0, Math.min(100, score));

  let label = 'Salud financiera baja';
  if (score >= 80) label = 'Excelente salud financiera';
  else if (score >= 60) label = 'Buena salud financiera';
  else if (score >= 40) label = 'Salud financiera moderada';

  return { score, label, factors, suggestions, baseScore, breakdown };
}

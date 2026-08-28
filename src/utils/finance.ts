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

export interface FinancialHealth {
  score: number;
  label: string;
  factors: string[];
  suggestions: string[];
}

// Heurística simple y transparente — no es un diagnóstico financiero
// profesional (spec sección 23).
export function computeFinancialHealth(params: {
  netWorth: NetWorthBreakdown;
  emergencyFundBalance: number;
  monthlySpend: number;
  budgetLines: BudgetLine[];
}): FinancialHealth {
  const { netWorth, emergencyFundBalance, monthlySpend, budgetLines } = params;
  let score = 50;
  const factors: string[] = [];
  const suggestions: string[] = [];

  if (netWorth.netWorth > 0) {
    score += 15;
    factors.push('Patrimonio neto positivo');
  } else {
    factors.push('Patrimonio neto negativo');
    suggestions.push('Trabaja en reducir tus pasivos para tener patrimonio positivo.');
  }

  const monthsCovered = monthlySpend > 0 ? emergencyFundBalance / monthlySpend : 0;
  if (monthsCovered >= 3) {
    score += 20;
    factors.push('Fondo de emergencia cubre 3+ meses');
  } else if (monthsCovered > 0) {
    score += 8;
    factors.push(`Fondo de emergencia cubre ${monthsCovered.toFixed(1)} meses`);
    suggestions.push('Aumenta tu fondo de emergencia hasta cubrir al menos 3 meses de gasto.');
  } else {
    suggestions.push('Empieza un fondo de emergencia, aunque sea con aportaciones pequeñas.');
  }

  const exceededCount = budgetLines.filter((b) => b.status === 'exceeded').length;
  if (budgetLines.length > 0) {
    if (exceededCount === 0) {
      score += 15;
      factors.push('Presupuesto bajo control');
    } else {
      factors.push(`${exceededCount} categoría(s) excedida(s)`);
      suggestions.push('Revisa las categorías que excedieron su presupuesto este mes.');
    }
  }

  score = Math.max(0, Math.min(100, score));

  let label = 'Salud financiera baja';
  if (score >= 80) label = 'Excelente salud financiera';
  else if (score >= 60) label = 'Buena salud financiera';
  else if (score >= 40) label = 'Salud financiera moderada';

  return { score, label, factors, suggestions };
}

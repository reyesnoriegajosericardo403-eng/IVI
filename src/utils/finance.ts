import { BUDGET_CONCEPTS, findBudgetConcept, findIncomeConcept, INCOME_CONCEPTS, makeSubBudgetId, parseSubBudgetId } from '@/data/budgetConcepts';
import { DEFAULT_CATEGORIES, findCategory, findSubcategory, findSubcategoryAnyCategory } from '@/data/categories';
import { getUsdMxnRate } from '@/data/exchangeRate';
import type {
  Account,
  Budget,
  BudgetAssignment,
  BudgetTemplate,
  Currency,
  InvestmentPosition,
  Liability,
  NetWorthSnapshot,
  PeriodBudgetOverride,
  TemplateBudgetLine,
  Transaction,
} from '@/data/types';
import { comparePeriodKeys, parsePeriodKey, getAssignmentRange, dateInRange, isoDatesBetween, rangesOverlap, type DateRange } from '@/utils/budgetPeriods';
import { WEEKS_PER_MONTH } from '@/utils/budgetCalculator';
import { daysInMonth, parseISODate, toISODate } from '@/utils/date';
import type { MarketQuote } from '@/providers/types';

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

// Valor de una posición: su valor de mercado en vivo (cantidad × precio
// actual) cuando hay una cotización real disponible, o el monto invertido
// cuando no — nunca se inventa un precio para rellenar el hueco (spec 17,
// 42, y Fase 4: "en base a eso se actualicen los datos... en el
// Dashboard y todo en cuanto a la app").
export function investmentCurrentValue(investment: InvestmentPosition, liveQuotes: Record<string, MarketQuote>): number {
  const quote = liveQuotes[investment.ticker];
  return quote ? investment.quantity * quote.price : investment.amountInvested;
}

// Ganancia o pérdida no realizada: valor de mercado en vivo menos el
// capital invertido. null cuando no hay cotización real para el ticker —
// nunca se calcula con un precio inventado.
export function investmentUnrealizedPnL(investment: InvestmentPosition, liveQuotes: Record<string, MarketQuote>): number | null {
  const quote = liveQuotes[investment.ticker];
  if (!quote) return null;
  return investment.quantity * quote.price - investment.amountInvested;
}

// Cambio del día de una posición (precio actual vs. cierre anterior). null
// cuando no hay cotización o el proveedor no reportó un cierre anterior.
export function investmentDailyChange(investment: InvestmentPosition, liveQuotes: Record<string, MarketQuote>): number | null {
  const quote = liveQuotes[investment.ticker];
  if (!quote || quote.previousClose === null) return null;
  return investment.quantity * (quote.price - quote.previousClose);
}

export function computeNetWorth(
  accounts: Account[],
  investments: InvestmentPosition[],
  liabilities: Liability[],
  baseCurrency: Currency,
  liveQuotes: Record<string, MarketQuote> = {}
): NetWorthBreakdown {
  const accountAssets = accounts
    .filter((a) => !a.isLiability)
    .reduce((sum, a) => sum + toBaseCurrency(a.balance, a.currency, baseCurrency), 0);

  const accountLiabilities = accounts
    .filter((a) => a.isLiability)
    .reduce((sum, a) => sum + toBaseCurrency(a.balance, a.currency, baseCurrency), 0);

  const investmentAssets = investments.reduce(
    (sum, i) => sum + toBaseCurrency(investmentCurrentValue(i, liveQuotes), i.currency, baseCurrency),
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

// Semana de lunes a domingo que contiene `ref` — usada por el toggle
// Semanal/Mensual del presupuesto (spec 41).
export function isSameWeek(iso: string, ref = new Date()): boolean {
  const d = new Date(iso);
  const startOfWeek = (date: Date) => {
    const day = date.getDay(); // 0 = domingo
    const diff = day === 0 ? -6 : 1 - day; // retrocede hasta el lunes
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };
  return startOfWeek(d).getTime() === startOfWeek(ref).getTime();
}

// Movimientos que el propio usuario marcó como "excluir del presupuesto"
// (ej. algo que le van a reembolsar) nunca cuentan en sumas, gráficas ni
// líneas de presupuesto — pero siguen apareciendo en Movimientos, porque
// solo se excluyen del cálculo, no se borran (spec: "la opción de
// excluirlo del presupuesto").
function countsForBudget(t: Transaction): boolean {
  return !t.excludeFromBudget;
}

export function spendInPeriod(transactions: Transaction[], ref = new Date(), scope: 'month' | 'week' = 'month'): number {
  const inScope = scope === 'month' ? isSameMonth : isSameWeek;
  return transactions
    .filter((t) => t.type === 'expense' && countsForBudget(t) && inScope(t.date, ref))
    .reduce((sum, t) => sum + t.amount, 0);
}

// Ingreso o ahorro real del periodo por tipo de movimiento — usado por
// "Tu resumen" del Dashboard (Ahorrado = aportaciones reales a ahorro,
// nunca un cálculo inventado).
export function sumByTypeInPeriod(transactions: Transaction[], type: Transaction['type'], ref = new Date(), scope: 'month' | 'week' = 'month'): number {
  const inScope = scope === 'month' ? isSameMonth : isSameWeek;
  return transactions
    .filter((t) => t.type === type && countsForBudget(t) && inScope(t.date, ref))
    .reduce((sum, t) => sum + t.amount, 0);
}

export function spendByCategory(transactions: Transaction[], ref = new Date()): Record<string, number> {
  const result: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== 'expense' || !countsForBudget(t) || !isSameMonth(t.date, ref)) continue;
    result[t.categoryId] = (result[t.categoryId] ?? 0) + t.amount;
  }
  return result;
}

export interface CategorySpendSlice {
  categoryId: string;
  name: string;
  amount: number;
  percent: number;
}

// Categorías reales con más gasto en el periodo, agrupando el resto en
// "Otros" — nunca se completa a un número fijo si hay menos categorías
// reales que `limit` (spec Dashboard: "¿En qué gastaste tu dinero?").
export function topSpendCategories(
  transactions: Transaction[],
  ref = new Date(),
  scope: 'month' | 'week' = 'month',
  limit = 3
): CategorySpendSlice[] {
  const inScope = scope === 'month' ? isSameMonth : isSameWeek;
  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const t of transactions) {
    if (t.type !== 'expense' || !countsForBudget(t) || !inScope(t.date, ref)) continue;
    byCategory[t.categoryId] = (byCategory[t.categoryId] ?? 0) + t.amount;
    total += t.amount;
  }
  if (total <= 0) return [];

  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, limit);
  const restAmount = sorted.slice(limit).reduce((sum, [, amount]) => sum + amount, 0);

  const slices: CategorySpendSlice[] = top.map(([categoryId, amount]) => ({
    categoryId,
    name: findCategory(categoryId)?.name ?? categoryId,
    amount,
    percent: (amount / total) * 100,
  }));

  if (restAmount > 0) {
    slices.push({ categoryId: '__other__', name: 'Otros', amount: restAmount, percent: (restAmount / total) * 100 });
  }

  return slices;
}

export interface SubcategorySpendSlice {
  categoryId: string;
  subcategoryId: string;
  name: string;
  amount: number;
}

// Subcategorías reales con más gasto — el detalle "más específico" que
// pide Movimientos para ver tus gastos más fuertes (spec: "distribución
// más específica de tus gastos más fuertes").
export function topSpendSubcategories(
  transactions: Transaction[],
  ref = new Date(),
  scope: 'month' | 'week' = 'month',
  limit = 5
): SubcategorySpendSlice[] {
  const inScope = scope === 'month' ? isSameMonth : isSameWeek;
  const bySub: Record<string, { categoryId: string; subcategoryId: string; amount: number }> = {};
  for (const t of transactions) {
    if (t.type !== 'expense' || !countsForBudget(t) || !inScope(t.date, ref)) continue;
    const key = `${t.categoryId}::${t.subcategoryId}`;
    if (!bySub[key]) bySub[key] = { categoryId: t.categoryId, subcategoryId: t.subcategoryId, amount: 0 };
    bySub[key].amount += t.amount;
  }
  return Object.values(bySub)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((s) => ({
      categoryId: s.categoryId,
      subcategoryId: s.subcategoryId,
      name: findSubcategory(s.categoryId, s.subcategoryId)?.name ?? s.subcategoryId,
      amount: s.amount,
    }));
}

export interface LiabilityReminder {
  liabilityId: string;
  institution: string;
  dueDate: string;
  daysUntil: number;
}

// Deudas con fecha de pago real dentro de la ventana (incluye las ya
// vencidas, con daysUntil negativo) — solo lo que el usuario ya
// capturó, nunca un recordatorio inventado (spec Dashboard:
// "Recordatorios para ti").
export function upcomingLiabilityReminders(liabilities: Liability[], withinDays = 14, ref = new Date()): LiabilityReminder[] {
  const startOfToday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  return liabilities
    .filter((l): l is Liability & { dueDate: string } => !!l.dueDate)
    .map((l) => {
      const due = new Date(l.dueDate);
      const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const daysUntil = Math.round((dueDay.getTime() - startOfToday.getTime()) / 86400000);
      return { liabilityId: l.id, institution: l.institution, dueDate: l.dueDate, daysUntil };
    })
    .filter((r) => r.daysUntil <= withinDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

// Tipos que cuentan como "salida de dinero" para un concepto de
// presupuesto — no solo 'expense': una aportación a ahorro ('saving') o
// una compra de inversión ('investment_buy') también son dinero que sale
// hacia LUEGO, aunque no estén categorizadas como gasto (spec 41).
const SPEND_TYPES: Transaction['type'][] = ['expense', 'saving', 'investment_buy'];

// Igual que spendByCategory pero suma por CONCEPTO de presupuesto (spec
// 41) — un concepto puede agrupar varias categorías/subcategorías reales.
// `scope` decide si se filtra por mes o por semana (toggle Semanal/Mensual).
export function spendByConcept(transactions: Transaction[], ref = new Date(), scope: 'month' | 'week' = 'month'): Record<string, number> {
  const inScope = scope === 'month' ? isSameMonth : isSameWeek;
  const expenses = transactions.filter((t) => SPEND_TYPES.includes(t.type) && countsForBudget(t) && inScope(t.date, ref));
  const result: Record<string, number> = {};
  for (const concept of BUDGET_CONCEPTS) {
    let total = 0;
    for (const t of expenses) {
      const matched = concept.matches.some((m) => {
        if (m.categoryId !== t.categoryId) return false;
        return !m.subcategoryIds || m.subcategoryIds.includes(t.subcategoryId);
      });
      if (matched) total += t.amount;
    }
    result[concept.id] = total;
  }
  return result;
}

// Gasto real por SUBCATEGORÍA dentro de un concepto — para las "fichas"
// que se pueden agregar dentro de un concepto de gasto (ej. Uber,
// Microbús, Metro dentro de "Transporte cotidiano"), cada una con su
// propio seguimiento (spec: "es complicado tratar de juntar... lo que
// gastas en conjunto"). La llave es la misma que arma
// `makeSubBudgetId(conceptId, subcategoryId)`, así que buildBudgetLines
// puede usarla directo sin volver a parsear nada.
export function spendBySubBudget(transactions: Transaction[], ref = new Date(), scope: 'month' | 'week' = 'month'): Record<string, number> {
  const inScope = scope === 'month' ? isSameMonth : isSameWeek;
  const expenses = transactions.filter((t) => SPEND_TYPES.includes(t.type) && countsForBudget(t) && inScope(t.date, ref));
  const result: Record<string, number> = {};
  for (const concept of BUDGET_CONCEPTS) {
    for (const t of expenses) {
      const matched = concept.matches.some((m) => m.categoryId === t.categoryId && (!m.subcategoryIds || m.subcategoryIds.includes(t.subcategoryId)));
      if (!matched) continue;
      const key = makeSubBudgetId(concept.id, t.subcategoryId);
      result[key] = (result[key] ?? 0) + t.amount;
    }
  }
  return result;
}

// Ingresos reales (nunca proyectados) del periodo, separados en fijos y
// variables/eventuales según la subcategoría (spec 41, sección Ingresos).
export function incomeByKind(transactions: Transaction[], ref = new Date(), scope: 'month' | 'week' = 'month'): { fixed: number; variable: number } {
  const inScope = scope === 'month' ? isSameMonth : isSameWeek;
  let fixed = 0;
  let variable = 0;
  for (const t of transactions) {
    if (t.type !== 'income' || !countsForBudget(t) || !inScope(t.date, ref)) continue;
    const sub = findSubcategory(t.categoryId, t.subcategoryId);
    if (sub?.incomeKind === 'fixed') fixed += t.amount;
    else variable += t.amount;
  }
  return { fixed, variable };
}

// Igual que spendByConcept pero para ingresos — cuánto has recibido de
// verdad por cada subcategoría de ingreso, para comparar contra lo que
// esperabas (spec: "en la categoría de ingresos no me deja agregar nada
// y mucho menos editar eso" — cada subcategoría ahora es un renglón
// editable, igual que un concepto de gasto).
export function incomeByConcept(transactions: Transaction[], ref = new Date(), scope: 'month' | 'week' = 'month'): Record<string, number> {
  const inScope = scope === 'month' ? isSameMonth : isSameWeek;
  const incomeTx = transactions.filter((t) => t.type === 'income' && countsForBudget(t) && inScope(t.date, ref));
  const result: Record<string, number> = {};
  for (const concept of INCOME_CONCEPTS) {
    let total = 0;
    for (const t of incomeTx) {
      const matched = concept.matches.some((m) => {
        if (m.categoryId !== t.categoryId) return false;
        return !m.subcategoryIds || m.subcategoryIds.includes(t.subcategoryId);
      });
      if (matched) total += t.amount;
    }
    result[concept.id] = total;
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
  // Fecha en que normalmente llega/se cobra — según la periodicidad
  // elegida al definir el monto (mes → dayOfMonth, semana → dayOfWeek,
  // día+extemporáneo → oneTimeDate). Aplica a ingresos y a gastos por
  // igual (ej. "la renta se carga el 5 de cada mes").
  dayOfMonth?: number;
  dayOfWeek?: number;
  oneTimeDate?: string;
  // Solo en conceptos de INGRESO: cuenta a la que entra ese dinero.
  targetAccountId?: string;
  // Solo en conceptos de GASTO: cuentas con las que normalmente se paga
  // (opcional, vacío = cualquier cuenta activa es válida).
  includedAccountIds?: string[];
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
  ref = new Date(),
  scope: 'month' | 'week' = 'month'
): BudgetLine[] {
  // b.categoryId puede ser un id de categoría (presupuestos guardados con
  // el esquema anterior), un id de concepto de gasto, un id de concepto
  // de ingreso, o la llave compuesta de una ficha por subcategoría dentro
  // de un concepto (esquema nuevo, `concepto::subcategoría`) — se
  // reconocen los cuatro para que ningún presupuesto ya guardado se quede
  // huérfano al pasar a la nueva taxonomía. `scope` se respeta en todos
  // los casos: antes esta función siempre calculaba el gasto/ingreso real
  // del MES aunque la pantalla estuviera en modo semanal, lo que
  // desalineaba el % y el color mostrados contra el monto real de esa
  // semana.
  const spend = spendByCategory(transactions, ref);
  const conceptSpend = spendByConcept(transactions, ref, scope);
  const incomeConceptActual = incomeByConcept(transactions, ref, scope);
  const subBudgetSpend = spendBySubBudget(transactions, ref, scope);
  return budgets.map((b) => {
    const subBudget = parseSubBudgetId(b.categoryId);
    const expenseConcept = subBudget ? findBudgetConcept(subBudget.conceptId) : findBudgetConcept(b.categoryId);
    const incomeConcept = subBudget ? undefined : findIncomeConcept(b.categoryId);
    const actual = subBudget
      ? subBudgetSpend[b.categoryId] ?? 0
      : incomeConcept
        ? incomeConceptActual[b.categoryId] ?? 0
        : expenseConcept
          ? conceptSpend[b.categoryId] ?? 0
          : spend[b.categoryId] ?? 0;
    const percentUsed = b.monthlyAmount > 0 ? Math.round((actual / b.monthlyAmount) * 100) : 0;
    const categoryName = subBudget
      ? findSubcategoryAnyCategory(subBudget.subcategoryId)?.subcategory.name ?? b.categoryId
      : expenseConcept?.name ?? incomeConcept?.name ?? DEFAULT_CATEGORIES.find((c) => c.id === b.categoryId)?.name ?? b.categoryId;
    return {
      budgetId: b.id,
      categoryId: b.categoryId,
      categoryName,
      budgeted: b.monthlyAmount,
      actual,
      percentUsed,
      status: computeBudgetStatus(percentUsed, thresholds),
      dayOfMonth: b.dayOfMonth,
      dayOfWeek: b.dayOfWeek,
      oneTimeDate: b.oneTimeDate,
      targetAccountId: incomeConcept ? b.targetAccountId : undefined,
      includedAccountIds: expenseConcept ? b.includedAccountIds : undefined,
    };
  });
}

// Clave estable del periodo que contiene `ref` — misma semana/mes siempre
// produce la misma clave, para poder detectar cuándo "ya cambió de
// semana/mes" desde la última vez que se abrió la app (spec: "cuando
// acabe la semana el domingo... al momento de abrir la app").
export function periodKey(scope: 'month' | 'week', ref = new Date()): string {
  if (scope === 'month') {
    return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
  }
  const day = ref.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

// Cuánto quedó "Disponible" (ingresos reales - gastos reales, NUNCA
// montos presupuestados) en el periodo ANTERIOR al que contiene `ref` —
// usado para preguntarle al usuario si ese sobrante sigue contando como
// dinero disponible en el periodo nuevo (spec: "¿seguimos con el mismo
// sobrante de dinero disponible?" / "no le restes ni le sumes los gastos
// que están en el presupuesto porque eso no tiene sentido").
export function previousPeriodAvailable(transactions: Transaction[], scope: 'month' | 'week', ref = new Date()): number {
  const prevRef = new Date(ref);
  if (scope === 'month') prevRef.setMonth(prevRef.getMonth() - 1);
  else prevRef.setDate(prevRef.getDate() - 7);
  const income = incomeByKind(transactions, prevRef, scope);
  const spent = spendInPeriod(transactions, prevRef, scope);
  return Math.max(0, income.fixed + income.variable - spent);
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

// ============================================================
// Presupuestos con nombre aplicados a periodos del calendario
// ============================================================

function inDateRange(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

// Versiones por RANGO de las sumas por concepto — las de arriba
// (spendByConcept y compañía) siguen intactas porque el Dashboard y
// Movimientos las usan con "ahora"; estas permiten mirar cualquier
// periodo pasado o futuro (spec: "revisar presupuestos pasados así como
// los resultados de esos presupuestos").
export function spendByConceptInRange(transactions: Transaction[], start: Date, end: Date): Record<string, number> {
  const expenses = transactions.filter((t) => SPEND_TYPES.includes(t.type) && countsForBudget(t) && inDateRange(t.date, start, end));
  const result: Record<string, number> = {};
  for (const concept of BUDGET_CONCEPTS) {
    let total = 0;
    for (const t of expenses) {
      const matched = concept.matches.some((m) => m.categoryId === t.categoryId && (!m.subcategoryIds || m.subcategoryIds.includes(t.subcategoryId)));
      if (matched) total += t.amount;
    }
    result[concept.id] = total;
  }
  return result;
}

export function spendBySubBudgetInRange(transactions: Transaction[], start: Date, end: Date): Record<string, number> {
  const expenses = transactions.filter((t) => SPEND_TYPES.includes(t.type) && countsForBudget(t) && inDateRange(t.date, start, end));
  const result: Record<string, number> = {};
  for (const concept of BUDGET_CONCEPTS) {
    for (const t of expenses) {
      const matched = concept.matches.some((m) => m.categoryId === t.categoryId && (!m.subcategoryIds || m.subcategoryIds.includes(t.subcategoryId)));
      if (!matched) continue;
      const key = makeSubBudgetId(concept.id, t.subcategoryId);
      result[key] = (result[key] ?? 0) + t.amount;
    }
  }
  return result;
}

export function incomeByConceptInRange(transactions: Transaction[], start: Date, end: Date): Record<string, number> {
  const incomeTx = transactions.filter((t) => t.type === 'income' && countsForBudget(t) && inDateRange(t.date, start, end));
  const result: Record<string, number> = {};
  for (const concept of INCOME_CONCEPTS) {
    let total = 0;
    for (const t of incomeTx) {
      const matched = concept.matches.some((m) => m.categoryId === t.categoryId && (!m.subcategoryIds || m.subcategoryIds.includes(t.subcategoryId)));
      if (matched) total += t.amount;
    }
    result[concept.id] = total;
  }
  return result;
}

// La plantilla que manda en un periodo: la que se asignó explícitamente
// en el calendario o, si ese periodo no tiene ninguna, la plantilla por
// defecto ("Mi presupuesto") — así nadie se queda sin presupuesto por no
// haber tocado el calendario nunca.
export function resolveTemplateForPeriod(
  periodKey: string,
  templates: BudgetTemplate[],
  assignments: BudgetAssignment[]
): { template: BudgetTemplate | undefined; assignment: BudgetAssignment | undefined } {
  const assignment = assignments.find((a) => a.periodKey === periodKey);
  if (assignment) {
    const template = templates.find((t) => t.id === assignment.templateId);
    if (template) return { template, assignment };
  }
  return { template: templates.find((t) => t.isDefault), assignment: undefined };
}

// Combina un renglón de plantilla con su ajuste de ese periodo (si lo
// hay). Devuelve null si el ajuste dice que ese renglón no aplica aquí.
function mergeLineWithOverride(line: TemplateBudgetLine, override: PeriodBudgetOverride | undefined): TemplateBudgetLine | null {
  if (!override) return line;
  if (override.monthlyAmount === null) return null;
  return {
    ...line,
    monthlyAmount: override.monthlyAmount,
    periodicity: override.periodicity ?? line.periodicity,
    frequency: override.frequency ?? line.frequency,
    customDaysPerWeek: override.customDaysPerWeek ?? line.customDaysPerWeek,
    baseAmount: override.baseAmount ?? line.baseAmount,
    dayOfMonth: override.dayOfMonth ?? line.dayOfMonth,
    dayOfWeek: override.dayOfWeek ?? line.dayOfWeek,
    oneTimeDate: override.oneTimeDate ?? line.oneTimeDate,
    targetAccountId: override.targetAccountId ?? line.targetAccountId,
    includedAccountIds: override.includedAccountIds ?? line.includedAccountIds,
  };
}

export interface ResolvedPeriodBudget {
  template: BudgetTemplate | undefined;
  assignment: BudgetAssignment | undefined;
  lines: BudgetLine[];
  // Gasto/ingreso real del periodo por concepto y por ficha — mismas
  // llaves que usan ConceptRow/ConceptSubBudgets para los conceptos que
  // todavía no tienen monto definido.
  conceptSpend: Record<string, number>;
  subcategorySpend: Record<string, number>;
  incomeConceptActual: Record<string, number>;
}

// Arma las líneas de presupuesto de UN periodo del calendario, con la
// plantilla que le toque y los ajustes propios de ese periodo ya
// aplicados. Sustituye a buildBudgetLines en Presupuesto y en el
// Dashboard (Inicio llama esta misma función con el periodo real de
// "ahora") — buildBudgetLines se queda solo para el paso de presupuesto
// del onboarding, que todavía escribe en el arreglo `budgets` heredado.
export function resolveBudgetForPeriod(input: {
  periodKey: string;
  templates: BudgetTemplate[];
  templateLines: TemplateBudgetLine[];
  assignments: BudgetAssignment[];
  overrides: PeriodBudgetOverride[];
  transactions: Transaction[];
  thresholds: { attention: number; warning: number; exceeded: number };
}): ResolvedPeriodBudget {
  const { periodKey, templates, templateLines, assignments, overrides, transactions, thresholds } = input;
  const { template, assignment } = resolveTemplateForPeriod(periodKey, templates, assignments);
  const parsed = parsePeriodKey(periodKey);
  const start = parsed?.start ?? new Date();
  const end = parsed?.end ?? new Date();

  const conceptSpend = spendByConceptInRange(transactions, start, end);
  const subcategorySpend = spendBySubBudgetInRange(transactions, start, end);
  const incomeConceptActual = incomeByConceptInRange(transactions, start, end);

  const ownLines = template ? templateLines.filter((l) => l.templateId === template.id) : [];
  const overridesHere = assignment ? overrides.filter((o) => o.assignmentId === assignment.id) : [];
  const lines = buildLinesFromTemplateLines(ownLines, overridesHere, conceptSpend, subcategorySpend, incomeConceptActual, thresholds);

  return { template, assignment, lines, conceptSpend, subcategorySpend, incomeConceptActual };
}

// ============================================================
// Resolución por RANGO arbitrario (spec v2 "Plan de gastos"): una
// asignación ya no vive solo en un day/week/month exacto — puede cubrir
// cualquier tramo de fechas. La regla central es "nunca sumar
// automáticamente plantillas completas... resolver solapamientos": para
// cada día del calendario gana la asignación con el rango más ESPECÍFICO
// (el más corto) que lo cubra — generaliza exactamente la prioridad
// día > semana > mes que ya existía, así que ninguna asignación vieja
// cambia de resultado. Con esto, dos plantillas NUNCA se mezclan el mismo
// día: sigue habiendo un solo ganador, así que no hace falta un motor de
// "reemplazar/agregar por categoría" para cumplir el invariante de no
// contar dos veces.
// ============================================================

export function resolveTemplateForDate(
  date: Date,
  templates: BudgetTemplate[],
  assignments: BudgetAssignment[]
): { template: BudgetTemplate | undefined; assignment: BudgetAssignment | undefined } {
  let best: { assignment: BudgetAssignment; range: DateRange } | null = null;
  for (const a of assignments) {
    const range = getAssignmentRange(a);
    if (!range || !dateInRange(date, range)) continue;
    if (!best) {
      best = { assignment: a, range };
      continue;
    }
    const bestSpan = best.range.end.getTime() - best.range.start.getTime();
    const span = range.end.getTime() - range.start.getTime();
    // Más corto gana; empate → la más reciente (createdAt) gana, nunca
    // "la última guardada" de forma implícita por orden de arreglo.
    if (span < bestSpan || (span === bestSpan && a.createdAt > best.assignment.createdAt)) {
      best = { assignment: a, range };
    }
  }
  if (best) {
    const template = templates.find((t) => t.id === best!.assignment.templateId);
    if (template) return { template, assignment: best.assignment };
  }
  return { template: templates.find((t) => t.isDefault), assignment: undefined };
}

// Cuánto aporta UN renglón de plantilla en UN día calendario específico —
// nunca dividiendo el mes entre cuatro semanas (spec), usando días REALES
// del mes/rango. Fijas (dayOfMonth/dayOfWeek/oneTimeDate) cuentan una sola
// vez en su fecha real, nunca prorrateadas; variables se reparten entre
// los días que de verdad les tocan.
function dailyLineContribution(line: TemplateBudgetLine, date: Date): number {
  const dow = date.getDay();
  const dom = date.getDate();
  const monthDays = daysInMonth(date);

  if (line.periodicity === 'day') {
    if (line.frequency === 'one_time') {
      return line.oneTimeDate && toISODate(date) === line.oneTimeDate ? line.monthlyAmount : 0;
    }
    const daily = line.baseAmount ?? line.monthlyAmount / monthDays;
    if (line.frequency === 'weekdays') return dow >= 1 && dow <= 5 ? daily : 0;
    if (line.frequency === 'weekends') return dow === 0 || dow === 6 ? daily : 0;
    if (line.frequency === 'custom') {
      // No se sabe cuáles días de la semana eligió exactamente — se
      // reparte proporcional (perWeek/7) en vez de adivinar cuáles,
      // consistente en promedio con computeMonthlyAmount.
      const perWeek = Math.min(6, Math.max(1, line.customDaysPerWeek ?? 1));
      return daily * (perWeek / 7);
    }
    return daily; // all_days
  }

  if (line.periodicity === 'week') {
    const weeklyAmount = line.monthlyAmount / WEEKS_PER_MONTH;
    if (line.dayOfWeek !== undefined) return dow === line.dayOfWeek ? weeklyAmount : 0;
    return weeklyAmount / 7;
  }

  // periodicity === 'month' (o sin declarar — mensual es el default histórico)
  if (line.dayOfMonth !== undefined) return dom === Math.min(line.dayOfMonth, monthDays) ? line.monthlyAmount : 0;
  if (line.oneTimeDate) return toISODate(date) === line.oneTimeDate ? line.monthlyAmount : 0;
  return line.monthlyAmount / monthDays;
}

export interface ResolvedRangeBudget {
  // Total planeado/gastado del rango completo, ya sin doble conteo.
  plannedExpense: number;
  plannedIncome: number;
  actualExpense: number;
  actualIncome: number;
  // Desglose por categoría para "Detalle de gastos" — suma la aportación
  // diaria real de cada renglón (de la plantilla que gane cada día) más el
  // gasto real correspondiente, para poder explicar cualquier total alto.
  categoryBreakdown: { categoryId: string; categoryName: string; planned: number; actual: number }[];
}

// Ingresos/egresos planeados de un RANGO de fechas (puede cruzar varias
// asignaciones/plantillas distintas) contra el gasto/ingreso REAL del
// mismo rango — mismos filtros para ambos números (invariante del spec:
// "vista previa y resumen coinciden").
export function resolveBudgetForRange(input: {
  startIso: string;
  endIso: string;
  templates: BudgetTemplate[];
  templateLines: TemplateBudgetLine[];
  assignments: BudgetAssignment[];
  transactions: Transaction[];
}): ResolvedRangeBudget {
  const { startIso, endIso, templates, templateLines, assignments, transactions } = input;
  const dates = isoDatesBetween(startIso, endIso).map((iso) => parseISODate(iso));
  const linesByTemplate = new Map<string, TemplateBudgetLine[]>();
  for (const l of templateLines) {
    if (l.deletedAt) continue;
    if (!linesByTemplate.has(l.templateId)) linesByTemplate.set(l.templateId, []);
    linesByTemplate.get(l.templateId)!.push(l);
  }

  let plannedExpense = 0;
  let plannedIncome = 0;
  const byCategory = new Map<string, { categoryName: string; planned: number }>();

  for (const date of dates) {
    const { template } = resolveTemplateForDate(date, templates, assignments);
    if (!template) continue;
    const lines = linesByTemplate.get(template.id) ?? [];
    for (const line of lines) {
      const amount = dailyLineContribution(line, date);
      if (amount === 0) continue;
      const isIncome = !!findIncomeConcept(line.categoryId);
      if (isIncome) plannedIncome += amount;
      else plannedExpense += amount;
      const sub = parseSubBudgetId(line.categoryId);
      const name = sub
        ? (findSubcategoryAnyCategory(sub.subcategoryId)?.subcategory.name ?? line.categoryId)
        : (findBudgetConcept(line.categoryId)?.name ?? findIncomeConcept(line.categoryId)?.name ?? line.categoryId);
      const bucket = byCategory.get(line.categoryId) ?? { categoryName: name, planned: 0 };
      bucket.planned += isIncome ? 0 : amount;
      byCategory.set(line.categoryId, bucket);
    }
  }

  const start = parseISODate(startIso);
  const end = parseISODate(endIso);
  end.setHours(23, 59, 59, 999);
  const conceptSpend = spendByConceptInRange(transactions, start, end);
  const subSpend = spendBySubBudgetInRange(transactions, start, end);
  const incomeSpend = incomeByConceptInRange(transactions, start, end);
  const actualExpense = Object.values(conceptSpend).reduce((a, b) => a + b, 0);
  const actualIncome = Object.values(incomeSpend).reduce((a, b) => a + b, 0);

  const categoryBreakdown = Array.from(byCategory.entries()).map(([categoryId, v]) => {
    const sub = parseSubBudgetId(categoryId);
    const actual = sub ? (subSpend[categoryId] ?? 0) : (conceptSpend[categoryId] ?? 0);
    return { categoryId, categoryName: v.categoryName, planned: v.planned, actual };
  });
  // Gastos reales sin ningún plan que los cubra — spec: "mostrar gastos
  // sin plan como categoría propia, nunca esconderlos".
  const covered = new Set(categoryBreakdown.map((c) => c.categoryId));
  for (const [conceptId, actual] of Object.entries(conceptSpend)) {
    if (actual > 0 && !covered.has(conceptId)) {
      categoryBreakdown.push({ categoryId: conceptId, categoryName: findBudgetConcept(conceptId)?.name ?? conceptId, planned: 0, actual });
    }
  }

  return {
    plannedExpense,
    plannedIncome,
    actualExpense,
    actualIncome,
    categoryBreakdown: categoryBreakdown.sort((a, b) => b.actual - a.actual),
  };
}

// Planeado/gastado de UNA plantilla específica, solo en los días que ELLA
// misma cubre dentro de una ventana (ej. el mes que se está viendo) — a
// diferencia de resolveBudgetForRange (que mezcla quien gane cada día),
// esta ignora otras plantillas por completo: útil para el resumen del
// panel de acción cuando no hay un rango pendiente que previsualizar.
export function resolveTemplateBudgetInRange(input: {
  template: BudgetTemplate;
  templateLines: TemplateBudgetLine[];
  assignments: BudgetAssignment[];
  startIso: string;
  endIso: string;
  transactions: Transaction[];
}): { planned: number; actual: number; categoryBreakdown: { categoryId: string; categoryName: string; planned: number; actual: number }[] } {
  const { template, templateLines, assignments, startIso, endIso, transactions } = input;
  const windowStart = parseISODate(startIso);
  const windowEnd = parseISODate(endIso);
  windowEnd.setHours(23, 59, 59, 999);
  const ownAssignments = assignments.filter((a) => a.templateId === template.id && !a.deletedAt);
  const ownLines = templateLines.filter((l) => l.templateId === template.id && !l.deletedAt);

  const coveredIsoDays = new Set<string>();
  for (const a of ownAssignments) {
    const range = getAssignmentRange(a);
    if (!range) continue;
    const from = range.start.getTime() > windowStart.getTime() ? range.start : windowStart;
    const to = range.end.getTime() < windowEnd.getTime() ? range.end : windowEnd;
    for (const d = new Date(from); d.getTime() <= to.getTime(); d.setDate(d.getDate() + 1)) {
      coveredIsoDays.add(toISODate(d));
    }
  }

  let planned = 0;
  const plannedByCategory = new Map<string, { categoryName: string; planned: number }>();
  for (const iso of coveredIsoDays) {
    const date = parseISODate(iso);
    for (const line of ownLines) {
      if (findIncomeConcept(line.categoryId)) continue;
      const amount = dailyLineContribution(line, date);
      if (amount === 0) continue;
      planned += amount;
      const sub = parseSubBudgetId(line.categoryId);
      const name = sub
        ? (findSubcategoryAnyCategory(sub.subcategoryId)?.subcategory.name ?? line.categoryId)
        : (findBudgetConcept(line.categoryId)?.name ?? line.categoryId);
      const bucket = plannedByCategory.get(line.categoryId) ?? { categoryName: name, planned: 0 };
      bucket.planned += amount;
      plannedByCategory.set(line.categoryId, bucket);
    }
  }

  const coveredExpenses = transactions.filter(
    (t) => SPEND_TYPES.includes(t.type) && countsForBudget(t) && coveredIsoDays.has(t.date.slice(0, 10))
  );
  const actual = coveredExpenses.reduce((sum, t) => sum + t.amount, 0);

  const actualByCategory = new Map<string, number>();
  for (const t of coveredExpenses) {
    const sub = BUDGET_CONCEPTS.flatMap((c) => c.matches.map((m) => ({ conceptId: c.id, ...m }))).find(
      (m) => m.categoryId === t.categoryId && (!m.subcategoryIds || m.subcategoryIds.includes(t.subcategoryId))
    );
    if (!sub) continue;
    const subBudgetKey = makeSubBudgetId(sub.conceptId, t.subcategoryId);
    const key = plannedByCategory.has(subBudgetKey) ? subBudgetKey : sub.conceptId;
    actualByCategory.set(key, (actualByCategory.get(key) ?? 0) + t.amount);
  }

  const categoryBreakdown = Array.from(plannedByCategory.entries()).map(([categoryId, v]) => ({
    categoryId,
    categoryName: v.categoryName,
    planned: v.planned,
    actual: actualByCategory.get(categoryId) ?? 0,
  }));
  const covered = new Set(categoryBreakdown.map((c) => c.categoryId));
  for (const [conceptId, amount] of actualByCategory.entries()) {
    if (!covered.has(conceptId)) {
      categoryBreakdown.push({ categoryId: conceptId, categoryName: findBudgetConcept(conceptId)?.name ?? conceptId, planned: 0, actual: amount });
    }
  }

  return { planned, actual, categoryBreakdown: categoryBreakdown.sort((a, b) => b.actual - a.actual) };
}

export interface UpcomingAssignmentSummary {
  assignment: BudgetAssignment;
  template: BudgetTemplate;
  range: DateRange;
  plannedExpense: number;
}

// Próximas asignaciones (de CUALQUIER plantilla, no solo la seleccionada)
// que empiezan después de una fecha — para el bloque "Próximas semanas"
// del panel de acción (spec: imagen de referencia mezcla Vacaciones y
// Clases en una sola lista ordenada por fecha).
export function upcomingAssignments(
  afterIso: string,
  assignments: BudgetAssignment[],
  templates: BudgetTemplate[],
  templateLines: TemplateBudgetLine[],
  limit: number
): UpcomingAssignmentSummary[] {
  const after = parseISODate(afterIso);
  const results: UpcomingAssignmentSummary[] = [];
  for (const a of assignments) {
    if (a.deletedAt) continue;
    const range = getAssignmentRange(a);
    const template = templates.find((t) => t.id === a.templateId && !t.deletedAt);
    if (!range || !template || template.isDefault) continue;
    if (range.start.getTime() <= after.getTime()) continue;
    const resolved = resolveBudgetForRange({
      startIso: toISODate(range.start),
      endIso: toISODate(range.end),
      templates,
      templateLines,
      assignments: [a],
      transactions: [],
    });
    results.push({ assignment: a, template, range, plannedExpense: resolved.plannedExpense });
  }
  return results.sort((a, b) => a.range.start.getTime() - b.range.start.getTime()).slice(0, Math.max(0, limit));
}

// Asignaciones existentes que se traslapan con un rango nuevo que se está
// por confirmar — para el aviso de conflicto (spec: "nombrar el
// presupuesto anterior, los días afectados... antes de confirmar"). Con
// resolución por "rango más específico gana", el nuevo rango (más corto
// que un mes/semana completos, casi siempre) gana solo sin tocar la
// asignación anterior — el aviso es informativo, no requiere mutar nada.
export function findOverlappingAssignments(
  startIso: string,
  endIso: string,
  assignments: BudgetAssignment[],
  templates: BudgetTemplate[]
): { assignment: BudgetAssignment; template: BudgetTemplate | undefined }[] {
  const start = parseISODate(startIso);
  const end = parseISODate(endIso);
  end.setHours(23, 59, 59, 999);
  const newRange: DateRange = { start, end };
  const out: { assignment: BudgetAssignment; template: BudgetTemplate | undefined }[] = [];
  for (const a of assignments) {
    if (a.deletedAt) continue;
    const range = getAssignmentRange(a);
    if (!range || !rangesOverlap(range, newRange)) continue;
    out.push({ assignment: a, template: templates.find((t) => t.id === a.templateId) });
  }
  return out;
}

// Arma las `BudgetLine[]` de un conjunto de renglones de plantilla, con
// sus ajustes de periodo ya combinados (o sin ninguno — arrays vacíos —
// para editar la plantilla misma sin el contexto de un periodo, spec:
// "editar montos" desde la lista de "Mis presupuestos").
export function buildLinesFromTemplateLines(
  ownLines: TemplateBudgetLine[],
  overridesHere: PeriodBudgetOverride[],
  conceptSpend: Record<string, number>,
  subcategorySpend: Record<string, number>,
  incomeConceptActual: Record<string, number>,
  thresholds: { attention: number; warning: number; exceeded: number }
): BudgetLine[] {
  const lines: BudgetLine[] = [];
  for (const raw of ownLines) {
    const merged = mergeLineWithOverride(raw, overridesHere.find((o) => o.categoryId === raw.categoryId));
    if (!merged) continue;
    const subBudget = parseSubBudgetId(merged.categoryId);
    const expenseConcept = subBudget ? findBudgetConcept(subBudget.conceptId) : findBudgetConcept(merged.categoryId);
    const incomeConcept = subBudget ? undefined : findIncomeConcept(merged.categoryId);
    const actual = subBudget
      ? subcategorySpend[merged.categoryId] ?? 0
      : incomeConcept
        ? incomeConceptActual[merged.categoryId] ?? 0
        : conceptSpend[merged.categoryId] ?? 0;
    const percentUsed = merged.monthlyAmount > 0 ? Math.round((actual / merged.monthlyAmount) * 100) : 0;
    const categoryName = subBudget
      ? findSubcategoryAnyCategory(subBudget.subcategoryId)?.subcategory.name ?? merged.categoryId
      : expenseConcept?.name ?? incomeConcept?.name ?? merged.categoryId;
    lines.push({
      budgetId: merged.id,
      categoryId: merged.categoryId,
      categoryName,
      budgeted: merged.monthlyAmount,
      actual,
      percentUsed,
      status: computeBudgetStatus(percentUsed, thresholds),
      dayOfMonth: merged.dayOfMonth,
      dayOfWeek: merged.dayOfWeek,
      oneTimeDate: merged.oneTimeDate,
      targetAccountId: incomeConcept ? merged.targetAccountId : undefined,
      includedAccountIds: expenseConcept ? merged.includedAccountIds : undefined,
    });
  }
  return lines;
}

// Las próximas N asignaciones de la MISMA plantilla, en orden
// cronológico, después del periodo que se está viendo — para "aplica
// este cambio a los próximos N periodos" (spec: dropdown del 1 al 24).
export function nextAssignmentsOfTemplate(
  templateId: string,
  afterPeriodKey: string,
  assignments: BudgetAssignment[],
  limit: number
): BudgetAssignment[] {
  return assignments
    .filter((a) => a.templateId === templateId && comparePeriodKeys(a.periodKey, afterPeriodKey) > 0)
    .sort((a, b) => comparePeriodKeys(a.periodKey, b.periodKey))
    .slice(0, Math.max(0, limit));
}

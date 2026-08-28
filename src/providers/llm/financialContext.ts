import type { CopilotContext } from '@/ai/localCopilot';
import { buildBudgetLines, computeNetWorth, spendByCategory, spendInPeriod } from '@/utils/finance';

// Resumen compacto y curado de los datos reales del usuario — nunca se le
// manda al modelo el historial completo de transacciones (gastaría tokens
// y podría filtrar más de lo necesario). Las mismas funciones que usa el
// copiloto local calculan estos números, así que un proveedor LLM nunca
// puede "ver" ni inventar una cifra que la app misma no haya calculado.
export function buildFinancialContextSummary(ctx: CopilotContext) {
  const netWorth = computeNetWorth(ctx.accounts, ctx.investments, ctx.liabilities, ctx.profile.primaryCurrency);
  const spendThisMonth = spendInPeriod(ctx.transactions);
  const spendByCat = spendByCategory(ctx.transactions);
  const budgetLines = buildBudgetLines(ctx.budgets, ctx.transactions, ctx.profile.budgetThresholds);

  return {
    moneda_principal: ctx.profile.primaryCurrency,
    patrimonio: {
      activos: netWorth.assets,
      pasivos: netWorth.liabilities,
      neto: netWorth.netWorth,
    },
    gasto_del_mes_actual: spendThisMonth,
    gasto_por_categoria_este_mes: spendByCat,
    presupuestos: budgetLines.map((b) => ({
      categoria: b.categoryName,
      presupuestado: b.budgeted,
      real: b.actual,
      porcentaje_usado: b.percentUsed,
      estado: b.status,
    })),
    cuentas: ctx.accounts.map((a) => ({ nombre: a.name, tipo: a.type, saldo: a.balance, moneda: a.currency })),
    deudas: ctx.liabilities.map((l) => ({
      institucion: l.institution,
      tipo: l.type,
      saldo: l.balance,
      tasa_interes: l.interestRate,
      moneda: l.currency,
    })),
    inversiones: ctx.investments.map((i) => ({
      ticker: i.ticker,
      nombre: i.name,
      monto_invertido: i.amountInvested,
      moneda: i.currency,
      nota: 'monto invertido, no valor de mercado en vivo',
    })),
    metas: ctx.goals.map((g) => ({ nombre: g.name, actual: g.currentAmount, objetivo: g.targetAmount, moneda: g.currency })),
    movimientos_recientes: ctx.transactions.slice(0, 20).map((t) => ({
      tipo: t.type,
      monto: t.amount,
      moneda: t.currency,
      categoria: t.categoryId,
      comercio: t.merchant,
      fecha: t.date,
    })),
  };
}

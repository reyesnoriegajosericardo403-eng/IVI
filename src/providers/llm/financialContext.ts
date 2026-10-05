import type { CopilotContext } from '@/ai/localCopilot';
import { buildBudgetLines, computeNetWorth, spendByCategory, spendInPeriod } from '@/utils/finance';

import { hideNamesFromAi, redactName } from '@/services/privacy/aiPrivacy';
import { toISODate } from '@/utils/date';

import type { ActionAgentContext } from '../types';

// Resumen compacto y curado de los datos reales del usuario — nunca se le
// manda al modelo el historial completo de transacciones (gastaría tokens
// y podría filtrar más de lo necesario). Las mismas funciones que usa el
// copiloto local calculan estos números, así que un proveedor LLM nunca
// puede "ver" ni inventar una cifra que la app misma no haya calculado.
export function buildFinancialContextSummary(ctx: CopilotContext, hideNames: boolean = hideNamesFromAi()) {
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
      institucion: l.direction === 'owed_to_me' ? redactName(l.institution, hideNames) : l.institution,
      tipo: l.type,
      saldo: l.balance,
      tasa_interes: l.interestRate,
      moneda: l.currency,
      sentido: l.direction === 'owed_to_me' ? 'me_deben' : 'yo_debo',
      contraparte: redactName(l.counterparty, hideNames),
      estado: l.status === 'settled' ? 'saldada' : 'activa',
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
      comercio: redactName(t.merchant, hideNames),
      fecha: t.date,
    })),
  };
}

// Hermana de buildFinancialContextSummary, para el agente de acciones
// (src/providers/llm/LLMActionAgentProvider.ts) — se mantiene aparte a
// propósito para no arriesgar el prompt de solo-lectura ya afinado. A
// diferencia de esa, esta SÍ incluye el `id` real de cada registro (el
// modelo necesita poder referenciar uno concreto para proponer una
// acción), pero sigue excluyendo `notes`/texto libre — reduce la
// superficie de inyección de instrucciones vía un comercio o nota con
// texto adversario.
export function buildActionContextSummary(ctx: ActionAgentContext, hideNames: boolean = hideNamesFromAi()) {
  return {
    // para que el modelo pueda traducir "ayer" o "el viernes" a una fecha exacta
    fecha_de_hoy: toISODate(new Date()),
    moneda_principal: ctx.profile.primaryCurrency,
    cuentas: ctx.accounts.map((a) => ({ id: a.id, nombre: a.name, tipo: a.type, saldo: a.balance, moneda: a.currency })),
    metas: ctx.goals.map((g) => ({ id: g.id, nombre: g.name, actual: g.currentAmount, objetivo: g.targetAmount, fecha_objetivo: g.targetDate, moneda: g.currency })),
    deudas: ctx.liabilities.filter((l) => !l.deletedAt && l.status !== 'settled').map((l) => ({ id: l.id, institucion: l.direction === 'owed_to_me' ? redactName(l.institution, hideNames) : l.institution, tipo: l.type, saldo: l.balance, vencimiento: l.dueDate, moneda: l.currency, sentido: l.direction === 'owed_to_me' ? 'me_deben' : 'yo_debo' })),
    // P3: lo que el modelo necesita para referirse a un previsto, un pago recurrente, un aviso o una inversión por su nombre
    previstos: (ctx.forecasts ?? []).filter((t) => !t.deletedAt && t.status === 'forecast').slice(0, 30).map((t) => ({ id: t.id, nombre: t.merchant ?? t.subcategoryId, tipo: t.type, monto: t.amount, moneda: t.currency, fecha: t.date.slice(0, 10) })),
    pagos_recurrentes: (ctx.recurringRules ?? []).filter((r) => !r.deletedAt && r.status !== 'ended').slice(0, 30).map((r) => ({ id: r.id, nombre: r.name, estado: r.status, monto: r.amount, moneda: r.currency })),
    avisos: (ctx.reminders ?? []).filter((r) => !r.deletedAt && r.status !== 'cancelled' && r.sourceType !== 'rule').slice(0, 30).map((r) => ({ id: r.id, titulo: r.title })),
    inversiones: ctx.investments.filter((i) => !i.deletedAt).slice(0, 30).map((i) => ({ id: i.id, ticker: i.ticker, nombre: i.name, moneda: i.currency })),
    presupuesto_actual: ctx.templateBudgetLines
      .filter((l) => !l.deletedAt)
      .map((l) => ({ id: l.id, categoria_id: l.categoryId, monto_mensual: l.monthlyAmount, moneda: l.currency })),
    movimientos_recientes: ctx.transactions.slice(0, 20).map((t) => ({
      id: t.id,
      tipo: t.type,
      monto: t.amount,
      moneda: t.currency,
      categoria: t.categoryId,
      fecha: t.date,
    })),
  };
}

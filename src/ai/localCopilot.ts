import { DEFAULT_CATEGORIES } from '@/data/categories';
import type { Account, Budget, Goal, InvestmentPosition, Liability, Transaction, UserProfile } from '@/data/types';
import {
  buildBudgetLines,
  computeFinancialHealth,
  computeNetWorth,
  previousMonthSpend,
  spendByCategory,
  spendInPeriod,
} from '@/utils/finance';
import { formatCurrency, formatPercent } from '@/utils/format';

// Copiloto local — Fase 1. Responde preguntas frecuentes calculando
// directamente sobre los datos reales del usuario, SIN modelo de lenguaje
// todavía. Nunca inventa cifras: si la pregunta no coincide con un patrón
// conocido, lo dice explícitamente en vez de improvisar una respuesta
// (spec secciones 21 y 42). En Fase 3 esto se amplía con Claude para
// cubrir lenguaje libre.

export interface CopilotContext {
  profile: UserProfile;
  transactions: Transaction[];
  accounts: Account[];
  investments: InvestmentPosition[];
  liabilities: Liability[];
  budgets: Budget[];
  goals: Goal[];
}

interface Rule {
  test: RegExp;
  answer: (ctx: CopilotContext, match: RegExpMatchArray) => string;
}

const rules: Rule[] = [
  {
    test: /patrimonio/i,
    answer: (ctx) => {
      const nw = computeNetWorth(ctx.accounts, ctx.investments, ctx.liabilities, ctx.profile.primaryCurrency);
      return `Tu patrimonio neto es ${formatCurrency(nw.netWorth, ctx.profile.primaryCurrency)} (activos ${formatCurrency(nw.assets, ctx.profile.primaryCurrency)} − pasivos ${formatCurrency(nw.liabilities, ctx.profile.primaryCurrency)}).`;
    },
  },
  {
    test: /(cu[aá]nto tengo invertido|total invertido|cu[aá]nto tengo en inversiones)/i,
    answer: (ctx) => {
      if (ctx.investments.length === 0) return 'Aún no tienes inversiones registradas.';
      const total = ctx.investments.reduce((s, i) => s + i.amountInvested, 0);
      return `Tienes ${formatCurrency(total, ctx.profile.primaryCurrency)} invertidos en ${ctx.investments.length} posición(es). El valor de mercado en vivo llega en la Fase 4.`;
    },
  },
  {
    test: /cu[aá]nto tengo en ([a-zA-Z]{2,10})/i,
    answer: (ctx, match) => {
      const ticker = match[1].toUpperCase();
      const pos = ctx.investments.find((i) => i.ticker.toUpperCase() === ticker);
      if (!pos) return `No encontré una posición con el ticker "${ticker}" en tus inversiones.`;
      return `En ${pos.name} (${pos.ticker}) tienes ${pos.quantity.toFixed(3)} unidades, con ${formatCurrency(pos.amountInvested, pos.currency)} invertidos a un precio promedio de ${formatCurrency(pos.avgCostPrice, pos.currency)}.`;
    },
  },
  {
    test: /(en qu[eé] gast[eé] m[aá]s|d[oó]nde se me (fue|va) el dinero)/i,
    answer: (ctx) => {
      const byCategory = spendByCategory(ctx.transactions);
      const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
      if (entries.length === 0) return 'Aún no tienes gastos registrados este mes.';
      const [topId, amount] = entries[0];
      const category = DEFAULT_CATEGORIES.find((c) => c.id === topId);
      return `Este mes tu categoría con más gasto es ${category?.name ?? topId}, con ${formatCurrency(amount, ctx.profile.primaryCurrency)}.`;
    },
  },
  {
    test: /(estoy gastando demasiado|c[oó]mo voy (este mes|con mi presupuesto)|categor[ií]as? .*fuera de presupuesto|excedid)/i,
    answer: (ctx) => {
      const lines = buildBudgetLines(ctx.budgets, ctx.transactions, ctx.profile.budgetThresholds);
      if (lines.length === 0) return 'Todavía no has definido un presupuesto, así que no puedo comparar tu gasto contra un límite.';
      const exceeded = lines.filter((l) => l.status === 'exceeded' || l.status === 'warning');
      if (exceeded.length === 0) return 'Vas bien: ninguna categoría está cerca de exceder su presupuesto este mes.';
      return `Estas categorías están en advertencia o excedidas: ${exceeded.map((l) => `${l.categoryName} (${l.percentUsed}%)`).join(', ')}.`;
    },
  },
  {
    test: /cu[aá]nto (llevo )?gastado en (\w+)/i,
    answer: (ctx, match) => {
      const term = match[2].toLowerCase();
      const category = DEFAULT_CATEGORIES.find((c) => c.name.toLowerCase().includes(term) || c.id.includes(term));
      if (!category) return `No reconozco la categoría "${match[2]}". Prueba con un nombre como "restaurantes" o "transporte".`;
      const byCategory = spendByCategory(ctx.transactions);
      const amount = byCategory[category.id] ?? 0;
      return `Llevas ${formatCurrency(amount, ctx.profile.primaryCurrency)} gastados en ${category.name} este mes.`;
    },
  },
  {
    test: /cu[aá]nto (dinero )?tengo disponible/i,
    answer: (ctx) => {
      const liquid = ctx.accounts.filter((a) => !a.isLiability).reduce((s, a) => s + a.balance, 0);
      return `Tienes ${formatCurrency(liquid, ctx.profile.primaryCurrency)} disponibles entre tus cuentas de efectivo y banco.`;
    },
  },
  {
    test: /(qu[eé] deuda|deuda deber[ií]a priorizar)/i,
    answer: (ctx) => {
      if (ctx.liabilities.length === 0) return 'No tienes deudas registradas.';
      const sorted = [...ctx.liabilities].sort((a, b) => (b.interestRate ?? 0) - (a.interestRate ?? 0));
      const top = sorted[0];
      return `Prioriza ${top.institution} (${formatCurrency(top.balance, top.currency)}${top.interestRate ? `, ${top.interestRate}% anual` : ''}) por ser la de mayor tasa de interés registrada.`;
    },
  },
  {
    test: /(salud financiera|qu[eé] tan bien voy)/i,
    answer: (ctx) => {
      const nw = computeNetWorth(ctx.accounts, ctx.investments, ctx.liabilities, ctx.profile.primaryCurrency);
      const emergencyFund = ctx.accounts.filter((a) => a.type === 'savings').reduce((s, a) => s + a.balance, 0);
      const monthlySpend = spendInPeriod(ctx.transactions) || 1;
      const lines = buildBudgetLines(ctx.budgets, ctx.transactions, ctx.profile.budgetThresholds);
      const health = computeFinancialHealth({ netWorth: nw, emergencyFundBalance: emergencyFund, monthlySpend, budgetLines: lines });
      return `Tu salud financiera es ${health.score}/100 (${health.label}). ${health.suggestions[0] ?? ''}`;
    },
  },
  {
    test: /cu[aá]nto podr[ií]a ahorrar/i,
    answer: (ctx) => {
      const income = ctx.transactions.filter((t) => t.type === 'income' && sameMonth(t.date)).reduce((s, t) => s + t.amount, 0);
      const spend = spendInPeriod(ctx.transactions);
      if (income === 0) return 'Aún no tengo suficientes ingresos registrados este mes para estimar tu capacidad de ahorro.';
      const diff = income - spend;
      return diff > 0
        ? `Con tus ingresos y gastos de este mes, te quedan ${formatCurrency(diff, ctx.profile.primaryCurrency)} disponibles para ahorrar.`
        : `Este mes tus gastos (${formatCurrency(spend, ctx.profile.primaryCurrency)}) superan tus ingresos registrados (${formatCurrency(income, ctx.profile.primaryCurrency)}).`;
    },
  },
];

function sameMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function answerQuestion(question: string, ctx: CopilotContext): string {
  for (const rule of rules) {
    const match = question.match(rule.test);
    if (match) return rule.answer(ctx, match);
  }
  return 'Todavía no tengo una respuesta precisa para eso con los datos disponibles. En la Fase 3, VALU se conecta a un modelo de lenguaje completo para entender preguntas libres — por ahora funciono mejor con preguntas sobre tu patrimonio, gastos, presupuesto e inversiones.';
}

export const SUGGESTED_QUESTIONS = [
  '¿Cómo voy este mes?',
  '¿En qué gasté más este mes?',
  '¿Cuál es mi patrimonio?',
  '¿Cuánto tengo invertido?',
  '¿Qué deuda debería priorizar?',
  '¿Cuánto podría ahorrar?',
];

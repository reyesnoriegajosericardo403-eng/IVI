// Arma el contexto de validación (el que usan todos los resolvers del catálogo) a partir del contexto del agente. Un solo
// lugar para el agente local y el de IA, así un dato nuevo (previstos, pagos recurrentes, avisos...) no se les olvida a uno.
import type { Reminder, RecurringRule, Transaction } from '@/data/types';
import type { ActionAgentContext } from '@/providers/types';

import type { ActionValidationContext } from './catalogCommon';

export function buildValidationContext(ctx: ActionAgentContext): ActionValidationContext {
  return {
    accounts: ctx.accounts,
    goals: ctx.goals,
    liabilities: ctx.liabilities,
    templateBudgetLines: ctx.templateBudgetLines,
    recentTransactions: ctx.transactions.slice(0, 20),
    primaryCurrency: ctx.profile.primaryCurrency,
    investments: ctx.investments,
    forecasts: (ctx.forecasts ?? []) as Transaction[],
    recurringRules: (ctx.recurringRules ?? []) as RecurringRule[],
    reminders: (ctx.reminders ?? []) as Reminder[],
  };
}

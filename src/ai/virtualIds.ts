// Ids "virtuales" para planes (P3): "crea la cuenta Nu y transfiere 500 de BBVA a Nu". Al armar el plan la cuenta Nu todavía
// no existe, pero el segundo paso debe poder referirse a ella. Se resuelve así:
//  1. Al ARMAR el plan, tras cada paso se simula lo que crea / cambia (simulateStep) y el siguiente paso se valida contra esa
//     copia: la cuenta nueva aparece con id `virtual:account:nu`.
//  2. Al APLICAR el plan, tras crear de verdad la cuenta se anota virtual → real, y antes de cada paso se sustituyen los
//     ids virtuales de sus argumentos (substituteVirtualIds). Si falta el real (el paso que lo creaba falló) el paso no corre.
// El id virtual sale del TIPO y del NOMBRE (no de la posición), así no se descuadra si el plan cambia de orden o se le agrega
// un paso tras una aclaración. Puro: sin red ni estado.
import type { Account, Goal, Liability } from '@/data/types';

import type { ActionValidationContext } from './catalogCommon';
import type { AIActionType } from './chatTypes';

export const VIRTUAL_PREFIX = 'virtual:';
export const isVirtualId = (id: unknown): id is string => typeof id === 'string' && id.startsWith(VIRTUAL_PREFIX);

const norm = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

export type VirtualKind = 'account' | 'goal' | 'liability';

export function virtualKindOf(type: AIActionType | string): VirtualKind | null {
  return type === 'add_account' ? 'account' : type === 'add_goal' ? 'goal' : type === 'add_liability' ? 'liability' : null;
}

// El id virtual de lo que crea este paso (o null si el paso no crea nada referible).
export function virtualIdFor(type: AIActionType | string, args: Record<string, unknown>): string | null {
  const kind = virtualKindOf(type);
  if (!kind) return null;
  const name = kind === 'liability' ? args.institution : args.name;
  return typeof name === 'string' && name.trim() ? `${VIRTUAL_PREFIX}${kind}:${norm(name)}` : null;
}

// Sustituye, en cualquier parte de los argumentos, los ids virtuales por los reales. `unresolved` lista los que no se pudieron.
export function substituteVirtualIds<T>(args: T, map: Record<string, string>): { args: T; unresolved: string[] } {
  const unresolved: string[] = [];
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      if (!isVirtualId(v)) return v;
      const real = map[v];
      if (!real) {
        unresolved.push(v);
        return v;
      }
      return real;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return { args: walk(args) as T, unresolved };
}

export const hasVirtualIds = (args: unknown): boolean => JSON.stringify(args ?? null).includes(`"${VIRTUAL_PREFIX}`);

const NOW = '1970-01-01T00:00:00.000Z';
const base = (id: string) => ({ id, createdAt: NOW, updatedAt: NOW });

// Copia del contexto con lo que ESTE paso dejaría hecho (solo lo que sirve para validar los siguientes pasos).
export function simulateStep(ctx: ActionValidationContext, type: AIActionType | string, args: Record<string, any>): ActionValidationContext {
  const vid = virtualIdFor(type, args);
  switch (type) {
    case 'add_account':
      if (!vid) return ctx;
      return { ...ctx, accounts: [...ctx.accounts, { ...base(vid), name: args.name, type: args.accountType, currency: args.currency, balance: args.balance ?? 0 } as Account] };
    case 'add_goal':
      if (!vid) return ctx;
      return { ...ctx, goals: [...ctx.goals, { ...base(vid), name: args.name, targetAmount: args.targetAmount, currentAmount: 0, currency: args.currency, targetDate: args.targetDate } as Goal] };
    case 'add_liability':
      if (!vid) return ctx;
      return { ...ctx, liabilities: [...ctx.liabilities, { ...base(vid), institution: args.institution, type: args.liabilityType, balance: args.balance, currency: args.currency } as Liability] };
    case 'delete_account':
      return { ...ctx, accounts: ctx.accounts.map((a) => (a.id === args.accountId ? { ...a, deletedAt: NOW } : a)) };
    case 'delete_goal':
      return { ...ctx, goals: ctx.goals.map((g) => (g.id === args.goalId ? { ...g, deletedAt: NOW } : g)) };
    case 'delete_liability':
      return { ...ctx, liabilities: ctx.liabilities.map((l) => (l.id === args.liabilityId ? { ...l, deletedAt: NOW } : l)) };
    case 'contribute_to_goal':
      return { ...ctx, goals: ctx.goals.map((g) => (g.id === args.goalId ? { ...g, currentAmount: g.currentAmount + args.amount } : g)) };
    case 'withdraw_from_goal':
      return { ...ctx, goals: ctx.goals.map((g) => (g.id === args.goalId ? { ...g, currentAmount: g.currentAmount - args.amount } : g)) };
    case 'update_liability_balance':
      return { ...ctx, liabilities: ctx.liabilities.map((l) => (l.id === args.liabilityId ? { ...l, balance: args.balance } : l)) };
    case 'pay_liability':
      return { ...ctx, liabilities: ctx.liabilities.map((l) => (l.id === args.liabilityId ? { ...l, balance: Math.max(0, Math.round((l.balance - args.amount) * 100) / 100), ...(l.balance - args.amount <= 0.005 ? { status: 'settled' as const } : {}) } : l)) };
    case 'settle_liability':
      return { ...ctx, liabilities: ctx.liabilities.map((l) => (l.id === args.liabilityId ? { ...l, balance: 0, status: 'settled' as const } : l)) };
    case 'confirm_forecast':
    case 'skip_forecast':
      return { ...ctx, forecasts: (ctx.forecasts ?? []).filter((t) => t.id !== args.forecastId) };
    case 'pause_recurring':
      return { ...ctx, recurringRules: (ctx.recurringRules ?? []).map((r) => (r.id === args.ruleId ? { ...r, status: 'paused' as const } : r)) };
    case 'resume_recurring':
      return { ...ctx, recurringRules: (ctx.recurringRules ?? []).map((r) => (r.id === args.ruleId ? { ...r, status: 'active' as const } : r)) };
    case 'end_recurring':
      return { ...ctx, recurringRules: (ctx.recurringRules ?? []).map((r) => (r.id === args.ruleId ? { ...r, status: 'ended' as const } : r)) };
    case 'cancel_reminder':
      return { ...ctx, reminders: (ctx.reminders ?? []).map((r) => (r.id === args.reminderId ? { ...r, status: 'cancelled' as const } : r)) };
    default:
      return ctx;
  }
}

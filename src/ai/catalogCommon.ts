// Piezas compartidas por el catálogo de acciones (actionCatalog.ts) y el de P3 (actionCatalogP3.ts): el contexto de
// validación, el resultado de resolver, las preguntas de datos faltantes y validadores de montos/fechas/textos.
// Viven aparte para que los dos catálogos las usen sin importarse en círculo.
import type { Account, Currency, Goal, InvestmentPosition, Liability, RecurringRule, Reminder, TemplateBudgetLine, Transaction } from '@/data/types';
import { todayISO } from '@/utils/date';

import type { AIActionType, MissingField, ResolvedAction } from './chatTypes';
import { normalize } from './localParser';

export interface ActionValidationContext {
  accounts: Account[];
  goals: Goal[];
  liabilities: Liability[];
  templateBudgetLines: TemplateBudgetLine[];
  // Ya recortadas por quien arma el contexto (mismo recorte de 20 que usa
  // financialContext.ts) — nunca la lista completa.
  recentTransactions: Transaction[];
  primaryCurrency: Currency;
  // Hoy (AAAA-MM-DD) para validar fechas; solo las pruebas lo fijan, en la app es el día del dispositivo.
  today?: string;
  // ---- P3 (opcionales: los contextos de antes siguen valiendo) ----
  investments?: InvestmentPosition[];
  forecasts?: Transaction[]; // movimientos previstos abiertos
  recurringRules?: RecurringRule[];
  reminders?: Reminder[];
}

export interface ResolveOk {
  ok: true;
  action: ResolvedAction;
  summary: string;
}
export interface ResolveErr {
  ok: false;
  reason: string;
  // Cuando lo que falta es UN dato que la persona puede contestar en una frase (monto, a qué cuenta...), aquí
  // va lo necesario para preguntarlo y reintentar el mismo resolver con la respuesta (contrato §2).
  clarification?: { type: AIActionType; candidate: Record<string, unknown>; missing: MissingField[] };
}
export type ResolveResult = ResolveOk | ResolveErr;

// ---------- Datos faltantes: pregunta + candidato para reintentar (contrato §2) ----------

export function ask(type: AIActionType, candidate: object, missing: MissingField[]): ResolveErr {
  return {
    ok: false,
    reason: missing.map((m) => m.prompt).join(' '),
    clarification: { type, candidate: { ...(candidate as Record<string, unknown>) }, missing },
  };
}

export const askAmount = (slot: string, prompt: string): MissingField => ({ field: 'amount', slot, prompt });
export const askName = (slot: string, prompt: string): MissingField => ({ field: 'name', slot, prompt });

export function listNames(names: string[]): string {
  const clean = names.filter(Boolean).slice(0, 8);
  return clean.length ? ` (tienes: ${clean.join(', ')})` : '';
}
export const askAccount = (slot: string, hint: string, ctx: ActionValidationContext, label = 'cuenta'): MissingField => ({
  field: 'account',
  slot,
  prompt: hint.trim()
    ? `No encontré ninguna ${label} que se llame "${hint.trim()}". ¿Cuál es?${listNames(ctx.accounts.filter((a) => !a.deletedAt).map((a) => a.name))}`
    : `¿En qué ${label}? Dime el nombre${listNames(ctx.accounts.filter((a) => !a.deletedAt).map((a) => a.name))}.`,
});
export const askGoal = (hint: string, ctx: ActionValidationContext): MissingField => ({
  field: 'goal',
  slot: 'goalNameHint',
  prompt: `No encontré ninguna meta que se llame "${hint}". ¿Cuál es?${listNames(ctx.goals.filter((g) => !g.deletedAt).map((g) => g.name))}`,
});
export const askLiability = (hint: string, ctx: ActionValidationContext): MissingField => ({
  field: 'liability',
  slot: 'institutionHint',
  prompt: `No encontré ninguna deuda con "${hint}". ¿Cuál es?${listNames(ctx.liabilities.filter((l) => !l.deletedAt).map((l) => l.institution))}`,
});

// ---------- Fechas ----------

// Fecha AAAA-MM-DD válida (acepta también un timestamp ISO) o null.
export function dateOnly(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
export const todayOf = (ctx: ActionValidationContext): string => ctx.today ?? todayISO();
export const askDate = (slot: string, prompt: string): MissingField => ({ field: 'date', slot, prompt });

export function positiveAmount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function finiteAmount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}


export function resolveCurrency(hint: unknown, fallback: Currency): Currency {
  const upper = cleanString(hint).toUpperCase();
  return (['MXN', 'USD', 'EUR', 'CAD', 'GBP'] as string[]).includes(upper) ? (upper as Currency) : fallback;
}


export function activeAccounts(ctx: ActionValidationContext) {
  return ctx.accounts.filter((a) => !a.deletedAt);
}

// Cuenta nombrada dentro del trozo (la de nombre más largo que aparezca); si no se nombra ninguna y solo hay
// una cuenta normal, esa; si no, '' (y el resolver preguntará).
export function accountHintFor(normalized: string, ctx: ActionValidationContext): string {
  const accounts = activeAccounts(ctx);
  const named = accounts
    .map((a) => ({ a, n: normalize(a.name) }))
    .filter(({ n }) => n.length >= 2 && ` ${normalized} `.includes(` ${n} `))
    .sort((x, y) => y.n.length - x.n.length)[0];
  if (named) return named.a.name;
  if (/\befectivo\b/.test(normalized)) return 'efectivo';
  const spendable = accounts.filter((a) => a.type !== 'credit_card' && !a.isLiability);
  return spendable.length === 1 ? spendable[0].name : '';
}


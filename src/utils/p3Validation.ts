// Validación (pura) de reglas recurrentes y avisos ANTES de guardarlos: la usan el store, la pantalla y el chat, así hay una sola
// definición de "qué es válido". Devuelve un mensaje en español (para mostrar tal cual) o null si está bien.
import type { Account, Goal, RecurringRule, Reminder } from '@/data/types';

import { validTimeOfDay } from './materialize';
import { validateRecurrence } from './recurrence';

export type RuleDraft = Pick<RecurringRule, 'kind' | 'name' | 'amount' | 'currency' | 'recurrence'> &
  Partial<Pick<RecurringRule, 'txType' | 'categoryId' | 'subcategoryId' | 'merchant' | 'accountId' | 'toAccountId' | 'goalId' | 'notes'>>;

export function validateRuleDraft(d: RuleDraft, ctx: { accounts: Account[]; goals: Goal[] }): string | null {
  if (!d.name || d.name.trim().length < 2) return 'Ponle un nombre a la regla (por ejemplo "Renta").';
  if (d.name.trim().length > 80) return 'El nombre es demasiado largo (máximo 80 letras).';
  if (typeof d.amount !== 'number' || !Number.isFinite(d.amount) || d.amount <= 0) return 'El monto debe ser un número mayor que cero.';
  const rec = validateRecurrence(d.recurrence);
  if (rec) return rec;
  const live = ctx.accounts.filter((a) => !a.deletedAt);
  if (d.kind === 'goal_contribution') {
    if (!d.goalId || !ctx.goals.some((g) => g.id === d.goalId && !g.deletedAt)) return 'Elige una meta que exista.';
    return null;
  }
  if (!d.txType || !['expense', 'income', 'transfer', 'saving'].includes(d.txType)) return 'Dime si es un gasto, un ingreso, una transferencia o un ahorro.';
  if (!d.accountId || !live.some((a) => a.id === d.accountId)) return 'Elige la cuenta (tiene que existir).';
  if (d.txType === 'transfer') {
    if (!d.toAccountId || !live.some((a) => a.id === d.toAccountId)) return 'Elige la cuenta destino de la transferencia.';
    if (d.toAccountId === d.accountId) return 'La cuenta de origen y la de destino no pueden ser la misma.';
    const from = live.find((a) => a.id === d.accountId)!;
    const to = live.find((a) => a.id === d.toAccountId)!;
    if (from.currency !== to.currency) return 'Las dos cuentas usan monedas distintas; todavía no puedo convertir entre ellas.';
  }
  return null;
}

export type ReminderDraft = Pick<Reminder, 'title'> &
  Partial<Pick<Reminder, 'kind' | 'note' | 'sourceType' | 'sourceId' | 'recurrence' | 'date' | 'timeOfDay' | 'advanceDays' | 'maxAttempts' | 'attemptIntervalMinutes' | 'push'>>;

export function validateReminderDraft(d: ReminderDraft): string | null {
  const title = (d.title ?? '').trim();
  if (title.length < 2) return 'Dime de qué quieres que te avise.';
  if (title.length > 80) return 'El título es demasiado largo (máximo 80 letras).';
  if (d.recurrence) {
    const e = validateRecurrence(d.recurrence);
    if (e) return e;
  } else if (!d.date) {
    if (d.sourceType !== 'rule') return 'Dime para qué fecha es el aviso.';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
    return 'La fecha del aviso no es válida.';
  }
  if (d.timeOfDay !== undefined && !validTimeOfDay(d.timeOfDay)) return 'La hora debe ser como 09:00 (de 00:00 a 23:59).';
  if (d.maxAttempts !== undefined && (!Number.isInteger(d.maxAttempts) || d.maxAttempts < 1 || d.maxAttempts > 3)) return 'Los intentos deben ser 1, 2 o 3.';
  if (d.attemptIntervalMinutes !== undefined && (!Number.isInteger(d.attemptIntervalMinutes) || d.attemptIntervalMinutes < 60 || d.attemptIntervalMinutes > 1440)) return 'El tiempo entre intentos debe ir de 1 a 24 horas.';
  if (d.advanceDays !== undefined && (d.advanceDays.length > 5 || d.advanceDays.some((n) => !Number.isInteger(n) || n < 1 || n > 60))) return 'Los avisos previos son hasta 5 y cada uno de 1 a 60 días antes.';
  return null;
}

// Normaliza un borrador de aviso con los valores por defecto (los mismos en toda la app).
export const REMINDER_DEFAULTS = { timeOfDay: '09:00', maxAttempts: 1, attemptIntervalMinutes: 120, push: true } as const;

export function normalizeAdvanceDays(days: number[] | undefined): number[] {
  return [...new Set((days ?? []).filter((n) => Number.isInteger(n) && n >= 1 && n <= 60))].sort((a, b) => b - a).slice(0, 5);
}

// El servidor corre cada hora: un intervalo entre intentos solo puede ser múltiplo de 60 minutos.
export function normalizeIntervalMinutes(minutes: number | undefined): number {
  const m = Number.isFinite(minutes as number) ? (minutes as number) : REMINDER_DEFAULTS.attemptIntervalMinutes;
  return Math.max(60, Math.min(1440, Math.round(m / 60) * 60));
}

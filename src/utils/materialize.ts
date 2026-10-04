// Generación (P3) de movimientos PREVISTOS a partir de reglas recurrentes, y de ocurrencias de avisos a partir de series.
// Todo PURO: recibe los registros que ya existen y devuelve lo que falta crear/cambiar; el store solo lo aplica.
//
// Garantías que importan:
//  - IDEMPOTENTE: correrlo dos veces (o en dos dispositivos) no duplica nada, porque cada previsto/ocurrencia tiene un id
//    determinista (regla + fecha). Si el registro ya existe —aunque esté confirmado, omitido o borrado— no se vuelve a crear.
//  - Un previsto es 'forecast': nunca mueve saldos (ver ledger.ts).
//  - Reglas en pausa o terminadas no generan nada.
import type { RecurringRule, Reminder, ReminderOccurrence, Transaction } from '@/data/types';

import { deterministicId } from './deterministicId';
import { noonIso } from './forecast';
import { addDaysIso, isoOf, nextOccurrence, occurrencesBetween, parseYmd, type Recurrence } from './recurrence';

export const FORECAST_HORIZON_DAYS = 90; // previstos de movimientos: 3 meses por delante
export const REMINDER_HORIZON_DAYS = 180; // avisos: 6 meses (un aviso que se pasa de largo es el error más caro)
export const STALE_PUSH_HOURS = 48; // una ocurrencia más vieja que esto ya no se manda por push (solo queda visible en la app)

export const forecastIdFor = (ruleId: string, dateIso: string): string => deterministicId('forecast', ruleId, dateIso);
export const occurrenceIdFor = (reminderId: string, eventDate: string, offsetDays: number): string => deterministicId('occurrence', reminderId, eventDate, String(offsetDays));

const dateOfIso = (iso: string): string => iso.slice(0, 10);

// ---------- Previstos de una regla ----------

const DEFAULT_CATEGORY: Record<string, [string, string]> = {
  expense: ['miscellaneous', 'misc_other'],
  income: ['income', 'inc_other'],
  transfer: ['transfer', 'transfer_own'],
  saving: ['savings', 'sav_other'],
};

// El previsto que corresponde a la regla en una fecha. Mediodía local en `date`.
export function buildForecast(rule: RecurringRule, dateIso: string, nowIso: string): Transaction {
  const type = rule.txType ?? 'expense';
  const [defCat, defSub] = DEFAULT_CATEGORY[type] ?? DEFAULT_CATEGORY.expense;
  return {
    id: forecastIdFor(rule.id, dateIso),
    type,
    amount: rule.amount,
    currency: rule.currency,
    categoryId: rule.categoryId || defCat,
    subcategoryId: rule.subcategoryId || defSub,
    merchant: rule.merchant ?? rule.name,
    accountId: rule.accountId,
    toAccountId: rule.toAccountId,
    date: noonIso(dateIso),
    plannedDate: noonIso(dateIso),
    notes: `Recurrente: ${rule.name}`,
    origin: 'automatic',
    status: 'forecast',
    recurringRuleId: rule.id,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export interface RuleGeneration {
  forecasts: Transaction[];
  generatedUntil: string | undefined; // el nuevo `generatedUntil` de la regla (undefined = no cambia)
}

// Los previstos que le faltan a una regla activa de tipo 'transaction' hasta `todayIso + horizonDays`.
// `existingIds` = TODOS los ids de movimientos que ya existen (cualquier estado, incluso borrados): nunca se recrea uno.
export function planRuleForecasts(rule: RecurringRule, existingIds: Set<string>, todayIso: string, nowIso: string, horizonDays = FORECAST_HORIZON_DAYS): RuleGeneration {
  if (rule.deletedAt || rule.status !== 'active' || rule.kind !== 'transaction') return { forecasts: [], generatedUntil: undefined };
  const to = addDaysIso(todayIso, horizonDays);
  const createdDay = dateOfIso(rule.createdAt);
  const from = rule.generatedUntil ? addDaysIso(rule.generatedUntil, 1) : rule.recurrence.startDate > createdDay ? rule.recurrence.startDate : createdDay;
  if (from > to) return { forecasts: [], generatedUntil: rule.generatedUntil };
  const forecasts: Transaction[] = [];
  for (const d of occurrencesBetween(rule.recurrence, from, to)) {
    if (!existingIds.has(forecastIdFor(rule.id, d))) forecasts.push(buildForecast(rule, d, nowIso));
  }
  return { forecasts, generatedUntil: to };
}

export interface ForecastPatch {
  id: string;
  patch: Partial<Transaction>;
}

// Después de EDITAR una regla (monto, cuenta, día…): reconcilia los previstos futuros con lo que la regla genera ahora.
//  - los que ya no corresponden a ninguna fecha de la regla se borran (suave);
//  - los que sí corresponden se actualizan con la plantilla nueva (si siguen siendo previstos);
//  - los que faltan se crean (o se revive uno que se había borrado por una edición anterior).
// Los ya confirmados ('posted') u omitidos ('skipped') no se tocan jamás.
export function reconcileRuleForecasts(
  rule: RecurringRule,
  transactions: Transaction[],
  todayIso: string,
  nowIso: string,
  horizonDays = FORECAST_HORIZON_DAYS
): { create: Transaction[]; update: ForecastPatch[]; remove: string[] } {
  const own = transactions.filter((t) => t.recurringRuleId === rule.id);
  const byId = new Map(own.map((t) => [t.id, t]));
  const to = addDaysIso(todayIso, horizonDays);
  const desired = rule.status === 'active' && rule.kind === 'transaction' && !rule.deletedAt ? occurrencesBetween(rule.recurrence, todayIso, to) : [];
  const desiredIds = new Set(desired.map((d) => forecastIdFor(rule.id, d)));
  const create: Transaction[] = [];
  const update: ForecastPatch[] = [];
  const remove: string[] = [];

  for (const t of own) {
    const isFutureForecast = t.status === 'forecast' && !t.deletedAt && dateOfIso(t.date) >= todayIso;
    if (isFutureForecast && !desiredIds.has(t.id)) remove.push(t.id);
  }
  for (const d of desired) {
    const id = forecastIdFor(rule.id, d);
    const existing = byId.get(id);
    const fresh = buildForecast(rule, d, nowIso);
    if (!existing) {
      create.push(fresh);
    } else if (existing.status === 'forecast') {
      const patch: Partial<Transaction> = {};
      for (const k of ['type', 'amount', 'currency', 'categoryId', 'subcategoryId', 'merchant', 'accountId', 'toAccountId', 'notes'] as const) {
        if (existing[k] !== fresh[k]) (patch as Record<string, unknown>)[k] = fresh[k];
      }
      if (existing.deletedAt) patch.deletedAt = undefined; // se había borrado por una edición anterior: se revive
      if (Object.keys(patch).length) update.push({ id, patch });
    }
  }
  return { create, update, remove };
}

// Pausar: los previstos de hoy en adelante pasan a 'paused' (no cuentan ni se avisan). No se borran: al reanudar vuelven.
export function forecastsToPause(transactions: Transaction[], ruleId: string, todayIso: string): string[] {
  return transactions.filter((t) => t.recurringRuleId === ruleId && !t.deletedAt && t.status === 'forecast' && dateOfIso(t.date) >= todayIso).map((t) => t.id);
}

// Reanudar: los pausados de hoy en adelante vuelven a 'forecast'; los de fechas que ya pasaron durante la pausa se omiten.
export function forecastsToResume(transactions: Transaction[], ruleId: string, todayIso: string): { reopen: string[]; skip: string[] } {
  const paused = transactions.filter((t) => t.recurringRuleId === ruleId && !t.deletedAt && t.status === 'paused');
  return {
    reopen: paused.filter((t) => dateOfIso(t.date) >= todayIso).map((t) => t.id),
    skip: paused.filter((t) => dateOfIso(t.date) < todayIso).map((t) => t.id),
  };
}

// ---------- Ocurrencias de avisos ----------

// "2026-10-05" + "09:00" → instante ISO en la hora LOCAL del dispositivo.
export function localInstant(dateIso: string, timeOfDay: string): string {
  const p = parseYmd(dateIso);
  const m = /^(\d{1,2}):(\d{2})$/.exec(timeOfDay);
  if (!p || !m) return new Date(NaN).toISOString();
  return new Date(p.y, p.m - 1, p.d, Math.min(23, +m[1]), Math.min(59, +m[2]), 0).toISOString();
}

export function validTimeOfDay(s: string): boolean {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  return !!m && +m[1] <= 23 && +m[2] <= 59;
}

// Fechas del evento de una serie: si viene de una regla, las de la regla; si tiene su propia recurrencia, esas; si es de
// una sola vez, la fecha.
export function eventDatesFor(reminder: Reminder, rules: Map<string, RecurringRule>, fromIso: string, toIso: string): string[] {
  if (reminder.sourceType === 'rule' && reminder.sourceId) {
    const rule = rules.get(reminder.sourceId);
    if (!rule || rule.deletedAt || rule.status !== 'active') return [];
    return occurrencesBetween(rule.recurrence, fromIso, toIso);
  }
  if (reminder.recurrence) return occurrencesBetween(reminder.recurrence, fromIso, toIso);
  if (reminder.date && reminder.date >= fromIso && reminder.date <= toIso) return [reminder.date];
  return [];
}

export function buildOccurrence(reminder: Reminder, eventDate: string, offsetDays: number, nowIso: string): ReminderOccurrence {
  const scheduledFor = localInstant(addDaysIso(eventDate, -offsetDays), reminder.timeOfDay);
  const stale = new Date(scheduledFor).getTime() < new Date(nowIso).getTime() - STALE_PUSH_HOURS * 3600_000;
  return {
    id: occurrenceIdFor(reminder.id, eventDate, offsetDays),
    reminderId: reminder.id,
    eventDate,
    offsetDays,
    scheduledFor,
    status: 'pending',
    attemptsMade: 0,
    // los avisos previos ("faltan 3 días") suenan UNA vez; solo el del día reintenta
    maxAttempts: offsetDays === 0 ? Math.max(1, Math.min(3, reminder.maxAttempts)) : 1,
    attemptIntervalMinutes: reminder.attemptIntervalMinutes,
    nextAttemptAt: reminder.push && !stale ? scheduledFor : undefined,
    title: reminder.title,
    push: reminder.push,
    sourceType: reminder.sourceType,
    sourceId: reminder.sourceId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export interface ReminderGeneration {
  occurrences: ReminderOccurrence[];
  generatedUntil: string | undefined;
}

// Las ocurrencias que le faltan a una serie activa hasta `todayIso + horizonDays`.
// Las de aviso PREVIO cuyo momento ya pasó no se crean (sería avisar tarde "faltan 3 días"); la del día sí, aunque ya haya
// pasado, para que quede "por confirmar" en la app.
export function planReminderOccurrences(
  reminder: Reminder,
  rules: Map<string, RecurringRule>,
  existingIds: Set<string>,
  todayIso: string,
  nowIso: string,
  horizonDays = REMINDER_HORIZON_DAYS
): ReminderGeneration {
  if (reminder.deletedAt || reminder.status !== 'active') return { occurrences: [], generatedUntil: undefined };
  const to = addDaysIso(todayIso, horizonDays);
  const createdDay = dateOfIso(reminder.createdAt);
  // Un aviso de UNA sola vez se genera siempre (aunque su fecha esté más allá del horizonte): perder uno es peor que tener una fila de más.
  const oneTime = !reminder.recurrence && reminder.sourceType !== 'rule';
  const from = reminder.generatedUntil ? addDaysIso(reminder.generatedUntil, 1) : createdDay;
  const upper = oneTime && reminder.date && reminder.date > to ? reminder.date : to;
  if (from > upper) return { occurrences: [], generatedUntil: reminder.generatedUntil };
  const maxAdvance = Math.max(0, ...reminder.advanceDays);
  const nowMs = new Date(nowIso).getTime();
  const out: ReminderOccurrence[] = [];
  const seen = new Set<string>();
  for (const eventDate of eventDatesFor(reminder, rules, from, addDaysIso(upper, maxAdvance))) {
    const offsets = [...new Set([...reminder.advanceDays.filter((n) => n > 0 && n <= 60), 0])].sort((a, b) => b - a);
    for (const offset of offsets) {
      const id = occurrenceIdFor(reminder.id, eventDate, offset);
      if (existingIds.has(id) || seen.has(id)) continue;
      const occ = buildOccurrence(reminder, eventDate, offset, nowIso);
      if (offset > 0 && new Date(occ.scheduledFor).getTime() < nowMs) continue; // aviso previo que ya no tiene sentido
      seen.add(id);
      out.push(occ);
    }
  }
  return { occurrences: out, generatedUntil: upper };
}

// Pausar una serie: sus ocurrencias futuras vigentes pasan a 'paused'. Reanudar: las de hoy en adelante vuelven a 'pending'
// y las que ya pasaron se omiten.
const OPEN: ReminderOccurrence['status'][] = ['pending', 'sent'];
export function occurrencesToPause(occurrences: ReminderOccurrence[], reminderId: string, todayIso: string): string[] {
  return occurrences.filter((o) => o.reminderId === reminderId && !o.deletedAt && OPEN.includes(o.status) && o.eventDate >= todayIso).map((o) => o.id);
}
export function occurrencesToResume(occurrences: ReminderOccurrence[], reminderId: string, todayIso: string): { reopen: string[]; skip: string[] } {
  const paused = occurrences.filter((o) => o.reminderId === reminderId && !o.deletedAt && o.status === 'paused');
  return { reopen: paused.filter((o) => o.eventDate >= todayIso).map((o) => o.id), skip: paused.filter((o) => o.eventDate < todayIso).map((o) => o.id) };
}

// Al cambiar el horario/fechas de una serie: las ocurrencias futuras que siguen abiertas y ya no corresponden se cancelan y se
// regeneran las nuevas. Devuelve los ids a cancelar (la regeneración usa planReminderOccurrences con generatedUntil reiniciado).
export function futureOpenOccurrenceIds(occurrences: ReminderOccurrence[], reminderId: string, todayIso: string): string[] {
  return occurrences.filter((o) => o.reminderId === reminderId && !o.deletedAt && OPEN.includes(o.status) && o.eventDate >= todayIso).map((o) => o.id);
}

// Después de EDITAR una serie (hora, fechas, avisos previos, intentos, título, push) o la regla de la que depende:
// reconcilia sus ocurrencias futuras con lo que la serie genera AHORA.
//  - abiertas que ya no corresponden → se cancelan;
//  - abiertas que siguen → se actualizan (hora, título, intentos…) sin tocar las que ya empezaron a reintentarse;
//  - canceladas que vuelven a corresponder → se reviven;
//  - las que faltan → se crean.
// Las ya atendidas (confirmadas, omitidas…) no se tocan jamás.
export function reconcileReminderOccurrences(
  reminder: Reminder,
  rules: Map<string, RecurringRule>,
  occurrences: ReminderOccurrence[],
  todayIso: string,
  nowIso: string,
  horizonDays = REMINDER_HORIZON_DAYS
): { create: ReminderOccurrence[]; cancel: string[]; update: Array<{ id: string; patch: Partial<ReminderOccurrence> }>; revive: Array<{ id: string; patch: Partial<ReminderOccurrence> }> } {
  const own = occurrences.filter((o) => o.reminderId === reminder.id && !o.deletedAt);
  const byId = new Map(own.map((o) => [o.id, o]));
  const nowMs = new Date(nowIso).getTime();
  const desired = new Map<string, ReminderOccurrence>();
  if (!reminder.deletedAt && reminder.status === 'active') {
    const to = addDaysIso(todayIso, horizonDays);
    const oneTime = !reminder.recurrence && reminder.sourceType !== 'rule';
    const upper = oneTime && reminder.date && reminder.date > to ? reminder.date : to;
    const maxAdvance = Math.max(0, ...reminder.advanceDays);
    const offsets = [...new Set([...reminder.advanceDays.filter((n) => n > 0 && n <= 60), 0])].sort((a, b) => b - a);
    for (const eventDate of eventDatesFor(reminder, rules, todayIso, addDaysIso(upper, maxAdvance))) {
      for (const offset of offsets) {
        const occ = buildOccurrence(reminder, eventDate, offset, nowIso);
        if (offset > 0 && new Date(occ.scheduledFor).getTime() < nowMs && !byId.has(occ.id)) continue;
        desired.set(occ.id, occ);
      }
    }
  }
  const create: ReminderOccurrence[] = [];
  const cancel: string[] = [];
  const update: Array<{ id: string; patch: Partial<ReminderOccurrence> }> = [];
  const revive: Array<{ id: string; patch: Partial<ReminderOccurrence> }> = [];

  for (const o of own) {
    if (OPEN.includes(o.status) && o.eventDate >= todayIso && !desired.has(o.id)) cancel.push(o.id);
  }
  for (const [id, want] of desired) {
    const have = byId.get(id);
    if (!have) {
      create.push(want);
      continue;
    }
    const fields: Partial<ReminderOccurrence> = {};
    if (have.title !== want.title) fields.title = want.title;
    if (have.push !== want.push) fields.push = want.push;
    if (have.maxAttempts !== want.maxAttempts) fields.maxAttempts = want.maxAttempts;
    if (have.attemptIntervalMinutes !== want.attemptIntervalMinutes) fields.attemptIntervalMinutes = want.attemptIntervalMinutes;
    if (have.status === 'cancelled') {
      revive.push({ id, patch: { ...fields, status: 'pending', scheduledFor: want.scheduledFor, nextAttemptAt: want.nextAttemptAt, attemptsMade: 0, resolvedAt: undefined } });
    } else if (OPEN.includes(have.status)) {
      // no se mueve la hora de una ocurrencia que ya empezó a reintentarse (o que se pospuso a propósito)
      if (have.attemptsMade === 0 && !have.postponedCount && have.scheduledFor !== want.scheduledFor) {
        fields.scheduledFor = want.scheduledFor;
        fields.nextAttemptAt = want.nextAttemptAt;
      }
      if (Object.keys(fields).length) update.push({ id, patch: fields });
    }
  }
  return { create, cancel, update, revive };
}

// ---------- Utilidades de lectura ----------

// Ocurrencias que ya deben mostrarse como "por atender": su momento llegó y siguen abiertas (solo las del día del evento o
// avisos previos cuyo momento ya llegó).
export function dueOccurrences(occurrences: ReminderOccurrence[], nowIso: string): ReminderOccurrence[] {
  const nowMs = new Date(nowIso).getTime();
  return occurrences
    .filter((o) => !o.deletedAt && OPEN.includes(o.status) && new Date(o.scheduledFor).getTime() <= nowMs)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}

export function upcomingOccurrences(occurrences: ReminderOccurrence[], nowIso: string, days: number): ReminderOccurrence[] {
  const nowMs = new Date(nowIso).getTime();
  const limit = nowMs + days * 86400_000;
  return occurrences
    .filter((o) => !o.deletedAt && OPEN.includes(o.status) && new Date(o.scheduledFor).getTime() > nowMs && new Date(o.scheduledFor).getTime() <= limit)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}

// Siguiente fecha de evento de una regla desde hoy (para mostrar "próximo: 5 nov").
export function nextEventDate(recurrence: Recurrence, todayIso: string): string | null {
  return nextOccurrence(recurrence, todayIso);
}

export const todayOf = (now: Date): string => isoOf({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });

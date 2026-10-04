// Tarjeta de crédito (P3-TC): fecha de corte, fecha límite de pago, estado de cuenta calculado y avisos que no se pasan.
// Todo PURO (sin React, sin red, sin reloj: recibe `todayIso`) para poder probarlo a fondo.
//
// Conceptos (así los usa un banco en México):
//  - Día de corte: cada mes se «cierra» el estado de cuenta. Lo que gastaste hasta ese día (incluido) entra a ese estado.
//  - Fecha límite de pago: el primer día de ese número DESPUÉS del corte (corte 5 / pago 25 → ese mismo mes; corte 25 / pago 15 →
//    el mes siguiente). Pagando el «pago para no generar intereses» a tiempo no se pagan intereses.
//  - Si el día no existe en un mes corto (30 o 31 en febrero) se usa el último día de ese mes.
// Convención de saldos (ver ledger.ts): en una tarjeta el saldo es lo que DEBES (positivo = deuda).
import type { Account, Transaction } from '@/data/types';

import { toISODate } from './date';
import { deterministicId } from './deterministicId';
import { accountDeltasForTransaction, signedDeltaForAccount } from './ledger';
import { addDaysIso, nextOccurrence, parseYmd, previousOccurrence, type Recurrence } from './recurrence';

export interface CardAlertPrefs {
  push: boolean; // también como notificación al teléfono
  timeOfDay: string; // 'HH:MM'
  cutoffAdvance: number[]; // días antes del corte en que se avisa (además del día)
  dueAdvance: number[]; // días antes de la fecha límite en que se avisa (además del día)
  dueAttempts: 1 | 2 | 3; // cuántas veces insiste el día límite si no confirmas que pagaste
}

// Por defecto: corte → aviso el día y 1 día antes; pago → 5 días, 2 días y el mismo día, insistiendo hasta 3 veces.
export const DEFAULT_CARD_ALERTS: CardAlertPrefs = { push: true, timeOfDay: '09:00', cutoffAdvance: [1], dueAdvance: [5, 2], dueAttempts: 3 };

export interface CardSettings {
  cutoffDay: number; // 1..31
  dueDay: number; // 1..31
  creditLimit?: number;
  minPayment?: number; // pago mínimo que dice TU estado de cuenta (VALU no lo puede calcular)
  alerts?: CardAlertPrefs;
}

export const isCreditCard = (a: Pick<Account, 'type'> & { deletedAt?: string }): boolean => a.type === 'credit_card' && !a.deletedAt;

export function cardSettingsOf(a: Account): CardSettings | null {
  if (!a.cardCutoffDay || !a.cardDueDay) return null;
  return { cutoffDay: a.cardCutoffDay, dueDay: a.cardDueDay, creditLimit: a.creditLimit, minPayment: a.cardMinPayment, alerts: a.cardAlerts };
}

const isDay = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 31;

export function validateCardSettings(s: Partial<CardSettings>): string | null {
  if (!isDay(s.cutoffDay)) return 'El día de corte debe ser un número del 1 al 31.';
  if (!isDay(s.dueDay)) return 'El día límite de pago debe ser un número del 1 al 31.';
  if (s.creditLimit !== undefined && (typeof s.creditLimit !== 'number' || !Number.isFinite(s.creditLimit) || s.creditLimit <= 0)) return 'El límite de crédito debe ser un número mayor que cero.';
  if (s.minPayment !== undefined && (typeof s.minPayment !== 'number' || !Number.isFinite(s.minPayment) || s.minPayment < 0)) return 'El pago mínimo debe ser un número igual o mayor que cero.';
  const a = s.alerts;
  if (a) {
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(a.timeOfDay)) return 'La hora del aviso debe ser como 09:00.';
    for (const list of [a.cutoffAdvance, a.dueAdvance]) {
      if (!Array.isArray(list) || list.length > 5 || list.some((n) => !Number.isInteger(n) || n < 1 || n > 30)) return 'Los avisos previos son hasta 5 y cada uno de 1 a 30 días antes.';
    }
    if (![1, 2, 3].includes(a.dueAttempts)) return 'Los intentos deben ser 1, 2 o 3.';
  }
  return null;
}

// ---------- Calendario del ciclo ----------

const monthlyOn = (day: number, anchorIso: string): Recurrence => ({ frequency: 'monthly', interval: 1, startDate: `${anchorIso.slice(0, 4)}-01-01`, dayOfMonth: day });
// Ancla un año antes para poder mirar hacia atrás sin pasar de la primera ocurrencia.
const anchorFor = (todayIso: string): string => `${+todayIso.slice(0, 4) - 2}-01-01`;

// Último corte que YA cerró (hoy cuenta: el estado de hoy ya incluye lo de hoy).
export function lastCutoff(cutoffDay: number, todayIso: string): string {
  return previousOccurrence(monthlyOn(cutoffDay, anchorFor(todayIso)), addDaysIso(todayIso, 1)) ?? todayIso;
}

// Próximo corte estrictamente después de hoy.
export function nextCutoff(cutoffDay: number, todayIso: string): string {
  return nextOccurrence(monthlyOn(cutoffDay, anchorFor(todayIso)), addDaysIso(todayIso, 1)) ?? todayIso;
}

// Fecha límite de pago del estado que cierra en `cutoffIso`: el primer día `dueDay` DESPUÉS del corte.
export function dueDateFor(cutoffIso: string, dueDay: number): string {
  return nextOccurrence(monthlyOn(dueDay, cutoffIso), addDaysIso(cutoffIso, 1)) ?? cutoffIso;
}

export interface CardCycle {
  lastCutoff: string; // el estado ya cerrado
  lastDue: string; // su fecha límite de pago
  nextCutoff: string;
  nextDue: string; // fecha límite del estado que cerrará en nextCutoff
  daysToLastDue: number; // negativo = ya pasó
  daysToNextCutoff: number;
}

const daysBetween = (fromIso: string, toIso: string): number => Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86400000);

export function cardCycle(s: Pick<CardSettings, 'cutoffDay' | 'dueDay'>, todayIso: string): CardCycle {
  const last = lastCutoff(s.cutoffDay, todayIso);
  const next = nextCutoff(s.cutoffDay, todayIso);
  const lastDue = dueDateFor(last, s.dueDay);
  return { lastCutoff: last, lastDue, nextCutoff: next, nextDue: dueDateFor(next, s.dueDay), daysToLastDue: daysBetween(todayIso, lastDue), daysToNextCutoff: daysBetween(todayIso, next) };
}

// ---------- Estado de cuenta calculado ----------

// Día LOCAL de un movimiento (un gasto a las 9 pm en México no pasa al día siguiente por estar en UTC).
export const localDay = (iso: string): string => toISODate(new Date(iso));

const deltaFor = (card: Account, t: Transaction): number => {
  let d = 0;
  for (const x of accountDeltasForTransaction(t)) if (x.accountId === card.id) d += signedDeltaForAccount(card, x.delta);
  return d;
};

export interface CardStatement {
  cutoff: string;
  periodStart: string; // día siguiente al corte anterior
  balanceAtCutoff: number; // lo que debías al cerrar ese estado (nunca negativo aquí: un saldo a favor es 0)
  charges: number; // compras del periodo
  credits: number; // pagos, abonos y reembolsos del periodo
}

// Reconstruye cómo estaba la tarjeta al corte: saldo de hoy MENOS lo que pasó después del corte (solo lo registrado).
export function cardStatement(card: Account, transactions: Transaction[], cutoffIso: string, cutoffDay: number): CardStatement {
  const live = transactions.filter((t) => !t.deletedAt && (!t.status || t.status === 'posted'));
  let after = 0;
  let charges = 0;
  let credits = 0;
  const prev = previousOccurrence(monthlyOn(cutoffDay, anchorFor(cutoffIso)), cutoffIso) ?? addDaysIso(cutoffIso, -30);
  for (const t of live) {
    const d = deltaFor(card, t);
    if (d === 0) continue;
    const day = localDay(t.date);
    if (day > cutoffIso) after += d;
    else if (day > prev) {
      if (d > 0) charges += d;
      else credits += -d;
    }
  }
  return { cutoff: cutoffIso, periodStart: addDaysIso(prev, 1), balanceAtCutoff: Math.max(0, round2(card.balance - after)), charges: round2(charges), credits: round2(credits) };
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type CardPayStatus = 'paid' | 'pending' | 'overdue' | 'nothing_to_pay';

export interface CardDue {
  cycle: CardCycle;
  statementBalance: number; // lo que debías al último corte
  paidSinceCutoff: number; // pagos y abonos registrados después del corte
  remaining: number; // pago para no generar intereses que aún falta (0 si ya cubriste)
  minPayment?: number;
  status: CardPayStatus;
  dueDate: string; // la fecha límite que importa AHORA
  daysToDue: number;
  utilization?: number; // 0..1+ (saldo / límite)
  availableCredit?: number;
}

export function cardDue(card: Account, transactions: Transaction[], todayIso: string): CardDue | null {
  const s = cardSettingsOf(card);
  if (!s) return null;
  const cycle = cardCycle(s, todayIso);
  const st = cardStatement(card, transactions, cycle.lastCutoff, s.cutoffDay);
  const live = transactions.filter((t) => !t.deletedAt && (!t.status || t.status === 'posted'));
  let credits = 0;
  for (const t of live) {
    const d = deltaFor(card, t);
    if (d < 0 && localDay(t.date) > cycle.lastCutoff) credits += -d;
  }
  const paidSinceCutoff = round2(credits);
  const remaining = Math.max(0, round2(st.balanceAtCutoff - paidSinceCutoff));
  let status: CardPayStatus;
  if (st.balanceAtCutoff <= 0.005) status = 'nothing_to_pay';
  else if (remaining <= 0.005) status = 'paid';
  else status = todayIso > cycle.lastDue ? 'overdue' : 'pending';
  // Mientras haya algo por pagar de un estado ya cerrado, esa es la fecha que importa; si no, la del siguiente estado.
  const dueDate = status === 'pending' || status === 'overdue' ? cycle.lastDue : todayIso <= cycle.lastDue && status === 'paid' ? cycle.lastDue : cycle.nextDue;
  return {
    cycle,
    statementBalance: st.balanceAtCutoff,
    paidSinceCutoff,
    remaining,
    minPayment: s.minPayment,
    status,
    dueDate,
    daysToDue: daysBetween(todayIso, dueDate),
    ...(s.creditLimit ? { utilization: round2(Math.max(0, card.balance) / s.creditLimit), availableCredit: round2(s.creditLimit - Math.max(0, card.balance)) } : {}),
  };
}

// ---------- Avisos de la tarjeta (series con id determinista: dos dispositivos no duplican) ----------

export interface CardReminderSpec {
  key: 'cutoff' | 'due';
  kind: 'card_cutoff' | 'card_due';
  title: string; // sin montos: se ve en la pantalla bloqueada
  recurrence: Recurrence;
  timeOfDay: string;
  advanceDays: number[];
  maxAttempts: 1 | 2 | 3;
  attemptIntervalMinutes: number;
  push: boolean;
}

export function cardReminderSpecs(card: Pick<Account, 'name'>, s: CardSettings, todayIso: string): CardReminderSpec[] {
  const a = { ...DEFAULT_CARD_ALERTS, ...(s.alerts ?? {}) };
  const rec = (day: number): Recurrence => ({ frequency: 'monthly', interval: 1, startDate: todayIso, dayOfMonth: day });
  return [
    { key: 'cutoff', kind: 'card_cutoff', title: `Corte de tu tarjeta ${card.name}`, recurrence: rec(s.cutoffDay), timeOfDay: a.timeOfDay, advanceDays: a.cutoffAdvance, maxAttempts: 1, attemptIntervalMinutes: 120, push: a.push },
    { key: 'due', kind: 'card_due', title: `Pago de tu tarjeta ${card.name}`, recurrence: rec(s.dueDay), timeOfDay: a.timeOfDay, advanceDays: a.dueAdvance, maxAttempts: a.dueAttempts, attemptIntervalMinutes: 120, push: a.push },
  ];
}

// "Hoy es tu corte" / "faltan 3 días para tu pago" para tarjetas y widgets.
export function cardHeadline(d: CardDue): string {
  const n = d.daysToDue;
  if (d.status === 'nothing_to_pay') return 'Sin saldo que pagar del último corte';
  if (d.status === 'paid') return 'Ya cubriste el pago de este corte';
  if (d.status === 'overdue') return n === -1 ? 'Ayer era tu fecha límite de pago' : `Tu fecha límite de pago pasó hace ${-n} días`;
  if (n === 0) return 'Hoy es tu fecha límite de pago';
  if (n === 1) return 'Mañana es tu fecha límite de pago';
  return `Faltan ${n} días para tu fecha límite de pago`;
}

export const validDayOfMonth = isDay;
export const parseDay = (iso: string): number | null => parseYmd(iso)?.d ?? null;

// Ids de los avisos de una tarjeta: DETERMINISTAS, así dos dispositivos que los crean a la vez no duplican nada.
export const cardReminderId = (accountId: string, key: 'cutoff' | 'due'): string => deterministicId('card-reminder', accountId, key);

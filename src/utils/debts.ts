// Deudas (P3): quién debe a quién, pagos, saldar y planes de cuotas. Funciones PURAS: el store las usa para decidir y las
// pantallas para mostrar, así hay una sola definición de cada regla (y se prueba sin pantallas).
import type { Account, Liability, LiabilityDirection, LiabilityType } from '@/data/types';

import { addMonthsIso, diffDaysIso, parseYmd } from './recurrence';

export const directionOf = (l: Pick<Liability, 'direction'>): LiabilityDirection => l.direction ?? 'owe';
export const isSettled = (l: Pick<Liability, 'status'>): boolean => l.status === 'settled';
// Una deuda "viva": no saldada y no borrada.
export const isOpenLiability = (l: Pick<Liability, 'status' | 'deletedAt'>): boolean => !l.deletedAt && !isSettled(l);

export function splitLiabilities<T extends Liability>(list: T[]): { owe: T[]; owedToMe: T[]; settled: T[] } {
  const owe: T[] = [];
  const owedToMe: T[] = [];
  const settled: T[] = [];
  for (const l of list) {
    if (l.deletedAt) continue;
    if (isSettled(l)) settled.push(l);
    else if (directionOf(l) === 'owed_to_me') owedToMe.push(l);
    else owe.push(l);
  }
  return { owe, owedToMe, settled };
}

// Subcategoría de gasto al pagar una deuda de este tipo.
export const PAYMENT_SUBCATEGORY: Record<LiabilityType, string> = {
  credit_card: 'debt_creditcard',
  student_loan: 'debt_student',
  personal_loan: 'debt_personal',
  mortgage: 'debt_mortgage',
  other: 'debt_other',
};

export interface InstallmentProgress {
  total: number;
  paid: number;
  remaining: number;
  nextDate: string | null; // AAAA-MM-DD de la próxima cuota, o null si ya terminó
  nextAmount: number;
  overdue: boolean; // la próxima cuota ya debió pagarse
  daysUntilNext: number | null;
}

// Plan de cuotas mensuales: la 1ª en installmentStartDate, luego cada mes (el día se ajusta al último del mes si hace falta).
export function installmentProgress(l: Pick<Liability, 'installmentCount' | 'installmentAmount' | 'installmentStartDate' | 'installmentsPaid'>, todayIso: string): InstallmentProgress | null {
  const total = l.installmentCount;
  if (!total || total < 1 || !l.installmentAmount || !l.installmentStartDate || !parseYmd(l.installmentStartDate)) return null;
  const paid = Math.max(0, Math.min(total, l.installmentsPaid ?? 0));
  const remaining = total - paid;
  if (remaining === 0) return { total, paid, remaining, nextDate: null, nextAmount: 0, overdue: false, daysUntilNext: null };
  const nextDate = addMonthsIso(l.installmentStartDate, paid);
  const days = diffDaysIso(todayIso, nextDate);
  return { total, paid, remaining, nextDate, nextAmount: l.installmentAmount, overdue: days < 0, daysUntilNext: days };
}

export function validateLiabilityDraft(d: Partial<Liability>): string | null {
  if (!d.institution || d.institution.trim().length < 1) return 'Escribe a quién le debes (o quién te debe).';
  if (typeof d.balance !== 'number' || !Number.isFinite(d.balance) || d.balance < 0) return 'El saldo debe ser un número igual o mayor que cero.';
  if (d.installmentCount !== undefined) {
    if (!Number.isInteger(d.installmentCount) || d.installmentCount < 1 || d.installmentCount > 600) return 'El número de cuotas debe ser un entero entre 1 y 600.';
    if (typeof d.installmentAmount !== 'number' || !(d.installmentAmount > 0)) return 'Escribe de cuánto es cada cuota.';
    if (!d.installmentStartDate || !parseYmd(d.installmentStartDate)) return 'Elige la fecha de la primera cuota.';
    if (d.installmentsPaid !== undefined && (!Number.isInteger(d.installmentsPaid) || d.installmentsPaid < 0 || d.installmentsPaid > d.installmentCount)) return 'Las cuotas pagadas no pueden ser más que el total.';
  }
  return null;
}

// ¿Se puede registrar este pago? (mensaje en español o null). `account` es la cuenta de la que sale (o a la que entra) el dinero.
export function validateLiabilityPayment(l: Liability, amount: number, account: Account | undefined, accountGiven: boolean): string | null {
  if (l.deletedAt) return 'Esa deuda ya no existe.';
  if (isSettled(l)) return 'Esa deuda ya está saldada.';
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return 'El monto debe ser un número mayor que cero.';
  if (amount > l.balance + 0.005) return `El pago es mayor que lo que queda por pagar (${l.balance}). Revisa el monto.`;
  if (accountGiven) {
    if (!account || account.deletedAt) return 'La cuenta que elegiste ya no existe.';
    if (account.currency !== l.currency) return 'La cuenta y la deuda usan monedas distintas; todavía no puedo convertir entre ellas.';
    if (directionOf(l) === 'owe' && account.isLiability) return 'No puedes pagar una deuda con una tarjeta de crédito: elige una cuenta de la que tengas el dinero.';
  }
  return null;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface PaymentEffect {
  balance: number;
  status?: 'settled';
  settledAt?: string;
  installmentsPaid?: number;
  dueDate?: string;
}

// Qué le pasa a la deuda al registrar un pago: baja el saldo, avanzan las cuotas (si hay plan) y, si llega a cero, queda saldada.
export function applyPayment(l: Liability, amount: number, nowIso: string): PaymentEffect {
  const balance = Math.max(0, round2(l.balance - amount));
  const effect: PaymentEffect = { balance };
  if (l.installmentCount && l.installmentAmount && l.installmentAmount > 0) {
    const covered = Math.floor((amount + 0.005) / l.installmentAmount);
    const paid = Math.min(l.installmentCount, (l.installmentsPaid ?? 0) + covered);
    effect.installmentsPaid = balance === 0 ? l.installmentCount : paid;
    if (l.installmentStartDate && balance > 0 && paid < l.installmentCount) effect.dueDate = addMonthsIso(l.installmentStartDate, paid);
  }
  if (balance === 0) {
    effect.status = 'settled';
    effect.settledAt = nowIso;
  }
  return effect;
}

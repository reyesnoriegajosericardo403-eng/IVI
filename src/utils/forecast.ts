// Previsto vs. real (P3, contrato §6): funciones PURAS para consultar y proyectar movimientos previstos. Nada aquí escribe
// datos; las acciones que cambian el estado (confirmar, omitir, posponer) viven en el store.
//
// Regla de oro: un previsto NUNCA entra a saldos reales, ni al patrimonio, ni al gasto/ingreso/presupuesto. Solo aparece en
// proyecciones explícitas ("cómo quedaría tu cuenta el día 30 si todo ocurre") y en avisos.
import type { Account, Currency, Transaction } from '@/data/types';

import { accountDeltasForTransaction, signedDeltaForAccount } from './ledger';
import { addDaysIso, diffDaysIso, isoOf, parseYmd } from './recurrence';

export const dayOf = (t: Pick<Transaction, 'date'>): string => t.date.slice(0, 10);

// Un previsto vigente = todavía por ocurrir o por confirmar.
export const isForecast = (t: Transaction): boolean => !t.deletedAt && t.status === 'forecast';

// Ya pasó su fecha y nadie confirmó si ocurrió ("¿ya pagaste la renta?").
export function overdueForecasts(transactions: Transaction[], todayIso: string): Transaction[] {
  return transactions.filter((t) => isForecast(t) && dayOf(t) < todayIso).sort((a, b) => a.date.localeCompare(b.date));
}

// Los de hoy en adelante, dentro de `days` días (inclusive).
export function upcomingForecasts(transactions: Transaction[], todayIso: string, days = 30): Transaction[] {
  const limit = addDaysIso(todayIso, days);
  return transactions.filter((t) => isForecast(t) && dayOf(t) >= todayIso && dayOf(t) <= limit).sort((a, b) => a.date.localeCompare(b.date));
}

export function daysUntil(todayIso: string, dateIso: string): number {
  return diffDaysIso(todayIso, dateIso.slice(0, 10));
}

export interface ForecastTotals {
  income: number;
  expense: number;
  net: number;
}

// Lo que se espera ganar y gastar entre dos fechas (inclusive) según los previstos, en una moneda (las demás se ignoran:
// no se mezclan monedas sin tipo de cambio).
export function forecastTotals(transactions: Transaction[], fromIso: string, toIso: string, currency: Currency): ForecastTotals {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (!isForecast(t) || t.currency !== currency) continue;
    const d = dayOf(t);
    if (d < fromIso || d > toIso) continue;
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense' || t.type === 'saving' || t.type === 'investment_buy') expense += t.amount;
  }
  return { income, expense, net: income - expense };
}

export interface ProjectedBalance {
  accountId: string;
  name: string;
  currency: Currency;
  current: number;
  projected: number;
  isLiability: boolean;
}

// Saldo de cada cuenta si TODOS los previstos hasta `untilIso` (inclusive) ocurren, aplicados en orden de fecha con el mismo
// libro contable que lo real (una tarjeta de crédito sube su deuda al gastar). No modifica nada.
export function projectBalances(accounts: Account[], transactions: Transaction[], untilIso: string, fromIso?: string): ProjectedBalance[] {
  const live = accounts.filter((a) => !a.deletedAt);
  const projected = new Map(live.map((a) => [a.id, a.balance]));
  const byId = new Map(live.map((a) => [a.id, a]));
  const list = transactions.filter((t) => isForecast(t) && dayOf(t) <= untilIso && (!fromIso || dayOf(t) >= fromIso)).sort((a, b) => a.date.localeCompare(b.date));
  for (const t of list) {
    for (const d of accountDeltasForTransaction({ ...t, status: 'posted' })) {
      const acc = byId.get(d.accountId);
      if (!acc) continue;
      projected.set(d.accountId, (projected.get(d.accountId) ?? 0) + signedDeltaForAccount(acc, d.delta));
    }
  }
  return live.map((a) => ({ accountId: a.id, name: a.name, currency: a.currency, current: a.balance, projected: projected.get(a.id) ?? a.balance, isLiability: !!a.isLiability }));
}

// Primera fecha en que una cuenta que NO es de crédito se quedaría en negativo con los previstos, o null. Sirve para avisar
// "el día 12 no te alcanza para la renta".
export function firstShortfall(accounts: Account[], transactions: Transaction[], untilIso: string): { accountId: string; name: string; date: string; balance: number } | null {
  const live = accounts.filter((a) => !a.deletedAt && !a.isLiability);
  const balances = new Map(live.map((a) => [a.id, a.balance]));
  const list = transactions.filter((t) => isForecast(t) && dayOf(t) <= untilIso).sort((a, b) => a.date.localeCompare(b.date));
  let worst: { accountId: string; name: string; date: string; balance: number } | null = null;
  for (const t of list) {
    for (const d of accountDeltasForTransaction({ ...t, status: 'posted' })) {
      if (!balances.has(d.accountId)) continue;
      const next = (balances.get(d.accountId) ?? 0) + d.delta;
      balances.set(d.accountId, next);
      if (next < 0 && (!worst || dayOf(t) < worst.date)) {
        const acc = live.find((a) => a.id === d.accountId)!;
        worst = { accountId: acc.id, name: acc.name, date: dayOf(t), balance: next };
      }
    }
  }
  return worst;
}

// "2026-10-05" → mediodía local en ISO (así ninguna zona horaria lo corre de día).
export function noonIso(dateIso: string): string {
  const p = parseYmd(dateIso);
  if (!p) return dateIso;
  return new Date(p.y, p.m - 1, p.d, 12, 0, 0).toISOString();
}

export const todayIsoLocal = (now: Date = new Date()): string => isoOf({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });

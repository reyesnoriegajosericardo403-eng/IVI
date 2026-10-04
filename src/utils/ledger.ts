import type { Transaction, TransactionType } from '@/data/types';

// Cómo cada tipo de movimiento afecta el saldo REAL de las cuentas
// involucradas — la única fuente de verdad para que el saldo mostrado en
// Patrimonio siempre tenga sentido con lo registrado en Movimientos o por
// voz (spec: "auditoría... para que todo tenga sentido lógico real de
// cómo se mueve el dinero"). Un gasto/ahorro/compra de inversión saca
// dinero de accountId; un ingreso/venta de inversión lo mete; una
// transferencia lo saca de accountId y lo mete a toAccountId.
const OUTFLOW_TYPES: TransactionType[] = ['expense', 'saving', 'investment_buy'];
const INFLOW_TYPES: TransactionType[] = ['income', 'investment_sell'];

export interface AccountDelta {
  accountId: string;
  delta: number;
}

export function accountDeltasForTransaction(
  tx: Pick<Transaction, 'type' | 'amount' | 'accountId' | 'toAccountId'>
): AccountDelta[] {
  if (OUTFLOW_TYPES.includes(tx.type)) {
    return tx.accountId ? [{ accountId: tx.accountId, delta: -tx.amount }] : [];
  }
  if (INFLOW_TYPES.includes(tx.type)) {
    return tx.accountId ? [{ accountId: tx.accountId, delta: tx.amount }] : [];
  }
  if (tx.type === 'transfer') {
    const deltas: AccountDelta[] = [];
    if (tx.accountId) deltas.push({ accountId: tx.accountId, delta: -tx.amount });
    if (tx.toAccountId) deltas.push({ accountId: tx.toAccountId, delta: tx.amount });
    return deltas;
  }
  return [];
}

// Convención de saldos: en una cuenta normal el saldo es "lo que tienes" (gastar lo baja, cobrar lo sube); en una cuenta
// de PASIVO (tarjeta de crédito, `isLiability`) el saldo es "lo que debes" (positivo = deuda), así que el efecto es el
// contrario: gastar con la tarjeta SUBE lo que debes, pagarla (una transferencia hacia ella) lo BAJA y un reembolso lo baja.
// Antes de 2026-10-04 el ledger aplicaba el mismo signo a las dos, y gastar con la tarjeta reducía la deuda.
export function signedDeltaForAccount(account: { isLiability?: boolean }, delta: number): number {
  return account.isLiability ? -delta : delta;
}

export function reverseDeltas(deltas: AccountDelta[]): AccountDelta[] {
  return deltas.map((d) => ({ accountId: d.accountId, delta: -d.delta }));
}

// Colapsa varios deltas (ej. reversa del valor viejo + aplicación del
// nuevo al editar un movimiento) en un solo total neto por cuenta.
export function mergeDeltas(deltas: AccountDelta[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of deltas) {
    map.set(d.accountId, (map.get(d.accountId) ?? 0) + d.delta);
  }
  return map;
}

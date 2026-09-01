import { findBudgetConceptForCategory, findIncomeConceptForCategory } from '@/data/budgetConcepts';
import type { Account, Budget, TransactionType } from '@/data/types';

function activeAccounts(accounts: Account[]): Account[] {
  return accounts.filter((a) => !a.deletedAt);
}

// De qué cuenta debería salir/entrar un movimiento si no se elige nada a
// mano — los ingresos van a la cuenta que se configuró en Presupuesto para
// ese concepto; todo lo demás cae en efectivo por default, salvo que esa
// cuenta esté excluida para esa categoría de gasto.
export function resolveDefaultAccountId(
  type: TransactionType,
  categoryId: string,
  subcategoryId: string | undefined,
  accounts: Account[],
  budgets: Budget[]
): string | undefined {
  const active = activeAccounts(accounts);

  if (type === 'income') {
    const concept = findIncomeConceptForCategory(categoryId, subcategoryId);
    const budget = concept ? budgets.find((b) => b.categoryId === concept.id) : undefined;
    if (budget?.targetAccountId && active.some((a) => a.id === budget.targetAccountId)) {
      return budget.targetAccountId;
    }
    return undefined;
  }

  const concept = findBudgetConceptForCategory(categoryId, subcategoryId);
  const budget = concept ? budgets.find((b) => b.categoryId === concept.id) : undefined;
  const excluded = new Set(budget?.excludedAccountIds ?? []);
  const cash = active.find((a) => a.type === 'cash' && !excluded.has(a.id));
  return cash?.id;
}

// Cuentas válidas para elegir a mano en una categoría de gasto — quita las
// que el usuario excluyó para ese concepto en Presupuesto (opcional). Los
// ingresos siempre pueden ir a cualquier cuenta.
export function accountsForCategory(
  type: TransactionType,
  categoryId: string,
  subcategoryId: string | undefined,
  accounts: Account[],
  budgets: Budget[]
): Account[] {
  const active = activeAccounts(accounts);
  if (type === 'income') return active;
  const concept = findBudgetConceptForCategory(categoryId, subcategoryId);
  const budget = concept ? budgets.find((b) => b.categoryId === concept.id) : undefined;
  const excluded = new Set(budget?.excludedAccountIds ?? []);
  return active.filter((a) => !excluded.has(a.id));
}

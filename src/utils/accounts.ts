import { findBudgetConceptForCategory, findIncomeConceptForCategory, makeSubBudgetId } from '@/data/budgetConcepts';
import type { Account, Budget, TransactionType } from '@/data/types';

function activeAccounts(accounts: Account[]): Account[] {
  return accounts.filter((a) => !a.deletedAt);
}

// El presupuesto que manda para un gasto: si la persona agregó una ficha
// por subcategoría dentro del concepto (ej. "Microbús" dentro de
// "Transporte cotidiano"), sus propias cuentas incluidas tienen prioridad
// sobre las del concepto completo — es justo el punto de poder separar
// "en microbús uso efectivo, en metro uso mi tarjeta de la CDMX" (spec:
// "en cada una de ellas uso tarjetas diferentes").
function expenseBudgetForCategory(categoryId: string, subcategoryId: string | undefined, budgets: Budget[]): Budget | undefined {
  const concept = findBudgetConceptForCategory(categoryId, subcategoryId);
  if (!concept) return undefined;
  if (subcategoryId) {
    const subBudget = budgets.find((b) => b.categoryId === makeSubBudgetId(concept.id, subcategoryId));
    if (subBudget) return subBudget;
  }
  return budgets.find((b) => b.categoryId === concept.id);
}

// Cuentas válidas para un gasto: las que la persona marcó como "con las
// que normalmente pagas eso" (spec) — si no eligió ninguna, cualquier
// cuenta activa es válida (nunca se bloquea por default).
function allowedExpenseAccounts(active: Account[], budget: Budget | undefined): Account[] {
  const included = budget?.includedAccountIds;
  if (!included || included.length === 0) return active;
  const includedSet = new Set(included);
  return active.filter((a) => includedSet.has(a.id));
}

// De qué cuenta debería salir/entrar un movimiento si no se elige nada a
// mano — los ingresos van a la cuenta que se configuró en Presupuesto para
// ese concepto; los gastos caen en efectivo por default si está entre las
// cuentas incluidas, si no, en la primera cuenta incluida.
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

  const budget = expenseBudgetForCategory(categoryId, subcategoryId, budgets);
  const allowed = allowedExpenseAccounts(active, budget);
  const cash = allowed.find((a) => a.type === 'cash');
  return (cash ?? allowed[0])?.id;
}

// Cuentas válidas para elegir a mano en una categoría de gasto — las que
// el usuario marcó como "con las que normalmente pagas eso" para ese
// concepto (o para la ficha de esa subcategoría en particular, si
// existe) en Presupuesto. Los ingresos siempre pueden ir a cualquier
// cuenta.
export function accountsForCategory(
  type: TransactionType,
  categoryId: string,
  subcategoryId: string | undefined,
  accounts: Account[],
  budgets: Budget[]
): Account[] {
  const active = activeAccounts(accounts);
  if (type === 'income') return active;
  const budget = expenseBudgetForCategory(categoryId, subcategoryId, budgets);
  return allowedExpenseAccounts(active, budget);
}

import { ACCOUNT_TYPE_LABELS, LIABILITY_TYPE_LABELS } from '@/data/accountMeta';
import { BUDGET_CONCEPTS, findBudgetConcept, type BudgetConcept } from '@/data/budgetConcepts';
import { findSubcategory } from '@/data/categories';
import type { Account, AccountType, Currency, Goal, Liability, LiabilityType, TemplateBudgetLine, Transaction } from '@/data/types';
import { resolveAccountByNameHint, resolveByNameHint, resolveGoalByNameHint, resolveLiabilityByNameHint } from '@/utils/accounts';
import { formatDateDMY, parseISODate, todayISO } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

import { resolveCandidateP3 } from './actionCatalogP3';
import { describeDateEs, isoDateToTimestamp } from './dates';
import {
  ask,
  askAccount,
  askAmount,
  askDate,
  askGoal,
  askLiability,
  askName,
  cleanString,
  dateOnly,
  finiteAmount,
  positiveAmount,
  resolveCurrency,
  todayOf,
  type ActionValidationContext,
  type ResolveErr,
  type ResolveOk,
  type ResolveResult,
} from './catalogCommon';
import { normalize } from './localParser';
import type {
  AddAccountArgs,
  AddGoalArgs,
  AddLiabilityArgs,
  AddTransactionArgs,
  ContributeToGoalArgs,
  DeleteAccountArgs,
  DeleteBudgetLineArgs,
  DeleteGoalArgs,
  DeleteLiabilityArgs,
  DeleteTransactionArgs,
  AIActionType,
  MissingField,
  ResolvedAction,
  SetBudgetLineArgs,
  TransferBetweenAccountsArgs,
  UpdateGoalDateArgs,
  UpdateGoalTargetArgs,
  UpdateLiabilityBalanceArgs,
  UpdateLiabilityDueDateArgs,
  WithdrawFromGoalArgs,
} from './chatTypes';

export type { ActionValidationContext, ResolveErr, ResolveOk, ResolveResult };

// Catálogo de acciones: el único lugar donde una propuesta cruda (venga de
// una expresión regular o de un LLM, ambas igual de no confiables) se
// convierte en algo que de verdad se le puede mostrar al usuario y aplicar.
// Reglas del plan que este archivo hace cumplir:
// - Cada acción tiene un tipo de argumentos ANGOSTO — nunca un parche
//   genérico de cuenta/meta/deuda.
// - Toda referencia a un registro existente se resuelve por NOMBRE contra
//   datos reales (nunca se confía en un ID que "diga" el modelo).
// - El texto de confirmación (`summary`) SIEMPRE lo arma este código a
//   partir de los argumentos ya validados — nunca la prosa del modelo.

// ---------- Candidatos crudos (sin validar) por tipo de acción ----------
// Los produce tanto chatIntentParser.ts (regex) como
// LLMActionAgentProvider.ts (JSON del modelo) — ninguno de los dos es de
// fiar todavía en este punto, por eso todo pasa por `resolve*`.

export interface AddTransactionCandidate {
  transactionType: 'expense' | 'income';
  amount: unknown;
  accountNameHint: string;
  // Opcionales: sin esto es un ajuste simple de saldo (categoría genérica,
  // igual que ya hace capture.tsx para "agrégale/quítale X a mi cuenta").
  // Con un id de categoría/subcategoría VÁLIDO del catálogo, se guarda como
  // un movimiento categorizado de verdad.
  categoryId?: unknown;
  subcategoryId?: unknown;
  // Día dicho (AAAA-MM-DD o ISO). Solo hoy o pasado: un movimiento real no puede ser del futuro.
  date?: unknown;
}
export interface AddAccountCandidate {
  name: unknown;
  accountTypeHint?: unknown;
  balance?: unknown;
  currency?: unknown;
}
export interface DeleteAccountCandidate {
  accountNameHint: string;
}
export interface AddGoalCandidate {
  name: unknown;
  targetAmount: unknown;
  currency?: unknown;
  targetDate?: unknown; // AAAA-MM-DD, hoy o futura
}
export interface ContributeToGoalCandidate {
  goalNameHint: string;
  amount: unknown;
}
export interface WithdrawFromGoalCandidate {
  goalNameHint: string;
  amount: unknown;
}
export interface UpdateGoalDateCandidate {
  goalNameHint: string;
  targetDate: unknown;
}
export interface UpdateLiabilityDueDateCandidate {
  institutionHint: string;
  dueDate: unknown;
}
export interface UpdateGoalTargetCandidate {
  goalNameHint: string;
  targetAmount: unknown;
}
export interface DeleteGoalCandidate {
  goalNameHint: string;
}
export interface AddLiabilityCandidate {
  institution: unknown;
  liabilityTypeHint?: unknown;
  balance: unknown;
  currency?: unknown;
}
export interface UpdateLiabilityBalanceCandidate {
  institutionHint: string;
  balance: unknown;
}
export interface DeleteLiabilityCandidate {
  institutionHint: string;
}
export interface SetBudgetLineCandidate {
  categoryHint: string;
  monthlyAmount: unknown;
}
export interface DeleteBudgetLineCandidate {
  categoryHint: string;
}
export interface DeleteTransactionCandidate {
  transactionId: unknown;
}
export interface TransferBetweenAccountsCandidate {
  fromAccountNameHint: string;
  toAccountNameHint: string;
  amount: unknown;
}

const ACCOUNT_TYPE_SYNONYMS: Record<string, AccountType> = {
  banco: 'bank',
  bancaria: 'bank',
  debito: 'bank',
  cuenta: 'bank',
  tarjeta: 'credit_card',
  credito: 'credit_card',
  efectivo: 'cash',
  cash: 'cash',
  ahorro: 'savings',
  ahorros: 'savings',
  inversion: 'investment',
};
const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'credit_card', 'investment', 'savings'];

function resolveAccountType(hint: unknown): AccountType {
  const key = normalize(cleanString(hint));
  if ((ACCOUNT_TYPES as string[]).includes(key)) return key as AccountType;
  return ACCOUNT_TYPE_SYNONYMS[key] ?? 'bank';
}

const LIABILITY_TYPE_SYNONYMS: Record<string, LiabilityType> = {
  tarjeta: 'credit_card',
  credito: 'credit_card',
  estudiantil: 'student_loan',
  estudios: 'student_loan',
  personal: 'personal_loan',
  prestamo: 'personal_loan',
  hipoteca: 'mortgage',
  casa: 'mortgage',
};
const LIABILITY_TYPES: LiabilityType[] = ['credit_card', 'student_loan', 'personal_loan', 'mortgage', 'other'];

function resolveLiabilityType(hint: unknown): LiabilityType {
  const key = normalize(cleanString(hint));
  if ((LIABILITY_TYPES as string[]).includes(key)) return key as LiabilityType;
  return LIABILITY_TYPE_SYNONYMS[key] ?? 'other';
}

// Sinónimos de los conceptos de presupuesto más comunes que alguien
// realmente diría hablando ("comida", "renta") — los nombres completos de
// BUDGET_CONCEPTS ("Alimentación y súper") son demasiado largos para que
// el match parcial de resolveByNameHint los alcance solo. Cobertura por
// regex necesariamente parcial (ver docs de chatIntentParser.ts); con un
// LLM conectado, el propio modelo entiende la frase completa.
const BUDGET_CONCEPT_SYNONYMS: Record<string, string> = {
  comida: 'concept_food',
  super: 'concept_food',
  alimentacion: 'concept_food',
  restaurantes: 'concept_food',
  renta: 'concept_housing',
  vivienda: 'concept_housing',
  casa: 'concept_housing',
  servicios: 'concept_housing',
  transporte: 'concept_transport',
  gasolina: 'concept_transport',
  uber: 'concept_transport',
  salud: 'concept_health',
  doctor: 'concept_health',
  deudas: 'concept_debt',
  deuda: 'concept_debt',
  educacion: 'concept_education',
  escuela: 'concept_education',
  colegiatura: 'concept_education',
  diversion: 'concept_leisure',
  ocio: 'concept_leisure',
  salidas: 'concept_leisure',
  entretenimiento: 'concept_leisure',
  suscripciones: 'concept_subscriptions',
  streaming: 'concept_subscriptions',
  regalos: 'concept_gifts',
  familia: 'concept_family_support',
  donaciones: 'concept_donations',
  ahorro: 'concept_goals_short',
  metas: 'concept_goals_short',
  emergencias: 'concept_emergency',
  inversion: 'concept_investing',
  inversiones: 'concept_investing',
};

function resolveBudgetConcept(hint: string): BudgetConcept | undefined {
  const key = normalize(hint);
  const bySynonym = BUDGET_CONCEPT_SYNONYMS[key];
  if (bySynonym) return findBudgetConcept(bySynonym);
  return resolveByNameHint(hint, BUDGET_CONCEPTS, (c) => c.name);
}

// ---------- add_transaction (también cubre ajustes simples de saldo) ----------

export function resolveAddTransaction(candidate: AddTransactionCandidate, ctx: ActionValidationContext): ResolveResult {
  const amount = positiveAmount(candidate.amount);
  if (amount === null) return ask('add_transaction', candidate, [askAmount('amount', 'No reconocí un monto claro — dime un número, por ejemplo "500".')]);
  const account = resolveAccountByNameHint(candidate.accountNameHint, ctx.accounts);
  if (!account) return ask('add_transaction', candidate, [askAccount('accountNameHint', candidate.accountNameHint, ctx)]);

  const transactionType: 'income' | 'expense' = candidate.transactionType === 'income' ? 'income' : 'expense';
  const candidateCategoryId = cleanString(candidate.categoryId);
  const candidateSubcategoryId = cleanString(candidate.subcategoryId);
  // La categoría solo se acepta si es EXACTAMENTE una del catálogo real —
  // nunca un id inventado por el modelo (mismo criterio que ya sigue
  // LLMAIInterpreterProvider.ts). Sin una categoría válida, se usa el
  // mismo par genérico que ya usa capture.tsx para un ajuste simple de
  // saldo (applyAccountAdjustment) — consistencia entre voz/texto y chat.
  const hasValidCategory = !!(candidateCategoryId && candidateSubcategoryId && findSubcategory(candidateCategoryId, candidateSubcategoryId));
  const categoryId = hasValidCategory ? candidateCategoryId : transactionType === 'income' ? 'income' : 'miscellaneous';
  const subcategoryId = hasValidCategory ? candidateSubcategoryId : transactionType === 'income' ? 'inc_other' : 'misc_other';

  // Día en que ocurrió (solo hoy o pasado). Hoy = "ahora", igual que sin decir nada.
  let dateIso: string | undefined;
  let dayShown: string | undefined;
  if (candidate.date !== undefined && candidate.date !== null && candidate.date !== '') {
    const day = dateOnly(candidate.date);
    const today = todayOf(ctx);
    if (!day) return ask('add_transaction', candidate, [askDate('date', '¿De qué día fue? Dime "hoy", "ayer" o una fecha.')]);
    if (day > today) return ask('add_transaction', candidate, [askDate('date', 'Ese día todavía no llega: un movimiento real solo puede ser de hoy o de un día pasado. ¿De qué día fue?')]);
    if (day < `${+today.slice(0, 4) - 5}${today.slice(4)}`) return ask('add_transaction', candidate, [askDate('date', 'Esa fecha es de hace más de 5 años. ¿De qué día fue?')]);
    if (day < today) {
      dateIso = isoDateToTimestamp(day);
      dayShown = day;
    }
  }
  const args: AddTransactionArgs = {
    transactionType,
    amount,
    currency: account.currency,
    categoryId,
    subcategoryId,
    accountId: account.id,
    accountName: account.name,
    ...(dateIso ? { date: dateIso } : {}),
  };
  const when = dayShown ? ` · ${describeDateEs(dayShown, parseISODate(todayOf(ctx)))}` : '';
  const summary = hasValidCategory
    ? `Agregar ${transactionType === 'income' ? 'ingreso' : 'gasto'} de ${formatCurrency(amount, account.currency)} (${findSubcategory(categoryId, subcategoryId)?.name ?? 'sin categoría'}) en "${account.name}"${when}`
    : `${transactionType === 'income' ? 'Agregar' : 'Quitar'} ${formatCurrency(amount, account.currency)} ${transactionType === 'income' ? 'a' : 'de'} "${account.name}"${when}`;
  return { ok: true, action: { type: 'add_transaction', args }, summary };
}

// ---------- Transferencias entre cuentas propias (backlog #144) ----------
// A diferencia de add_transaction, esto crea UN solo movimiento tipo
// 'transfer' con accountId (origen) + toAccountId (destino) — el ledger
// (src/utils/ledger.ts) ya sabe restar del origen y sumar al destino, y
// finance.ts ya excluye 'transfer' de gasto/ingreso (nunca contamina
// Presupuesto). Sin conversión de divisas: si las cuentas tienen monedas
// distintas se rechaza en vez de sumar/restar números que no son
// comparables — mover soporte de FX real es un problema aparte.
export function resolveTransferBetweenAccounts(candidate: TransferBetweenAccountsCandidate, ctx: ActionValidationContext): ResolveResult {
  const amount = positiveAmount(candidate.amount);
  if (amount === null) return ask('transfer_between_accounts', candidate, [askAmount('amount', 'No reconocí un monto claro para transferir — dime un número, por ejemplo "500".')]);
  const fromAccount = resolveAccountByNameHint(candidate.fromAccountNameHint, ctx.accounts);
  if (!fromAccount) return ask('transfer_between_accounts', candidate, [askAccount('fromAccountNameHint', candidate.fromAccountNameHint, ctx, 'cuenta de origen')]);
  const toAccount = resolveAccountByNameHint(candidate.toAccountNameHint, ctx.accounts);
  if (!toAccount) return ask('transfer_between_accounts', candidate, [askAccount('toAccountNameHint', candidate.toAccountNameHint, ctx, 'cuenta de destino')]);
  if (fromAccount.id === toAccount.id) return { ok: false, reason: 'La cuenta de origen y destino no pueden ser la misma.' };
  if (fromAccount.currency !== toAccount.currency) {
    return { ok: false, reason: `"${fromAccount.name}" y "${toAccount.name}" usan monedas distintas — todavía no puedo convertir entre ellas.` };
  }
  const args: TransferBetweenAccountsArgs = {
    fromAccountId: fromAccount.id,
    fromAccountName: fromAccount.name,
    toAccountId: toAccount.id,
    toAccountName: toAccount.name,
    amount,
    currency: fromAccount.currency,
  };
  const summary = `Transferir ${formatCurrency(amount, fromAccount.currency)} de "${fromAccount.name}" a "${toAccount.name}"`;
  return { ok: true, action: { type: 'transfer_between_accounts', args }, summary };
}

// ---------- Cuentas ----------

export function resolveAddAccount(candidate: AddAccountCandidate, ctx: ActionValidationContext): ResolveResult {
  const name = cleanString(candidate.name);
  if (name.length < 2) return ask('add_account', candidate, [askName('name', 'Necesito un nombre para la cuenta — por ejemplo "Banorte" o "Nu".')]);
  const accountType = resolveAccountType(candidate.accountTypeHint);
  const currency = resolveCurrency(candidate.currency, ctx.primaryCurrency);
  const balance = finiteAmount(candidate.balance) ?? 0;
  const args: AddAccountArgs = { name, accountType, currency, balance };
  const summary = `Agregar la cuenta "${name}" (${ACCOUNT_TYPE_LABELS[accountType]}) con ${formatCurrency(balance, currency)} de saldo inicial`;
  return { ok: true, action: { type: 'add_account', args }, summary };
}

export function resolveDeleteAccount(candidate: DeleteAccountCandidate, ctx: ActionValidationContext): ResolveResult {
  const account = resolveAccountByNameHint(candidate.accountNameHint, ctx.accounts);
  if (!account) return ask('delete_account', candidate, [askAccount('accountNameHint', candidate.accountNameHint, ctx)]);
  const args: DeleteAccountArgs = { accountId: account.id, accountName: account.name };
  return { ok: true, action: { type: 'delete_account', args }, summary: `Borrar la cuenta "${account.name}"` };
}

// ---------- Metas ----------

export function resolveAddGoal(candidate: AddGoalCandidate, ctx: ActionValidationContext): ResolveResult {
  const name = cleanString(candidate.name);
  if (name.length < 2) return ask('add_goal', candidate, [askName('name', 'Necesito un nombre para la meta.')]);
  const targetAmount = positiveAmount(candidate.targetAmount);
  if (targetAmount === null) return ask('add_goal', candidate, [askAmount('targetAmount', 'Necesito un monto objetivo claro para la meta.')]);
  const currency = resolveCurrency(candidate.currency, ctx.primaryCurrency);
  let targetDate: string | undefined;
  if (candidate.targetDate !== undefined && candidate.targetDate !== null && candidate.targetDate !== '') {
    const day = dateOnly(candidate.targetDate);
    if (!day || day < todayOf(ctx)) return ask('add_goal', candidate, [askDate('targetDate', 'La fecha de la meta debe ser de hoy en adelante. ¿Para qué fecha? Por ejemplo "el 15 de diciembre".')]);
    targetDate = day;
  }
  const args: AddGoalArgs = { name, targetAmount, currency, ...(targetDate ? { targetDate } : {}) };
  return {
    ok: true,
    action: { type: 'add_goal', args },
    summary: `Crear la meta "${name}" con objetivo de ${formatCurrency(targetAmount, currency)}${targetDate ? ` para el ${formatDateDMY(targetDate)}` : ''}`,
  };
}

export function resolveContributeToGoal(candidate: ContributeToGoalCandidate, ctx: ActionValidationContext): ResolveResult {
  const amount = positiveAmount(candidate.amount);
  if (amount === null) return ask('contribute_to_goal', candidate, [askAmount('amount', 'No reconocí un monto claro para aportar.')]);
  const goal = resolveGoalByNameHint(candidate.goalNameHint, ctx.goals);
  if (!goal) return ask('contribute_to_goal', candidate, [askGoal(candidate.goalNameHint, ctx)]);
  const args: ContributeToGoalArgs = { goalId: goal.id, goalName: goal.name, amount, currency: goal.currency };
  return { ok: true, action: { type: 'contribute_to_goal', args }, summary: `Aportar ${formatCurrency(amount, goal.currency)} a la meta "${goal.name}"` };
}

export function resolveUpdateGoalTarget(candidate: UpdateGoalTargetCandidate, ctx: ActionValidationContext): ResolveResult {
  const targetAmount = positiveAmount(candidate.targetAmount);
  if (targetAmount === null) return ask('update_goal_target', candidate, [askAmount('targetAmount', 'No reconocí un monto objetivo claro.')]);
  const goal = resolveGoalByNameHint(candidate.goalNameHint, ctx.goals);
  if (!goal) return ask('update_goal_target', candidate, [askGoal(candidate.goalNameHint, ctx)]);
  const args: UpdateGoalTargetArgs = { goalId: goal.id, goalName: goal.name, targetAmount, currency: goal.currency };
  return {
    ok: true,
    action: { type: 'update_goal_target', args },
    summary: `Cambiar el objetivo de "${goal.name}": ${formatCurrency(goal.targetAmount, goal.currency)} → ${formatCurrency(targetAmount, goal.currency)}`,
  };
}

export function resolveWithdrawFromGoal(candidate: WithdrawFromGoalCandidate, ctx: ActionValidationContext): ResolveResult {
  const amount = positiveAmount(candidate.amount);
  if (amount === null) return ask('withdraw_from_goal', candidate, [askAmount('amount', 'No reconocí un monto claro para retirar.')]);
  const goal = resolveGoalByNameHint(candidate.goalNameHint, ctx.goals);
  if (!goal) return ask('withdraw_from_goal', candidate, [askGoal(candidate.goalNameHint, ctx)]);
  if (amount > goal.currentAmount) {
    return ask('withdraw_from_goal', candidate, [
      askAmount('amount', `La meta "${goal.name}" solo tiene ${formatCurrency(goal.currentAmount, goal.currency)}: no puedo retirar ${formatCurrency(amount, goal.currency)}. ¿Cuánto retiras?`),
    ]);
  }
  const args: WithdrawFromGoalArgs = { goalId: goal.id, goalName: goal.name, amount, currency: goal.currency };
  return {
    ok: true,
    action: { type: 'withdraw_from_goal', args },
    summary: `Retirar ${formatCurrency(amount, goal.currency)} de la meta "${goal.name}" (quedaría en ${formatCurrency(goal.currentAmount - amount, goal.currency)})`,
  };
}

export function resolveUpdateGoalDate(candidate: UpdateGoalDateCandidate, ctx: ActionValidationContext): ResolveResult {
  const goal = resolveGoalByNameHint(candidate.goalNameHint, ctx.goals);
  if (!goal) return ask('update_goal_date', candidate, [askGoal(candidate.goalNameHint, ctx)]);
  const day = dateOnly(candidate.targetDate);
  if (!day) return ask('update_goal_date', candidate, [askDate('targetDate', `¿Para qué fecha quieres la meta "${goal.name}"? Por ejemplo "el 15 de diciembre".`)]);
  if (day < todayOf(ctx)) return ask('update_goal_date', candidate, [askDate('targetDate', 'Esa fecha ya pasó. ¿Para qué fecha futura quieres la meta?')]);
  const args: UpdateGoalDateArgs = { goalId: goal.id, goalName: goal.name, targetDate: day };
  const before = goal.targetDate ? formatDateDMY(goal.targetDate) : 'sin fecha';
  return { ok: true, action: { type: 'update_goal_date', args }, summary: `Fecha objetivo de "${goal.name}": ${before} → ${formatDateDMY(day)}` };
}

export function resolveDeleteGoal(candidate: DeleteGoalCandidate, ctx: ActionValidationContext): ResolveResult {
  const goal = resolveGoalByNameHint(candidate.goalNameHint, ctx.goals);
  if (!goal) return ask('delete_goal', candidate, [askGoal(candidate.goalNameHint, ctx)]);
  const args: DeleteGoalArgs = { goalId: goal.id, goalName: goal.name };
  return { ok: true, action: { type: 'delete_goal', args }, summary: `Borrar la meta "${goal.name}"` };
}

// ---------- Deudas ----------

export function resolveAddLiability(candidate: AddLiabilityCandidate, ctx: ActionValidationContext): ResolveResult {
  const institution = cleanString(candidate.institution);
  if (institution.length < 2) return ask('add_liability', candidate, [askName('institution', 'Necesito el nombre de la institución o deuda.')]);
  const balance = positiveAmount(candidate.balance);
  if (balance === null) return ask('add_liability', candidate, [askAmount('balance', 'Necesito un saldo claro para la deuda.')]);
  const liabilityType = resolveLiabilityType(candidate.liabilityTypeHint);
  const currency = resolveCurrency(candidate.currency, ctx.primaryCurrency);
  const args: AddLiabilityArgs = { institution, liabilityType, balance, currency };
  return {
    ok: true,
    action: { type: 'add_liability', args },
    summary: `Agregar la deuda "${institution}" (${LIABILITY_TYPE_LABELS[liabilityType]}) con saldo de ${formatCurrency(balance, currency)}`,
  };
}

export function resolveUpdateLiabilityBalance(candidate: UpdateLiabilityBalanceCandidate, ctx: ActionValidationContext): ResolveResult {
  const balance = finiteAmount(candidate.balance);
  if (balance === null || balance < 0) return ask('update_liability_balance', candidate, [askAmount('balance', 'No reconocí un saldo válido.')]);
  const liability = resolveLiabilityByNameHint(candidate.institutionHint, ctx.liabilities);
  if (!liability) return ask('update_liability_balance', candidate, [askLiability(candidate.institutionHint, ctx)]);
  const args: UpdateLiabilityBalanceArgs = { liabilityId: liability.id, institution: liability.institution, balance, currency: liability.currency };
  return {
    ok: true,
    action: { type: 'update_liability_balance', args },
    summary: `Saldo de "${liability.institution}": ${formatCurrency(liability.balance, liability.currency)} → ${formatCurrency(balance, liability.currency)}`,
  };
}

export function resolveUpdateLiabilityDueDate(candidate: UpdateLiabilityDueDateCandidate, ctx: ActionValidationContext): ResolveResult {
  const liability = resolveLiabilityByNameHint(candidate.institutionHint, ctx.liabilities);
  if (!liability) return ask('update_liability_due_date', candidate, [askLiability(candidate.institutionHint, ctx)]);
  const day = dateOnly(candidate.dueDate);
  if (!day) return ask('update_liability_due_date', candidate, [askDate('dueDate', `¿Qué día vence "${liability.institution}"? Por ejemplo "el 20 de octubre".`)]);
  if (day < todayOf(ctx)) return ask('update_liability_due_date', candidate, [askDate('dueDate', 'Esa fecha ya pasó. ¿Qué fecha de vencimiento le pongo?')]);
  const args: UpdateLiabilityDueDateArgs = { liabilityId: liability.id, institution: liability.institution, dueDate: day };
  const before = liability.dueDate ? formatDateDMY(liability.dueDate) : 'sin fecha';
  return { ok: true, action: { type: 'update_liability_due_date', args }, summary: `Vencimiento de "${liability.institution}": ${before} → ${formatDateDMY(day)}` };
}

export function resolveDeleteLiability(candidate: DeleteLiabilityCandidate, ctx: ActionValidationContext): ResolveResult {
  const liability = resolveLiabilityByNameHint(candidate.institutionHint, ctx.liabilities);
  if (!liability) return ask('delete_liability', candidate, [askLiability(candidate.institutionHint, ctx)]);
  const args: DeleteLiabilityArgs = { liabilityId: liability.id, institution: liability.institution };
  return { ok: true, action: { type: 'delete_liability', args }, summary: `Borrar la deuda "${liability.institution}"` };
}

// ---------- Presupuesto (solo montos de la plantilla por defecto) ----------

export function resolveSetBudgetLine(candidate: SetBudgetLineCandidate, ctx: ActionValidationContext): ResolveResult {
  const monthlyAmount = positiveAmount(candidate.monthlyAmount);
  if (monthlyAmount === null) return ask('set_budget_line', candidate, [askAmount('monthlyAmount', 'No reconocí un monto mensual claro.')]);
  const concept = resolveBudgetConcept(candidate.categoryHint);
  if (!concept) return ask('set_budget_line', candidate, [{ field: 'category', slot: 'categoryHint', prompt: `No reconocí la categoría de presupuesto "${candidate.categoryHint}". ¿Cuál es? (por ejemplo comida, renta, transporte)` }]);
  const args: SetBudgetLineArgs = { categoryId: concept.id, categoryName: concept.name, monthlyAmount, currency: ctx.primaryCurrency };
  const current = ctx.templateBudgetLines.find((l) => l.categoryId === concept.id && !l.deletedAt);
  const summary = current
    ? `Presupuesto de "${concept.name}": ${formatCurrency(current.monthlyAmount, current.currency)} → ${formatCurrency(monthlyAmount, ctx.primaryCurrency)} al mes`
    : `Presupuestar ${formatCurrency(monthlyAmount, ctx.primaryCurrency)} al mes para "${concept.name}"`;
  return { ok: true, action: { type: 'set_budget_line', args }, summary };
}

export function resolveDeleteBudgetLine(candidate: DeleteBudgetLineCandidate, ctx: ActionValidationContext): ResolveResult {
  const concept = resolveBudgetConcept(candidate.categoryHint);
  if (!concept) return { ok: false, reason: `No reconocí la categoría de presupuesto "${candidate.categoryHint}".` };
  const line = ctx.templateBudgetLines.find((l) => l.categoryId === concept.id && !l.deletedAt);
  if (!line) return { ok: false, reason: `"${concept.name}" no tiene ningún monto presupuestado todavía.` };
  const args: DeleteBudgetLineArgs = { lineId: line.id, categoryName: concept.name };
  return { ok: true, action: { type: 'delete_budget_line', args }, summary: `Quitar el presupuesto de "${concept.name}"` };
}

// ---------- Transacciones (solo borrar, solo vía LLM) ----------

export function resolveDeleteTransaction(candidate: DeleteTransactionCandidate, ctx: ActionValidationContext): ResolveResult {
  const transactionId = cleanString(candidate.transactionId);
  const tx = ctx.recentTransactions.find((t) => t.id === transactionId);
  if (!tx) return { ok: false, reason: 'No encontré ese movimiento entre los más recientes — descríbelo con más detalle o bórralo desde Movimientos.' };
  const summary = `Borrar el movimiento de ${formatCurrency(tx.amount, tx.currency)}${tx.merchant ? ` en "${tx.merchant}"` : ''} del ${tx.date.slice(0, 10)}`;
  const args: DeleteTransactionArgs = { transactionId: tx.id, transactionSummary: summary };
  return { ok: true, action: { type: 'delete_transaction', args }, summary };
}

// ---------- Reintento con la respuesta de la persona (contrato §2) ----------

// Reconstruye una acción desde (tipo, candidato) con el MISMO resolver de siempre. Lo usa el planificador al
// contestar una aclaración y la prueba del catálogo.
export function resolveCandidate(type: AIActionType, c: Record<string, unknown>, ctx: ActionValidationContext): ResolveResult {
  const s = (k: string) => (typeof c[k] === 'string' ? (c[k] as string) : '');
  switch (type) {
    case 'add_transaction':
      return resolveAddTransaction({ transactionType: c.transactionType === 'income' ? 'income' : 'expense', amount: c.amount, accountNameHint: s('accountNameHint'), categoryId: c.categoryId, subcategoryId: c.subcategoryId, date: c.date }, ctx);
    case 'transfer_between_accounts':
      return resolveTransferBetweenAccounts({ fromAccountNameHint: s('fromAccountNameHint'), toAccountNameHint: s('toAccountNameHint'), amount: c.amount }, ctx);
    case 'add_account':
      return resolveAddAccount({ name: c.name, accountTypeHint: c.accountTypeHint, balance: c.balance, currency: c.currency }, ctx);
    case 'delete_account':
      return resolveDeleteAccount({ accountNameHint: s('accountNameHint') }, ctx);
    case 'add_goal':
      return resolveAddGoal({ name: c.name, targetAmount: c.targetAmount, currency: c.currency, targetDate: c.targetDate }, ctx);
    case 'contribute_to_goal':
      return resolveContributeToGoal({ goalNameHint: s('goalNameHint'), amount: c.amount }, ctx);
    case 'withdraw_from_goal':
      return resolveWithdrawFromGoal({ goalNameHint: s('goalNameHint'), amount: c.amount }, ctx);
    case 'update_goal_date':
      return resolveUpdateGoalDate({ goalNameHint: s('goalNameHint'), targetDate: c.targetDate }, ctx);
    case 'update_liability_due_date':
      return resolveUpdateLiabilityDueDate({ institutionHint: s('institutionHint'), dueDate: c.dueDate }, ctx);
    case 'update_goal_target':
      return resolveUpdateGoalTarget({ goalNameHint: s('goalNameHint'), targetAmount: c.targetAmount }, ctx);
    case 'delete_goal':
      return resolveDeleteGoal({ goalNameHint: s('goalNameHint') }, ctx);
    case 'add_liability':
      return resolveAddLiability({ institution: c.institution, liabilityTypeHint: c.liabilityTypeHint, balance: c.balance, currency: c.currency }, ctx);
    case 'update_liability_balance':
      return resolveUpdateLiabilityBalance({ institutionHint: s('institutionHint'), balance: c.balance }, ctx);
    case 'delete_liability':
      return resolveDeleteLiability({ institutionHint: s('institutionHint') }, ctx);
    case 'set_budget_line':
      return resolveSetBudgetLine({ categoryHint: s('categoryHint'), monthlyAmount: c.monthlyAmount }, ctx);
    case 'delete_budget_line':
      return resolveDeleteBudgetLine({ categoryHint: s('categoryHint') }, ctx);
    case 'delete_transaction':
      return resolveDeleteTransaction({ transactionId: c.transactionId }, ctx);
    case 'add_forecast':
    case 'confirm_forecast':
    case 'skip_forecast':
    case 'postpone_forecast':
    case 'add_recurring':
    case 'add_recurring_contribution':
    case 'update_recurring_amount':
    case 'pause_recurring':
    case 'resume_recurring':
    case 'end_recurring':
    case 'add_reminder':
    case 'cancel_reminder':
    case 'pay_liability':
    case 'settle_liability':
    case 'register_dividend':
    case 'set_card_dates':
      return resolveCandidateP3(type, c, ctx);
    default: {
      const exhaustive: never = type;
      return { ok: false, reason: `Tipo de acción no reconocido: ${exhaustive}` };
    }
  }
}

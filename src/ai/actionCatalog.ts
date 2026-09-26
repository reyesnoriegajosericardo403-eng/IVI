import { ACCOUNT_TYPE_LABELS, LIABILITY_TYPE_LABELS } from '@/data/accountMeta';
import { BUDGET_CONCEPTS, findBudgetConcept, type BudgetConcept } from '@/data/budgetConcepts';
import { findSubcategory } from '@/data/categories';
import type { Account, AccountType, Currency, Goal, Liability, LiabilityType, TemplateBudgetLine, Transaction } from '@/data/types';
import { resolveAccountByNameHint, resolveByNameHint, resolveGoalByNameHint, resolveLiabilityByNameHint } from '@/utils/accounts';
import { formatCurrency } from '@/utils/format';

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
  ResolvedAction,
  SetBudgetLineArgs,
  UpdateGoalTargetArgs,
  UpdateLiabilityBalanceArgs,
} from './chatTypes';

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

export interface ActionValidationContext {
  accounts: Account[];
  goals: Goal[];
  liabilities: Liability[];
  templateBudgetLines: TemplateBudgetLine[];
  // Ya recortadas por quien arma el contexto (mismo recorte de 20 que usa
  // financialContext.ts) — nunca la lista completa.
  recentTransactions: Transaction[];
  primaryCurrency: Currency;
}

export interface ResolveOk {
  ok: true;
  action: ResolvedAction;
  summary: string;
}
export interface ResolveErr {
  ok: false;
  reason: string;
}
export type ResolveResult = ResolveOk | ResolveErr;

function positiveAmount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function finiteAmount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

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
}
export interface ContributeToGoalCandidate {
  goalNameHint: string;
  amount: unknown;
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

function resolveCurrency(hint: unknown, fallback: Currency): Currency {
  const upper = cleanString(hint).toUpperCase();
  return (['MXN', 'USD', 'EUR', 'CAD', 'GBP'] as string[]).includes(upper) ? (upper as Currency) : fallback;
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
  if (amount === null) return { ok: false, reason: 'No reconocí un monto claro — dime un número, por ejemplo "500".' };
  const account = resolveAccountByNameHint(candidate.accountNameHint, ctx.accounts);
  if (!account) return { ok: false, reason: `No encontré ninguna cuenta que se llame "${candidate.accountNameHint}".` };

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

  const args: AddTransactionArgs = {
    transactionType,
    amount,
    currency: account.currency,
    categoryId,
    subcategoryId,
    accountId: account.id,
    accountName: account.name,
  };
  const summary = hasValidCategory
    ? `Agregar ${transactionType === 'income' ? 'ingreso' : 'gasto'} de ${formatCurrency(amount, account.currency)} en "${account.name}"`
    : `${transactionType === 'income' ? 'Agregar' : 'Quitar'} ${formatCurrency(amount, account.currency)} ${transactionType === 'income' ? 'a' : 'de'} "${account.name}"`;
  return { ok: true, action: { type: 'add_transaction', args }, summary };
}

// ---------- Cuentas ----------

export function resolveAddAccount(candidate: AddAccountCandidate, ctx: ActionValidationContext): ResolveResult {
  const name = cleanString(candidate.name);
  if (name.length < 2) return { ok: false, reason: 'Necesito un nombre para la cuenta — por ejemplo "Banorte" o "Nu".' };
  const accountType = resolveAccountType(candidate.accountTypeHint);
  const currency = resolveCurrency(candidate.currency, ctx.primaryCurrency);
  const balance = finiteAmount(candidate.balance) ?? 0;
  const args: AddAccountArgs = { name, accountType, currency, balance };
  const summary = `Agregar la cuenta "${name}" (${ACCOUNT_TYPE_LABELS[accountType]}) con ${formatCurrency(balance, currency)} de saldo inicial`;
  return { ok: true, action: { type: 'add_account', args }, summary };
}

export function resolveDeleteAccount(candidate: DeleteAccountCandidate, ctx: ActionValidationContext): ResolveResult {
  const account = resolveAccountByNameHint(candidate.accountNameHint, ctx.accounts);
  if (!account) return { ok: false, reason: `No encontré ninguna cuenta que se llame "${candidate.accountNameHint}".` };
  const args: DeleteAccountArgs = { accountId: account.id, accountName: account.name };
  return { ok: true, action: { type: 'delete_account', args }, summary: `Borrar la cuenta "${account.name}"` };
}

// ---------- Metas ----------

export function resolveAddGoal(candidate: AddGoalCandidate, ctx: ActionValidationContext): ResolveResult {
  const name = cleanString(candidate.name);
  if (name.length < 2) return { ok: false, reason: 'Necesito un nombre para la meta.' };
  const targetAmount = positiveAmount(candidate.targetAmount);
  if (targetAmount === null) return { ok: false, reason: 'Necesito un monto objetivo claro para la meta.' };
  const currency = resolveCurrency(candidate.currency, ctx.primaryCurrency);
  const args: AddGoalArgs = { name, targetAmount, currency };
  return { ok: true, action: { type: 'add_goal', args }, summary: `Crear la meta "${name}" con objetivo de ${formatCurrency(targetAmount, currency)}` };
}

export function resolveContributeToGoal(candidate: ContributeToGoalCandidate, ctx: ActionValidationContext): ResolveResult {
  const amount = positiveAmount(candidate.amount);
  if (amount === null) return { ok: false, reason: 'No reconocí un monto claro para aportar.' };
  const goal = resolveGoalByNameHint(candidate.goalNameHint, ctx.goals);
  if (!goal) return { ok: false, reason: `No encontré ninguna meta que se llame "${candidate.goalNameHint}".` };
  const args: ContributeToGoalArgs = { goalId: goal.id, goalName: goal.name, amount, currency: goal.currency };
  return { ok: true, action: { type: 'contribute_to_goal', args }, summary: `Aportar ${formatCurrency(amount, goal.currency)} a la meta "${goal.name}"` };
}

export function resolveUpdateGoalTarget(candidate: UpdateGoalTargetCandidate, ctx: ActionValidationContext): ResolveResult {
  const targetAmount = positiveAmount(candidate.targetAmount);
  if (targetAmount === null) return { ok: false, reason: 'No reconocí un monto objetivo claro.' };
  const goal = resolveGoalByNameHint(candidate.goalNameHint, ctx.goals);
  if (!goal) return { ok: false, reason: `No encontré ninguna meta que se llame "${candidate.goalNameHint}".` };
  const args: UpdateGoalTargetArgs = { goalId: goal.id, goalName: goal.name, targetAmount, currency: goal.currency };
  return {
    ok: true,
    action: { type: 'update_goal_target', args },
    summary: `Cambiar el objetivo de "${goal.name}": ${formatCurrency(goal.targetAmount, goal.currency)} → ${formatCurrency(targetAmount, goal.currency)}`,
  };
}

export function resolveDeleteGoal(candidate: DeleteGoalCandidate, ctx: ActionValidationContext): ResolveResult {
  const goal = resolveGoalByNameHint(candidate.goalNameHint, ctx.goals);
  if (!goal) return { ok: false, reason: `No encontré ninguna meta que se llame "${candidate.goalNameHint}".` };
  const args: DeleteGoalArgs = { goalId: goal.id, goalName: goal.name };
  return { ok: true, action: { type: 'delete_goal', args }, summary: `Borrar la meta "${goal.name}"` };
}

// ---------- Deudas ----------

export function resolveAddLiability(candidate: AddLiabilityCandidate, ctx: ActionValidationContext): ResolveResult {
  const institution = cleanString(candidate.institution);
  if (institution.length < 2) return { ok: false, reason: 'Necesito el nombre de la institución o deuda.' };
  const balance = positiveAmount(candidate.balance);
  if (balance === null) return { ok: false, reason: 'Necesito un saldo claro para la deuda.' };
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
  if (balance === null || balance < 0) return { ok: false, reason: 'No reconocí un saldo válido.' };
  const liability = resolveLiabilityByNameHint(candidate.institutionHint, ctx.liabilities);
  if (!liability) return { ok: false, reason: `No encontré ninguna deuda con "${candidate.institutionHint}".` };
  const args: UpdateLiabilityBalanceArgs = { liabilityId: liability.id, institution: liability.institution, balance, currency: liability.currency };
  return {
    ok: true,
    action: { type: 'update_liability_balance', args },
    summary: `Saldo de "${liability.institution}": ${formatCurrency(liability.balance, liability.currency)} → ${formatCurrency(balance, liability.currency)}`,
  };
}

export function resolveDeleteLiability(candidate: DeleteLiabilityCandidate, ctx: ActionValidationContext): ResolveResult {
  const liability = resolveLiabilityByNameHint(candidate.institutionHint, ctx.liabilities);
  if (!liability) return { ok: false, reason: `No encontré ninguna deuda con "${candidate.institutionHint}".` };
  const args: DeleteLiabilityArgs = { liabilityId: liability.id, institution: liability.institution };
  return { ok: true, action: { type: 'delete_liability', args }, summary: `Borrar la deuda "${liability.institution}"` };
}

// ---------- Presupuesto (solo montos de la plantilla por defecto) ----------

export function resolveSetBudgetLine(candidate: SetBudgetLineCandidate, ctx: ActionValidationContext): ResolveResult {
  const monthlyAmount = positiveAmount(candidate.monthlyAmount);
  if (monthlyAmount === null) return { ok: false, reason: 'No reconocí un monto mensual claro.' };
  const concept = resolveBudgetConcept(candidate.categoryHint);
  if (!concept) return { ok: false, reason: `No reconocí la categoría de presupuesto "${candidate.categoryHint}".` };
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

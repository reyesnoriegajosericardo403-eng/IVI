import {
  resolveAddAccount,
  resolveAddGoal,
  resolveAddLiability,
  resolveAddTransaction,
  resolveContributeToGoal,
  resolveDeleteAccount,
  resolveDeleteBudgetLine,
  resolveDeleteGoal,
  resolveDeleteLiability,
  resolveDeleteTransaction,
  resolveSetBudgetLine,
  resolveTransferBetweenAccounts,
  resolveUpdateGoalDate,
  resolveUpdateGoalTarget,
  resolveUpdateLiabilityBalance,
  resolveUpdateLiabilityDueDate,
  resolveWithdrawFromGoal,
  type ActionValidationContext,
  type ResolveResult,
} from '@/ai/actionCatalog';
import {
  resolveAddForecast,
  resolveAddRecurring,
  resolveAddRecurringContribution,
  resolveAddReminder,
  resolveCancelReminder,
  resolveConfirmForecast,
  resolveEndRecurring,
  resolvePauseRecurring,
  resolvePayLiability,
  resolvePostponeForecast,
  resolveRegisterDividend,
  resolveResumeRecurring,
  resolveSetCardDates,
  resolveSettleLiability,
  resolveSkipForecast,
  resolveUpdateRecurringAmount,
} from '@/ai/actionCatalogP3';
import type { AIActionType } from '@/ai/chatTypes';
import { parseCaptureText } from '@/ai/localParser';
import { findSubcategory } from '@/data/categories';

import type { JsonSchema } from './protocol';

// Las acciones que la IA puede PROPONER (nunca aplicar): el mismo catálogo cerrado que usa el reconocimiento local.
// Cada propuesta se resuelve por nombre contra los datos reales y la persona la confirma manteniendo presionado.

export const MODEL_ACTION_TYPES: AIActionType[] = [
  'add_transaction',
  'add_forecast',
  'transfer_between_accounts',
  'delete_transaction',
  'add_account',
  'delete_account',
  'add_goal',
  'contribute_to_goal',
  'withdraw_from_goal',
  'update_goal_target',
  'update_goal_date',
  'delete_goal',
  'add_liability',
  'update_liability_balance',
  'update_liability_due_date',
  'delete_liability',
  'pay_liability',
  'settle_liability',
  'set_budget_line',
  'delete_budget_line',
  'confirm_forecast',
  'skip_forecast',
  'postpone_forecast',
  'add_recurring',
  'add_recurring_contribution',
  'update_recurring_amount',
  'pause_recurring',
  'resume_recurring',
  'end_recurring',
  'add_reminder',
  'cancel_reminder',
  'set_card_dates',
  'register_dividend',
];

// Guía de campos por tipo (va en la descripción de la herramienta). Los "Hint" son NOMBRES tal como los dice la persona
// o como aparecen en los datos: la app los busca entre sus datos reales; nunca hace falta inventar un id.
export const ACTION_GUIDE = `Tipos y campos (usa solo los que apliquen):
- add_transaction: gasto o ingreso que YA pasó. transactionType "expense"|"income", amount, accountNameHint (cuenta de donde sale o a donde entra), concepto (qué fue: "tacos", "uber", "sueldo"; la app elige la categoría), date AAAA-MM-DD solo si fue un día pasado.
- add_forecast: algo que AÚN NO pasa (hoy o futuro). transactionType, amount, accountNameHint, concepto, merchant, date AAAA-MM-DD. No mueve saldos hasta confirmarlo.
- transfer_between_accounts: mover dinero entre DOS cuentas propias. fromAccountNameHint, toAccountNameHint, amount.
- delete_transaction: transactionId (id real de buscar_movimientos).
- add_account: name, accountTypeHint "banco"|"efectivo"|"tarjeta"|"ahorro"|"inversion", balance.
- delete_account: accountNameHint.
- add_goal: name, targetAmount, targetDate opcional.
- contribute_to_goal / withdraw_from_goal: goalNameHint, amount.
- update_goal_target: goalNameHint, targetAmount. update_goal_date: goalNameHint, targetDate. delete_goal: goalNameHint.
- add_liability: institution, liabilityTypeHint ("tarjeta", "prestamo", "hipoteca", "auto", "otro"), balance.
- update_liability_balance: institutionHint, balance. update_liability_due_date: institutionHint, dueDate. delete_liability: institutionHint.
- pay_liability: institutionHint, amount, accountNameHint (cuenta de la que sale; o a la que entra si te pagan a ti). settle_liability: institutionHint (quedó totalmente pagada).
- set_budget_line: categoryHint (concepto de presupuesto, ej. "comida", "transporte"), monthlyAmount. delete_budget_line: categoryHint.
- confirm_forecast: forecastHint (nombre del previsto), amount solo si fue otro monto. skip_forecast: forecastHint (no ocurrió). postpone_forecast: forecastHint, newDate.
- add_recurring: name, transactionType, amount, accountNameHint, concepto, recurrence. add_recurring_contribution: goalNameHint, amount, recurrence.
- update_recurring_amount: ruleHint, amount. pause_recurring / resume_recurring / end_recurring: ruleHint.
- add_reminder: title (sin montos), date (una vez) o recurrence (si se repite), timeOfDay "HH:MM", advanceDays [días antes], maxAttempts 1-3. cancel_reminder: reminderHint.
- set_card_dates: accountNameHint (tarjeta de crédito), cutoffDay 1-31, dueDay 1-31.
- register_dividend: tickerHint, amount, accountNameHint opcional.
recurrence: frequency "daily"|"weekly"|"semimonthly"|"monthly"|"yearly", interval (1 = cada vez), startDate AAAA-MM-DD, dayOfMonth (31 = último día), weekdays [0=domingo … 6=sábado].`;

const S = (description: string): JsonSchema => ({ type: 'string', description });
const N = (description: string): JsonSchema => ({ type: 'number', description });
const I = (description: string): JsonSchema => ({ type: 'integer', description });

export const ACTION_ITEM_SCHEMA: JsonSchema = {
  type: 'object',
  description: 'Una acción del catálogo.',
  properties: {
    type: { type: 'string', enum: MODEL_ACTION_TYPES, description: 'Tipo de acción' },
    transactionType: { type: 'string', enum: ['expense', 'income'], description: 'expense = gasto, income = ingreso' },
    amount: N('Monto, número positivo'),
    concepto: S('Qué fue, en pocas palabras (la app elige la categoría con su catálogo)'),
    merchant: S('Comercio o nombre corto del movimiento'),
    accountNameHint: S('Nombre de la cuenta'),
    fromAccountNameHint: S('Cuenta origen'),
    toAccountNameHint: S('Cuenta destino'),
    date: S('AAAA-MM-DD'),
    name: S('Nombre'),
    accountTypeHint: { type: 'string', enum: ['banco', 'efectivo', 'tarjeta', 'ahorro', 'inversion'] },
    balance: N('Saldo'),
    targetAmount: N('Monto objetivo de la meta'),
    targetDate: S('AAAA-MM-DD'),
    goalNameHint: S('Nombre de la meta'),
    institution: S('Institución o persona de la deuda nueva'),
    institutionHint: S('Nombre de la deuda existente'),
    liabilityTypeHint: S('tarjeta, prestamo, hipoteca, auto u otro'),
    dueDate: S('AAAA-MM-DD'),
    categoryHint: S('Concepto de presupuesto'),
    monthlyAmount: N('Monto mensual'),
    transactionId: S('Id real del movimiento'),
    forecastHint: S('Nombre del previsto'),
    newDate: S('AAAA-MM-DD'),
    ruleHint: S('Nombre del pago recurrente'),
    recurrence: {
      type: 'object',
      description: 'Cómo se repite',
      properties: {
        frequency: { type: 'string', enum: ['daily', 'weekly', 'semimonthly', 'monthly', 'yearly'] },
        interval: I('Cada cuántas (1 = cada vez)'),
        startDate: S('AAAA-MM-DD'),
        dayOfMonth: I('Día del mes (31 = último día)'),
        weekdays: { type: 'array', items: { type: 'integer' }, description: '0=domingo … 6=sábado' },
      },
    },
    title: S('Título del aviso (sin montos)'),
    timeOfDay: S('HH:MM'),
    advanceDays: { type: 'array', items: { type: 'integer' }, description: 'Avisos previos, en días' },
    maxAttempts: I('1 a 3 intentos'),
    reminderHint: S('Nombre del aviso'),
    tickerHint: S('Clave de la inversión, ej. FUNO11'),
    cutoffDay: I('Día de corte 1-31'),
    dueDay: I('Día límite de pago 1-31'),
  },
  required: ['type'],
};

// El modelo manda `null` en lo que no aplica: se quita para que el resolver vea "no dicho" y no un valor basura.
function cleanRecurrence(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return undefined;
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([, v]) => v !== null && v !== undefined));
}

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

// Si la IA no dio una categoría válida del catálogo, la elige el motor local con lo que fue ("tacos" → Comida).
export function withLocalCategory(a: Record<string, unknown>): Record<string, unknown> {
  const categoryId = str(a.categoryId);
  const subcategoryId = str(a.subcategoryId);
  if (categoryId && subcategoryId && findSubcategory(categoryId, subcategoryId)) return a;
  const what = str(a.concepto) || str(a.merchant) || str(a.name);
  if (!what) return a;
  const parsed = parseCaptureText(a.transactionType === 'income' ? `me pagaron ${what}` : what);
  if (!parsed.categoryId || !parsed.subcategoryId) return a;
  if (a.transactionType === 'income' && parsed.categoryId !== 'income') return a;
  if (a.transactionType !== 'income' && parsed.categoryId === 'income') return a;
  return { ...a, categoryId: parsed.categoryId, subcategoryId: parsed.subcategoryId };
}

// Convierte la acción cruda del modelo (nada confiable todavía) en un resultado validado contra los datos reales.
export function resolveModelAction(raw: unknown, ctx: ActionValidationContext): ResolveResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  switch (a.type) {
    case 'add_transaction': {
      const c = withLocalCategory(a);
      const r = resolveAddTransaction(
        { transactionType: c.transactionType === 'income' ? 'income' : 'expense', amount: c.amount, accountNameHint: str(c.accountNameHint), categoryId: c.categoryId, subcategoryId: c.subcategoryId, date: c.date },
        ctx
      );
      const merchant = str(a.merchant) || str(a.concepto);
      if (r.ok && merchant) (r.action.args as unknown as Record<string, unknown>).merchant = merchant.slice(0, 60);
      return r;
    }
    case 'add_account':
      return resolveAddAccount({ name: a.name, accountTypeHint: a.accountTypeHint, balance: a.balance }, ctx);
    case 'delete_account':
      return resolveDeleteAccount({ accountNameHint: str(a.accountNameHint) }, ctx);
    case 'add_goal':
      return resolveAddGoal({ name: a.name, targetAmount: a.targetAmount, targetDate: a.targetDate }, ctx);
    case 'contribute_to_goal':
      return resolveContributeToGoal({ goalNameHint: str(a.goalNameHint), amount: a.amount }, ctx);
    case 'withdraw_from_goal':
      return resolveWithdrawFromGoal({ goalNameHint: str(a.goalNameHint), amount: a.amount }, ctx);
    case 'update_goal_date':
      return resolveUpdateGoalDate({ goalNameHint: str(a.goalNameHint), targetDate: a.targetDate }, ctx);
    case 'update_liability_due_date':
      return resolveUpdateLiabilityDueDate({ institutionHint: str(a.institutionHint), dueDate: a.dueDate }, ctx);
    case 'update_goal_target':
      return resolveUpdateGoalTarget({ goalNameHint: str(a.goalNameHint), targetAmount: a.targetAmount }, ctx);
    case 'delete_goal':
      return resolveDeleteGoal({ goalNameHint: str(a.goalNameHint) }, ctx);
    case 'add_liability':
      return resolveAddLiability({ institution: a.institution, liabilityTypeHint: a.liabilityTypeHint, balance: a.balance }, ctx);
    case 'update_liability_balance':
      return resolveUpdateLiabilityBalance({ institutionHint: str(a.institutionHint), balance: a.balance }, ctx);
    case 'delete_liability':
      return resolveDeleteLiability({ institutionHint: str(a.institutionHint) }, ctx);
    case 'set_budget_line':
      return resolveSetBudgetLine({ categoryHint: str(a.categoryHint), monthlyAmount: a.monthlyAmount }, ctx);
    case 'delete_budget_line':
      return resolveDeleteBudgetLine({ categoryHint: str(a.categoryHint) }, ctx);
    case 'delete_transaction':
      return resolveDeleteTransaction({ transactionId: a.transactionId }, ctx);
    case 'transfer_between_accounts':
      return resolveTransferBetweenAccounts({ fromAccountNameHint: str(a.fromAccountNameHint), toAccountNameHint: str(a.toAccountNameHint), amount: a.amount }, ctx);
    case 'add_forecast': {
      const c = withLocalCategory(a);
      return resolveAddForecast(
        { transactionType: c.transactionType === 'income' ? 'income' : 'expense', amount: c.amount, accountNameHint: str(c.accountNameHint), merchant: c.merchant ?? c.concepto, categoryId: c.categoryId, subcategoryId: c.subcategoryId, date: c.date },
        ctx
      );
    }
    case 'confirm_forecast':
      return resolveConfirmForecast({ forecastHint: str(a.forecastHint), amount: a.amount }, ctx);
    case 'skip_forecast':
      return resolveSkipForecast({ forecastHint: str(a.forecastHint) }, ctx);
    case 'postpone_forecast':
      return resolvePostponeForecast({ forecastHint: str(a.forecastHint), newDate: a.newDate }, ctx);
    case 'add_recurring': {
      const c = withLocalCategory(a);
      return resolveAddRecurring(
        { name: c.name, transactionType: c.transactionType === 'income' ? 'income' : 'expense', amount: c.amount, accountNameHint: str(c.accountNameHint), categoryId: c.categoryId, subcategoryId: c.subcategoryId, recurrence: cleanRecurrence(c.recurrence) },
        ctx
      );
    }
    case 'add_recurring_contribution':
      return resolveAddRecurringContribution({ name: a.name, goalNameHint: str(a.goalNameHint), amount: a.amount, recurrence: cleanRecurrence(a.recurrence) }, ctx);
    case 'update_recurring_amount':
      return resolveUpdateRecurringAmount({ ruleHint: str(a.ruleHint), amount: a.amount }, ctx);
    case 'pause_recurring':
      return resolvePauseRecurring({ ruleHint: str(a.ruleHint) }, ctx);
    case 'resume_recurring':
      return resolveResumeRecurring({ ruleHint: str(a.ruleHint) }, ctx);
    case 'end_recurring':
      return resolveEndRecurring({ ruleHint: str(a.ruleHint) }, ctx);
    case 'add_reminder':
      return resolveAddReminder(
        { title: a.title, date: a.date ?? undefined, recurrence: cleanRecurrence(a.recurrence), timeOfDay: a.timeOfDay ?? undefined, advanceDays: a.advanceDays ?? undefined, maxAttempts: a.maxAttempts ?? undefined },
        ctx
      );
    case 'cancel_reminder':
      return resolveCancelReminder({ reminderHint: str(a.reminderHint) }, ctx);
    case 'pay_liability':
      return resolvePayLiability({ institutionHint: str(a.institutionHint), amount: a.amount, accountNameHint: str(a.accountNameHint) }, ctx);
    case 'settle_liability':
      return resolveSettleLiability({ institutionHint: str(a.institutionHint) }, ctx);
    case 'register_dividend':
      return resolveRegisterDividend({ tickerHint: str(a.tickerHint), amount: a.amount, accountNameHint: str(a.accountNameHint) }, ctx);
    case 'set_card_dates':
      return resolveSetCardDates({ accountNameHint: str(a.accountNameHint), cutoffDay: a.cutoffDay ?? undefined, dueDay: a.dueDay ?? undefined }, ctx);
    default:
      return null;
  }
}

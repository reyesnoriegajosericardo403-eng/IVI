// Catálogo de acciones de P3 (previsto, recurrentes, avisos, deudas y dividendos). Mismas reglas que actionCatalog.ts:
// una propuesta cruda (de reglas locales o de un modelo, igual de poco confiable) solo se vuelve algo que se puede mostrar
// y aplicar después de resolverse POR NOMBRE contra datos reales y validarse; el texto de confirmación lo arma este código.
import { findSubcategory } from '@/data/categories';
import type { Account, InvestmentPosition, Liability, RecurringRule, Reminder, Transaction } from '@/data/types';
import { resolveAccountByNameHint, resolveByNameHint, resolveGoalByNameHint } from '@/utils/accounts';
import { directionOf, isSettled, validateLiabilityPayment } from '@/utils/debts';
import { formatDateDMY } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import { normalizeAdvanceDays, validateReminderDraft } from '@/utils/p3Validation';
import { describeRecurrence, shortDateEs, validateRecurrence, type Recurrence } from '@/utils/recurrence';

import {
  ask,
  askAmount,
  askDate,
  askName,
  cleanString,
  dateOnly,
  listNames,
  positiveAmount,
  todayOf,
  type ActionValidationContext,
  type ResolveErr,
  type ResolveResult,
} from './catalogCommon';
import type { AIActionType, MissingField, RecurrenceArgs } from './chatTypes';
import { normalize } from './localParser';

const MAX_YEARS_AHEAD = 5;

// ---------- Candidatos crudos ----------

export interface AddForecastCandidate {
  transactionType: 'expense' | 'income';
  amount: unknown;
  accountNameHint: string;
  categoryId?: unknown;
  subcategoryId?: unknown;
  merchant?: unknown;
  date?: unknown; // AAAA-MM-DD, hoy o futuro
}
export interface ForecastRefCandidate {
  forecastHint: string;
  amount?: unknown; // confirm_forecast: monto real si fue otro
  newDate?: unknown; // postpone_forecast
}
export interface AddRecurringCandidate {
  name: unknown;
  transactionType: 'expense' | 'income';
  amount: unknown;
  accountNameHint: string;
  categoryId?: unknown;
  subcategoryId?: unknown;
  recurrence?: unknown;
}
export interface AddRecurringContributionCandidate {
  name?: unknown;
  goalNameHint: string;
  amount: unknown;
  recurrence?: unknown;
}
export interface RuleRefCandidate {
  ruleHint: string;
  amount?: unknown; // update_recurring_amount
}
export interface AddReminderCandidate {
  title: unknown;
  date?: unknown;
  recurrence?: unknown;
  timeOfDay?: unknown;
  advanceDays?: unknown;
  maxAttempts?: unknown;
}
export interface CancelReminderCandidate {
  reminderHint: string;
}
export interface PayLiabilityCandidate {
  institutionHint: string;
  amount: unknown;
  accountNameHint?: string; // '' = no se dijo; 'sin cuenta' = solo ajustar la deuda
}
export interface SettleLiabilityCandidate {
  institutionHint: string;
}
export interface SetCardDatesCandidate {
  accountNameHint: string;
  cutoffDay?: unknown;
  dueDay?: unknown;
}
export interface RegisterDividendCandidate {
  tickerHint: string;
  amount: unknown;
  accountNameHint?: string;
}

// ---------- Utilidades ----------

const money = (n: number, c: string) => formatCurrency(n, c as 'MXN');

function activeAccounts(ctx: ActionValidationContext): Account[] {
  return ctx.accounts.filter((a) => !a.deletedAt);
}

// Cuentas de las que puede salir (o entrar) dinero real de una deuda o un dividendo: no tarjetas de crédito.
function eligibleAccounts(ctx: ActionValidationContext, currency: string): Account[] {
  return activeAccounts(ctx).filter((a) => !a.isLiability && a.currency === currency);
}

const NO_ACCOUNT_RE = /^(sin cuenta|ninguna|ninguna cuenta|no|solo ajusta(?:r)?|solo la deuda|por fuera|por otro lado)$/;

// Cuenta para un pago / dividendo: la nombrada; si no se nombró, la única que cabe; si hay varias, se pregunta.
function resolveMoneyAccount(
  hintRaw: string | undefined,
  ctx: ActionValidationContext,
  currency: string,
  slot: string,
  what: string
): { account?: Account; skip?: boolean; ask?: MissingField; reason?: string } {
  const hint = cleanString(hintRaw);
  if (hint && NO_ACCOUNT_RE.test(normalize(hint))) return { skip: true };
  if (hint) {
    const account = resolveAccountByNameHint(hint, ctx.accounts);
    if (account) return { account };
    return {
      ask: {
        field: 'account',
        slot,
        prompt: `No encontré ninguna cuenta que se llame "${hint}". ¿${what}?${listNames(eligibleAccounts(ctx, currency).map((a) => a.name))} (o dime «sin cuenta» si solo quieres ajustarlo)`,
      },
    };
  }
  const options = eligibleAccounts(ctx, currency);
  if (options.length === 1) return { account: options[0] };
  if (options.length === 0) return { skip: true };
  return { ask: { field: 'account', slot, prompt: `¿${what}?${listNames(options.map((a) => a.name))} (o dime «sin cuenta» si solo quieres ajustarlo)` } };
}

// ---------- Repetición ----------

export function toRecurrenceArgs(raw: unknown, ctx: ActionValidationContext): { ok: true; value: RecurrenceArgs } | { ok: false; reason: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'No entendí cada cuánto se repite.' };
  const r = raw as Record<string, unknown>;
  const startDate = r.startDate === undefined || r.startDate === null || r.startDate === '' ? todayOf(ctx) : dateOnly(r.startDate);
  if (!startDate) return { ok: false, reason: 'La fecha de inicio de la repetición no es válida.' };
  const frequency = r.frequency;
  if (frequency !== 'daily' && frequency !== 'weekly' && frequency !== 'monthly' && frequency !== 'yearly' && frequency !== 'semimonthly') {
    return { ok: false, reason: 'No entendí cada cuánto se repite (diario, semanal, quincenal, mensual o anual).' };
  }
  const value: RecurrenceArgs = {
    frequency,
    interval: typeof r.interval === 'number' ? r.interval : 1,
    startDate,
    ...(typeof r.dayOfMonth === 'number' ? { dayOfMonth: r.dayOfMonth } : {}),
    ...(Array.isArray(r.weekdays) ? { weekdays: r.weekdays.filter((w): w is number => typeof w === 'number') } : {}),
    ...(typeof r.month === 'number' ? { month: r.month } : {}),
    ...(r.endDate ? { endDate: dateOnly(r.endDate) ?? undefined } : {}),
    ...(typeof r.count === 'number' ? { count: r.count } : {}),
  };
  if (startDate < todayOf(ctx)) return { ok: false, reason: 'La primera fecha de la repetición no puede ser pasada.' };
  const err = validateRecurrence(value as Recurrence);
  return err ? { ok: false, reason: err } : { ok: true, value };
}

const askRecurrence = (reason: string): MissingField => ({
  field: 'recurrence',
  slot: 'recurrence',
  prompt: `${reason} ¿Cada cuánto se repite? Por ejemplo "cada mes el día 5", "cada quincena" o "cada semana".`,
});

// ---------- Previstos ----------

function forecastName(t: Transaction): string {
  return cleanString(t.merchant) || findSubcategory(t.categoryId, t.subcategoryId)?.name || 'Movimiento previsto';
}

function openForecasts(ctx: ActionValidationContext): Transaction[] {
  return (ctx.forecasts ?? []).filter((t) => !t.deletedAt && t.status === 'forecast');
}

interface ForecastGroup {
  key: string;
  name: string;
  items: Transaction[];
}

function forecastGroups(ctx: ActionValidationContext): ForecastGroup[] {
  const map = new Map<string, ForecastGroup>();
  for (const t of [...openForecasts(ctx)].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = t.recurringRuleId ?? `m:${normalize(forecastName(t))}`;
    const g = map.get(key) ?? { key, name: forecastName(t), items: [] };
    g.items.push(t);
    map.set(key, g);
  }
  return [...map.values()];
}

const askForecast = (hint: string, ctx: ActionValidationContext, ambiguous?: string[]): MissingField => ({
  field: 'forecast',
  slot: 'forecastHint',
  prompt: ambiguous?.length
    ? `"${hint}" puede ser más de uno: ${ambiguous.slice(0, 6).join(', ')}. ¿Cuál es?`
    : `No encontré ningún movimiento previsto que se llame "${hint}". ¿Cuál es?${listNames(forecastGroups(ctx).map((g) => g.name))}`,
});

// Por nombre; si el nombre calza con varias series distintas, se pregunta. Dentro de la serie, el más antiguo todavía abierto
// ("ya pagué la renta" = la que ya tocaba, no la del mes que viene).
function pickForecast(hint: string, ctx: ActionValidationContext): { tx: Transaction } | { err: MissingField } {
  const groups = forecastGroups(ctx);
  const g = resolveByNameHint(hint, groups, (x) => x.name);
  if (g) return { tx: g.items[0] };
  const h = normalize(hint);
  const partial = h.length >= 2 ? groups.filter((x) => normalize(x.name).includes(h) || h.includes(normalize(x.name))) : [];
  return { err: askForecast(hint, ctx, partial.length > 1 ? partial.map((x) => x.name) : undefined) };
}

const forecastLabel = (t: Transaction) => `${forecastName(t)} (${shortDateEs(t.date.slice(0, 10))})`;

export function resolveAddForecast(c: AddForecastCandidate, ctx: ActionValidationContext): ResolveResult {
  const amount = positiveAmount(c.amount);
  if (amount === null) return ask('add_forecast', c, [askAmount('amount', 'No reconocí un monto claro para el movimiento previsto — dime un número, por ejemplo "500".')]);
  const account = resolveAccountByNameHint(c.accountNameHint, ctx.accounts);
  if (!account) {
    const options = activeAccounts(ctx).filter((a) => !a.isLiability);
    return ask('add_forecast', c, [{ field: 'account', slot: 'accountNameHint', prompt: `${c.accountNameHint?.trim() ? `No encontré ninguna cuenta que se llame "${c.accountNameHint.trim()}". ` : ''}¿De qué cuenta?${listNames(options.map((a) => a.name))}` }]);
  }
  const day = c.date === undefined || c.date === null || c.date === '' ? null : dateOnly(c.date);
  const today = todayOf(ctx);
  if (!day) return ask('add_forecast', c, [askDate('date', '¿Para qué día lo preveo? Por ejemplo "el 15 de octubre" o "el viernes".')]);
  if (day < today) return ask('add_forecast', c, [askDate('date', 'Esa fecha ya pasó: un movimiento previsto es de hoy en adelante. Si ya ocurrió, dime que lo registre. ¿Para qué día lo preveo?')]);
  if (day > `${+today.slice(0, 4) + MAX_YEARS_AHEAD}${today.slice(4)}`) return ask('add_forecast', c, [askDate('date', `Esa fecha queda a más de ${MAX_YEARS_AHEAD} años. ¿Para qué día lo preveo?`)]);
  const transactionType: 'expense' | 'income' = c.transactionType === 'income' ? 'income' : 'expense';
  const catId = cleanString(c.categoryId);
  const subId = cleanString(c.subcategoryId);
  const valid = !!(catId && subId && findSubcategory(catId, subId));
  const categoryId = valid ? catId : transactionType === 'income' ? 'income' : 'miscellaneous';
  const subcategoryId = valid ? subId : transactionType === 'income' ? 'inc_other' : 'misc_other';
  const merchant = cleanString(c.merchant).slice(0, 60) || undefined;
  const label = merchant ?? (valid ? findSubcategory(categoryId, subcategoryId)?.name : undefined);
  return {
    ok: true,
    action: { type: 'add_forecast', args: { transactionType, amount, currency: account.currency, categoryId, subcategoryId, accountId: account.id, accountName: account.name, ...(merchant ? { merchant } : {}), date: day } },
    summary: `Dejar previsto ${transactionType === 'income' ? 'un ingreso' : 'un gasto'} de ${money(amount, account.currency)}${label ? ` (${label})` : ''} en "${account.name}" para el ${formatDateDMY(day)} — no mueve tu saldo hasta que confirmes que ocurrió`,
  };
}

export function resolveConfirmForecast(c: ForecastRefCandidate, ctx: ActionValidationContext): ResolveResult {
  const picked = pickForecast(c.forecastHint, ctx);
  if ('err' in picked) return ask('confirm_forecast', c, [picked.err]);
  const tx = picked.tx;
  let amount: number | undefined;
  if (c.amount !== undefined && c.amount !== null && c.amount !== '') {
    const a = positiveAmount(c.amount);
    if (a === null) return ask('confirm_forecast', c, [askAmount('amount', 'No reconocí el monto real — dime un número, por ejemplo "8100".')]);
    amount = a;
  }
  const final = amount ?? tx.amount;
  if (tx.date.slice(0, 10) > todayOf(ctx)) {
    return { ok: false, reason: `"${forecastLabel(tx)}" todavía no llega. Si ya ocurrió antes, primero dime que lo pospongo a hoy; si no, déjalo como previsto.` };
  }
  return {
    ok: true,
    action: { type: 'confirm_forecast', args: { forecastId: tx.id, label: forecastLabel(tx), ...(amount !== undefined ? { amount } : {}) } },
    summary: `Confirmar que ya ocurrió "${forecastLabel(tx)}" por ${money(final, tx.currency)}${amount !== undefined && amount !== tx.amount ? ` (estaba previsto ${money(tx.amount, tx.currency)})` : ''} — ahora sí cambia tu saldo`,
  };
}

export function resolveSkipForecast(c: ForecastRefCandidate, ctx: ActionValidationContext): ResolveResult {
  const picked = pickForecast(c.forecastHint, ctx);
  if ('err' in picked) return ask('skip_forecast', c, [picked.err]);
  return { ok: true, action: { type: 'skip_forecast', args: { forecastId: picked.tx.id, label: forecastLabel(picked.tx) } }, summary: `Marcar como "no ocurrió" ${forecastLabel(picked.tx)} — no cambia tus saldos` };
}

export function resolvePostponeForecast(c: ForecastRefCandidate, ctx: ActionValidationContext): ResolveResult {
  const picked = pickForecast(c.forecastHint, ctx);
  if ('err' in picked) return ask('postpone_forecast', c, [picked.err]);
  const day = dateOnly(c.newDate);
  if (!day) return ask('postpone_forecast', c, [askDate('newDate', `¿Para qué día pospongo "${forecastLabel(picked.tx)}"? Por ejemplo "el 10 de octubre".`)]);
  if (day < todayOf(ctx)) return ask('postpone_forecast', c, [askDate('newDate', 'Esa fecha ya pasó. ¿Para qué día de hoy en adelante?')]);
  return { ok: true, action: { type: 'postpone_forecast', args: { forecastId: picked.tx.id, label: forecastLabel(picked.tx), newDate: day } }, summary: `Posponer ${forecastLabel(picked.tx)} para el ${formatDateDMY(day)}` };
}

// ---------- Recurrentes ----------

function liveRules(ctx: ActionValidationContext): RecurringRule[] {
  return (ctx.recurringRules ?? []).filter((r) => !r.deletedAt && r.status !== 'ended');
}

const askRule = (hint: string, ctx: ActionValidationContext): MissingField => ({
  field: 'rule',
  slot: 'ruleHint',
  prompt: `No encontré ningún pago recurrente que se llame "${hint}". ¿Cuál es?${listNames(liveRules(ctx).map((r) => r.name))}`,
});

export function resolveAddRecurring(c: AddRecurringCandidate, ctx: ActionValidationContext): ResolveResult {
  const name = cleanString(c.name).slice(0, 80);
  if (name.length < 2) return ask('add_recurring', c, [askName('name', '¿Cómo le llamo a este pago? Por ejemplo "Renta" o "Netflix".')]);
  const amount = positiveAmount(c.amount);
  if (amount === null) return ask('add_recurring', c, [askAmount('amount', 'No reconocí un monto claro — dime un número, por ejemplo "8000".')]);
  const account = resolveAccountByNameHint(c.accountNameHint, ctx.accounts);
  if (!account) {
    const options = activeAccounts(ctx).filter((a) => !a.isLiability);
    return ask('add_recurring', c, [{ field: 'account', slot: 'accountNameHint', prompt: `${c.accountNameHint?.trim() ? `No encontré ninguna cuenta que se llame "${c.accountNameHint.trim()}". ` : ''}¿De qué cuenta?${listNames(options.map((a) => a.name))}` }]);
  }
  const rec = toRecurrenceArgs(c.recurrence, ctx);
  if (!rec.ok) return ask('add_recurring', c, [askRecurrence(rec.reason)]);
  const transactionType: 'expense' | 'income' = c.transactionType === 'income' ? 'income' : 'expense';
  const catId = cleanString(c.categoryId);
  const subId = cleanString(c.subcategoryId);
  const valid = !!(catId && subId && findSubcategory(catId, subId));
  const categoryId = valid ? catId : transactionType === 'income' ? 'income' : 'miscellaneous';
  const subcategoryId = valid ? subId : transactionType === 'income' ? 'inc_other' : 'misc_other';
  return {
    ok: true,
    action: { type: 'add_recurring', args: { name, transactionType, amount, currency: account.currency, categoryId, subcategoryId, accountId: account.id, accountName: account.name, recurrence: rec.value } },
    summary: `Crear el pago recurrente "${name}": ${transactionType === 'income' ? 'ingreso' : 'gasto'} de ${money(amount, account.currency)} en "${account.name}", ${describeRecurrence(rec.value as Recurrence)}, desde el ${formatDateDMY(rec.value.startDate)} — te aviso cada vez y tus saldos solo cambian cuando confirmes`,
  };
}

export function resolveAddRecurringContribution(c: AddRecurringContributionCandidate, ctx: ActionValidationContext): ResolveResult {
  const amount = positiveAmount(c.amount);
  if (amount === null) return ask('add_recurring_contribution', c, [askAmount('amount', 'No reconocí un monto claro para aportar.')]);
  const goal = resolveGoalByNameHint(c.goalNameHint, ctx.goals);
  if (!goal) {
    return ask('add_recurring_contribution', c, [
      { field: 'goal', slot: 'goalNameHint', prompt: `No encontré ninguna meta que se llame "${c.goalNameHint}". ¿Cuál es?${listNames(ctx.goals.filter((g) => !g.deletedAt).map((g) => g.name))}` },
    ]);
  }
  const rec = toRecurrenceArgs(c.recurrence, ctx);
  if (!rec.ok) return ask('add_recurring_contribution', c, [askRecurrence(rec.reason)]);
  const name = cleanString(c.name).slice(0, 80) || `Aportación a ${goal.name}`;
  return {
    ok: true,
    action: { type: 'add_recurring_contribution', args: { name, goalId: goal.id, goalName: goal.name, amount, currency: goal.currency, recurrence: rec.value } },
    summary: `Aportar ${money(amount, goal.currency)} a la meta "${goal.name}" ${describeRecurrence(rec.value as Recurrence)}, desde el ${formatDateDMY(rec.value.startDate)} — te aviso cada vez para que confirmes`,
  };
}

export function resolveUpdateRecurringAmount(c: RuleRefCandidate, ctx: ActionValidationContext): ResolveResult {
  const amount = positiveAmount(c.amount);
  if (amount === null) return ask('update_recurring_amount', c, [askAmount('amount', 'No reconocí el monto nuevo — dime un número, por ejemplo "9000".')]);
  const rule = resolveByNameHint(c.ruleHint, liveRules(ctx), (r) => r.name);
  if (!rule) return ask('update_recurring_amount', c, [askRule(c.ruleHint, ctx)]);
  if (rule.amount === amount) return { ok: false, reason: `"${rule.name}" ya es de ${money(amount, rule.currency)}.` };
  return {
    ok: true,
    action: { type: 'update_recurring_amount', args: { ruleId: rule.id, ruleName: rule.name, amount, currency: rule.currency } },
    summary: `Cambiar "${rule.name}": ${money(rule.amount, rule.currency)} → ${money(amount, rule.currency)} (aplica a los próximos; lo que ya confirmaste no cambia)`,
  };
}

function resolveRuleState(type: 'pause_recurring' | 'resume_recurring' | 'end_recurring', c: RuleRefCandidate, ctx: ActionValidationContext): ResolveResult {
  const rule = resolveByNameHint(c.ruleHint, liveRules(ctx), (r) => r.name);
  if (!rule) return ask(type, c, [askRule(c.ruleHint, ctx)]);
  if (type === 'pause_recurring') {
    if (rule.status === 'paused') return { ok: false, reason: `"${rule.name}" ya está en pausa.` };
    return { ok: true, action: { type, args: { ruleId: rule.id, ruleName: rule.name } }, summary: `Pausar "${rule.name}" — no genera previstos ni avisos hasta que lo reanudes` };
  }
  if (type === 'resume_recurring') {
    if (rule.status !== 'paused') return { ok: false, reason: `"${rule.name}" no está en pausa.` };
    return { ok: true, action: { type, args: { ruleId: rule.id, ruleName: rule.name } }, summary: `Reanudar "${rule.name}"` };
  }
  return { ok: true, action: { type, args: { ruleId: rule.id, ruleName: rule.name } }, summary: `Terminar "${rule.name}" — se quitan sus previstos que aún no pasan; lo ya confirmado se queda` };
}
export const resolvePauseRecurring = (c: RuleRefCandidate, ctx: ActionValidationContext) => resolveRuleState('pause_recurring', c, ctx);
export const resolveResumeRecurring = (c: RuleRefCandidate, ctx: ActionValidationContext) => resolveRuleState('resume_recurring', c, ctx);
export const resolveEndRecurring = (c: RuleRefCandidate, ctx: ActionValidationContext) => resolveRuleState('end_recurring', c, ctx);

// ---------- Avisos ----------

function liveReminders(ctx: ActionValidationContext): Reminder[] {
  return (ctx.reminders ?? []).filter((r) => !r.deletedAt && r.status !== 'cancelled' && r.sourceType !== 'rule');
}

export function resolveAddReminder(c: AddReminderCandidate, ctx: ActionValidationContext): ResolveResult {
  const title = cleanString(c.title).slice(0, 80);
  if (title.length < 2) return ask('add_reminder', c, [askName('title', '¿De qué quieres que te avise? Por ejemplo "pagar la luz".')]);
  const hasRec = c.recurrence !== undefined && c.recurrence !== null;
  let recurrence: RecurrenceArgs | undefined;
  let date: string | undefined;
  if (hasRec) {
    const rec = toRecurrenceArgs(c.recurrence, ctx);
    if (!rec.ok) return ask('add_reminder', c, [askRecurrence(rec.reason)]);
    recurrence = rec.value;
  } else {
    const day = c.date === undefined || c.date === null || c.date === '' ? null : dateOnly(c.date);
    if (!day) return ask('add_reminder', c, [askDate('date', `¿Para qué día te aviso de "${title}"? Por ejemplo "el 15 de octubre" o "mañana".`)]);
    if (day < todayOf(ctx)) return ask('add_reminder', c, [askDate('date', 'Esa fecha ya pasó. ¿Para qué día de hoy en adelante?')]);
    date = day;
  }
  const timeOfDay = typeof c.timeOfDay === 'string' && /^\d{1,2}:\d{2}$/.test(c.timeOfDay) ? c.timeOfDay.padStart(5, '0') : '09:00';
  const advanceDays = normalizeAdvanceDays(Array.isArray(c.advanceDays) ? (c.advanceDays as unknown[]).filter((n): n is number => typeof n === 'number') : []);
  const maxAttempts = typeof c.maxAttempts === 'number' ? Math.max(1, Math.min(3, Math.round(c.maxAttempts))) : 1;
  const err = validateReminderDraft({ title, date, recurrence: recurrence as Recurrence | undefined, timeOfDay, advanceDays, maxAttempts });
  if (err) return { ok: false, reason: err };
  const when = recurrence ? describeRecurrence(recurrence as Recurrence) : `el ${formatDateDMY(date!)}`;
  const adv = advanceDays.length ? `, con aviso ${advanceDays.map((d) => (d === 1 ? '1 día' : `${d} días`)).join(' y ')} antes` : '';
  const tries = maxAttempts > 1 ? `, insistiendo hasta ${maxAttempts} veces si no lo confirmas` : '';
  return {
    ok: true,
    action: { type: 'add_reminder', args: { title, ...(date ? { date } : {}), ...(recurrence ? { recurrence } : {}), timeOfDay, advanceDays, maxAttempts } },
    summary: `Avisarte de "${title}" ${when} a las ${timeOfDay}${adv}${tries}`,
  };
}

export function resolveCancelReminder(c: CancelReminderCandidate, ctx: ActionValidationContext): ResolveResult {
  const list = liveReminders(ctx);
  const r = resolveByNameHint(c.reminderHint, list, (x) => x.title);
  if (!r) {
    return ask('cancel_reminder', c, [{ field: 'reminder', slot: 'reminderHint', prompt: `No encontré ningún aviso que se llame "${c.reminderHint}". ¿Cuál es?${listNames(list.map((x) => x.title))}` }]);
  }
  return { ok: true, action: { type: 'cancel_reminder', args: { reminderId: r.id, title: r.title } }, summary: `Quitar el aviso "${r.title}"` };
}

// ---------- Deudas y dividendos ----------

const askOpenLiability = (hint: string, ctx: ActionValidationContext): MissingField => ({
  field: 'liability',
  slot: 'institutionHint',
  prompt: `No encontré ninguna deuda abierta con "${hint}". ¿Cuál es?${listNames(ctx.liabilities.filter((l) => !l.deletedAt && !isSettled(l)).map((l) => l.institution))}`,
});

function openLiability(hint: string, ctx: ActionValidationContext): Liability | undefined {
  return resolveByNameHint(hint, ctx.liabilities.filter((l) => !l.deletedAt && !isSettled(l)), (l) => l.institution);
}

export function resolvePayLiability(c: PayLiabilityCandidate, ctx: ActionValidationContext): ResolveResult {
  const amount = positiveAmount(c.amount);
  if (amount === null) return ask('pay_liability', c, [askAmount('amount', 'No reconocí un monto claro para el pago — dime un número, por ejemplo "500".')]);
  const l = openLiability(c.institutionHint, ctx);
  if (!l) return ask('pay_liability', c, [askOpenLiability(c.institutionHint, ctx)]);
  if (amount > l.balance + 0.005) {
    return ask('pay_liability', c, [askAmount('amount', `Solo quedan ${money(l.balance, l.currency)} por ${directionOf(l) === 'owe' ? 'pagar' : 'cobrar'} de "${l.institution}": no puedo registrar ${money(amount, l.currency)}. ¿De cuánto fue?`)]);
  }
  const owedToMe = directionOf(l) === 'owed_to_me';
  const acc = resolveMoneyAccount(c.accountNameHint, ctx, l.currency, 'accountNameHint', owedToMe ? '¿A qué cuenta te lo pagaron?' : '¿De qué cuenta salió el pago?');
  if (acc.ask) return ask('pay_liability', c, [acc.ask]);
  const err = validateLiabilityPayment(l, amount, acc.account, !!acc.account);
  if (err) return { ok: false, reason: err };
  const left = Math.max(0, Math.round((l.balance - amount) * 100) / 100);
  const via = acc.account ? (owedToMe ? ` en "${acc.account.name}"` : ` desde "${acc.account.name}"`) : ' (solo ajusto la deuda, sin mover ninguna cuenta)';
  const summary = owedToMe
    ? `Registrar que "${l.institution}" te pagó ${money(amount, l.currency)}${via} — te quedaría por cobrar ${money(left, l.currency)}`
    : `Pagar ${money(amount, l.currency)} a "${l.institution}"${via} — quedaría debiendo ${money(left, l.currency)}${left === 0 ? ' (deuda saldada)' : ''}`;
  return {
    ok: true,
    action: { type: 'pay_liability', args: { liabilityId: l.id, institution: l.institution, amount, currency: l.currency, owedToMe, ...(acc.account ? { accountId: acc.account.id, accountName: acc.account.name } : {}) } },
    summary,
  };
}

export function resolveSettleLiability(c: SettleLiabilityCandidate, ctx: ActionValidationContext): ResolveResult {
  const l = openLiability(c.institutionHint, ctx);
  if (!l) return ask('settle_liability', c, [askOpenLiability(c.institutionHint, ctx)]);
  return {
    ok: true,
    action: { type: 'settle_liability', args: { liabilityId: l.id, institution: l.institution } },
    summary: `Marcar como saldada la deuda "${l.institution}" (${money(l.balance, l.currency)} → $0) sin mover ninguna cuenta`,
  };
}

function findInvestment(hint: string, ctx: ActionValidationContext): InvestmentPosition | undefined {
  const list = (ctx.investments ?? []).filter((i) => !i.deletedAt);
  const h = normalize(hint);
  if (h.length < 2) return undefined;
  const byTicker = list.filter((i) => normalize(i.ticker) === h);
  if (byTicker.length === 1) return byTicker[0];
  return resolveByNameHint(hint, list, (i) => i.name) ?? resolveByNameHint(hint, list, (i) => i.ticker);
}

export function resolveRegisterDividend(c: RegisterDividendCandidate, ctx: ActionValidationContext): ResolveResult {
  const amount = positiveAmount(c.amount);
  if (amount === null) return ask('register_dividend', c, [askAmount('amount', 'No reconocí el monto del dividendo — dime un número, por ejemplo "120".')]);
  const inv = findInvestment(c.tickerHint, ctx);
  if (!inv) {
    const names = (ctx.investments ?? []).filter((i) => !i.deletedAt).map((i) => i.ticker);
    return ask('register_dividend', c, [{ field: 'investment', slot: 'tickerHint', prompt: `No encontré ninguna inversión que se llame "${c.tickerHint}". ¿Cuál es?${listNames(names)}` }]);
  }
  const acc = resolveMoneyAccount(c.accountNameHint, ctx, inv.currency, 'accountNameHint', '¿A qué cuenta te lo depositaron?');
  if (acc.ask) return ask('register_dividend', c, [acc.ask]);
  if (acc.account?.isLiability) return { ok: false, reason: 'Un dividendo no puede entrar a una tarjeta de crédito: elige una cuenta de efectivo, banco o inversión.' };
  if (acc.account && acc.account.currency !== inv.currency) return { ok: false, reason: `"${acc.account.name}" y "${inv.ticker}" usan monedas distintas — todavía no puedo convertir entre ellas.` };
  return {
    ok: true,
    action: { type: 'register_dividend', args: { investmentId: inv.id, ticker: inv.ticker, amount, currency: inv.currency, ...(acc.account ? { accountId: acc.account.id, accountName: acc.account.name } : {}) } },
    summary: `Registrar un dividendo de ${money(amount, inv.currency)} de ${inv.ticker}${acc.account ? ` que entró a "${acc.account.name}"` : ' (solo anotarlo, sin mover ninguna cuenta)'}`,
  };
}

// ---------- Tarjeta de crédito ----------

export function resolveSetCardDates(c: SetCardDatesCandidate, ctx: ActionValidationContext): ResolveResult {
  const cards = ctx.accounts.filter((a) => !a.deletedAt && a.type === 'credit_card');
  if (cards.length === 0) return { ok: false, reason: 'No tienes ninguna tarjeta de crédito registrada. Agrégala en Patrimonio → Cuentas y vuelve a decirme sus fechas.' };
  const hint = cleanString(c.accountNameHint);
  const card = hint ? resolveByNameHint(hint, cards, (a) => a.name) : cards.length === 1 ? cards[0] : undefined;
  if (!card) {
    return ask('set_card_dates', c, [{ field: 'account', slot: 'accountNameHint', prompt: `${hint ? `No encontré ninguna tarjeta que se llame "${hint}". ` : ''}¿De cuál tarjeta?${listNames(cards.map((a) => a.name))}` }]);
  }
  const day = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 31 ? v : null);
  const cutoff = day(c.cutoffDay) ?? (c.cutoffDay === undefined || c.cutoffDay === null || c.cutoffDay === '' ? card.cardCutoffDay ?? null : null);
  const due = day(c.dueDay) ?? (c.dueDay === undefined || c.dueDay === null || c.dueDay === '' ? card.cardDueDay ?? null : null);
  if (cutoff === null) return ask('set_card_dates', c, [askAmount('cutoffDay', `¿Qué día del mes es el corte de "${card.name}"? Dime solo el número, por ejemplo "5".`)]);
  if (due === null) return ask('set_card_dates', c, [askAmount('dueDay', `¿Y qué día del mes es la fecha límite de pago de "${card.name}"? Dime solo el número, por ejemplo "25".`)]);
  return {
    ok: true,
    action: { type: 'set_card_dates', args: { accountId: card.id, accountName: card.name, cutoffDay: cutoff, dueDay: due } },
    summary: `Tarjeta "${card.name}": corte el día ${cutoff} y fecha límite de pago el día ${due} de cada mes — te aviso antes, el mismo día y, si no confirmas el pago, te insisto hasta 3 veces`,
  };
}

// ---------- Reintento con la respuesta de la persona ----------

const P3_TYPES: AIActionType[] = [
  'add_forecast', 'confirm_forecast', 'skip_forecast', 'postpone_forecast', 'add_recurring', 'add_recurring_contribution',
  'update_recurring_amount', 'pause_recurring', 'resume_recurring', 'end_recurring', 'add_reminder', 'cancel_reminder',
  'pay_liability', 'settle_liability', 'register_dividend', 'set_card_dates',
];
export const isP3ActionType = (t: string): boolean => (P3_TYPES as string[]).includes(t);

export function resolveCandidateP3(type: AIActionType, c: Record<string, unknown>, ctx: ActionValidationContext): ResolveResult {
  const s = (k: string) => (typeof c[k] === 'string' ? (c[k] as string) : '');
  const tt = c.transactionType === 'income' ? 'income' : 'expense';
  switch (type) {
    case 'add_forecast':
      return resolveAddForecast({ transactionType: tt, amount: c.amount, accountNameHint: s('accountNameHint'), categoryId: c.categoryId, subcategoryId: c.subcategoryId, merchant: c.merchant, date: c.date }, ctx);
    case 'confirm_forecast':
      return resolveConfirmForecast({ forecastHint: s('forecastHint'), amount: c.amount }, ctx);
    case 'skip_forecast':
      return resolveSkipForecast({ forecastHint: s('forecastHint') }, ctx);
    case 'postpone_forecast':
      return resolvePostponeForecast({ forecastHint: s('forecastHint'), newDate: c.newDate }, ctx);
    case 'add_recurring':
      return resolveAddRecurring({ name: c.name, transactionType: tt, amount: c.amount, accountNameHint: s('accountNameHint'), categoryId: c.categoryId, subcategoryId: c.subcategoryId, recurrence: c.recurrence }, ctx);
    case 'add_recurring_contribution':
      return resolveAddRecurringContribution({ name: c.name, goalNameHint: s('goalNameHint'), amount: c.amount, recurrence: c.recurrence }, ctx);
    case 'update_recurring_amount':
      return resolveUpdateRecurringAmount({ ruleHint: s('ruleHint'), amount: c.amount }, ctx);
    case 'pause_recurring':
      return resolvePauseRecurring({ ruleHint: s('ruleHint') }, ctx);
    case 'resume_recurring':
      return resolveResumeRecurring({ ruleHint: s('ruleHint') }, ctx);
    case 'end_recurring':
      return resolveEndRecurring({ ruleHint: s('ruleHint') }, ctx);
    case 'add_reminder':
      return resolveAddReminder({ title: c.title, date: c.date, recurrence: c.recurrence, timeOfDay: c.timeOfDay, advanceDays: c.advanceDays, maxAttempts: c.maxAttempts }, ctx);
    case 'cancel_reminder':
      return resolveCancelReminder({ reminderHint: s('reminderHint') }, ctx);
    case 'pay_liability':
      return resolvePayLiability({ institutionHint: s('institutionHint'), amount: c.amount, accountNameHint: s('accountNameHint') }, ctx);
    case 'settle_liability':
      return resolveSettleLiability({ institutionHint: s('institutionHint') }, ctx);
    case 'register_dividend':
      return resolveRegisterDividend({ tickerHint: s('tickerHint'), amount: c.amount, accountNameHint: s('accountNameHint') }, ctx);
    case 'set_card_dates':
      return resolveSetCardDates({ accountNameHint: s('accountNameHint'), cutoffDay: c.cutoffDay, dueDay: c.dueDay }, ctx);
    default:
      return { ok: false, reason: `Tipo de acción no reconocido: ${type}` } satisfies ResolveErr;
  }
}

// ---------- Para el reconocimiento local (p3Intents.ts): qué cosas existen y se pueden nombrar ----------
export const namedForecasts = (ctx: ActionValidationContext): Array<{ name: string }> => forecastGroups(ctx).map((g) => ({ name: g.name }));
export const namedRules = (ctx: ActionValidationContext): RecurringRule[] => liveRules(ctx);
export const namedReminders = (ctx: ActionValidationContext): Reminder[] => liveReminders(ctx);
export const namedOpenLiabilities = (ctx: ActionValidationContext): Liability[] => ctx.liabilities.filter((l) => !l.deletedAt && !isSettled(l));
export const namedInvestments = (ctx: ActionValidationContext): InvestmentPosition[] => (ctx.investments ?? []).filter((i) => !i.deletedAt);

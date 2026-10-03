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
import { answerClarification, combineResults, interpretationFrom, MAX_PLAN_STEPS } from '@/ai/planner';
import type { PendingClarification } from '@/ai/chatTypes';
import { DEFAULT_CATEGORIES } from '@/data/categories';

import { localActionAgentProvider } from '../local/localActionAgent';
import type { ActionAgentContext, ActionAgentProvider } from '../types';
import { buildActionContextSummary } from './financialContext';
import type { LLMClient } from './types';

const CATEGORY_CATALOG = DEFAULT_CATEGORIES.map((c) => ({ categoryId: c.id, subcategories: c.subcategories.map((s) => s.id) }));

// Mismo patrón de JSON estricto que ya usa LLMAIInterpreterProvider.ts —
// se evita a propósito el tool-use nativo de cada proveedor (4
// implementaciones distintas) a cambio de este único contrato, ya probado
// en producción.
const SYSTEM_PROMPT = `Eres el asistente de datos de VALU, una app de finanzas personales. El usuario te escribe o te dicta en español. Puedes responder preguntas de solo lectura sobre sus datos, o proponer una o varias acciones (hasta ${MAX_PLAN_STEPS}, en el orden en que deben aplicarse) para modificar sus propios datos financieros (nunca código, ajustes, apariencia ni nada fuera de esto).

Devuelve ÚNICAMENTE un objeto JSON, sin texto adicional, sin bloques de código, con esta forma exacta:
{"reply":"string","actions":[{"type":"...","...campos según el tipo..."}]}

Si el mensaje es una pregunta o no pide modificar nada: "actions" es [], y "reply" responde SOLO con los datos del JSON de abajo — nunca inventes una cifra.

Si el mensaje pide agregar, quitar o cambiar datos, cada elemento de "actions" debe ser EXACTAMENTE uno de estos tipos (nunca inventes otro tipo; una acción por cada cosa distinta que se pidió, en orden; usa el "id" real que aparece en los datos de abajo cuando se pida, nunca inventes uno):

- {"type":"add_transaction","transactionType":"expense"|"income","amount":number,"accountNameHint":"string","categoryId":"id del catálogo o null","subcategoryId":"id del catálogo o null","date":"AAAA-MM-DD o null"} — "date" solo si la persona dijo un día pasado ("ayer", "el viernes"); calcúlalo con "fecha_de_hoy" de los datos, nunca de futuro; categoryId/subcategoryId deben ser de este catálogo (o null si no aplica): ${JSON.stringify(CATEGORY_CATALOG)}
- {"type":"add_account","name":"string","accountTypeHint":"banco"|"efectivo"|"tarjeta"|"ahorro"|"inversion","balance":number}
- {"type":"delete_account","accountNameHint":"string"}
- {"type":"add_goal","name":"string","targetAmount":number,"targetDate":"AAAA-MM-DD o null"}
- {"type":"contribute_to_goal","goalNameHint":"string","amount":number}
- {"type":"withdraw_from_goal","goalNameHint":"string","amount":number} — sacar dinero ahorrado en una meta
- {"type":"update_goal_target","goalNameHint":"string","targetAmount":number}
- {"type":"update_goal_date","goalNameHint":"string","targetDate":"AAAA-MM-DD"} — cambiar la fecha objetivo de una meta (de hoy en adelante; calcúlala con "fecha_de_hoy")
- {"type":"delete_goal","goalNameHint":"string"}
- {"type":"add_liability","institution":"string","liabilityTypeHint":"string","balance":number}
- {"type":"update_liability_balance","institutionHint":"string","balance":number}
- {"type":"update_liability_due_date","institutionHint":"string","dueDate":"AAAA-MM-DD"} — cambiar el día de vencimiento/pago de una deuda (de hoy en adelante)
- {"type":"delete_liability","institutionHint":"string"}
- {"type":"set_budget_line","categoryHint":"string","monthlyAmount":number}
- {"type":"delete_budget_line","categoryHint":"string"}
- {"type":"delete_transaction","transactionId":"id real de movimientos_recientes abajo, nunca inventado"}
- {"type":"transfer_between_accounts","fromAccountNameHint":"string","toAccountNameHint":"string","amount":number} — mover dinero entre dos cuentas propias del usuario, nunca hacia/desde una cuenta de otra persona

"reply" siempre es una frase corta y natural — nunca describas ahí el detalle exacto de la acción (monto, cuenta), eso lo arma la app aparte a partir de "actions".`;

// Convierte el `action` crudo del JSON del modelo (nada confiable todavía)
// en un ResolveResult validado, reutilizando el MISMO catálogo que usa el
// reconocimiento local — así el modelo nunca puede aplicar algo que no
// pase por resolución-por-nombre contra datos reales.
function resolveModelAction(raw: unknown, ctx: ActionValidationContext): ResolveResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  switch (a.type) {
    case 'add_transaction':
      return resolveAddTransaction(
        { transactionType: a.transactionType === 'income' ? 'income' : 'expense', amount: a.amount, accountNameHint: String(a.accountNameHint ?? ''), categoryId: a.categoryId, subcategoryId: a.subcategoryId, date: a.date },
        ctx
      );
    case 'add_account':
      return resolveAddAccount({ name: a.name, accountTypeHint: a.accountTypeHint, balance: a.balance }, ctx);
    case 'delete_account':
      return resolveDeleteAccount({ accountNameHint: String(a.accountNameHint ?? '') }, ctx);
    case 'add_goal':
      return resolveAddGoal({ name: a.name, targetAmount: a.targetAmount, targetDate: a.targetDate }, ctx);
    case 'contribute_to_goal':
      return resolveContributeToGoal({ goalNameHint: String(a.goalNameHint ?? ''), amount: a.amount }, ctx);
    case 'withdraw_from_goal':
      return resolveWithdrawFromGoal({ goalNameHint: String(a.goalNameHint ?? ''), amount: a.amount }, ctx);
    case 'update_goal_date':
      return resolveUpdateGoalDate({ goalNameHint: String(a.goalNameHint ?? ''), targetDate: a.targetDate }, ctx);
    case 'update_liability_due_date':
      return resolveUpdateLiabilityDueDate({ institutionHint: String(a.institutionHint ?? ''), dueDate: a.dueDate }, ctx);
    case 'update_goal_target':
      return resolveUpdateGoalTarget({ goalNameHint: String(a.goalNameHint ?? ''), targetAmount: a.targetAmount }, ctx);
    case 'delete_goal':
      return resolveDeleteGoal({ goalNameHint: String(a.goalNameHint ?? '') }, ctx);
    case 'add_liability':
      return resolveAddLiability({ institution: a.institution, liabilityTypeHint: a.liabilityTypeHint, balance: a.balance }, ctx);
    case 'update_liability_balance':
      return resolveUpdateLiabilityBalance({ institutionHint: String(a.institutionHint ?? ''), balance: a.balance }, ctx);
    case 'delete_liability':
      return resolveDeleteLiability({ institutionHint: String(a.institutionHint ?? '') }, ctx);
    case 'set_budget_line':
      return resolveSetBudgetLine({ categoryHint: String(a.categoryHint ?? ''), monthlyAmount: a.monthlyAmount }, ctx);
    case 'delete_budget_line':
      return resolveDeleteBudgetLine({ categoryHint: String(a.categoryHint ?? '') }, ctx);
    case 'delete_transaction':
      return resolveDeleteTransaction({ transactionId: a.transactionId }, ctx);
    case 'transfer_between_accounts':
      return resolveTransferBetweenAccounts(
        { fromAccountNameHint: String(a.fromAccountNameHint ?? ''), toAccountNameHint: String(a.toAccountNameHint ?? ''), amount: a.amount },
        ctx
      );
    default:
      return null;
  }
}

function extractJson(raw: string): any | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// Respaldado por el proveedor de IA que el usuario conectó (BYOK). Ante
// cualquier fallo de red/parseo/validación cae al agente local — el chat
// nunca debe romperse por un problema de conexión (spec 20, 42).
export function createLLMActionAgentProvider(client: LLMClient, providerName: string): ActionAgentProvider {
  return {
    name: providerName,
    async interpretMessage(text: string, ctx: ActionAgentContext, opts?: { pending?: PendingClarification }) {
      try {
        const validationCtx: ActionValidationContext = {
          accounts: ctx.accounts,
          goals: ctx.goals,
          liabilities: ctx.liabilities,
          templateBudgetLines: ctx.templateBudgetLines,
          recentTransactions: ctx.transactions.slice(0, 20),
          primaryCurrency: ctx.profile.primaryCurrency,
        };
        // Contestar una pregunta pendiente es determinista y no necesita al modelo (ni gastar su cuota).
        if (opts?.pending) {
          const answered = answerClarification(opts.pending, text, validationCtx);
          const interpreted = answered ? interpretationFrom(answered, validationCtx) : null;
          if (interpreted) return { ...interpreted, handledClarification: true };
        }

        const summary = buildActionContextSummary(ctx);
        const systemPrompt = `${SYSTEM_PROMPT}\n\nDatos del usuario (JSON):\n${JSON.stringify(summary)}`;
        const raw = await client.chat(systemPrompt, [{ role: 'user', content: text }]);
        const json = extractJson(raw);
        if (!json || typeof json.reply !== 'string') return localActionAgentProvider.interpretMessage(text, ctx, opts);

        // `actions` (varias) o, por compatibilidad con respuestas viejas, `action` (una).
        const rawActions: unknown[] = Array.isArray(json.actions) ? json.actions : json.action ? [json.action] : [];
        if (rawActions.length === 0) return { reply: json.reply };
        if (rawActions.length > MAX_PLAN_STEPS) return { reply: `Son demasiadas acciones juntas (máximo ${MAX_PLAN_STEPS}). Pídemelas en dos mensajes.` };

        // Cada acción del modelo pasa por el MISMO catálogo que las reglas locales: nada llega al plan sin validar.
        const results = rawActions.map((a) => resolveModelAction(a, validationCtx));
        const labels = rawActions.map((_, i) => `acción ${i + 1}`);
        const outcome = combineResults(labels, results, () => null);
        if (outcome.kind === 'none') return { reply: json.reply };
        const interpreted = interpretationFrom(outcome, validationCtx);
        if (!interpreted) return { reply: json.reply };
        // Con una sola acción válida se conserva la frase natural del modelo (como siempre).
        return outcome.kind === 'single' ? { ...interpreted, reply: json.reply } : interpreted;
      } catch {
        return localActionAgentProvider.interpretMessage(text, ctx, opts);
      }
    },
  };
}

import { AgentError, SETUP_ERRORS, type AgentErrorCode } from '@/ai/agent/protocol';
import { aiEnabled } from '@/ai/agent/settings';
import type { AgentData } from '@/ai/agent/tools';
import { agentChat } from '@/ai/agent/transport';
import type { InterpretedMessage } from '@/ai/chatTypes';
import { answerClarification, interpretationFrom } from '@/ai/planner';
import { buildValidationContext } from '@/ai/validationContext';
import { hideNamesFromAi } from '@/services/privacy/aiPrivacy';
import {
  selectActiveAccounts,
  selectActiveBudgetAssignments,
  selectActiveBudgets,
  selectActiveBudgetTemplates,
  selectActiveGoals,
  selectActiveInvestments,
  selectActiveLiabilities,
  selectActivePeriodOverrides,
  selectActiveRecurringRules,
  selectActiveReminders,
  selectActiveTemplateBudgetLines,
  selectActiveTransactions,
  selectForecastTransactions,
} from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { toISODate } from '@/utils/date';

import { localActionAgentProvider } from '../local/localActionAgent';
import type { ActionAgentProvider } from '../types';

// El chat de VALU: primero el agente de IA (src/ai/agent); si no se puede (sin sesión, sin conexión, sin clave, sin
// cuota…), contesta el motor local de siempre y se dice por qué en una línea bajo la respuesta.

export function snapshotForAgent(today = toISODate(new Date())): AgentData {
  const s = useAppStore.getState();
  return {
    today,
    profile: s.profile,
    accounts: selectActiveAccounts(s.accounts),
    transactions: selectActiveTransactions(s.transactions),
    forecasts: selectForecastTransactions(s.transactions),
    investments: selectActiveInvestments(s.investments),
    liabilities: selectActiveLiabilities(s.liabilities),
    goals: selectActiveGoals(s.goals),
    budgets: selectActiveBudgets(s.budgets),
    budgetTemplates: selectActiveBudgetTemplates(s.budgetTemplates),
    templateBudgetLines: selectActiveTemplateBudgetLines(s.templateBudgetLines),
    budgetAssignments: selectActiveBudgetAssignments(s.budgetAssignments),
    periodBudgetOverrides: selectActivePeriodOverrides(s.periodBudgetOverrides),
    recurringRules: selectActiveRecurringRules(s.recurringRules),
    reminders: selectActiveReminders(s.reminders),
    liveQuotes: s.liveQuotes,
    memory: s.agentMemory,
    hideNames: hideNamesFromAi(),
  };
}

// Sin nube o sin sesión la app es local por diseño: no se avisa nada. El resto sí se explica.
const SILENT: AgentErrorCode[] = ['no_backend', 'not_signed_in'];

export function noticeFor(e: unknown): string | undefined {
  if (!(e instanceof AgentError)) return 'Respondí sin IA: ocurrió un error inesperado con la IA.';
  if (SILENT.includes(e.code)) return undefined;
  if (e.code === 'not_deployed') return 'Respondí sin IA: falta desplegar la función ai-agent en Supabase (GitHub → Actions → «Desplegar funciones de Supabase»).';
  if (e.code === 'not_allowed') return 'Respondí sin IA: la IA integrada es solo para cuentas autorizadas; puedes usar tu propia clave en Ajustes → IA.';
  if (e.code === 'not_configured') return 'Respondí sin IA: falta la clave de la IA en Supabase (Edge Functions → Secrets → GEMINI_API_KEY).';
  if (e.code === 'offline' || e.code === 'timeout') return 'Respondí sin IA: no hubo conexión con la IA.';
  return `Respondí sin IA: ${e.message}`;
}

// Un error de configuración no se arregla solo en segundos: durante un minuto se responde local sin volver a intentar.
let setupFailure: { at: number; error: AgentError } | null = null;
const SETUP_RETRY_MS = 60_000;

export function forgetAgentFailure(): void {
  setupFailure = null;
}

export function createAgentActionProvider(deps: { call?: typeof agentChat; snapshot?: () => AgentData } = {}): ActionAgentProvider {
  const call = deps.call ?? agentChat;
  const snapshot = deps.snapshot ?? (() => snapshotForAgent());
  return {
    name: 'valu-agent',
    async interpretMessage(text, ctx, opts) {
      const validationCtx = buildValidationContext(ctx);
      // Contestar una pregunta pendiente es determinista: no hace falta la IA (ni gastar su cuota).
      if (opts?.pending) {
        const answered = answerClarification(opts.pending, text, validationCtx);
        const interpreted = answered ? interpretationFrom(answered, validationCtx) : null;
        if (interpreted) return { ...interpreted, handledClarification: true, meta: { engine: 'local' } };
      }

      const local = async (notice?: string): Promise<InterpretedMessage> => {
        const r = await localActionAgentProvider.interpretMessage(text, ctx, opts);
        return { ...r, meta: { engine: 'local', notice } };
      };

      if (!aiEnabled()) return local();
      if (setupFailure && Date.now() - setupFailure.at < SETUP_RETRY_MS) return local(noticeFor(setupFailure.error));

      try {
        // El agente (bucle, herramientas, catálogo de acciones) se descarga la primera vez que se usa el chat.
        const { runAgentTurn } = await import('@/ai/agent/agentLoop');
        const result = await runAgentTurn({
          text,
          history: opts?.history ?? [],
          data: snapshot(),
          validation: validationCtx,
          call,
          onProgress: opts?.onProgress,
          onRemember: (fact) => useAppStore.getState().addAgentMemory(fact),
        });
        setupFailure = null;
        const label = [result.providerLabel.replace(/\s*\(.*\)$/, ''), result.model].filter(Boolean).join(' · ');
        return { ...result.interpreted, meta: { engine: 'ai', label, tools: [...new Set(result.toolsUsed)] } };
      } catch (e) {
        if (e instanceof AgentError && SETUP_ERRORS.includes(e.code)) setupFailure = { at: Date.now(), error: e };
        return local(noticeFor(e));
      }
    },
  };
}

export const agentActionProvider = createAgentActionProvider();

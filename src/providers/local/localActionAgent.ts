import { answerClarification, interpretationFrom, planFromText } from '@/ai/planner';
import { answerQuestion } from '@/ai/localCopilot';
import { whenCatalogReady } from '@/data/catalogLoader';

import type { ActionAgentProvider } from '../types';

// Implementación local: reconoce comandos con expresiones regulares (src/ai/chatIntentParser.ts) y, si el
// mensaje trae varias instrucciones, arma un plan (src/ai/planner.ts); si no calza con ningún patrón conocido,
// se comporta exactamente como el copiloto de siempre — así subsume (no duplica) todo lo que el chat de
// solo lectura ya hacía.
export const localActionAgentProvider: ActionAgentProvider = {
  name: 'local-rules',
  async interpretMessage(text, ctx, opts) {
    // Un gasto dictado dentro de un plan se clasifica con el catálogo completo; si tarda, se sigue sin él.
    await whenCatalogReady(1500);
    const validationCtx = {
      accounts: ctx.accounts,
      goals: ctx.goals,
      liabilities: ctx.liabilities,
      templateBudgetLines: ctx.templateBudgetLines,
      recentTransactions: ctx.transactions.slice(0, 20),
      primaryCurrency: ctx.profile.primaryCurrency,
    };

    if (opts?.pending) {
      const answered = answerClarification(opts.pending, text, validationCtx);
      if (answered) {
        const result = interpretationFrom(answered, validationCtx);
        if (result) return { ...result, handledClarification: true };
      }
      // si no era una respuesta, se trata como un mensaje nuevo
    }

    const result = interpretationFrom(planFromText(text, validationCtx), validationCtx);
    return result ?? { reply: answerQuestion(text, ctx) };
  },
};

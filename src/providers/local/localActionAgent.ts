import { detectChatIntent } from '@/ai/chatIntentParser';
import { answerQuestion } from '@/ai/localCopilot';

import type { ActionAgentProvider } from '../types';

// Implementación local: reconoce comandos con expresiones regulares
// (src/ai/chatIntentParser.ts); si el mensaje no calza con ningún patrón
// conocido, se comporta exactamente como el copiloto de siempre — así
// subsume (no duplica) todo lo que el chat de solo lectura ya hacía.
export const localActionAgentProvider: ActionAgentProvider = {
  name: 'local-rules',
  async interpretMessage(text, ctx) {
    const result = detectChatIntent(text, {
      accounts: ctx.accounts,
      goals: ctx.goals,
      liabilities: ctx.liabilities,
      templateBudgetLines: ctx.templateBudgetLines,
      recentTransactions: ctx.transactions.slice(0, 20),
      primaryCurrency: ctx.profile.primaryCurrency,
    });

    if (result?.ok) {
      return { reply: `${result.summary}. Mantén presionado para confirmar.`, action: result.action, summary: result.summary };
    }
    if (result && !result.ok) {
      return { reply: result.reason };
    }

    return { reply: answerQuestion(text, ctx) };
  },
};

import { answerQuestion } from '@/ai/localCopilot';
import type { CopilotProvider } from '../types';

// Implementación local basada en reglas sobre los datos reales del
// usuario (Fase 1-2). En Fase 3 se registra un CopilotProvider respaldado
// por Claude para lenguaje natural completo, con el mismo contrato.
export const localCopilotProvider: CopilotProvider = {
  name: 'local-rules',
  async answerQuestion(question, ctx) {
    return answerQuestion(question, ctx);
  },
};

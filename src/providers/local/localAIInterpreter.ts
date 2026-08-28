import { parseCaptureText } from '@/ai/localParser';
import type { AIInterpreterProvider } from '../types';

// Implementación local por defecto (Fase 1-2). En Fase 3 se registra una
// implementación equivalente respaldada por Claude, sin que la UI cambie.
export const localAIInterpreterProvider: AIInterpreterProvider = {
  name: 'local-rules',
  async parseCaptureText(text: string) {
    return parseCaptureText(text);
  },
};

import { providerFetch } from '../relayFetch';
import type { LLMClient, LLMMessage } from '../types';

// Nota: la API de Anthropic bloquea por CORS las llamadas directas desde
// un navegador — por diseño, para no exponer claves de API en el
// cliente. Por eso providerFetch pasa por el relevo cuando corre en web.
export function createClaudeClient(apiKey: string, model: string): LLMClient {
  return {
    async chat(systemPrompt: string, messages: LLMMessage[]): Promise<string> {
      const data = await providerFetch(
        'https://api.anthropic.com/v1/messages',
        {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        {
          model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }
      );
      const textBlock = data?.content?.find((block: any) => block.type === 'text');
      if (!textBlock) throw new Error('Claude no devolvió texto en la respuesta.');
      return textBlock.text as string;
    },
  };
}

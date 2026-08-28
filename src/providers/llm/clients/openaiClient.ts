import { providerFetch } from '../relayFetch';
import type { LLMClient, LLMMessage } from '../types';

export function createOpenAIClient(apiKey: string, model: string): LLMClient {
  return {
    async chat(systemPrompt: string, messages: LLMMessage[]): Promise<string> {
      const data = await providerFetch(
        'https://api.openai.com/v1/chat/completions',
        {
          Authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        {
          model,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
        }
      );
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error('ChatGPT no devolvió texto en la respuesta.');
      return text as string;
    },
  };
}

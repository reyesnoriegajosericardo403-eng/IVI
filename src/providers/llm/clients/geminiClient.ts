import { providerFetch } from '../relayFetch';
import type { LLMClient, LLMMessage } from '../types';

export function createGeminiClient(apiKey: string, model: string): LLMClient {
  return {
    async chat(systemPrompt: string, messages: LLMMessage[]): Promise<string> {
      const data = await providerFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          'x-goog-api-key': apiKey,
          'content-type': 'application/json',
        },
        {
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
        }
      );
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini no devolvió texto en la respuesta.');
      return text as string;
    },
  };
}

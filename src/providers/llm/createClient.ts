import { createClaudeClient } from './clients/claudeClient';
import { createGeminiClient } from './clients/geminiClient';
import { createGrokClient } from './clients/grokClient';
import { createOpenAIClient } from './clients/openaiClient';
import type { LLMClient, LLMProviderConfig } from './types';

export function createLLMClient(config: LLMProviderConfig): LLMClient {
  switch (config.provider) {
    case 'claude':
      return createClaudeClient(config.apiKey, config.model);
    case 'openai':
      return createOpenAIClient(config.apiKey, config.model);
    case 'gemini':
      return createGeminiClient(config.apiKey, config.model);
    case 'grok':
      return createGrokClient(config.apiKey, config.model);
  }
}

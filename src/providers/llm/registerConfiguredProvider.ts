import { localAIInterpreterProvider } from '../local/localAIInterpreter';
import { localCopilotProvider } from '../local/localCopilotProvider';
import { setAIInterpreterProvider, setCopilotProvider } from '../registry';
import { createLLMClient } from './createClient';
import { getLLMProviderConfig } from './secureConfig';
import { LLM_PROVIDER_LABELS } from './types';
import { createLLMAIInterpreterProvider } from './LLMAIInterpreterProvider';
import { createLLMCopilotProvider } from './LLMCopilotProvider';

// Se llama al iniciar la app y cada vez que el usuario guarda/quita su
// clave en Ajustes → Conectar tu IA. Si no hay ninguna clave configurada
// (o falta algún dato), la app se queda con el copiloto/intérprete local
// — nunca se rompe por falta de configuración (spec 20).
export async function registerConfiguredLLMProvider(): Promise<void> {
  const config = await getLLMProviderConfig();

  if (!config || !config.apiKey) {
    setCopilotProvider(localCopilotProvider);
    setAIInterpreterProvider(localAIInterpreterProvider);
    return;
  }

  const client = createLLMClient(config);
  const providerName = LLM_PROVIDER_LABELS[config.provider];
  setCopilotProvider(createLLMCopilotProvider(client, providerName));
  setAIInterpreterProvider(createLLMAIInterpreterProvider(client, providerName));
}

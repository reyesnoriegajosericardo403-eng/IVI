import { agentActionProvider, forgetAgentFailure } from '../agent/agentActionProvider';
import { hybridInterpreterProvider } from '../agent/hybridInterpreter';
import { localCopilotProvider } from '../local/localCopilotProvider';
import { forgetAgentStatus } from '@/ai/agent/transport';
import { setActionAgentProvider, setAIInterpreterProvider, setCopilotProvider } from '../registry';

// Se llama al iniciar la app y cada vez que cambia algo en Ajustes → IA. El chat y la captura siempre pasan por el
// agente de IA (función ai-agent de Supabase, con la clave integrada o la tuya); cada llamada decide en ese momento si
// hay IA disponible y, si no, contesta el motor local — nunca se rompe por falta de configuración (spec 20).
export async function registerConfiguredLLMProvider(): Promise<void> {
  forgetAgentStatus();
  forgetAgentFailure();
  setCopilotProvider(localCopilotProvider);
  setAIInterpreterProvider(hybridInterpreterProvider);
  setActionAgentProvider(agentActionProvider);
}

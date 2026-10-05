// ai-agent: el "cerebro" de VALU. Recibe la conversación del agente (mensajes + herramientas) con la sesión de la
// persona, la manda a la IA configurada y devuelve la respuesta. Toda la lógica vive en ../_shared/aiAgentHandler.ts.
//
// Se despliega SIN verificación de JWT en la puerta (la función valida la sesión ella misma, igual que push-notify):
//   GitHub → Actions → «Desplegar funciones de Supabase» → ai-agent
// Secretos (Supabase → Edge Functions → Secrets): GEMINI_API_KEY (o ANTHROPIC_API_KEY / OPENAI_API_KEY / XAI_API_KEY);
// opcionales: AI_PROVIDER, AI_MODEL, AI_DAILY_LIMIT (por defecto 150 consultas por persona al día).

import { envFrom, handleAgentRequest } from '../_shared/aiAgentHandler.ts';

Deno.serve((req: Request) => handleAgentRequest(req, envFrom((name) => Deno.env.get(name)), { fetch: (url, init) => fetch(url, init) }));

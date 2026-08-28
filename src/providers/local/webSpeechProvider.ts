import { isWebSpeechAvailable, startWebSpeechListening } from '@/ai/webSpeech';
import type { SpeechToTextProvider } from '../types';

// Envuelve la Web Speech API del navegador (Fase 1). Solo disponible en
// algunos navegadores de escritorio/Android — en iPhone/iPad cae a texto
// hasta que se registre un SpeechToTextProvider real en la nube (Fase 3).
export const webSpeechProvider: SpeechToTextProvider = {
  name: 'web-speech-api',
  isAvailable: isWebSpeechAvailable,
  startListening: startWebSpeechListening,
};

import { Platform } from 'react-native';

// Envoltura opcional sobre la Web Speech API del navegador (solo Chrome/Edge
// de escritorio y Android soportan esto de forma confiable hoy; Safari en
// iOS no lo soporta bien). Cuando no está disponible, la app cae a texto —
// nunca finge tener acceso a un micrófono que no tiene (spec sección 42).
// La transcripción real en iPhone/iPad llega en Fase 3 vía un servicio de
// STT en la nube (ver PLAN TÉCNICO).
//
// Modo continuo + resultados parciales: permite que el usuario diga varias
// cosas en una sola grabación (spec: "poder anotar 3 cosas de golpe") y que
// el texto se vea reflejado en pantalla mientras habla, antes de que la
// frase se dé por terminada.

export function isWebSpeechAvailable(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

// Traduce los códigos de error de la Web Speech API a un mensaje que de
// verdad explique qué pasó — antes se perdía el código real y siempre se
// mostraba el mismo mensaje genérico, lo que hacía imposible saber si el
// micrófono estaba bloqueado, sin conexión, etc. (spec: auditoría de "el
// micrófono no sirvió para nada" en Android).
const SPEECH_ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'No tienes permiso de micrófono para VALU. Ve a los ajustes del sitio en tu navegador y actívalo.',
  'service-not-allowed': 'El navegador bloqueó el acceso al micrófono. Intenta abrir VALU desde Chrome (no desde el ícono instalado) para revisar el permiso.',
  'permission-denied': 'No tienes permiso de micrófono para VALU. Ve a los ajustes del sitio en tu navegador y actívalo.',
  'audio-capture': 'No se encontró un micrófono disponible en este dispositivo.',
  'network': 'Se perdió la conexión mientras se procesaba el audio. Revisa tu internet e intenta de nuevo.',
  'no-speech': 'No se escuchó nada. Vuelve a intentar hablando más cerca del micrófono.',
  'aborted': 'Se canceló la grabación.',
};

export function speechErrorMessage(code: string): string {
  return SPEECH_ERROR_MESSAGES[code] ?? `No se pudo usar el micrófono (${code}). Escribe tu movimiento abajo.`;
}

interface StartListeningOptions {
  onResult: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}

export function startWebSpeechListening({ onResult, onInterim, onError, onEnd }: StartListeningOptions): (() => void) | null {
  if (!isWebSpeechAvailable()) return null;
  const w = window as any;
  const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
  const recognition = new SpeechRecognitionCtor();
  recognition.lang = 'es-MX';
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalTranscript = '';

  recognition.onresult = (event: any) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const chunk: string = result[0]?.transcript ?? '';
      if (result.isFinal) {
        finalTranscript = `${finalTranscript} ${chunk}`.trim();
        onResult(finalTranscript);
      } else {
        interim += chunk;
      }
    }
    onInterim?.(interim);
  };
  recognition.onerror = (event: any) => {
    onError(speechErrorMessage(event.error ?? 'unknown'));
  };
  recognition.onend = () => onEnd();

  try {
    recognition.start();
  } catch {
    onError('No se pudo iniciar el micrófono');
    return null;
  }

  return () => {
    try {
      recognition.stop();
    } catch {
      // no-op
    }
  };
}

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
    onError(event.error ?? 'No se pudo escuchar');
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

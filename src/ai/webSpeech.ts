import { Platform } from 'react-native';

// Envoltura opcional sobre la Web Speech API del navegador (solo Chrome/Edge
// de escritorio y Android soportan esto de forma confiable hoy; Safari en
// iOS no lo soporta bien). Cuando no está disponible, la app cae a texto —
// nunca finge tener acceso a un micrófono que no tiene (spec sección 42).
// La transcripción real en iPhone/iPad llega en Fase 3 vía un servicio de
// STT en la nube (ver PLAN TÉCNICO).

export function isWebSpeechAvailable(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

interface StartListeningOptions {
  onResult: (transcript: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}

export function startWebSpeechListening({ onResult, onError, onEnd }: StartListeningOptions): (() => void) | null {
  if (!isWebSpeechAvailable()) return null;
  const w = window as any;
  const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
  const recognition = new SpeechRecognitionCtor();
  recognition.lang = 'es-MX';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event: any) => {
    const transcript = event.results?.[0]?.[0]?.transcript ?? '';
    onResult(transcript);
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

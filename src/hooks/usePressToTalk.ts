import { useEffect, useRef, useState } from 'react';

import { providers } from '@/providers/registry';

export type PressToTalkStatus = 'idle' | 'listening' | 'error';

export interface UsePressToTalkResult {
  status: PressToTalkStatus;
  liveTranscript: string;
  errorMsg: string;
  isAvailable: boolean;
  // onPressIn del botón de micrófono — arranca a escuchar y registra el
  // "soltar" en window (no en el propio botón), así cuenta aunque la
  // pantalla ya haya vuelto a dibujarse mientras el dedo seguía presionado.
  pressIn: () => void;
  cancel: () => void;
}

// Mecánica de "mantén presionado para hablar, suelta para terminar",
// extraída de app/capture.tsx (que la sigue usando con su propia
// implementación, sin tocar — es una pantalla crítica ya afinada con
// varias rondas de corrección de bugs reales: condición de carrera,
// micrófono atascado en autostart, selección de texto cancelando la
// grabación). Este hook es para consumidores NUEVOS (el compositor del
// chat de IA) que solo necesitan "dame el texto final dictado", sin la
// lógica de captura de transacciones (monto/categoría pendientes, cuentas,
// lotes) que sí es propia de esa pantalla.
export function usePressToTalk(onFinalText: (text: string) => void): UsePressToTalkResult {
  const [status, setStatus] = useState<PressToTalkStatus>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const onFinalTextRef = useRef(onFinalText);
  onFinalTextRef.current = onFinalText;

  const stopListeningRef = useRef<(() => void) | null>(null);
  const finalTextRef = useRef('');
  const interimTextRef = useRef('');
  const listeningRef = useRef(false);
  const releaseInFlightRef = useRef(false);
  // Puente entre el evento asíncrono del motor de voz (onEnd/onError) y
  // quien pidió detener — así "qué se dijo" siempre lo decide el motor
  // DESPUÉS de terminar de finalizar, nunca un valor leído de antemano.
  const finalizeResolveRef = useRef<((text: string) => void) | null>(null);
  const releaseListenerCleanupRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      listeningRef.current = false;
      stopListeningRef.current?.();
      releaseListenerCleanupRef.current?.();
    },
    []
  );

  const beginListening = async () => {
    if (!providers.speech.isAvailable()) {
      setErrorMsg('El micrófono en vivo no está disponible en este navegador. Escribe tu mensaje.');
      setStatus('error');
      return;
    }
    // Pide permiso de micrófono explícitamente ANTES de arrancar el
    // reconocimiento de voz — en Android, sobre todo con la app instalada
    // en la pantalla de inicio, SpeechRecognition a veces no pide el
    // permiso correctamente por su cuenta y la grabación simplemente no
    // hace nada, sin ningún aviso.
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        setErrorMsg(
          err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
            ? 'No tienes permiso de micrófono para VALU. Ve a los ajustes del sitio en tu navegador (candado junto a la URL) y actívalo.'
            : 'No se pudo acceder al micrófono en este dispositivo. Escribe tu mensaje.'
        );
        setStatus('error');
        return;
      }
    }
    finalTextRef.current = '';
    interimTextRef.current = '';
    setLiveTranscript('');
    setErrorMsg('');
    listeningRef.current = true;
    setStatus('listening');
    const stop = providers.speech.startListening({
      onResult: (transcript) => {
        finalTextRef.current = transcript;
        setLiveTranscript(`${finalTextRef.current} ${interimTextRef.current}`.trim());
      },
      onInterim: (interim) => {
        interimTextRef.current = interim;
        setLiveTranscript(`${finalTextRef.current} ${interimTextRef.current}`.trim());
      },
      onError: (message) => {
        listeningRef.current = false;
        // Lo que ya se alcanzó a transcribir antes del error NUNCA se tira
        // a la basura — se aprovecha igual que si hubiera terminado bien.
        const recovered = (finalTextRef.current || interimTextRef.current).trim();
        if (finalizeResolveRef.current) {
          finalizeResolveRef.current(recovered);
          finalizeResolveRef.current = null;
          return;
        }
        if (recovered) {
          setStatus('idle');
          onFinalTextRef.current(recovered);
          return;
        }
        setErrorMsg(message);
        setStatus('error');
      },
      onEnd: () => {
        stopListeningRef.current = null;
        listeningRef.current = false;
        const finalText = (finalTextRef.current || interimTextRef.current).trim();
        if (finalizeResolveRef.current) {
          finalizeResolveRef.current(finalText);
          finalizeResolveRef.current = null;
          return;
        }
        // onEnd espontáneo (nadie pidió detener — el navegador cortó la
        // escucha solo).
        if (finalText) {
          setStatus('idle');
          onFinalTextRef.current(finalText);
        } else {
          setStatus('idle');
        }
      },
    });
    stopListeningRef.current = stop;
  };

  // Se llama al SOLTAR. Nunca asume que soltar significa que ya se dijo
  // algo — solo lo sabe cuando el motor de voz termina de finalizar de
  // verdad.
  const handleRelease = async () => {
    if (!listeningRef.current || releaseInFlightRef.current) return;
    releaseInFlightRef.current = true;
    try {
      const finalText = await new Promise<string>((resolve) => {
        finalizeResolveRef.current = resolve;
        stopListeningRef.current?.();
        // Respaldo por si el navegador nunca dispara onend/onerror.
        setTimeout(() => {
          if (finalizeResolveRef.current === resolve) {
            finalizeResolveRef.current = null;
            resolve((finalTextRef.current || interimTextRef.current).trim());
          }
        }, 2500);
      });
      if (!finalText) {
        setErrorMsg('No se escuchó nada. Mantén presionado el micrófono y vuelve a intentar.');
        setStatus('error');
        return;
      }
      setStatus('idle');
      onFinalTextRef.current(finalText);
    } finally {
      releaseInFlightRef.current = false;
    }
  };

  // El "soltar" se detecta en window, no en el propio botón — así cuenta
  // aunque la pantalla ya haya cambiado mientras el dedo seguía presionado.
  const pressIn = () => {
    releaseListenerCleanupRef.current?.();
    if (typeof window !== 'undefined') {
      const onRelease = () => {
        releaseListenerCleanupRef.current = null;
        window.removeEventListener('pointerup', onRelease);
        window.removeEventListener('pointercancel', onRelease);
        handleRelease();
      };
      window.addEventListener('pointerup', onRelease);
      window.addEventListener('pointercancel', onRelease);
      releaseListenerCleanupRef.current = () => {
        window.removeEventListener('pointerup', onRelease);
        window.removeEventListener('pointercancel', onRelease);
      };
    }
    beginListening();
  };

  const cancel = () => {
    releaseListenerCleanupRef.current?.();
    releaseListenerCleanupRef.current = null;
    listeningRef.current = false;
    if (finalizeResolveRef.current) {
      finalizeResolveRef.current('');
      finalizeResolveRef.current = null;
    }
    stopListeningRef.current?.();
    stopListeningRef.current = null;
    setLiveTranscript('');
    setStatus('idle');
  };

  return { status, liveTranscript, errorMsg, isAvailable: providers.speech.isAvailable(), pressIn, cancel };
}

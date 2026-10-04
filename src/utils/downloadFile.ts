import { Platform } from 'react-native';

// Descarga un texto como archivo. Solo en la versión web (en nativo no hay forma de compartir archivos sin una
// dependencia nueva); devuelve un mensaje en español para mostrar tal cual.
export function downloadTextFile(filename: string, text: string, mime = 'text/plain'): { ok: boolean; message: string } {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return { ok: false, message: 'Por ahora esto solo está disponible en la versión web.' };
  }
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return { ok: true, message: 'Descarga iniciada. Ábrela para agregarla a tu calendario.' };
}

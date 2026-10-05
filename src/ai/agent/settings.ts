// "Usar la IA en el chat y en la captura": encendido por defecto; se apaga en Ajustes → IA. Es por dispositivo.
const KEY = 'valu.ai.disabled';

export function aiEnabled(): boolean {
  try {
    return !(typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1');
  } catch {
    return true;
  }
}

export function setAiEnabled(value: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (value) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, '1');
  } catch {
    // sin almacenamiento: queda encendida
  }
}

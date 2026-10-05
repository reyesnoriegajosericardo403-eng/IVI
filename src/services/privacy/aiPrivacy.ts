// Preferencia por dispositivo: no mandar a tu IA los nombres de personas ni de comercios.
// No se sincroniza a propósito: es una decisión sobre este dispositivo y la IA que conectaste aquí.
const KEY = 'valu.privacy.hideNamesFromAi';

export function hideNamesFromAi(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setHideNamesFromAi(value: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (value) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    // sin almacenamiento: queda en el valor por defecto
  }
}

export const HIDDEN_NAME = '(oculto)';
export const redactName = <T extends string | undefined | null>(value: T, hide: boolean): T | string =>
  hide && value ? HIDDEN_NAME : value;

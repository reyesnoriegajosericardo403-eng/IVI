// Si el usuario apagó los avisos a propósito, no se los volvemos a activar solos.
const OPT_OUT_KEY = 'valu.push.optout';
const ASKED_KEY = 'valu.push.asked';

function read(key: string): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function write(key: string, value: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (value) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    // sin almacenamiento: se vuelve a intentar en la siguiente sesión
  }
}

export const pushOptedOut = () => read(OPT_OUT_KEY);
export const setPushOptedOut = (value: boolean) => write(OPT_OUT_KEY, value);
export const pushAlreadyAsked = () => read(ASKED_KEY);
export const markPushAsked = () => write(ASKED_KEY, true);

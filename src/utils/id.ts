import * as Crypto from 'expo-crypto';

// ID único global (UUID v4) para cada registro. Nunca se usa
// fecha+monto+categoría como identificador — eso rompe la sincronización
// entre dispositivos y puede crear duplicados (spec sección 75).
export function generateId(): string {
  return Crypto.randomUUID();
}

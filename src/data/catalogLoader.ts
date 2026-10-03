// "Túnel" del catálogo (P2.0): trae el vocabulario AMPLIADO del motor local en segundo plano, aparte del
// paquete inicial de la app. Nada de esto toca datos de la persona: son solo palabras públicas del catálogo.
//
// Cómo funciona hoy:
//  1. La app arranca con el NÚCLEO (src/data/keywordPacks/index.ts): lo cotidiano ya se clasifica.
//  2. `loadExtendedCatalog()` hace `import('./keywordPacks/extended')`: en la versión web ese archivo es un
//     trozo aparte que el navegador descarga (y guarda en caché) cuando se pide; en la app nativa ya viene
//     dentro del paquete y solo se evalúa en ese momento.
//  3. Las palabras se suman al catálogo en memoria (`installKeywordPacks`) y el índice del motor se
//     reconstruye en trozos (`warmUpLocalParser`), sin congelar la pantalla.
//  4. Quien necesite el vocabulario completo (la captura, el chat) hace `await whenCatalogReady()`; si tarda
//     demasiado se sigue con lo que haya: nunca se bloquea registrar un gasto por esperar el catálogo.
import { warmUpLocalParser } from '@/ai/localParser';

import { getInstalledCatalogVersion, installKeywordPacks } from './categories';

export type CatalogStatus = 'core' | 'loading' | 'ready' | 'error';

let status: CatalogStatus = 'core';
let loading: Promise<void> | null = null;
let lastError: string | null = null;
const listeners = new Set<(s: CatalogStatus) => void>();

function setStatus(next: CatalogStatus) {
  status = next;
  listeners.forEach((fn) => fn(next));
}

export const getCatalogStatus = (): CatalogStatus => status;
export const getCatalogError = (): string | null => lastError;
export const getCatalogVersionInUse = (): string => getInstalledCatalogVersion();
export function onCatalogStatus(fn: (s: CatalogStatus) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Seguro llamarlo muchas veces: una sola descarga a la vez, y si ya está listo no hace nada. Tras un error
// la siguiente llamada vuelve a intentar.
export function loadExtendedCatalog(): Promise<void> {
  if (status === 'ready') return Promise.resolve();
  if (loading) return loading;
  setStatus('loading');
  loading = (async () => {
    try {
      const mod = await import('./keywordPacks/extended');
      installKeywordPacks(mod.EXTENDED_PACKS, mod.CATALOG_VERSION);
      await warmUpLocalParser();
      lastError = null;
      setStatus('ready');
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      setStatus('error');
    } finally {
      loading = null;
    }
  })();
  return loading;
}

// Espera (con tope) a que el vocabulario completo esté listo. Devuelve true si llegó a tiempo. Con
// `timeoutMs` agotado la persona sigue con el motor del núcleo, que ya clasifica lo cotidiano.
export async function whenCatalogReady(timeoutMs = 2500): Promise<boolean> {
  if (getCatalogStatus() === 'ready') return true;
  const load = loadExtendedCatalog();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  await Promise.race([load, timeout]);
  if (timer) clearTimeout(timer);
  return getCatalogStatus() === 'ready';
}

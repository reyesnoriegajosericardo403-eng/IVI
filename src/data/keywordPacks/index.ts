// Palabras clave del catálogo, por área de la vida financiera (P1/P1b, 2026-10-03).
// Cada paquete es un archivo `Record<id de subcategoría, palabras[]>`. El orden desempata: ante la misma
// palabra en dos subcategorías gana la primera.
//
// Dos niveles (P2.0, "túnel" del catálogo):
//  - NÚCLEO (`CORE_PACKS`, aquí): viaja dentro del paquete inicial de la app. Con solo esto el motor ya
//    clasifica lo cotidiano.
//  - AMPLIADO (`./extended.ts`): el resto. Se carga aparte y en segundo plano (`src/data/catalogLoader.ts`),
//    así quien abre la app no espera ni descarga de golpe todo el vocabulario.
// Para agregar un área nueva: crea el archivo y súmalo a `EXTENDED_PACKS` en extended.ts (no aquí).
import { PACK_BASE } from './base';

export const CORE_PACKS: Array<Record<string, string[]>> = [PACK_BASE];

export const EXTRA_KEYWORDS: Record<string, string[]> = {};
for (const pack of CORE_PACKS) {
  for (const [subcategoryId, keywords] of Object.entries(pack)) {
    (EXTRA_KEYWORDS[subcategoryId] ??= []).push(...keywords);
  }
}

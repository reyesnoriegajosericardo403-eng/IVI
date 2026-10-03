// Palabras clave ampliadas del catálogo, por área de la vida financiera (P1/P1b, 2026-10-03).
// Cada paquete es un archivo `Record<id de subcategoría, palabras[]>`; aquí se mezclan en orden
// (el orden desempata: ante la misma palabra en dos subcategorías gana la primera). Para agregar
// un área nueva: crea el archivo, impórtalo y súmalo a PACKS. Reglas y herramientas de revisión:
// docs/memoria-proyecto/03-motor-clasificacion.md y scripts/golden/packs.cjs.
import { PACK_BASE } from './base';
import { PACK_PAREJA } from './pareja';
import { PACK_BANCOS } from './bancos';
import { PACK_IMPUESTOS } from './impuestos';
import { PACK_HOGAR } from './hogar';
import { PACK_COMIDA } from './comida';
import { PACK_TRANSPORTE } from './transporte';
import { PACK_SALUD } from './salud';
import { PACK_FAMILIA } from './familia';
import { PACK_OCIO } from './ocio';
import { PACK_TRABAJO } from './trabajo';
import { PACK_DINERO } from './dinero';
import { PACK_COMPRAS } from './compras';
import { PACK_COMPLEMENTOS } from './complementos';
import { PACK_PROTEGIDAS } from './protegidas';

export const PACKS: Array<Record<string, string[]>> = [
  PACK_BASE,
  PACK_PAREJA,
  PACK_BANCOS,
  PACK_IMPUESTOS,
  PACK_HOGAR,
  PACK_COMIDA,
  PACK_TRANSPORTE,
  PACK_SALUD,
  PACK_FAMILIA,
  PACK_OCIO,
  PACK_TRABAJO,
  PACK_DINERO,
  PACK_COMPRAS,
  PACK_COMPLEMENTOS,
  PACK_PROTEGIDAS,
];

export const EXTRA_KEYWORDS: Record<string, string[]> = {};
for (const pack of PACKS) {
  for (const [subcategoryId, keywords] of Object.entries(pack)) {
    (EXTRA_KEYWORDS[subcategoryId] ??= []).push(...keywords);
  }
}

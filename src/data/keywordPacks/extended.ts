// Catálogo AMPLIADO: todo lo que no es el núcleo. Este archivo se importa SOLO con `import()` desde
// src/data/catalogLoader.ts (nunca de forma estática desde una pantalla), para que quede en su propio
// trozo y se descargue en segundo plano. El orden de EXTENDED_PACKS importa: desempata palabras repetidas
// (gana la primera) y debe ir después de CORE_PACKS.
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

// Se sube al cambiar CUALQUIER paquete; sirve para el caché y para saber qué versión usa cada motor.
export const CATALOG_VERSION = '2026-10-03.1';

export const EXTENDED_PACKS: Array<Record<string, string[]>> = [
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

// Catálogo de fondos de fotografía preestablecidos por la propietaria de
// VALU (spec: "Antes de dar por terminado el catálogo de fondos, debes
// pedirme mis imágenes preestablecidas... no elijas fotos definitivas por
// tu cuenta ni publiques un catálogo de ejemplo como si fuese el final").
//
// Las 5 categorías existen y la pantalla de Apariencia ya las muestra —
// pero cada `images` empieza VACÍO A PROPÓSITO. Nadie debe ver una foto
// aquí que la propietaria no haya aprobado explícitamente. Cuando ella
// entregue fotos reales, se agregan como entradas nuevas en `images` (ver
// instrucciones de formato al final de este archivo).

export type BackgroundCategoryId = 'soft' | 'gym' | 'inspiracional' | 'arquitectura' | 'naturaleza';

export interface BackgroundImage {
  id: string;
  title: string;
  categoryId: BackgroundCategoryId;
  order: number;
  // Punto focal (0 a 1) recomendado por defecto — el usuario puede
  // ajustarlo, esto solo evita que arranque mal encuadrada.
  focalMobile: { x: number; y: number };
  focalDesktop: { x: number; y: number };
  // require('...') de assets/backgrounds/<categoria>/archivo.jpg — se deja
  // como `any` porque solo existe una vez la imagen real está en el
  // repositorio; mientras tanto la categoría simplemente no tiene entradas.
  source: unknown;
  // 'aprobada' es lo único que se le muestra a un usuario final; 'borrador'
  // sirve para revisar antes de aprobar sin publicarla todavía.
  status: 'borrador' | 'aprobada';
}

export interface BackgroundCategory {
  id: BackgroundCategoryId;
  name: string;
  direction: string;
  images: BackgroundImage[];
}

export const BACKGROUND_CATEGORIES: BackgroundCategory[] = [
  { id: 'soft', name: 'Soft y calma', direction: 'Rincones serenos, luz difusa, texturas suaves, tonos poco saturados.', images: [] },
  { id: 'gym', name: 'Gym y movimiento', direction: 'Entrenamiento, ciclismo o gimnasios sobrios con espacios oscuros útiles para tarjetas.', images: [] },
  { id: 'inspiracional', name: 'Inspiración', direction: 'Escenas evocadoras de progreso, amaneceres, horizontes; sin frases detrás de la interfaz.', images: [] },
  { id: 'arquitectura', name: 'Arquitectura e interiores', direction: 'Salas cálidas, materiales nobles, geometría tranquila y espacios con márgenes libres.', images: [] },
  { id: 'naturaleza', name: 'Naturaleza', direction: 'Paisajes, agua, hojas o cielos poco recargados y con puntos focales adaptables.', images: [] },
];

export function findBackgroundImage(id: string | undefined): BackgroundImage | undefined {
  if (!id) return undefined;
  for (const cat of BACKGROUND_CATEGORIES) {
    const found = cat.images.find((img) => img.id === id);
    if (found) return found;
  }
  return undefined;
}

export function approvedImagesIn(categoryId: BackgroundCategoryId): BackgroundImage[] {
  const category = BACKGROUND_CATEGORIES.find((c) => c.id === categoryId);
  return (category?.images ?? []).filter((img) => img.status === 'aprobada').sort((a, b) => a.order - b.order);
}

// ============================================================
// Cómo agregar una foto real cuando la propietaria la entregue:
//
// 1. Guardar el archivo en assets/backgrounds/<categoria>/<nombre>.jpg
//    (categoria = soft | gym | inspiracional | arquitectura | naturaleza).
// 2. Agregar una entrada al arreglo `images` de esa categoría arriba:
//      {
//        id: 'soft-01',
//        title: 'Rincón de lectura al amanecer',
//        categoryId: 'soft',
//        order: 1,
//        focalMobile: { x: 0.5, y: 0.35 },
//        focalDesktop: { x: 0.35, y: 0.5 },
//        source: require('../../assets/backgrounds/soft/rincon-lectura.jpg'),
//        status: 'aprobada',
//      }
// 3. Confirmar contraste con texto claro (#FEFCF8) encima antes de marcar
//    status: 'aprobada' — usar 'borrador' mientras se revisa.
// ============================================================

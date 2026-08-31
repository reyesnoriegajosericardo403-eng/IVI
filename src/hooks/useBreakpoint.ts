import { useWindowDimensions } from 'react-native';

// Puntos de quiebre simples para que las pantallas se vean bien en
// móvil, tablet/iPad y escritorio/laptop sin romper el diseño mobile-first
// existente (spec: "debe poderse ver sin problemas tanto en dispositivos
// móviles, tabletas como iPads, computadoras de escritorio y laptops").
export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return {
    width,
    isTablet: width >= 768,
    isDesktop: width >= 1024,
  };
}

// Ancho máximo de contenido centrado según el tamaño de pantalla — evita
// que las tarjetas se estiren de borde a borde en pantallas anchas, sin
// inventar un rediseño de columnas que la referencia no mostraba.
export function useContentMaxWidth(): number | undefined {
  const { isDesktop, isTablet } = useBreakpoint();
  if (isDesktop) return 720;
  if (isTablet) return 640;
  return undefined;
}

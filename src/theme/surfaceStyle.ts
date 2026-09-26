import { Platform, type ViewStyle } from 'react-native';

import type { StyleSurface } from './visualStyles';

// Traduce los tokens de sombra del estilo a lo que entiende cada
// plataforma: CSS en web, props de sombra en nativo. Un estilo brutalista
// (radio 0, desplazamiento marcado) y uno suave (radio grande, opacidad
// baja) salen del mismo par de números.
export function surfaceShadow(surface: StyleSurface): ViewStyle {
  const { shadowColor, shadowOpacity, shadowRadius, shadowOffsetX, shadowOffsetY } = surface;
  if (shadowOpacity <= 0) return {};

  if (Platform.OS === 'web') {
    return {
      boxShadow: `${shadowOffsetX}px ${shadowOffsetY}px ${shadowRadius}px ${withAlpha(shadowColor, shadowOpacity)}`,
    } as unknown as ViewStyle;
  }

  return {
    shadowColor,
    shadowOpacity,
    shadowRadius,
    shadowOffset: { width: shadowOffsetX, height: shadowOffsetY },
    // La sombra dura del brutalismo no existe en Android: `elevation` siempre
    // difumina. Se deja baja para no ensuciar el borde marcado, que ahí es lo
    // que carga el estilo.
    elevation: shadowRadius === 0 ? 2 : Math.round(shadowRadius / 4),
  };
}

// El desenfoque real solo existe en web (backdrop-filter). En nativo el
// vidrio se sostiene con la translucidez y el borde claro que ya trae el
// estilo, sin fingir un desenfoque que no está.
export function surfaceBlur(surface: StyleSurface): ViewStyle {
  if (surface.blur <= 0 || Platform.OS !== 'web') return {};
  return {
    backdropFilter: `blur(${surface.blur}px)`,
    WebkitBackdropFilter: `blur(${surface.blur}px)`,
  } as unknown as ViewStyle;
}

// Exportado: también lo usan las tarjetas de cuenta en su variante de
// vidrio (color propio de la cuenta, pero translúcido) y otros lugares que
// necesitan mezclar un color de marca con transparencia. Acepta tanto hex
// como rgba(o) de entrada — cuando ya viene en rgba, reemplaza su alfa por
// el nuevo valor en vez de devolverlo tal cual (lo necesita
// theme/intensifyGlass.ts para volver más transparente un color que el
// estilo de vidrio ya definió como rgba).
export function withAlpha(color: string, alpha: number): string {
  const rgbaMatch = color.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*[\d.]+\s*)?\)$/);
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  if (full.length !== 6) return color;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

import type { ThemeColors } from './colors';
import { withAlpha } from './surfaceStyle';
import type { StyleSurface } from './visualStyles';

function currentAlphaOf(color: string): number {
  const match = color.match(/^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/);
  return match ? parseFloat(match[1]) : 1;
}

export interface IntensifiedGlass {
  surface: StyleSurface;
  cardColor: string;
  borderColor: string;
}

// Vidrio "más líquido" — SOLO para la pantalla que lo pida (el chat de
// IA), nunca cambia el sistema de estilos compartido
// (ThemeProvider.tsx/visualStyles.ts/themeRegistry.ts). Si el estilo
// activo del usuario no tiene desenfoque real (Degradado suave, Neo
// brutalista), no se le finge un vidrio que no tiene — se regresan sus
// tokens normales tal cual, respetando siempre lo que el usuario ya eligió
// en Ajustes.
export function intensifyGlass(colors: ThemeColors, surface: StyleSurface): IntensifiedGlass {
  if (surface.blur <= 0) {
    return { surface, cardColor: colors.surface, borderColor: colors.surfaceBorder };
  }
  return {
    surface: { ...surface, blur: Math.round(surface.blur * 1.6), shadowOpacity: Math.min(1, surface.shadowOpacity * 1.3) },
    cardColor: withAlpha(colors.surface, currentAlphaOf(colors.surface) * 0.6),
    borderColor: withAlpha(colors.surfaceBorder, currentAlphaOf(colors.surfaceBorder) * 0.8),
  };
}

import { darkColors, lightColors, palette, type ThemeColors } from './colors';

// ---------------------------------------------------------------------------
// Estilos visuales intercambiables.
//
// La apariencia completa de la app es DATO, no código: un estilo es un objeto
// con sus colores y sus "tokens de superficie" (borde, sombra, desenfoque,
// degradado, redondeo). Por eso un estilo publicado desde Supabase tiene
// exactamente la misma forma que uno integrado, y puede aparecer sin
// actualizar la app (spec: "requires_app_update: false").
//
// Lo que un estilo NO puede cambiar: la estructura, la navegación, las
// funciones ni la información. Solo cómo se ve (spec: "la estética es
// intercambiable; la experiencia funcional permanece consistente").
// ---------------------------------------------------------------------------

export type VisualStyleStatus = 'permanent' | 'temporary' | 'archived';

export interface StyleSurface {
  // Multiplica el radius base — un estilo brutalista lo baja, uno suave lo sube.
  radiusScale: number;
  borderWidth: number;
  // La sombra se describe en piezas para poder traducirla tanto a CSS (web)
  // como a las props de sombra de React Native.
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  // Desenfoque del fondo detrás de las tarjetas translúcidas. 0 = sin
  // desenfoque. Solo se puede aplicar de verdad en web (backdrop-filter); en
  // nativo el estilo se sostiene con la translucidez y el borde.
  blur: number;
  // Degradado del fondo de la app. Si existe, `colors.background` va en
  // 'transparent' para que el degradado de atrás se vea a través de las
  // pantallas.
  backgroundGradient: string[] | null;
  // Manchas de luz suaves y difuminadas sobre el degradado — sin esto, un
  // degradado de solo dos tonos es casi plano y el desenfoque de una
  // tarjeta de vidrio encima no se nota (no hay nada que "distorsionar").
  // cx/cy/radius van en fracción del ancho/alto de la pantalla (0 a 1), así
  // se ven bien en cualquier tamaño. Opcional: los estilos sin vidrio no lo
  // usan.
  backgroundGlow?: Array<{ color: string; cx: number; cy: number; radius: number }> | null;
  // Refuerza el peso de la tipografía (brutalista).
  boldText: boolean;
}

export interface VisualStyleVariant {
  colors: ThemeColors;
  surface: StyleSurface;
}

export interface VisualStyleDefinition {
  id: string;
  name: string;
  description: string;
  status: VisualStyleStatus;
  version: string;
  publishedAt: string | null;
  // Cuando llega esta fecha el estilo deja de ofrecerse y quien lo tenía
  // puesto regresa a su último estilo permanente.
  expiresAt: string | null;
  light: VisualStyleVariant;
  dark: VisualStyleVariant;
  // Solo "Vidrio líquido" la trae en true — habilita en Ajustes > Apariencia
  // la sección de Fondo (catálogo/foto propia) y la paleta de acento
  // seleccionable. Los demás estilos no tienen material pensado para
  // mostrar una fotografía detrás, así que no se les ofrece.
  supportsBackgroundPhoto?: boolean;
}

// Sombra suave compartida por los estilos no brutalistas.
const softShadow = {
  shadowColor: '#0B1220',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffsetX: 0,
  shadowOffsetY: 8,
};

// ---------------------------------------------------------------------------
// 1. Glassmorphism — el estilo por defecto: es el que la app ya tenía, ahora
//    con el desenfoque y el degradado que le faltaban para leerse como vidrio.
// ---------------------------------------------------------------------------
const glassmorphism: VisualStyleDefinition = {
  id: 'glassmorphism',
  name: 'Vidrio',
  description: 'Translúcido y ligero: las tarjetas dejan ver el fondo.',
  status: 'permanent',
  version: '1.0',
  publishedAt: null,
  expiresAt: null,
  light: {
    colors: {
      ...lightColors,
      background: 'transparent',
      // Más transparente que antes — spec: "que parezca un poquito mas a
      // vidrio real", que se note el movimiento de lo que hay detrás.
      surface: 'rgba(255,255,255,0.42)',
      surfaceBorder: 'rgba(255,255,255,0.75)',
      tabBarBackground: 'rgba(255,255,255,0.6)',
    },
    surface: {
      ...softShadow,
      radiusScale: 1.15,
      borderWidth: 1,
      blur: 22,
      backgroundGradient: ['#E9EEFA', '#EDF6F4'],
      // Dos manchas pastel muy suaves — el ojo casi no las nota como
      // "formas", pero le dan al fondo la variación de luz que hace que el
      // desenfoque de una tarjeta de vidrio encima se vea real.
      backgroundGlow: [
        { color: palette.indigoLight, cx: 0.14, cy: 0.08, radius: 0.55 },
        { color: palette.tealLight, cx: 0.92, cy: 0.42, radius: 0.5 },
      ],
      boldText: false,
    },
  },
  dark: {
    colors: {
      ...darkColors,
      background: 'transparent',
      surface: 'rgba(255,255,255,0.055)',
      surfaceBorder: 'rgba(255,255,255,0.16)',
      tabBarBackground: 'rgba(28,28,31,0.58)',
    },
    surface: {
      ...softShadow,
      shadowColor: '#000000',
      shadowOpacity: 0.4,
      radiusScale: 1.15,
      borderWidth: 1,
      blur: 24,
      backgroundGradient: ['#17171A', '#0C0C0E'],
      // Referencia del usuario: un fondo oscuro con un resplandor sutil
      // (nunca un color plano) para que el vidrio esmerilado tenga algo que
      // distorsionar cuando una tarjeta pasa por encima.
      backgroundGlow: [
        { color: palette.indigo, cx: 0.12, cy: 0.05, radius: 0.6 },
        { color: palette.teal, cx: 0.9, cy: 0.5, radius: 0.55 },
      ],
      boldText: false,
    },
  },
};

// ---------------------------------------------------------------------------
// 2. Soft Gradient — limpio y fluido: tarjetas sólidas, casi sin borde, sobre
//    un degradado suave.
// ---------------------------------------------------------------------------
const softGradient: VisualStyleDefinition = {
  id: 'soft_gradient',
  name: 'Degradado suave',
  description: 'Limpio y fluido, con tarjetas sólidas sobre un degradado.',
  status: 'permanent',
  version: '1.0',
  publishedAt: null,
  expiresAt: null,
  light: {
    colors: {
      ...lightColors,
      background: 'transparent',
      surface: '#FFFFFF',
      surfaceSolid: '#FFFFFF',
      surfaceBorder: 'rgba(15,23,42,0.04)',
      tabBarBackground: 'rgba(255,255,255,0.92)',
    },
    surface: {
      ...softShadow,
      shadowOpacity: 0.1,
      shadowRadius: 22,
      shadowOffsetY: 10,
      radiusScale: 1.25,
      borderWidth: 0,
      blur: 0,
      backgroundGradient: ['#FBFCFF', '#EAF0FB'],
      boldText: false,
    },
  },
  dark: {
    colors: {
      ...darkColors,
      background: 'transparent',
      surface: '#1E1E22',
      surfaceSolid: '#1E1E22',
      surfaceBorder: 'rgba(255,255,255,0.05)',
      tabBarBackground: 'rgba(30,30,34,0.92)',
    },
    surface: {
      ...softShadow,
      shadowColor: '#000000',
      shadowOpacity: 0.45,
      shadowRadius: 22,
      shadowOffsetY: 10,
      radiusScale: 1.25,
      borderWidth: 0,
      blur: 0,
      backgroundGradient: ['#1A1A1E', '#0B0B0D'],
      boldText: false,
    },
  },
};

// ---------------------------------------------------------------------------
// 3. Neo Brutalist — contundente: borde grueso, sombra dura sin difuminar,
//    esquinas menos redondeadas y tipografía más pesada.
// ---------------------------------------------------------------------------
const neoBrutalist: VisualStyleDefinition = {
  id: 'neo_brutalist',
  name: 'Neo brutalista',
  description: 'Contundente y geométrico: bordes marcados y sombra dura.',
  status: 'permanent',
  version: '1.0',
  publishedAt: null,
  expiresAt: null,
  light: {
    colors: {
      ...lightColors,
      background: '#F2F1EC',
      backgroundAlt: '#E8E7E0',
      surface: '#FFFFFF',
      surfaceSolid: '#FFFFFF',
      surfaceBorder: '#111111',
      textPrimary: '#111111',
      textSecondary: '#3B3B3B',
      divider: 'rgba(17,17,17,0.15)',
      tabBarBackground: '#FFFFFF',
    },
    surface: {
      radiusScale: 0.5,
      borderWidth: 2.5,
      shadowColor: '#111111',
      shadowOpacity: 1,
      shadowRadius: 0,
      shadowOffsetX: 4,
      shadowOffsetY: 4,
      blur: 0,
      backgroundGradient: null,
      boldText: true,
    },
  },
  dark: {
    colors: {
      ...darkColors,
      background: '#0A0A0A',
      backgroundAlt: '#000000',
      surface: '#161616',
      surfaceSolid: '#161616',
      surfaceBorder: '#FFFFFF',
      textPrimary: '#FFFFFF',
      divider: 'rgba(255,255,255,0.18)',
      tabBarBackground: '#161616',
    },
    surface: {
      radiusScale: 0.5,
      borderWidth: 2.5,
      shadowColor: palette.indigoLight,
      shadowOpacity: 1,
      shadowRadius: 0,
      shadowOffsetX: 4,
      shadowOffsetY: 4,
      blur: 0,
      backgroundGradient: null,
      boldText: true,
    },
  },
};

// ---------------------------------------------------------------------------
// 4. Vidrio líquido — material premium con fondo fijo cálido oscuro (o una
//    fotografía elegida) y vidrio grafito neutro encima. A diferencia de los
//    otros tres, es UNA sola identidad (no cambia entre claro/oscuro: la
//    dirección de diseño pide justo eso, "personalidad serena... premium sin
//    ostentación", no un modo claro alterno) — `light` y `dark` son el mismo
//    objeto a propósito. El acento (botón principal, iconos activos, chips)
//    lo decide la paleta que el usuario elija por separado
//    (theme/accentPalettes.ts); aquí solo va un default razonable.
// ---------------------------------------------------------------------------
const LIQUID_GLASS_BACKGROUND = '#1B2029';
const liquidGlassVariant: VisualStyleVariant = {
  colors: {
    // 'transparent', no el hex — cada pantalla pinta su propio
    // SafeAreaView/View con `colors.background`, y si fuera opaco taparía
    // por completo la foto de fondo que pinta AppBackground.tsx detrás de
    // TODA la app (mismo patrón ya usado por vidrio/degradado suave abajo:
    // el color real vive en `surface.backgroundGradient`, no aquí).
    background: 'transparent',
    backgroundAlt: '#20262F',
    // glass_base (#303844) — más transparente que el "0.56 a 0.76" que
    // sugería el prompt original: contra una foto de verdad esa opacidad se
    // veía casi sólida (feedback directo del usuario comparando contra la
    // imagen de referencia), así que se bajó hasta que el fondo se nota de
    // verdad a través de la ficha sin perder legibilidad del texto.
    surface: 'rgba(48,56,68,0.38)',
    surfaceBorder: 'rgba(255,255,255,0.22)', // glass_outline_light, un poco más marcado para compensar el relleno más transparente
    surfaceSolid: '#2A313C',
    textPrimary: '#FEFCF8',
    textSecondary: '#D7D6D1',
    textTertiary: '#9CA1AA',
    // Default antes de aplicar la paleta de acento elegida (azul glaciar).
    accentFrom: '#9EC8EC',
    accentTo: '#4D6C93',
    accentSoft: 'rgba(158,200,236,0.16)',
    // Colores semánticos financieros del JSON — nunca cambian con la
    // paleta de acento ni con la foto de fondo.
    success: '#75CBB0', // positive_or_category_green
    // El JSON no define un tono de "advertencia" propio (solo
    // planeado/gastado/positivo) — se deriva un ámbar cálido coherente con
    // la dirección de diseño, distinto del acento y del rojo de gastado.
    warning: '#E3B873',
    danger: '#F27F82', // spent_or_negative
    info: '#99B5D4', // planned_data
    tabBarBackground: 'rgba(27,32,41,0.58)',
    divider: 'rgba(255,255,255,0.10)',
  },
  surface: {
    shadowColor: '#000000',
    shadowOpacity: 0.28, // glass_shadow
    shadowRadius: 20,
    shadowOffsetX: 0,
    shadowOffsetY: 10,
    radiusScale: 1.05, // corner_radius 20-28px sobre un radius.lg base de 24
    borderWidth: 1,
    blur: 30, // backdrop_blur 18-32px, cerca del máximo — más transparencia pide más desenfoque real para que el texto siga legible
    // Dos paradas del mismo color (no null): AppBackground.tsx solo pinta
    // ALGO de fondo propio cuando `backgroundGradient` tiene 2+ paradas —
    // si fuera null, cada pantalla individual (que ahora tiene su propio
    // `colors.background: 'transparent'`) quedaría sin ningún color detrás
    // cuando el usuario no eligió foto ("Sin foto").
    backgroundGradient: [LIQUID_GLASS_BACKGROUND, LIQUID_GLASS_BACKGROUND],
    backgroundGlow: null,
    boldText: false,
  },
};
export const LIQUID_GLASS_STYLE_ID = 'liquid_glass';
const liquidGlass: VisualStyleDefinition = {
  id: LIQUID_GLASS_STYLE_ID,
  name: 'Vidrio líquido',
  description: 'Serena y premium: vidrio grafito sobre un fondo oscuro cálido o una foto que elijas.',
  status: 'permanent',
  version: '1.0',
  publishedAt: null,
  expiresAt: null,
  light: liquidGlassVariant,
  dark: liquidGlassVariant,
  supportsBackgroundPhoto: true,
};

// Los estilos que viajan dentro de la app. Un tema remoto con el mismo id
// tiene prioridad, para poder corregir uno de estos sin publicar una versión
// nueva de la app.
export const BUILT_IN_VISUAL_STYLES: VisualStyleDefinition[] = [glassmorphism, softGradient, neoBrutalist, liquidGlass];

export const DEFAULT_VISUAL_STYLE_ID = glassmorphism.id;

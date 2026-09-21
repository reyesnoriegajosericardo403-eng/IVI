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
      surface: 'rgba(255,255,255,0.62)',
      surfaceBorder: 'rgba(255,255,255,0.85)',
      tabBarBackground: 'rgba(255,255,255,0.72)',
    },
    surface: {
      ...softShadow,
      radiusScale: 1.15,
      borderWidth: 1,
      blur: 18,
      backgroundGradient: ['#E9EEFA', '#EDF6F4'],
      boldText: false,
    },
  },
  dark: {
    colors: {
      ...darkColors,
      background: 'transparent',
      surface: 'rgba(255,255,255,0.07)',
      surfaceBorder: 'rgba(255,255,255,0.14)',
      tabBarBackground: 'rgba(28,28,31,0.72)',
    },
    surface: {
      ...softShadow,
      shadowColor: '#000000',
      shadowOpacity: 0.4,
      radiusScale: 1.15,
      borderWidth: 1,
      blur: 20,
      backgroundGradient: ['#17171A', '#0C0C0E'],
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

// Los estilos que viajan dentro de la app. Un tema remoto con el mismo id
// tiene prioridad, para poder corregir uno de estos sin publicar una versión
// nueva de la app.
export const BUILT_IN_VISUAL_STYLES: VisualStyleDefinition[] = [glassmorphism, softGradient, neoBrutalist];

export const DEFAULT_VISUAL_STYLE_ID = glassmorphism.id;

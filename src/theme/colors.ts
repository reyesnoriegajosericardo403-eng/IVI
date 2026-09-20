// Paleta "Premium Fintech" de VALU. Un solo acento (índigo→teal) reutilizado
// en toda la app para mantener coherencia visual (spec sección 12-13).

export const palette = {
  indigo: '#4F46E5',
  indigoLight: '#818CF8',
  teal: '#14B8A6',
  tealLight: '#2DD4BF',
  success: '#16A34A',
  successLight: '#22C55E',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  danger: '#EF4444',
  dangerLight: '#F87171',
  info: '#3B82F6',
  infoLight: '#60A5FA',
  white: '#FFFFFF',
  black: '#000000',
};

export interface ThemeColors {
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceBorder: string;
  surfaceSolid: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accentFrom: string;
  accentTo: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  tabBarBackground: string;
  divider: string;
}

export const lightColors: ThemeColors = {
  background: '#F4F6FA',
  backgroundAlt: '#EAEEF6',
  surface: 'rgba(255,255,255,0.72)',
  surfaceBorder: 'rgba(15,23,42,0.08)',
  surfaceSolid: '#FFFFFF',
  textPrimary: '#0B1220',
  textSecondary: '#5B6472',
  textTertiary: '#8B93A1',
  accentFrom: palette.indigo,
  accentTo: palette.teal,
  accentSoft: 'rgba(79,70,229,0.10)',
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  info: palette.info,
  tabBarBackground: 'rgba(255,255,255,0.85)',
  divider: 'rgba(15,23,42,0.06)',
};

// Gris/negro neutro a propósito — nada de navy ni tinte morado (spec:
// "en el modo oscuro... los tonos oscuros no sean un morado o azul
// oscuro, sino... tonalidades de gris... para que se vea más formal y
// tenga un aspecto más profesional"). El acento índigo→teal se conserva
// para botones y resaltados: es la identidad de marca, no el "tono
// oscuro" del fondo del que se quejó el usuario.
export const darkColors: ThemeColors = {
  background: '#121214',
  backgroundAlt: '#0A0A0B',
  surface: 'rgba(255,255,255,0.05)',
  surfaceBorder: 'rgba(255,255,255,0.09)',
  surfaceSolid: '#1C1C1F',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textTertiary: '#71717A',
  accentFrom: palette.indigoLight,
  accentTo: palette.tealLight,
  accentSoft: 'rgba(129,140,248,0.16)',
  success: palette.successLight,
  warning: palette.warningLight,
  danger: palette.dangerLight,
  info: palette.infoLight,
  tabBarBackground: 'rgba(24,24,27,0.88)',
  divider: 'rgba(255,255,255,0.08)',
};

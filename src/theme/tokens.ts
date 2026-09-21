export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Los pesos se declaran como unión (y no como literal fijo por token) para
// que un estilo visual pueda reforzarlos — el brutalista sube toda la
// escala un paso.
export type TextWeight = '400' | '500' | '600' | '700' | '800';

export interface TypographyToken {
  fontSize: number;
  fontWeight: TextWeight;
  letterSpacing?: number;
}

export type TypographyScale = Record<
  'display' | 'title' | 'headline' | 'body' | 'caption' | 'micro',
  TypographyToken
>;

export const typography: TypographyScale = {
  display: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  headline: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '500' },
  micro: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
};

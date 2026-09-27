// Paletas de acento seleccionables para el estilo "Vidrio líquido" (spec:
// "el tema de color aparece selectivamente en el aviso principal, botón
// principal, iconos activos, chips seleccionados y pequeños acentos; no
// tiñas toda la pantalla con un solo color"). Nunca tocan los colores
// semánticos financieros (planeado/gastado/positivo/alertas) — esos viven
// en LIQUID_GLASS_TOKENS (visualStyles.ts) y son iguales sin importar la
// paleta elegida.

export interface AccentPalette {
  id: string;
  name: string;
  // Superficie de aviso/insight destacado (ej. banner de presupuesto) —
  // más saturada, pensada para un fondo propio, no para texto encima.
  insightSurface: string;
  // Acento principal: botones, iconos activos, chips seleccionados.
  accent: string;
  // Color de texto/ícono legible SOBRE `accent` cuando `accent` es claro.
  accentText: string;
}

export const ACCENT_PALETTES: AccentPalette[] = [
  { id: 'azul_glaciar', name: 'Azul glaciar', insightSurface: '#4D6C93', accent: '#9EC8EC', accentText: '#172331' },
  { id: 'jade_luminoso', name: 'Jade luminoso', insightSurface: '#397E72', accent: '#8DD9C0', accentText: '#132821' },
  { id: 'lavanda_mineral', name: 'Lavanda mineral', insightSurface: '#6E638B', accent: '#C5ADE7', accentText: '#282035' },
  { id: 'champan', name: 'Champán', insightSurface: '#7E6F5E', accent: '#E3C79C', accentText: '#1B2029' },
  { id: 'rosa_cuarzo', name: 'Rosa cuarzo', insightSurface: '#875E72', accent: '#E7B4C8', accentText: '#2B1E28' },
  { id: 'cobre_suave', name: 'Cobre suave', insightSurface: '#875C40', accent: '#E9AF82', accentText: '#2D211B' },
  { id: 'salvia', name: 'Salvia', insightSurface: '#536E60', accent: '#B7D4AF', accentText: '#1D2A22' },
  { id: 'ambar_tenue', name: 'Ámbar tenue', insightSurface: '#7C663D', accent: '#E5CF91', accentText: '#292419' },
];

export const DEFAULT_ACCENT_PALETTE_ID = ACCENT_PALETTES[0].id;

export function findAccentPalette(id: string | undefined): AccentPalette {
  return ACCENT_PALETTES.find((p) => p.id === id) ?? ACCENT_PALETTES[0];
}

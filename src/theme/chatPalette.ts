// Paleta FIJA y oscura, solo para la pantalla del chat de IA — a pedido
// explícito del usuario, que quiere que esta pantalla en particular se
// vea como su referencia (fondo oscuro, esfera de color, vidrio real en
// las tarjetas), sin importar si tiene el tema claro/oscuro o qué estilo
// visual (vidrio/degradado suave/brutalista) eligió para el resto de la
// app. Es una excepción deliberada y contenida a esta sola pantalla — el
// resto de VALU sigue respetando el tema del usuario tal cual
// (theme/ThemeProvider.tsx no se toca). Paleta deliberadamente sin
// naranjas/cafés — solo violetas, azules y verde-azulados (a pedido
// explícito: "quita los tonos naranjas").
export const CHAT_PALETTE = {
  background: '#0B0A14',
  backgroundGlow: [
    { color: '#8B5CF6', cx: 0.12, cy: 0.08, radius: 0.55 },
    { color: '#22D3EE', cx: 0.92, cy: 0.28, radius: 0.5 },
    { color: '#6366F1', cx: 0.35, cy: 0.95, radius: 0.5 },
  ],
  // Vidrio real: fondo translúcido + desenfoque (backdrop-filter en web;
  // en nativo se sostiene con la translucidez y el borde claro).
  glassBackground: 'rgba(255,255,255,0.07)',
  glassBackgroundStrong: 'rgba(255,255,255,0.1)',
  glassBorder: 'rgba(255,255,255,0.16)',
  glassBlurPx: 22,
  surfaceBorder: 'rgba(255,255,255,0.10)',
  surfaceActive: 'rgba(139,92,246,0.24)',
  textPrimary: '#F5F3FF',
  textSecondary: 'rgba(245,243,255,0.66)',
  textTertiary: 'rgba(245,243,255,0.4)',
  accent: '#8B5CF6',
  accentSoft: 'rgba(139,92,246,0.2)',
  userBubble: '#8B5CF6',
  success: '#34D399',
  danger: '#F87171',
  orbStops: ['#C4B5FD', '#8B5CF6', '#22D3EE', '#38BDF8'],
};

export type ChatPalette = typeof CHAT_PALETTE;

// Estilo de vidrio reutilizable — mismas propiedades que ya arma
// theme/surfaceStyle.ts para el resto de la app, pero con esta paleta fija
// en vez del estilo visual activo del usuario.
export function chatGlass(strong = false) {
  return {
    backgroundColor: strong ? CHAT_PALETTE.glassBackgroundStrong : CHAT_PALETTE.glassBackground,
    borderColor: CHAT_PALETTE.glassBorder,
    borderWidth: 1,
    backdropFilter: `blur(${CHAT_PALETTE.glassBlurPx}px)` as any,
    WebkitBackdropFilter: `blur(${CHAT_PALETTE.glassBlurPx}px)` as any,
  };
}

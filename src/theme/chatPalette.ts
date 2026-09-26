// Paleta FIJA y oscura, solo para la pantalla del chat de IA — a pedido
// explícito del usuario, que quiere que esta pantalla en particular se
// vea "casi 90%" como su referencia (fondo oscuro, esfera de degradado a
// color, tarjetas oscuras), sin importar si tiene el tema claro/oscuro o
// qué estilo visual (vidrio/degradado suave/brutalista) eligió para el
// resto de la app. Es una excepción deliberada y contenida a esta sola
// pantalla — el resto de VALU sigue respetando el tema del usuario tal
// cual (theme/ThemeProvider.tsx no se toca).
export const CHAT_PALETTE = {
  background: '#0B0A14',
  backgroundGlow: [
    { color: '#8B5CF6', cx: 0.12, cy: 0.08, radius: 0.55 },
    { color: '#22D3EE', cx: 0.92, cy: 0.28, radius: 0.5 },
    { color: '#F59E0B', cx: 0.35, cy: 0.95, radius: 0.5 },
  ],
  surface: 'rgba(255,255,255,0.06)',
  surfaceSolid: '#181425',
  surfaceBorder: 'rgba(255,255,255,0.10)',
  surfaceActive: 'rgba(139,92,246,0.22)',
  textPrimary: '#F5F3FF',
  textSecondary: 'rgba(245,243,255,0.66)',
  textTertiary: 'rgba(245,243,255,0.4)',
  accent: '#8B5CF6',
  accentSoft: 'rgba(139,92,246,0.2)',
  userBubble: '#8B5CF6',
  success: '#34D399',
  danger: '#F87171',
  orbStops: ['#C4B5FD', '#8B5CF6', '#22D3EE', '#F59E0B'],
};

export type ChatPalette = typeof CHAT_PALETTE;

// Paleta de colores para fichas de cuentas (Cuentas/Patrimonio). El
// efectivo siempre usa CASH_ACCOUNT_COLOR fijo (spec: "en el caso de
// efectivo debe ser un verde") — las demás cuentas eligen entre esta
// paleta al crearlas.
export const CASH_ACCOUNT_COLOR = '#22C55E';

export const ACCOUNT_COLOR_SWATCHES: string[] = [
  '#4F46E5', // índigo (acento de la app)
  '#0EA5E9', // azul cielo
  '#8B5CF6', // violeta
  '#EC4899', // rosa
  '#F59E0B', // ámbar
  '#EF4444', // rojo
  '#14B8A6', // verde azulado
  '#64748B', // gris pizarra
];

export const DEFAULT_ACCOUNT_COLOR = ACCOUNT_COLOR_SWATCHES[0];

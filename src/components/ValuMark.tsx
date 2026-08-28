import React, { useId } from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

// Símbolo VALU — PLACEHOLDER de Fase 1.
// El usuario indicó que la identidad final se basa en su símbolo "Opción 4"
// (aún no compartido en esta conversación). Este marcador conserva el
// espíritu pedido: una "V" ascendente (crecimiento/patrimonio) que se
// resuelve en un nodo (inteligencia/análisis). Debe reemplazarse por el
// símbolo real en cuanto el usuario proporcione la imagen de referencia.
interface ValuMarkProps {
  size?: number;
  variant?: 'default' | 'ai' | 'mono';
  monoColor?: string;
}

export function ValuMark({ size = 40, variant = 'default', monoColor }: ValuMarkProps) {
  const gradId = `valuGrad-${useId()}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Defs>
        <LinearGradient id={gradId} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#4F46E5" />
          <Stop offset="1" stopColor="#14B8A6" />
        </LinearGradient>
      </Defs>
      <Path
        d="M20 2C10.06 2 2 10.06 2 20s8.06 18 18 18 18-8.06 18-18S29.94 2 20 2z"
        fill={variant === 'mono' ? 'transparent' : `url(#${gradId})`}
        opacity={variant === 'mono' ? 0 : 1}
      />
      <Path
        d="M11 13L19.2 29.5C19.55 30.22 20.6 30.19 20.9 29.45L23.6 22.8"
        stroke={variant === 'mono' ? monoColor ?? '#0B1220' : '#FFFFFF'}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M24.8 20L29.6 10.2"
        stroke={variant === 'mono' ? monoColor ?? '#0B1220' : '#FFFFFF'}
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
      {variant === 'ai' && (
        <>
          <Circle cx={30} cy={9} r={3.4} fill="#FFFFFF" />
          <Path d="M30 4.5V6.2M30 11.8V13.5M25.5 9H27.2M32.8 9H34.5" stroke="#14B8A6" strokeWidth={1.2} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

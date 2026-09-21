import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Filter, FeGaussianBlur, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

// Fondo de la app según el estilo visual activo: un degradado suave (vidrio,
// degradado suave) o un color sólido (brutalista). Vive DETRÁS de todas las
// pantallas — por eso los estilos con degradado dejan `colors.background` en
// 'transparent': las pantallas siguen pintando su fondo como siempre, solo
// que ese fondo deja ver el degradado de aquí abajo.
export function AppBackground({ children }: { children: React.ReactNode }) {
  const { surface, colors, scheme } = useTheme();
  const gradient = surface.backgroundGradient;
  const glow = surface.backgroundGlow;
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  return (
    <View
      onLayout={onLayout}
      // El primer tono del degradado sirve de base mientras se mide el
      // tamaño, así nunca hay un destello blanco al abrir.
      style={[styles.root, { backgroundColor: gradient?.[0] ?? colors.background }]}
    >
      {gradient && gradient.length >= 2 && size.width > 0 && (
        <GradientLayer stops={gradient} glow={glow ?? null} width={size.width} height={size.height} scheme={scheme} />
      )}
      <View style={styles.root}>{children}</View>
    </View>
  );
}

// Se dibuja con SVG en todas las plataformas: react-native-web descarta la
// propiedad `backgroundImage` de CSS, así que un degradado hecho con estilos
// simplemente no aparecería en la versión web.
function GradientLayer({
  stops,
  glow,
  width,
  height,
  scheme,
}: {
  stops: string[];
  glow: Array<{ color: string; cx: number; cy: number; radius: number }> | null;
  width: number;
  height: number;
  scheme: 'light' | 'dark';
}) {
  // El radio de las manchas se basa en el lado más largo, así se ven igual
  // de "grandes y suaves" sin importar la proporción de la pantalla.
  const maxSide = Math.max(width, height);
  // En oscuro se nota menos un color de más, así que puede llevar algo más
  // de intensidad sin ensuciarse; en claro un poco basta y de más se ve
  // turbio.
  const glowOpacity = scheme === 'dark' ? 0.22 : 0.13;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="appBackground" x1="0" y1="0" x2="0.4" y2="1">
            {stops.map((color, i) => (
              <Stop key={color + i} offset={`${(i / (stops.length - 1)) * 100}%`} stopColor={color} />
            ))}
          </LinearGradient>
          {/* Desenfoque grande y parejo: convierte un círculo sólido en una
              mancha de luz suave, sin bordes duros que se noten como forma. */}
          <Filter id="appBackgroundGlowBlur" x="-50%" y="-50%" width="200%" height="200%">
            <FeGaussianBlur stdDeviation={maxSide * 0.09} />
          </Filter>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#appBackground)" />
        {glow?.map((spot, i) => (
          <Circle
            key={spot.color + i}
            cx={spot.cx * width}
            cy={spot.cy * height}
            r={spot.radius * maxSide}
            fill={spot.color}
            // Muy baja: es una variación de luz, no una forma que se note ni
            // distraiga — solo lo suficiente para que el desenfoque de una
            // tarjeta de vidrio encima tenga algo real que distorsionar.
            fillOpacity={glowOpacity}
            filter="url(#appBackgroundGlowBlur)"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

// Fondo de la app según el estilo visual activo: un degradado suave (vidrio,
// degradado suave) o un color sólido (brutalista). Vive DETRÁS de todas las
// pantallas — por eso los estilos con degradado dejan `colors.background` en
// 'transparent': las pantallas siguen pintando su fondo como siempre, solo
// que ese fondo deja ver el degradado de aquí abajo.
export function AppBackground({ children }: { children: React.ReactNode }) {
  const { surface, colors } = useTheme();
  const gradient = surface.backgroundGradient;
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
        <GradientLayer stops={gradient} width={size.width} height={size.height} />
      )}
      <View style={styles.root}>{children}</View>
    </View>
  );
}

// Se dibuja con SVG en todas las plataformas: react-native-web descarta la
// propiedad `backgroundImage` de CSS, así que un degradado hecho con estilos
// simplemente no aparecería en la versión web.
function GradientLayer({ stops, width, height }: { stops: string[]; width: number; height: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="appBackground" x1="0" y1="0" x2="0.4" y2="1">
            {stops.map((color, i) => (
              <Stop key={color + i} offset={`${(i / (stops.length - 1)) * 100}%`} stopColor={color} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#appBackground)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

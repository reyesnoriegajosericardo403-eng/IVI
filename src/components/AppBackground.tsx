import React, { useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Filter, FeGaussianBlur, LinearGradient, Rect, Stop } from 'react-native-svg';

import { BackgroundPhotoLayer } from '@/components/BackgroundPhotoLayer';
import { findBackgroundImage } from '@/data/backgroundCatalog';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

// Fondo de la app según el estilo visual activo — vive DETRÁS de todas las
// pantallas (montado una sola vez en app/_layout.tsx), así que cualquier
// cosa que se agregue aquí aparece en TODA la app sin tocar una sola
// pantalla (spec: "aplicado absolutamente en toda la app, hasta en la más
// olvidada"). Tres capas posibles, de atrás hacia adelante:
//   1. Degradado suave (vidrio, degradado suave) o color sólido (brutalista,
//      vidrio líquido sin foto) — como ya existía.
//   2. Fotografía elegida (catálogo o propia), solo si el estilo activo la
//      soporta (`supportsBackgroundPhoto`) y el usuario eligió una.
//   3. Oscurecimiento graduado + desenfoque encima de la foto, para que el
//      contenido financiero se lea siempre (spec: "queda suavemente
//      desenfocada y oscurecida bajo texto y fichas").
export function AppBackground({ children }: { children: React.ReactNode }) {
  const { surface, colors, scheme, style } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const { isTablet } = useBreakpoint();
  const gradient = surface.backgroundGradient;
  const glow = surface.backgroundGlow;
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [reduceTransparency, setReduceTransparency] = useState(false);

  React.useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then(setReduceTransparency)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceTransparencyChanged', setReduceTransparency);
    return () => sub?.remove?.();
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  const photoSource = resolveBackgroundPhoto(style.supportsBackgroundPhoto, profile);
  const showPhoto = !!photoSource && !reduceTransparency;

  return (
    <View
      onLayout={onLayout}
      style={[styles.root, { backgroundColor: gradient?.[0] ?? colors.background }]}
    >
      {gradient && gradient.length >= 2 && size.width > 0 && !showPhoto && (
        <GradientLayer stops={gradient} glow={glow ?? null} width={size.width} height={size.height} scheme={scheme} />
      )}
      {/* Igual que GradientLayer: se espera a tener el tamaño REAL medido
          (size.width > 0) y se le pasa en píxeles — nunca "100%"/absoluteFill
          puro. Confirmado con un dispositivo real (spec 2026-09-27): la foto
          por CSS/absoluteFill quedaba comprimida a una franja en vez de
          cubrir la pantalla en el PWA de celular/iPad — el mismo patrón que
          ya usa el degradado (medir primero, dibujar en un <Svg> con
          dimensiones exactas) es el que sí se sostiene en cualquier
          plataforma. */}
      {showPhoto && size.width > 0 && (
        <BackgroundPhotoLayer
          uri={photoSource!.uri}
          source={photoSource!.reactSource}
          width={size.width}
          height={size.height}
          focalX={isTablet ? profile.backgroundFocalXDesktop ?? 0.5 : profile.backgroundFocalXMobile ?? 0.5}
          focalY={isTablet ? profile.backgroundFocalYDesktop ?? 0.5 : profile.backgroundFocalYMobile ?? 0.5}
          darkness={profile.backgroundDarkness ?? 0.55}
          blurAmount={profile.backgroundBlurAmount ?? 0.3}
        />
      )}
      <View style={styles.root}>{children}</View>
    </View>
  );
}

function resolveBackgroundPhoto(
  supports: boolean | undefined,
  profile: { backgroundMode?: string; backgroundCatalogImageId?: string; backgroundCustomUri?: string }
): { uri?: string; reactSource?: unknown } | null {
  if (!supports) return null;
  if (profile.backgroundMode === 'custom' && profile.backgroundCustomUri) {
    return { uri: profile.backgroundCustomUri };
  }
  if (profile.backgroundMode === 'catalog' && profile.backgroundCatalogImageId) {
    const image = findBackgroundImage(profile.backgroundCatalogImageId);
    if (image) return { reactSource: image.source };
  }
  return null;
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

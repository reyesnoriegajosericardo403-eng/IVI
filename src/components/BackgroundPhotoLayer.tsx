import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Filter, FeGaussianBlur, Image as SvgImage, LinearGradient, Rect, Stop } from 'react-native-svg';

// Extraído de AppBackground.tsx para que la vista previa de Apariencia
// (AppearancePreview.tsx) pinte EXACTAMENTE lo mismo que el fondo real de
// toda la app — antes la vista previa usaba un <Image resizeMode="cover">
// aparte que ni siquiera respetaba el punto focal, así que mover el punto
// focal no cambiaba nada visible ahí (una de las quejas reportadas: "no se
// puede ver cómo está cambiando").

// De 0/1 (posición de un punto arrastrado sobre la vista previa) a las
// palabras clave que entiende `preserveAspectRatio` de SVG — "slice" es
// exactamente el recorte tipo `resizeMode="cover"`, pero anclado a
// coordenadas de píxel reales en vez de depender de que el CSS del
// navegador calcule bien un `position:absolute` con porcentajes (lo que
// fallaba en un PWA de dispositivo real).
export function focalKeyword(x: number, y: number): string {
  const xKey = x < 0.34 ? 'xMin' : x > 0.66 ? 'xMax' : 'xMid';
  const yKey = y < 0.34 ? 'YMin' : y > 0.66 ? 'YMax' : 'YMid';
  return `${xKey}${yKey} slice`;
}

// La foto en sí, con su punto focal, oscurecimiento y desenfoque — dibujada
// dentro de un <Svg> con el tamaño MEDIDO en píxeles, nunca con
// `position:absolute` + porcentajes: eso es justo lo que se comprimía a una
// franja en el PWA de un dispositivo real (celular/iPad) en vez de cubrir
// toda la pantalla.
export function BackgroundPhotoLayer({
  uri,
  source,
  width,
  height,
  focalX,
  focalY,
  darkness,
  blurAmount,
  filterIdSuffix = '',
}: {
  uri?: string;
  source?: unknown;
  width: number;
  height: number;
  focalX: number;
  focalY: number;
  darkness: number;
  blurAmount: number;
  // Dos instancias de este componente en la misma pantalla (fondo real +
  // vista previa) no pueden compartir el mismo id de <Filter>/<LinearGradient>
  // — un id duplicado en el DOM hace que el navegador resuelva `url(#id)`
  // contra la PRIMERA definición que encuentre, dejando la segunda instancia
  // con el filtro/oscurecimiento equivocado (o del tamaño equivocado).
  filterIdSuffix?: string;
}) {
  const imgSource = uri ? { uri } : (source as number);
  const blurPx = Math.round(blurAmount * 12); // 0 a 12px — sutil, nunca al punto de perder la escena.
  const blurId = `bgPhotoBlur${filterIdSuffix}`;
  const darkenId = `bgDarken${filterIdSuffix}`;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          {blurPx > 0 && (
            <Filter id={blurId} x="-15%" y="-15%" width="130%" height="130%">
              <FeGaussianBlur stdDeviation={blurPx} edgeMode="duplicate" />
            </Filter>
          )}
          <LinearGradient id={darkenId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#000000" stopOpacity={darkness * 0.75} />
            <Stop offset="42%" stopColor="#000000" stopOpacity={darkness * 0.4} />
            <Stop offset="70%" stopColor="#000000" stopOpacity={darkness * 0.55} />
            <Stop offset="100%" stopColor="#000000" stopOpacity={darkness * 0.85} />
          </LinearGradient>
        </Defs>
        <SvgImage
          x="0"
          y="0"
          width={width}
          height={height}
          href={imgSource as never}
          preserveAspectRatio={focalKeyword(focalX, focalY)}
          filter={blurPx > 0 ? `url(#${blurId})` : undefined}
        />
        {/* Oscurecimiento graduado: más oscuro abajo (donde suele vivir la
            barra de navegación) y arriba (encabezados), más claro al centro
            — nunca un tinte plano parejo. */}
        <Rect x="0" y="0" width={width} height={height} fill={`url(#${darkenId})`} />
      </Svg>
    </View>
  );
}

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

// El brillo que atrapa la luz arriba de una superficie de vidrio — sin esto,
// la translucidez sola se ve más "plástico esmerilado" que vidrio real.
// Se usa dentro de GlassCard y de cualquier otra superficie (los banners de
// acento sólido, por ejemplo) que también deba leerse como vidrio.
export function GlassSheen({ radius = 0, intensity = 1 }: { radius?: number; intensity?: number }) {
  const { scheme } = useTheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: radius }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="glassSheen" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={(scheme === 'dark' ? 0.16 : 0.4) * intensity} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="60%" fill="url(#glassSheen)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { surfaceBlur, surfaceShadow } from '@/theme/surfaceStyle';
import { useTheme } from '@/theme/ThemeProvider';

// Barra inferior sin etiquetas: cada función es un ícono dentro de un
// círculo, con el micrófono al centro como acceso principal para registrar
// un gasto (spec: "visual_difference: clearly stronger than other navigation
// icons"). Como no hay etiquetas, cada ícono trae nombre para lector de
// pantalla y un tooltip al mantener presionado o pasar el cursor.

export interface TabItem {
  route: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

// Secciones principales, en el orden en que se recorren al deslizar.
export const PRIMARY_TABS: TabItem[] = [
  { route: 'index', label: 'Inicio', icon: 'home-outline', iconActive: 'home' },
  { route: 'movimientos', label: 'Movimientos', icon: 'list-outline', iconActive: 'list' },
  { route: 'patrimonio', label: 'Patrimonio', icon: 'pie-chart-outline', iconActive: 'pie-chart' },
];

// Lo que vive detrás del "+". Caben hasta 6 sin apretujarse; los siguientes
// (educación financiera, reportes, logros) entran aquí cuando existan.
export const MORE_TABS: TabItem[] = [
  { route: 'metas', label: 'Metas', icon: 'flag-outline', iconActive: 'flag' },
  { route: 'ia', label: 'Chat con IA', icon: 'sparkles-outline', iconActive: 'sparkles' },
  { route: 'inversiones', label: 'Mis inversiones', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
];

// Orden completo para el gesto de deslizar entre secciones.
export const SWIPE_ORDER = [...PRIMARY_TABS, ...MORE_TABS].map((t) => t.route);

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

export function AppTabBar({ activeRoute }: { activeRoute: string }) {
  const { colors, surface } = useTheme();
  const insets = useSafeAreaInsets();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreIsActive = MORE_TABS.some((t) => t.route === activeRoute);

  const go = (route: string) => {
    setMoreOpen(false);
    router.navigate(`/(tabs)/${route === 'index' ? '' : route}` as never);
  };

  return (
    <>
      {moreOpen && (
        // Capa para cerrar tocando fuera. No lleva etiqueta porque no es un
        // control en sí, solo el área de "cerrar".
        <Pressable accessibilityLabel="Cerrar más opciones" style={StyleSheet.absoluteFill} onPress={() => setMoreOpen(false)} />
      )}

      {moreOpen && (
        <MoreMenu
          bottom={64 + insets.bottom}
          activeRoute={activeRoute}
          onSelect={go}
        />
      )}

      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.tabBarBackground,
            borderTopColor: colors.divider,
            borderTopWidth: surface.borderWidth > 1 ? surface.borderWidth : StyleSheet.hairlineWidth,
            paddingBottom: insets.bottom,
          },
          surfaceBlur(surface),
        ]}
      >
        <TabCircle
          item={PRIMARY_TABS[0]}
          active={activeRoute === PRIMARY_TABS[0].route}
          onPress={() => go(PRIMARY_TABS[0].route)}
        />
        <TabCircle
          item={PRIMARY_TABS[1]}
          active={activeRoute === PRIMARY_TABS[1].route}
          onPress={() => go(PRIMARY_TABS[1].route)}
        />

        {/* El micrófono: más grande, relleno y elevado — es el acceso
            principal para registrar un gasto rápido. */}
        <VoiceButton
          onPress={() => {
            setMoreOpen(false);
            router.push('/capture');
          }}
        />

        <TabCircle
          item={PRIMARY_TABS[2]}
          active={activeRoute === PRIMARY_TABS[2].route}
          onPress={() => go(PRIMARY_TABS[2].route)}
        />
        <TabCircle
          item={{
            route: 'more',
            label: 'Más opciones',
            icon: moreOpen ? 'close' : 'add',
            iconActive: moreOpen ? 'close' : 'add',
          }}
          active={moreIsActive || moreOpen}
          onPress={() => setMoreOpen((v) => !v)}
        />
      </View>
    </>
  );
}

function TabCircle({ item, active, onPress }: { item: TabItem; active: boolean; onPress: () => void }) {
  const { colors, surface } = useTheme();
  const [hint, setHint] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.slot}>
      {hint && <Tooltip label={item.label} />}
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={item.label}
        onPress={onPress}
        onLongPress={() => setHint(true)}
        onPressOut={() => setHint(false)}
        onHoverIn={() => setHint(true)}
        onHoverOut={() => setHint(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        hitSlop={HIT_SLOP}
        style={[
          styles.circle,
          {
            // Activo = círculo relleno + ícono sólido. La forma cambia, no
            // solo el color (spec: "color_is_not_the_only_indicator").
            backgroundColor: active ? colors.accentSoft : 'transparent',
            borderColor: focused ? colors.accentFrom : 'transparent',
            borderWidth: focused ? 2 : surface.borderWidth > 1 && active ? surface.borderWidth : 0,
          },
        ]}
      >
        <Ionicons
          name={active ? item.iconActive : item.icon}
          size={22}
          color={active ? colors.accentFrom : colors.textTertiary}
        />
      </Pressable>
    </View>
  );
}

function VoiceButton({ onPress }: { onPress: () => void }) {
  const { colors, radius, surface } = useTheme();
  const [hint, setHint] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.slot}>
      {hint && <Tooltip label="Registrar por voz" />}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Registrar por voz"
        onPress={onPress}
        onLongPress={() => setHint(true)}
        onPressOut={() => setHint(false)}
        onHoverIn={() => setHint(true)}
        onHoverOut={() => setHint(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        hitSlop={HIT_SLOP}
        style={[
          styles.voice,
          {
            backgroundColor: colors.accentFrom,
            borderRadius: radius.pill,
            borderColor: focused ? colors.textPrimary : 'transparent',
            borderWidth: focused ? 3 : 0,
          },
          surfaceShadow(surface),
        ]}
      >
        <Ionicons name="mic" size={26} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function MoreMenu({
  bottom,
  activeRoute,
  onSelect,
}: {
  bottom: number;
  activeRoute: string;
  onSelect: (route: string) => void;
}) {
  const { colors, radius, surface } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  // Animación corta y discreta, como pide la spec — nada de rebotes largos.
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 140, useNativeDriver: false }).start();
  }, [anim]);

  return (
    <Animated.View
      style={[
        styles.moreMenu,
        {
          bottom,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          backgroundColor: colors.surfaceSolid,
          borderColor: colors.surfaceBorder,
          borderWidth: surface.borderWidth || StyleSheet.hairlineWidth,
          borderRadius: radius.lg,
        },
        surfaceShadow(surface),
      ]}
    >
      {MORE_TABS.map((item) => (
        <TabCircle key={item.route} item={item} active={activeRoute === item.route} onPress={() => onSelect(item.route)} />
      ))}
    </Animated.View>
  );
}

// Como la barra no lleva etiquetas, el nombre aparece al mantener presionado
// (táctil) o al pasar el cursor (escritorio).
function Tooltip({ label }: { label: string }) {
  const { colors, radius, typography, scheme } = useTheme();
  return (
    <View pointerEvents="none" style={[styles.tooltip, { backgroundColor: colors.textPrimary, borderRadius: radius.sm }]}>
      {/* El globo se pinta con el color del texto principal, así que la
          letra va del color contrario para que siempre se lea. */}
      <Text style={[typography.micro, { color: scheme === 'dark' ? '#111111' : '#FFFFFF' }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    // El micrófono sobresale por arriba de la barra.
    overflow: 'visible',
    ...Platform.select({ web: { zIndex: 10 }, default: {} }),
  },
  // Cada ranura reserva el mismo ancho, así la barra nunca se aprieta ni se
  // encima aunque la pantalla sea angosta.
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // 44x44 mínimo de área táctil, más hitSlop.
  circle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  voice: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: -22 },
  moreMenu: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
    ...Platform.select({ web: { zIndex: 20 }, default: {} }),
  },
  tooltip: {
    position: 'absolute',
    bottom: 52,
    paddingHorizontal: 8,
    paddingVertical: 4,
    ...Platform.select({ web: { zIndex: 30 }, default: {} }),
  },
});

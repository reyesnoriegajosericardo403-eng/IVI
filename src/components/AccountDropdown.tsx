import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { signOut } from '@/services/auth/actions';
import { useAuthSession } from '@/services/auth/useAuthSession';
import { isSupabaseConfigured } from '@/services/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { surfaceBlur, surfaceShadow } from '@/theme/surfaceStyle';
import { useTheme } from '@/theme/ThemeProvider';

import { GlassSheen } from './GlassSheen';

interface MenuItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

// Reemplaza los íconos sueltos de Ajustes + Copiloto IA que vivían en cada
// encabezado — un solo botón de cuenta (avatar) que abre un menú con todo
// eso y algunas cosas más, para que ni el encabezado ni Ajustes se sientan
// cargados (spec: "sustituidos por el Account Dropdown"). Con estilo de
// vidrio, como el resto de la app.
export function AccountDropdown() {
  const { colors, typography, spacing, radius, surface, scheme } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const setThemePreference = useAppStore((s) => s.setThemePreference);
  const { userId, email } = useAuthSession();
  const { width: windowWidth } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  // Dónde cae el menú, medido en la ventana (no relativo a un ancestro) —
  // se calcula al abrir y se pinta dentro de un `Modal`, que en web se
  // porta fuera de cualquier contenedor (spec: "cuando lo seleccionas en
  // otra parte que no es el inicio, este queda por detrás de las fichas
  // de abajo"). Algunas pantallas (ej. Movimientos) usan FlatList, que
  // arma su propio contexto de apilamiento por dentro — ningún zIndex de
  // un ancestro le gana a eso de forma confiable, así que en vez de subir
  // números el menú se saca por completo de ese árbol.
  const [anchorRect, setAnchorRect] = useState<{ top: number; right: number } | null>(null);
  const anchorRef = useRef<View>(null);
  const anim = useRef(new Animated.Value(0)).current;

  const initial = (profile.name?.trim()?.[0] ?? email?.trim()?.[0] ?? '?').toUpperCase();
  const isDark = profile.themePreference === 'dark' || (profile.themePreference === 'system' && scheme === 'dark');
  const avatarColor = profile.avatarColor ?? colors.accentFrom;

  const openMenu = () => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchorRect({ top: y + height + 6, right: Math.max(spacing.md, windowWidth - (x + width)) });
      setOpen(true);
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 140, useNativeDriver: false }).start();
    });
  };

  const closeMenu = () => setOpen(false);

  const go = (path: Parameters<typeof router.push>[0]) => {
    setOpen(false);
    router.push(path);
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.replace('/auth');
  };

  const items: MenuItem[] = [
    { key: 'profile', label: 'Perfil', icon: 'person-outline', onPress: () => go('/perfil') },
    { key: 'settings', label: 'Ajustes', icon: 'settings-outline', onPress: () => go('/settings') },
    // Mismo nombre que ya usa el menú "+" del TAB para esta misma pantalla
    // (el chat) — "Copiloto IA" queda para la sección de Ajustes que
    // configura el proveedor, son cosas distintas.
    { key: 'ai', label: 'Chat con IA', icon: 'sparkles-outline', onPress: () => go('/(tabs)/ia') },
    { key: 'privacy', label: 'Privacidad y datos', icon: 'shield-checkmark-outline', onPress: () => go('/privacidad') },
    { key: 'install', label: 'Instalar VALU', icon: 'download-outline', onPress: () => go('/instalar') },
  ];

  return (
    <View ref={anchorRef} style={styles.anchor}>
      <Pressable
        accessibilityLabel="Cuenta"
        accessibilityRole="button"
        onPress={openMenu}
        style={[styles.avatarBtn, { backgroundColor: avatarColor, borderRadius: 21 }]}
      >
        <Text style={styles.avatarInitial}>{initial}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="none" onRequestClose={closeMenu}>
        <Pressable accessibilityLabel="Cerrar menú de cuenta" onPress={closeMenu} style={StyleSheet.absoluteFill} />
        {anchorRect && (
          <Animated.View
            style={[
              styles.panel,
              {
                top: anchorRect.top,
                right: anchorRect.right,
                opacity: anim,
                transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
                backgroundColor: colors.surfaceSolid,
                borderColor: colors.surfaceBorder,
                borderWidth: surface.borderWidth,
                borderRadius: radius.lg,
              },
              surfaceShadow(surface),
              surfaceBlur(surface),
            ]}
          >
            {surface.blur > 0 && <GlassSheen radius={radius.lg} />}

            <View style={[styles.header, { padding: spacing.md }]}>
              <View style={[styles.avatarBig, { backgroundColor: avatarColor, borderRadius: 22 }]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]} numberOfLines={1}>
                  {profile.name || 'Tu cuenta'}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                  {email ?? (isSupabaseConfigured ? 'Sin iniciar sesión' : 'Modo local')}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {items.map((item) => (
              <Pressable
                key={item.key}
                accessibilityLabel={item.label}
                onPress={item.onPress}
                style={[styles.row, { paddingHorizontal: spacing.md }]}
              >
                <Ionicons name={item.icon} size={18} color={colors.textSecondary} />
                <Text style={[typography.body, { color: colors.textPrimary, flex: 1, marginLeft: spacing.md }]}>{item.label}</Text>
              </Pressable>
            ))}

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <Pressable
              accessibilityLabel="Modo oscuro"
              onPress={() => setThemePreference(isDark ? 'light' : 'dark')}
              style={[styles.row, { paddingHorizontal: spacing.md }]}
            >
              <Ionicons name={isDark ? 'moon' : 'moon-outline'} size={18} color={colors.textSecondary} />
              <Text style={[typography.body, { color: colors.textPrimary, flex: 1, marginLeft: spacing.md }]}>Modo oscuro</Text>
              <MiniSwitch value={isDark} />
            </Pressable>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {userId ? (
              <Pressable accessibilityLabel="Cerrar sesión" onPress={handleSignOut} style={[styles.row, { paddingHorizontal: spacing.md }]}>
                <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                <Text style={[typography.body, { color: colors.danger, flex: 1, marginLeft: spacing.md, fontWeight: '600' }]}>
                  Cerrar sesión
                </Text>
              </Pressable>
            ) : isSupabaseConfigured ? (
              <Pressable accessibilityLabel="Iniciar sesión" onPress={() => go('/auth')} style={[styles.row, { paddingHorizontal: spacing.md }]}>
                <Ionicons name="log-in-outline" size={18} color={colors.accentFrom} />
                <Text style={[typography.body, { color: colors.accentFrom, flex: 1, marginLeft: spacing.md, fontWeight: '600' }]}>
                  Iniciar sesión
                </Text>
              </Pressable>
            ) : null}
          </Animated.View>
        )}
      </Modal>
    </View>
  );
}

// Interruptor chico propio — no hay ningún `Switch` en el resto de la app
// (todo lo demás usa chips/píldoras), así que se mantiene la misma
// consistencia visual en vez de traer el control nativo del sistema.
function MiniSwitch({ value }: { value: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.switchTrack, { backgroundColor: value ? colors.accentFrom : colors.divider }]}>
      <View style={[styles.switchKnob, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'relative' },
  avatarBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  avatarBig: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  panel: {
    position: 'absolute',
    width: 260,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  switchTrack: { width: 38, height: 22, borderRadius: 11, padding: 2, justifyContent: 'center' },
  switchKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF' },
});

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '@/store/useAppStore';
import { surfaceShadow } from '@/theme/surfaceStyle';
import { useTheme } from '@/theme/ThemeProvider';
import type { VisualStyleDefinition } from '@/theme/visualStyles';

import { GlassCard } from './GlassCard';

// Selector de estilo visual. Cada opción se muestra con una miniatura real
// del estilo en claro Y en oscuro (spec: "preview_modes: light, dark"), se
// aplica al instante y se guarda en el perfil, así que viaja entre
// dispositivos.
export function StylePicker() {
  const { colors, typography, spacing, radius, style: activeStyle, availableStyles } = useTheme();
  const setVisualStyle = useAppStore((s) => s.setVisualStyle);

  return (
    <GlassCard style={{ gap: spacing.sm }} padded={false}>
      {availableStyles.map((style, idx) => {
        const selected = style.id === activeStyle.id;
        return (
          <Pressable
            key={style.id}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`Estilo ${style.name}`}
            onPress={() => setVisualStyle(style.id, style.status === 'permanent')}
            style={[
              styles.row,
              {
                padding: spacing.md,
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: colors.divider,
              },
            ]}
          >
            <View style={styles.previews}>
              <StylePreview style={style} scheme="light" radius={radius.sm} />
              <StylePreview style={style} scheme="dark" radius={radius.sm} />
            </View>

            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>{style.name}</Text>
              <Text style={[typography.micro, { color: colors.textTertiary }]} numberOfLines={2}>
                {style.description}
              </Text>
              {style.status === 'temporary' && (
                <Text style={[typography.micro, { color: colors.warning, marginTop: 2 }]}>
                  Temporal{style.expiresAt ? ` · hasta el ${formatExpiry(style.expiresAt)}` : ''}
                </Text>
              )}
            </View>

            {selected && <Ionicons name="checkmark" size={18} color={colors.accentFrom} />}
          </Pressable>
        );
      })}
    </GlassCard>
  );
}

// Miniatura: el fondo del estilo con una tarjeta encima, dibujada con los
// tokens de ESE estilo (no los del tema activo) para que se vea de verdad
// cómo quedaría.
function StylePreview({
  style,
  scheme,
  radius,
}: {
  style: VisualStyleDefinition;
  scheme: 'light' | 'dark';
  radius: number;
}) {
  const variant = scheme === 'dark' ? style.dark : style.light;
  const { colors, surface } = variant;
  const gradient = surface.backgroundGradient;

  return (
    <View
      accessibilityLabel={`Vista previa ${scheme === 'dark' ? 'oscura' : 'clara'}`}
      style={[
        styles.preview,
        { borderRadius: radius, backgroundColor: gradient?.[0] ?? colors.background },
        gradient && gradient.length >= 2 && Platform.OS === 'web'
          ? ({ backgroundImage: `linear-gradient(160deg, ${gradient.join(', ')})` } as object)
          : null,
      ]}
    >
      <View
        style={[
          styles.previewCard,
          surfaceShadow(surface),
          {
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
            borderWidth: surface.borderWidth,
            borderRadius: Math.max(2, radius * surface.radiusScale * 0.5),
          },
        ]}
      >
        <View style={[styles.previewDot, { backgroundColor: colors.accentFrom }]} />
        <View style={[styles.previewLine, { backgroundColor: colors.textPrimary, opacity: 0.75 }]} />
        <View style={[styles.previewLine, styles.previewLineShort, { backgroundColor: colors.textSecondary, opacity: 0.6 }]} />
      </View>
    </View>
  );
}

function formatExpiry(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  previews: { flexDirection: 'row', gap: 6 },
  preview: { width: 40, height: 52, padding: 5, justifyContent: 'center', overflow: 'hidden' },
  previewCard: { padding: 4, gap: 3 },
  previewDot: { width: 8, height: 8, borderRadius: 4 },
  previewLine: { height: 2.5, borderRadius: 2, width: '100%' },
  previewLineShort: { width: '60%' },
});

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/GlassCard';
import { INSTITUTION_TYPE_LABELS, type Institution } from '@/data/institutions';
import { useTheme } from '@/theme/ThemeProvider';

export function InstitutionMonogram({ institution, size = 44 }: { institution: Institution; size?: number }) {
  return (
    <View style={[styles.monogram, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: institution.color }]}>
      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: institution.monogram.length > 2 ? size * 0.28 : size * 0.36 }}>
        {institution.monogram}
      </Text>
    </View>
  );
}

// Tarjeta de institución. Con `summary` (el usuario ya tiene algo ahí) muestra
// su saldo; sin él, es una tarjeta de "agregar" del catálogo.
export function InstitutionCard({
  institution,
  summary,
  onPress,
}: {
  institution: Institution;
  summary?: { value: string; detail: string; gain?: { text: string; positive: boolean } };
  onPress: () => void;
}) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Pressable accessibilityLabel={`Abrir ${institution.name}`} onPress={onPress} style={{ flexBasis: '48%', flexGrow: 1 }}>
      <GlassCard style={{ gap: spacing.sm, minHeight: summary ? 138 : 124 }}>
        <View style={styles.row}>
          <InstitutionMonogram institution={institution} size={40} />
          <View style={{ flex: 1 }} />
          <Ionicons name={summary ? 'chevron-forward' : 'add-circle-outline'} size={18} color={summary ? colors.textTertiary : colors.accentFrom} />
        </View>
        <View style={{ gap: 2 }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]} numberOfLines={1}>
            {institution.name}
          </Text>
          {summary ? (
            <>
              <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700', fontVariant: ['tabular-nums'] }]} numberOfLines={1}>
                {summary.value}
              </Text>
              <Text style={[typography.micro, { color: colors.textTertiary }]} numberOfLines={1}>
                {summary.detail}
              </Text>
              {summary.gain && (
                <Text
                  style={[typography.micro, { color: summary.gain.positive ? colors.success : colors.danger, fontWeight: '700' }]}
                  numberOfLines={1}
                >
                  {summary.gain.text}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={[typography.micro, { color: colors.textTertiary }]} numberOfLines={1}>
                {INSTITUTION_TYPE_LABELS[institution.type]}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={2}>
                {institution.tagline}
              </Text>
            </>
          )}
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  monogram: { alignItems: 'center', justifyContent: 'center' },
});

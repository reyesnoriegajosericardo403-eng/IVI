import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  hideAiShortcut?: boolean;
  showSettings?: boolean;
}

// Cabecera reutilizable: el icono de IA está accesible desde cualquier
// módulo (spec sección 45).
export function ScreenHeader({ title, subtitle, hideAiShortcut, showSettings }: ScreenHeaderProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.row, { marginBottom: spacing.lg }]}>
      <View style={{ flex: 1 }}>
        <Text style={[typography.title, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle && (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{subtitle}</Text>
        )}
      </View>
      <View style={styles.actions}>
        {showSettings && (
          <Pressable
            accessibilityLabel="Ajustes"
            onPress={() => router.push('/settings')}
            style={[styles.aiButton, { backgroundColor: colors.accentSoft }]}
          >
            <Ionicons name="settings-outline" size={18} color={colors.accentFrom} />
          </Pressable>
        )}
        {!hideAiShortcut && (
          <Pressable
            accessibilityLabel="Abrir copiloto IA"
            onPress={() => router.push('/(tabs)/ia')}
            style={[styles.aiButton, { backgroundColor: colors.accentSoft }]}
          >
            <Ionicons name="sparkles" size={18} color={colors.accentFrom} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: 8 },
  aiButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

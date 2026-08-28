import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import type { Currency, UserProfile } from '@/data/types';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

const THEME_OPTIONS: Array<{ id: UserProfile['themePreference']; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'light', label: 'Claro', icon: 'sunny-outline' },
  { id: 'dark', label: 'Oscuro', icon: 'moon-outline' },
  { id: 'system', label: 'Automático', icon: 'contrast-outline' },
];

const CURRENCIES: Currency[] = ['MXN', 'USD'];

export default function Settings() {
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const setThemePreference = useAppStore((s) => s.setThemePreference);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const demoDataLoaded = useAppStore((s) => s.demoDataLoaded);
  const loadDemoData = useAppStore((s) => s.loadDemoData);
  const clearDemoData = useAppStore((s) => s.clearDemoData);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Ajustes</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>TEMA</Text>
          <GlassCard style={{ gap: spacing.xs }} padded={false}>
            {THEME_OPTIONS.map((opt, idx) => (
              <Pressable
                key={opt.id}
                onPress={() => setThemePreference(opt.id)}
                style={[
                  styles.row,
                  { padding: spacing.md, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: colors.divider },
                ]}
              >
                <Ionicons name={opt.icon} size={18} color={colors.textSecondary} />
                <Text style={[typography.body, { color: colors.textPrimary, flex: 1, marginLeft: spacing.md }]}>
                  {opt.label}
                </Text>
                {profile.themePreference === opt.id && <Ionicons name="checkmark" size={18} color={colors.accentFrom} />}
              </Pressable>
            ))}
          </GlassCard>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>MONEDA PRINCIPAL</Text>
          <GlassCard style={{ gap: spacing.xs }} padded={false}>
            {CURRENCIES.map((c, idx) => (
              <Pressable
                key={c}
                onPress={() => completeOnboarding({ primaryCurrency: c })}
                style={[
                  styles.row,
                  { padding: spacing.md, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: colors.divider },
                ]}
              >
                <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{c}</Text>
                {profile.primaryCurrency === c && <Ionicons name="checkmark" size={18} color={colors.accentFrom} />}
              </Pressable>
            ))}
          </GlassCard>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>DATOS DE DEMOSTRACIÓN</Text>
          <GlassCard>
            <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
              {demoDataLoaded ? 'Los datos de ejemplo están activos.' : 'No hay datos de ejemplo cargados.'}
            </Text>
            <Pressable
              onPress={() => (demoDataLoaded ? clearDemoData() : loadDemoData())}
              style={[styles.demoBtn, { borderRadius: radius.pill, backgroundColor: demoDataLoaded ? 'transparent' : colors.accentFrom, borderColor: colors.danger, borderWidth: demoDataLoaded ? 1 : 0 }]}
            >
              <Text style={{ color: demoDataLoaded ? colors.danger : '#FFFFFF', fontWeight: '700' }}>
                {demoDataLoaded ? 'Quitar datos de ejemplo' : 'Cargar datos de ejemplo'}
              </Text>
            </Pressable>
          </GlassCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  demoBtn: { paddingVertical: 12, alignItems: 'center' },
});

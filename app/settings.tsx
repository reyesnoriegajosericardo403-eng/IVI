import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import type { Currency, UserProfile } from '@/data/types';
import { getLLMProviderConfig } from '@/providers/llm/secureConfig';
import { LLM_PROVIDER_LABELS, type LLMProviderId } from '@/providers/llm/types';
import { signOut } from '@/services/auth/actions';
import { useAuthSession } from '@/services/auth/useAuthSession';
import { runSync } from '@/services/sync/SyncEngine';
import { isSupabaseConfigured } from '@/services/supabase/client';
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
  const pendingSyncCount = useAppStore((s) => s.pendingSync.length);
  const lastSyncedAt = useAppStore((s) => s.lastSyncedAt);
  const { userId, email } = useAuthSession();
  const [syncing, setSyncing] = useState(false);
  const [aiProvider, setAiProvider] = useState<LLMProviderId | null>(null);

  useFocusEffect(
    useCallback(() => {
      getLLMProviderConfig().then((config) => setAiProvider(config?.provider ?? null));
    }, [])
  );

  const handleSyncNow = async () => {
    setSyncing(true);
    await runSync();
    setSyncing(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth');
  };

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
          <Text style={[typography.caption, { color: colors.textSecondary }]}>CUENTA Y SINCRONIZACIÓN</Text>
          <GlassCard style={{ gap: spacing.sm }}>
            {!isSupabaseConfigured ? (
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                Modo local: tus datos viven solo en este dispositivo. Aún no se conectó una cuenta en la nube.
              </Text>
            ) : userId ? (
              <>
                <Text style={[typography.body, { color: colors.textPrimary }]}>{email}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {pendingSyncCount > 0
                    ? `${pendingSyncCount} cambio(s) por sincronizar`
                    : lastSyncedAt
                      ? `Sincronizado por última vez: ${new Date(lastSyncedAt).toLocaleString('es-MX')}`
                      : 'Aún sin sincronizar'}
                </Text>
                <View style={styles.rowGap}>
                  <Pressable
                    onPress={handleSyncNow}
                    disabled={syncing}
                    style={[styles.secondaryBtn, { borderRadius: radius.pill, borderColor: colors.accentFrom }]}
                  >
                    <Text style={{ color: colors.accentFrom, fontWeight: '700' }}>{syncing ? 'Sincronizando...' : 'Sincronizar ahora'}</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSignOut}
                    style={[styles.secondaryBtn, { borderRadius: radius.pill, borderColor: colors.danger }]}
                  >
                    <Text style={{ color: colors.danger, fontWeight: '700' }}>Cerrar sesión</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Pressable
                onPress={() => router.push('/auth')}
                style={[styles.fullWidthBtn, { borderRadius: radius.pill, backgroundColor: colors.accentFrom }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Iniciar sesión / Crear cuenta</Text>
              </Pressable>
            )}
          </GlassCard>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>COPILOTO IA</Text>
          <Pressable onPress={() => router.push('/ai-settings')}>
            <GlassCard style={styles.row}>
              <Ionicons name="sparkles-outline" size={18} color={colors.accentFrom} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.body, { color: colors.textPrimary }]}>
                  {aiProvider ? LLM_PROVIDER_LABELS[aiProvider] : 'Copiloto local (basado en reglas)'}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {aiProvider ? 'Conectado con tu propia clave' : 'Conecta Claude, ChatGPT, Gemini o Grok'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </GlassCard>
          </Pressable>
        </View>

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
          <Text style={[typography.caption, { color: colors.textSecondary }]}>COMPARTIR</Text>
          <Pressable accessibilityLabel="Instalar VALU" onPress={() => router.push('/instalar')}>
            <GlassCard style={styles.row}>
              <Ionicons name="download-outline" size={18} color={colors.accentFrom} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.body, { color: colors.textPrimary }]}>Instalar VALU en tu pantalla</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Para ti o para compartir con tus amigos, sin pasar por el navegador
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </GlassCard>
          </Pressable>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>PRIVACIDAD Y DATOS</Text>
          <Pressable accessibilityLabel="Privacidad y datos" onPress={() => router.push('/privacidad')}>
            <GlassCard style={styles.row}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.accentFrom} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.body, { color: colors.textPrimary }]}>Privacidad y datos</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Qué guardamos, exportar tus datos o eliminar tu cuenta
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </GlassCard>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rowGap: { flexDirection: 'row', gap: 10, marginTop: 4 },
  secondaryBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  fullWidthBtn: { paddingVertical: 12, alignItems: 'center' },
});

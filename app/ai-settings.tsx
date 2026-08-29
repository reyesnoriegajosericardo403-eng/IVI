import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { createLLMClient } from '@/providers/llm/createClient';
import { clearLLMProviderConfig, getLLMProviderConfig, isSecureStorageNative, setLLMProviderConfig } from '@/providers/llm/secureConfig';
import {
  LLM_PROVIDER_COST_NOTE,
  LLM_PROVIDER_DEFAULT_MODEL,
  LLM_PROVIDER_HAS_FREE_TIER,
  LLM_PROVIDER_KEY_GUIDE,
  LLM_PROVIDER_LABELS,
  type LLMProviderId,
} from '@/providers/llm/types';
import { registerConfiguredLLMProvider } from '@/providers/llm/registerConfiguredProvider';
import { isSupabaseConfigured } from '@/services/supabase/client';
import { useTheme } from '@/theme/ThemeProvider';

const PROVIDERS: LLMProviderId[] = ['claude', 'openai', 'gemini', 'grok'];

type Status = 'idle' | 'testing' | 'success' | 'error';

export default function AiSettings() {
  const { colors, typography, spacing, radius } = useTheme();
  const [provider, setProvider] = useState<LLMProviderId | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const config = await getLLMProviderConfig();
      if (config) {
        setProvider(config.provider);
        setApiKey(config.apiKey);
        setModel(config.model);
      }
      setLoaded(true);
    })();
  }, []);

  const handlePickProvider = (id: LLMProviderId) => {
    setProvider(id);
    setModel((current) => current || LLM_PROVIDER_DEFAULT_MODEL[id]);
    setStatus('idle');
  };

  const handleTest = async () => {
    if (!provider || !apiKey.trim()) return;
    setStatus('testing');
    setStatusMessage('');
    try {
      const client = createLLMClient({ provider, apiKey: apiKey.trim(), model: model.trim() || LLM_PROVIDER_DEFAULT_MODEL[provider] });
      const reply = await client.chat('Responde solo con la palabra: ok', [{ role: 'user', content: 'ping' }]);
      setStatus('success');
      setStatusMessage(`Conectado. Respuesta de prueba: "${reply.trim().slice(0, 60)}"`);
    } catch (err) {
      setStatus('error');
      setStatusMessage(err instanceof Error ? err.message : 'No se pudo conectar.');
    }
  };

  const handleSave = async () => {
    if (!provider || !apiKey.trim()) return;
    await setLLMProviderConfig({ provider, apiKey: apiKey.trim(), model: model.trim() || LLM_PROVIDER_DEFAULT_MODEL[provider] });
    await registerConfiguredLLMProvider();
    router.back();
  };

  const handleRemove = async () => {
    await clearLLMProviderConfig();
    await registerConfiguredLLMProvider();
    setProvider(null);
    setApiKey('');
    setModel('');
    setStatus('idle');
  };

  if (!loaded) return null;

  const needsWebRelay = Platform.OS === 'web' && !isSupabaseConfigured;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>Conectar tu IA</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Usa tu propia cuenta — nunca la nuestra
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Conecta la IA que ya tienes (o quieres) — el copiloto y la interpretación de voz usarán esa cuenta, y el
          costo de uso lo cubre tu propia clave, nunca VALU. Sin esto, la app sigue funcionando con un copiloto
          local basado en reglas.
        </Text>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>PROVEEDOR</Text>
          <View style={styles.chipWrap}>
            {PROVIDERS.map((id) => (
              <Pressable
                key={id}
                onPress={() => handlePickProvider(id)}
                style={[
                  styles.chip,
                  {
                    borderRadius: radius.pill,
                    borderColor: provider === id ? colors.accentFrom : colors.surfaceBorder,
                    backgroundColor: provider === id ? colors.accentSoft : colors.surfaceSolid,
                  },
                ]}
              >
                <Text style={{ color: provider === id ? colors.accentFrom : colors.textPrimary, fontWeight: '600' }}>
                  {LLM_PROVIDER_LABELS[id]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {provider && (
          <GlassCard style={{ gap: spacing.md }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>1. Consigue tu clave</Text>

            {LLM_PROVIDER_KEY_GUIDE[provider].steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepBadge, { backgroundColor: colors.accentSoft, borderRadius: 10 }]}>
                  <Text style={{ color: colors.accentFrom, fontWeight: '700', fontSize: 12 }}>{i + 1}</Text>
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>{step}</Text>
              </View>
            ))}

            <Pressable
              onPress={() => Linking.openURL(LLM_PROVIDER_KEY_GUIDE[provider].url)}
              style={[styles.linkBtn, { borderRadius: radius.pill, backgroundColor: colors.accentFrom }]}
            >
              <Ionicons name="open-outline" size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '700', marginLeft: 8 }}>
                Abrir {LLM_PROVIDER_KEY_GUIDE[provider].urlLabel}
              </Text>
            </Pressable>

            {LLM_PROVIDER_KEY_GUIDE[provider].warning && (
              <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, padding: spacing.sm }}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.danger} style={{ marginTop: 1 }} />
                <Text style={[typography.caption, { color: colors.danger, marginLeft: spacing.sm, flex: 1 }]}>
                  {LLM_PROVIDER_KEY_GUIDE[provider].warning}
                </Text>
              </View>
            )}

            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.accentSoft,
                borderRadius: radius.md,
                padding: spacing.sm,
              }}
            >
              <Ionicons
                name={LLM_PROVIDER_HAS_FREE_TIER[provider] ? 'gift-outline' : 'cash-outline'}
                size={16}
                color={colors.accentFrom}
                style={{ marginTop: 1 }}
              />
              <Text style={[typography.caption, { color: colors.accentFrom, marginLeft: spacing.sm, flex: 1 }]}>
                {LLM_PROVIDER_COST_NOTE[provider]}
              </Text>
            </View>

            <Text style={[typography.headline, { color: colors.textPrimary, marginTop: spacing.sm }]}>2. Pégala aquí</Text>

            <TextInput
              value={apiKey}
              onChangeText={(v) => {
                setApiKey(v);
                setStatus('idle');
              }}
              placeholder="Pega tu API key aquí"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
            />

            <View style={{ gap: 4 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>MODELO</Text>
              <TextInput
                value={model}
                onChangeText={setModel}
                placeholder={LLM_PROVIDER_DEFAULT_MODEL[provider]}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
              />
            </View>

            {needsWebRelay && (
              <Text style={[typography.caption, { color: colors.warning }]}>
                Estás en la versión web sin Supabase conectado: {LLM_PROVIDER_LABELS[provider]} no podrá responder
                aquí todavía por una restricción de seguridad del navegador. Funciona ya mismo en la app nativa.
              </Text>
            )}

            {status !== 'idle' && (
              <Text style={[typography.caption, { color: status === 'error' ? colors.danger : status === 'success' ? colors.success : colors.textSecondary }]}>
                {status === 'testing' ? 'Probando conexión...' : statusMessage}
              </Text>
            )}

            <View style={styles.rowGap}>
              <Pressable
                onPress={handleTest}
                disabled={!apiKey.trim() || status === 'testing'}
                style={[styles.secondaryBtn, { borderRadius: radius.pill, borderColor: colors.accentFrom, opacity: apiKey.trim() ? 1 : 0.5 }]}
              >
                <Text style={{ color: colors.accentFrom, fontWeight: '700' }}>Probar conexión</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={!apiKey.trim()}
                style={[styles.secondaryBtn, { borderRadius: radius.pill, backgroundColor: colors.accentFrom, opacity: apiKey.trim() ? 1 : 0.5 }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Guardar</Text>
              </Pressable>
            </View>

            <Pressable onPress={handleRemove} style={{ alignItems: 'center', marginTop: 4 }}>
              <Text style={{ color: colors.danger, fontWeight: '600' }}>Quitar esta conexión</Text>
            </Pressable>
          </GlassCard>
        )}

        <Text style={[typography.caption, { color: colors.textTertiary }]}>
          Tu clave se guarda {isSecureStorageNative ? 'cifrada en este dispositivo (Keychain/Keystore)' : 'en este navegador'}
          {' '}
          y nunca se sincroniza con nuestros servidores ni con ningún otro dispositivo.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  rowGap: { flexDirection: 'row', gap: 10, marginTop: 4 },
  secondaryBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepBadge: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
});

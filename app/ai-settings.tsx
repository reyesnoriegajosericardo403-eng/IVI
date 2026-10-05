import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AgentError, type AgentStatus } from '@/ai/agent/protocol';
import { aiEnabled, setAiEnabled } from '@/ai/agent/settings';
import { agentStatus, agentTest, usableModel } from '@/ai/agent/transport';
import { GlassCard } from '@/components/GlassCard';
import { HelpButton } from '@/components/HelpButton';
import { registerConfiguredLLMProvider } from '@/providers/llm/registerConfiguredProvider';
import { clearLLMProviderConfig, getLLMProviderConfig, isSecureStorageNative, setLLMProviderConfig } from '@/providers/llm/secureConfig';
import { LLM_PROVIDER_COST_NOTE, LLM_PROVIDER_HAS_FREE_TIER, LLM_PROVIDER_KEY_GUIDE, LLM_PROVIDER_LABELS, type LLMProviderId } from '@/providers/llm/types';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

const PROVIDERS: LLMProviderId[] = ['gemini', 'claude', 'openai', 'grok'];

type Check = { state: 'loading' } | { state: 'ok'; status: AgentStatus } | { state: 'error'; error: AgentError };

// Qué significa cada problema y quién lo arregla, en palabras de la persona.
function explain(error: AgentError): { title: string; body: string; action?: 'auth' } {
  switch (error.code) {
    case 'no_backend':
      return { title: 'Esta versión no tiene la nube conectada', body: 'La IA vive en tu Supabase. Sin nube, VALU funciona con su motor local (sin IA).' };
    case 'not_signed_in':
      return { title: 'Inicia sesión para usar la IA', body: 'La IA solo atiende a cuentas con sesión, para que nadie más pueda usarla.', action: 'auth' };
    case 'not_deployed':
      return { title: 'Falta desplegar la IA en Supabase', body: 'GitHub → Actions → «Desplegar funciones de Supabase» → Run workflow con «ai-agent».' };
    case 'offline':
    case 'timeout':
      return { title: 'Sin conexión con la IA', body: 'Revisa tu internet. Mientras tanto VALU responde con su motor local.' };
    default:
      return { title: 'La IA no respondió', body: error.message };
  }
}

export default function AiSettings() {
  const { colors, typography, spacing, radius } = useTheme();
  const memory = useAppStore((s) => s.agentMemory);
  const removeAgentMemory = useAppStore((s) => s.removeAgentMemory);
  const clearAgentMemory = useAppStore((s) => s.clearAgentMemory);

  const [enabled, setEnabled] = useState(aiEnabled());
  const [check, setCheck] = useState<Check>({ state: 'loading' });
  const [testMsg, setTestMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const [ownOpen, setOwnOpen] = useState(false);
  const [provider, setProvider] = useState<LLMProviderId | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [hasOwnKey, setHasOwnKey] = useState(false);
  const [ownMsg, setOwnMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setCheck({ state: 'loading' });
    try {
      setCheck({ state: 'ok', status: await agentStatus(true) });
    } catch (e) {
      setCheck({ state: 'error', error: e instanceof AgentError ? e : new AgentError('unknown', 'No se pudo revisar la IA.') });
    }
  }, []);

  useEffect(() => {
    refresh();
    getLLMProviderConfig().then((cfg) => {
      if (!cfg) return;
      setProvider(cfg.provider);
      setApiKey(cfg.apiKey);
      setModel(usableModel(cfg.model) ?? '');
      setHasOwnKey(true);
    });
  }, [refresh]);

  const toggleEnabled = async () => {
    const next = !enabled;
    setAiEnabled(next);
    setEnabled(next);
    await registerConfiguredLLMProvider();
  };

  const runTest = async () => {
    setTesting(true);
    setTestMsg(null);
    try {
      const r = await agentTest();
      setTestMsg({ tone: 'ok', text: `Respondió ${r.providerLabel} (${r.model}) en ${(r.ms / 1000).toFixed(1)} s.` });
      refresh();
    } catch (e) {
      setTestMsg({ tone: 'error', text: e instanceof Error ? e.message : 'No respondió.' });
    } finally {
      setTesting(false);
    }
  };

  const saveOwnKey = async () => {
    if (!provider || !apiKey.trim()) return;
    setSaving(true);
    setOwnMsg(null);
    await setLLMProviderConfig({ provider, apiKey: apiKey.trim(), model: model.trim() });
    await registerConfiguredLLMProvider();
    try {
      const r = await agentTest();
      setHasOwnKey(true);
      setOwnMsg({ tone: 'ok', text: `Listo: tu clave funciona (${r.model}). Desde ahora la IA usa tu cuenta de ${LLM_PROVIDER_LABELS[provider]}.` });
      refresh();
    } catch (e) {
      // Una clave que el proveedor rechaza no se queda guardada.
      if (e instanceof AgentError && (e.code === 'provider_auth' || e.code === 'bad_request')) {
        await clearLLMProviderConfig();
        await registerConfiguredLLMProvider();
        setHasOwnKey(false);
      }
      setOwnMsg({ tone: 'error', text: e instanceof Error ? e.message : 'No se pudo probar la clave.' });
    } finally {
      setSaving(false);
    }
  };

  const removeOwnKey = async () => {
    await clearLLMProviderConfig();
    await registerConfiguredLLMProvider();
    setHasOwnKey(false);
    setApiKey('');
    setModel('');
    setOwnMsg({ tone: 'ok', text: 'Se quitó tu clave: la IA vuelve a usar la integrada.' });
    refresh();
  };

  const statusCard = () => {
    if (check.state === 'loading') {
      return (
        <View style={styles.row}>
          <ActivityIndicator color={colors.accentFrom} />
          <Text style={[typography.body, { color: colors.textSecondary, marginLeft: spacing.sm }]}>Revisando la IA…</Text>
        </View>
      );
    }
    if (check.state === 'error') {
      const info = explain(check.error);
      return (
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>{info.title}</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>{info.body}</Text>
          {info.action === 'auth' && (
            <Pressable onPress={() => router.push('/auth')}>
              <Text style={{ color: colors.accentFrom, fontWeight: '700' }}>Iniciar sesión →</Text>
            </Pressable>
          )}
        </View>
      );
    }
    const st = check.status;
    if (!st.allowed) {
      return (
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>La IA integrada es solo para cuentas autorizadas</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Puedes usar tu propia clave abajo (Gemini tiene nivel gratuito).</Text>
        </View>
      );
    }
    if (!st.configured) {
      return (
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Falta la clave de la IA en Supabase</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Supabase → Edge Functions → Secrets → agrega GEMINI_API_KEY con tu clave de Google AI Studio. También puedes usar tu
            propia clave abajo.
          </Text>
        </View>
      );
    }
    return (
      <View style={{ gap: spacing.xs }}>
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text style={[typography.headline, { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1 }]}>
            IA activa · {st.providerLabel}
          </Text>
        </View>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {st.byok ? 'Con tu propia clave' : 'IA integrada de VALU'} · modelo {st.model}
          {st.quota ? ` · te quedan ${st.quota.remaining} de ${st.quota.limit} consultas hoy` : ''}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Pressable accessibilityLabel="Regresar" onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>IA de VALU</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>El agente que entiende y cuida tus finanzas</Text>
        </View>
        <HelpButton topic="ia-propia" />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 100 }}>
        <GlassCard style={{ gap: spacing.md }}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: enabled }}
            accessibilityLabel="Usar la IA"
            onPress={toggleEnabled}
            style={[styles.row, { justifyContent: 'space-between' }]}
          >
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>Usar la IA</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                En el chat y cuando la captura por voz no entiende algo. Apagada, VALU usa solo su motor local.
              </Text>
            </View>
            <View style={[styles.track, { backgroundColor: enabled ? colors.accentFrom : colors.surfaceBorder }]}>
              <View style={[styles.thumb, { alignSelf: enabled ? 'flex-end' : 'flex-start' }]} />
            </View>
          </Pressable>
          <View style={{ height: 1, backgroundColor: colors.divider }} />
          {statusCard()}
          <Pressable
            accessibilityLabel="Probar la IA"
            onPress={runTest}
            disabled={testing}
            style={[styles.secondaryBtn, { borderRadius: radius.pill, borderColor: colors.accentFrom, opacity: testing ? 0.6 : 1 }]}
          >
            {testing ? <ActivityIndicator color={colors.accentFrom} /> : <Text style={{ color: colors.accentFrom, fontWeight: '700' }}>Probar la IA ahora</Text>}
          </Pressable>
          {testMsg && <Text style={[typography.caption, { color: testMsg.tone === 'ok' ? colors.success : colors.danger }]}>{testMsg.text}</Text>}
        </GlassCard>

        <GlassCard style={{ gap: spacing.sm }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Qué puede hacer</Text>
          {[
            ['search-outline', 'Contestar con tus números reales: «¿en qué gasté más este mes?», «¿cuánto llevo en Uber?»'],
            ['create-outline', 'Registrar y programar: «gasté 230 en tacos con la tarjeta Oro», «cada día 5 pago la renta de 8,000»'],
            ['card-outline', 'Cuidar tus fechas: tarjetas, pagos recurrentes, deudas y recordatorios'],
            ['bulb-outline', 'Aconsejarte con tus datos: presupuesto, ahorro y cómo bajar deudas'],
          ].map(([icon, text]) => (
            <View key={text} style={styles.stepRow}>
              <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={colors.accentFrom} style={{ marginTop: 2 }} />
              <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>{text}</Text>
            </View>
          ))}
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            Nunca cambia nada sola: todo lo que propone lo confirmas tú manteniendo presionado.
          </Text>
        </GlassCard>

        <GlassCard style={{ gap: spacing.sm }}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Lo que VALU recuerda de ti</Text>
            {memory.length > 0 && (
              <Pressable accessibilityLabel="Olvidar todo lo que recuerda" onPress={clearAgentMemory}>
                <Text style={{ color: colors.danger, fontWeight: '600' }}>Olvidar todo</Text>
              </Pressable>
            )}
          </View>
          {memory.length === 0 ? (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Cuando le cuentes algo estable («cobro cada quincena», «ahorro para una casa»), lo recordará aquí para no tener que
              repetirlo. Se guarda solo en este dispositivo.
            </Text>
          ) : (
            memory.map((m) => (
              <View key={m.id} style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.sm }]}>
                <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{m.text}</Text>
                <Pressable accessibilityLabel={`Olvidar: ${m.text}`} onPress={() => removeAgentMemory(m.id)} hitSlop={8}>
                  <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
            ))
          )}
        </GlassCard>

        <GlassCard style={{ gap: spacing.md }}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: ownOpen }} onPress={() => setOwnOpen(!ownOpen)} style={[styles.row, { justifyContent: 'space-between' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.headline, { color: colors.textPrimary }]}>Usar mi propia clave (opcional)</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {hasOwnKey && provider ? `Activa: ${LLM_PROVIDER_LABELS[provider]}` : 'Sin cuota diaria: el costo lo cubre tu cuenta del proveedor.'}
              </Text>
            </View>
            <Ionicons name={ownOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
          </Pressable>

          {ownOpen && (
            <View style={{ gap: spacing.md }}>
              <View style={styles.chipWrap}>
                {PROVIDERS.map((id) => (
                  <Pressable
                    key={id}
                    onPress={() => {
                      setProvider(id);
                      setOwnMsg(null);
                    }}
                    style={[
                      styles.chip,
                      {
                        borderRadius: radius.pill,
                        borderColor: provider === id ? colors.accentFrom : colors.surfaceBorder,
                        backgroundColor: provider === id ? colors.accentSoft : colors.surfaceSolid,
                      },
                    ]}
                  >
                    <Text style={{ color: provider === id ? colors.accentFrom : colors.textPrimary, fontWeight: '600' }}>{LLM_PROVIDER_LABELS[id]}</Text>
                  </Pressable>
                ))}
              </View>

              {provider && (
                <View style={{ gap: spacing.sm }}>
                  {LLM_PROVIDER_KEY_GUIDE[provider].steps.map((step, i) => (
                    <View key={i} style={styles.stepRow}>
                      <View style={[styles.stepBadge, { backgroundColor: colors.accentSoft, borderRadius: 10 }]}>
                        <Text style={{ color: colors.accentFrom, fontWeight: '700', fontSize: 12 }}>{i + 1}</Text>
                      </View>
                      <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>{step}</Text>
                    </View>
                  ))}
                  <Pressable onPress={() => Linking.openURL(LLM_PROVIDER_KEY_GUIDE[provider].url)} style={[styles.linkBtn, { borderRadius: radius.pill, backgroundColor: colors.accentFrom }]}>
                    <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', marginLeft: 8 }}>Abrir {LLM_PROVIDER_KEY_GUIDE[provider].urlLabel}</Text>
                  </Pressable>
                  {LLM_PROVIDER_KEY_GUIDE[provider].warning && (
                    <Text style={[typography.caption, { color: colors.danger }]}>{LLM_PROVIDER_KEY_GUIDE[provider].warning}</Text>
                  )}
                  <View style={styles.row}>
                    <Ionicons name={LLM_PROVIDER_HAS_FREE_TIER[provider] ? 'gift-outline' : 'cash-outline'} size={16} color={colors.accentFrom} />
                    <Text style={[typography.caption, { color: colors.accentFrom, marginLeft: spacing.sm, flex: 1 }]}>{LLM_PROVIDER_COST_NOTE[provider]}</Text>
                  </View>
                  <TextInput
                    accessibilityLabel="Tu clave de API"
                    value={apiKey}
                    onChangeText={(v) => {
                      setApiKey(v);
                      setOwnMsg(null);
                    }}
                    placeholder="Pega tu clave aquí"
                    placeholderTextColor={colors.textTertiary}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
                  />
                  <TextInput
                    accessibilityLabel="Modelo (opcional)"
                    value={model}
                    onChangeText={setModel}
                    placeholder="Modelo: automático (recomendado)"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
                  />
                  <Pressable
                    onPress={saveOwnKey}
                    disabled={!apiKey.trim() || saving}
                    style={[styles.secondaryBtn, { borderRadius: radius.pill, backgroundColor: colors.accentFrom, borderColor: colors.accentFrom, opacity: apiKey.trim() && !saving ? 1 : 0.5 }]}
                  >
                    {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Guardar y probar</Text>}
                  </Pressable>
                  {hasOwnKey && (
                    <Pressable onPress={removeOwnKey} style={{ alignItems: 'center' }}>
                      <Text style={{ color: colors.danger, fontWeight: '600' }}>Quitar mi clave y usar la integrada</Text>
                    </Pressable>
                  )}
                </View>
              )}
              {ownMsg && <Text style={[typography.caption, { color: ownMsg.tone === 'ok' ? colors.success : colors.danger }]}>{ownMsg.text}</Text>}
              <Text style={[typography.caption, { color: colors.textTertiary }]}>
                Tu clave se guarda {isSecureStorageNative ? 'cifrada en este dispositivo (Keychain/Keystore)' : 'en este navegador'}, nunca se
                sincroniza, y viaja solo a tu función de Supabase para hablar con el proveedor.
              </Text>
            </View>
          )}
        </GlassCard>

        <Text style={[typography.caption, { color: colors.textTertiary }]}>
          Para responder, la IA recibe tu mensaje y solo los datos que consulta (por ejemplo, tus movimientos de un mes), nunca tus
          notas. Detalle en Privacidad y datos.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  track: { width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center', borderWidth: 1, minHeight: 44, justifyContent: 'center' },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepBadge: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
});

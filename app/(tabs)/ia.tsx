import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { topFrequentQuestions, type AIActionProposal, type ChatMessage } from '@/ai/chatTypes';
import { SUGGESTED_QUESTIONS } from '@/ai/localCopilot';
import { ChatActionCard } from '@/components/ChatActionCard';
import { ChatComposer } from '@/components/ChatComposer';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ValuMark } from '@/components/ValuMark';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { providers } from '@/providers/registry';
import {
  selectActiveAccounts,
  selectActiveBudgets,
  selectActiveGoals,
  selectActiveInvestments,
  selectActiveLiabilities,
  selectActiveTemplateBudgetLines,
  selectActiveTransactions,
} from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { intensifyGlass } from '@/theme/intensifyGlass';
import { surfaceBlur, surfaceShadow } from '@/theme/surfaceStyle';
import { useTheme } from '@/theme/ThemeProvider';
import { generateId } from '@/utils/id';

const ENGINE_LABELS: Record<string, string> = { 'local-rules': 'Reglas locales' };

export default function Ia() {
  const { colors, typography, spacing, radius, surface } = useTheme();
  const { isTablet } = useBreakpoint();
  const liquid = useMemo(() => intensifyGlass(colors, surface), [colors, surface]);

  const profile = useAppStore((s) => s.profile);
  const rawTransactions = useAppStore((s) => s.transactions);
  const rawAccounts = useAppStore((s) => s.accounts);
  const rawInvestments = useAppStore((s) => s.investments);
  const rawLiabilities = useAppStore((s) => s.liabilities);
  const rawBudgets = useAppStore((s) => s.budgets);
  const rawGoals = useAppStore((s) => s.goals);
  const rawTemplateLines = useAppStore((s) => s.templateBudgetLines);

  const conversations = useAppStore((s) => s.conversations);
  const chatMessages = useAppStore((s) => s.chatMessages);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const startConversation = useAppStore((s) => s.startConversation);
  const setActiveConversation = useAppStore((s) => s.setActiveConversation);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const deleteConversation = useAppStore((s) => s.deleteConversation);
  const updateActionStatus = useAppStore((s) => s.updateActionStatus);
  const aiApplyAction = useAppStore((s) => s.aiApplyAction);

  const transactions = useMemo(() => selectActiveTransactions(rawTransactions), [rawTransactions]);
  const accounts = useMemo(() => selectActiveAccounts(rawAccounts), [rawAccounts]);
  const investments = useMemo(() => selectActiveInvestments(rawInvestments), [rawInvestments]);
  const liabilities = useMemo(() => selectActiveLiabilities(rawLiabilities), [rawLiabilities]);
  const budgets = useMemo(() => selectActiveBudgets(rawBudgets), [rawBudgets]);
  const goals = useMemo(() => selectActiveGoals(rawGoals), [rawGoals]);
  const templateBudgetLines = useMemo(() => selectActiveTemplateBudgetLines(rawTemplateLines), [rawTemplateLines]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sending, setSending] = useState(false);

  // Siempre hay una conversación activa al entrar — nunca se le pide al
  // usuario crear la primera a mano.
  useEffect(() => {
    if (!activeConversationId) startConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const messages = useMemo(
    () => chatMessages.filter((m) => m.conversationId === activeConversationId),
    [chatMessages, activeConversationId]
  );
  const frequentPrompts = useMemo(() => topFrequentQuestions(chatMessages, 5), [chatMessages]);

  const send = async (text: string) => {
    if (sending) return;
    const conversationId = activeConversationId ?? startConversation();
    addChatMessage({ conversationId, role: 'user', text });
    setSending(true);
    try {
      const result = await providers.actionAgent.interpretMessage(text, {
        profile,
        transactions,
        accounts,
        investments,
        liabilities,
        budgets,
        goals,
        templateBudgetLines,
      });
      let action: AIActionProposal | undefined;
      if (result.action && result.summary) {
        action = {
          id: generateId(),
          type: result.action.type,
          args: result.action.args as unknown as Record<string, unknown>,
          summary: result.summary,
          status: 'proposed',
          createdAt: new Date().toISOString(),
        };
      }
      addChatMessage({ conversationId, role: 'assistant', text: result.reply, action });
    } catch {
      addChatMessage({
        conversationId,
        role: 'assistant',
        text: 'No pude conectarme a la IA en este momento. Intenta de nuevo en un momento.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleConfirmAction = async (message: ChatMessage) => {
    if (!message.action) return;
    const result = aiApplyAction(message.action);
    if (result.ok) {
      updateActionStatus(message.id, 'applied', { appliedAt: new Date().toISOString() });
      return;
    }
    // Se retrasa la actualización persistida para que HoldToConfirmButton
    // alcance a mostrar su propio anillo de error (ver ERROR_RESET_MS en
    // HoldToConfirmButton.tsx) antes de que la tarjeta cambie a su vista
    // estática de "falló".
    setTimeout(() => updateActionStatus(message.id, 'failed', { error: result.error }), 3000);
    throw new Error(result.error ?? 'No se pudo aplicar');
  };

  const handleNewConversation = () => {
    startConversation();
    setSidebarOpen(false);
  };
  const handleSelectConversation = (id: string) => {
    setActiveConversation(id);
    setSidebarOpen(false);
  };
  const handleDeleteConversation = (id: string) => {
    deleteConversation(id);
  };

  const engineName = ENGINE_LABELS[providers.actionAgent.name] ?? providers.actionAgent.name;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {isTablet && (
          <ChatSidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            frequentPrompts={frequentPrompts}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            onSelectFrequent={send}
            visible={false}
            onClose={() => {}}
          />
        )}

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
            {!isTablet && (
              <Pressable accessibilityLabel="Abrir conversaciones" onPress={() => setSidebarOpen(true)} style={{ marginRight: spacing.sm }}>
                <Ionicons name="menu-outline" size={24} color={colors.textSecondary} />
              </Pressable>
            )}
            <ValuMark size={28} variant="ai" />
            <Text style={[typography.title, { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1 }]}>Copiloto VALU</Text>
            <Pressable accessibilityLabel="Ver conexión de IA" onPress={() => router.push('/ai-settings')} style={[styles.engineChip, { borderColor: colors.surfaceBorder, borderRadius: radius.pill }]}>
              <Ionicons name="sparkles-outline" size={12} color={colors.accentFrom} />
              <Text style={[typography.micro, { color: colors.textSecondary, marginLeft: 4 }]} numberOfLines={1}>
                {engineName}
              </Text>
            </Pressable>
          </View>

          {messages.length === 0 ? (
            <EmptyHero profileName={profile.name} onSend={send} sending={sending} liquid={liquid} />
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 24 }}
              renderItem={({ item }) =>
                item.role === 'assistant' && item.action ? (
                  <View style={{ alignSelf: 'flex-start', gap: spacing.sm, maxWidth: '90%' }}>
                    {!!item.text && (
                      <View
                        style={[
                          styles.bubble,
                          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderRadius: radius.lg, borderWidth: 1 },
                        ]}
                      >
                        <Text style={[typography.body, { color: colors.textPrimary }]}>{item.text}</Text>
                      </View>
                    )}
                    <ChatActionCard action={item.action} onConfirm={() => handleConfirmAction(item)} onCancel={() => updateActionStatus(item.id, 'dismissed')} />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.bubble,
                      {
                        alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                        backgroundColor: item.role === 'user' ? colors.accentFrom : colors.surface,
                        borderColor: colors.surfaceBorder,
                        borderRadius: radius.lg,
                        borderWidth: item.role === 'user' ? 0 : 1,
                      },
                    ]}
                  >
                    <Text style={[typography.body, { color: item.role === 'user' ? '#FFFFFF' : colors.textPrimary }]}>{item.text}</Text>
                  </View>
                )
              }
            />
          )}

          {messages.length > 0 && (
            <View style={{ padding: spacing.md }}>
              <ChatComposer
                onSend={send}
                disabled={sending}
                cardColor={liquid.cardColor}
                borderColor={liquid.borderColor}
                extraStyle={{ ...surfaceBlur(liquid.surface), ...surfaceShadow(liquid.surface) }}
              />
            </View>
          )}
        </KeyboardAvoidingView>
      </View>

      {!isTablet && (
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          frequentPrompts={frequentPrompts}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onSelectFrequent={(text) => {
            setSidebarOpen(false);
            send(text);
          }}
          visible={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}
    </SafeAreaView>
  );
}

// Estado vacío inspirado en un asistente de voz: saludo + orbe con brillo
// suave + compositor grande — se convierte en el hilo normal de mensajes
// en cuanto llega el primer mensaje (misma condición que ya usaba esta
// pantalla para mostrar las sugerencias).
function EmptyHero({
  profileName,
  onSend,
  sending,
  liquid,
}: {
  profileName: string;
  onSend: (text: string) => void;
  sending: boolean;
  liquid: ReturnType<typeof intensifyGlass>;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glowAnim]);

  return (
    <View style={styles.heroWrap}>
      <Animated.View
        style={[
          styles.heroGlow,
          {
            borderColor: colors.accentTo,
            shadowColor: colors.accentTo,
            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] }),
            transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
          },
        ]}
      >
        <ValuMark size={56} variant="ai" />
      </Animated.View>
      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.lg }]}>
        {profileName ? `Hola, ${profileName}` : 'Hola'}
      </Text>
      <Text style={[typography.display, { color: colors.textPrimary, textAlign: 'center', marginTop: 4 }]}>¿Cómo te ayudo hoy?</Text>

      <View style={{ width: '100%', maxWidth: 480, marginTop: spacing.xl }}>
        <ChatComposer
          onSend={onSend}
          disabled={sending}
          cardColor={liquid.cardColor}
          borderColor={liquid.borderColor}
          extraStyle={{ ...surfaceBlur(liquid.surface), ...surfaceShadow(liquid.surface) }}
        />
      </View>

      <View style={[styles.suggestionsWrap, { marginTop: spacing.lg }]}>
        {SUGGESTED_QUESTIONS.map((q) => (
          <Pressable
            key={q}
            onPress={() => onSend(q)}
            style={[styles.suggestionChip, { borderColor: colors.surfaceBorder, borderRadius: radius.pill, backgroundColor: colors.surfaceSolid }]}
          >
            <Text style={[typography.caption, { color: colors.textPrimary }]}>{q}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  engineChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, maxWidth: 130 },
  bubble: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10 },
  heroWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  heroGlow: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.7,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  suggestionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  suggestionChip: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1 },
});

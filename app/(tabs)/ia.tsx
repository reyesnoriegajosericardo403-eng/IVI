import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, FeGaussianBlur, Filter } from 'react-native-svg';

import { topFrequentQuestions, type AIActionProposal, type ChatMessage } from '@/ai/chatTypes';
import { AiOrb } from '@/components/AiOrb';
import { ChatActionCard } from '@/components/ChatActionCard';
import { ChatComposer } from '@/components/ChatComposer';
import { ChatSidebar } from '@/components/ChatSidebar';
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
import { CHAT_PALETTE } from '@/theme/chatPalette';
import { useTheme } from '@/theme/ThemeProvider';
import { generateId } from '@/utils/id';

// VALU es tanto el nombre de la app como el de su asistente local — el
// usuario pidió explícitamente que la interfaz nunca diga "Copiloto", así
// que "VALU" es la única identidad que se muestra aquí.
const ENGINE_LABELS: Record<string, string> = { 'local-rules': 'VALU' };

const SUGGESTION_CARDS: Array<{ title: string; desc: string; icon: keyof typeof Ionicons.glyphMap; question: string }> = [
  { title: 'Tu presupuesto', desc: 'Cómo vas este mes contra lo que planeaste', icon: 'pie-chart-outline', question: '¿Cómo voy este mes?' },
  { title: 'Tus gastos', desc: 'En qué se te fue más el dinero', icon: 'trending-down-outline', question: '¿En qué gasté más este mes?' },
  { title: 'Tu patrimonio', desc: 'Lo que tienes, menos lo que debes', icon: 'wallet-outline', question: '¿Cuál es mi patrimonio?' },
];

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function Ia() {
  const { spacing } = useTheme();
  const { isTablet } = useBreakpoint();

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

  const engineName = ENGINE_LABELS[providers.actionAgent.name] ?? providers.actionAgent.name;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CHAT_PALETTE.background }} edges={['top']}>
      <ChatBackground>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {isTablet && (
            <ChatSidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              frequentPrompts={frequentPrompts}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={deleteConversation}
              onSelectFrequent={send}
              visible={false}
              onClose={() => {}}
              palette={CHAT_PALETTE}
            />
          )}

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
              {!isTablet && (
                <Pressable accessibilityLabel="Abrir conversaciones" onPress={() => setSidebarOpen(true)} style={styles.hamburgerBtn}>
                  <Ionicons name="menu" size={24} color={CHAT_PALETTE.textPrimary} />
                </Pressable>
              )}
              <Pressable accessibilityLabel="Ver conexión de IA" onPress={() => router.push('/ai-settings')} style={styles.engineChip}>
                <Ionicons name="sparkles" size={14} color={CHAT_PALETTE.accent} />
                <Text style={styles.engineChipText} numberOfLines={1}>
                  {engineName}
                </Text>
                <Ionicons name="chevron-down" size={14} color={CHAT_PALETTE.textTertiary} />
              </Pressable>
            </View>

            {messages.length === 0 ? (
              <EmptyHero profileName={profile.name} onSend={send} sending={sending} />
            ) : (
              <FlatList
                data={messages}
                keyExtractor={(m) => m.id}
                contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 24 }}
                renderItem={({ item }) =>
                  item.role === 'assistant' && item.action ? (
                    <View style={{ alignSelf: 'flex-start', gap: spacing.sm, maxWidth: '90%' }}>
                      {!!item.text && (
                        <View style={[styles.bubble, styles.assistantBubble]}>
                          <Text style={styles.bubbleText}>{item.text}</Text>
                        </View>
                      )}
                      <ChatActionCard
                        action={item.action}
                        onConfirm={() => handleConfirmAction(item)}
                        onCancel={() => updateActionStatus(item.id, 'dismissed')}
                        palette={CHAT_PALETTE}
                      />
                    </View>
                  ) : (
                    <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                      <Text style={[styles.bubbleText, item.role === 'user' && { color: '#FFFFFF' }]}>{item.text}</Text>
                    </View>
                  )
                }
              />
            )}

            {messages.length > 0 && (
              <View style={{ padding: spacing.md }}>
                <ChatComposer onSend={send} disabled={sending} palette={CHAT_PALETTE} />
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
            onDeleteConversation={deleteConversation}
            onSelectFrequent={(text) => {
              setSidebarOpen(false);
              send(text);
            }}
            visible={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            palette={CHAT_PALETTE}
          />
        )}
      </ChatBackground>
    </SafeAreaView>
  );
}

// Fondo fijo y oscuro con manchas de luz de color desenfoques — igual
// técnica que AppBackground.tsx (SVG, para que también se vea en web),
// pero con la paleta fija de esta pantalla en vez del estilo visual activo
// del usuario (ver theme/chatPalette.ts).
function ChatBackground({ children }: { children: React.ReactNode }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View
      style={{ flex: 1, backgroundColor: CHAT_PALETTE.background }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
      }}
    >
      {size.width > 0 && (
        <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <Filter id="chatGlowBlur" x="-50%" y="-50%" width="200%" height="200%">
              <FeGaussianBlur stdDeviation={Math.max(size.width, size.height) * 0.14} />
            </Filter>
          </Defs>
          {CHAT_PALETTE.backgroundGlow.map((spot, i) => (
            <Circle
              key={i}
              cx={spot.cx * size.width}
              cy={spot.cy * size.height}
              r={spot.radius * Math.max(size.width, size.height)}
              fill={spot.color}
              fillOpacity={0.3}
              filter="url(#chatGlowBlur)"
            />
          ))}
        </Svg>
      )}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

// Estado vacío inspirado en la referencia del usuario: esfera de
// degradado, saludo según la hora del día, compositor grande y tarjetas
// de sugerencia con las funciones reales de VALU (nunca "crear una
// imagen" ni nada que la app no sepa hacer).
function EmptyHero({ profileName, onSend, sending }: { profileName: string; onSend: (text: string) => void; sending: boolean }) {
  return (
    <View style={styles.heroWrap}>
      <AiOrb size={104} />
      <Text style={styles.heroGreeting}>
        {timeGreeting()}
        {profileName ? `, ${profileName}` : ''}.
      </Text>
      <Text style={styles.heroQuestion}>¿En qué te ayudo hoy?</Text>

      <View style={{ width: '100%', maxWidth: 520, marginTop: 28 }}>
        <ChatComposer onSend={onSend} disabled={sending} palette={CHAT_PALETTE} />
      </View>

      <View style={styles.cardsWrap}>
        {SUGGESTION_CARDS.map((c) => (
          <Pressable key={c.title} onPress={() => onSend(c.question)} style={styles.suggestionCard}>
            <Ionicons name={c.icon} size={24} color={CHAT_PALETTE.accent} />
            <Text style={styles.cardTitle}>{c.title}</Text>
            <Text style={styles.cardDesc}>{c.desc}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  hamburgerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  engineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: CHAT_PALETTE.surfaceBorder,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  engineChipText: { color: CHAT_PALETTE.textPrimary, fontWeight: '600', fontSize: 14 },
  bubble: { maxWidth: '85%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18 },
  assistantBubble: { backgroundColor: CHAT_PALETTE.surfaceSolid, borderWidth: 1, borderColor: CHAT_PALETTE.surfaceBorder, alignSelf: 'flex-start' },
  userBubble: { backgroundColor: CHAT_PALETTE.userBubble, alignSelf: 'flex-end' },
  bubbleText: { color: CHAT_PALETTE.textPrimary, fontSize: 15, lineHeight: 21 },
  heroWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  heroGreeting: { color: CHAT_PALETTE.textSecondary, fontSize: 17, fontWeight: '500', marginTop: 22, textAlign: 'center' },
  heroQuestion: { color: CHAT_PALETTE.textPrimary, fontSize: 28, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  cardsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 28, maxWidth: 720 },
  suggestionCard: {
    minWidth: 170,
    flexGrow: 1,
    backgroundColor: CHAT_PALETTE.surfaceSolid,
    borderWidth: 1,
    borderColor: CHAT_PALETTE.surfaceBorder,
    borderRadius: 18,
    padding: 18,
  },
  cardTitle: { color: CHAT_PALETTE.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 12 },
  cardDesc: { color: CHAT_PALETTE.textTertiary, fontSize: 13, marginTop: 4, lineHeight: 18 },
});

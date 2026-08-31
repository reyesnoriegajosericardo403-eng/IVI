import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SUGGESTED_QUESTIONS } from '@/ai/localCopilot';
import { ValuMark } from '@/components/ValuMark';
import { providers } from '@/providers/registry';
import {
  selectActiveAccounts,
  selectActiveBudgets,
  selectActiveGoals,
  selectActiveInvestments,
  selectActiveLiabilities,
  selectActiveTransactions,
} from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

// TODO: cuando el problema de conexión de la IA en la versión web
// (relevo ai-relay) quede resuelto por completo, borrar este aviso y la
// bandera de abajo para que el copiloto vuelva a mostrarse normal.
const AI_TEMPORARILY_DISABLED = true;

function ProximamenteBanner() {
  const { colors, typography, spacing } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
      <View style={{ alignItems: 'center', paddingHorizontal: spacing.xl }}>
        <Text style={[typography.display, { color: colors.danger, fontWeight: '800', textAlign: 'center' }]}>
          PRÓXIMAMENTE
        </Text>
        <Text style={[typography.headline, { color: colors.danger, textAlign: 'center', marginTop: spacing.sm }]}>
          solo en IVI
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default function Ia() {
  if (AI_TEMPORARILY_DISABLED) return <ProximamenteBanner />;
  return <IaChat />;
}

function IaChat() {
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const rawTransactions = useAppStore((s) => s.transactions);
  const rawAccounts = useAppStore((s) => s.accounts);
  const rawInvestments = useAppStore((s) => s.investments);
  const rawLiabilities = useAppStore((s) => s.liabilities);
  const rawBudgets = useAppStore((s) => s.budgets);
  const rawGoals = useAppStore((s) => s.goals);

  const transactions = useMemo(() => selectActiveTransactions(rawTransactions), [rawTransactions]);
  const accounts = useMemo(() => selectActiveAccounts(rawAccounts), [rawAccounts]);
  const investments = useMemo(() => selectActiveInvestments(rawInvestments), [rawInvestments]);
  const liabilities = useMemo(() => selectActiveLiabilities(rawLiabilities), [rawLiabilities]);
  const budgets = useMemo(() => selectActiveBudgets(rawBudgets), [rawBudgets]);
  const goals = useMemo(() => selectActiveGoals(rawGoals), [rawGoals]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hola${profile.name ? `, ${profile.name}` : ''}. Soy el copiloto de VALU. Pregúntame sobre tu patrimonio, gastos, presupuesto o inversiones.`,
    },
  ]);
  const [input, setInput] = useState('');

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    const answer = await providers.copilot.answerQuestion(text, {
      profile,
      transactions,
      accounts,
      investments,
      liabilities,
      budgets,
      goals,
    });
    const botMsg: Message = { id: `a_${Date.now()}`, role: 'assistant', text: answer };
    setMessages((prev) => [...prev, botMsg]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
          <ValuMark size={28} variant="ai" />
          <Text style={[typography.title, { color: colors.textPrimary, marginLeft: spacing.sm }]}>Copiloto VALU</Text>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 24 }}
          renderItem={({ item }) => (
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
              <Text style={[typography.body, { color: item.role === 'user' ? '#FFFFFF' : colors.textPrimary }]}>
                {item.text}
              </Text>
            </View>
          )}
          ListFooterComponent={
            messages.length <= 1 ? (
              <View style={styles.suggestions}>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <Pressable
                    key={q}
                    onPress={() => send(q)}
                    style={[styles.suggestionChip, { borderColor: colors.surfaceBorder, borderRadius: radius.pill, backgroundColor: colors.surfaceSolid }]}
                  >
                    <Text style={[typography.caption, { color: colors.textPrimary }]}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null
          }
        />

        <View style={[styles.inputRow, { padding: spacing.md, borderTopColor: colors.divider, borderTopWidth: 1 }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Escribe tu pregunta..."
            placeholderTextColor={colors.textTertiary}
            onSubmitEditing={() => send(input)}
            style={[
              styles.input,
              { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.pill, backgroundColor: colors.surfaceSolid },
            ]}
          />
          <Pressable
            onPress={() => send(input)}
            style={[styles.sendBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}
          >
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  bubble: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  suggestionChip: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
  sendBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});

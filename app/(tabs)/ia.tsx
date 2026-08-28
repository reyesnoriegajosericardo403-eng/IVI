import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { answerQuestion, SUGGESTED_QUESTIONS } from '@/ai/localCopilot';
import { ValuMark } from '@/components/ValuMark';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export default function Ia() {
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const transactions = useAppStore((s) => s.transactions);
  const accounts = useAppStore((s) => s.accounts);
  const investments = useAppStore((s) => s.investments);
  const liabilities = useAppStore((s) => s.liabilities);
  const budgets = useAppStore((s) => s.budgets);
  const goals = useAppStore((s) => s.goals);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hola${profile.name ? `, ${profile.name}` : ''}. Soy el copiloto de VALU. Pregúntame sobre tu patrimonio, gastos, presupuesto o inversiones.`,
    },
  ]);
  const [input, setInput] = useState('');

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', text };
    const answer = answerQuestion(text, { profile, transactions, accounts, investments, liabilities, budgets, goals });
    const botMsg: Message = { id: `a_${Date.now()}`, role: 'assistant', text: answer };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
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

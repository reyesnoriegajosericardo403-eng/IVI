import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ParsedCapture } from '@/ai/localParser';
import { CategoryIcon } from '@/components/CategoryIcon';
import { ValuMark } from '@/components/ValuMark';
import { DEFAULT_CATEGORIES, fallbackSubcategoryId, findCategory, findSubcategory } from '@/data/categories';
import { providers } from '@/providers/registry';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency } from '@/utils/format';

type Stage = 'idle' | 'listening' | 'processing' | 'needsAmount' | 'needsCategory' | 'confirm' | 'error';

const QUICK_CATEGORIES = ['food', 'transport', 'entertainment', 'health', 'miscellaneous', 'lifestyle'];

export default function Capture() {
  const { colors, typography, spacing, radius } = useTheme();
  const addTransaction = useAppStore((s) => s.addTransaction);
  const primaryCurrency = useAppStore((s) => s.profile.primaryCurrency);

  const [stage, setStage] = useState<Stage>('idle');
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedCapture | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const stopListeningRef = useRef<(() => void) | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      stopListeningRef.current?.();
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const runParse = (raw: string) => {
    setStage('processing');
    setTimeout(async () => {
      const result = await providers.ai.parseCaptureText(raw);
      resolveParsed(result);
    }, 380);
  };

  const resolveParsed = (result: ParsedCapture) => {
    setParsed(result);
    if (result.missing.includes('amount')) {
      setStage('needsAmount');
      return;
    }
    if (result.missing.includes('category')) {
      setStage('needsCategory');
      return;
    }
    finalize(result);
  };

  const finalize = (result: ParsedCapture) => {
    const categoryId = result.categoryId ?? 'miscellaneous';
    const subcategoryId = result.subcategoryId ?? fallbackSubcategoryId(categoryId);
    addTransaction({
      type: result.type,
      amount: result.amount ?? 0,
      currency: result.currency,
      categoryId,
      subcategoryId,
      merchant: result.merchant,
      date: new Date().toISOString(),
      origin: 'voice',
    });
    setParsed({ ...result, categoryId, subcategoryId });
    setStage('confirm');
    closeTimerRef.current = setTimeout(() => router.back(), 1600);
  };

  const handleMicPress = () => {
    if (providers.speech.isAvailable()) {
      setStage('listening');
      const stop = providers.speech.startListening({
        onResult: (transcript) => {
          setText(transcript);
          runParse(transcript);
        },
        onError: () => {
          setErrorMsg('No entendí, intenta escribirlo.');
          setStage('error');
        },
        onEnd: () => {
          stopListeningRef.current = null;
        },
      });
      stopListeningRef.current = stop;
    } else {
      setErrorMsg('El micrófono en vivo llega en la siguiente fase. Escribe tu movimiento abajo.');
      setStage('error');
    }
  };

  const handleTextSubmit = () => {
    if (!text.trim()) return;
    runParse(text.trim());
  };

  const handleAmountSubmit = () => {
    const value = parseFloat(amountInput.replace(',', '.'));
    if (!parsed || Number.isNaN(value)) return;
    const updated: ParsedCapture = { ...parsed, amount: value, missing: parsed.missing.filter((m) => m !== 'amount') };
    if (updated.missing.includes('category')) {
      setParsed(updated);
      setStage('needsCategory');
    } else {
      finalize(updated);
    }
  };

  const handleCategoryPick = (categoryId: string) => {
    if (!parsed) return;
    const updated: ParsedCapture = {
      ...parsed,
      categoryId,
      subcategoryId: fallbackSubcategoryId(categoryId),
      missing: parsed.missing.filter((m) => m !== 'category'),
    };
    finalize(updated);
  };

  const reset = () => {
    setStage('idle');
    setText('');
    setParsed(null);
    setAmountInput('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.container, { padding: spacing.xl }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="chevron-down" size={26} color={colors.textSecondary} />
        </Pressable>

        {stage === 'confirm' && parsed ? (
          <View style={styles.center}>
            <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark" size={32} color="#FFFFFF" />
            </View>
            <Text style={[typography.display, { color: colors.textPrimary, marginTop: spacing.lg }]}>
              {formatCurrency(parsed.amount ?? 0, parsed.currency)}
            </Text>
            <View style={[styles.rowCenter, { marginTop: spacing.sm }]}>
              <CategoryIcon categoryId={parsed.categoryId ?? 'miscellaneous'} size={14} />
              <Text style={[typography.body, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
                {findCategory(parsed.categoryId ?? '')?.name}
                {parsed.subcategoryId ? ` · ${findSubcategory(parsed.categoryId ?? '', parsed.subcategoryId)?.name}` : ''}
                {parsed.merchant ? ` · ${parsed.merchant}` : ''}
              </Text>
            </View>
            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.xl }]}>Registrado</Text>
          </View>
        ) : stage === 'needsAmount' ? (
          <View style={styles.center}>
            <Text style={[typography.title, { color: colors.textPrimary, textAlign: 'center' }]}>¿Cuánto fue?</Text>
            <TextInput
              autoFocus
              keyboardType="decimal-pad"
              value={amountInput}
              onChangeText={setAmountInput}
              onSubmitEditing={handleAmountSubmit}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.amountInput,
                { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md },
              ]}
            />
            <Pressable
              onPress={handleAmountSubmit}
              style={[styles.cta, { backgroundColor: colors.accentFrom, borderRadius: radius.pill, marginTop: spacing.lg }]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Continuar</Text>
            </Pressable>
          </View>
        ) : stage === 'needsCategory' ? (
          <View style={styles.center}>
            <Text style={[typography.title, { color: colors.textPrimary, textAlign: 'center' }]}>
              ¿En qué categoría?
            </Text>
            <View style={[styles.chipWrap, { marginTop: spacing.lg }]}>
              {QUICK_CATEGORIES.map((id) => {
                const cat = findCategory(id);
                if (!cat) return null;
                return (
                  <Pressable
                    key={id}
                    onPress={() => handleCategoryPick(id)}
                    style={[styles.chip, { borderColor: colors.surfaceBorder, borderRadius: radius.pill, backgroundColor: colors.surfaceSolid }]}
                  >
                    <CategoryIcon categoryId={id} size={12} />
                    <Text style={[typography.caption, { color: colors.textPrimary, marginLeft: 6 }]}>{cat.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.center}>
            <ValuMark size={64} variant="ai" />
            <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.lg }]}>
              {stage === 'listening' ? 'Te escucho...' : stage === 'processing' ? 'Procesando...' : 'Registra en segundos'}
            </Text>
            {stage === 'error' && (
              <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.sm, textAlign: 'center' }]}>
                {errorMsg}
              </Text>
            )}
            {(stage === 'idle' || stage === 'error') && (
              <>
                <Pressable
                  onPress={handleMicPress}
                  style={[styles.micBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill, marginTop: spacing.xl }]}
                >
                  <Ionicons name="mic" size={30} color="#FFFFFF" />
                </Pressable>
                <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.lg }]}>
                  o escribe tu movimiento
                </Text>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  onSubmitEditing={handleTextSubmit}
                  placeholder="ej. 65 pesos de café"
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.textInput,
                    { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid },
                  ]}
                  returnKeyType="send"
                />
                {text.length > 0 && (
                  <Pressable
                    onPress={handleTextSubmit}
                    style={[styles.cta, { backgroundColor: colors.accentFrom, borderRadius: radius.pill, marginTop: spacing.md }]}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Registrar</Text>
                  </Pressable>
                )}
              </>
            )}
            {stage === 'listening' && (
              <Pressable onPress={() => stopListeningRef.current?.()} style={{ marginTop: spacing.xl }}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Cancelar</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: { alignSelf: 'center', padding: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  checkCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  amountInput: {
    width: 200,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '700',
    borderWidth: 1,
    paddingVertical: 12,
    marginTop: 24,
  },
  cta: { paddingHorizontal: 28, paddingVertical: 14, alignItems: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingHorizontal: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  micBtn: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  textInput: { width: '100%', maxWidth: 320, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginTop: 12, fontSize: 15 },
});

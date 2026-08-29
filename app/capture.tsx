import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { splitCaptureSegments, type ParsedCapture } from '@/ai/localParser';
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

  const [stage, setStage] = useState<Stage>('idle');
  const [text, setText] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [parsed, setParsed] = useState<ParsedCapture | null>(null);
  const [pendingQueue, setPendingQueue] = useState<ParsedCapture[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [registered, setRegistered] = useState<ParsedCapture[]>([]);
  const [amountInput, setAmountInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const stopListeningRef = useRef<(() => void) | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTextRef = useRef('');
  const interimTextRef = useRef('');
  const listeningRef = useRef(false);
  const registeredRef = useRef<ParsedCapture[]>([]);

  useEffect(() => {
    return () => {
      listeningRef.current = false;
      stopListeningRef.current?.();
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const pushRegistered = (item: ParsedCapture) => {
    registeredRef.current = [...registeredRef.current, item];
    setRegistered(registeredRef.current);
  };

  const saveTransaction = (result: ParsedCapture) => {
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
    return { ...result, categoryId, subcategoryId };
  };

  const finishSession = () => {
    setStage('confirm');
    const delay = registeredRef.current.length > 1 ? 2400 : 1600;
    closeTimerRef.current = setTimeout(() => router.back(), delay);
  };

  const goToNextPending = (queue: ParsedCapture[]) => {
    if (queue.length === 0) {
      finishSession();
      return;
    }
    const next = queue[0];
    setParsed(next);
    setPendingQueue(queue);
    if (next.missing.includes('amount')) {
      setStage('needsAmount');
    } else if (next.missing.includes('category')) {
      setStage('needsCategory');
    } else {
      const saved = saveTransaction(next);
      pushRegistered(saved);
      goToNextPending(queue.slice(1));
    }
  };

  const processBatch = (results: ParsedCapture[]) => {
    const queue: ParsedCapture[] = [];
    for (const r of results) {
      if (r.missing.length === 0) {
        pushRegistered(saveTransaction(r));
      } else {
        queue.push(r);
      }
    }
    if (queue.length > 0) {
      setPendingTotal(queue.length);
      goToNextPending(queue);
    } else {
      finishSession();
    }
  };

  const runBatchParse = (raw: string) => {
    setStage('processing');
    setTimeout(async () => {
      const segments = splitCaptureSegments(raw);
      const results = await Promise.all(segments.map((seg) => providers.ai.parseCaptureText(seg)));
      processBatch(results);
    }, 380);
  };

  const handleMicPress = () => {
    if (providers.speech.isAvailable()) {
      finalTextRef.current = '';
      interimTextRef.current = '';
      setLiveTranscript('');
      listeningRef.current = true;
      setStage('listening');
      const stop = providers.speech.startListening({
        onResult: (transcript) => {
          finalTextRef.current = transcript;
          setLiveTranscript(`${finalTextRef.current} ${interimTextRef.current}`.trim());
        },
        onInterim: (interim) => {
          interimTextRef.current = interim;
          setLiveTranscript(`${finalTextRef.current} ${interimTextRef.current}`.trim());
        },
        onError: () => {
          listeningRef.current = false;
          setErrorMsg('No entendí, intenta escribirlo.');
          setStage('error');
        },
        onEnd: () => {
          stopListeningRef.current = null;
          if (listeningRef.current) {
            listeningRef.current = false;
            const finalText = finalTextRef.current.trim();
            if (finalText) {
              runBatchParse(finalText);
            } else {
              setStage('idle');
            }
          }
        },
      });
      stopListeningRef.current = stop;
    } else {
      setErrorMsg('El micrófono en vivo llega en la siguiente fase. Escribe tu movimiento abajo.');
      setStage('error');
    }
  };

  const handleStopListening = () => {
    const finalText = finalTextRef.current.trim();
    listeningRef.current = false;
    setStage('processing');
    stopListeningRef.current?.();
    stopListeningRef.current = null;
    if (!finalText) {
      setStage('idle');
      return;
    }
    runBatchParse(finalText);
  };

  const handleCancelListening = () => {
    listeningRef.current = false;
    stopListeningRef.current?.();
    stopListeningRef.current = null;
    setLiveTranscript('');
    setStage('idle');
  };

  const handleTextSubmit = () => {
    if (!text.trim()) return;
    runBatchParse(text.trim());
  };

  const handleAmountSubmit = () => {
    const value = parseFloat(amountInput.replace(',', '.'));
    if (!parsed || Number.isNaN(value)) return;
    const updated: ParsedCapture = { ...parsed, amount: value, missing: parsed.missing.filter((m) => m !== 'amount') };
    setAmountInput('');
    if (updated.missing.includes('category')) {
      setParsed(updated);
      setStage('needsCategory');
      setPendingQueue((q) => [updated, ...q.slice(1)]);
    } else {
      const saved = saveTransaction(updated);
      pushRegistered(saved);
      goToNextPending(pendingQueue.slice(1));
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
    const saved = saveTransaction(updated);
    pushRegistered(saved);
    goToNextPending(pendingQueue.slice(1));
  };

  const pendingPosition = pendingTotal > 0 ? pendingTotal - pendingQueue.length + 1 : 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.container, { padding: spacing.xl }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="chevron-down" size={26} color={colors.textSecondary} />
        </Pressable>

        {stage === 'confirm' ? (
          <View style={styles.center}>
            <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark" size={32} color="#FFFFFF" />
            </View>
            <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.lg, textAlign: 'center' }]}>
              {registered.length > 1 ? `Se registraron ${registered.length} movimientos` : 'Registrado'}
            </Text>
            <ScrollView style={{ maxHeight: 260, marginTop: spacing.md, width: '100%' }} contentContainerStyle={{ gap: 10 }}>
              {registered.map((item, idx) => (
                <View key={idx} style={[styles.rowCenter, { justifyContent: 'center' }]}>
                  <CategoryIcon categoryId={item.categoryId ?? 'miscellaneous'} size={14} />
                  <Text style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
                    {formatCurrency(item.amount ?? 0, item.currency)}
                    {' · '}
                    {findCategory(item.categoryId ?? '')?.name}
                    {item.subcategoryId ? ` · ${findSubcategory(item.categoryId ?? '', item.subcategoryId)?.name}` : ''}
                    {item.merchant ? ` · ${item.merchant}` : ''}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : stage === 'needsAmount' ? (
          <View style={styles.center}>
            {pendingTotal > 1 && (
              <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.sm }]}>
                Movimiento {pendingPosition} de {pendingTotal}
              </Text>
            )}
            <Text style={[typography.title, { color: colors.textPrimary, textAlign: 'center' }]}>¿Cuánto fue?</Text>
            {parsed?.rawText && (
              <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
                “{parsed.rawText}”
              </Text>
            )}
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
            {pendingTotal > 1 && (
              <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.sm }]}>
                Movimiento {pendingPosition} de {pendingTotal}
              </Text>
            )}
            <Text style={[typography.title, { color: colors.textPrimary, textAlign: 'center' }]}>
              ¿En qué categoría?
            </Text>
            {parsed?.rawText && (
              <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
                “{parsed.rawText}”
              </Text>
            )}
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
        ) : stage === 'listening' ? (
          <View style={styles.center}>
            <ValuMark size={64} variant="ai" />
            <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.lg }]}>Te escucho...</Text>
            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.xs, textAlign: 'center' }]}>
              Puedes decir varias cosas seguidas, por ejemplo: "65 pesos de café y 200 de uber"
            </Text>
            <ScrollView style={styles.liveTextBox} contentContainerStyle={{ padding: spacing.md }}>
              <Text style={[typography.body, { color: colors.textPrimary }]}>
                {liveTranscript || '…'}
              </Text>
            </ScrollView>
            <View style={[styles.rowGap, { marginTop: spacing.lg }]}>
              <Pressable
                onPress={handleCancelListening}
                style={[styles.cta, { borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: radius.pill }]}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleStopListening}
                style={[styles.cta, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Listo</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.center}>
            <ValuMark size={64} variant="ai" />
            <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.lg }]}>
              {stage === 'processing' ? 'Procesando...' : 'Registra en segundos'}
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
                  o escribe uno o varios movimientos
                </Text>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  onSubmitEditing={handleTextSubmit}
                  placeholder="ej. 65 pesos de café y 200 de uber"
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
  rowGap: { flexDirection: 'row', gap: 12 },
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
  liveTextBox: { width: '100%', maxWidth: 340, maxHeight: 140, marginTop: 20 },
});

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { splitCaptureSegments, type ParsedCapture } from '@/ai/localParser';
import { CategoryIcon } from '@/components/CategoryIcon';
import { HoldToConfirmButton } from '@/components/HoldToConfirmButton';
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
  // Puente entre el evento asíncrono del motor de voz (onEnd/onError) y
  // quien pidió detener — así "qué se guardó" siempre lo decide el motor
  // DESPUÉS de terminar de finalizar, nunca un valor leído de antemano
  // (spec: auditoría del botón que fallaba ~4 de cada 5 veces).
  const finalizeResolveRef = useRef<((text: string) => void) | null>(null);

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
      // Respaldo textual de lo que se dijo — si la categorización
      // automática se equivocó, aquí queda lo que realmente se dijo.
      notes: result.rawText || undefined,
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

  const runBatchParse = (raw: string): Promise<void> => {
    setStage('processing');
    return new Promise((resolve) => {
      setTimeout(async () => {
        const segments = splitCaptureSegments(raw);
        const results = await Promise.all(segments.map((seg) => providers.ai.parseCaptureText(seg)));
        processBatch(results);
        resolve();
      }, 380);
    });
  };

  // Arranca (o reinicia) una sesión de escucha. Se separó de handleMicPress
  // para poder llamarla de nuevo automáticamente cuando un intento no captó
  // nada — así la persona puede volver a intentar sin salir de la pantalla.
  const beginListening = () => {
    if (!providers.speech.isAvailable()) {
      setErrorMsg('El micrófono en vivo llega en la siguiente fase. Escribe tu movimiento abajo.');
      setStage('error');
      return;
    }
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
        // Lo que ya se alcanzó a transcribir antes del error (silencio
        // largo, hipo de red, etc.) NUNCA se tira a la basura — se
        // aprovecha igual que si hubiera terminado bien.
        const recovered = (finalTextRef.current || interimTextRef.current).trim();
        if (finalizeResolveRef.current) {
          finalizeResolveRef.current(recovered);
          finalizeResolveRef.current = null;
          return;
        }
        if (recovered) {
          runBatchParse(recovered);
          return;
        }
        setErrorMsg('No entendí, intenta escribirlo.');
        setStage('error');
      },
      onEnd: () => {
        stopListeningRef.current = null;
        listeningRef.current = false;
        // Única fuente de verdad de "qué se dijo": se lee AQUÍ, después de
        // que el motor terminó de finalizar — nunca antes. Si el motor no
        // alcanzó a marcar nada como "final", se usa lo último visto en
        // pantalla (el texto interino) en vez de perderlo.
        const finalText = (finalTextRef.current || interimTextRef.current).trim();
        if (finalizeResolveRef.current) {
          finalizeResolveRef.current(finalText);
          finalizeResolveRef.current = null;
          return;
        }
        // onEnd espontáneo (el usuario no pidió detener — el navegador
        // cortó la escucha solo) — se procesa igual si ya hay algo dicho.
        if (finalText) {
          runBatchParse(finalText);
        } else {
          setStage('idle');
        }
      },
    });
    stopListeningRef.current = stop;
  };

  const handleMicPress = () => beginListening();

  // Se llama desde el botón de "mantener presionado". Devuelve una promesa
  // que se resuelve solo cuando el guardado de verdad ocurrió, y truena si
  // no se logró capturar nada — así el botón muestra éxito/error honestos
  // en vez de asumir que completar el gesto significa que ya se guardó.
  const handleStopListening = async () => {
    if (!listeningRef.current) return;
    const finalText = await new Promise<string>((resolve) => {
      finalizeResolveRef.current = resolve;
      stopListeningRef.current?.();
      // Respaldo por si el navegador nunca dispara onend/onerror — no se
      // deja a la persona esperando para siempre.
      setTimeout(() => {
        if (finalizeResolveRef.current === resolve) {
          finalizeResolveRef.current = null;
          resolve((finalTextRef.current || interimTextRef.current).trim());
        }
      }, 2500);
    });
    if (!finalText) {
      // No se detectó nada que guardar — se vuelve a escuchar de inmediato
      // para poder intentar otra vez sin salir de esta pantalla.
      beginListening();
      throw new Error('No se detectó nada que guardar.');
    }
    await runBatchParse(finalText);
  };

  const handleCancelListening = () => {
    listeningRef.current = false;
    if (finalizeResolveRef.current) {
      finalizeResolveRef.current('');
      finalizeResolveRef.current = null;
    }
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
            <View style={{ width: '100%', maxWidth: 340, marginTop: spacing.lg, gap: spacing.md }}>
              <HoldToConfirmButton
                onConfirm={handleStopListening}
                label="Mantén presionado para guardar"
                errorLabel="No se escuchó nada. Vuelve a hablar y dale otra vez."
                icon="checkmark"
                accessibilityLabel="Mantener presionado para guardar movimiento"
              />
              <Pressable onPress={handleCancelListening} style={{ alignSelf: 'center', paddingVertical: 4 }}>
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancelar</Text>
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
                  accessibilityLabel="Grabar por voz"
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

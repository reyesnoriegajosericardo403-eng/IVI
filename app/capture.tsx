import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { applyCustomMapping, detectAccountAdjustment, splitCaptureSegments, type ParsedCapture } from '@/ai/localParser';
import { CategoryIcon } from '@/components/CategoryIcon';
import { ValuMark } from '@/components/ValuMark';
import { ACCOUNT_TYPE_ICONS } from '@/data/accountMeta';
import { DEFAULT_CATEGORIES, fallbackSubcategoryId, findCategory, findSubcategory } from '@/data/categories';
import { providers } from '@/providers/registry';
import { selectActiveAccounts, selectActiveBudgets } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { accountsForCategory, resolveAccountByNameHint, resolveDefaultAccountId } from '@/utils/accounts';
import { formatCurrency } from '@/utils/format';

type Stage = 'idle' | 'listening' | 'processing' | 'needsAmount' | 'needsCategory' | 'confirm' | 'error';

const QUICK_CATEGORIES = ['food', 'transport', 'entertainment', 'health', 'miscellaneous', 'lifestyle'];

// Evita que el navegador seleccione texto (y muestre el menú de
// "copiar/pegar") mientras se mantiene presionado el micrófono — eso era
// lo que interrumpía la grabación cuando el dedo quedaba cerca de un
// texto (mismo bug ya resuelto antes en HoldToConfirmButton: "se
// selecciona el texto... y eso cancela el registro"). Se aplica a toda la
// pantalla porque no hay ningún texto aquí que alguien necesite copiar.
const noSelectStyle = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
} as any;

export default function Capture() {
  const { colors, typography, spacing, radius } = useTheme();
  const { autostart } = useLocalSearchParams<{ autostart?: string }>();
  const addTransaction = useAppStore((s) => s.addTransaction);
  const ensureCashAccount = useAppStore((s) => s.ensureCashAccount);
  const rawAccounts = useAppStore((s) => s.accounts);
  const rawBudgets = useAppStore((s) => s.budgets);
  const customCategoryMappings = useAppStore((s) => s.customCategoryMappings);
  const learnCategoryMapping = useAppStore((s) => s.learnCategoryMapping);
  const accounts = useMemo(() => selectActiveAccounts(rawAccounts), [rawAccounts]);
  const budgets = useMemo(() => selectActiveBudgets(rawBudgets), [rawBudgets]);

  const [stage, setStage] = useState<Stage>('idle');
  const [text, setText] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [parsed, setParsed] = useState<ParsedCapture | null>(null);
  const [pendingQueue, setPendingQueue] = useState<ParsedCapture[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [registered, setRegistered] = useState<ParsedCapture[]>([]);
  const [amountInput, setAmountInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [accountOverride, setAccountOverride] = useState<string | undefined>(undefined);
  // Cuenta elegida ANTES de grabar (spec: "antes de presionar el botón de
  // grabar arriba debe aparecer las cuentas... y a esa cuenta realizar el
  // cargo") — se usa como punto de partida para todo lo que se registre en
  // esta sesión de voz, aunque cada movimiento individual se pueda seguir
  // ajustando después en su propia pantalla intermedia.
  const [preSelectedAccountId, setPreSelectedAccountId] = useState<string | undefined>(undefined);

  const stopListeningRef = useRef<(() => void) | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTextRef = useRef('');
  const interimTextRef = useRef('');
  const listeningRef = useRef(false);
  const releaseInFlightRef = useRef(false);
  const registeredRef = useRef<ParsedCapture[]>([]);
  // Puente entre el evento asíncrono del motor de voz (onEnd/onError) y
  // quien pidió detener — así "qué se guardó" siempre lo decide el motor
  // DESPUÉS de terminar de finalizar, nunca un valor leído de antemano
  // (spec: auditoría del botón que fallaba ~4 de cada 5 veces).
  const finalizeResolveRef = useRef<((text: string) => void) | null>(null);
  // Limpieza del listener global de "soltaste el botón" — se registra en
  // window (no en el propio botón) para que soltar el dedo cuente aunque
  // ya se haya vuelto a dibujar la pantalla mientras se grababa (spec:
  // "mantén presionado para grabar, suelta para guardar").
  const releaseListenerCleanupRef = useRef<(() => void) | null>(null);
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      listeningRef.current = false;
      stopListeningRef.current?.();
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      releaseListenerCleanupRef.current?.();
    };
  }, []);

  // El efectivo siempre debe poder elegirse — no solo cuando alguien
  // anotó un saldo inicial en el onboarding (spec: "en la vida real
  // también te pueden pagar en efectivo... también hace gastos... en
  // efectivo"). No hace nada si ya existe.
  useEffect(() => {
    ensureCashAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Iluminación futurista del micrófono MIENTRAS graba/transcribe — deja
  // clarísimo que el micrófono está activo ahora mismo, sin depender de
  // que la persona entienda ningún texto (spec: pruebas con usuarios
  // reales, "que el ícono se ilumine mientras se está grabando").
  useEffect(() => {
    if (stage !== 'listening') {
      glowAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [stage, glowAnim]);

  const pushRegistered = (item: ParsedCapture) => {
    registeredRef.current = [...registeredRef.current, item];
    setRegistered(registeredRef.current);
  };

  const saveTransaction = (result: ParsedCapture, accountIdOverride?: string) => {
    const categoryId = result.categoryId ?? 'miscellaneous';
    const subcategoryId = result.subcategoryId ?? fallbackSubcategoryId(categoryId);
    // Orden de prioridad para la cuenta: 1) una cuenta ya resuelta con
    // certeza en el propio resultado (ej. "agrégale 500 a mi Nu" ya trae
    // la cuenta exacta que se nombró): 2) la que la persona confirmó/
    // cambió en la pantalla intermedia; 3) se asigna sola — la cuenta
    // destino que se configuró en Presupuesto para ese ingreso, o
    // efectivo de respaldo (spec: "no sabía exactamente si lo había
    // gastado de mi monedero... o mi cuenta de BBVA"). Si se equivocó, se
    // corrige después en Movimientos.
    const accountId = result.accountId ?? accountIdOverride ?? resolveDefaultAccountId(result.type, categoryId, subcategoryId, accounts, budgets);
    addTransaction({
      type: result.type,
      amount: result.amount ?? 0,
      currency: result.currency,
      categoryId,
      subcategoryId,
      merchant: result.merchant,
      accountId,
      date: new Date().toISOString(),
      origin: 'voice',
      // Respaldo textual de lo que se dijo — si la categorización
      // automática se equivocó, aquí queda lo que realmente se dijo.
      notes: result.rawText || undefined,
    });
    return { ...result, categoryId, subcategoryId, accountId };
  };

  // "Agrégale 500 a mi Nu" / "sácale 200 a mi Morralla" — dinero que entra
  // o sale de una cuenta puntual, sin ser un gasto/ingreso de categoría
  // específica. Se trata como ingreso/gasto genérico (Otros) apuntando
  // directo a la cuenta que se nombró, solo si esa cuenta existe de
  // verdad — si no se pudo resolver con certeza, se deja el resultado tal
  // cual y sigue el flujo normal (nunca inventa a qué cuenta fue).
  const applyAccountAdjustment = (result: ParsedCapture): ParsedCapture => {
    const adjustment = detectAccountAdjustment(result.rawText);
    if (!adjustment) return result;
    const account = resolveAccountByNameHint(adjustment.accountNameHint, accounts);
    if (!account) return result;
    const isIncrement = adjustment.direction === 'increment';
    return {
      ...result,
      type: isIncrement ? 'income' : 'expense',
      categoryId: isIncrement ? 'income' : 'miscellaneous',
      subcategoryId: isIncrement ? 'inc_other' : 'misc_other',
      accountId: account.id,
      missing: result.missing.filter((m) => m !== 'category'),
    };
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
    setAccountOverride(preSelectedAccountId);
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
        pushRegistered(saveTransaction(r, preSelectedAccountId));
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
        const rawResults = await Promise.all(segments.map((seg) => providers.ai.parseCaptureText(seg)));
        // Lo que la persona ya corrigió antes gana sobre cualquier
        // adivinanza del catálogo o del proveedor de IA conectado (spec:
        // catálogo v7, "mapeo personal"). Un ajuste directo de cuenta
        // ("agrégale/sácale X a mi cuenta") tiene prioridad sobre ambos —
        // ya trae la cuenta exacta que se nombró (spec: catálogo v9).
        const results = rawResults.map((r) => applyAccountAdjustment(applyCustomMapping(r, customCategoryMappings)));
        processBatch(results);
        resolve();
      }, 380);
    });
  };

  // Arranca (o reinicia) una sesión de escucha. Se separó de handleMicPress
  // para poder llamarla de nuevo automáticamente cuando un intento no captó
  // nada — así la persona puede volver a intentar sin salir de la pantalla.
  const beginListening = async () => {
    if (!providers.speech.isAvailable()) {
      setErrorMsg('El micrófono en vivo llega en la siguiente fase. Escribe tu movimiento abajo.');
      setStage('error');
      return;
    }
    // Pide permiso de micrófono explícitamente ANTES de arrancar el
    // reconocimiento de voz — en Android, sobre todo con la app instalada
    // en la pantalla de inicio, SpeechRecognition a veces no pide el
    // permiso correctamente por su cuenta y la grabación simplemente no
    // hace nada, sin ningún aviso (spec: auditoría "el micrófono no
    // sirvió para nada" en Android). Pedirlo así, con la API estándar de
    // getUserMedia, obliga a que el navegador muestre el diálogo real.
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        setErrorMsg(
          err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
            ? 'No tienes permiso de micrófono para VALU. Ve a los ajustes del sitio en tu navegador (candado junto a la URL) y actívalo.'
            : 'No se pudo acceder al micrófono en este dispositivo. Escribe tu movimiento abajo.'
        );
        setStage('error');
        return;
      }
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
      onError: (message) => {
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
        // Se muestra el motivo real (permiso, red, sin micrófono...) en
        // vez de un mensaje genérico — así queda claro qué pasó en vez de
        // que "no sirva para nada" sin explicación (spec: auditoría del
        // micrófono en Android).
        setErrorMsg(message);
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

  // Llegar aquí desde el acceso directo "Grabar por voz" de la pantalla de
  // inicio del celular (manifest.json shortcuts, url "/capture?autostart=1")
  // arranca a escuchar de una vez — un solo toque, sin tener que abrir la
  // app y tocar el micrófono otra vez (spec: "solo presione el widget
  // micrófono y se grabe automáticamente").
  useEffect(() => {
    if (autostart === '1') beginListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autostart]);

  // Se llama al SOLTAR el botón del micrófono. Nunca asume que soltar
  // significa que ya se guardó algo — solo lo sabe cuando el motor de voz
  // termina de finalizar de verdad (spec: auditoría del botón que fallaba
  // ~4 de cada 5 veces).
  const handleMicRelease = async () => {
    // Ahora se puede llegar aquí por dos caminos (soltar tras mantener
    // presionado, o tocar el propio micrófono ya en "Te escucho..." —
    // este segundo camino existe para el atajo "Grabar por voz" de la
    // pantalla de inicio, que arranca a grabar sin que nadie haya
    // mantenido nada presionado). Sin este candado, ambos podían disparar
    // casi al mismo tiempo y pisarse el `finalizeResolveRef` uno al otro,
    // dejando la primera llamada esperando para siempre.
    if (!listeningRef.current || releaseInFlightRef.current) return;
    releaseInFlightRef.current = true;
    try {
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
        setErrorMsg('No se escuchó nada. Mantén presionado el micrófono y vuelve a intentar.');
        setStage('error');
        return;
      }
      await runBatchParse(finalText);
    } finally {
      releaseInFlightRef.current = false;
    }
  };

  // El "soltar" se detecta en window, no en el propio botón — así cuenta
  // aunque la pantalla ya haya cambiado a "Te escucho..." mientras el
  // dedo seguía presionado (mantener presionado para grabar, soltar para
  // guardar — spec: pruebas con usuarios reales, "todos dejaron
  // presionado el botón para grabar").
  const handleMicPressIn = () => {
    releaseListenerCleanupRef.current?.();
    if (typeof window !== 'undefined') {
      const onRelease = () => {
        releaseListenerCleanupRef.current = null;
        window.removeEventListener('pointerup', onRelease);
        window.removeEventListener('pointercancel', onRelease);
        handleMicRelease();
      };
      window.addEventListener('pointerup', onRelease);
      window.addEventListener('pointercancel', onRelease);
      releaseListenerCleanupRef.current = () => {
        window.removeEventListener('pointerup', onRelease);
        window.removeEventListener('pointercancel', onRelease);
      };
    }
    beginListening();
  };

  const handleCancelListening = () => {
    releaseListenerCleanupRef.current?.();
    releaseListenerCleanupRef.current = null;
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
      const saved = saveTransaction(updated, accountOverride);
      pushRegistered(saved);
      goToNextPending(pendingQueue.slice(1));
    }
  };

  const handleCategoryPick = (categoryId: string) => {
    if (!parsed) return;
    const subcategoryId = fallbackSubcategoryId(categoryId);
    // VALU no supo clasificar esto sola — la elección de la persona se
    // recuerda para la próxima vez que diga algo parecido (spec: catálogo
    // v7, "mapeo personal").
    learnCategoryMapping(parsed.rawText, categoryId, subcategoryId);
    const updated: ParsedCapture = {
      ...parsed,
      categoryId,
      subcategoryId,
      missing: parsed.missing.filter((m) => m !== 'category'),
    };
    const saved = saveTransaction(updated, accountOverride);
    pushRegistered(saved);
    goToNextPending(pendingQueue.slice(1));
  };

  const pendingPosition = pendingTotal > 0 ? pendingTotal - pendingQueue.length + 1 : 1;

  // Cuentas disponibles para el movimiento pendiente (quita las que el
  // usuario excluyó en Presupuesto para esa categoría) y cuál va
  // seleccionada ahora — la elegida a mano o, si no ha tocado nada, la que
  // se asignaría sola (spec: "las cuentas de destino aparezcan en la parte
  // superior para seleccionar una").
  const pendingCategoryId = parsed?.categoryId ?? 'miscellaneous';
  const pendingSubcategoryId = parsed?.subcategoryId ?? fallbackSubcategoryId(pendingCategoryId);
  const pendingAvailableAccounts = useMemo(
    () => accountsForCategory(parsed?.type ?? 'expense', pendingCategoryId, pendingSubcategoryId, accounts, budgets),
    [parsed?.type, pendingCategoryId, pendingSubcategoryId, accounts, budgets]
  );
  const pendingSelectedAccountId =
    accountOverride ?? resolveDefaultAccountId(parsed?.type ?? 'expense', pendingCategoryId, pendingSubcategoryId, accounts, budgets);

  const renderAccountPicker = () => {
    if (pendingAvailableAccounts.length === 0) return null;
    return (
      <View style={{ width: '100%', maxWidth: 340, marginBottom: spacing.lg }}>
        <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: 6, textAlign: 'center' }]}>
          {parsed?.type === 'income' ? '¿A QUÉ CUENTA ENTRA?' : '¿DE QUÉ CUENTA SALE?'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, justifyContent: 'center' }}>
          {pendingAvailableAccounts.map((a) => {
            const selected = pendingSelectedAccountId === a.id;
            return (
              <Pressable
                key={a.id}
                accessibilityLabel={`Cuenta ${a.name}`}
                onPress={() => setAccountOverride(a.id)}
                style={[
                  styles.accountChip,
                  { borderRadius: radius.pill, borderColor: selected ? colors.accentFrom : colors.surfaceBorder, backgroundColor: selected ? colors.accentSoft : colors.surfaceSolid },
                ]}
              >
                <View style={[styles.accountDot, { backgroundColor: a.color ?? colors.accentFrom }]} />
                <Ionicons name={ACCOUNT_TYPE_ICONS[a.type] as any} size={20} color={selected ? colors.accentFrom : colors.textSecondary} />
                <Text style={{ color: selected ? colors.accentFrom : colors.textPrimary, fontSize: 16, fontWeight: '700', marginLeft: 8 }} numberOfLines={1}>
                  {a.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.container, { padding: spacing.xl }, noSelectStyle]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="chevron-down" size={26} color={colors.textSecondary} />
        </Pressable>

        {stage === 'confirm' ? (
          <View style={styles.center}>
            <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark" size={32} color="#FFFFFF" />
            </View>
            <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.lg, textAlign: 'center' }]}>
              {registered.length > 1 ? `Se registraron ${registered.length} movimientos` : '¡Listo!'}
            </Text>
            <ScrollView style={{ maxHeight: 260, marginTop: spacing.md, width: '100%' }} contentContainerStyle={{ gap: 10 }}>
              {registered.map((item, idx) => {
                const account = item.accountId ? accounts.find((a) => a.id === item.accountId) : undefined;
                return (
                  <View key={idx} style={[styles.rowCenter, { justifyContent: 'center' }]}>
                    <CategoryIcon categoryId={item.categoryId ?? 'miscellaneous'} size={14} />
                    <Text style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
                      {formatCurrency(item.amount ?? 0, item.currency)}
                      {' · '}
                      {findCategory(item.categoryId ?? '')?.name}
                      {item.subcategoryId ? ` · ${findSubcategory(item.categoryId ?? '', item.subcategoryId)?.name}` : ''}
                      {item.merchant ? ` · ${item.merchant}` : ''}
                      {account ? ` · ${account.name}` : ''}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : stage === 'needsAmount' ? (
          <View style={styles.center}>
            {renderAccountPicker()}
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
            {renderAccountPicker()}
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
            <Animated.View
              style={[
                styles.micGlowRing,
                {
                  borderColor: colors.accentTo,
                  shadowColor: colors.accentTo,
                  opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                  transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }],
                },
              ]}
            >
              <Pressable
                accessibilityLabel="Detener y guardar"
                onPress={handleMicRelease}
                style={[styles.micBtn, { backgroundColor: colors.accentFrom, borderRadius: 999 }]}
              >
                <Ionicons name="mic" size={30} color="#FFFFFF" />
              </Pressable>
            </Animated.View>
            <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.lg }]}>Te escucho...</Text>
            <Text style={[typography.body, { color: colors.accentFrom, fontWeight: '700', marginTop: 2 }]}>Suelta para guardar</Text>
            <Text style={[typography.micro, { color: colors.textTertiary, marginTop: 2, textAlign: 'center' }]}>
              (o toca el micrófono para terminar)
            </Text>
            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.xs, textAlign: 'center' }]}>
              Puedes decir varias cosas seguidas, por ejemplo: "65 pesos de café y 200 de uber"
            </Text>
            <ScrollView style={styles.liveTextBox} contentContainerStyle={{ padding: spacing.md }}>
              <Text style={[typography.body, { color: colors.textPrimary }]}>
                {liveTranscript || '…'}
              </Text>
            </ScrollView>
            <Pressable onPress={handleCancelListening} style={{ alignSelf: 'center', paddingVertical: spacing.md }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancelar</Text>
            </Pressable>
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
                {accounts.length > 0 && (
                  <View style={{ width: '100%', maxWidth: 340, marginTop: spacing.xl }}>
                    <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', marginBottom: 10, textAlign: 'center' }]}>
                      ¿DE QUÉ CUENTA VA A SALIR?
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, justifyContent: 'center' }}>
                      {accounts.map((a) => {
                        const selected = preSelectedAccountId === a.id;
                        return (
                          <Pressable
                            key={a.id}
                            accessibilityLabel={`Usar cuenta ${a.name}`}
                            onPress={() => setPreSelectedAccountId(selected ? undefined : a.id)}
                            style={[
                              styles.accountChip,
                              { borderRadius: radius.pill, borderColor: selected ? colors.accentFrom : colors.surfaceBorder, backgroundColor: selected ? colors.accentSoft : colors.surfaceSolid },
                            ]}
                          >
                            <View style={[styles.accountDot, { backgroundColor: a.color ?? colors.accentFrom }]} />
                            <Ionicons name={ACCOUNT_TYPE_ICONS[a.type] as any} size={20} color={selected ? colors.accentFrom : colors.textSecondary} />
                            <Text style={{ color: selected ? colors.accentFrom : colors.textPrimary, fontSize: 16, fontWeight: '700', marginLeft: 8 }} numberOfLines={1}>
                              {a.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
                <Pressable
                  accessibilityLabel="Mantener presionado para grabar"
                  onPressIn={handleMicPressIn}
                  style={[styles.micBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill, marginTop: spacing.xl }]}
                >
                  <Ionicons name="mic" size={30} color="#FFFFFF" />
                </Pressable>
                <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700', marginTop: spacing.sm, textAlign: 'center' }]}>
                  Mantén presionado el botón para registrar
                </Text>
                <Text style={[typography.micro, { color: colors.textTertiary, fontWeight: '400', marginTop: 4, textAlign: 'center', maxWidth: 280 }]}>
                  Si aparece el ícono verde "¡Listo!" se guardó correctamente. Si no, inténtalo de nuevo.
                </Text>
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
  micGlowRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.9,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  textInput: { width: '100%', maxWidth: 320, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginTop: 12, fontSize: 15 },
  liveTextBox: { width: '100%', maxWidth: 340, maxHeight: 140, marginTop: 20 },
  // Más grandes que antes a propósito: son lo primero que se debe ver
  // claramente (el banco), el micrófono queda como acción secundaria
  // debajo (spec: "que la vista vea primero el banco y por debajo el
  // micrófono").
  accountChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, borderWidth: 1.5 },
  accountDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
});

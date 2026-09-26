import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AIActionProposal } from '@/ai/chatTypes';
import { chatGlass, type ChatPalette } from '@/theme/chatPalette';

import { HoldToConfirmButton } from './HoldToConfirmButton';

// Tarjeta de una acción propuesta por el chat sobre datos reales — el
// ÚNICO lugar donde una de estas acciones puede aplicarse, y solo con un
// gesto explícito de mantener presionado (HoldToConfirmButton, no un tap):
// es mucho más difícil de disparar sin querer dentro de un feed de chat
// lleno de burbujas tocables. El texto que se muestra (`action.summary`)
// siempre lo generó el catálogo de acciones a partir de datos ya
// validados — nunca la prosa libre del modelo (src/ai/actionCatalog.ts).
export function ChatActionCard({
  action,
  onConfirm,
  onCancel,
  palette,
}: {
  action: AIActionProposal;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  palette: ChatPalette;
}) {
  // Pequeño "festejo" al confirmar de verdad — un rebote + destello verde
  // que se apaga solo, nada de una librería de confeti nueva. Solo se
  // dispara la primera vez que status pasa a 'applied'.
  const pop = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const celebratedRef = useRef(false);

  useEffect(() => {
    if (action.status === 'applied' && !celebratedRef.current) {
      celebratedRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Animated.sequence([
        Animated.spring(pop, { toValue: 1.05, friction: 4, useNativeDriver: false }),
        Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: false }),
      ]).start();
      Animated.timing(glow, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }).start(() => {
        Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: false }).start();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action.status]);

  const glowShadow = {
    shadowColor: palette.success,
    shadowOpacity: glow,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  };

  if (action.status !== 'proposed') {
    const isApplied = action.status === 'applied';
    const isFailed = action.status === 'failed';
    return (
      <Animated.View style={[styles.card, chatGlass(), glowShadow, { transform: [{ scale: pop }] }]}>
        <View style={styles.row}>
          <Ionicons
            name={isApplied ? 'checkmark-circle' : isFailed ? 'alert-circle' : 'close-circle'}
            size={18}
            color={isApplied ? palette.success : isFailed ? palette.danger : palette.textTertiary}
          />
          <Text style={[styles.summary, { color: palette.textPrimary }]}>{action.summary}</Text>
        </View>
        {isFailed && action.error && <Text style={[styles.caption, { color: palette.danger }]}>{action.error}</Text>}
        {isApplied && <Text style={[styles.caption, { color: palette.success }]}>Hecho</Text>}
        {action.status === 'dismissed' && <Text style={[styles.caption, { color: palette.textTertiary }]}>Cancelado</Text>}
      </Animated.View>
    );
  }

  return (
    <View style={[styles.card, chatGlass()]}>
      <View style={styles.row}>
        <Ionicons name="sparkles" size={18} color={palette.accent} />
        <Text style={[styles.summary, { color: palette.textPrimary, fontWeight: '600' }]}>{action.summary}</Text>
      </View>
      <View style={styles.actionsRow}>
        <HoldToConfirmButton
          onConfirm={onConfirm}
          icon="checkmark"
          label="Mantén para confirmar"
          holdingLabel="Sigue presionando…"
          savingLabel="Aplicando…"
          successLabel="¡Listo!"
          errorLabel="No se pudo aplicar"
          accessibilityLabel={`Confirmar: ${action.summary}`}
        />
        <Pressable accessibilityLabel="Cancelar acción" onPress={onCancel} style={styles.cancelBtn}>
          <Text style={{ color: palette.textSecondary, fontWeight: '700' }}>Cancelar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, maxWidth: 340, borderRadius: 22 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  summary: { fontSize: 15, marginLeft: 10, flex: 1 },
  caption: { fontSize: 13, marginTop: 4 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8 },
});

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ActionPlan, AIActionStatus } from '@/ai/chatTypes';
import { chatGlass, type ChatPalette } from '@/theme/chatPalette';
import { formatCurrency } from '@/utils/format';

import { HoldToConfirmButton } from './HoldToConfirmButton';

// Tarjeta de un PLAN de varias acciones propuesto por el chat (P2, docs/03_fase2_contratos_v1.md §3-§5).
// Se confirma de una vez con UN solo "mantener presionado" (no paso a paso), muestra los pasos en el orden en
// que se van a aplicar (aquí el orden sí es información) y cómo quedarían las cuentas, metas y deudas. Los
// textos de cada paso y los saldos los armó el catálogo/planificador con datos validados — nunca un modelo.
export function ChatPlanCard({
  plan,
  onConfirm,
  onCancel,
  palette,
}: {
  plan: ActionPlan;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  palette: ChatPalette;
}) {
  const pop = useRef(new Animated.Value(1)).current;
  const celebratedRef = useRef(false);
  useEffect(() => {
    if (plan.status === 'applied' && !celebratedRef.current) {
      celebratedRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Animated.sequence([
        Animated.spring(pop, { toValue: 1.04, friction: 4, useNativeDriver: false }),
        Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: false }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.status]);

  const proposed = plan.status === 'proposed';
  const stepIcon = (status: AIActionStatus): { name: keyof typeof Ionicons.glyphMap; color: string } => {
    switch (status) {
      case 'applied':
        return { name: 'checkmark-circle', color: palette.success };
      case 'failed':
        return { name: 'alert-circle', color: palette.danger };
      case 'skipped':
      case 'dismissed':
        return { name: 'remove-circle-outline', color: palette.textTertiary };
      default:
        return { name: 'ellipse-outline', color: palette.accent };
    }
  };
  const failedStep = plan.steps.find((s) => s.status === 'failed');
  const appliedCount = plan.steps.filter((s) => s.status === 'applied').length;

  const headline =
    plan.status === 'applied'
      ? `Plan aplicado (${plan.steps.length} pasos)`
      : plan.status === 'partially_applied'
        ? `Se aplicaron ${appliedCount} de ${plan.steps.length} pasos`
        : plan.status === 'failed'
          ? 'No se aplicó nada'
          : plan.status === 'dismissed'
            ? 'Plan cancelado'
            : plan.status === 'applying'
              ? 'Aplicando…'
              : `Plan de ${plan.steps.length} pasos`;

  return (
    <Animated.View style={[styles.card, chatGlass(), { transform: [{ scale: pop }] }]} accessibilityLabel={headline}>
      <View style={styles.row}>
        <Ionicons name={plan.status === 'applied' ? 'checkmark-circle' : plan.status === 'dismissed' ? 'close-circle' : 'sparkles'} size={18} color={plan.status === 'applied' ? palette.success : proposed ? palette.accent : palette.textTertiary} />
        <Text style={[styles.headline, { color: palette.textPrimary }]}>{headline}</Text>
      </View>

      <View style={styles.steps}>
        {plan.steps.map((step, i) => {
          const icon = stepIcon(step.status);
          return (
            <View key={step.id} style={styles.stepRow}>
              <Text style={[styles.stepNo, { color: palette.textTertiary }]}>{i + 1}</Text>
              <Ionicons name={icon.name} size={16} color={icon.color} style={{ marginTop: 1 }} />
              <Text style={[styles.stepText, { color: step.status === 'skipped' || step.status === 'dismissed' ? palette.textTertiary : palette.textPrimary }]}>{step.summary}</Text>
            </View>
          );
        })}
      </View>

      {plan.effects.length > 0 && proposed && (
        <View style={[styles.effects, { borderTopColor: palette.textTertiary }]}>
          <Text style={[styles.effectsTitle, { color: palette.textSecondary }]}>Así quedarían</Text>
          {plan.effects.map((e) => (
            <View key={`${e.kind}-${e.id}`} style={styles.effectRow}>
              <Text style={[styles.effectName, { color: palette.textPrimary }]} numberOfLines={1}>{e.name}</Text>
              <Text style={[styles.effectValue, { color: palette.textSecondary }]}>
                {formatCurrency(e.before, e.currency)} → <Text style={{ color: palette.textPrimary, fontWeight: '700' }}>{formatCurrency(e.after, e.currency)}</Text>
              </Text>
            </View>
          ))}
        </View>
      )}

      {proposed &&
        plan.warnings.map((w) => (
          <View key={w} style={[styles.row, { marginTop: 8 }]}>
            <Ionicons name="warning-outline" size={16} color={palette.danger} />
            <Text style={[styles.warning, { color: palette.danger }]}>{w}</Text>
          </View>
        ))}

      {failedStep?.error && <Text style={[styles.caption, { color: palette.danger }]}>El paso {plan.steps.indexOf(failedStep) + 1} falló: {failedStep.error}. Lo que ya se aplicó se queda como está; revisa y vuelve a pedir lo que falta.</Text>}

      {proposed && (
        <View style={styles.actionsRow}>
          <HoldToConfirmButton
            onConfirm={onConfirm}
            icon="checkmark"
            label="Mantén para confirmar todo"
            holdingLabel="Sigue presionando…"
            savingLabel="Aplicando…"
            successLabel="¡Listo!"
            errorLabel="No se pudo aplicar"
            accessibilityLabel={`Confirmar el plan de ${plan.steps.length} pasos`}
          />
          <Pressable accessibilityLabel="Cancelar plan" onPress={onCancel} style={styles.cancelBtn}>
            <Text style={{ color: palette.textSecondary, fontWeight: '700' }}>Cancelar</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, maxWidth: 360, borderRadius: 22 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  headline: { fontSize: 15, fontWeight: '700', marginLeft: 10, flex: 1 },
  steps: { marginTop: 12, gap: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stepNo: { width: 14, fontSize: 13, fontWeight: '700', textAlign: 'right', marginTop: 1 },
  stepText: { flex: 1, fontSize: 14, lineHeight: 19 },
  effects: { marginTop: 14, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 4 },
  effectsTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 },
  effectRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  effectName: { fontSize: 13, flexShrink: 1 },
  effectValue: { fontSize: 13 },
  warning: { fontSize: 13, marginLeft: 8, flex: 1 },
  caption: { fontSize: 13, marginTop: 10 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8 },
});

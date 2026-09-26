import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AIActionProposal } from '@/ai/chatTypes';
import { useTheme } from '@/theme/ThemeProvider';

import { GlassCard } from './GlassCard';
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
}: {
  action: AIActionProposal;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();

  if (action.status !== 'proposed') {
    const isApplied = action.status === 'applied';
    const isFailed = action.status === 'failed';
    return (
      <GlassCard style={[styles.card, { borderRadius: radius.lg }]}>
        <View style={styles.row}>
          <Ionicons
            name={isApplied ? 'checkmark-circle' : isFailed ? 'alert-circle' : 'close-circle'}
            size={18}
            color={isApplied ? colors.success : isFailed ? colors.danger : colors.textTertiary}
          />
          <Text style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1 }]}>{action.summary}</Text>
        </View>
        {isFailed && action.error && (
          <Text style={[typography.caption, { color: colors.danger, marginTop: 4 }]}>{action.error}</Text>
        )}
        {isApplied && <Text style={[typography.caption, { color: colors.success, marginTop: 4 }]}>Hecho</Text>}
        {action.status === 'dismissed' && <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>Cancelado</Text>}
      </GlassCard>
    );
  }

  return (
    <GlassCard style={[styles.card, { borderRadius: radius.lg }]}>
      <View style={styles.row}>
        <Ionicons name="sparkles-outline" size={18} color={colors.accentFrom} />
        <Text style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1, fontWeight: '600' }]}>{action.summary}</Text>
      </View>
      <View style={[styles.actionsRow, { marginTop: spacing.md }]}>
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
          <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancelar</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, maxWidth: 320 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8 },
});

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AIActionProposal } from '@/ai/chatTypes';
import type { ChatPalette } from '@/theme/chatPalette';

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
  if (action.status !== 'proposed') {
    const isApplied = action.status === 'applied';
    const isFailed = action.status === 'failed';
    return (
      <View style={[styles.card, { backgroundColor: palette.surfaceSolid, borderColor: palette.surfaceBorder }]}>
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
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: palette.surfaceSolid, borderColor: palette.surfaceBorder }]}>
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
  card: { padding: 16, maxWidth: 340, borderRadius: 18, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  summary: { fontSize: 15, marginLeft: 10, flex: 1 },
  caption: { fontSize: 13, marginTop: 4 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8 },
});

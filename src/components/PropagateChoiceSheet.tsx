import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export type PropagateChoice = 'none' | 'all' | number;

const CUSTOM_OPTIONS = Array.from({ length: 24 }, (_, i) => i + 1);

// Al editar un renglón dentro de un periodo que tiene un presupuesto con
// nombre cargado, se pregunta hasta dónde llega ese cambio (spec: "debe
// haber una opción que diga si quieres que ese cambio se aplique en el
// resto de periodos que tengan el mismo presupuesto... sí, no o
// personalizado... números del 1 al 24").
export function PropagateChoiceSheet({
  templateName,
  onChoose,
  onCancel,
}: {
  templateName: string;
  onChoose: (choice: PropagateChoice) => void;
  onCancel: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <View style={styles.backdrop}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
        <Text style={[typography.headline, { color: colors.textPrimary }]}>¿Aplicar también a otros periodos?</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
          Guardaste un cambio en este periodo. ¿Quieres que también aplique en los demás periodos que usan
          &quot;{templateName}&quot;?
        </Text>

        {customOpen ? (
          <View style={{ marginTop: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>
              ¿A cuántos periodos siguientes?
            </Text>
            <ScrollView style={[styles.numberList, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]} nestedScrollEnabled>
              {CUSTOM_OPTIONS.map((n) => (
                <Pressable
                  key={n}
                  accessibilityLabel={`Aplicar a ${n} periodos`}
                  onPress={() => onChoose(n)}
                  style={[styles.numberRow, { borderBottomColor: colors.divider }]}
                >
                  <Text style={[typography.body, { color: colors.textPrimary }]}>
                    {n === 1 ? 'El siguiente periodo' : `Los siguientes ${n} periodos`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setCustomOpen(false)} style={{ marginTop: spacing.sm, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Regresar</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Pressable
              accessibilityLabel="Sí, aplicar a todos"
              onPress={() => onChoose('all')}
              style={[styles.choice, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Sí, en todos</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="No, solo este periodo"
              onPress={() => onChoose('none')}
              style={[styles.choice, { borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: radius.pill }]}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>No, solo este periodo</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Personalizado"
              onPress={() => setCustomOpen(true)}
              style={[styles.choice, { borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: radius.pill }]}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Personalizado…</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={{ alignItems: 'center', paddingVertical: 6 }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: { width: '100%', maxWidth: 360, padding: 22 },
  choice: { paddingVertical: 13, alignItems: 'center' },
  numberList: { borderWidth: 1, maxHeight: 240 },
  numberRow: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
});

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { BudgetTemplate } from '@/data/types';
import { surfaceBlur, surfaceShadow } from '@/theme/surfaceStyle';
import { useTheme } from '@/theme/ThemeProvider';

import { templateIcon } from './budgetTemplateMeta';

// Chips de presupuestos en el encabezado de Presupuesto (imagen de
// referencia: "Vacaciones" activo en naranja, "Clases" en gris, "+ Nuevo
// presupuesto", "..." al final) — spec: "mostrar los presupuestos
// frecuentes como chips visibles; colocar los demás en Ver todos. Nuevo
// presupuesto permanece accesible sin desplazarse".
export function BudgetChipRow({
  templates,
  selectedId,
  onSelect,
  onNew,
  onDelete,
}: {
  templates: BudgetTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const { colors, typography, spacing, radius, surface } = useTheme();
  const [showAll, setShowAll] = useState(false);
  const visible = templates.slice(0, 3);
  const rest = templates.slice(3);

  return (
    <View style={styles.row}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {visible.map((t) => {
          const active = t.id === selectedId;
          return (
            <Pressable
              key={t.id}
              accessibilityLabel={`Ver presupuesto ${t.name}`}
              onPress={() => onSelect(t.id)}
              style={[
                styles.chip,
                {
                  borderRadius: radius.pill,
                  backgroundColor: active ? `${t.color}26` : colors.surfaceSolid,
                  borderColor: active ? t.color : colors.surfaceBorder,
                },
              ]}
            >
              <View style={[styles.iconBadge, { backgroundColor: t.color }]}>
                <Ionicons name={templateIcon(t) as any} size={13} color="#FFFFFF" />
              </View>
              <Text style={{ color: active ? t.color : colors.textPrimary, fontWeight: '700', marginLeft: 8 }}>{t.name}</Text>
              {active && <Ionicons name="chevron-down" size={14} color={t.color} style={{ marginLeft: 4 }} />}
            </Pressable>
          );
        })}

        <Pressable
          accessibilityLabel="Nuevo presupuesto"
          onPress={onNew}
          style={[styles.chip, styles.newChip, { borderRadius: radius.pill, borderColor: colors.accentFrom }]}
        >
          <Ionicons name="add" size={16} color={colors.accentFrom} />
          <Text style={{ color: colors.accentFrom, fontWeight: '700', marginLeft: 6 }}>Nuevo presupuesto</Text>
        </Pressable>
      </ScrollView>

      {rest.length > 0 && (
        <Pressable accessibilityLabel="Ver todos los presupuestos" onPress={() => setShowAll(true)} style={[styles.moreBtn, { borderRadius: radius.pill, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
        </Pressable>
      )}

      {showAll && (
        <Modal transparent animationType="fade" onRequestClose={() => setShowAll(false)}>
          <Pressable style={styles.backdrop} onPress={() => setShowAll(false)}>
            <Pressable
              style={[
                styles.sheet,
                { backgroundColor: colors.surfaceSolid, borderColor: colors.surfaceBorder, borderWidth: surface.borderWidth, borderRadius: radius.lg },
                surfaceShadow(surface),
                surfaceBlur(surface),
              ]}
            >
              <Text style={[typography.headline, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Todos tus presupuestos</Text>
              <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: spacing.sm }}>
                {templates.map((t) => (
                  <Pressable
                    key={t.id}
                    accessibilityLabel={`Ver presupuesto ${t.name}`}
                    onPress={() => {
                      onSelect(t.id);
                      setShowAll(false);
                    }}
                    style={[styles.listRow, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
                  >
                    <View style={[styles.iconBadge, { backgroundColor: t.color }]}>
                      <Ionicons name={templateIcon(t) as any} size={13} color="#FFFFFF" />
                    </View>
                    <Text style={[typography.body, { color: colors.textPrimary, flex: 1, marginLeft: spacing.sm }]}>{t.name}</Text>
                    <Pressable accessibilityLabel={`Borrar ${t.name}`} onPress={() => onDelete(t.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                    </Pressable>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scrollContent: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingLeft: 6, paddingRight: 14, paddingVertical: 6, borderWidth: 1 },
  newChip: { paddingLeft: 12, borderStyle: 'dashed' },
  iconBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  moreBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 380, padding: 20 },
  listRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
});

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface SubcategoryOption {
  subcategoryId: string;
  name: string;
}

// Desplegable para agregar una ficha nueva por subcategoría dentro de un
// concepto de presupuesto (ej. elegir "Uber" dentro de "Transporte
// cotidiano") — mismo patrón visual que los demás selectores de la app
// (cabecera con chevron + lista desplegable), para que agregar una ficha
// se sienta tan simple como agregar una tarjeta (spec: "un dropdown
// parecido al que te anexe en foto, ahí seleccionas tu subcategoria y la
// añades").
export function SubcategoryAddDropdown({
  options,
  onSelect,
}: {
  options: SubcategoryOption[];
  onSelect: (subcategoryId: string) => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [open, setOpen] = useState(false);

  if (options.length === 0) return null;

  return (
    <View>
      <Pressable
        accessibilityLabel={open ? 'Cerrar lista de subcategorías' : 'Elegir subcategoría para agregar'}
        onPress={() => setOpen((v) => !v)}
        style={[styles.header, { borderColor: colors.surfaceBorder, borderRadius: radius.pill, backgroundColor: colors.surfaceSolid }]}
      >
        <Ionicons name="add-circle-outline" size={16} color={colors.accentFrom} />
        <Text style={[typography.body, { color: colors.accentFrom, fontWeight: '600', marginLeft: spacing.xs, flex: 1 }]}>
          Agregar ficha
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
      </Pressable>
      {open && (
        <View style={[styles.listWrap, { borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid }]}>
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled showsVerticalScrollIndicator>
            {options.map((o) => (
              <Pressable
                key={o.subcategoryId}
                accessibilityLabel={`Agregar ficha de ${o.name}`}
                onPress={() => {
                  onSelect(o.subcategoryId);
                  setOpen(false);
                }}
                style={[styles.row, { borderBottomColor: colors.surfaceBorder }]}
              >
                <Text style={[typography.body, { color: colors.textPrimary }]}>{o.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  listWrap: { borderWidth: 1, marginTop: 6, overflow: 'hidden' },
  row: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
});

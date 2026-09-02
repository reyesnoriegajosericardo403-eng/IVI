import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export interface BudgetSearchEntry {
  key: string;
  label: string;
  sublabel?: string;
  // Palabras clave adicionales para buscar (ej. sinónimos del catálogo) —
  // no se muestran, solo se usan para encontrar la ficha escribiendo algo
  // distinto al nombre exacto (spec: "buscador... dropdown para elegir").
  keywords?: string[];
  onSelect: () => void;
}

const MAX_RESULTS = 8;

// Buscador rápido para encontrar una categoría/subcategoría de Ingresos o
// Gastos y agregarla directo al presupuesto, sin tener que desplegar
// grupo por grupo hasta encontrarla — es un atajo, no reemplaza el
// desplegable normal (spec: "solo es una función para encontrar más
// rápido las cosas").
export function BudgetSearchBar({ entries, placeholder }: { entries: BudgetSearchEntry[]; placeholder: string }) {
  const { colors, typography, spacing, radius } = useTheme();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (q.length === 0) return [];
    return entries
      .filter((e) => normalize([e.label, e.sublabel ?? '', ...(e.keywords ?? [])].join(' ')).includes(q))
      .slice(0, MAX_RESULTS);
  }, [entries, query]);

  return (
    <View style={{ gap: spacing.xs }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          borderRadius: radius.pill,
          paddingHorizontal: 14,
          backgroundColor: colors.surfaceSolid,
        }}
      >
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          style={[typography.body, { flex: 1, paddingVertical: 10, marginLeft: 8, color: colors.textPrimary }]}
        />
        {query.length > 0 && (
          <Pressable accessibilityLabel="Borrar búsqueda" onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>
      {results.length > 0 && (
        <View style={{ borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: radius.lg, overflow: 'hidden' }}>
          {results.map((r, idx) => (
            <Pressable
              key={r.key}
              onPress={() => {
                r.onSelect();
                setQuery('');
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                backgroundColor: colors.surfaceSolid,
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: colors.surfaceBorder,
              }}
            >
              <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>{r.label}</Text>
              {r.sublabel && <Text style={[typography.micro, { color: colors.textTertiary, marginTop: 2 }]}>{r.sublabel}</Text>}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

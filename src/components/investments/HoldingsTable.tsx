import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface HoldingsColumn {
  key: string;
  label: string;
  width: number;
  align?: 'left' | 'right';
}

export interface HoldingsCell {
  text: string;
  sub?: string;
  tone?: 'positive' | 'negative' | 'muted';
  bold?: boolean;
}

export interface HoldingsRow {
  id: string;
  cells: Record<string, HoldingsCell>;
}

// Tabla de posiciones al estilo de las apps de bolsa: primera columna fija
// (emisora), el resto se desplaza de lado en pantallas angostas. Cifras
// con números tabulares para que las columnas queden alineadas.
export function HoldingsTable({
  columns,
  rows,
  onRowPress,
  emptyText,
}: {
  columns: HoldingsColumn[];
  rows: HoldingsRow[];
  onRowPress?: (id: string) => void;
  emptyText: string;
}) {
  const { colors, typography, spacing } = useTheme();
  if (rows.length === 0) {
    return <Text style={[typography.caption, { color: colors.textTertiary, padding: spacing.md }]}>{emptyText}</Text>;
  }
  const [first, ...rest] = columns;

  const renderCell = (col: HoldingsColumn, cell: HoldingsCell | undefined) => {
    const color =
      cell?.tone === 'positive' ? colors.success : cell?.tone === 'negative' ? colors.danger : cell?.tone === 'muted' ? colors.textTertiary : colors.textPrimary;
    return (
      <View key={col.key} style={{ width: col.width, alignItems: col.align === 'left' ? 'flex-start' : 'flex-end', justifyContent: 'center' }}>
        <Text
          style={[typography.caption, { color, fontWeight: cell?.bold ? '700' : '500', fontVariant: ['tabular-nums'] }]}
          numberOfLines={1}
        >
          {cell?.text ?? '—'}
        </Text>
        {cell?.sub ? (
          <Text style={[typography.micro, { color: colors.textTertiary, fontVariant: ['tabular-nums'] }]} numberOfLines={1}>
            {cell.sub}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ flexDirection: 'row' }}>
      <View>
        <View style={[styles.headerCell, { width: first.width, borderBottomColor: colors.divider }]}>
          <Text style={[typography.micro, { color: colors.textTertiary, fontWeight: '700' }]}>{first.label}</Text>
        </View>
        {rows.map((row, idx) => (
          <Pressable
            key={row.id}
            accessibilityLabel={`Ver ${row.cells[first.key]?.text ?? ''}`}
            onPress={() => onRowPress?.(row.id)}
            style={[styles.bodyCell, { width: first.width, borderBottomColor: colors.divider, borderBottomWidth: idx === rows.length - 1 ? 0 : 1 }]}
          >
            {renderCell({ ...first, align: 'left' }, row.cells[first.key])}
          </Pressable>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
        <View>
          <View style={[styles.rowLine, { borderBottomColor: colors.divider }]}>
            {rest.map((col) => (
              <View key={col.key} style={[styles.headerCell, { width: col.width, height: '100%', alignItems: col.align === 'left' ? 'flex-start' : 'flex-end', borderBottomWidth: 0 }]}>
                <Text style={[typography.micro, { color: colors.textTertiary, fontWeight: '700' }]}>{col.label}</Text>
              </View>
            ))}
          </View>
          {rows.map((row, idx) => (
            <Pressable
              key={row.id}
              onPress={() => onRowPress?.(row.id)}
              style={[styles.rowLine, styles.bodyRow, { borderBottomColor: colors.divider, borderBottomWidth: idx === rows.length - 1 ? 0 : 1 }]}
            >
              {rest.map((col) => renderCell(col, row.cells[col.key]))}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const ROW_HEIGHT = 52;

const styles = StyleSheet.create({
  headerCell: { height: 32, justifyContent: 'center', borderBottomWidth: 1, paddingHorizontal: 4 },
  bodyCell: { height: ROW_HEIGHT, justifyContent: 'center', paddingHorizontal: 4 },
  rowLine: { flexDirection: 'row', borderBottomWidth: 1, height: 32 },
  bodyRow: { height: ROW_HEIGHT, alignItems: 'center', paddingHorizontal: 0 },
});

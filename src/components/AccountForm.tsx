import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ACCOUNT_COLOR_SWATCHES, CASH_ACCOUNT_COLOR } from '@/data/accountColors';
import { ACCOUNT_TYPE_LABELS } from '@/data/accountMeta';
import type { Account, AccountType, Currency, SyncMeta } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';

import { GlassCard } from './GlassCard';

type Draft<T> = Omit<T, keyof SyncMeta>;

const ALL_ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'savings', 'credit_card'];

// Formulario de cuenta compartido — lo usan tanto Patrimonio (Cuentas y
// Deudas) como el paso "Cuentas" del onboarding, para que agregar/editar
// una cuenta se comporte exactamente igual en los dos lados. El efectivo
// siempre es verde fijo (spec: "en el caso de efectivo debe ser un
// verde") y cualquier cuenta puede marcarse como la tarjeta de transporte
// (spec: "importantísima... los primeros a los que se deben realizar los
// cargos" de transporte público).
export function AccountForm({
  onSave,
  onCancel,
  defaultCurrency,
  initial,
  availableTypes = ALL_ACCOUNT_TYPES,
}: {
  onSave: (a: Draft<Account>) => void;
  onCancel: () => void;
  defaultCurrency: Currency;
  initial?: Account;
  availableTypes?: AccountType[];
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<AccountType>(initial?.type ?? availableTypes[0] ?? 'bank');
  const [balance, setBalance] = useState(initial ? String(initial.balance) : '');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [color, setColor] = useState(initial?.color ?? ACCOUNT_COLOR_SWATCHES[0]);
  const [isTransportCard, setIsTransportCard] = useState(initial?.isTransportCard ?? false);

  const canSave = name.trim().length > 0 && balance.length > 0 && !Number.isNaN(parseFloat(balance));

  const applyAdjust = (sign: 1 | -1) => {
    const delta = parseFloat(adjustAmount.replace(',', '.'));
    if (Number.isNaN(delta) || delta <= 0) return;
    const current = parseFloat(balance) || 0;
    setBalance(String(current + sign * delta));
    setAdjustAmount('');
  };

  return (
    <GlassCard style={{ gap: spacing.md }}>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Nombre de la cuenta"
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
      />
      {availableTypes.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {availableTypes.map((t) => (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              style={[
                styles.typeChip,
                { borderRadius: radius.pill, borderColor: type === t ? colors.accentFrom : colors.surfaceBorder, backgroundColor: type === t ? colors.accentSoft : 'transparent' },
              ]}
            >
              <Text style={{ color: type === t ? colors.accentFrom : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                {ACCOUNT_TYPE_LABELS[t]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <TextInput
        value={balance}
        onChangeText={setBalance}
        keyboardType="decimal-pad"
        placeholder="Dinero disponible"
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
      />
      {initial && (
        <View style={styles.adjustRow}>
          <TextInput
            value={adjustAmount}
            onChangeText={setAdjustAmount}
            keyboardType="decimal-pad"
            placeholder="Sumar o restar al saldo"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { flex: 1, color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
          />
          <Pressable
            accessibilityLabel="Sumar al saldo"
            onPress={() => applyAdjust(1)}
            style={[styles.adjustBtn, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
          >
            <Ionicons name="add" size={18} color={colors.success} />
          </Pressable>
          <Pressable
            accessibilityLabel="Restar al saldo"
            onPress={() => applyAdjust(-1)}
            style={[styles.adjustBtn, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
          >
            <Ionicons name="remove" size={18} color={colors.danger} />
          </Pressable>
        </View>
      )}

      {type === 'cash' ? (
        <View style={styles.rowGap}>
          <View style={[styles.colorSwatch, { backgroundColor: CASH_ACCOUNT_COLOR, borderColor: CASH_ACCOUNT_COLOR }]} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>El efectivo siempre es verde</Text>
        </View>
      ) : (
        <View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>Color de la ficha</Text>
          <View style={styles.rowGap}>
            {ACCOUNT_COLOR_SWATCHES.map((c) => (
              <Pressable
                key={c}
                accessibilityLabel={`Color ${c}`}
                onPress={() => setColor(c)}
                style={[styles.colorSwatch, { backgroundColor: c, borderColor: color === c ? colors.textPrimary : 'transparent' }]}
              />
            ))}
          </View>
        </View>
      )}

      <Pressable
        accessibilityLabel="Es tu tarjeta de transporte"
        onPress={() => setIsTransportCard((v) => !v)}
        style={[styles.toggleRow, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>Es tu tarjeta de transporte</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            Los gastos de transporte público (metro, camión, microbús...) se cargarán aquí por default.
          </Text>
        </View>
        <View
          style={[
            styles.checkbox,
            { borderRadius: radius.sm, borderColor: colors.accentFrom, backgroundColor: isTransportCard ? colors.accentFrom : 'transparent' },
          ]}
        >
          {isTransportCard && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
      </Pressable>

      <View style={styles.formActions}>
        <Pressable onPress={onCancel} style={styles.formCancel}>
          <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
        </Pressable>
        <Pressable
          disabled={!canSave}
          onPress={() =>
            onSave({
              name: name.trim(),
              type,
              currency: defaultCurrency,
              balance: parseFloat(balance),
              isLiability: type === 'credit_card',
              color: type === 'cash' ? CASH_ACCOUNT_COLOR : color,
              isTransportCard: isTransportCard || undefined,
            })
          }
          style={[styles.formSave, { backgroundColor: canSave ? colors.accentFrom : colors.surfaceBorder, borderRadius: radius.pill }]}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Guardar</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  rowGap: { flexDirection: 'row', gap: 10 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  adjustRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  adjustBtn: { width: 40, height: 40, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  colorSwatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderWidth: 1 },
  checkbox: { width: 22, height: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, alignItems: 'center' },
  formCancel: { paddingVertical: 10, paddingHorizontal: 8 },
  formSave: { paddingVertical: 10, paddingHorizontal: 20 },
});

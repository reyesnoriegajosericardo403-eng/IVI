import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/CategoryIcon';
import { ACCOUNT_TYPE_ICONS } from '@/data/accountMeta';
import { DEFAULT_CATEGORIES } from '@/data/categories';
import { selectActiveAccounts } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCompactDate, formatCurrency } from '@/utils/format';

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, radius } = useTheme();
  const transactions = useAppStore((s) => s.transactions);
  const updateTransaction = useAppStore((s) => s.updateTransaction);
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);
  const rawAccounts = useAppStore((s) => s.accounts);
  const accounts = useMemo(() => selectActiveAccounts(rawAccounts), [rawAccounts]);

  const tx = transactions.find((t) => t.id === id);
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '');
  const [merchant, setMerchant] = useState(tx?.merchant ?? '');
  const [categoryId, setCategoryId] = useState(tx?.categoryId ?? '');
  const [accountId, setAccountId] = useState<string | undefined>(tx?.accountId);

  if (!tx) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Movimiento no encontrado</Text>
      </SafeAreaView>
    );
  }

  const category = DEFAULT_CATEGORIES.find((c) => c.id === categoryId);

  const handleSave = () => {
    const value = parseFloat(amount.replace(',', '.'));
    updateTransaction(tx.id, {
      amount: Number.isNaN(value) ? tx.amount : value,
      merchant: merchant.trim() || undefined,
      categoryId,
      subcategoryId: categoryId === tx.categoryId ? tx.subcategoryId : category?.subcategories[0]?.id ?? tx.subcategoryId,
      accountId,
    });
    router.back();
  };

  const handleDelete = () => {
    const doDelete = () => {
      deleteTransaction(tx.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      doDelete();
    } else {
      Alert.alert('Eliminar movimiento', '¿Seguro que quieres eliminarlo?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.sm }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.headline, { color: colors.textPrimary }]}>Editar movimiento</Text>
        <Pressable onPress={handleSave}>
          <Text style={[typography.headline, { color: colors.accentFrom }]}>Guardar</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>
          {formatCompactDate(tx.date)} · {tx.origin === 'voice' ? 'Registrado por voz' : tx.origin === 'manual' ? 'Registro manual' : tx.origin}
        </Text>

        {tx.notes && (
          <View style={{ backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: spacing.sm }}>
            <Text style={[typography.micro, { color: colors.accentFrom, fontWeight: '700', marginBottom: 2 }]}>
              LO QUE DIJISTE
            </Text>
            <Text style={[typography.caption, { color: colors.textPrimary }]}>“{tx.notes}”</Text>
          </View>
        )}

        <TextInput
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          style={[typography.display, { color: colors.textPrimary, textAlign: 'center' }]}
        />

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>CATEGORÍA</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {DEFAULT_CATEGORIES.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                style={[
                  styles.catChip,
                  {
                    borderRadius: radius.pill,
                    borderColor: categoryId === c.id ? colors.accentFrom : colors.surfaceBorder,
                    backgroundColor: categoryId === c.id ? colors.accentSoft : colors.surfaceSolid,
                  },
                ]}
              >
                <CategoryIcon categoryId={c.id} size={12} />
                <Text style={[typography.caption, { color: colors.textPrimary, marginLeft: 6 }]}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {tx.type === 'income' ? '¿A QUÉ CUENTA ENTRA?' : '¿DE QUÉ CUENTA SALE?'}
          </Text>
          {accounts.length === 0 ? (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              Aún no tienes cuentas registradas — puedes agregarlas en Patrimonio.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              <Pressable
                accessibilityLabel="Sin especificar cuenta"
                onPress={() => setAccountId(undefined)}
                style={[
                  styles.catChip,
                  { borderRadius: radius.pill, borderColor: !accountId ? colors.accentFrom : colors.surfaceBorder, backgroundColor: !accountId ? colors.accentSoft : colors.surfaceSolid },
                ]}
              >
                <Text style={{ color: !accountId ? colors.accentFrom : colors.textSecondary, fontSize: 13, fontWeight: '600' }}>Sin especificar</Text>
              </Pressable>
              {accounts.map((a) => {
                const selected = accountId === a.id;
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => setAccountId(a.id)}
                    style={[
                      styles.catChip,
                      { borderRadius: radius.pill, borderColor: selected ? colors.accentFrom : colors.surfaceBorder, backgroundColor: selected ? colors.accentSoft : colors.surfaceSolid },
                    ]}
                  >
                    <View style={[styles.accountDot, { backgroundColor: a.color ?? colors.accentFrom }]} />
                    <Ionicons name={ACCOUNT_TYPE_ICONS[a.type] as any} size={12} color={selected ? colors.accentFrom : colors.textSecondary} />
                    <Text style={{ color: selected ? colors.accentFrom : colors.textPrimary, marginLeft: 6, fontSize: 13, fontWeight: '600' }}>{a.name}</Text>
                    <Text style={{ color: selected ? colors.accentFrom : colors.textTertiary, marginLeft: 6, fontSize: 12 }}>
                      {formatCurrency(a.balance, a.currency)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>COMERCIO</Text>
          <TextInput
            value={merchant}
            onChangeText={setMerchant}
            placeholder="Opcional"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.textField,
              { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid },
            ]}
          />
        </View>

        <Pressable onPress={handleDelete} style={[styles.deleteBtn, { borderRadius: radius.md, borderColor: colors.danger }]}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={{ color: colors.danger, fontWeight: '600', marginLeft: 8 }}>Eliminar movimiento</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  accountDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  textField: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, paddingVertical: 14, marginTop: 12 },
});

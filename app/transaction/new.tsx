import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/CategoryIcon';
import { DEFAULT_CATEGORIES, fallbackSubcategoryId } from '@/data/categories';
import type { Currency, TransactionType } from '@/data/types';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

const TYPES: Array<{ id: TransactionType; label: string }> = [
  { id: 'expense', label: 'Gasto' },
  { id: 'income', label: 'Ingreso' },
  { id: 'saving', label: 'Ahorro' },
];

export default function NewTransaction() {
  const { colors, typography, spacing, radius } = useTheme();
  const addTransaction = useAppStore((s) => s.addTransaction);
  const primaryCurrency = useAppStore((s) => s.profile.primaryCurrency);

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(primaryCurrency);
  const [categoryId, setCategoryId] = useState<string>(type === 'income' ? 'income' : type === 'saving' ? 'savings' : 'food');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [merchant, setMerchant] = useState('');

  const category = DEFAULT_CATEGORIES.find((c) => c.id === categoryId);

  const handleTypeChange = (t: TransactionType) => {
    setType(t);
    const defaultCat = t === 'income' ? 'income' : t === 'saving' ? 'savings' : 'food';
    setCategoryId(defaultCat);
    setSubcategoryId('');
  };

  const canSave = amount.length > 0 && !Number.isNaN(parseFloat(amount)) && categoryId;

  const handleSave = () => {
    const value = parseFloat(amount.replace(',', '.'));
    if (Number.isNaN(value) || value <= 0) return;
    addTransaction({
      type,
      amount: value,
      currency,
      categoryId,
      subcategoryId: subcategoryId || fallbackSubcategoryId(categoryId),
      merchant: merchant.trim() || undefined,
      date: new Date().toISOString(),
      origin: 'manual',
    });
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.sm }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.headline, { color: colors.textPrimary }]}>Registro manual</Text>
        <Pressable onPress={handleSave} disabled={!canSave}>
          <Text style={[typography.headline, { color: canSave ? colors.accentFrom : colors.textTertiary }]}>Guardar</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
        <View style={styles.segmentRow}>
          {TYPES.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => handleTypeChange(t.id)}
              style={[
                styles.segment,
                {
                  borderRadius: radius.pill,
                  backgroundColor: type === t.id ? colors.accentFrom : colors.surfaceSolid,
                  borderColor: colors.surfaceBorder,
                },
              ]}
            >
              <Text style={{ color: type === t.id ? '#FFFFFF' : colors.textSecondary, fontWeight: '600' }}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.amountRow}>
          <TextInput
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            style={[typography.display, styles.amountInput, { color: colors.textPrimary }]}
          />
          <View style={styles.currencyToggle}>
            {(['MXN', 'USD'] as Currency[]).map((c) => (
              <Pressable
                key={c}
                onPress={() => setCurrency(c)}
                style={[
                  styles.currencyPill,
                  {
                    borderRadius: radius.pill,
                    borderColor: currency === c ? colors.accentFrom : colors.surfaceBorder,
                    backgroundColor: currency === c ? colors.accentSoft : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: currency === c ? colors.accentFrom : colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>CATEGORÍA</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {DEFAULT_CATEGORIES.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  setCategoryId(c.id);
                  setSubcategoryId('');
                }}
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

        {category && category.subcategories.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>SUBCATEGORÍA</Text>
            <View style={styles.chipWrap}>
              {category.subcategories.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setSubcategoryId(s.id)}
                  style={[
                    styles.subChip,
                    {
                      borderRadius: radius.pill,
                      borderColor: subcategoryId === s.id ? colors.accentFrom : colors.surfaceBorder,
                      backgroundColor: subcategoryId === s.id ? colors.accentSoft : colors.surfaceSolid,
                    },
                  ]}
                >
                  <Text style={{ color: subcategoryId === s.id ? colors.accentFrom : colors.textSecondary, fontSize: 13 }}>
                    {s.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>COMERCIO (OPCIONAL)</Text>
          <TextInput
            value={merchant}
            onChangeText={setMerchant}
            placeholder="ej. Starbucks"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.textField,
              { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid },
            ]}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1 },
  amountRow: { alignItems: 'center', gap: 12 },
  amountInput: { fontSize: 44, textAlign: 'center', minWidth: 160 },
  currencyToggle: { flexDirection: 'row', gap: 8 },
  currencyPill: { paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subChip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  textField: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
});

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/CategoryIcon';
import { DEFAULT_CATEGORIES, fallbackSubcategoryId, findCategory, findSubcategory } from '@/data/categories';
import type { Currency, TransactionType } from '@/data/types';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

const TYPES: Array<{ id: TransactionType; label: string }> = [
  { id: 'expense', label: 'Gasto' },
  { id: 'income', label: 'Ingreso' },
  { id: 'saving', label: 'Ahorro' },
];

// Quita acentos y pasa a minúsculas para que buscar "cafe" encuentre "Café"
// (spec: "vayan apareciendo las posibles opciones que tengan similitud con
// las letras que vas escribiendo").
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

interface SearchEntry {
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  searchText: string;
}

export default function NewTransaction() {
  const { colors, typography, spacing, radius } = useTheme();
  const addTransaction = useAppStore((s) => s.addTransaction);
  const primaryCurrency = useAppStore((s) => s.profile.primaryCurrency);

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(primaryCurrency);
  const [categoryId, setCategoryId] = useState<string>('food');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [excludeFromBudget, setExcludeFromBudget] = useState(false);
  const [query, setQuery] = useState('');
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

  // Solo se ofrecen las categorías que tienen sentido para el tipo elegido
  // — ya no se puede, por accidente, meter un gasto dentro de "Ingresos"
  // (spec: "categorías y subcategorías más intuitivas").
  const categoriesForType = useMemo(() => {
    if (type === 'income') return DEFAULT_CATEGORIES.filter((c) => c.id === 'income');
    if (type === 'saving') return DEFAULT_CATEGORIES.filter((c) => c.id === 'savings');
    return DEFAULT_CATEGORIES.filter((c) => c.id !== 'income' && c.id !== 'savings');
  }, [type]);

  const searchEntries = useMemo<SearchEntry[]>(() => {
    const out: SearchEntry[] = [];
    for (const c of categoriesForType) {
      for (const s of c.subcategories) {
        out.push({
          categoryId: c.id,
          categoryName: c.name,
          subcategoryId: s.id,
          subcategoryName: s.name,
          searchText: normalize([c.name, s.name, ...s.keywords].join(' ')),
        });
      }
    }
    return out;
  }, [categoriesForType]);

  const queryNorm = normalize(query.trim());
  const suggestions = queryNorm.length === 0 ? [] : searchEntries.filter((e) => e.searchText.includes(queryNorm)).slice(0, 8);

  const category = findCategory(categoryId);
  const subcategory = subcategoryId ? findSubcategory(categoryId, subcategoryId) : undefined;

  const handleTypeChange = (t: TransactionType) => {
    setType(t);
    const defaultCat = t === 'income' ? 'income' : t === 'saving' ? 'savings' : 'food';
    setCategoryId(defaultCat);
    setSubcategoryId('');
    setQuery('');
    setOpenCategoryId(null);
  };

  const selectSuggestion = (entry: SearchEntry) => {
    setCategoryId(entry.categoryId);
    setSubcategoryId(entry.subcategoryId);
    setQuery('');
    setOpenCategoryId(null);
  };

  const selectFromAccordion = (catId: string, subId: string) => {
    setCategoryId(catId);
    setSubcategoryId(subId);
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
      notes: note.trim() || undefined,
      origin: 'manual',
      excludeFromBudget: excludeFromBudget || undefined,
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

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }} keyboardShouldPersistTaps="handled">
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

        {/* ---------- Categoría/subcategoría: selección actual + buscador ---------- */}
        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>CATEGORÍA</Text>

          <View style={[styles.selectedRow, { borderRadius: radius.md, backgroundColor: colors.accentSoft }]}>
            <CategoryIcon categoryId={categoryId} size={16} />
            <Text style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1 }]} numberOfLines={1}>
              {category?.name ?? categoryId}
              {subcategory ? ` · ${subcategory.name}` : ''}
            </Text>
          </View>

          <View style={[styles.searchBox, { borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid }]}>
            <Ionicons name="search" size={16} color={colors.textTertiary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Busca una categoría o subcategoría..."
              placeholderTextColor={colors.textTertiary}
              style={[styles.searchInput, { color: colors.textPrimary }]}
            />
            {query.length > 0 && (
              <Pressable accessibilityLabel="Limpiar búsqueda" onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>

          {query.length > 0 && (
            <View style={{ gap: 6 }}>
              {suggestions.length === 0 ? (
                <Text style={[typography.caption, { color: colors.textTertiary, paddingHorizontal: 4 }]}>
                  Sin coincidencias — prueba con otra palabra.
                </Text>
              ) : (
                suggestions.map((s) => (
                  <Pressable
                    key={`${s.categoryId}-${s.subcategoryId}`}
                    accessibilityLabel={`Elegir ${s.categoryName} · ${s.subcategoryName}`}
                    onPress={() => selectSuggestion(s)}
                    style={[styles.suggestionRow, { borderRadius: radius.md, backgroundColor: colors.surfaceSolid, borderColor: colors.surfaceBorder }]}
                  >
                    <CategoryIcon categoryId={s.categoryId} size={16} />
                    <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                      <Text style={[typography.body, { color: colors.textPrimary }]}>{s.subcategoryName}</Text>
                      <Text style={[typography.micro, { color: colors.textTertiary }]}>{s.categoryName}</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          )}

          {/* ---------- Categorías desplegables (para explorar sin buscar) ---------- */}
          {query.length === 0 && (
            <View style={{ gap: 6 }}>
              {categoriesForType.map((c) => {
                const isOpen = openCategoryId === c.id;
                return (
                  <View key={c.id} style={[styles.accordionCard, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}>
                    <Pressable
                      accessibilityLabel={`Mostrar/Ocultar ${c.name}`}
                      onPress={() => setOpenCategoryId(isOpen ? null : c.id)}
                      style={styles.accordionHeader}
                    >
                      <CategoryIcon categoryId={c.id} size={16} />
                      <Text style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1 }]}>{c.name}</Text>
                      <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
                    </Pressable>
                    {isOpen && (
                      <View style={[styles.chipWrap, { padding: spacing.sm, paddingTop: 0 }]}>
                        {c.subcategories.map((s) => {
                          const selected = categoryId === c.id && subcategoryId === s.id;
                          return (
                            <Pressable
                              key={s.id}
                              accessibilityLabel={`Elegir ${c.name} · ${s.name}`}
                              onPress={() => selectFromAccordion(c.id, s.id)}
                              style={[
                                styles.subChip,
                                {
                                  borderRadius: radius.pill,
                                  borderColor: selected ? colors.accentFrom : colors.surfaceBorder,
                                  backgroundColor: selected ? colors.accentSoft : colors.surfaceSolid,
                                },
                              ]}
                            >
                              <Text style={{ color: selected ? colors.accentFrom : colors.textSecondary, fontSize: 13 }}>
                                {s.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

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

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>NOTA (OPCIONAL)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Agrega un detalle si quieres recordarlo"
            placeholderTextColor={colors.textTertiary}
            multiline
            style={[
              styles.textField,
              styles.notesField,
              { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid },
            ]}
          />
        </View>

        <Pressable
          accessibilityLabel="Excluir del presupuesto"
          onPress={() => setExcludeFromBudget((v) => !v)}
          style={[styles.excludeRow, { borderRadius: radius.md, borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceSolid }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>Excluir del presupuesto</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              Se sigue guardando en Movimientos, pero no cuenta en tus totales ni gráficas de presupuesto.
            </Text>
          </View>
          <View
            style={[
              styles.checkbox,
              {
                borderRadius: radius.sm,
                borderColor: colors.accentFrom,
                backgroundColor: excludeFromBudget ? colors.accentFrom : 'transparent',
              },
            ]}
          >
            {excludeFromBudget && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
        </Pressable>
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
  selectedRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  accordionCard: { borderWidth: 1, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subChip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  textField: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  notesField: { minHeight: 70, textAlignVertical: 'top' },
  excludeRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 14 },
  checkbox: { width: 22, height: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
});

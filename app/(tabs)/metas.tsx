import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { Goal } from '@/data/types';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency } from '@/utils/format';

export default function Metas() {
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const goals = useAppStore((s) => s.goals);
  const addGoal = useAppStore((s) => s.addGoal);
  const contributeToGoal = useAppStore((s) => s.contributeToGoal);
  const deleteGoal = useAppStore((s) => s.deleteGoal);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [contributingId, setContributingId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

  const handleCreate = () => {
    const value = parseFloat(target.replace(',', '.'));
    if (!name.trim() || Number.isNaN(value) || value <= 0) return;
    const goal: Goal = {
      id: `goal_${Date.now()}`,
      name: name.trim(),
      targetAmount: value,
      currentAmount: 0,
      currency: profile.primaryCurrency,
      createdAt: new Date().toISOString(),
    };
    addGoal(goal);
    setShowForm(false);
    setName('');
    setTarget('');
  };

  const handleContribute = (id: string) => {
    const value = parseFloat(contributeAmount.replace(',', '.'));
    if (Number.isNaN(value) || value <= 0) return;
    contributeToGoal(id, value);
    setContributingId(null);
    setContributeAmount('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.lg }}>
        <ScreenHeader title="Metas" subtitle="Lo que estás construyendo" />

        {goals.length === 0 && !showForm && (
          <Text style={[typography.caption, { color: colors.textTertiary }]}>Aún no tienes metas. Crea la primera.</Text>
        )}

        {goals.map((g) => {
          const percent = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
          return (
            <GlassCard key={g.id} style={{ gap: spacing.sm }}>
              <View style={styles.rowBetween}>
                <Text style={[typography.headline, { color: colors.textPrimary }]}>{g.name}</Text>
                <Pressable onPress={() => deleteGoal(g.id)}>
                  <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                </Pressable>
              </View>
              <ProgressBar percent={percent} status={percent >= 100 ? 'normal' : 'normal'} />
              <View style={styles.rowBetween}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {formatCurrency(g.currentAmount, g.currency)} / {formatCurrency(g.targetAmount, g.currency)}
                </Text>
                <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700' }]}>{percent}%</Text>
              </View>

              {contributingId === g.id ? (
                <View style={styles.contributeRow}>
                  <TextInput
                    autoFocus
                    value={contributeAmount}
                    onChangeText={setContributeAmount}
                    keyboardType="decimal-pad"
                    placeholder="Monto"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.smallInput, { flex: 1, color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
                  />
                  <Pressable
                    onPress={() => handleContribute(g.id)}
                    style={[styles.smallBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Aportar</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setContributingId(g.id)}>
                  <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700' }]}>+ Aportar</Text>
                </Pressable>
              )}
            </GlassCard>
          );
        })}

        {showForm ? (
          <GlassCard style={{ gap: spacing.md }}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nombre de la meta (ej. Vacaciones)"
              placeholderTextColor={colors.textTertiary}
              style={[styles.smallInput, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
            />
            <TextInput
              value={target}
              onChangeText={setTarget}
              keyboardType="decimal-pad"
              placeholder="Monto objetivo"
              placeholderTextColor={colors.textTertiary}
              style={[styles.smallInput, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
            />
            <View style={styles.rowEnd}>
              <Pressable onPress={() => setShowForm(false)}>
                <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleCreate} style={[styles.smallBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Crear</Text>
              </Pressable>
            </View>
          </GlassCard>
        ) : (
          <Pressable
            onPress={() => setShowForm(true)}
            style={[styles.addBtn, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
          >
            <Ionicons name="add" size={18} color={colors.accentFrom} />
            <Text style={{ color: colors.accentFrom, fontWeight: '700', marginLeft: 6 }}>Nueva meta</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowEnd: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' },
  contributeRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  smallInput: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  smallBtn: { paddingHorizontal: 18, paddingVertical: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', paddingVertical: 14 },
});

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateField } from '@/components/DateField';
import { GlassCard } from '@/components/GlassCard';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { Currency, Goal, SyncMeta } from '@/data/types';
import { selectActiveGoals } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { parseISODate } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

type Draft<T> = Omit<T, keyof SyncMeta>;

function milestoneMessage(percent: number): string {
  if (percent >= 100) return '¡Meta cumplida! 🎉';
  if (percent >= 75) return 'Ya casi lo logras — el último tramo es el más corto.';
  if (percent >= 50) return 'Vas a la mitad del camino. ¡Buen avance!';
  if (percent >= 25) return 'Ya tomaste vuelo. Cada aportación te acerca más.';
  return 'Cada aportación cuenta, por pequeña que sea.';
}

function pacingMessage(remaining: number, targetDate: string | undefined, currency: Currency): string | null {
  if (!targetDate || remaining <= 0) return null;
  const today = new Date();
  const target = parseISODate(targetDate);
  const daysLeft = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return null;
  const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));
  const perWeek = remaining / weeksLeft;
  return `Para llegar a tiempo (${daysLeft} días), aporta ~${formatCurrency(perWeek, currency)} por semana.`;
}

export default function Metas() {
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const rawGoals = useAppStore((s) => s.goals);
  const addGoal = useAppStore((s) => s.addGoal);
  const updateGoal = useAppStore((s) => s.updateGoal);
  const contributeToGoal = useAppStore((s) => s.contributeToGoal);
  const deleteGoal = useAppStore((s) => s.deleteGoal);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [contributingId, setContributingId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const goals = useMemo(() => selectActiveGoals(rawGoals), [rawGoals]);

  const handleCreate = () => {
    const value = parseFloat(target.replace(',', '.'));
    if (!name.trim() || Number.isNaN(value) || value <= 0) return;
    addGoal({
      name: name.trim(),
      targetAmount: value,
      currentAmount: 0,
      currency: profile.primaryCurrency,
      targetDate: targetDate.trim() || undefined,
    });
    setShowForm(false);
    setName('');
    setTarget('');
    setTargetDate('');
  };

  const handleContribute = (id: string, sign: 1 | -1) => {
    const value = parseFloat(contributeAmount.replace(',', '.'));
    if (Number.isNaN(value) || value <= 0) return;
    const goal = goals.find((g) => g.id === id);
    const amount = sign === 1 ? value : -Math.min(value, goal?.currentAmount ?? value);
    contributeToGoal(id, amount);
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

        {goals.map((g) =>
          editingId === g.id ? (
            <GoalEditForm
              key={g.id}
              goal={g}
              onCancel={() => setEditingId(null)}
              onSave={(patch) => {
                updateGoal(g.id, patch);
                setEditingId(null);
              }}
            />
          ) : (
            <GoalCard
              key={g.id}
              goal={g}
              colors={colors}
              typography={typography}
              radius={radius}
              spacing={spacing}
              isContributing={contributingId === g.id}
              contributeAmount={contributeAmount}
              onStartEdit={() => setEditingId(g.id)}
              onDelete={() => deleteGoal(g.id)}
              onStartContribute={() => setContributingId(g.id)}
              onChangeContribute={setContributeAmount}
              onContribute={(sign) => handleContribute(g.id, sign)}
              onCancelContribute={() => {
                setContributingId(null);
                setContributeAmount('');
              }}
            />
          )
        )}

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
            <DateField value={targetDate} onChange={setTargetDate} placeholder="Fecha objetivo (opcional)" />
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

function GoalCard({
  goal: g,
  colors,
  typography,
  radius,
  spacing,
  isContributing,
  contributeAmount,
  onStartEdit,
  onDelete,
  onStartContribute,
  onChangeContribute,
  onContribute,
  onCancelContribute,
}: {
  goal: Goal;
  colors: ReturnType<typeof useTheme>['colors'];
  typography: ReturnType<typeof useTheme>['typography'];
  radius: ReturnType<typeof useTheme>['radius'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  isContributing: boolean;
  contributeAmount: string;
  onStartEdit: () => void;
  onDelete: () => void;
  onStartContribute: () => void;
  onChangeContribute: (v: string) => void;
  onContribute: (sign: 1 | -1) => void;
  onCancelContribute: () => void;
}) {
  const percent = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
  const remaining = Math.max(0, g.targetAmount - g.currentAmount);
  const pacing = pacingMessage(remaining, g.targetDate, g.currency);

  return (
    <GlassCard style={{ gap: spacing.sm }}>
      <View style={styles.rowBetween}>
        <Text style={[typography.headline, { color: colors.textPrimary }]}>{g.name}</Text>
        <View style={styles.rowGap}>
          <Pressable accessibilityLabel={`Editar ${g.name}`} onPress={onStartEdit}>
            <Ionicons name="pencil-outline" size={16} color={colors.textTertiary} />
          </Pressable>
          <Pressable accessibilityLabel={`Eliminar ${g.name}`} onPress={onDelete}>
            <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>
      </View>
      <ProgressBar percent={percent} status="normal" />
      <View style={styles.rowBetween}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {formatCurrency(g.currentAmount, g.currency)} / {formatCurrency(g.targetAmount, g.currency)}
        </Text>
        <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700' }]}>{percent}%</Text>
      </View>

      <Text style={[typography.caption, { color: colors.textSecondary, fontStyle: 'italic' }]}>
        {milestoneMessage(percent)}
      </Text>
      {pacing && <Text style={[typography.caption, { color: colors.textTertiary }]}>{pacing}</Text>}

      {isContributing ? (
        <View style={styles.contributeRow}>
          <TextInput
            autoFocus
            value={contributeAmount}
            onChangeText={onChangeContribute}
            keyboardType="decimal-pad"
            placeholder="Monto"
            placeholderTextColor={colors.textTertiary}
            style={[styles.smallInput, { flex: 1, color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
          />
          <Pressable
            accessibilityLabel="Aportar a la meta"
            onPress={() => onContribute(1)}
            style={[styles.smallBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Aportar</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Retirar de la meta"
            onPress={() => onContribute(-1)}
            style={[styles.smallBtn, { borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: radius.pill }]}
          >
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Retirar</Text>
          </Pressable>
          <Pressable onPress={onCancelContribute}>
            <Ionicons name="close" size={18} color={colors.textTertiary} />
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={onStartContribute}>
          <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700' }]}>+ Aportar o retirar</Text>
        </Pressable>
      )}
    </GlassCard>
  );
}

function GoalEditForm({
  goal,
  onSave,
  onCancel,
}: {
  goal: Goal;
  onSave: (patch: Partial<Draft<Goal>>) => void;
  onCancel: () => void;
}) {
  const { colors, spacing, radius } = useTheme();
  const [name, setName] = useState(goal.name);
  const [target, setTarget] = useState(String(goal.targetAmount));
  const [targetDate, setTargetDate] = useState(goal.targetDate ?? '');

  const targetNum = parseFloat(target.replace(',', '.'));
  const canSave = name.trim().length > 0 && !Number.isNaN(targetNum) && targetNum > 0;

  return (
    <GlassCard style={{ gap: spacing.md }}>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Nombre de la meta"
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
      <DateField value={targetDate} onChange={setTargetDate} placeholder="Fecha objetivo (opcional)" />
      <View style={styles.rowEnd}>
        <Pressable onPress={onCancel}>
          <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
        </Pressable>
        <Pressable
          disabled={!canSave}
          onPress={() =>
            onSave({
              name: name.trim(),
              targetAmount: targetNum,
              targetDate: targetDate.trim() || undefined,
            })
          }
          style={[styles.smallBtn, { backgroundColor: canSave ? colors.accentFrom : colors.surfaceBorder, borderRadius: radius.pill }]}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Guardar</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowEnd: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' },
  rowGap: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  contributeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  smallInput: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  smallBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', paddingVertical: 14 },
});

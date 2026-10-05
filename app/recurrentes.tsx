import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HelpButton } from '@/components/HelpButton';
import { parseCaptureText } from '@/ai/localParser';
import { GlassCard } from '@/components/GlassCard';
import { ChipRow, SmallButton } from '@/components/p3/Chips';
import { RecurrenceEditor, type RecurrenceFormState } from '@/components/p3/RecurrenceEditor';
import { DEFAULT_CATEGORIES, fallbackSubcategoryId, findCategory } from '@/data/categories';
import type { RecurringRule } from '@/data/types';
import { useContentMaxWidth } from '@/hooks/useBreakpoint';
import { selectActiveAccounts, selectActiveGoals, selectActiveRecurringRules } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { todayIsoLocal } from '@/utils/forecast';
import { formatCurrency } from '@/utils/format';
import { ADVANCE_CHOICES, ATTEMPT_CHOICES, TIME_CHOICES } from '@/utils/p3Labels';
import { describeRecurrence, nextOccurrence, shortDateEs } from '@/utils/recurrence';
import { buildRecurrence, validateRecurrenceForm } from '@/utils/recurrencePresets';

type Kind = 'expense' | 'income' | 'transfer' | 'goal';

const KINDS: Array<{ id: Kind; label: string }> = [
  { id: 'expense', label: 'Gasto' },
  { id: 'income', label: 'Ingreso' },
  { id: 'transfer', label: 'Transferencia' },
  { id: 'goal', label: 'Ahorro a una meta' },
];

const STATUS_LABEL: Record<RecurringRule['status'], string> = { active: 'Activo', paused: 'En pausa', ended: 'Terminado' };

export default function Recurrentes() {
  const { colors, typography, spacing, radius } = useTheme();
  const maxWidth = useContentMaxWidth();
  const rawRules = useAppStore((s) => s.recurringRules);
  const rawAccounts = useAppStore((s) => s.accounts);
  const rawGoals = useAppStore((s) => s.goals);
  const currency = useAppStore((s) => s.profile.primaryCurrency);
  const createRule = useAppStore((s) => s.createRule);
  const updateRule = useAppStore((s) => s.updateRule);
  const pauseRule = useAppStore((s) => s.pauseRule);
  const resumeRule = useAppStore((s) => s.resumeRule);
  const endRule = useAppStore((s) => s.endRule);
  const deleteRule = useAppStore((s) => s.deleteRule);
  const rules = useMemo(() => selectActiveRecurringRules(rawRules).sort((a, b) => a.name.localeCompare(b.name)), [rawRules]);
  const accounts = useMemo(() => selectActiveAccounts(rawAccounts), [rawAccounts]);
  const goals = useMemo(() => selectActiveGoals(rawGoals), [rawGoals]);
  const today = todayIsoLocal();

  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState<Kind>('expense');
  const [name, setName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [toAccountId, setToAccountId] = useState<string | undefined>(undefined);
  const [goalId, setGoalId] = useState<string | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<string | null>(null); // null = la adivina VALU por el nombre
  const [recurrence, setRecurrence] = useState<RecurrenceFormState>({ preset: 'monthly', startDate: today, end: { mode: 'never' } });
  const [remind, setRemind] = useState(true);
  const [advance, setAdvance] = useState<number[]>([1]);
  const [time, setTime] = useState<string>('09:00');
  const [attempts, setAttempts] = useState<number>(1);
  const [push, setPush] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setAmountText('');
    setCategoryId(null);
    setError(null);
    setKind('expense');
    setRecurrence({ preset: 'monthly', startDate: today, end: { mode: 'never' } });
  };

  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name ?? 'cuenta eliminada';

  const handleSave = () => {
    const amount = parseFloat(amountText.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) return setError('Escribe un monto mayor que cero.');
    const recErr = validateRecurrenceForm(recurrence.preset, recurrence.startDate, recurrence.end);
    if (recErr) return setError(recErr);
    const rec = buildRecurrence(recurrence.preset!, recurrence.startDate, recurrence.end);
    const trimmed = name.trim();
    let draft;
    if (kind === 'goal') {
      draft = { kind: 'goal_contribution' as const, name: trimmed || 'Aportación a mi meta', amount, currency, goalId, recurrence: rec };
    } else {
      const txType = kind;
      let cat = categoryId;
      let sub: string | undefined;
      if (txType !== 'transfer') {
        if (!cat) {
          const parsed = parseCaptureText(`${trimmed} ${amount}`);
          cat = parsed.categoryId && parsed.type === txType ? parsed.categoryId : txType === 'income' ? 'income' : 'miscellaneous';
          sub = parsed.categoryId === cat && parsed.subcategoryId ? parsed.subcategoryId : undefined;
        }
        if (!findCategory(cat)) cat = txType === 'income' ? 'income' : DEFAULT_CATEGORIES[0].id;
        sub = sub ?? fallbackSubcategoryId(cat);
      }
      draft = {
        kind: 'transaction' as const,
        name: trimmed,
        amount,
        currency,
        txType,
        categoryId: txType === 'transfer' ? undefined : cat ?? undefined,
        subcategoryId: txType === 'transfer' ? undefined : sub,
        merchant: trimmed,
        accountId,
        toAccountId: txType === 'transfer' ? toAccountId : undefined,
        recurrence: rec,
      };
    }
    const res = createRule(draft, remind ? { remind: true, advanceDays: advance, timeOfDay: time, maxAttempts: attempts, push } : { remind: false });
    if (!res.ok) return setError(res.error ?? 'No se pudo guardar.');
    reset();
    setCreating(false);
  };

  const field = { color: colors.textPrimary, borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 } as const;
  const label = [typography.caption, { color: colors.textSecondary }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Pressable accessibilityLabel="Volver" onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Pagos recurrentes</Text>
        <View style={{ marginLeft: 6 }}><HelpButton topic="recurrentes" /></View>
      </View>

      <ScrollView
        contentContainerStyle={[{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 140 }, maxWidth ? { maxWidth, width: '100%', alignSelf: 'center' } : null]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Lo que se repite (renta, sueldo, suscripciones, ahorro). VALU lo deja como «previsto» y te avisa; tus saldos solo cambian cuando confirmas que ya pasó.
        </Text>

        {!creating ? (
          <SmallButton label="Nuevo pago recurrente" tone="primary" icon={<Ionicons name="add" size={16} color="#FFFFFF" />} onPress={() => setCreating(true)} />
        ) : (
          <GlassCard style={{ gap: spacing.md }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Nuevo pago recurrente</Text>
            <ChipRow options={KINDS} value={kind} onChange={(k) => setKind(k as Kind)} />

            <View style={{ gap: spacing.sm }}>
              <Text style={label}>NOMBRE</Text>
              <TextInput value={name} onChangeText={setName} placeholder={kind === 'income' ? 'ej. Sueldo' : kind === 'goal' ? 'ej. Ahorro del viaje' : 'ej. Renta, Netflix'} placeholderTextColor={colors.textTertiary} style={field} />
            </View>
            <View style={{ gap: spacing.sm }}>
              <Text style={label}>MONTO</Text>
              <TextInput value={amountText} onChangeText={setAmountText} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textTertiary} style={field} />
            </View>

            {kind === 'goal' ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={label}>META</Text>
                {goals.length === 0 ? <Text style={[typography.caption, { color: colors.textTertiary }]}>Primero crea una meta en la pestaña Metas.</Text> : <ChipRow options={goals.map((g) => ({ id: g.id, label: g.name }))} value={goalId ?? null} onChange={setGoalId} />}
              </View>
            ) : (
              <>
                <View style={{ gap: spacing.sm }}>
                  <Text style={label}>{kind === 'income' ? 'ENTRA A LA CUENTA' : kind === 'transfer' ? 'SALE DE LA CUENTA' : 'SE PAGA DE LA CUENTA'}</Text>
                  <ChipRow options={accounts.map((a) => ({ id: a.id, label: a.name }))} value={accountId ?? null} onChange={setAccountId} />
                </View>
                {kind === 'transfer' && (
                  <View style={{ gap: spacing.sm }}>
                    <Text style={label}>VA A LA CUENTA</Text>
                    <ChipRow options={accounts.filter((a) => a.id !== accountId).map((a) => ({ id: a.id, label: a.name }))} value={toAccountId ?? null} onChange={setToAccountId} />
                  </View>
                )}
                {kind !== 'transfer' && (
                  <View style={{ gap: spacing.sm }}>
                    <Text style={label}>CATEGORÍA {categoryId ? '' : '(VALU la adivina por el nombre)'}</Text>
                    <ChipRow
                      options={DEFAULT_CATEGORIES.filter((c) => (kind === 'income' ? c.id === 'income' : c.id !== 'income' && c.id !== 'savings')).map((c) => ({ id: c.id, label: c.name }))}
                      value={categoryId}
                      onChange={(c) => setCategoryId((cur) => (cur === c ? null : c))}
                    />
                  </View>
                )}
              </>
            )}

            <RecurrenceEditor value={recurrence} onChange={setRecurrence} />

            <View style={{ gap: spacing.sm }}>
              <Text style={label}>AVISOS</Text>
              <ChipRow options={[{ id: 'yes', label: 'Avisarme' }, { id: 'no', label: 'Sin avisos' }]} value={remind ? 'yes' : 'no'} onChange={(v) => setRemind(v === 'yes')} />
              {remind && (
                <>
                  <Text style={label}>AVISO PREVIO</Text>
                  <ChipRow multi options={ADVANCE_CHOICES.map((d) => ({ id: d, label: d === 1 ? '1 día antes' : `${d} días antes` }))} value={advance} onChange={(d) => setAdvance((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))} />
                  <Text style={label}>HORA DEL AVISO</Text>
                  <ChipRow options={TIME_CHOICES.map((t) => ({ id: t, label: t }))} value={time} onChange={setTime} />
                  <Text style={label}>SI NO LO CONFIRMO, INSISTIR</Text>
                  <ChipRow options={ATTEMPT_CHOICES.map((n) => ({ id: n, label: n === 1 ? 'Una vez' : `Hasta ${n} veces` }))} value={attempts} onChange={setAttempts} />
                  <ChipRow options={[{ id: 'push', label: 'Notificación al teléfono' }, { id: 'app', label: 'Solo dentro de la app' }]} value={push ? 'push' : 'app'} onChange={(v) => setPush(v === 'push')} />
                </>
              )}
            </View>

            {error && <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SmallButton label="Guardar" tone="primary" onPress={handleSave} />
              <SmallButton
                label="Cancelar"
                onPress={() => {
                  reset();
                  setCreating(false);
                }}
              />
            </View>
          </GlassCard>
        )}

        {rules.length === 0 && !creating && (
          <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center' }]}>Todavía no tienes pagos recurrentes.</Text>
        )}

        {rules.map((r) => {
          const next = r.status === 'active' ? nextOccurrence(r.recurrence, today) : null;
          const goalName = r.kind === 'goal_contribution' ? goals.find((g) => g.id === r.goalId)?.name : undefined;
          return (
            <GlassCard key={r.id} style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.headline, { color: colors.textPrimary }]}>{r.name}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {describeRecurrence(r.recurrence)}
                    {r.kind === 'goal_contribution' ? ` · a ${goalName ?? 'meta eliminada'}` : r.accountId ? ` · ${accountName(r.accountId)}` : ''}
                  </Text>
                  <Text style={[typography.micro, { color: r.status === 'active' ? colors.success : colors.textTertiary }]}>
                    {STATUS_LABEL[r.status]}
                    {next ? ` · próxima: ${shortDateEs(next)}` : ''}
                  </Text>
                </View>
                <Text style={[typography.headline, { color: r.txType === 'income' ? colors.success : colors.textPrimary }]}>
                  {r.txType === 'income' ? '+' : ''}
                  {formatCurrency(r.amount, r.currency)}
                </Text>
              </View>

              {editing?.id === r.id ? (
                <View style={{ gap: spacing.sm }}>
                  <TextInput value={editing.text} onChangeText={(t) => setEditing({ id: r.id, text: t })} keyboardType="decimal-pad" placeholder="Nuevo monto" placeholderTextColor={colors.textTertiary} style={field} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <SmallButton
                      label="Guardar monto"
                      tone="primary"
                      onPress={() => {
                        const v = parseFloat(editing.text.replace(',', '.'));
                        const res = updateRule(r.id, { amount: v });
                        if (!res.ok) setError(res.error ?? 'No se pudo.');
                        else {
                          setError(null);
                          setEditing(null);
                        }
                      }}
                    />
                    <SmallButton label="Cancelar" onPress={() => setEditing(null)} />
                  </View>
                </View>
              ) : confirmDelete === r.id ? (
                <View style={{ gap: spacing.sm }}>
                  <Text style={[typography.caption, { color: colors.danger }]}>Se borra el pago y sus previstos que aún no pasan. Lo ya confirmado se queda en tus movimientos.</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <SmallButton
                      label="Sí, eliminar"
                      tone="danger"
                      onPress={() => {
                        deleteRule(r.id);
                        setConfirmDelete(null);
                      }}
                    />
                    <SmallButton label="Cancelar" onPress={() => setConfirmDelete(null)} />
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {r.status === 'active' && <SmallButton label="Pausar" onPress={() => pauseRule(r.id)} />}
                  {r.status === 'paused' && <SmallButton label="Reanudar" tone="primary" onPress={() => resumeRule(r.id)} />}
                  {r.status !== 'ended' && <SmallButton label="Cambiar monto" onPress={() => setEditing({ id: r.id, text: String(r.amount) })} />}
                  {r.status !== 'ended' && <SmallButton label="Terminar" onPress={() => endRule(r.id)} />}
                  <SmallButton label="Eliminar" tone="danger" onPress={() => setConfirmDelete(r.id)} />
                </View>
              )}
            </GlassCard>
          );
        })}
        {error && !creating && <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

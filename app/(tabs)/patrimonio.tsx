import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DualLineChart } from '@/components/DualLineChart';
import { DateField } from '@/components/DateField';
import { GlassCard } from '@/components/GlassCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Sparkline } from '@/components/Sparkline';
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS, LIABILITY_TYPE_LABELS } from '@/data/accountMeta';
import type { Account, AccountType, Currency, Liability, LiabilityType, SyncMeta } from '@/data/types';
import { selectActiveAccounts, selectActiveInvestments, selectActiveLiabilities, selectActiveNetWorthHistory } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDateDMY } from '@/utils/date';
import { formatCurrency, formatPercent } from '@/utils/format';
import { computeNetWorth, getNetWorthTrend } from '@/utils/finance';

const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'savings', 'credit_card'];
const LIABILITY_TYPES: LiabilityType[] = ['credit_card', 'student_loan', 'personal_loan', 'mortgage', 'other'];

type Draft<T> = Omit<T, keyof SyncMeta>;

export default function Patrimonio() {
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const rawAccounts = useAppStore((s) => s.accounts);
  const rawInvestments = useAppStore((s) => s.investments);
  const rawLiabilities = useAppStore((s) => s.liabilities);
  const rawNetWorthHistory = useAppStore((s) => s.netWorthHistory);
  const addAccount = useAppStore((s) => s.addAccount);
  const deleteAccount = useAppStore((s) => s.deleteAccount);
  const addLiability = useAppStore((s) => s.addLiability);
  const deleteLiability = useAppStore((s) => s.deleteLiability);

  const accounts = useMemo(() => selectActiveAccounts(rawAccounts), [rawAccounts]);
  const investments = useMemo(() => selectActiveInvestments(rawInvestments), [rawInvestments]);
  const liabilities = useMemo(() => selectActiveLiabilities(rawLiabilities), [rawLiabilities]);
  const netWorthHistory = useMemo(() => selectActiveNetWorthHistory(rawNetWorthHistory), [rawNetWorthHistory]);

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showLiabilityForm, setShowLiabilityForm] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingLiabilityId, setEditingLiabilityId] = useState<string | null>(null);
  const updateAccount = useAppStore((s) => s.updateAccount);
  const updateLiability = useAppStore((s) => s.updateLiability);

  const netWorth = computeNetWorth(accounts, investments, liabilities, profile.primaryCurrency);
  const sparkData = netWorthHistory.map((h) => h.netWorth);
  const assetsHistory = netWorthHistory.map((h) => h.assets);
  const liabilitiesHistory = netWorthHistory.map((h) => h.liabilities);

  const trends = [
    { label: '1 día', value: getNetWorthTrend(netWorthHistory, 1) },
    { label: '7 días', value: getNetWorthTrend(netWorthHistory, 7) },
    { label: '30 días', value: getNetWorthTrend(netWorthHistory, 30) },
    { label: '1 año', value: getNetWorthTrend(netWorthHistory, 365) },
  ];

  const investmentTotal = investments.reduce((sum, i) => sum + i.amountInvested, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.lg }}>
        <ScreenHeader title="Patrimonio" subtitle="Activos menos pasivos" />

        <GlassCard style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Patrimonio neto</Text>
          <Text style={[typography.display, { color: colors.textPrimary }]}>
            {formatCurrency(netWorth.netWorth, profile.primaryCurrency)}
          </Text>
          {sparkData.length >= 2 && (
            <View style={{ marginTop: spacing.xs }}>
              <Sparkline data={sparkData} color={colors.accentFrom} width={300} height={60} />
            </View>
          )}
          <View style={[styles.trendRow, { marginTop: spacing.sm }]}>
            {trends.map((t) => (
              <View key={t.label} style={styles.trendItem}>
                <Text style={[typography.micro, { color: colors.textTertiary }]}>{t.label.toUpperCase()}</Text>
                <Text
                  style={[
                    typography.caption,
                    { color: t.value === null ? colors.textTertiary : t.value >= 0 ? colors.success : colors.danger, fontWeight: '700' },
                  ]}
                >
                  {t.value === null ? 'Sin datos' : formatPercent(t.value)}
                </Text>
              </View>
            ))}
          </View>
        </GlassCard>

        <View style={styles.rowGap}>
          <GlassCard style={{ flex: 1, gap: 4 }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Activos</Text>
            <Text style={[typography.headline, { color: colors.success }]}>
              {formatCurrency(netWorth.assets, profile.primaryCurrency)}
            </Text>
          </GlassCard>
          <GlassCard style={{ flex: 1, gap: 4 }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Pasivos</Text>
            <Text style={[typography.headline, { color: colors.danger }]}>
              {formatCurrency(netWorth.liabilities, profile.primaryCurrency)}
            </Text>
          </GlassCard>
        </View>

        {assetsHistory.length >= 2 && (
          <GlassCard style={{ gap: spacing.sm }}>
            <View style={styles.rowBetween}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Activos y pasivos en el tiempo</Text>
              <View style={styles.rowGap}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                  <Text style={[typography.micro, { color: colors.textTertiary }]}>Activos</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                  <Text style={[typography.micro, { color: colors.textTertiary }]}>Pasivos</Text>
                </View>
              </View>
            </View>
            <DualLineChart
              seriesA={assetsHistory}
              seriesB={liabilitiesHistory}
              colorA={colors.success}
              colorB={colors.danger}
              width={300}
              height={100}
            />
          </GlassCard>
        )}

        {investmentTotal > 0 && (
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            Incluye {formatCurrency(investmentTotal, profile.primaryCurrency)} en inversiones (monto invertido, no valor de mercado — ver pestaña Inversiones).
          </Text>
        )}

        <SectionHeader
          title="Cuentas"
          onAdd={() => setShowAccountForm((v) => !v)}
          colors={colors}
          typography={typography}
        />

        {showAccountForm && (
          <AccountForm
            onCancel={() => setShowAccountForm(false)}
            onSave={(a) => {
              addAccount(a);
              setShowAccountForm(false);
            }}
            defaultCurrency={profile.primaryCurrency}
          />
        )}

        {accounts.length === 0 && !showAccountForm && (
          <Text style={[typography.caption, { color: colors.textTertiary }]}>Aún no tienes cuentas registradas.</Text>
        )}

        {accounts.map((a) =>
          editingAccountId === a.id ? (
            <AccountForm
              key={a.id}
              initial={a}
              onCancel={() => setEditingAccountId(null)}
              onSave={(patch) => {
                updateAccount(a.id, patch);
                setEditingAccountId(null);
              }}
              defaultCurrency={profile.primaryCurrency}
            />
          ) : (
            <GlassCard key={a.id} style={styles.listRow}>
              <Ionicons name={ACCOUNT_TYPE_ICONS[a.type] as any} size={18} color={colors.accentFrom} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.headline, { color: colors.textPrimary }]}>{a.name}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{ACCOUNT_TYPE_LABELS[a.type]}</Text>
              </View>
              <Text style={[typography.headline, { color: a.isLiability ? colors.danger : colors.textPrimary, marginRight: spacing.sm }]}>
                {formatCurrency(a.balance, a.currency)}
              </Text>
              <Pressable
                accessibilityLabel={`Editar ${a.name}`}
                onPress={() => setEditingAccountId(a.id)}
                style={{ marginRight: spacing.sm }}
              >
                <Ionicons name="pencil-outline" size={18} color={colors.textTertiary} />
              </Pressable>
              <Pressable accessibilityLabel={`Eliminar ${a.name}`} onPress={() => deleteAccount(a.id)}>
                <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
              </Pressable>
            </GlassCard>
          )
        )}

        <SectionHeader
          title="Deudas"
          onAdd={() => setShowLiabilityForm((v) => !v)}
          colors={colors}
          typography={typography}
        />

        {showLiabilityForm && (
          <LiabilityForm
            onCancel={() => setShowLiabilityForm(false)}
            onSave={(l) => {
              addLiability(l);
              setShowLiabilityForm(false);
            }}
            defaultCurrency={profile.primaryCurrency}
          />
        )}

        {liabilities.length === 0 && !showLiabilityForm && (
          <Text style={[typography.caption, { color: colors.textTertiary }]}>Sin deudas registradas.</Text>
        )}

        {liabilities.map((l) =>
          editingLiabilityId === l.id ? (
            <LiabilityForm
              key={l.id}
              initial={l}
              onCancel={() => setEditingLiabilityId(null)}
              onSave={(patch) => {
                updateLiability(l.id, patch);
                setEditingLiabilityId(null);
              }}
              defaultCurrency={profile.primaryCurrency}
            />
          ) : (
            <GlassCard key={l.id} style={{ gap: spacing.xs }}>
              <View style={styles.listRow}>
                <Ionicons name="card-outline" size={18} color={colors.danger} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={[typography.headline, { color: colors.textPrimary }]}>{l.institution}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {LIABILITY_TYPE_LABELS[l.type]}
                    {l.interestRate ? ` · ${l.interestRate}% anual` : ''}
                    {l.dueDate ? ` · vence ${formatDateDMY(l.dueDate)}` : ''}
                  </Text>
                </View>
                <Text style={[typography.headline, { color: colors.danger, marginRight: spacing.sm }]}>
                  {formatCurrency(l.balance, l.currency)}
                </Text>
                <Pressable
                  accessibilityLabel={`Editar ${l.institution}`}
                  onPress={() => setEditingLiabilityId(l.id)}
                  style={{ marginRight: spacing.sm }}
                >
                  <Ionicons name="pencil-outline" size={18} color={colors.textTertiary} />
                </Pressable>
                <Pressable accessibilityLabel={`Eliminar ${l.institution}`} onPress={() => deleteLiability(l.id)}>
                  <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
                </Pressable>
              </View>
              {l.notes && (
                <Text style={[typography.caption, { color: colors.textTertiary, marginLeft: 30 }]}>{l.notes}</Text>
              )}
            </GlassCard>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, onAdd, colors, typography }: any) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[typography.headline, { color: colors.textPrimary }]}>{title}</Text>
      <Pressable onPress={onAdd} style={styles.addLink}>
        <Ionicons name="add-circle-outline" size={18} color={colors.accentFrom} />
        <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700', marginLeft: 4 }]}>Agregar</Text>
      </Pressable>
    </View>
  );
}

function AccountForm({
  onSave,
  onCancel,
  defaultCurrency,
  initial,
}: {
  onSave: (a: Draft<Account>) => void;
  onCancel: () => void;
  defaultCurrency: Currency;
  initial?: Account;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<AccountType>(initial?.type ?? 'bank');
  const [balance, setBalance] = useState(initial ? String(initial.balance) : '');
  const [adjustAmount, setAdjustAmount] = useState('');

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {ACCOUNT_TYPES.map((t) => (
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
      <TextInput
        value={balance}
        onChangeText={setBalance}
        keyboardType="decimal-pad"
        placeholder="Saldo actual"
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

function LiabilityForm({
  onSave,
  onCancel,
  defaultCurrency,
  initial,
}: {
  onSave: (l: Draft<Liability>) => void;
  onCancel: () => void;
  defaultCurrency: Currency;
  initial?: Liability;
}) {
  const { colors, spacing, radius } = useTheme();
  const [institution, setInstitution] = useState(initial?.institution ?? '');
  const [type, setType] = useState<LiabilityType>(initial?.type ?? 'credit_card');
  const [balance, setBalance] = useState(initial ? String(initial.balance) : '');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [adjustAmount, setAdjustAmount] = useState('');

  const canSave = institution.trim().length > 0 && balance.length > 0 && !Number.isNaN(parseFloat(balance));

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
        value={institution}
        onChangeText={setInstitution}
        placeholder="Institución (ej. BBVA)"
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {LIABILITY_TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setType(t)}
            style={[
              styles.typeChip,
              { borderRadius: radius.pill, borderColor: type === t ? colors.accentFrom : colors.surfaceBorder, backgroundColor: type === t ? colors.accentSoft : 'transparent' },
            ]}
          >
            <Text style={{ color: type === t ? colors.accentFrom : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
              {LIABILITY_TYPE_LABELS[t]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <TextInput
        value={balance}
        onChangeText={setBalance}
        keyboardType="decimal-pad"
        placeholder="Saldo pendiente"
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
      <DateField value={dueDate} onChange={setDueDate} placeholder="Fecha de pago" />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Nota o recordatorio (opcional)"
        placeholderTextColor={colors.textTertiary}
        multiline
        style={[styles.input, styles.notesInput, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
      />
      <View style={styles.formActions}>
        <Pressable onPress={onCancel} style={styles.formCancel}>
          <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
        </Pressable>
        <Pressable
          disabled={!canSave}
          onPress={() =>
            onSave({
              type,
              institution: institution.trim(),
              balance: parseFloat(balance),
              currency: defaultCurrency,
              dueDate: dueDate.trim() || undefined,
              notes: notes.trim() || undefined,
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
  rowGap: { flexDirection: 'row', gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between' },
  trendItem: { alignItems: 'flex-start' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  addLink: { flexDirection: 'row', alignItems: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center' },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  adjustRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  adjustBtn: { width: 40, height: 40, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, alignItems: 'center' },
  formCancel: { paddingVertical: 10, paddingHorizontal: 8 },
  formSave: { paddingVertical: 10, paddingHorizontal: 20 },
});

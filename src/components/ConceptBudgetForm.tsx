import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ACCOUNT_TYPE_ICONS } from '@/data/accountMeta';
import type { Account, Budget, BudgetFrequency, BudgetPeriodicity, Currency } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { computeMonthlyAmount, FREQUENCY_LABELS, PERIODICITY_LABELS } from '@/utils/budgetCalculator';
import { formatCurrency } from '@/utils/format';

import { GlassCard } from './GlassCard';

// Formulario compartido para definir el monto esperado de un concepto de
// presupuesto (gasto o ingreso) — usado por Presupuesto y por el
// cuestionario de presupuesto en el onboarding, para que lo que se anote
// en uno u otro lado sea exactamente el mismo dato (spec: "esos datos se
// queden como su presupuesto ya definido").
export function ConceptBudgetForm({
  concept,
  initial,
  currency,
  showDayOfMonth,
  accounts,
  showAccountTarget,
  showAccountExclude,
  onSave,
  onCancel,
}: {
  concept: { id: string; name: string };
  initial: Budget | undefined;
  currency: Currency;
  // Solo true para ingresos FIJOS (Salario, Mesada) — los variables como
  // Freelance no tienen fecha fija, así que no tiene caso pedirla (spec:
  // "las categorías de freelancer pues no tienen caso porque esos no
  // tienen fecha fija").
  showDayOfMonth?: boolean;
  // Cuentas del usuario — si no hay ninguna, ambas secciones de abajo se
  // omiten (no tiene caso elegir entre cero cuentas).
  accounts?: Account[];
  // Solo para conceptos de INGRESO: a qué cuenta entra ese dinero (spec:
  // "hacia dónde va a ir ese ingreso... un menú desplegable verticalmente
  // de las cuentas que tienes").
  showAccountTarget?: boolean;
  // Solo para conceptos de GASTO: cuentas que nunca se usan para este
  // gasto, opcional (spec: "excluir las tarjetas con las cuales nunca vas
  // a realizar ese gasto").
  showAccountExclude?: boolean;
  onSave: (input: {
    baseAmount: number;
    periodicity: BudgetPeriodicity;
    frequency?: BudgetFrequency;
    customDaysPerWeek?: number;
    incomeDayOfMonth?: number;
    targetAccountId?: string;
    excludedAccountIds?: string[];
  }) => void;
  onCancel: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [periodicity, setPeriodicity] = useState<BudgetPeriodicity>(initial?.periodicity ?? 'month');
  const [frequency, setFrequency] = useState<BudgetFrequency>(initial?.frequency ?? 'all_days');
  const [customDays, setCustomDays] = useState(initial?.customDaysPerWeek ?? 3);
  const [amountText, setAmountText] = useState(initial?.baseAmount ? String(initial.baseAmount) : '');
  const [dayOfMonthText, setDayOfMonthText] = useState(initial?.incomeDayOfMonth ? String(initial.incomeDayOfMonth) : '');
  const [targetAccountId, setTargetAccountId] = useState<string | undefined>(initial?.targetAccountId);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [excludedAccountIds, setExcludedAccountIds] = useState<string[]>(initial?.excludedAccountIds ?? []);

  const baseAmount = parseFloat(amountText.replace(',', '.')) || 0;
  const monthlyAmount = computeMonthlyAmount({ baseAmount, periodicity, frequency, customDaysPerWeek: customDays });
  const canSave = baseAmount > 0;
  const targetAccount = accounts?.find((a) => a.id === targetAccountId);

  const toggleExcluded = (accountId: string) => {
    setExcludedAccountIds((prev) => (prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]));
  };

  return (
    <GlassCard style={{ gap: spacing.md }}>
      <Text style={[typography.headline, { color: colors.textPrimary }]}>{concept.name}</Text>

      <View>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>Periodicidad</Text>
        <View style={styles.chipRow}>
          {(['day', 'week', 'month'] as BudgetPeriodicity[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriodicity(p)}
              style={[styles.chip, { borderRadius: radius.pill, borderColor: periodicity === p ? colors.accentFrom : colors.surfaceBorder, backgroundColor: periodicity === p ? colors.accentSoft : 'transparent' }]}
            >
              <Text style={{ color: periodicity === p ? colors.accentFrom : colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                {PERIODICITY_LABELS[p]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {periodicity === 'day' && (
        <View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>Frecuencia</Text>
          <View style={styles.chipWrap}>
            {(['all_days', 'weekdays', 'weekends', 'custom', 'one_time'] as BudgetFrequency[]).map((f) => (
              <Pressable
                key={f}
                onPress={() => setFrequency(f)}
                style={[styles.chip, { borderRadius: radius.pill, borderColor: frequency === f ? colors.accentFrom : colors.surfaceBorder, backgroundColor: frequency === f ? colors.accentSoft : 'transparent' }]}
              >
                <Text style={{ color: frequency === f ? colors.accentFrom : colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                  {FREQUENCY_LABELS[f]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {periodicity === 'day' && frequency === 'custom' && (
        <View style={styles.rowCenter}>
          <Text style={[typography.caption, { color: colors.textSecondary, marginRight: spacing.sm }]}>Días por semana:</Text>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Pressable
              key={n}
              onPress={() => setCustomDays(n)}
              style={[styles.dayPill, { borderRadius: radius.pill, borderColor: customDays === n ? colors.accentFrom : colors.surfaceBorder, backgroundColor: customDays === n ? colors.accentSoft : 'transparent' }]}
            >
              <Text style={{ color: customDays === n ? colors.accentFrom : colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{n}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <TextInput
        value={amountText}
        onChangeText={setAmountText}
        keyboardType="decimal-pad"
        placeholder={periodicity === 'day' && frequency === 'one_time' ? 'Monto del evento' : `Monto por ${PERIODICITY_LABELS[periodicity].toLowerCase()}`}
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
      />

      {baseAmount > 0 && (
        <View style={{ backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.accentFrom }]}>
            Equivale a {formatCurrency(monthlyAmount, currency)} al mes
          </Text>
        </View>
      )}

      {showDayOfMonth && (
        <View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>
            ¿Qué día del mes te llega? (opcional)
          </Text>
          <TextInput
            value={dayOfMonthText}
            onChangeText={(v) => setDayOfMonthText(v.replace(/[^0-9]/g, '').slice(0, 2))}
            keyboardType="number-pad"
            placeholder="Ej. 3"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md, maxWidth: 100 }]}
          />
          {!!dayOfMonthText && (
            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 6 }]}>
              Te lo recordaremos como el día {dayOfMonthText} de cada mes.
            </Text>
          )}
        </View>
      )}

      {showAccountTarget && !!accounts?.length && (
        <View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>¿A qué cuenta entra? (opcional)</Text>
          <Pressable
            accessibilityLabel="Elegir cuenta destino"
            onPress={() => setAccountDropdownOpen((v) => !v)}
            style={[styles.dropdownHeader, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
          >
            <Text style={[typography.body, { color: targetAccount ? colors.textPrimary : colors.textTertiary, flex: 1 }]}>
              {targetAccount ? targetAccount.name : 'Elegir cuenta'}
            </Text>
            <Ionicons name={accountDropdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
          </Pressable>
          {accountDropdownOpen && (
            <View style={[styles.dropdownList, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}>
              {accounts.map((a) => (
                <Pressable
                  key={a.id}
                  accessibilityLabel={`Cuenta destino ${a.name}`}
                  onPress={() => {
                    setTargetAccountId(a.id);
                    setAccountDropdownOpen(false);
                  }}
                  style={styles.dropdownRow}
                >
                  <View style={[styles.accountDot, { backgroundColor: a.color ?? colors.accentFrom }]} />
                  <Ionicons name={ACCOUNT_TYPE_ICONS[a.type] as any} size={14} color={colors.textSecondary} />
                  <Text style={[typography.body, { color: colors.textPrimary, marginLeft: 8, flex: 1 }]}>{a.name}</Text>
                  {targetAccountId === a.id && <Ionicons name="checkmark" size={16} color={colors.accentFrom} />}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {showAccountExclude && !!accounts?.length && (
        <View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>
            Excluir cuentas para este gasto (opcional)
          </Text>
          <View style={[styles.dropdownList, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}>
            {accounts.map((a) => {
              const excluded = excludedAccountIds.includes(a.id);
              return (
                <Pressable
                  key={a.id}
                  accessibilityLabel={`Excluir cuenta ${a.name}`}
                  onPress={() => toggleExcluded(a.id)}
                  style={styles.dropdownRow}
                >
                  <View style={[styles.accountDot, { backgroundColor: a.color ?? colors.accentFrom }]} />
                  <Text style={[typography.body, { color: colors.textPrimary, marginLeft: 8, flex: 1 }]}>{a.name}</Text>
                  <View
                    style={[
                      styles.checkbox,
                      { borderRadius: radius.sm, borderColor: colors.accentFrom, backgroundColor: excluded ? colors.accentFrom : 'transparent' },
                    ]}
                  >
                    {excluded && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.rowEnd}>
        <Pressable onPress={onCancel}>
          <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
        </Pressable>
        <Pressable
          disabled={!canSave}
          onPress={() => {
            const dayNum = parseInt(dayOfMonthText, 10);
            const incomeDayOfMonth = showDayOfMonth && dayNum >= 1 && dayNum <= 31 ? dayNum : undefined;
            onSave({
              baseAmount,
              periodicity,
              frequency: periodicity === 'day' ? frequency : undefined,
              customDaysPerWeek: customDays,
              incomeDayOfMonth,
              targetAccountId: showAccountTarget ? targetAccountId : undefined,
              excludedAccountIds: showAccountExclude && excludedAccountIds.length > 0 ? excludedAccountIds : undefined,
            });
          }}
          style={[styles.saveBtn, { borderRadius: radius.pill, backgroundColor: canSave ? colors.accentFrom : colors.surfaceBorder }]}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Guardar</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowEnd: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' },
  chipRow: { flexDirection: 'row', gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  dayPill: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 6 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10 },
  dropdownHeader: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  dropdownList: { borderWidth: 1, overflow: 'hidden' },
  dropdownRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  accountDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  checkbox: { width: 18, height: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});

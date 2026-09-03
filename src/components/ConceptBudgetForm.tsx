import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ACCOUNT_TYPE_ICONS } from '@/data/accountMeta';
import type { Account, BudgetFrequency, BudgetPeriodicity, Currency } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import { computeMonthlyAmount, FREQUENCY_LABELS, PERIODICITY_LABELS } from '@/utils/budgetCalculator';
import { daysInMonth, formatDateDMY, todayISO } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

import { CalendarPicker } from './CalendarPicker';
import { GlassCard } from './GlassCard';

export const WEEKDAY_FULL_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Con qué valores se reabre el formulario. Se define por forma (no como
// `Budget`) porque el mismo formulario edita tanto los presupuestos del
// esquema anterior como los renglones de una plantilla con nombre.
export interface BudgetFormInitial {
  periodicity?: BudgetPeriodicity;
  frequency?: BudgetFrequency;
  customDaysPerWeek?: number;
  baseAmount?: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  oneTimeDate?: string;
  targetAccountId?: string;
  includedAccountIds?: string[];
}

// Formulario compartido para definir el monto esperado de un concepto de
// presupuesto (gasto o ingreso) — usado por Presupuesto y por el
// cuestionario de presupuesto en el onboarding, para que lo que se anote
// en uno u otro lado sea exactamente el mismo dato (spec: "esos datos se
// queden como su presupuesto ya definido").
export function ConceptBudgetForm({
  concept,
  initial,
  currency,
  allowDateQuestion = true,
  accounts,
  showAccountTarget,
  showAccountInclude,
  onSave,
  onCancel,
}: {
  concept: { id: string; name: string };
  initial: BudgetFormInitial | undefined;
  currency: Currency;
  // Solo false para ingresos VARIABLES/eventuales (Freelance, Ventas...) —
  // esos no tienen una fecha predecible, así que no tiene caso preguntarla
  // (spec: "las categorías de freelancer pues no tienen caso porque esos
  // no tienen fecha fija"). Para todo lo demás (gastos e ingresos fijos)
  // la pregunta de fecha se decide sola según la periodicidad elegida.
  allowDateQuestion?: boolean;
  // Cuentas del usuario — si no hay ninguna, ambas secciones de abajo se
  // omiten (no tiene caso elegir entre cero cuentas).
  accounts?: Account[];
  // Solo para conceptos de INGRESO: a qué cuenta entra ese dinero (spec:
  // "hacia dónde va a ir ese ingreso... un menú desplegable verticalmente
  // de las cuentas que tienes").
  showAccountTarget?: boolean;
  // Solo para conceptos de GASTO: cuentas con las que normalmente se paga
  // esta categoría/subcategoría (spec: "seleccionar las cuentas con las
  // que normalmente pagas eso").
  showAccountInclude?: boolean;
  onSave: (input: {
    baseAmount: number;
    periodicity: BudgetPeriodicity;
    frequency?: BudgetFrequency;
    customDaysPerWeek?: number;
    dayOfWeek?: number;
    dayOfMonth?: number;
    oneTimeDate?: string;
    targetAccountId?: string;
    includedAccountIds?: string[];
  }) => void;
  onCancel: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [periodicity, setPeriodicity] = useState<BudgetPeriodicity>(initial?.periodicity ?? 'month');
  const [frequency, setFrequency] = useState<BudgetFrequency>(initial?.frequency ?? 'all_days');
  const [customDays, setCustomDays] = useState(initial?.customDaysPerWeek ?? 3);
  const [amountText, setAmountText] = useState(initial?.baseAmount ? String(initial.baseAmount) : '');
  const [dayOfWeek, setDayOfWeek] = useState<number | undefined>(initial?.dayOfWeek);
  const [dayOfWeekOpen, setDayOfWeekOpen] = useState(false);
  const [dayOfMonth, setDayOfMonth] = useState<number | undefined>(initial?.dayOfMonth);
  const [dayOfMonthOpen, setDayOfMonthOpen] = useState(false);
  const [oneTimeDate, setOneTimeDate] = useState<string | undefined>(initial?.oneTimeDate);
  const [oneTimeMonthIso, setOneTimeMonthIso] = useState(initial?.oneTimeDate ?? todayISO());
  const [oneTimeCalendarOpen, setOneTimeCalendarOpen] = useState(false);
  const [targetAccountId, setTargetAccountId] = useState<string | undefined>(initial?.targetAccountId);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [includedAccountIds, setIncludedAccountIds] = useState<string[]>(initial?.includedAccountIds ?? []);

  const baseAmount = parseFloat(amountText.replace(',', '.')) || 0;
  const monthlyAmount = computeMonthlyAmount({ baseAmount, periodicity, frequency, customDaysPerWeek: customDays });
  const canSave = baseAmount > 0;
  const targetAccount = accounts?.find((a) => a.id === targetAccountId);

  const toggleIncluded = (accountId: string) => {
    setIncludedAccountIds((prev) => (prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]));
  };

  // La pregunta de "¿cuándo?" cambia según la periodicidad — nunca un día
  // de mes libre hasta 99 (spec: "eso no existe"), ni "día del mes" para
  // algo que en realidad se cobra cada semana o cada día.
  const showsDayOfWeek = allowDateQuestion && periodicity === 'week';
  const showsDayOfMonth = allowDateQuestion && periodicity === 'month';
  const showsOneTimeDate = allowDateQuestion && periodicity === 'day' && frequency === 'one_time';
  const maxDayThisMonth = daysInMonth(new Date());

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

      {showsDayOfWeek && (
        <View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>
            ¿Qué día de la semana {showAccountTarget ? 'te llega' : 'se cobra'}? (opcional)
          </Text>
          <Pressable
            accessibilityLabel="Elegir día de la semana"
            onPress={() => setDayOfWeekOpen((v) => !v)}
            style={[styles.dropdownHeader, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
          >
            <Text style={[typography.body, { color: dayOfWeek !== undefined ? colors.textPrimary : colors.textTertiary, flex: 1 }]}>
              {dayOfWeek !== undefined ? WEEKDAY_FULL_LABELS[dayOfWeek] : 'Elegir día'}
            </Text>
            <Ionicons name={dayOfWeekOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
          </Pressable>
          {dayOfWeekOpen && (
            <View style={[styles.dropdownList, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}>
              {WEEKDAY_FULL_LABELS.map((label, value) => (
                <Pressable
                  key={value}
                  accessibilityLabel={`Día ${label}`}
                  onPress={() => {
                    setDayOfWeek(value);
                    setDayOfWeekOpen(false);
                  }}
                  style={styles.dropdownRow}
                >
                  <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{label}</Text>
                  {dayOfWeek === value && <Ionicons name="checkmark" size={16} color={colors.accentFrom} />}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {showsDayOfMonth && (
        <View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>
            ¿Qué día del mes {showAccountTarget ? 'te llega' : 'se cobra'}? (opcional)
          </Text>
          <Pressable
            accessibilityLabel="Elegir día del mes"
            onPress={() => setDayOfMonthOpen((v) => !v)}
            style={[styles.dropdownHeader, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
          >
            <Text style={[typography.body, { color: dayOfMonth ? colors.textPrimary : colors.textTertiary, flex: 1 }]}>
              {dayOfMonth ? `Día ${dayOfMonth}` : 'Elegir día'}
            </Text>
            <Ionicons name={dayOfMonthOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
          </Pressable>
          {dayOfMonthOpen && (
            <ScrollView style={[styles.dropdownList, styles.dropdownScroll, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]} nestedScrollEnabled>
              {Array.from({ length: maxDayThisMonth }, (_, i) => i + 1).map((day) => (
                <Pressable
                  key={day}
                  accessibilityLabel={`Día ${day}`}
                  onPress={() => {
                    setDayOfMonth(day);
                    setDayOfMonthOpen(false);
                  }}
                  style={styles.dropdownRow}
                >
                  <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>Día {day}</Text>
                  {dayOfMonth === day && <Ionicons name="checkmark" size={16} color={colors.accentFrom} />}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {showsOneTimeDate && (
        <View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>¿Qué día ocurrirá?</Text>
          <Pressable
            accessibilityLabel="Elegir fecha exacta"
            onPress={() => setOneTimeCalendarOpen((v) => !v)}
            style={[styles.dropdownHeader, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
          >
            <Text style={[typography.body, { color: oneTimeDate ? colors.textPrimary : colors.textTertiary, flex: 1 }]}>
              {oneTimeDate ? formatDateDMY(oneTimeDate) : 'Elegir fecha'}
            </Text>
            <Ionicons name={oneTimeCalendarOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
          </Pressable>
          {oneTimeCalendarOpen && (
            <View style={[styles.calendarWrap, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}>
              <CalendarPicker
                monthIso={oneTimeMonthIso}
                selectedIso={oneTimeDate}
                onSelectDay={(iso) => {
                  setOneTimeDate(iso);
                  setOneTimeCalendarOpen(false);
                }}
                onChangeMonth={setOneTimeMonthIso}
              />
            </View>
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

      {showAccountInclude && !!accounts?.length && (
        <View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>
            Cuentas con las que normalmente pagas {concept.name} (opcional)
          </Text>
          <View style={[styles.dropdownList, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}>
            {accounts.map((a) => {
              const included = includedAccountIds.includes(a.id);
              return (
                <Pressable
                  key={a.id}
                  accessibilityLabel={`Pagas ${concept.name} con ${a.name}`}
                  onPress={() => toggleIncluded(a.id)}
                  style={styles.dropdownRow}
                >
                  <View style={[styles.accountDot, { backgroundColor: a.color ?? colors.accentFrom }]} />
                  <Ionicons name={ACCOUNT_TYPE_ICONS[a.type] as any} size={14} color={colors.textSecondary} />
                  <Text style={[typography.body, { color: colors.textPrimary, marginLeft: 8, flex: 1 }]}>{a.name}</Text>
                  <View
                    style={[
                      styles.checkbox,
                      { borderRadius: radius.sm, borderColor: colors.accentFrom, backgroundColor: included ? colors.accentFrom : 'transparent' },
                    ]}
                  >
                    {included && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
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
            onSave({
              baseAmount,
              periodicity,
              frequency: periodicity === 'day' ? frequency : undefined,
              customDaysPerWeek: customDays,
              dayOfWeek: showsDayOfWeek ? dayOfWeek : undefined,
              dayOfMonth: showsDayOfMonth ? dayOfMonth : undefined,
              oneTimeDate: showsOneTimeDate ? oneTimeDate : undefined,
              targetAccountId: showAccountTarget ? targetAccountId : undefined,
              includedAccountIds: showAccountInclude && includedAccountIds.length > 0 ? includedAccountIds : undefined,
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
  dropdownScroll: { maxHeight: 220 },
  dropdownRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  accountDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  checkbox: { width: 18, height: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  calendarWrap: { borderWidth: 1, padding: 12, marginTop: 6 },
});

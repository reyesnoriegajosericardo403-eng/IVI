import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { GlassCard } from '@/components/GlassCard';
import type { Account } from '@/data/types';
import { selectActiveAccounts } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import {
  cardDue,
  cardHeadline,
  cardSettingsOf,
  cardStatement,
  DEFAULT_CARD_ALERTS,
  validateCardSettings,
  type CardAlertPrefs,
} from '@/utils/creditCard';
import { todayIsoLocal } from '@/utils/forecast';
import { formatCurrency } from '@/utils/format';
import { shortDateEs } from '@/utils/recurrence';

import { ChipRow, SmallButton } from './Chips';

const TIMES = ['07:00', '08:00', '09:00', '12:00', '18:00', '20:00'];

// Una tarjeta de crédito: fechas de corte y de pago, cuánto falta pagar para no generar intereses, pagar, y avisos.
export function CardPanel({ card }: { card: Account }) {
  const { colors, typography, spacing, radius } = useTheme();
  const rawTx = useAppStore((s) => s.transactions);
  const rawAccounts = useAppStore((s) => s.accounts);
  const rawOcc = useAppStore((s) => s.reminderOccurrences);
  const setCardSettings = useAppStore((s) => s.setCardSettings);
  const clearCardSettings = useAppStore((s) => s.clearCardSettings);
  const payCard = useAppStore((s) => s.payCard);
  const confirmOccurrence = useAppStore((s) => s.confirmOccurrence);
  const settings = cardSettingsOf(card);
  const today = todayIsoLocal();
  const due = useMemo(() => cardDue(card, rawTx, today), [card, rawTx, today]);
  const statement = useMemo(() => (settings && due ? cardStatement(card, rawTx, due.cycle.lastCutoff, settings.cutoffDay) : null), [card, rawTx, settings, due]);
  const payFrom = useMemo(() => selectActiveAccounts(rawAccounts).filter((a) => !a.isLiability && a.type !== 'credit_card' && a.currency === card.currency), [rawAccounts, card.currency]);

  const [mode, setMode] = useState<'idle' | 'edit' | 'alerts' | 'pay'>(settings ? 'idle' : 'edit');
  const [cutText, setCutText] = useState(settings ? String(settings.cutoffDay) : '');
  const [dueText, setDueText] = useState(settings ? String(settings.dueDay) : '');
  const [limitText, setLimitText] = useState(settings?.creditLimit ? String(settings.creditLimit) : '');
  const [minText, setMinText] = useState(settings?.minPayment !== undefined ? String(settings.minPayment) : '');
  const [alerts, setAlerts] = useState<CardAlertPrefs>({ ...DEFAULT_CARD_ALERTS, ...(settings?.alerts ?? {}) });
  const [amountText, setAmountText] = useState('');
  const [fromId, setFromId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const num = (t: string): number | undefined => {
    const v = parseFloat(t.replace(',', '.'));
    return Number.isFinite(v) ? v : undefined;
  };

  const save = (nextAlerts?: CardAlertPrefs) => {
    const s = {
      cutoffDay: parseInt(cutText, 10),
      dueDay: parseInt(dueText, 10),
      creditLimit: limitText.trim() ? num(limitText) : undefined,
      minPayment: minText.trim() ? num(minText) : undefined,
      alerts: nextAlerts ?? settings?.alerts,
    };
    const err = validateCardSettings(s as never);
    if (err) return setError(err);
    const res = setCardSettings(card.id, s as never);
    if (!res.ok) return setError(res.error ?? 'No se pudo guardar.');
    setError(null);
    setNote('Listo: te avisaré del corte y del pago.');
    setMode('idle');
  };

  const field = { color: colors.textPrimary, borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 } as const;
  const label = [typography.caption, { color: colors.textSecondary }];
  const toneColor = !due ? colors.textTertiary : due.status === 'overdue' ? colors.danger : due.status === 'paid' || due.status === 'nothing_to_pay' ? colors.success : due.daysToDue <= 3 ? colors.warning : colors.textPrimary;

  const openPay = () => {
    setAmountText(due && due.remaining > 0 ? String(due.remaining) : card.balance > 0 ? String(card.balance) : '');
    setFromId(payFrom[0]?.id);
    setError(null);
    setNote(null);
    setMode('pay');
  };

  const submitPay = () => {
    if (!fromId) return setError('Elige de qué cuenta pagas.');
    const v = num(amountText);
    if (v === undefined) return setError('Escribe un monto.');
    const res = payCard(card.id, { amount: v, fromAccountId: fromId });
    if (!res.ok) return setError(res.error ?? 'No se pudo.');
    setError(null);
    setNote('Pago registrado.');
    setMode('idle');
  };

  const paidOutside = () => {
    if (!due) return;
    const o = rawOcc.find((x) => !x.deletedAt && x.sourceType === 'account' && x.sourceId === card.id && x.offsetDays === 0 && x.eventDate === due.cycle.lastDue && ['pending', 'sent'].includes(x.status));
    if (!o) return setNote('No hay un aviso abierto de este pago.');
    const res = confirmOccurrence(o.id);
    setNote(res.ok ? 'Anotado: ya no te insisto con este pago.' : res.error ?? 'No se pudo.');
  };

  return (
    <GlassCard style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Ionicons name="card-outline" size={22} color={colors.accentFrom} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>{card.name}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Debes {formatCurrency(Math.max(0, card.balance), card.currency)}
            {due?.utilization !== undefined ? ` · usas ${Math.round(due.utilization * 100)}% de tu límite` : ''}
          </Text>
        </View>
      </View>

      {settings && due && mode !== 'edit' && (
        <>
          <View style={{ gap: 4 }}>
            <Text style={[typography.headline, { color: toneColor }]}>{cardHeadline(due)}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Fecha límite: {shortDateEs(due.dueDate)} · Próximo corte: {shortDateEs(due.cycle.nextCutoff)} (en {due.cycle.daysToNextCutoff} {due.cycle.daysToNextCutoff === 1 ? 'día' : 'días'})
            </Text>
          </View>
          {due.status !== 'nothing_to_pay' && (
            <View style={{ gap: 2 }}>
              <Text style={[typography.body, { color: colors.textPrimary }]}>
                Para no generar intereses: <Text style={{ fontWeight: '700' }}>{formatCurrency(due.remaining, card.currency)}</Text>
              </Text>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>
                Saldo al corte del {shortDateEs(due.cycle.lastCutoff)}: {formatCurrency(due.statementBalance, card.currency)}
                {due.paidSinceCutoff > 0 ? ` · ya pagaste ${formatCurrency(due.paidSinceCutoff, card.currency)}` : ''}
                {due.minPayment !== undefined ? ` · pago mínimo (tu estado de cuenta): ${formatCurrency(due.minPayment, card.currency)}` : ''}
              </Text>
            </View>
          )}
          {statement && statement.charges + statement.credits > 0 && (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              Estado del {shortDateEs(statement.cutoff)} (desde el {shortDateEs(statement.periodStart)}): compras {formatCurrency(statement.charges, card.currency)} · pagos y abonos {formatCurrency(statement.credits, card.currency)}. Se calcula con lo que has registrado en VALU: compáralo con tu estado de cuenta.
            </Text>
          )}
        </>
      )}

      {mode === 'edit' && (
        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Escribe los días que dice tu estado de cuenta. Con eso VALU te avisa del corte y del pago.</Text>
          <Text style={label}>DÍA DE CORTE (1 A 31)</Text>
          <TextInput value={cutText} onChangeText={setCutText} keyboardType="number-pad" placeholder="ej. 5" placeholderTextColor={colors.textTertiary} style={field} />
          <Text style={label}>DÍA LÍMITE DE PAGO (1 A 31)</Text>
          <TextInput value={dueText} onChangeText={setDueText} keyboardType="number-pad" placeholder="ej. 25" placeholderTextColor={colors.textTertiary} style={field} />
          <Text style={label}>LÍMITE DE CRÉDITO (OPCIONAL)</Text>
          <TextInput value={limitText} onChangeText={setLimitText} keyboardType="decimal-pad" placeholder="ej. 30000" placeholderTextColor={colors.textTertiary} style={field} />
          <Text style={label}>PAGO MÍNIMO DE TU ESTADO DE CUENTA (OPCIONAL)</Text>
          <TextInput value={minText} onChangeText={setMinText} keyboardType="decimal-pad" placeholder="ej. 600" placeholderTextColor={colors.textTertiary} style={field} />
          <Text style={[typography.micro, { color: colors.textTertiary }]}>Si tu día es 30 o 31 y el mes es más corto, se usa el último día del mes.</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <SmallButton label="Guardar" tone="primary" onPress={() => save()} />
            {settings && <SmallButton label="Cancelar" onPress={() => { setMode('idle'); setError(null); }} />}
            {settings && <SmallButton label="Quitar fechas" tone="danger" onPress={() => { clearCardSettings(card.id); setCutText(''); setDueText(''); setNote('Quité las fechas y los avisos de esta tarjeta.'); }} />}
          </View>
        </View>
      )}

      {mode === 'alerts' && settings && (
        <View style={{ gap: spacing.sm }}>
          <Text style={label}>AVISARME</Text>
          <ChipRow options={[{ id: 'push', label: 'En el teléfono (notificación)' }, { id: 'app', label: 'Solo dentro de la app' }]} value={alerts.push ? 'push' : 'app'} onChange={(v) => setAlerts({ ...alerts, push: v === 'push' })} />
          <Text style={label}>HORA</Text>
          <ChipRow options={TIMES.map((x) => ({ id: x, label: x }))} value={alerts.timeOfDay} onChange={(timeOfDay) => setAlerts({ ...alerts, timeOfDay })} />
          <Text style={label}>ANTES DEL CORTE</Text>
          <ChipRow multi options={[1, 2, 3].map((d) => ({ id: d, label: d === 1 ? '1 día antes' : `${d} días antes` }))} value={alerts.cutoffAdvance} onChange={(d) => setAlerts({ ...alerts, cutoffAdvance: alerts.cutoffAdvance.includes(d) ? alerts.cutoffAdvance.filter((x) => x !== d) : [...alerts.cutoffAdvance, d].sort((a, b) => b - a) })} />
          <Text style={label}>ANTES DE LA FECHA LÍMITE DE PAGO</Text>
          <ChipRow multi options={[7, 5, 3, 2, 1].map((d) => ({ id: d, label: d === 1 ? '1 día antes' : `${d} días antes` }))} value={alerts.dueAdvance} onChange={(d) => setAlerts({ ...alerts, dueAdvance: alerts.dueAdvance.includes(d) ? alerts.dueAdvance.filter((x) => x !== d) : [...alerts.dueAdvance, d].sort((a, b) => b - a) })} />
          <Text style={label}>EL DÍA LÍMITE, SI NO CONFIRMAS QUE PAGASTE, INSISTIR</Text>
          <ChipRow options={[{ id: 1, label: 'Una vez' }, { id: 2, label: 'Hasta 2 veces' }, { id: 3, label: 'Hasta 3 veces' }]} value={alerts.dueAttempts} onChange={(n) => setAlerts({ ...alerts, dueAttempts: n as 1 | 2 | 3 })} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SmallButton label="Guardar avisos" tone="primary" onPress={() => save(alerts)} />
            <SmallButton label="Cancelar" onPress={() => { setMode('idle'); setError(null); }} />
          </View>
        </View>
      )}

      {mode === 'pay' && (
        <View style={{ gap: spacing.sm }}>
          <Text style={label}>MONTO</Text>
          <TextInput value={amountText} onChangeText={setAmountText} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textTertiary} style={field} />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {due && due.remaining > 0 && <SmallButton label={`Para no generar intereses (${formatCurrency(due.remaining, card.currency)})`} onPress={() => setAmountText(String(due.remaining))} />}
            {due?.minPayment !== undefined && due.minPayment > 0 && <SmallButton label={`Mínimo (${formatCurrency(due.minPayment, card.currency)})`} onPress={() => setAmountText(String(due.minPayment))} />}
            <SmallButton label={`Todo (${formatCurrency(Math.max(0, card.balance), card.currency)})`} onPress={() => setAmountText(String(Math.max(0, card.balance)))} />
          </View>
          <Text style={label}>¿DE QUÉ CUENTA PAGAS?</Text>
          {payFrom.length === 0 ? <Text style={[typography.caption, { color: colors.textTertiary }]}>Necesitas una cuenta de banco, efectivo o ahorro en la misma moneda.</Text> : <ChipRow options={payFrom.map((a) => ({ id: a.id, label: a.name }))} value={fromId ?? null} onChange={setFromId} />}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SmallButton label="Registrar pago" tone="primary" onPress={submitPay} />
            <SmallButton label="Cancelar" onPress={() => { setMode('idle'); setError(null); }} />
          </View>
        </View>
      )}

      {mode === 'idle' && (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {settings && card.balance > 0 && <SmallButton label="Pagar tarjeta" tone="primary" onPress={openPay} />}
          {settings && due && (due.status === 'pending' || due.status === 'overdue') && <SmallButton label="Ya pagué (por fuera de VALU)" onPress={paidOutside} />}
          <SmallButton label={settings ? 'Editar fechas' : 'Poner fechas'} onPress={() => { setMode('edit'); setError(null); setNote(null); }} />
          {settings && <SmallButton label="Avisos" onPress={() => { setMode('alerts'); setError(null); setNote(null); }} />}
        </View>
      )}

      {error && <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>}
      {note && !error && <Text style={[typography.caption, { color: colors.success }]}>{note}</Text>}
    </GlassCard>
  );
}

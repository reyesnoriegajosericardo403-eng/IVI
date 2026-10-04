import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { GlassCard } from '@/components/GlassCard';
import { LIABILITY_TYPE_LABELS } from '@/data/accountMeta';
import type { Liability } from '@/data/types';
import { selectActiveAccounts } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { directionOf, installmentProgress, isSettled } from '@/utils/debts';
import { formatDateDMY } from '@/utils/date';
import { todayIsoLocal } from '@/utils/forecast';
import { formatCurrency } from '@/utils/format';
import { shortDateEs } from '@/utils/recurrence';

import { ChipRow, SmallButton } from './Chips';

// Una deuda (lo que debes) o un cobro pendiente (lo que te deben), con pagar / saldar / editar / borrar y su plan de cuotas.
export function DebtCard({ l, onEdit }: { l: Liability; onEdit: () => void }) {
  const { colors, typography, spacing } = useTheme();
  const rawAccounts = useAppStore((s) => s.accounts);
  const payLiability = useAppStore((s) => s.payLiability);
  const settleLiability = useAppStore((s) => s.settleLiability);
  const reopenLiability = useAppStore((s) => s.reopenLiability);
  const deleteLiability = useAppStore((s) => s.deleteLiability);
  const [mode, setMode] = useState<'idle' | 'pay' | 'reopen' | 'delete'>('idle');
  const [amountText, setAmountText] = useState('');
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const today = todayIsoLocal();
  const owe = directionOf(l) === 'owe';
  const settled = isSettled(l);
  const plan = installmentProgress(l, today);
  const accounts = selectActiveAccounts(rawAccounts).filter((a) => !a.isLiability && a.currency === l.currency);
  const tone = settled ? colors.textTertiary : owe ? colors.danger : colors.success;

  const openPay = () => {
    setAmountText(String(plan?.nextAmount || l.minPayment || ''));
    setAccountId(accounts[0]?.id);
    setError(null);
    setMode('pay');
  };

  const submitPay = () => {
    const v = parseFloat(amountText.replace(',', '.'));
    const res = payLiability(l.id, { amount: v, accountId });
    if (!res.ok) return setError(res.error ?? 'No se pudo.');
    setError(null);
    setMode('idle');
  };

  return (
    <GlassCard style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name={settled ? 'checkmark-circle-outline' : owe ? 'card-outline' : 'people-outline'} size={18} color={tone} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>{l.institution}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {owe ? LIABILITY_TYPE_LABELS[l.type] : 'Te debe'}
            {l.counterparty && l.counterparty !== l.institution ? ` · ${l.counterparty}` : ''}
            {l.interestRate ? ` · ${l.interestRate}% anual` : ''}
            {!settled && l.dueDate ? ` · ${owe ? 'vence' : 'esperas cobrar'} ${formatDateDMY(l.dueDate)}` : ''}
            {settled && l.settledAt ? ` · saldada ${formatDateDMY(l.settledAt)}` : ''}
          </Text>
        </View>
        <Text style={[typography.headline, { color: tone }]}>{settled ? 'Saldada' : formatCurrency(l.balance, l.currency)}</Text>
      </View>

      {plan && (
        <Text style={[typography.caption, { color: plan.overdue ? colors.warning : colors.textSecondary }]}>
          Cuotas: {plan.paid} de {plan.total} pagadas
          {plan.nextDate ? ` · próxima ${shortDateEs(plan.nextDate)} (${formatCurrency(plan.nextAmount, l.currency)})${plan.overdue ? ' — ya pasó' : ''}` : ' · ¡terminaste!'}
        </Text>
      )}
      {l.notes && <Text style={[typography.caption, { color: colors.textTertiary }]}>{l.notes}</Text>}

      {mode === 'pay' && (
        <View style={{ gap: spacing.sm }}>
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder={owe ? 'Monto que pagas' : 'Monto que te pagaron'}
            placeholderTextColor={colors.textTertiary}
            style={{ color: colors.textPrimary, borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: 12, backgroundColor: colors.surfaceSolid, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 }}
          />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{owe ? 'SALE DE LA CUENTA' : 'ENTRA A LA CUENTA'}</Text>
          <ChipRow
            options={[{ id: 'none', label: 'Solo ajustar la deuda' }, ...accounts.map((a) => ({ id: a.id, label: a.name }))]}
            value={accountId ?? 'none'}
            onChange={(id) => setAccountId(id === 'none' ? undefined : (id as string))}
          />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <SmallButton label={owe ? 'Registrar pago' : 'Registrar cobro'} tone="primary" onPress={submitPay} />
            <SmallButton label="Pagar todo" onPress={() => setAmountText(String(l.balance))} />
            <SmallButton label="Cancelar" onPress={() => setMode('idle')} />
          </View>
        </View>
      )}

      {mode === 'reopen' && (
        <View style={{ gap: spacing.sm }}>
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder="¿Cuánto quedó pendiente?"
            placeholderTextColor={colors.textTertiary}
            style={{ color: colors.textPrimary, borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: 12, backgroundColor: colors.surfaceSolid, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 }}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SmallButton
              label="Reabrir"
              tone="primary"
              onPress={() => {
                const res = reopenLiability(l.id, parseFloat(amountText.replace(',', '.')));
                if (!res.ok) return setError(res.error ?? 'No se pudo.');
                setError(null);
                setMode('idle');
              }}
            />
            <SmallButton label="Cancelar" onPress={() => setMode('idle')} />
          </View>
        </View>
      )}

      {mode === 'delete' && (
        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.danger }]}>Se elimina el registro de esta deuda. Los pagos que ya hiciste se quedan en tus movimientos.</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SmallButton
              label="Sí, eliminar"
              tone="danger"
              onPress={() => {
                deleteLiability(l.id);
                setMode('idle');
              }}
            />
            <SmallButton label="Cancelar" onPress={() => setMode('idle')} />
          </View>
        </View>
      )}

      {mode === 'idle' && (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {!settled && <SmallButton label={owe ? 'Pagar' : 'Cobrar'} tone="primary" onPress={openPay} />}
          {!settled && <SmallButton label="Saldar" onPress={() => { const r = settleLiability(l.id); setError(r.ok ? null : r.error ?? 'No se pudo.'); }} />}
          {settled && (
            <SmallButton
              label="Reabrir"
              onPress={() => {
                setAmountText('');
                setError(null);
                setMode('reopen');
              }}
            />
          )}
          <SmallButton label="Editar" onPress={onEdit} />
          <SmallButton label="Eliminar" tone="danger" onPress={() => setMode('delete')} />
        </View>
      )}
      {error && <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>}
    </GlassCard>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { GlassCard } from '@/components/GlassCard';
import { selectActiveAccounts, selectActiveOccurrences, selectForecastTransactions } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { cardDue, isCreditCard } from '@/utils/creditCard';
import { overdueForecasts, todayIsoLocal, upcomingForecasts } from '@/utils/forecast';
import { formatCurrency } from '@/utils/format';
import { dueOccurrences, upcomingOccurrences } from '@/utils/materialize';
import { relativeDayEs } from '@/utils/p3Labels';

// Tarjeta del Dashboard: lo que pide tu atención (avisos y pagos que ya tocaban) y lo que viene esta semana.
// No aparece si no hay nada: la pantalla de inicio no se llena de cosas vacías.
export function AttentionWidget() {
  const { colors, typography, spacing } = useTheme();
  const rawOcc = useAppStore((s) => s.reminderOccurrences);
  const rawTx = useAppStore((s) => s.transactions);
  const rawAccounts = useAppStore((s) => s.accounts);
  const today = todayIsoLocal();
  const nowIso = new Date().toISOString();

  const info = useMemo(() => {
    const forecasts = selectForecastTransactions(rawTx);
    const overdueTx = overdueForecasts(forecasts, today);
    const overdueKeys = new Set(overdueTx.map((t) => `${t.recurringRuleId}:${t.date.slice(0, 10)}`));
    const occ = selectActiveOccurrences(rawOcc);
    const due = dueOccurrences(occ, nowIso).filter((o) => !(o.sourceType === 'rule' && o.offsetDays === 0 && overdueKeys.has(`${o.sourceId}:${o.eventDate}`)));
    const soonTx = upcomingForecasts(forecasts, today, 7);
    const soonOcc = upcomingOccurrences(occ, nowIso, 7).filter((o) => o.offsetDays === 0 && !soonTx.some((t) => t.recurringRuleId && t.recurringRuleId === o.sourceId && t.date.slice(0, 10) === o.eventDate));
    const soon = [
      ...soonTx.map((t) => ({ key: t.id, title: t.merchant || 'Movimiento previsto', date: t.date.slice(0, 10) })),
      ...soonOcc.map((o) => ({ key: o.id, title: o.title, date: o.eventDate })),
    ]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);
    // Tarjetas con un pago por cubrir (vencido o a 10 días o menos): se ven aquí con su monto (dentro de la app sí; en la notificación nunca).
    const cards = selectActiveAccounts(rawAccounts)
      .filter(isCreditCard)
      .map((c) => ({ card: c, due: cardDue(c, rawTx, today) }))
      .filter((x): x is { card: typeof x.card; due: NonNullable<typeof x.due> } => !!x.due && (x.due.status === 'overdue' || (x.due.status === 'pending' && x.due.daysToDue <= 10)));
    return { pending: overdueTx.length + due.length, soon, cards };
  }, [rawOcc, rawTx, rawAccounts, today, nowIso]);

  if (info.pending === 0 && info.soon.length === 0 && info.cards.length === 0) return null;

  return (
    <Pressable accessibilityLabel="Ver avisos y pagos próximos" onPress={() => router.push('/avisos')}>
      <GlassCard style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name={info.pending > 0 ? 'alert-circle' : 'calendar-outline'} size={20} color={info.pending > 0 ? colors.warning : colors.accentFrom} />
          <Text style={[typography.headline, { color: colors.textPrimary, flex: 1 }]}>
            {info.pending > 0 ? (info.pending === 1 ? '1 cosa por atender' : `${info.pending} cosas por atender`) : info.soon.length ? 'Esta semana' : 'Tus tarjetas'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>
        {info.pending > 0 && <Text style={[typography.caption, { color: colors.textSecondary }]}>Confirma si ya ocurrieron o pospónlos.</Text>}
        {info.cards.map((x) => (
          <Pressable key={x.card.id} onPress={() => router.push('/tarjetas')} style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Ionicons name="card-outline" size={14} color={x.due.status === 'overdue' ? colors.danger : colors.accentFrom} />
            <Text style={[typography.caption, { color: x.due.status === 'overdue' ? colors.danger : colors.textPrimary, flex: 1 }]} numberOfLines={2}>
              {x.card.name}: {x.due.status === 'overdue' ? 'pago vencido' : x.due.daysToDue === 0 ? 'hoy es tu fecha límite' : `pago en ${x.due.daysToDue} ${x.due.daysToDue === 1 ? 'día' : 'días'}`} · {formatCurrency(x.due.remaining, x.card.currency)}
            </Text>
          </Pressable>
        ))}
        {info.soon.map((e) => (
          <View key={e.key} style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.textTertiary, width: 72 }]}>{relativeDayEs(today, e.date)}</Text>
            <Text style={[typography.caption, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>
              {e.title}
            </Text>
          </View>
        ))}
      </GlassCard>
    </Pressable>
  );
}

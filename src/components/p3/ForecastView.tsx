import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { GlassCard } from '@/components/GlassCard';
import { useContentMaxWidth } from '@/hooks/useBreakpoint';
import { selectActiveAccounts, selectForecastTransactions } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { firstShortfall, forecastTotals, overdueForecasts, todayIsoLocal, upcomingForecasts } from '@/utils/forecast';
import { formatCurrency } from '@/utils/format';
import { addDaysIso, shortDateEs } from '@/utils/recurrence';

import { SmallButton } from './Chips';
import { ForecastCard } from './ForecastCard';

// Pestaña "Previstos" de Movimientos: lo que se espera que pase (no mueve saldos hasta confirmarlo).
export function ForecastView() {
  const { colors, typography, spacing } = useTheme();
  const maxWidth = useContentMaxWidth();
  const rawTx = useAppStore((s) => s.transactions);
  const rawAccounts = useAppStore((s) => s.accounts);
  const currency = useAppStore((s) => s.profile.primaryCurrency);
  const today = todayIsoLocal();
  const forecasts = useMemo(() => selectForecastTransactions(rawTx), [rawTx]);
  const accounts = useMemo(() => selectActiveAccounts(rawAccounts), [rawAccounts]);
  const overdue = useMemo(() => overdueForecasts(forecasts, today), [forecasts, today]);
  const upcoming = useMemo(() => upcomingForecasts(forecasts, today, 60), [forecasts, today]);
  const totals = useMemo(() => forecastTotals(forecasts, today, addDaysIso(today, 30), currency), [forecasts, today, currency]);
  const shortfall = useMemo(() => firstShortfall(accounts, forecasts, addDaysIso(today, 30)), [accounts, forecasts, today]);

  return (
    <ScrollView
      contentContainerStyle={[{ padding: spacing.lg, paddingBottom: 140, gap: spacing.md }, maxWidth ? { maxWidth, width: '100%', alignSelf: 'center' } : null]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <SmallButton label="Pagos recurrentes" icon={<Ionicons name="repeat-outline" size={15} color={colors.textSecondary} />} onPress={() => router.push('/recurrentes')} />
        <SmallButton label="Avisos" icon={<Ionicons name="notifications-outline" size={15} color={colors.textSecondary} />} onPress={() => router.push('/avisos')} />
      </View>

      {forecasts.length === 0 ? (
        <GlassCard style={{ alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name="calendar-outline" size={36} color={colors.textTertiary} />
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            Aquí verás lo que está por pasar: la renta, el sueldo, una suscripción… Crea un pago recurrente o registra un movimiento como «previsto» y VALU te avisa cuándo toca.
          </Text>
        </GlassCard>
      ) : (
        <GlassCard style={{ gap: spacing.sm }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Próximos 30 días</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Entra</Text>
              <Text style={[typography.headline, { color: colors.success }]}>{formatCurrency(totals.income, currency)}</Text>
            </View>
            <View>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Sale</Text>
              <Text style={[typography.headline, { color: colors.textPrimary }]}>{formatCurrency(totals.expense, currency)}</Text>
            </View>
            <View>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Resultado</Text>
              <Text style={[typography.headline, { color: totals.net >= 0 ? colors.success : colors.danger }]}>{formatCurrency(totals.net, currency)}</Text>
            </View>
          </View>
          {shortfall && (
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
              <Ionicons name="warning-outline" size={16} color={colors.warning} />
              <Text style={[typography.caption, { color: colors.warning, flex: 1 }]}>
                Ojo: el {shortDateEs(shortfall.date)} tu cuenta «{shortfall.name}» se quedaría en {formatCurrency(shortfall.balance, currency)} si todo ocurre como está previsto.
              </Text>
            </View>
          )}
          <Text style={[typography.micro, { color: colors.textTertiary }]}>Estos montos son lo que se espera: no cambian tus saldos hasta que confirmes cada uno.</Text>
        </GlassCard>
      )}

      {overdue.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.warning }]}>PASARON DE FECHA — ¿OCURRIERON?</Text>
          {overdue.map((t) => (
            <ForecastCard key={t.id} tx={t} />
          ))}
        </View>
      )}

      {upcoming.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>POR VENIR (60 DÍAS)</Text>
          {upcoming.map((t) => (
            <ForecastCard key={t.id} tx={t} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

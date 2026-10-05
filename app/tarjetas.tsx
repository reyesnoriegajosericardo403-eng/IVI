import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HelpButton } from '@/components/HelpButton';
import { GlassCard } from '@/components/GlassCard';
import { SmallButton } from '@/components/p3/Chips';
import { CardPanel } from '@/components/p3/CardPanel';
import { useContentMaxWidth } from '@/hooks/useBreakpoint';
import { selectActiveAccounts } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSettingsOf, isCreditCard } from '@/utils/creditCard';
import { downloadTextFile } from '@/utils/downloadFile';
import { todayIsoLocal } from '@/utils/forecast';
import { buildIcs, type IcsEvent } from '@/utils/ics';

export default function Tarjetas() {
  const { colors, typography, spacing } = useTheme();
  const maxWidth = useContentMaxWidth();
  const rawAccounts = useAppStore((s) => s.accounts);
  const rawRem = useAppStore((s) => s.reminders);
  const rawOcc = useAppStore((s) => s.reminderOccurrences);
  const cards = useMemo(() => selectActiveAccounts(rawAccounts).filter(isCreditCard), [rawAccounts]);
  const [msg, setMsg] = useState<string | null>(null);
  const today = todayIsoLocal();

  // Respaldo sin servidor: corte y pago de TODAS tus tarjetas como calendario (.ics).
  const exportCards = () => {
    const events: IcsEvent[] = [];
    for (const o of rawOcc) {
      if (o.deletedAt || o.offsetDays !== 0 || o.sourceType !== 'account' || o.eventDate < today || !['pending', 'sent'].includes(o.status)) continue;
      const rem = rawRem.find((r) => r.id === o.reminderId);
      if (!rem || (rem.kind !== 'card_cutoff' && rem.kind !== 'card_due')) continue;
      events.push({ uid: `${o.reminderId}-${o.eventDate}`.replace(/[^A-Za-z0-9-]/g, ''), date: o.eventDate, title: o.title, alarms: [...rem.advanceDays.map((d) => ({ daysBefore: d, time: rem.timeOfDay })), { daysBefore: 0, time: rem.timeOfDay }] });
    }
    if (events.length === 0) return setMsg('Primero pon las fechas de corte y de pago de tus tarjetas.');
    setMsg(downloadTextFile('valu-tarjetas.ics', buildIcs(events, { calendarName: 'VALU — tarjetas de crédito' }), 'text/calendar').message);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Pressable accessibilityLabel="Volver" onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Tarjetas de crédito</Text>
        <View style={{ marginLeft: 6 }}><HelpButton topic="tarjetas" /></View>
      </View>
      <ScrollView contentContainerStyle={[{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 140 }, maxWidth ? { maxWidth, width: '100%', alignSelf: 'center' } : null]} keyboardShouldPersistTaps="handled">
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Pon el día de corte y el día límite de pago de cada tarjeta y VALU te avisa antes, el mismo día y — si no confirmas que pagaste — te insiste hasta 3 veces. Nunca incluye montos en la notificación.
        </Text>
        {cards.length === 0 ? (
          <GlassCard style={{ gap: spacing.sm, alignItems: 'center' }}>
            <Ionicons name="card-outline" size={34} color={colors.textTertiary} />
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>Aún no tienes una tarjeta de crédito. Agrégala en Patrimonio → Cuentas, con tipo «Tarjeta de crédito», y vuelve aquí.</Text>
            <SmallButton label="Ir a Patrimonio" tone="primary" onPress={() => router.push('/(tabs)/patrimonio')} />
          </GlassCard>
        ) : (
          cards.map((c) => <CardPanel key={c.id} card={c} />)
        )}
        {cards.some((c) => cardSettingsOf(c)) && (
          <GlassCard style={{ gap: spacing.sm }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Respaldo en tu calendario</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Descarga el corte y la fecha de pago de tus tarjetas (.ics) y ábrelo en Apple Calendar o Google Calendar: tu teléfono te avisará aunque falle la notificación.</Text>
            <SmallButton label="Descargar calendario (.ics)" onPress={exportCards} icon={<Ionicons name="download-outline" size={15} color={colors.textSecondary} />} />
            {msg && <Text style={[typography.caption, { color: colors.textTertiary }]}>{msg}</Text>}
          </GlassCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

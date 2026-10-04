import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { DateField } from '@/components/DateField';
import { GlassCard } from '@/components/GlassCard';
import type { ReminderOccurrence } from '@/data/types';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { todayIsoLocal } from '@/utils/forecast';
import { dayWithRelativeEs, occurrenceHeadline } from '@/utils/p3Labels';
import { shortDateEs } from '@/utils/recurrence';

import { SmallButton } from './Chips';

// Un aviso concreto: "Faltan 3 días — Renta". El del día pregunta si ya ocurrió; el previo solo avisa.
export function OccurrenceCard({ occ }: { occ: ReminderOccurrence }) {
  const { colors, typography, spacing } = useTheme();
  const confirmOccurrence = useAppStore((s) => s.confirmOccurrence);
  const markNot = useAppStore((s) => s.markOccurrenceNotHappened);
  const skipOccurrence = useAppStore((s) => s.skipOccurrence);
  const dismiss = useAppStore((s) => s.dismissOccurrence);
  const postpone = useAppStore((s) => s.postponeOccurrence);
  const [mode, setMode] = useState<'idle' | 'postpone'>('idle');
  const [error, setError] = useState<string | null>(null);
  const today = todayIsoLocal();
  const isDay = occ.offsetDays === 0;
  const late = occ.eventDate < today;

  const run = (res: { ok: boolean; error?: string }) => {
    if (!res.ok) setError(res.error ?? 'No se pudo.');
    else {
      setError(null);
      setMode('idle');
    }
  };

  return (
    <GlassCard style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Ionicons name={late ? 'alert-circle-outline' : 'notifications-outline'} size={22} color={late ? colors.warning : colors.accentFrom} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]} numberOfLines={2}>
            {occ.title}
          </Text>
          <Text style={[typography.caption, { color: late ? colors.warning : colors.textSecondary }]}>
            {occurrenceHeadline(occ, today)} · {shortDateEs(occ.eventDate)}
            {occ.attemptsMade > 0 ? ` · avisado ${occ.attemptsMade} ${occ.attemptsMade === 1 ? 'vez' : 'veces'}` : ''}
          </Text>
        </View>
      </View>

      {mode === 'postpone' ? (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <SmallButton label="En 1 hora" onPress={() => run(postpone(occ.id, { minutes: 60 }))} />
            <SmallButton label="En 3 horas" onPress={() => run(postpone(occ.id, { minutes: 180 }))} />
            <SmallButton
              label="Mañana 9:00"
              onPress={() => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                d.setHours(9, 0, 0, 0);
                run(postpone(occ.id, { untilIso: d.toISOString() }));
              }}
            />
            <SmallButton label="Cancelar" onPress={() => setMode('idle')} />
          </View>
          <DateField
            value=""
            placeholder="Otro día (suena a las 9:00)"
            onChange={(iso) => {
              const [y, m, d] = iso.split('-').map(Number);
              run(postpone(occ.id, { untilIso: new Date(y, m - 1, d, 9, 0, 0).toISOString() }));
            }}
          />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {isDay ? (
            <>
              {occ.sourceType === 'account' && <SmallButton label="Ir a la tarjeta" tone="primary" onPress={() => router.push('/tarjetas')} />}
              <SmallButton label={occ.sourceType === 'account' ? 'Ya pagué' : 'Ya ocurrió'} tone={occ.sourceType === 'account' ? 'neutral' : 'primary'} onPress={() => run(confirmOccurrence(occ.id))} />
              <SmallButton label="Posponer" onPress={() => setMode('postpone')} />
              <SmallButton label="No ocurrió" tone="danger" onPress={() => run(markNot(occ.id))} />
              <SmallButton label="Omitir esta vez" onPress={() => run(skipOccurrence(occ.id))} />
            </>
          ) : (
            <>
              <SmallButton label="Enterado" tone="primary" onPress={() => run(dismiss(occ.id))} />
              <SmallButton label="Posponer" onPress={() => setMode('postpone')} />
            </>
          )}
        </View>
      )}
      {error && <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>}
    </GlassCard>
  );
}

export function whenLabel(occ: ReminderOccurrence): string {
  return dayWithRelativeEs(todayIsoLocal(), occ.eventDate);
}

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HelpButton } from '@/components/HelpButton';
import { DateField } from '@/components/DateField';
import { GlassCard } from '@/components/GlassCard';
import { ChipRow, SmallButton } from '@/components/p3/Chips';
import { ForecastCard } from '@/components/p3/ForecastCard';
import { OccurrenceCard } from '@/components/p3/OccurrenceCard';
import { RecurrenceEditor, type RecurrenceFormState } from '@/components/p3/RecurrenceEditor';
import { useContentMaxWidth } from '@/hooks/useBreakpoint';
import { selectActiveOccurrences, selectActiveReminders, selectForecastTransactions } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { downloadTextFile } from '@/utils/downloadFile';
import { overdueForecasts, todayIsoLocal } from '@/utils/forecast';
import { buildIcs, type IcsEvent } from '@/utils/ics';
import { dueOccurrences, upcomingOccurrences } from '@/utils/materialize';
import { advanceLabel, ADVANCE_CHOICES, ATTEMPT_CHOICES, TIME_CHOICES } from '@/utils/p3Labels';
import { describeRecurrence, nextOccurrence, shortDateEs } from '@/utils/recurrence';
import { buildRecurrence, validateRecurrenceForm } from '@/utils/recurrencePresets';

export default function Avisos() {
  const { colors, typography, spacing, radius } = useTheme();
  const maxWidth = useContentMaxWidth();
  const rawOcc = useAppStore((s) => s.reminderOccurrences);
  const rawReminders = useAppStore((s) => s.reminders);
  const rawTx = useAppStore((s) => s.transactions);
  const createReminder = useAppStore((s) => s.createReminder);
  const pauseReminder = useAppStore((s) => s.pauseReminder);
  const resumeReminder = useAppStore((s) => s.resumeReminder);
  const cancelReminder = useAppStore((s) => s.cancelReminder);
  const occurrences = useMemo(() => selectActiveOccurrences(rawOcc), [rawOcc]);
  const reminders = useMemo(() => selectActiveReminders(rawReminders).filter((r) => r.status !== 'cancelled'), [rawReminders]);
  const today = todayIsoLocal();
  const nowIso = new Date().toISOString();
  const due = useMemo(() => dueOccurrences(occurrences, nowIso), [occurrences, nowIso]);
  const upcoming = useMemo(() => upcomingOccurrences(occurrences, nowIso, 14), [occurrences, nowIso]);
  const overdueTx = useMemo(() => overdueForecasts(selectForecastTransactions(rawTx), today), [rawTx, today]);
  // Un aviso de regla de movimientos ya se atiende desde su previsto (tarjeta de arriba): no se repite.
  const overdueIds = useMemo(() => new Set(overdueTx.map((t) => `${t.recurringRuleId}:${t.date.slice(0, 10)}`)), [overdueTx]);
  const dueShown = due.filter((o) => !(o.sourceType === 'rule' && o.offsetDays === 0 && overdueIds.has(`${o.sourceId}:${o.eventDate}`)));

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [date, setDate] = useState(today);
  const [recurrence, setRecurrence] = useState<RecurrenceFormState>({ preset: 'monthly', startDate: today, end: { mode: 'never' } });
  const [time, setTime] = useState<string>('09:00');
  const [advance, setAdvance] = useState<number[]>([]);
  const [attempts, setAttempts] = useState<number>(1);
  const [push, setPush] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calMsg, setCalMsg] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const save = () => {
    let rec;
    if (repeat) {
      const e = validateRecurrenceForm(recurrence.preset, recurrence.startDate, recurrence.end);
      if (e) return setError(e);
      rec = buildRecurrence(recurrence.preset!, recurrence.startDate, recurrence.end);
    }
    const res = createReminder({ title, date: repeat ? undefined : date, recurrence: rec, timeOfDay: time, advanceDays: advance, maxAttempts: attempts, push });
    if (!res.ok) return setError(res.error ?? 'No se pudo guardar.');
    setTitle('');
    setError(null);
    setCreating(false);
  };

  // Respaldo sin servidor: los próximos avisos como calendario (.ics) que el teléfono suena por su cuenta.
  const exportCalendar = () => {
    const events: IcsEvent[] = [];
    const seen = new Set<string>();
    for (const o of occurrences) {
      if (o.offsetDays !== 0 || o.eventDate < today || !['pending', 'sent', 'paused'].includes(o.status)) continue;
      const rem = reminders.find((r) => r.id === o.reminderId);
      const key = `${o.reminderId}:${o.eventDate}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({ uid: key.replace(/[^A-Za-z0-9-]/g, ''), date: o.eventDate, title: o.title, alarms: [...(rem?.advanceDays ?? []).map((d) => ({ daysBefore: d, time: rem?.timeOfDay })), { daysBefore: 0, time: rem?.timeOfDay }] });
    }
    if (events.length === 0) return setCalMsg('No tienes avisos próximos para exportar.');
    setCalMsg(downloadTextFile('valu-avisos.ics', buildIcs(events, { calendarName: 'VALU — avisos' }), 'text/calendar').message);
  };

  const field = { color: colors.textPrimary, borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 } as const;
  const label = [typography.caption, { color: colors.textSecondary }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Pressable accessibilityLabel="Volver" onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Avisos</Text>
        <View style={{ marginLeft: 6 }}><HelpButton topic="avisos" /></View>
      </View>

      <ScrollView
        contentContainerStyle={[{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 140 }, maxWidth ? { maxWidth, width: '100%', alignSelf: 'center' } : null]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {!creating && <SmallButton label="Nuevo aviso" tone="primary" icon={<Ionicons name="add" size={16} color="#FFFFFF" />} onPress={() => setCreating(true)} />}
          <SmallButton label="Pagos recurrentes" icon={<Ionicons name="repeat-outline" size={15} color={colors.textSecondary} />} onPress={() => router.push('/recurrentes')} />
          <SmallButton label="Notificaciones" icon={<Ionicons name="phone-portrait-outline" size={15} color={colors.textSecondary} />} onPress={() => router.push('/notificaciones')} />
        </View>

        {creating && (
          <GlassCard style={{ gap: spacing.md }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Nuevo aviso</Text>
            <View style={{ gap: spacing.sm }}>
              <Text style={label}>¿DE QUÉ TE AVISO?</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="ej. Pagar la luz" placeholderTextColor={colors.textTertiary} style={field} />
            </View>
            <ChipRow options={[{ id: 'once', label: 'Una vez' }, { id: 'repeat', label: 'Se repite' }]} value={repeat ? 'repeat' : 'once'} onChange={(v) => setRepeat(v === 'repeat')} />
            {repeat ? (
              <RecurrenceEditor value={recurrence} onChange={setRecurrence} startLabel="PRIMERA VEZ" />
            ) : (
              <View style={{ gap: spacing.sm }}>
                <Text style={label}>FECHA</Text>
                <DateField value={date} onChange={setDate} />
              </View>
            )}
            <View style={{ gap: spacing.sm }}>
              <Text style={label}>HORA</Text>
              <ChipRow options={TIME_CHOICES.map((t) => ({ id: t, label: t }))} value={time} onChange={setTime} />
              <Text style={label}>AVISO PREVIO</Text>
              <ChipRow multi options={ADVANCE_CHOICES.map((d) => ({ id: d, label: d === 1 ? '1 día antes' : `${d} días antes` }))} value={advance} onChange={(d) => setAdvance((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))} />
              <Text style={label}>SI NO LO CONFIRMO, INSISTIR</Text>
              <ChipRow options={ATTEMPT_CHOICES.map((n) => ({ id: n, label: n === 1 ? 'Una vez' : `Hasta ${n} veces` }))} value={attempts} onChange={setAttempts} />
              <ChipRow options={[{ id: 'push', label: 'Notificación al teléfono' }, { id: 'app', label: 'Solo dentro de la app' }]} value={push ? 'push' : 'app'} onChange={(v) => setPush(v === 'push')} />
            </View>
            {error && <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SmallButton label="Guardar" tone="primary" onPress={save} />
              <SmallButton
                label="Cancelar"
                onPress={() => {
                  setCreating(false);
                  setError(null);
                }}
              />
            </View>
          </GlassCard>
        )}

        {overdueTx.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.warning }]}>MOVIMIENTOS QUE YA TOCABAN — ¿OCURRIERON?</Text>
            {overdueTx.map((t) => (
              <ForecastCard key={t.id} tx={t} />
            ))}
          </View>
        )}

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>POR ATENDER</Text>
          {dueShown.length === 0 ? (
            <Text style={[typography.body, { color: colors.textSecondary }]}>Nada pendiente por ahora. 🎉</Text>
          ) : (
            dueShown.map((o) => <OccurrenceCard key={o.id} occ={o} />)
          )}
        </View>

        {upcoming.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>PRÓXIMOS 14 DÍAS</Text>
            {upcoming.slice(0, 30).map((o) => (
              <GlassCard key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Ionicons name="time-outline" size={20} color={colors.textTertiary} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.textPrimary }]} numberOfLines={1}>
                    {o.title}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {o.offsetDays === 0 ? 'El día' : `Aviso previo (${o.offsetDays} ${o.offsetDays === 1 ? 'día' : 'días'} antes)`} · {shortDateEs(o.eventDate)}
                  </Text>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>MIS AVISOS</Text>
          {reminders.length === 0 && <Text style={[typography.caption, { color: colors.textTertiary }]}>Todavía no tienes avisos. Crea uno con «Nuevo aviso».</Text>}
          {reminders.map((r) => {
            const next = r.recurrence ? nextOccurrence(r.recurrence, today) : r.date && r.date >= today ? r.date : null;
            return (
              <GlassCard key={r.id} style={{ gap: spacing.sm }}>
                <Text style={[typography.headline, { color: colors.textPrimary }]}>{r.title}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {r.recurrence ? describeRecurrence(r.recurrence) : r.date ? `una vez, ${shortDateEs(r.date)}` : 'según su pago recurrente'} · {r.timeOfDay} · {advanceLabel(r.advanceDays)}
                  {r.maxAttempts > 1 ? ` · insiste hasta ${r.maxAttempts} veces` : ''}
                </Text>
                <Text style={[typography.micro, { color: r.status === 'active' ? colors.success : colors.textTertiary }]}>
                  {r.status === 'active' ? 'Activo' : 'En pausa'}
                  {next ? ` · próximo: ${shortDateEs(next)}` : ''}
                  {r.push ? '' : ' · solo dentro de la app'}
                </Text>
                {confirmCancel === r.id ? (
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <SmallButton
                      label="Sí, quitar aviso"
                      tone="danger"
                      onPress={() => {
                        cancelReminder(r.id);
                        setConfirmCancel(null);
                      }}
                    />
                    <SmallButton label="No" onPress={() => setConfirmCancel(null)} />
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {r.status === 'active' ? <SmallButton label="Pausar" onPress={() => pauseReminder(r.id)} /> : <SmallButton label="Reanudar" tone="primary" onPress={() => resumeReminder(r.id)} />}
                    <SmallButton label="Quitar" tone="danger" onPress={() => setConfirmCancel(r.id)} />
                  </View>
                )}
              </GlassCard>
            );
          })}
        </View>

        <GlassCard style={{ gap: spacing.sm }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Respaldo en tu calendario</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Para no depender solo de las notificaciones, descarga tus avisos como calendario (.ics) y ábrelo en Apple Calendar o Google Calendar: tu teléfono te avisará por su cuenta. Solo lleva el título, nunca montos.
          </Text>
          <SmallButton label="Descargar calendario (.ics)" onPress={exportCalendar} icon={<Ionicons name="download-outline" size={15} color={colors.textSecondary} />} />
          {calMsg && <Text style={[typography.caption, { color: colors.textTertiary }]}>{calMsg}</Text>}
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

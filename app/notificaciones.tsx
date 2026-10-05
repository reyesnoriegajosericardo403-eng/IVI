import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HelpButton } from '@/components/HelpButton';
import { GlassCard } from '@/components/GlassCard';
import { webPushNotificationProvider as provider } from '@/providers/notifications/webPushNotificationProvider';
import type { NotificationSupport } from '@/providers/types';
import { useAuthSession } from '@/services/auth/useAuthSession';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  loadNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
} from '@/services/notifications/notificationSettings';
import { useTheme } from '@/theme/ThemeProvider';

const REMINDER_HOURS = [8, 12, 14, 18, 20, 21, 22];

const UNSUPPORTED_COPY: Record<Exclude<NotificationSupport, { supported: true }>['reason'], { title: string; body: string }> = {
  ios_needs_install: {
    title: 'Primero instala VALU en tu pantalla de inicio',
    body: 'En iPhone, Apple solo permite avisos a las apps web instaladas. Abre VALU en Safari → botón Compartir → "Agregar a pantalla de inicio", ábrela desde ese ícono y vuelve aquí.',
  },
  unsupported_browser: {
    title: 'Este navegador no admite avisos',
    body: 'Usa Chrome en Android, o Safari en iPhone (iOS 16.4 o más nuevo) con VALU instalada en la pantalla de inicio.',
  },
  no_backend: {
    title: 'Los avisos necesitan la nube',
    body: 'VALU está en modo local, sin cuenta en la nube. Los avisos se envían desde el servidor, así que requieren una cuenta conectada.',
  },
  signed_out: {
    title: 'Inicia sesión para activar avisos',
    body: 'Los avisos se envían a tu cuenta, así que primero necesitas iniciar sesión.',
  },
  native_pending: {
    title: 'Disponible en la versión web instalada',
    body: 'Por ahora los avisos funcionan en la app instalada desde el navegador. La versión de tienda (App Store / Play Store) los traerá con su propio sistema.',
  },
};

export default function Notificaciones() {
  const { colors, typography, spacing, radius } = useTheme();
  const { userId } = useAuthSession();
  const support = provider.getSupport(Boolean(userId));

  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState<null | 'enable' | 'disable' | 'test'>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);

  const refresh = useCallback(async () => {
    setSubscribed(await provider.isSubscribed().catch(() => false));
    if (userId) setSettings(await loadNotificationSettings(userId).catch(() => DEFAULT_NOTIFICATION_SETTINGS));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleEnable = async () => {
    setBusy('enable');
    setMessage(null);
    const result = await provider.enable();
    setBusy(null);
    if (result.ok) {
      setSubscribed(true);
      setMessage({ tone: 'ok', text: 'Avisos activados en este dispositivo.' });
      if (userId) setSettings(await loadNotificationSettings(userId).catch(() => settings));
    } else {
      setMessage({ tone: 'error', text: result.error });
    }
  };

  const handleDisable = async () => {
    setBusy('disable');
    await provider.disable();
    setBusy(null);
    setSubscribed(false);
    setMessage({ tone: 'ok', text: 'Este dispositivo ya no recibirá avisos.' });
  };

  const handleTest = async () => {
    setBusy('test');
    setMessage(null);
    const result = await provider.sendTest();
    setBusy(null);
    setMessage(
      result.ok
        ? { tone: 'ok', text: `Aviso enviado a ${result.delivered} dispositivo(s). Debería llegarte en unos segundos.` }
        : { tone: 'error', text: result.error }
    );
  };

  const updateSettings = async (patch: Partial<NotificationSettings>) => {
    if (!userId) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSavingSettings(true);
    const error = await saveNotificationSettings(userId, next);
    setSavingSettings(false);
    if (error) setMessage({ tone: 'error', text: `No se guardaron tus preferencias: ${error}` });
  };

  const permission = provider.getPermission();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Pressable accessibilityLabel="Regresar" onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Notificaciones</Text>
        <View style={{ marginLeft: 6 }}><HelpButton topic="notificaciones" /></View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 80 }}>
        {!support.supported ? (
          <GlassCard style={{ gap: spacing.sm }}>
            <View style={styles.row}>
              <Ionicons name="notifications-off-outline" size={20} color={colors.textSecondary} />
              <Text style={[typography.headline, { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1 }]}>
                {UNSUPPORTED_COPY[support.reason].title}
              </Text>
            </View>
            <Text style={[typography.body, { color: colors.textSecondary }]}>{UNSUPPORTED_COPY[support.reason].body}</Text>
            {support.reason === 'ios_needs_install' && (
              <Pressable onPress={() => router.push('/instalar')}>
                <Text style={{ color: colors.accentFrom, fontWeight: '700' }}>Ver cómo instalar VALU →</Text>
              </Pressable>
            )}
          </GlassCard>
        ) : (
          <GlassCard style={{ gap: spacing.md }}>
            <View style={styles.row}>
              <View
                style={[
                  styles.statusIcon,
                  { backgroundColor: subscribed ? colors.accentSoft : colors.surfaceBorder, borderRadius: radius.pill },
                ]}
              >
                <Ionicons
                  name={subscribed ? 'notifications' : 'notifications-outline'}
                  size={20}
                  color={subscribed ? colors.accentFrom : colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.headline, { color: colors.textPrimary }]}>
                  {subscribed ? 'Avisos activos en este dispositivo' : 'Avisos apagados en este dispositivo'}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {permission === 'denied'
                    ? 'El permiso está bloqueado en los ajustes del teléfono.'
                    : 'Te llegan como cualquier otra app, aunque VALU esté cerrada.'}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: subscribed }}
              accessibilityLabel="Avisos en este dispositivo"
              onPress={subscribed ? handleDisable : handleEnable}
              disabled={busy === 'enable' || busy === 'disable' || (!subscribed && permission === 'denied')}
              style={[styles.row, { justifyContent: 'space-between', opacity: busy === 'enable' || busy === 'disable' ? 0.6 : 1 }]}
            >
              <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>Recibir avisos</Text>
              {busy === 'enable' || busy === 'disable' ? (
                <ActivityIndicator color={colors.accentFrom} />
              ) : (
                <View style={[styles.track, { backgroundColor: subscribed ? colors.accentFrom : colors.surfaceBorder }]}>
                  <View style={[styles.thumb, { alignSelf: subscribed ? 'flex-end' : 'flex-start' }]} />
                </View>
              )}
            </Pressable>
            {subscribed && (
              <Pressable
                accessibilityLabel="Enviar aviso de prueba"
                onPress={handleTest}
                disabled={busy !== null}
                style={[styles.primaryBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill, opacity: busy ? 0.6 : 1 }]}
              >
                {busy === 'test' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Enviar aviso de prueba</Text>}
              </Pressable>
            )}

            {message && (
              <Text style={[typography.caption, { color: message.tone === 'ok' ? colors.success : colors.danger }]}>{message.text}</Text>
            )}
          </GlassCard>
        )}

        {support.supported && (
          <View style={{ gap: spacing.sm }}>
            <View style={styles.rowBetween}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>QUÉ AVISOS QUIERES</Text>
              {savingSettings && <Text style={[typography.micro, { color: colors.textTertiary }]}>Guardando…</Text>}
            </View>
            <GlassCard padded={false}>
              <ToggleRow
                icon="calendar-outline"
                title="Pagos de deudas por vencer"
                subtitle="3 días antes, 1 día antes y el mismo día de la fecha de pago de tus tarjetas y préstamos."
                value={settings.debtDue}
                onChange={(v) => updateSettings({ debtDue: v })}
              />
              <ToggleRow
                icon="create-outline"
                title="Recordatorio diario para registrar"
                subtitle="Solo si ese día todavía no registraste ningún movimiento."
                value={settings.dailyLogReminder}
                onChange={(v) => updateSettings({ dailyLogReminder: v })}
                bordered
              />
              {settings.dailyLogReminder && (
                <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.xs }}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>¿A qué hora?</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {REMINDER_HOURS.map((h) => {
                      const active = settings.dailyReminderHour === h;
                      return (
                        <Pressable
                          key={h}
                          accessibilityLabel={`Recordatorio a las ${h}:00`}
                          onPress={() => updateSettings({ dailyReminderHour: h })}
                          style={[
                            styles.hourChip,
                            {
                              borderRadius: radius.pill,
                              borderColor: active ? colors.accentFrom : colors.surfaceBorder,
                              backgroundColor: active ? colors.accentSoft : 'transparent',
                            },
                          ]}
                        >
                          <Text style={{ color: active ? colors.accentFrom : colors.textSecondary, fontWeight: '700' }}>
                            {`${h}:00`}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </GlassCard>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              Por privacidad, los avisos nunca muestran montos ni saldos. Sí muestran el título que tú escribiste, y se ve en tu pantalla bloqueada. Zona horaria:{' '}
              {settings.timezone}.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
  bordered,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
  bordered?: boolean;
}) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      onPress={() => onChange(!value)}
      style={[styles.row, { padding: spacing.md, borderTopWidth: bordered ? 1 : 0, borderTopColor: colors.divider }]}
    >
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <View style={{ flex: 1, marginHorizontal: spacing.md }}>
        <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>{title}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: value ? colors.accentFrom : colors.surfaceBorder }]}>
        <View style={[styles.thumb, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  buttonRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryBtn: { paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center', borderWidth: 1 },
  hourChip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  track: { width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
});

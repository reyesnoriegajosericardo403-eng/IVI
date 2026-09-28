import { supabase } from '@/services/supabase/client';

// Preferencias de avisos del usuario. Viven en el servidor (no en el store
// local) porque quien decide cuándo mandar un recordatorio es el cron de
// push-notify, que corre aunque la app esté cerrada.
export interface NotificationSettings {
  enabled: boolean;
  debtDue: boolean;
  dailyLogReminder: boolean;
  dailyReminderHour: number;
  timezone: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  debtDue: true,
  dailyLogReminder: false,
  dailyReminderHour: 21,
  timezone: 'America/Mexico_City',
};

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_NOTIFICATION_SETTINGS.timezone;
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS.timezone;
  }
}

export async function loadNotificationSettings(userId: string): Promise<NotificationSettings> {
  if (!supabase) return DEFAULT_NOTIFICATION_SETTINGS;
  const { data } = await supabase.from('notification_settings').select('*').eq('user_id', userId).maybeSingle();
  if (!data) return { ...DEFAULT_NOTIFICATION_SETTINGS, timezone: deviceTimezone() };
  return {
    enabled: data.enabled,
    debtDue: data.debt_due,
    dailyLogReminder: data.daily_log_reminder,
    dailyReminderHour: data.daily_reminder_hour,
    timezone: data.timezone,
  };
}

export async function saveNotificationSettings(userId: string, settings: NotificationSettings): Promise<string | null> {
  if (!supabase) return 'Sin conexión al servidor.';
  const { error } = await supabase.from('notification_settings').upsert(
    {
      user_id: userId,
      enabled: settings.enabled,
      debt_due: settings.debtDue,
      daily_log_reminder: settings.dailyLogReminder,
      daily_reminder_hour: settings.dailyReminderHour,
      // Siempre la del dispositivo actual: si viajas, los avisos te siguen.
      timezone: deviceTimezone(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  return error ? error.message : null;
}

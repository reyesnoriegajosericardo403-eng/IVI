// Textos en español para las pantallas de P3 (puro: se prueba en Node).
import type { OccurrenceStatus, ReminderOccurrence } from '@/data/types';

import { diffDaysIso, shortDateEs } from './recurrence';

// "hoy", "mañana", "en 3 días", "ayer", "hace 4 días" respecto de hoy.
export function relativeDayEs(todayIso: string, dateIso: string): string {
  const n = diffDaysIso(todayIso, dateIso);
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  if (n === -1) return 'ayer';
  if (n > 1) return `en ${n} días`;
  return `hace ${-n} días`;
}

export function dayWithRelativeEs(todayIso: string, dateIso: string): string {
  return `${shortDateEs(dateIso)} (${relativeDayEs(todayIso, dateIso)})`;
}

export const OCCURRENCE_STATUS_ES: Record<OccurrenceStatus, string> = {
  pending: 'Pendiente',
  sent: 'Avisado',
  confirmed: 'Ya ocurrió',
  not_occurred: 'No ocurrió',
  skipped: 'Omitido',
  dismissed: 'Enterado',
  cancelled: 'Cancelado',
  paused: 'En pausa',
};

// Frase corta de un aviso previo o del día: "Faltan 3 días", "Es hoy", "Era hace 2 días".
export function occurrenceHeadline(o: Pick<ReminderOccurrence, 'eventDate' | 'offsetDays'>, todayIso: string): string {
  const n = diffDaysIso(todayIso, o.eventDate);
  if (n === 0) return 'Es hoy';
  if (n === 1) return 'Es mañana';
  if (n > 1) return `Faltan ${n} días`;
  if (n === -1) return 'Era ayer';
  return `Era hace ${-n} días`;
}

export const ATTEMPT_CHOICES = [1, 2, 3] as const;
export const ADVANCE_CHOICES = [1, 2, 3, 7] as const;
export const TIME_CHOICES = ['07:00', '08:00', '09:00', '12:00', '18:00', '20:00', '21:00'] as const;

export function advanceLabel(days: number[]): string {
  if (days.length === 0) return 'Sin aviso previo';
  return days
    .slice()
    .sort((a, b) => b - a)
    .map((d) => (d === 1 ? '1 día antes' : `${d} días antes`))
    .join(' y ');
}

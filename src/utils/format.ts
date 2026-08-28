import type { Currency } from '@/data/types';

const LOCALE_BY_CURRENCY: Record<Currency, string> = {
  MXN: 'es-MX',
  USD: 'en-US',
  EUR: 'de-DE',
  CAD: 'en-CA',
  GBP: 'en-GB',
};

export function formatCurrency(amount: number, currency: Currency = 'MXN', maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency] ?? 'es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(amount);
}

export function formatPercent(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatCompactDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export function formatRelativeDay(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const diffDays = Math.floor((today.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86400000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays > 1 && diffDays < 7) return `Hace ${diffDays} días`;
  return formatCompactDate(iso);
}

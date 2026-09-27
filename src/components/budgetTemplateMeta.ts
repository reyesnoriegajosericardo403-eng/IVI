import type { BudgetTemplateKind } from '@/data/types';

// Constantes compartidas de "plantillas de presupuesto" (nombre, período,
// ícono) — usadas por BudgetChipRow, BudgetCalendar, BudgetActionPanel,
// BudgetTemplateList y TemplateMetaForm. El componente de hoja que vivía
// aquí (elegir/crear/quitar plantilla de UN periodo día/semana/mes) quedó
// superado por el flujo de rango arbitrario del calendario rediseñado
// (BudgetChipRow + tocar día inicio/fin en BudgetCalendar).

export const KIND_LABELS: Record<BudgetTemplateKind, string> = {
  week: 'Semanal',
  month: 'Mensual',
  day: 'Día (evento único)',
};

// Ícono por default según el periodo de la plantilla, cuando la persona no
// elige uno explícito — nunca sin ícono (spec: "marcador legible").
export const DEFAULT_TEMPLATE_ICON: Record<BudgetTemplateKind, string> = {
  week: 'calendar-outline',
  month: 'calendar-number-outline',
  day: 'flag-outline',
};

// Set curado de Ionicons para elegir en el picker — cubre los usos reales
// más comunes de un presupuesto con nombre (spec: "para tus días en
// clases... vacaciones... eventos de un solo día").
export const BUDGET_TEMPLATE_ICON_CHOICES = [
  'airplane-outline',
  'school-outline',
  'briefcase-outline',
  'home-outline',
  'heart-outline',
  'gift-outline',
  'fitness-outline',
  'cafe-outline',
  'car-outline',
  'cart-outline',
  'medkit-outline',
  'flag-outline',
];

export function templateIcon(t: { kind: BudgetTemplateKind; icon?: string }): string {
  return t.icon ?? DEFAULT_TEMPLATE_ICON[t.kind];
}

import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// Un icono fijo por categoría — nunca cambia, para que el usuario aprenda a
// reconocer cada categoría de un vistazo (ver spec sección 11).
export const CATEGORY_ICONS = {
  miscellaneous: 'bag-handle-outline',
  savings: 'wallet-outline',
  housing: 'home-outline',
  food: 'restaurant-outline',
  entertainment: 'game-controller-outline',
  lifestyle: 'sparkles-outline',
  health: 'medkit-outline',
  income: 'trending-up-outline',
  transport: 'car-outline',
  debt: 'card-outline',
  investments: 'bar-chart-outline',
  education: 'school-outline',
} as const satisfies Record<string, IoniconName>;

export type CategoryIconKey = keyof typeof CATEGORY_ICONS;

import type { CategoryIconKey } from './iconMap';

// Taxonomía de presupuesto personal (spec: orden Ingresos → Gastos en
// HOY/LUEGO/COMPARTIR). Cada concepto es un "renglón" de presupuesto que
// agrupa una o varias categorías/subcategorías YA EXISTENTES — nunca se
// renombran ni se eliminan ids de categoría/subcategoría reales, porque
// ya hay transacciones guardadas que las usan. Esto es solo una capa de
// organización encima de las categorías reales.
export type BudgetGroupId = 'hoy' | 'luego' | 'compartir';

export const BUDGET_GROUP_LABELS: Record<BudgetGroupId, string> = {
  hoy: 'Hoy',
  luego: 'Luego',
  compartir: 'Compartir',
};

export const BUDGET_GROUP_DESCRIPTIONS: Record<BudgetGroupId, string> = {
  hoy: 'Gastos indispensables y estilo de vida',
  luego: 'Ahorro e inversión',
  compartir: 'Dar y apoyar',
};

export interface ConceptMatch {
  categoryId: string;
  // Si se omite, cuenta toda la categoría; si se da, solo esas subcategorías.
  subcategoryIds?: string[];
}

export interface BudgetConcept {
  id: string;
  name: string;
  group: BudgetGroupId;
  icon: CategoryIconKey;
  matches: ConceptMatch[];
}

export const BUDGET_CONCEPTS: BudgetConcept[] = [
  // ---------- HOY: gastos indispensables y estilo de vida ----------
  {
    id: 'concept_housing',
    name: 'Vivienda y servicios básicos',
    group: 'hoy',
    icon: 'housing',
    matches: [{ categoryId: 'housing' }],
  },
  {
    id: 'concept_food',
    name: 'Alimentación y súper',
    group: 'hoy',
    icon: 'food',
    matches: [
      {
        categoryId: 'food',
        subcategoryIds: ['food_supermarket', 'food_restaurant', 'food_coffee', 'food_market', 'food_bakery', 'food_organic', 'food_other'],
      },
    ],
  },
  {
    id: 'concept_transport',
    name: 'Transporte cotidiano',
    group: 'hoy',
    icon: 'transport',
    matches: [{ categoryId: 'transport' }],
  },
  {
    id: 'concept_leisure',
    name: 'Salidas, ocio y antojos',
    group: 'hoy',
    icon: 'entertainment',
    matches: [
      {
        categoryId: 'entertainment',
        subcategoryIds: [
          'ent_cinema', 'ent_concerts', 'ent_hobbies', 'ent_videogames', 'ent_sports',
          'ent_bowling', 'ent_clubs', 'ent_events', 'ent_karaoke', 'ent_amusement', 'ent_other',
        ],
      },
      { categoryId: 'food', subcategoryIds: ['food_alcohol', 'food_fastfood', 'food_snacks', 'food_sweets', 'food_delivery'] },
      { categoryId: 'lifestyle', subcategoryIds: ['life_travel', 'life_experiences', 'life_personal'] },
    ],
  },
  {
    id: 'concept_subscriptions',
    name: 'Suscripciones, telefonía y tecnología',
    group: 'hoy',
    icon: 'entertainment',
    matches: [
      { categoryId: 'entertainment', subcategoryIds: ['ent_streaming', 'ent_subscriptions'] },
      { categoryId: 'housing', subcategoryIds: ['house_phone', 'house_internet'] },
      { categoryId: 'miscellaneous', subcategoryIds: ['misc_electronics', 'misc_software', 'misc_cloud'] },
    ],
  },
  {
    id: 'concept_health',
    name: 'Salud y bienestar',
    group: 'hoy',
    icon: 'health',
    matches: [{ categoryId: 'health' }, { categoryId: 'miscellaneous', subcategoryIds: ['misc_wellness', 'misc_personal_care'] }],
  },
  {
    id: 'concept_debt',
    name: 'Pagos de deudas',
    group: 'hoy',
    icon: 'debt',
    matches: [{ categoryId: 'debt' }],
  },
  {
    id: 'concept_education',
    name: 'Educación y desarrollo',
    group: 'hoy',
    icon: 'education',
    matches: [{ categoryId: 'education' }],
  },

  // ---------- LUEGO: ahorro e inversión ----------
  {
    id: 'concept_goals_short',
    name: 'Metas a corto plazo',
    group: 'luego',
    icon: 'savings',
    matches: [{ categoryId: 'savings', subcategoryIds: ['sav_goals_short', 'sav_goals', 'sav_vacation'] }],
  },
  {
    id: 'concept_goals_long',
    name: 'Metas a mediano/largo plazo',
    group: 'luego',
    icon: 'savings',
    matches: [{ categoryId: 'savings', subcategoryIds: ['sav_goals_long', 'sav_retirement', 'sav_house_downpayment'] }],
  },
  {
    id: 'concept_emergency',
    name: 'Fondo de emergencia',
    group: 'luego',
    icon: 'savings',
    matches: [{ categoryId: 'savings', subcategoryIds: ['sav_emergency', 'sav_other'] }],
  },
  {
    id: 'concept_investing',
    name: 'Inversiones',
    group: 'luego',
    icon: 'investments',
    matches: [{ categoryId: 'investments' }],
  },

  // ---------- COMPARTIR: dar y apoyar ----------
  {
    id: 'concept_gifts',
    name: 'Regalos e intercambios',
    group: 'compartir',
    icon: 'lifestyle',
    matches: [{ categoryId: 'lifestyle', subcategoryIds: ['life_gifts'] }],
  },
  {
    id: 'concept_family_support',
    name: 'Apoyo familiar',
    group: 'compartir',
    icon: 'lifestyle',
    matches: [{ categoryId: 'lifestyle', subcategoryIds: ['life_family_support', 'life_celebration'] }],
  },
  {
    id: 'concept_donations',
    name: 'Donaciones y causas sociales',
    group: 'compartir',
    icon: 'lifestyle',
    matches: [{ categoryId: 'lifestyle', subcategoryIds: ['life_donations', 'life_community'] }],
  },
];

export function findBudgetConcept(id: string): BudgetConcept | undefined {
  return BUDGET_CONCEPTS.find((c) => c.id === id);
}

export function budgetConceptsByGroup(group: BudgetGroupId): BudgetConcept[] {
  return BUDGET_CONCEPTS.filter((c) => c.group === group);
}

// Un concepto por cada subcategoría de ingreso — a diferencia de los
// gastos (que agrupan varias subcategorías por concepto para que no sean
// demasiados renglones), aquí solo hay 10 en total, así que mostrarlas
// todas por separado es lo más simple y directo.
export interface IncomeConcept {
  id: string;
  name: string;
  icon: CategoryIconKey;
  kind: 'fixed' | 'variable';
  matches: ConceptMatch[];
}

export const INCOME_CONCEPTS: IncomeConcept[] = [
  { id: 'income_inc_salary', name: 'Salario', icon: 'income', kind: 'fixed', matches: [{ categoryId: 'income', subcategoryIds: ['inc_salary'] }] },
  { id: 'income_inc_allowance', name: 'Mesada', icon: 'income', kind: 'fixed', matches: [{ categoryId: 'income', subcategoryIds: ['inc_allowance'] }] },
  { id: 'income_inc_bonus', name: 'Bonos', icon: 'income', kind: 'variable', matches: [{ categoryId: 'income', subcategoryIds: ['inc_bonus'] }] },
  {
    id: 'income_inc_investments',
    name: 'Rendimiento de inversiones',
    icon: 'income',
    kind: 'variable',
    matches: [{ categoryId: 'income', subcategoryIds: ['inc_investments'] }],
  },
  { id: 'income_inc_dividends', name: 'Dividendos', icon: 'income', kind: 'variable', matches: [{ categoryId: 'income', subcategoryIds: ['inc_dividends'] }] },
  { id: 'income_inc_interest', name: 'Intereses', icon: 'income', kind: 'variable', matches: [{ categoryId: 'income', subcategoryIds: ['inc_interest'] }] },
  { id: 'income_inc_freelance', name: 'Freelance', icon: 'income', kind: 'variable', matches: [{ categoryId: 'income', subcategoryIds: ['inc_freelance'] }] },
  { id: 'income_inc_gifts', name: 'Regalos recibidos', icon: 'income', kind: 'variable', matches: [{ categoryId: 'income', subcategoryIds: ['inc_gifts'] }] },
  { id: 'income_inc_sales', name: 'Ventas', icon: 'income', kind: 'variable', matches: [{ categoryId: 'income', subcategoryIds: ['inc_sales'] }] },
  { id: 'income_inc_other', name: 'Otros ingresos', icon: 'income', kind: 'variable', matches: [{ categoryId: 'income', subcategoryIds: ['inc_other'] }] },
];

export function findIncomeConcept(id: string): IncomeConcept | undefined {
  return INCOME_CONCEPTS.find((c) => c.id === id);
}

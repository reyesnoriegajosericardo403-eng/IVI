import type { CategoryDef } from './types';

// Catálogo inicial de categorías (spec sección 10). El usuario puede
// agregar, editar, eliminar y reordenar — esto es el set por defecto.
export const DEFAULT_CATEGORIES: CategoryDef[] = [
  {
    id: 'miscellaneous',
    name: 'Miscelánea',
    icon: 'miscellaneous',
    subcategories: [
      { id: 'misc_clothing', name: 'Ropa', keywords: ['ropa', 'playera', 'pantalón', 'zapatos', 'tienda de ropa'] },
      { id: 'misc_wellness', name: 'Bienestar', keywords: ['bienestar', 'spa', 'masaje'] },
      { id: 'misc_personal_care', name: 'Cuidado personal', keywords: ['cuidado personal', 'barbería', 'salón', 'estética'] },
      { id: 'misc_shopping', name: 'Compras', keywords: ['compras', 'compré', 'tienda'] },
      { id: 'misc_electronics', name: 'Electrónica', keywords: ['electrónica', 'celular', 'laptop', 'audífonos'] },
      { id: 'misc_other', name: 'Otros', keywords: [] },
    ],
  },
  {
    id: 'savings',
    name: 'Ahorros',
    icon: 'savings',
    subcategories: [
      { id: 'sav_emergency', name: 'Fondo de emergencia', keywords: ['fondo de emergencia', 'emergencia'] },
      { id: 'sav_vacation', name: 'Vacaciones', keywords: ['vacaciones', 'viaje ahorro'] },
      { id: 'sav_retirement', name: 'Retiro', keywords: ['retiro', 'afore', 'pensión'] },
      { id: 'sav_goals', name: 'Metas', keywords: ['meta', 'metas'] },
      { id: 'sav_other', name: 'Otros ahorros', keywords: ['ahorro', 'ahorré', 'metí lana', 'guardé'] },
    ],
  },
  {
    id: 'housing',
    name: 'Alojamiento y servicios',
    icon: 'housing',
    subcategories: [
      { id: 'house_rent', name: 'Renta', keywords: ['renta'] },
      { id: 'house_mortgage', name: 'Hipoteca', keywords: ['hipoteca'] },
      { id: 'house_insurance', name: 'Seguro', keywords: ['seguro de casa', 'seguro hogar'] },
      { id: 'house_phone', name: 'Teléfono', keywords: ['teléfono', 'celular plan', 'plan telefónico'] },
      { id: 'house_internet', name: 'Internet', keywords: ['internet', 'wifi'] },
      { id: 'house_electricity', name: 'Electricidad', keywords: ['luz', 'electricidad', 'cfe'] },
      { id: 'house_water', name: 'Agua', keywords: ['agua'] },
      { id: 'house_gas', name: 'Gas', keywords: ['gas'] },
      { id: 'house_maintenance', name: 'Mantenimiento', keywords: ['mantenimiento casa'] },
      { id: 'house_services', name: 'Servicios', keywords: ['servicios'] },
    ],
  },
  {
    id: 'food',
    name: 'Comida y bebidas',
    icon: 'food',
    subcategories: [
      { id: 'food_supermarket', name: 'Supermercado', keywords: ['súper', 'supermercado', 'walmart', 'soriana'] },
      { id: 'food_restaurant', name: 'Restaurante', keywords: ['restaurante', 'comida en restaurante'] },
      { id: 'food_coffee', name: 'Café', keywords: ['café', 'starbucks'] },
      { id: 'food_alcohol', name: 'Alcohol', keywords: ['alcohol', 'cerveza', 'peda', 'copas'] },
      { id: 'food_fastfood', name: 'Comida rápida', keywords: ['comida rápida', 'mcdonalds', 'burger'] },
      { id: 'food_snacks', name: 'Snacks', keywords: ['snacks', 'botana'] },
      { id: 'food_sweets', name: 'Dulces', keywords: ['dulces'] },
      { id: 'food_delivery', name: 'Delivery', keywords: ['delivery', 'uber eats', 'rappi', 'didi food'] },
      { id: 'food_other', name: 'Otros', keywords: ['comida'] },
    ],
  },
  {
    id: 'entertainment',
    name: 'Entretenimiento',
    icon: 'entertainment',
    subcategories: [
      { id: 'ent_cinema', name: 'Cine', keywords: ['cine', 'película'] },
      { id: 'ent_concerts', name: 'Conciertos', keywords: ['concierto'] },
      { id: 'ent_hobbies', name: 'Hobbies', keywords: ['hobby', 'pasatiempo'] },
      { id: 'ent_videogames', name: 'Videojuegos', keywords: ['videojuego', 'steam', 'playstation'] },
      { id: 'ent_sports', name: 'Deportes', keywords: ['deporte', 'gimnasio', 'gym'] },
      { id: 'ent_bowling', name: 'Boliche', keywords: ['boliche'] },
      { id: 'ent_clubs', name: 'Discotecas', keywords: ['antro', 'discoteca'] },
      { id: 'ent_streaming', name: 'Streaming', keywords: ['netflix', 'streaming', 'disney+', 'hbo', 'spotify'] },
      { id: 'ent_subscriptions', name: 'Suscripciones', keywords: ['suscripción', 'membresía'] },
      { id: 'ent_events', name: 'Eventos', keywords: ['evento'] },
      { id: 'ent_vacation', name: 'Vacaciones', keywords: ['vacaciones'] },
      { id: 'ent_other', name: 'Otros', keywords: ['entretenimiento', 'vida social'] },
    ],
  },
  {
    id: 'lifestyle',
    name: 'Estilo de vida',
    icon: 'lifestyle',
    subcategories: [
      { id: 'life_gifts', name: 'Regalos', keywords: ['regalo'] },
      { id: 'life_pets', name: 'Mascotas', keywords: ['mascota', 'perro', 'gato', 'veterinario'] },
      { id: 'life_donations', name: 'Donaciones', keywords: ['donación', 'donativo'] },
      { id: 'life_personal', name: 'Compras personales', keywords: ['compra personal'] },
      { id: 'life_travel', name: 'Viajes', keywords: ['viaje', 'vuelo', 'hotel'] },
      { id: 'life_experiences', name: 'Experiencias', keywords: ['experiencia'] },
      { id: 'life_other', name: 'Otros', keywords: [] },
    ],
  },
  {
    id: 'health',
    name: 'Salud',
    icon: 'health',
    subcategories: [
      { id: 'health_doctor', name: 'Médico', keywords: ['doctor', 'médico', 'consulta'] },
      { id: 'health_pharmacy', name: 'Farmacia', keywords: ['farmacia', 'medicina'] },
      { id: 'health_dentist', name: 'Dentista', keywords: ['dentista'] },
      { id: 'health_mental', name: 'Salud mental', keywords: ['psicólogo', 'terapia'] },
      { id: 'health_hygiene', name: 'Aseo personal', keywords: ['aseo personal'] },
      { id: 'health_insurance', name: 'Seguro médico', keywords: ['seguro médico', 'seguro de gastos médicos'] },
      { id: 'health_other', name: 'Otros', keywords: ['salud'] },
    ],
  },
  {
    id: 'income',
    name: 'Ingresos',
    icon: 'income',
    subcategories: [
      { id: 'inc_salary', name: 'Salario', keywords: ['sueldo', 'salario', 'nómina', 'me pagaron'] },
      { id: 'inc_bonus', name: 'Bonos', keywords: ['bono', 'aguinaldo'] },
      { id: 'inc_investments', name: 'Inversiones', keywords: ['rendimiento inversión'] },
      { id: 'inc_dividends', name: 'Dividendos', keywords: ['dividendo'] },
      { id: 'inc_interest', name: 'Intereses', keywords: ['interés', 'intereses'] },
      { id: 'inc_freelance', name: 'Freelance', keywords: ['freelance', 'chamba', 'proyecto'] },
      { id: 'inc_allowance', name: 'Mesada', keywords: ['mesada'] },
      { id: 'inc_gifts', name: 'Regalos', keywords: ['me regalaron'] },
      { id: 'inc_other', name: 'Otros', keywords: ['ingreso'] },
    ],
  },
  {
    id: 'transport',
    name: 'Transporte',
    icon: 'transport',
    subcategories: [
      { id: 'trans_uber', name: 'Uber', keywords: ['uber'] },
      { id: 'trans_didi', name: 'DiDi', keywords: ['didi'] },
      { id: 'trans_taxi', name: 'Taxi', keywords: ['taxi'] },
      { id: 'trans_public', name: 'Transporte público', keywords: ['metro', 'camión', 'metrobús', 'transporte público'] },
      { id: 'trans_gas', name: 'Gasolina', keywords: ['gasolina', 'gasolinera'] },
      { id: 'trans_flights', name: 'Vuelos', keywords: ['vuelo', 'avión', 'aeroméxico', 'volaris'] },
      { id: 'trans_carrental', name: 'Renta de coche', keywords: ['renta de coche', 'renta de auto'] },
      { id: 'trans_parking', name: 'Estacionamiento', keywords: ['estacionamiento'] },
      { id: 'trans_tolls', name: 'Peajes', keywords: ['peaje', 'caseta'] },
      { id: 'trans_maintenance', name: 'Mantenimiento', keywords: ['taller', 'mantenimiento coche'] },
      { id: 'trans_other', name: 'Otros', keywords: ['transporte'] },
    ],
  },
  {
    id: 'debt',
    name: 'Deudas',
    icon: 'debt',
    subcategories: [
      { id: 'debt_creditcard', name: 'Tarjeta de crédito', keywords: ['tarjeta de crédito', 'pago tarjeta'] },
      { id: 'debt_student', name: 'Préstamo estudiantil', keywords: ['préstamo estudiantil'] },
      { id: 'debt_personal', name: 'Préstamo personal', keywords: ['préstamo personal'] },
      { id: 'debt_mortgage', name: 'Hipoteca', keywords: ['hipoteca deuda'] },
      { id: 'debt_other', name: 'Otros', keywords: ['deuda'] },
    ],
  },
  {
    id: 'investments',
    name: 'Inversiones',
    icon: 'investments',
    subcategories: [
      { id: 'inv_stocks', name: 'Acciones', keywords: ['acción', 'acciones'] },
      { id: 'inv_etfs', name: 'ETFs', keywords: ['etf'] },
      { id: 'inv_fibras', name: 'FIBRAs', keywords: ['fibra'] },
      { id: 'inv_cetes', name: 'CETES', keywords: ['cetes'] },
      { id: 'inv_bonds', name: 'Bonos', keywords: ['bono'] },
      { id: 'inv_funds', name: 'Fondos', keywords: ['fondo de inversión'] },
      { id: 'inv_crypto', name: 'Criptomonedas', keywords: ['cripto', 'bitcoin', 'ethereum'] },
      { id: 'inv_other', name: 'Otros', keywords: ['invertí', 'inversión'] },
    ],
  },
];

export function findCategory(categoryId: string): CategoryDef | undefined {
  return DEFAULT_CATEGORIES.find((c) => c.id === categoryId);
}

export function findSubcategory(categoryId: string, subcategoryId: string) {
  return findCategory(categoryId)?.subcategories.find((s) => s.id === subcategoryId);
}

// Subcategoría razonable cuando el usuario elige solo la categoría general
// (p. ej. al completar información faltante en la captura rápida).
export function fallbackSubcategoryId(categoryId: string): string {
  const cat = findCategory(categoryId);
  if (!cat || cat.subcategories.length === 0) return '';
  const other = cat.subcategories.find((s) => s.id.endsWith('_other'));
  return (other ?? cat.subcategories[0]).id;
}

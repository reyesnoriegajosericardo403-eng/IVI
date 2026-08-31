// Copy contextual y determinista para los banners del Dashboard — nunca
// aleatorio (misma fecha/hora = mismo resultado siempre), varía según la
// hora del día, el día del mes y si ya existe un presupuesto armado
// (spec: "este es solo un anuncio de varios que deben cambiar de
// acuerdo a la hora del día y del día del mes").

export function greetingIcon(ref = new Date()): string {
  const hour = ref.getHours();
  if (hour < 6) return '🌙';
  if (hour < 12) return '☀️';
  if (hour < 19) return '🌤️';
  return '🌙';
}

export interface BudgetBanner {
  title: string;
  cta: string;
}

export function getBudgetBanner(hasBudget: boolean, ref = new Date()): BudgetBanner {
  const day = ref.getDay(); // 0 domingo, 6 sábado
  const isWeekend = day === 0 || day === 6;
  const dayOfMonth = ref.getDate();
  const hour = ref.getHours();

  if (!hasBudget) {
    if (hour < 12) {
      return { title: 'Buen día para empezar: el primer paso es hacer tu presupuesto', cta: 'Crear presupuesto rápido' };
    }
    return { title: 'Para que todo funcione, el primer paso es hacer tu presupuesto', cta: 'Crear presupuesto rápido' };
  }

  if (isWeekend) {
    return { title: 'Es fin de semana — buen momento para actualizar tu presupuesto', cta: 'Revisar presupuesto' };
  }
  if (dayOfMonth >= 25) {
    return { title: 'Se acerca fin de mes — checa cómo te fue con tu presupuesto', cta: 'Revisar presupuesto' };
  }
  if (dayOfMonth <= 5) {
    return { title: 'Arranca el mes — confirma que tu presupuesto siga reflejando tus planes', cta: 'Revisar presupuesto' };
  }
  return { title: 'Recuerda actualizar tu presupuesto cada fin de semana o mes', cta: 'Revisar presupuesto' };
}

const BUDGET_TIPS = [
  'Separa lo fijo de lo variable — así ves rapidísimo en qué tienes más control.',
  'Revisa primero tu categoría de mayor gasto: ahí es donde un pequeño ajuste rinde más.',
  'HOY, LUEGO y COMPARTIR: si algo no encaja claro en un grupo, probablemente sea un antojo.',
  'Un presupuesto no es una jaula, es un mapa — ajústalo cuando tu vida cambie.',
  'Anota también tus ingresos variables: aunque no sean seguros, te ayudan a planear mejor.',
];

// Un tip distinto cada día del mes, siempre el mismo tip en el mismo día
// (nunca aleatorio, para que no cambie solo con recargar la pantalla).
export function getDailyBudgetTip(ref = new Date()): string {
  return BUDGET_TIPS[ref.getDate() % BUDGET_TIPS.length];
}

import type { Currency } from '@/data/types';
import { formatCurrency } from './format';

// Motor de "nudging" financiero — evalúa reglas de comportamiento de gasto
// (inspiradas en la regla 50/30/20 y en contabilidad mental) sobre datos
// YA REALES del usuario (lo que gastó, lo que espera ganar) y devuelve
// mensajes empáticos, nunca de culpa (spec: "cero culpa", "oportunidad vs
// restricción"). Se evalúa en cada render del Dashboard — como no hay
// notificaciones push reales en esta app todavía, todas las reglas se
// muestran como el mismo tipo de anuncio (BANNER_HOME), incluida la que el
// pedido original marcaba como "push".

export type InsightTone = 'caution' | 'opportunity' | 'celebration';

export interface FinancialInsight {
  id: string;
  priority: 'high' | 'medium' | 'low';
  tone: InsightTone;
  title: string;
  message: string;
}

interface InsightInputs {
  gastosHoy: number;
  gastosLuego: number;
  ingresoMensual: number;
  currentDay: number;
  totalDaysInMonth: number;
  currency: Currency;
}

const PRIORITY_WEIGHT: Record<FinancialInsight['priority'], number> = { high: 3, medium: 2, low: 1 };

export function evaluateFinancialInsights(input: InsightInputs): FinancialInsight[] {
  const { gastosHoy, gastosLuego, ingresoMensual, currentDay, totalDaysInMonth, currency } = input;
  const insights: FinancialInsight[] = [];

  // Sin un ingreso mensual conocido (ni presupuestado ni real) no hay base
  // confiable para ninguna de estas reglas — nunca se inventa un porcentaje.
  if (ingresoMensual <= 0) return insights;

  const pctHoy = gastosHoy / ingresoMensual;
  const pctMonthElapsed = currentDay / totalDaysInMonth;

  // regla_50_30_20_hoy_avanzada
  if (pctHoy > 0.55 && pctMonthElapsed < 0.7) {
    insights.push({
      id: 'regla_50_30_20_hoy_avanzada',
      priority: 'medium',
      tone: 'caution',
      title: 'Oye, tranqui con la cartera 🛑',
      message: `Tus gastos de Hoy ya van en el ${Math.round(pctHoy * 100)}% de tus ingresos y todavía falta mes. ¿Qué tal si bajamos un cambio a las salidas y antojitos este fin de semana?`,
    });
  }

  // contabilidad_mental_luego_optimizada
  if (pctHoy < 0.4 && gastosLuego === 0 && currentDay > 10) {
    insights.push({
      id: 'contabilidad_mental_luego_optimizada',
      priority: 'low',
      tone: 'opportunity',
      title: 'Traes buen margen hoy 🚀',
      message: 'Tus cuentas diarias van al corriente y sobra un respiro. Si mandas un cachito a tu bolsa de "Luego", tu futuro yo te lo va a agradecer macizo.',
    });
  }

  // burn_rate_predictivo_inteligente
  if (currentDay >= 15 && currentDay <= 25) {
    const proyectado = (gastosHoy / currentDay) * totalDaysInMonth;
    if (proyectado > ingresoMensual) {
      const diferencia = proyectado - ingresoMensual;
      insights.push({
        id: 'burn_rate_predictivo_inteligente',
        priority: 'high',
        tone: 'caution',
        title: 'Ajuste de velocidad preventivo 🏎️',
        message: `A este ritmo de gasto diario, la segunda mitad del mes se pondrá apretada por unos ${formatCurrency(diferencia, currency)}. ¿Echamos un ojo rápido a los gastos hormiga de esta semana?`,
      });
    }
  }

  // premio_disciplina_quincenal
  if ((currentDay === 15 || currentDay === totalDaysInMonth) && pctHoy < 0.45) {
    insights.push({
      id: 'premio_disciplina_quincenal',
      priority: 'low',
      tone: 'celebration',
      title: '¡Quincena dominada! 🎯',
      message: 'Mantuviste raya en tus gastos operativos este ciclo. Lograste blindar tu presupuesto perfectamente. ¡Vas con excelente paso!',
    });
  }

  return insights.sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
}

import { Platform } from 'react-native';

import { generateId } from '@/utils/id';
import { supabase } from './client';

export interface SurveyAnswers {
  age?: string;
  sex?: string;
  occupation?: string;
  goal?: string;
  experience?: string;
  discovery?: string;
  challenge?: string;
}

// Escritura única, sin sincronización bidireccional — la app nunca vuelve
// a leer esto (spec: "recolectar información que podamos usar para
// mejorar la aplicación... y ver a quiénes llegamos y cómo llegamos").
// Es de mejor esfuerzo a propósito: si falla o no hay Supabase
// conectado, el onboarding sigue de largo — nunca debe bloquear a
// alguien por un envío de encuesta.
export async function submitSurveyResponse(userId: string, answers: SurveyAnswers): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('survey_responses').insert({
      id: generateId(),
      user_id: userId,
      age: answers.age ?? null,
      sex: answers.sex ?? null,
      occupation: answers.occupation ?? null,
      goal: answers.goal ?? null,
      experience: answers.experience ?? null,
      discovery: answers.discovery ?? null,
      challenge: answers.challenge ?? null,
      platform: Platform.OS,
    });
    // No se le muestra nada a la persona (es de mejor esfuerzo, spec
    // arriba), pero sí queda en la consola del navegador — la causa más
    // común es que la migración 0009_survey_responses.sql nunca se corrió
    // en el proyecto real de Supabase (la tabla no existe todavía).
    if (error) console.warn('[VALU] No se pudo guardar la respuesta de la encuesta:', error.message);
  } catch (err) {
    console.warn('[VALU] No se pudo guardar la respuesta de la encuesta:', err);
  }
}

import { Platform } from 'react-native';

import { generateId } from '@/utils/id';
import { supabase } from './client';

export interface SurveyAnswers {
  age?: string;
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
    await supabase.from('survey_responses').insert({
      id: generateId(),
      user_id: userId,
      age: answers.age ?? null,
      occupation: answers.occupation ?? null,
      goal: answers.goal ?? null,
      experience: answers.experience ?? null,
      discovery: answers.discovery ?? null,
      challenge: answers.challenge ?? null,
      platform: Platform.OS,
    });
  } catch {
    // best-effort: nunca truena el onboarding por esto
  }
}

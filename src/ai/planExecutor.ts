// Ejecutor de planes (P2, docs/03_fase2_contratos_v1.md §5). Puro: recibe cómo aplicar un paso y cómo guardar el
// progreso, así se prueba sin la app (scripts/golden/planes.cjs) y el store solo conecta los cables.
// Reglas:
//  1. Un plan que no está en 'proposed' se rechaza (idempotencia: doble toque, reintento de red, dos pestañas).
//  2. Se marca 'applying' y se GUARDA antes de tocar el primer paso: un segundo intento ya lo ve y se rechaza.
//  3. Los pasos se aplican en orden, uno por uno; el progreso se guarda después de cada paso (si la app se
//     cierra a la mitad, queda lo que sí se alcanzó a hacer).
//  4. Si un paso falla NO se revierte lo ya aplicado (deshacer un movimiento ya sincronizado es más riesgoso
//     que dejarlo) y NO se siguen aplicando los siguientes (pueden depender de él): el plan queda
//     'partially_applied' (o 'failed' si nada se aplicó) con el detalle de cada paso. Nunca se reintenta solo.
import type { ActionPlan, AIActionProposal, PlanStatus } from './chatTypes';

export interface ApplyStepResult {
  ok: boolean;
  error?: string;
}

export interface ExecuteDeps {
  apply: (step: AIActionProposal) => ApplyStepResult;
  // Guarda el plan tal como va (el store lo escribe en el mensaje del chat).
  persist: (plan: ActionPlan) => void;
  now?: () => string;
  // Después de aplicar bien un paso (auditoría).
  onStepApplied?: (step: AIActionProposal, index: number, plan: ActionPlan) => void;
  // Al terminar (auditoría del plan completo).
  onFinished?: (plan: ActionPlan) => void;
}

export interface ExecuteResult {
  ok: boolean; // true solo si TODOS los pasos se aplicaron
  status: PlanStatus;
  plan: ActionPlan;
  error?: string;
}

function statusFromSteps(steps: AIActionProposal[]): PlanStatus {
  const applied = steps.filter((s) => s.status === 'applied').length;
  if (applied === steps.length) return 'applied';
  return applied > 0 ? 'partially_applied' : 'failed';
}

export function executePlan(plan: ActionPlan, deps: ExecuteDeps): ExecuteResult {
  const now = deps.now ?? (() => new Date().toISOString());
  if (plan.status !== 'proposed') {
    return { ok: false, status: plan.status, plan, error: 'Este plan ya fue procesado.' };
  }
  if (plan.steps.length === 0) {
    return { ok: false, status: plan.status, plan, error: 'El plan no tiene pasos.' };
  }

  let current: ActionPlan = { ...plan, status: 'applying', steps: plan.steps.map((s) => ({ ...s })) };
  deps.persist(current); // ← aquí se "cierra la puerta" a un segundo intento

  let error: string | undefined;
  for (let i = 0; i < current.steps.length; i++) {
    const step = current.steps[i];
    if (step.status !== 'proposed') continue; // un paso ya procesado nunca se repite
    let result: ApplyStepResult;
    try {
      result = deps.apply(step);
    } catch (e) {
      result = { ok: false, error: e instanceof Error ? e.message : 'Error inesperado' };
    }
    const steps = current.steps.slice();
    if (result.ok) {
      steps[i] = { ...step, status: 'applied', appliedAt: now() };
      current = { ...current, steps };
      deps.persist(current);
      try {
        deps.onStepApplied?.(steps[i], i, current);
      } catch {
        // la auditoría nunca debe tumbar la aplicación
      }
    } else {
      error = result.error ?? 'No se pudo aplicar';
      steps[i] = { ...step, status: 'failed', error };
      for (let j = i + 1; j < steps.length; j++) {
        if (steps[j].status === 'proposed') steps[j] = { ...steps[j], status: 'skipped' };
      }
      current = { ...current, steps };
      break;
    }
  }

  const status = statusFromSteps(current.steps);
  current = { ...current, status, appliedAt: status === 'failed' ? undefined : now() };
  deps.persist(current);
  try {
    deps.onFinished?.(current);
  } catch {
    // idem
  }
  return { ok: status === 'applied', status, plan: current, error };
}

// Si la app se cerró a mitad de una aplicación, el plan quedó en 'applying' para siempre. Al volver a abrir se
// cierra con lo que de verdad se alcanzó a aplicar (los pasos que quedaron sin tocar se marcan 'skipped').
export function recoverInterruptedPlan(plan: ActionPlan): ActionPlan {
  if (plan.status !== 'applying') return plan;
  const steps = plan.steps.map((s) => (s.status === 'proposed' ? { ...s, status: 'skipped' as const } : s));
  return { ...plan, steps, status: statusFromSteps(steps) };
}

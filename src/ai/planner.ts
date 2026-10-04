// Planificador multi-acción (P2, docs/03_fase2_contratos_v1.md §1-§4). Convierte UN mensaje en cero, una o
// varias acciones del catálogo cerrado (actionCatalog.ts), SIN tocar datos: solo propone. Reglas:
// - Cada paso se resuelve y valida por separado con los mismos resolvers de siempre; un plan nunca lleva un
//   paso a medio resolver (si falta un dato se pregunta, §2).
// - Con un solo trozo de texto se comporta EXACTAMENTE como antes (detectChatIntent).
// - Con varios, solo se parte donde empieza otra instrucción (un verbo de acción), nunca "a la mitad" de un
//   nombre ("ahorros y metas"). Si el corte no da pasos válidos se vuelve al mensaje completo.
// - Los efectos (saldos resultantes) se calculan sobre una copia, en orden, y nunca escriben nada.

import { detectChatIntent } from './chatIntentParser';
import { accountHintFor } from './catalogCommon';
import { simulateStep } from './virtualIds';
import {
  resolveAddTransaction,
  resolveCandidate,
  type ActionValidationContext,
  type ResolveResult,
} from './actionCatalog';
import type { AIActionType, InterpretedMessage, MissingField, PendingClarification, PlanEffect, ResolvedAction } from './chatTypes';
import { extractDate } from './dates';
import { extractAmount, normalize, parseCaptureText } from './localParser';
import { parseISODate } from '@/utils/date';
import { accountDeltasForTransaction, reverseDeltas, signedDeltaForAccount } from '@/utils/ledger';
import { formatCurrency } from '@/utils/format';
import type { Transaction } from '@/data/types';

export interface PlannedStep {
  action: ResolvedAction;
  summary: string;
}

export type PlanOutcome =
  | { kind: 'none' } // no se entendió como acción: que responda el copiloto de lectura
  | { kind: 'single'; step: PlannedStep; note?: string }
  | { kind: 'plan'; steps: PlannedStep[]; note?: string }
  | { kind: 'clarification'; reply: string; pending: PendingClarification }
  | { kind: 'reply'; reply: string }; // se entendió la intención pero no se puede (y no hay nada que preguntar)

export const MAX_PLAN_STEPS = 6;

// ---------- Partir un mensaje en instrucciones ----------

// Verbos con los que empieza una instrucción nueva. Todo en minúsculas y con y sin acento.
const START_VERBS = [
  'transfiere', 'transferir', 'transfiérele', 'pasa', 'pasar', 'pásale', 'pasale', 'mueve', 'mover', 'manda', 'mandar', 'envía', 'envia', 'enviar',
  'agrega', 'agrégale', 'agregale', 'agregar', 'añade', 'anade', 'crea', 'crear', 'abre', 'abrir',
  'borra', 'borrar', 'elimina', 'eliminar', 'quita', 'quitar', 'quítale', 'quitale', 'sácale', 'sacale', 'saca', 'sacar',
  'registra', 'regístrame', 'registrame', 'registrar', 'anota', 'anótame', 'anotame', 'apunta', 'apúntame', 'apuntame',
  'abona', 'abonar', 'aporta', 'aportar', 'actualiza', 'actualizar', 'cambia', 'cambiar', 'pon', 'poner', 'ponle',
  'presupuesta', 'presupuestar', 'paga', 'pagar', 'págale', 'pagale', 'ahorra', 'ahorrar', 'suma', 'sumar', 'resta', 'restar',
  'deposita', 'depositar', 'retira', 'retirar',
  'recuérdame', 'recuerdame', 'avísame', 'avisame', 'pausa', 'pausar', 'reanuda', 'reanudar', 'termina', 'terminar', 'pospón', 'pospon', 'pospone', 'confirma', 'omite',
  'salda', 'saldar', 'liquida', 'liquidé', 'liquide', 'abonó', 'ya pagué', 'ya pague', 'ya cobré', 'ya cobre', 'no pagué', 'no pague', 'me llegó un dividendo', 'cobré dividendos',
  'gasté', 'gaste', 'pagué', 'pague', 'compré', 'compre', 'cobré', 'cobre', 'recibí', 'recibi', 'me depositaron', 'me pagaron',
];
const START = `(?:${START_VERBS.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?=\\s|$)`;
// "…y el sábado compré…", "…y hoy pagué…": una instrucción nueva puede abrir con el día en que ocurrió
const LEAD_DAY = '(?:(?:el\\s+(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)|el\\s+\\d{1,2}(?:\\s+de\\s+\\p{L}+)?|ayer|hoy|antier|anteayer|anoche|mañana)\\s+)?';
const SPLIT_RE = new RegExp(
  [
    '\\s*[;\\n]+\\s*',
    `\\s*[.,]\\s+(?=(?:y\\s+|luego\\s+|después\\s+|despues\\s+)?${START})`,
    '\\s+(?:y\\s+)?(?:luego|después|despues|además|ademas|también|tambien|enseguida)\\s+(?:y\\s+)?',
    `\\s+y\\s+(?=${LEAD_DAY}${START})`,
  ].join('|'),
  'iu'
);

export function splitPlanSegments(rawText: string): string[] {
  // Se colapsan las tiradas de espacios (no los saltos de línea, que sí separan): una tirada larga de espacios
  // haría cuadrática la búsqueda de separadores.
  return rawText
    .replace(/[^\S\n]+/g, ' ')
    .split(SPLIT_RE)
    .map((s) => s.trim().replace(/^[,.;\s]+|[,.;\s]+$/g, ''))
    .filter((s) => s.length >= 3);
}

// Verbos que indican "anota esto que ya pasó / pídele al sistema que lo registre". Sin uno de estos, un
// trozo que solo trae monto y tema ("la renta 8000") NO se vuelve un movimiento por su cuenta.
const RECORD_VERB_RE = /\b(gaste|pague|compre|cobre|recibi|registra|registrame|registrar|anota|anotame|apunta|apuntame|me depositaron|me pagaron|me cayo)\b/;

// "Hoy" del planificador: el de la propia validación (las pruebas lo fijan) o el del dispositivo.
const nowOf = (ctx: ActionValidationContext): Date => (ctx.today ? parseISODate(ctx.today) : new Date());

// ---------- Resolver cada trozo ----------

// "Gasté 200 en tacos con mi BBVA" → add_transaction categorizado, con el motor de captura de siempre.
function resolveRecordSegment(segment: string, ctx: ActionValidationContext): ResolveResult | null {
  const normalized = normalize(segment);
  if (!RECORD_VERB_RE.test(normalized)) return null;
  const parsed = parseCaptureText(segment, nowOf(ctx));
  if (parsed.type !== 'expense' && parsed.type !== 'income') return null; // ahorro/inversión: aún no son acciones del catálogo
  return resolveAddTransaction(
    {
      transactionType: parsed.type,
      amount: parsed.amount ?? undefined,
      accountNameHint: accountHintFor(normalized, ctx),
      categoryId: parsed.categoryId ?? undefined,
      subcategoryId: parsed.subcategoryId ?? undefined,
      date: parsed.dateIso, // "ayer", "el viernes"… (solo días pasados)
    },
    ctx
  );
}

function resolveSegment(segment: string, ctx: ActionValidationContext, allowRecord: boolean): ResolveResult | null {
  const intent = detectChatIntent(segment, ctx, nowOf(ctx));
  if (intent) return intent;
  return allowRecord ? resolveRecordSegment(segment, ctx) : null;
}

function pendingFrom(r: Extract<ResolveResult, { ok: false }>): PendingClarification | null {
  if (!r.clarification) return null;
  return { contractVersion: 1, ...r.clarification, status: 'open' };
}

const toStep = (r: Extract<ResolveResult, { ok: true }>): PlannedStep => ({ action: r.action, summary: r.summary });

function fromSingle(r: ResolveResult | null): PlanOutcome {
  if (!r) return { kind: 'none' };
  if (r.ok) return { kind: 'single', step: toStep(r) };
  const pending = pendingFrom(r);
  return pending ? { kind: 'clarification', reply: r.reason, pending } : { kind: 'reply', reply: r.reason };
}

// ---------- Planificar ----------

// Un mensaje de chat con una instrucción real mide decenas de caracteres; más de esto es un texto pegado por error
// (o un intento de congelar la pantalla) y no se intenta leer como acciones: lo contesta el copiloto.
export const MAX_PLAN_TEXT_CHARS = 4000;

export function planFromText(rawText: string, ctx: ActionValidationContext): PlanOutcome {
  if (rawText.length > MAX_PLAN_TEXT_CHARS) return { kind: 'none' };
  const segments = splitPlanSegments(rawText);
  const whole = () => detectChatIntent(rawText, ctx, nowOf(ctx));
  if (segments.length <= 1) {
    const single = fromSingle(whole());
    // Respaldo: "Banorte vence el 25 y Coppel vence el 28" no trae un verbo tras la "y", pero cada lado es una
    // instrucción COMPLETA. Si el mensaje entero no se entendió (o era ambiguo), se prueba partirlo en cada "y".
    if (single.kind === 'none' || single.kind === 'reply') return splitOnAnd(rawText, ctx) ?? single;
    return single;
  }
  if (segments.length > MAX_PLAN_STEPS) {
    return { kind: 'reply', reply: `Son demasiadas instrucciones juntas (máximo ${MAX_PLAN_STEPS}). Mándalas en dos mensajes.` };
  }
  return combineResults(segments, resolveSequentially(segments, ctx), whole);
}

// Cada instrucción se valida contra el contexto COMO QUEDARÍA tras las anteriores (P3): "crea la cuenta Nu y transfiere 500
// de BBVA a Nu" ve a Nu como una cuenta con id virtual (src/ai/virtualIds.ts); "retira 800 de la meta X" tras "aporta 500"
// usa el saldo ya aportado; "borra la meta X y aporta a X" falla en el segundo paso.
function resolveSequentially(segments: string[], ctx: ActionValidationContext): Array<ResolveResult | null> {
  let cur = ctx;
  return segments.map((seg) => {
    const r = resolveSegment(seg, cur, true);
    if (r?.ok) cur = simulateStep(cur, r.action.type, r.action.args as unknown as Record<string, unknown>);
    return r;
  });
}

// Parte el mensaje en una "y" (de las primeras 3) y exige que AMBOS lados sean una acción completa y válida.
function splitOnAnd(rawText: string, ctx: ActionValidationContext): PlanOutcome | null {
  const matches = [...rawText.matchAll(/\s+y\s+/gi)].slice(0, 3);
  for (const m of matches) {
    const left = rawText.slice(0, m.index).trim();
    const right = rawText.slice(m.index! + m[0].length).trim();
    if (left.length < 5 || right.length < 5) continue;
    const a = resolveSegment(left, ctx, true);
    const b = a?.ok ? resolveSegment(right, simulateStep(ctx, a.action.type, a.action.args as unknown as Record<string, unknown>), true) : null;
    if (a?.ok && b?.ok) return { kind: 'plan', steps: [toStep(a), toStep(b)] };
  }
  return null;
}

// Junta los resultados de resolver cada instrucción (vengan de reglas locales o de un modelo de IA: el
// resultado ya pasó por el mismo catálogo). `null` = no se entendió esa instrucción. `whole` es el respaldo
// cuando el corte no dio nada utilizable (comportamiento de siempre con el mensaje completo).
export function combineResults(segments: string[], results: Array<ResolveResult | null>, whole: () => ResolveResult | null): PlanOutcome {
  if (results.length === 1) return results[0] === null ? fromSingle(whole()) : fromSingle(results[0]);
  const oks: PlannedStep[] = [];
  const unclear: string[] = [];
  const failures: string[] = [];
  let pendingIndex = -1; // posición del paso por aclarar dentro del plan
  let pendingErr: Extract<ResolveResult, { ok: false }> | null = null;
  let pendingSegment = '';
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r === null) unclear.push(segments[i]);
    else if (r.ok) oks.push(toStep(r));
    else if (r.clarification && !pendingErr) {
      pendingIndex = oks.length;
      pendingErr = r;
      pendingSegment = segments[i];
    } else failures.push(`«${segments[i]}»: ${r.reason}`);
  }

  // Un solo paso necesita un dato: se pregunta y se conserva lo ya resuelto en el mismo mensaje.
  if (pendingErr && failures.length === 0 && unclear.length === 0) {
    const err: Extract<ResolveResult, { ok: false }> = pendingErr;
    const base = pendingFrom(err)!;
    return {
      kind: 'clarification',
      reply: oks.length ? `Entendí ${oks.length} de ${results.length} pasos. ${err.reason}` : err.reason,
      pending: { ...base, resolvedSteps: oks.map((s) => ({ type: s.action.type, args: s.action.args as unknown as Record<string, unknown>, summary: s.summary })), index: pendingIndex },
    };
  }

  if (pendingErr || failures.length > 0) {
    const first = pendingErr ? [`«${pendingSegment}»: ${(pendingErr as Extract<ResolveResult, { ok: false }>).reason}`] : [];
    return { kind: 'reply', reply: `No pude armar el plan completo:\n${[...first, ...failures].map((f) => `• ${f}`).join('\n')}\nEscríbelo con más detalle o mándalo por partes.` };
  }

  const note = unclear.length ? `No entendí esto y no lo incluí: ${unclear.map((u) => `«${u}»`).join(', ')}.` : undefined;
  if (oks.length >= 2) return { kind: 'plan', steps: oks, note };
  if (oks.length === 1) {
    // El corte pudo ser un error ("transfiere 500 de A a B y C"): se prefiere el mensaje completo si da una acción.
    const all = whole();
    if (all?.ok) return { kind: 'single', step: toStep(all) };
    return { kind: 'single', step: oks[0], note };
  }
  // Ninguna instrucción dio una acción: comportamiento de siempre con el mensaje completo.
  return fromSingle(whole());
}

// ---------- Contestar una pregunta de aclaración ----------

const CANCEL_RE = /^(cancela|cancelar|cancelalo|olvidalo|olvida|no|ya no|nada|mejor no|deja|dejalo|no importa)$/;
const FILLER_RE = /^(en|a|la|el|mi|es|de|con|desde|hacia|para|pues|la cuenta|mi cuenta|la meta|mi meta|la deuda|mi deuda)\s+/i;

function cleanAnswer(answer: string): string {
  let a = answer.trim().replace(/[.!?¡¿]+$/g, '');
  for (let i = 0; i < 3 && FILLER_RE.test(a); i++) a = a.replace(FILLER_RE, '');
  return a.trim();
}

// Devuelve null cuando el texto NO parece una respuesta (la persona cambió de tema): quien llama lo trata como
// mensaje nuevo y marca la pregunta como superada.
export function answerClarification(pending: PendingClarification, answer: string, ctx: ActionValidationContext): PlanOutcome | null {
  const norm = normalize(answer);
  if (CANCEL_RE.test(norm)) return { kind: 'reply', reply: 'Listo, lo dejé como estaba. No se aplicó nada.' };
  const words = norm.split(' ').filter(Boolean);
  const missing: MissingField | undefined = pending.missing[0];
  if (!missing) return null;

  const candidate = { ...pending.candidate };
  if (missing.field === 'date') {
    // un movimiento real solo puede ser de hoy o pasado; una fecha objetivo / vencimiento, futura
    const day = extractDate(answer, nowOf(ctx), { prefer: pending.type === 'add_transaction' ? 'past' : 'future' });
    if (!day || words.length > 8) return null;
    candidate[missing.slot] = day.iso;
  } else if (missing.field === 'amount') {
    const amount = extractAmount(answer);
    if (amount === null || words.length > 8) return null;
    candidate[missing.slot] = amount;
  } else {
    const hint = cleanAnswer(answer);
    if (hint.length < 2 || words.length > 6) return null;
    candidate[missing.slot] = hint;
  }

  const result = resolveCandidate(pending.type as AIActionType, candidate, ctx);
  if (!result.ok) {
    const again = pendingFrom(result);
    // Misma pregunta otra vez (respuesta corta que no sirvió, p. ej. un nombre mal escrito): se repite, sin
    // reiniciar nada. Una respuesta larga ya no parece respuesta.
    if (again && words.length <= 4) {
      return { kind: 'clarification', reply: result.reason, pending: { ...again, resolvedSteps: pending.resolvedSteps, index: pending.index } };
    }
    return again ? null : { kind: 'reply', reply: result.reason };
  }

  const step = toStep(result);
  const done = pending.resolvedSteps ?? [];
  if (done.length === 0) return { kind: 'single', step };
  const steps: PlannedStep[] = done.map((d) => ({ action: { type: d.type, args: d.args } as unknown as ResolvedAction, summary: d.summary }));
  steps.splice(Math.min(pending.index ?? steps.length, steps.length), 0, step);
  return { kind: 'plan', steps };
}

// ---------- Efectos agregados (§4) y avisos ----------

export interface PlanPreview {
  effects: PlanEffect[];
  warnings: string[];
}

// Aplica los pasos EN ORDEN sobre una copia de cuentas/metas/deudas. No toca el estado real. Solo calcula lo
// que el catálogo ya sabe mover (cuentas por el ledger, aportes a metas, saldos de deudas).
export function previewPlan(steps: PlannedStep[], ctx: ActionValidationContext): PlanPreview {
  const accounts = new Map(ctx.accounts.filter((a) => !a.deletedAt).map((a) => [a.id, { a, before: a.balance, now: a.balance, minNow: a.balance, minStep: 0 }]));
  const goals = new Map(ctx.goals.filter((g) => !g.deletedAt).map((g) => [g.id, { g, before: g.currentAmount, now: g.currentAmount }]));
  const liabilities = new Map(ctx.liabilities.filter((l) => !l.deletedAt).map((l) => [l.id, { l, before: l.balance, now: l.balance }]));
  const warnings: string[] = [];

  const moveAccount = (id: string, delta: number, stepNo: number) => {
    const e = accounts.get(id);
    if (!e) return;
    e.now += signedDeltaForAccount(e.a, delta);
    if (e.now < e.minNow) {
      e.minNow = e.now;
      e.minStep = stepNo;
    }
  };

  steps.forEach((step, i) => {
    const n = i + 1;
    const args = step.action.args as unknown as Record<string, any>;
    switch (step.action.type) {
      case 'add_transaction':
        for (const d of accountDeltasForTransaction({ type: args.transactionType, amount: args.amount, accountId: args.accountId })) moveAccount(d.accountId, d.delta, n);
        break;
      case 'transfer_between_accounts':
        for (const d of accountDeltasForTransaction({ type: 'transfer', amount: args.amount, accountId: args.fromAccountId, toAccountId: args.toAccountId })) moveAccount(d.accountId, d.delta, n);
        break;
      case 'delete_transaction': {
        const tx = ctx.recentTransactions.find((t: Transaction) => t.id === args.transactionId);
        if (tx) for (const d of reverseDeltas(accountDeltasForTransaction(tx))) moveAccount(d.accountId, d.delta, n);
        break;
      }
      case 'contribute_to_goal': {
        const e = goals.get(args.goalId);
        if (e) e.now += args.amount;
        break;
      }
      case 'withdraw_from_goal': {
        const e = goals.get(args.goalId);
        if (e) {
          e.now -= args.amount;
          if (e.now < 0) warnings.push(`La meta "${e.g.name}" quedaría en negativo después del paso ${n}.`);
        }
        break;
      }
      case 'update_liability_balance': {
        const e = liabilities.get(args.liabilityId);
        if (e) e.now = args.balance;
        break;
      }
      // ---- P3: solo lo REAL mueve saldos; un previsto nuevo, una regla o un aviso no cambian ninguna cifra ----
      case 'confirm_forecast': {
        const tx = (ctx.forecasts ?? []).find((t: Transaction) => t.id === args.forecastId);
        if (tx) for (const d of accountDeltasForTransaction({ ...tx, amount: args.amount ?? tx.amount, status: 'posted' })) moveAccount(d.accountId, d.delta, n);
        break;
      }
      case 'pay_liability': {
        if (args.accountId) for (const d of accountDeltasForTransaction({ type: args.owedToMe ? 'income' : 'expense', amount: args.amount, accountId: args.accountId })) moveAccount(d.accountId, d.delta, n);
        const e = liabilities.get(args.liabilityId);
        if (e) e.now = Math.max(0, Math.round((e.now - args.amount) * 100) / 100);
        break;
      }
      case 'settle_liability': {
        const e = liabilities.get(args.liabilityId);
        if (e) e.now = 0;
        break;
      }
      case 'register_dividend':
        if (args.accountId) for (const d of accountDeltasForTransaction({ type: 'income', amount: args.amount, accountId: args.accountId })) moveAccount(d.accountId, d.delta, n);
        break;
      default:
        break;
    }
  });

  const effects: PlanEffect[] = [];
  for (const [id, e] of accounts) if (e.now !== e.before) effects.push({ kind: 'account', id, name: e.a.name, currency: e.a.currency, before: e.before, after: e.now });
  for (const [id, e] of goals) if (e.now !== e.before) effects.push({ kind: 'goal', id, name: e.g.name, currency: e.g.currency, before: e.before, after: e.now });
  for (const [id, e] of liabilities) if (e.now !== e.before) effects.push({ kind: 'liability', id, name: e.l.institution, currency: e.l.currency, before: e.before, after: e.now });

  // Avisos: saldo negativo en cuentas que no son tarjeta de crédito, y pasos idénticos.
  for (const [, e] of accounts) {
    if (e.a.type === 'credit_card' || e.a.isLiability) continue;
    if (e.minNow < 0 && e.minNow < Math.min(0, e.before)) {
      warnings.push(`"${e.a.name}" quedaría en ${formatCurrency(e.minNow, e.a.currency)} después del paso ${e.minStep}.`);
    }
  }
  const seen = new Map<string, number>();
  steps.forEach((s, i) => {
    const key = `${s.action.type}|${JSON.stringify(s.action.args)}`;
    const first = seen.get(key);
    if (first !== undefined) warnings.push(`Los pasos ${first + 1} y ${i + 1} son idénticos — ¿seguro que quieres los dos?`);
    else seen.set(key, i);
  });

  return { effects, warnings };
}

// ---------- De resultado del planificador a respuesta del chat ----------

// null = no era una acción (que responda el copiloto de solo lectura).
export function interpretationFrom(outcome: PlanOutcome, ctx: ActionValidationContext): InterpretedMessage | null {
  switch (outcome.kind) {
    case 'none':
      return null;
    case 'reply':
      return { reply: outcome.reply };
    case 'clarification':
      return { reply: outcome.reply, clarification: outcome.pending };
    case 'single': {
      const preview = previewPlan([outcome.step], ctx);
      const tail = preview.warnings.length ? ` ${preview.warnings.join(' ')}` : '';
      return { reply: `${outcome.step.summary}. Mantén presionado para confirmar.${outcome.note ? ` ${outcome.note}` : ''}${tail}`, action: outcome.step.action, summary: outcome.step.summary };
    }
    case 'plan': {
      const preview = previewPlan(outcome.steps, ctx);
      const reply = `Entendí ${outcome.steps.length} pasos, se aplican en este orden. Revísalos y mantén presionado para confirmar todo junto.${outcome.note ? ` ${outcome.note}` : ''}`;
      return { reply, plan: { steps: outcome.steps, effects: preview.effects, warnings: preview.warnings } };
    }
  }
}

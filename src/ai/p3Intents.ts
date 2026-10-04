// Reconocimiento LOCAL de las acciones de P3 en el chat (sin IA conectada): previstos, pagos recurrentes, avisos, pagos de
// deuda y dividendos. Misma filosofía que chatIntentParser.ts: cobertura explícita y angosta; solo actúa sobre algo que
// existe de verdad (por nombre) o trae todo lo necesario (monto + fecha + verbo), y nunca "adivina" a medias. Todo pasa por
// los resolvers de actionCatalogP3.ts, que son quienes validan. Con un modelo de IA conectado, el propio modelo cubre el
// lenguaje libre sobre el mismo catálogo.
import { findMentionedName } from './mentions';
import {
  namedForecasts,
  namedInvestments,
  namedOpenLiabilities,
  namedReminders,
  namedRules,
  resolveAddForecast,
  resolveAddRecurring,
  resolveAddRecurringContribution,
  resolveAddReminder,
  resolveCancelReminder,
  resolveConfirmForecast,
  resolveEndRecurring,
  resolvePauseRecurring,
  resolvePayLiability,
  resolvePostponeForecast,
  resolveRegisterDividend,
  resolveResumeRecurring,
  resolveSetCardDates,
  resolveSettleLiability,
  resolveSkipForecast,
  resolveUpdateRecurringAmount,
} from './actionCatalogP3';
import { accountHintFor, type ActionValidationContext, type ResolveResult } from './catalogCommon';
import { findDateMentions, findTimeMentions, removeRanges } from './dates';
import { extractAmount, normalize, parseCaptureText } from './localParser';
import { findRecurrence } from './recurrenceText';

const has = (n: string, re: RegExp): boolean => re.test(n);

const REMIND_RE = /\b(recuerdame|recuerdamelo|recordarme|recordatorio|avisame|ponme\s+un\s+(?:aviso|recordatorio)|alarma|ponme\s+una\s+alarma|no\s+me\s+dejes\s+olvidar|no\s+se\s+me\s+vaya\s+a\s+olvidar)\b/;
const REMOVE_VERB_RE = /\b(quita|quitar|quitale|quitame|quitamelo|elimina|eliminar|eliminame|borra|borrar|borrame|cancela|cancelar|cancelame|ya\s+no\s+me\s+avises|deja\s+de\s+avisarme)\b/;
const PAST_RECORD_RE = /\b(gaste|pague|compre|cobre|recibi|me\s+depositaron|me\s+pagaron|me\s+cayo|me\s+llego|se\s+me\s+fue)\b/;
const PAY_LIAB_RE = /\b(pague|pagu|paga|pagale|pagar|pago|abona|abonale|abone|abono|abonar|liquide\s+(?:una\s+parte|parcial)|me\s+(?:pago|abono|deposito|transfirio|dio|devolvio|regreso))\b/;
const SETTLE_RE = /\b(liquide|liquidar|liquida|liquidada|ya\s+(?:acabe|termine)\s+de\s+pagar|termine\s+de\s+pagar|acabe\s+de\s+pagar|salda|saldar|saldada|ya\s+no\s+debo|ya\s+no\s+me\s+debe|me\s+pago\s+(?:todo|toda|completo|completa)|pague\s+(?:todo|toda|completa|completo)|ya\s+pague\s+(?:todo|toda)|ya\s+quedo\s+pagad[ao])\b/;
const CONFIRM_RE = /\b(ya\s+(?:pague|cobre|se\s+pago|se\s+cobro|se\s+cargo|me\s+(?:depositaron|pagaron|cayo|llego|abonaron|cobraron|cargaron|transfirieron)|salio|entro|ocurrio|paso|lo\s+hice|hice|ya\s+esta)|confirma|confirmo|confirmar|si\s+(?:se\s+)?(?:pago|ocurrio|cobro))\b/;
const SKIP_RE = /\b(no\s+(?:pague|cobre|me\s+(?:pagaron|depositaron|cayo|llego)|ocurrio|paso|se\s+(?:pago|cobro|cargo|hizo)|hubo)|omite|omitir|omitelo|salta|saltar|ignora|ignorar|se\s+cancelo|ya\s+no\s+va\s+a\s+(?:pasar|ocurrir))\b/;
const POSTPONE_RE = /\b(pospon|pospone|posponer|pospongo|posponlo|aplaza|aplazar|aplazalo|retrasa|retrasar|atrasa|atrasar|mueve|mover|muevelo|cambia|cambiar|cambialo|pasalo|pasa)\b/;
const PAUSE_RE = /\b(pausa|pausar|pausame|suspende|suspender|detén|deten|detener|congela|congelar)\b/;
const RESUME_RE = /\b(reanuda|reanudar|reactiva|reactivar|retoma|retomar|vuelve\s+a\s+activar)\b/;
const END_RE = /\b(termina|terminar|cancela|cancelar|elimina|eliminar|quita|quitar|borra|borrar|da\s+de\s+baja|dar\s+de\s+baja|ya\s+no\s+(?:pago|voy\s+a\s+pagar|quiero\s+pagar|me\s+cobran|me\s+depositan|me\s+pagan))\b/;
const AMOUNT_CHANGE_RE = /\b(subio|sube|subira|bajo|baja|bajara|cambio|cambia|cambiar|actualiza|actualizar|ahora\s+(?:es|son|pago|cuesta|me\s+(?:cobran|depositan|pagan))|aumento|aumenta|ya\s+(?:es|son)|quedo\s+en|queda\s+en|es\s+de|cuesta|serán|seran)\b/;
const INCOME_RE = /\b(me\s+(?:van\s+a\s+)?(?:depositar|depositan|pagan|pagaran|transfieren|llega|llegara|cae|caera|abonan)|me\s+(?:llegan|caen|caeran|llegaran)|voy\s+a\s+cobrar|cobrare|cobro|ingreso|sueldo|nomina|salario|pension|reembolso)\b/;
const FORECAST_TRIGGER_RE = /\b(tengo\s+que\s+pagar|debo\s+pagar|voy\s+a\s+pagar|me\s+toca\s+pagar|pagare|pago|pagar|cobro|cobrare|voy\s+a\s+cobrar|me\s+(?:van\s+a\s+)?(?:depositar|depositan|pagan|pagaran|transfieren)|me\s+(?:llega|llegan|llegara|llegaran|cae|caen|caera|caeran)|me\s+(?:cobran|cobraran|cargan|cargaran|descuentan|debitan)|vence|se\s+paga|hay\s+que\s+pagar|gastare|voy\s+a\s+gastar|compro|comprare|voy\s+a\s+comprar)\b/;
const GOAL_SAVE_RE = /\b(aporta|aportar|aporto|ahorra|ahorrar|ahorro|apartale|aparta|aparto|apartar|guarda|guardar|guardo|separa|separar|separo|depositale|deposito|abona|abono)\b/;

type Range = { start: number; end: number };

interface Parsed {
  raw: string;
  n: string; // normalizado
  text: string; // sin fechas/horas/repetición (para montos y nombres)
  amount: number | null;
  rec: ReturnType<typeof findRecurrence>;
  futureDates: ReturnType<typeof findDateMentions>;
  time: { hour: number; minute: number } | null;
  ranges: Range[];
}

function parse(rawText: string, now: Date): Parsed {
  const rec = findRecurrence(rawText, now);
  const inRec = (d: Range) => !!rec?.ranges.some((r) => d.start < r.end && d.end > r.start);
  const futureDates = findDateMentions(rawText, now, { prefer: 'future' }).filter((d) => !inRec(d));
  const times = findTimeMentions(rawText);
  const ranges: Range[] = [...(rec?.ranges ?? []), ...futureDates, ...times];
  const text = removeRanges(rawText, ranges);
  return { raw: rawText, n: normalize(rawText), text, amount: extractAmount(text), rec, futureDates, time: times[0] ? { hour: times[0].hour, minute: times[0].minute } : null, ranges };
}

const titleCase = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Quita del texto el monto escrito, para que no se cuele en un nombre ("renta 8000" → "renta").
function stripAmount(text: string): string {
  return text.replace(/\$?\s*\d[\d.,]*\s*(?:k|mil)?\s*(?:pesos|mxn|usd|dolares)?/gi, ' ').replace(/\s{2,}/g, ' ').trim();
}

const NAME_NOISE = new Set([
  'de', 'la', 'el', 'los', 'las', 'mi', 'mis', 'un', 'una', 'que', 'por', 'para', 'con', 'en', 'a', 'al', 'del', 'y', 'cada', 'mes', 'meses', 'semana', 'quincena', 'dia', 'pago', 'pagar', 'pagare', 'paga',
  'cobro', 'cobrar', 'cobre', 'tengo', 'debo', 'voy', 'me', 'toca', 'hay', 'van', 'depositan', 'pagan', 'depositar', 'recuerdame', 'avisame', 'desde', 'cuenta', 'tarjeta', 'mi', 'pesos', 'mensual', 'mensualmente', 'quincenal', 'semanal',
  'manana', 'hoy', 'proximo', 'proxima', 'siguiente', 'este', 'esta', 'ese', 'esa', 'ya', 'no', 'se', 'si', 'es', 'son', 'ahora', 'quiero', 'necesito', 'favor', 'por', 'dias', 'antes', 'veces', 'insiste', 'hasta',
]);

// Nombre corto de lo que se paga/cobra: lo que queda del texto sin monto, fechas, verbos ni conectores ("pago la renta" → "Renta").
function nameFrom(text: string, accountNames: string[]): string {
  let t = normalize(stripAmount(text));
  for (const a of accountNames) {
    const an = normalize(a);
    if (an.length >= 2) t = ` ${t} `.replace(` ${an} `, ' ').trim();
  }
  const words = t.split(' ').filter((w) => w && !NAME_NOISE.has(w));
  return titleCase(words.slice(0, 4).join(' '));
}

function accountNamesOf(ctx: ActionValidationContext): string[] {
  return ctx.accounts.filter((a) => !a.deletedAt).map((a) => a.name);
}

// ¿La cuenta está nombrada en el texto? (a diferencia de accountHintFor, no adivina la única cuenta: para deudas y dividendos
// la ausencia de cuenta tiene su propio manejo en el resolver.)
function namedAccountIn(n: string, ctx: ActionValidationContext): string {
  const hit = findMentionedName(n, ctx.accounts.filter((a) => !a.deletedAt), (a) => a.name);
  if (hit.found) return hit.found.name;
  if (/\bsin\s+cuenta\b|\bsolo\s+(?:ajusta|la\s+deuda)\b/.test(n)) return 'sin cuenta';
  if (/\befectivo\b/.test(n)) return 'efectivo';
  return '';
}

// "Mi tarjeta Oro corta el 5 y paga el 25". Se revisa ANTES de partir el mensaje en instrucciones (el planificador cortaría en
// "y paga…"), por eso se exporta.
export function detectCardDates(rawText: string, ctx: ActionValidationContext, now: Date): ResolveResult | null {
  if (rawText.length > 4000) return null;
  const n = normalize(rawText);
  const rec = findRecurrence(rawText, now);
  const creditCards = ctx.accounts.filter((a) => !a.deletedAt && a.type === 'credit_card');
  if (!creditCards.length || rec || has(n, REMIND_RE) || has(n, PAST_RECORD_RE)) return null;
  const named = findMentionedName(n, creditCards, (a) => a.name).found;
  if (!(/\btarjeta\b/.test(n) || named)) return null;
  const cut = n.match(/\b(?:corte|corta|cierra|cierre)\b[^0-9]{0,40}?(\d{1,2})\b/);
  const due = n.match(/\b(?:fecha\s+(?:limite\s+)?de\s+pago|fecha\s+limite|limite\s+de\s+pago|dia\s+de\s+pago|vence|vencimiento|se\s+paga|paga)\b[^0-9]{0,30}?(\d{1,2})\b/);
  const cutDay = cut ? parseInt(cut[1], 10) : undefined;
  const dueDay = due ? parseInt(due[1], 10) : undefined;
  if (cutDay === undefined && dueDay === undefined) return null;
  // «Liverpool vence el 25», sin decir «tarjeta» ni «corte», cuando TAMBIÉN hay una deuda con ese nombre, es el vencimiento de la deuda
  // (lo de siempre), no las fechas de la tarjeta.
  if (!/\btarjeta\b/.test(n) && cutDay === undefined && named && ctx.liabilities.some((l) => !l.deletedAt && normalize(l.institution) === normalize(named.name))) return null;
  // sin un monto suelto ("paga 3000 de la tarjeta") no es una fecha: solo números de 1 o 2 cifras después de la palabra clave
  const hit = findMentionedName(n, creditCards, (a) => a.name);
  return resolveSetCardDates({ accountNameHint: hit.found?.name ?? '', cutoffDay: cutDay, dueDay }, ctx);
}

export function detectP3Intent(rawText: string, ctx: ActionValidationContext, now: Date): ResolveResult | null {
  if (rawText.length > 4000) return null;
  const p = parse(rawText, now);
  const n = p.n;
  const day = p.futureDates.find((d) => d.relation !== 'past');
  const timeText = p.time ? `${String(p.time.hour).padStart(2, '0')}:${String(p.time.minute).padStart(2, '0')}` : undefined;

  // ---------- Avisos ----------
  if (has(n, REMIND_RE) || (/\b(aviso|recordatorio)\b/.test(n) && has(n, REMOVE_VERB_RE))) {
    if (has(n, REMOVE_VERB_RE) && /\b(aviso|avisos|recordatorio|recordatorios)\b/.test(n)) {
      const list = namedReminders(ctx);
      const hit = findMentionedName(n, list, (r) => r.title);
      const tail = n.replace(/^.*\b(?:aviso|avisos|recordatorio|recordatorios)\b\s*/, '').replace(/^(?:(?:de|del|para|sobre|que|el|la|los|las)\s+)+/, '').trim();
      return resolveCancelReminder({ reminderHint: hit.found?.title ?? tail }, ctx);
    }
    if (has(n, REMIND_RE)) {
      let t = n.replace(REMIND_RE, ' ');
      const advance: number[] = [];
      const advRe = /\b(\d{1,2}|un|una|dos|tres|cuatro|cinco|siete)\s+dias?\s+antes(?:\s+de)?\b/g;
      const words: Record<string, number> = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, siete: 7 };
      for (const m of t.matchAll(advRe)) advance.push(/^\d+$/.test(m[1]) ? parseInt(m[1], 10) : words[m[1]]);
      if (/\b(?:el\s+)?dia\s+antes\b/.test(t) && advance.length === 0) advance.push(1);
      t = t.replace(advRe, ' ').replace(/\b(?:el\s+)?dia\s+antes(?:\s+de)?\b/g, ' ');
      let attempts: number | undefined;
      const att = t.match(/\b(?:insiste|insistir|repite|repetir|avisame)\s+(?:hasta\s+)?(\d|dos|tres)\s+veces\b/) ?? t.match(/\bhasta\s+(\d|dos|tres)\s+veces\b/);
      if (att) {
        attempts = /^\d$/.test(att[1]) ? parseInt(att[1], 10) : att[1] === 'dos' ? 2 : 3;
        t = t.replace(att[0], ' ');
      }
      // El título se toma del texto ORIGINAL sin fechas, horas ni repetición, con el mismo recorte.
      let title = normalize(removeRanges(rawText, p.ranges)).replace(REMIND_RE, ' ').replace(advRe, ' ').replace(/\b(?:el\s+)?dia\s+antes(?:\s+de)?\b/g, ' ');
      if (att) title = title.replace(att[0], ' ');
      title = title.replace(/^\s*(?:que|de|el|para|sobre|a)\s+/g, ' ').replace(/\s+(?:el|a|para|de|en|los|las|cada|y|con)\s*$/g, ' ').replace(/\s{2,}/g, ' ').trim();
      title = title.replace(/^(?:que|de)\s+/, '').trim();
      return resolveAddReminder(
        { title: titleCase(title), date: p.rec ? undefined : day?.iso, recurrence: p.rec ? p.rec.recurrence : undefined, timeOfDay: timeText, advanceDays: advance, maxAttempts: attempts },
        ctx
      );
    }
  }

  // ---------- Tarjeta de crédito: fecha de corte y fecha límite de pago ----------
  const cardDates = detectCardDates(rawText, ctx, now);
  if (cardDates) return cardDates;

  // ---------- Dividendos ----------
  if (/\bdividendos?\b/.test(n) && !p.rec) {
    const invs = namedInvestments(ctx);
    const hit = findMentionedName(n, invs, (i) => i.ticker);
    const hitName = hit.found ? hit : findMentionedName(n, invs, (i) => i.name);
    const inv = hitName.found ?? (invs.length === 1 ? invs[0] : undefined);
    if (p.amount !== null || inv) {
      return resolveRegisterDividend({ tickerHint: inv?.ticker ?? '', amount: p.amount ?? undefined, accountNameHint: namedAccountIn(n, ctx) }, ctx);
    }
  }

  // ---------- Deudas: pagar / cobrar / saldar ----------
  const liabilities = namedOpenLiabilities(ctx);
  const liabHit = liabilities.length ? findMentionedName(n, liabilities, (l) => l.institution) : { found: undefined, many: false };
  if (liabHit.found && !liabHit.many && !p.rec && !/\b(vence|vencimiento|fecha\s+de\s+pago|fecha\s+limite)\b/.test(n)) {
    const isNew = /\b(agrega|agregar|crea|crear|nueva|nuevo|registra\s+(?:una\s+)?deuda)\b/.test(n);
    if (!isNew) {
      if (has(n, SETTLE_RE) && (p.amount === null || /\b(todo|toda|completo|completa|liquid|salda)/.test(n))) {
        return resolveSettleLiability({ institutionHint: liabHit.found.institution }, ctx);
      }
      if (has(n, PAY_LIAB_RE) && !has(n, /\b(me\s+debe|te\s+debo)\b/) && (p.amount !== null || has(n, /\b(abona|abone|abono|pague|pagu|paga|pagale|me\s+pago|me\s+abono)\b/))) {
        return resolvePayLiability({ institutionHint: liabHit.found.institution, amount: p.amount ?? undefined, accountNameHint: namedAccountIn(n, ctx) }, ctx);
      }
    }
  }

  // ---------- Pagos recurrentes que ya existen: pausar / reanudar / terminar / cambiar monto ----------
  const rules = namedRules(ctx);
  const ruleHit = rules.length ? findMentionedName(n, rules, (r) => r.name) : { found: undefined, many: false };
  if (ruleHit.found && !ruleHit.many && !/\b(meta|cuenta|deuda|presupuesto|aviso|recordatorio)\b/.test(n)) {
    const name = ruleHit.found.name;
    if (has(n, PAUSE_RE)) return resolvePauseRecurring({ ruleHint: name }, ctx);
    if (has(n, RESUME_RE)) return resolveResumeRecurring({ ruleHint: name }, ctx);
    if (has(n, END_RE) && p.amount === null) return resolveEndRecurring({ ruleHint: name }, ctx);
    if (p.amount !== null && has(n, AMOUNT_CHANGE_RE) && !has(n, PAST_RECORD_RE) && !p.rec) {
      return resolveUpdateRecurringAmount({ ruleHint: name, amount: p.amount }, ctx);
    }
  }

  // ---------- Previstos que ya existen: confirmar / no ocurrió / posponer ----------
  const fcs = namedForecasts(ctx);
  const fcHit = fcs.length ? findMentionedName(n, fcs, (f) => f.name) : { found: undefined, many: false };
  if (fcHit.found && !fcHit.many && !p.rec) {
    const hint = fcHit.found.name;
    if (has(n, SKIP_RE)) return resolveSkipForecast({ forecastHint: hint }, ctx);
    // "aplaza Netflix al 15" = "el 15"
    const postponeDay = day ?? (has(n, POSTPONE_RE) ? findDateMentions(rawText.replace(/\bal\s+(\d{1,2})\b/i, 'el $1'), now, { prefer: 'future' }).find((d) => d.relation !== 'past') : undefined);
    if (has(n, POSTPONE_RE) && postponeDay && !has(n, PAST_RECORD_RE)) return resolvePostponeForecast({ forecastHint: hint, newDate: postponeDay.iso }, ctx);
    if (has(n, CONFIRM_RE)) return resolveConfirmForecast({ forecastHint: hint, amount: p.amount ?? undefined }, ctx);
  }

  // ---------- Crear un pago recurrente (o una aportación periódica a una meta) ----------
  if (p.rec && !has(n, PAST_RECORD_RE)) {
    const goalHit = findMentionedName(n, ctx.goals.filter((g) => !g.deletedAt), (g) => g.name);
    if (/\b(meta|objetivo)\b/.test(n) && has(n, GOAL_SAVE_RE) && p.amount !== null) {
      const g = goalHit.found;
      const named = g?.name ?? (n.match(/\bmeta\s+(?:de\s+)?(?:mi\s+|la\s+|el\s+)?([a-z0-9 ]+?)(?=\s+(?:cada|todos|el\s|mensual|\d)|$)/)?.[1] ?? '').trim();
      return resolveAddRecurringContribution({ goalNameHint: named, amount: p.amount, recurrence: p.rec.recurrence }, ctx);
    }
    if (p.amount !== null && (has(n, FORECAST_TRIGGER_RE) || has(n, INCOME_RE))) {
      const income = has(n, INCOME_RE);
      const parsed = parseCaptureText(`${p.text}`, now);
      const accountHint = accountHintFor(n, ctx);
      const name = nameFrom(p.text, accountNamesOf(ctx)) || (parsed.subcategoryId ? '' : income ? 'Ingreso recurrente' : 'Pago recurrente');
      const type = income ? 'income' : 'expense';
      const catOk = parsed.type === type && parsed.categoryId && parsed.subcategoryId;
      return resolveAddRecurring(
        { name: name || 'Pago recurrente', transactionType: type, amount: p.amount, accountNameHint: accountHint, categoryId: catOk ? parsed.categoryId : undefined, subcategoryId: catOk ? parsed.subcategoryId : undefined, recurrence: p.rec.recurrence },
        ctx
      );
    }
  }

  // ---------- Dejar algo previsto (una sola vez, en una fecha futura) ----------
  if (!p.rec && day && day.relation === 'future' && p.amount !== null && has(n, FORECAST_TRIGGER_RE) && !has(n, PAST_RECORD_RE) && !REMIND_RE.test(n)) {
    // "transfiere 500 a Nu el viernes" o "pon el vencimiento al 20" no son previstos: sin verbo de pago/cobro no se llega aquí.
    const income = has(n, INCOME_RE);
    const type = income ? 'income' : 'expense';
    const parsed = parseCaptureText(p.text, now);
    const catOk = parsed.type === type && parsed.categoryId && parsed.subcategoryId;
    const merchant = nameFrom(p.text, accountNamesOf(ctx)) || undefined;
    return resolveAddForecast(
      { transactionType: type, amount: p.amount, accountNameHint: accountHintFor(n, ctx), merchant, categoryId: catOk ? parsed.categoryId : undefined, subcategoryId: catOk ? parsed.subcategoryId : undefined, date: day.iso },
      ctx
    );
  }

  return null;
}

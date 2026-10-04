// Reconocimiento LOCAL (sin ninguna IA conectada) de comandos que
// modifican datos, escritos o dictados en el chat. Cobertura
// deliberadamente angosta y explícita — nunca "adivina" una acción de la
// que no está razonablemente segura; si nada de esto calza, quien llama
// (localActionAgent.ts) cae a responder como el copiloto de solo lectura
// de siempre. Con un LLM conectado, ProviderLLMActionAgent cubre lenguaje
// mucho más libre sobre el mismo catálogo de acciones (actionCatalog.ts).

import {
  resolveAddAccount,
  resolveAddTransaction,
  resolveAddGoal,
  resolveAddLiability,
  resolveContributeToGoal,
  resolveDeleteAccount,
  resolveDeleteBudgetLine,
  resolveDeleteGoal,
  resolveDeleteLiability,
  resolveSetBudgetLine,
  resolveTransferBetweenAccounts,
  resolveUpdateGoalDate,
  resolveUpdateLiabilityBalance,
  resolveUpdateLiabilityDueDate,
  resolveWithdrawFromGoal,
  type ActionValidationContext,
  type ResolveResult,
} from './actionCatalog';
import { resolveAccountByNameHint, resolveGoalByNameHint } from '@/utils/accounts';
import { findDateMentions, findTimeMentions, removeRanges } from './dates';
import { detectP3Intent } from './p3Intents';
import { ACCOUNT_INCREMENT_WORDS, detectAccountAdjustment, extractAmount, normalize } from './localParser';

function hasAnyWord(normalizedText: string, words: Set<string> | string[]): boolean {
  const tokens = normalizedText.split(' ');
  return tokens.some((t) => (words instanceof Set ? words.has(t) : words.includes(t)));
}

// Captura el nombre que sigue a una palabra clave ("cuenta", "meta",
// "deuda"...), saltándose conectores comunes ("llamada", "que se llame",
// artículos) y cortando antes de una cláusula de monto/preposición — sobre
// el texto ORIGINAL (no normalizado) para conservar mayúsculas/acentos del
// nombre tal como la persona lo escribió/dictó.
const NAME_STOPS = '(?=\\s+con\\b|\\s+de\\s+saldo\\b|\\s+por\\b|\\s+al\\b|\\s+objetivo\\b|$|[.,;])';
function captureNameAfter(text: string, keyword: string): string | null {
  // "crea una meta de ahorro llamada Casa con 200000": el nombre es lo que sigue a "llamada", aunque haya palabras en medio
  if (new RegExp(`\\b${keyword}\\b`, 'i').test(text)) {
    const named = text.match(new RegExp(`\\b(?:llamad[ao]|que\\s+se\\s+llame|de\\s+nombre|nombrad[ao])\\s+(?:(?:mi|la|el|tu|una|un)\\s+)?([\\p{L}0-9][\\p{L}0-9\\s]*?)${NAME_STOPS}`, 'iu'));
    const n = named?.[1]?.trim();
    if (n && n.length >= 2) return n;
  }
  const re = new RegExp(
    `\\b${keyword}\\b\\s+(?:de\\s+)?(?:(?:mi|la|el|tu|una|un)\\s+)?(?:(?:llamada|que se llame|de nombre|nombrada)\\s+)?([\\p{L}0-9][\\p{L}0-9\\s]*?)(?=\\s+con\\b|\\s+de\\s+saldo\\b|\\s+por\\b|\\s+al\\b|\\s+objetivo\\b|$|[.,;])`,
    'iu'
  );
  const m = text.match(re);
  const name = m?.[1]?.trim();
  return name && name.length >= 2 ? name : null;
}

// Quita de un nombre capturado lo que en realidad es el monto o la fecha que venían detrás ("Laptop de 20000 para"
// → "Laptop"): el nombre de una meta/deuda nueva termina donde empieza el monto.
function cleanName(name: string, amount: number | null): string {
  let n = name.replace(/\s+(?:de|con|por|para|a|al|en)\s+(?:\$\s*)?\d.*$/i, '');
  n = n.replace(/\s+(?:para|con|por|de|a|al|en)\s*$/i, '');
  if (amount !== null) {
    // "Boda 150000": el último pedazo es el monto, no parte del nombre
    const tail = n.match(/\s+\$?\s*([\d.,]+)(?:\s*(?:pesos?|mxn))?$/i);
    if (tail && Math.round(parseFloat(tail[1].replace(/,/g, ''))) === Math.round(amount)) n = n.slice(0, tail.index);
  }
  return n.trim();
}

// De entre las cosas YA existentes (metas, deudas), la que se nombra en el texto (la de nombre más largo). Más
// seguro que "capturar lo que sigue a la palabra meta": solo se actúa sobre algo que de verdad existe.
function findMentioned<T>(normalizedText: string, items: T[], getName: (i: T) => string): { found?: T; many: boolean } {
  const hay = ` ${normalizedText} `;
  const hits: Array<{ item: T; len: number }> = [];
  for (const item of items) {
    const n = normalize(getName(item));
    if (n.length >= 2 && hay.includes(` ${n} `)) hits.push({ item, len: n.length });
  }
  hits.sort((a, b) => b.len - a.len);
  return { found: hits[0]?.item, many: hits.length > 1 };
}

const ADD_VERBS = ['agregar', 'agrega', 'agrego', 'crea', 'crear', 'creo', 'abre', 'abrir', 'anade', 'anadir', 'nueva', 'nuevo', 'registra', 'registrar'];
// Verbos propios de las metas ("aporta 300 a mi meta de viaje"): la gente no dice "agrégale" a una meta.
const GOAL_CONTRIBUTE_VERBS = ['aporta', 'aportar', 'aporto', 'aportale', 'ahorra', 'ahorrar', 'ahorrale', 'guarda', 'guardar', 'guardale', 'apartale', 'separa', 'separale'];
// Retirar dinero de una meta ("retira 500 de mi meta"). "quita"/"resta" solo cuentan con un monto: "quita la meta X" es borrarla.
const GOAL_WITHDRAW_VERBS = ['retira', 'retirar', 'retiro', 'retire', 'saca', 'sacar', 'sacale', 'quita', 'quitale', 'resta', 'restale', 'descuenta', 'descuentale'];
const GOAL_WITHDRAW_ALWAYS = new Set(['retira', 'retirar', 'retiro', 'retire', 'saca', 'sacar', 'sacale', 'descuenta', 'descuentale']);
const DELETE_VERBS = ['borrar', 'borra', 'borro', 'elimina', 'eliminar', 'elimino', 'quita', 'quitar', 'quito'];

// Verbos de transferencia entre cuentas propias (backlog #144) — ninguno
// se traslapa con ACCOUNT_INCREMENT_WORDS/ACCOUNT_DECREMENT_WORDS de
// localParser.ts, así que no compite con el ajuste genérico de saldo.
const TRANSFER_VERBS = [
  'transferir', 'transfiere', 'transfirio', 'transfi',
  'pasar', 'pasa', 'paso',
  'mover', 'mueve', 'muevo', 'movi',
  'mandar', 'manda', 'mando',
  'enviar', 'envia', 'envio',
  // con "le": "pásale 300 de BBVA a Nu", "transfiérele…"
  'pasale', 'transfierele', 'transferirle', 'mandale', 'enviale', 'muevele',
];

// Captura "de <cuenta A> a <cuenta B>" sobre el texto ORIGINAL (conserva
// mayúsculas/acentos del nombre). Se detiene antes de un número suelto
// para no tragarse un monto que venga DESPUÉS del nombre de la cuenta
// destino (ej. "...a mi tarjeta nu 500 pesos"). Un número pegado a letras sí es parte del nombre ("Efectivo2").
const TRANSFER_ACCOUNTS_REGEX =
  /\bde\s+(?:(?:mi|la|el|tu|una|un)\s+)?(\p{L}[\p{L}\p{N}]*(?:\s+\p{L}[\p{L}\p{N}]*)*?)\s+(?:a|hacia|para)\s+(?:(?:mi|la|el|tu|una|un)\s+)?(\p{L}[\p{L}\p{N}]*(?:\s+\p{L}[\p{L}\p{N}]*)*?)(?=\s+\d|$|[.,;])/iu;

// "transfiérele 1000 a <destino> desde <origen>" (orden inverso). Solo se acepta si las DOS cuentas existen de verdad
// ("pasa 500 a mi meta de viaje" no es una transferencia).
const TRANSFER_REVERSED_REGEX =
  /\ba\s+(?:(?:mi|la|el|tu)\s+)?(?:cuenta\s+)?(\p{L}[\p{L}\p{N}]*(?:\s+\p{L}[\p{L}\p{N}]*)*?)\s+(?:desde|de)\s+(?:(?:mi|la|el|tu)\s+)?(?:cuenta\s+)?(\p{L}[\p{L}\p{N}]*(?:\s+\p{L}[\p{L}\p{N}]*)*?)(?=\s+\d|$|[.,;])/iu;

export function detectChatIntent(rawText: string, ctx: ActionValidationContext, now: Date = new Date()): ResolveResult | null {
  if (rawText.length > 4000) return null; // texto pegado por error: no se lee como comando (ver planner.MAX_PLAN_TEXT_CHARS)
  // P3 primero: previstos, pagos recurrentes, avisos, pago de deudas y dividendos (solo actúa con algo que existe o con
  // monto + fecha + verbo; si no, sigue el recorrido de siempre).
  const p3 = detectP3Intent(rawText, ctx, now);
  if (p3) return p3;
  const normalized = normalize(rawText);
  // Las fechas y horas dichas ("el 25 de octubre", "a las 5") no son montos ni parte de un nombre: se recortan del
  // texto que se usa para sacar montos y nombres, y se interpretan aparte.
  const futureDates = findDateMentions(rawText, now, { prefer: 'future' });
  const text = removeRanges(rawText, [...futureDates, ...findTimeMentions(rawText)]);
  const amountOf = (): number | null => extractAmount(text);
  const goalsNow = ctx.goals.filter((g) => !g.deletedAt);
  const liabilitiesNow = ctx.liabilities.filter((l) => !l.deletedAt);

  // ---- Fecha de una meta / vencimiento de una deuda EXISTENTES (antes que todo lo demás: "mueve la fecha de la
  // meta X para el 20 de diciembre" no es una transferencia, ni "cambia el vencimiento al 25" un saldo de 25) ----
  if (futureDates.length > 0) {
    const goalHit = findMentioned(normalized, goalsNow, (g) => g.name);
    const liabHit = findMentioned(normalized, liabilitiesNow, (l) => l.institution);
    const wantsGoalDate = !!goalHit.found && /\b(meta|objetivo)\b/.test(normalized) && /\b(fecha|plazo|es\s+para|para\s+el|para\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre))\b/.test(normalized) && !hasAnyWord(normalized, ADD_VERBS) && !hasAnyWord(normalized, DELETE_VERBS);
    const wantsDueDate = !!liabHit.found && /\b(vence|vencimiento|se\s+vence|fecha\s+de\s+pago|fecha\s+limite|dia\s+de\s+pago|el\s+pago\s+.*\bes\b)\b/.test(normalized) && !hasAnyWord(normalized, ADD_VERBS) && !hasAnyWord(normalized, DELETE_VERBS);
    if (wantsGoalDate || wantsDueDate) {
      if (goalHit.many && wantsGoalDate) return { ok: false, reason: 'Mencionaste más de una meta. Mándame un cambio de fecha por mensaje, o escríbelos separados con "y luego".' };
      if (liabHit.many && wantsDueDate) return { ok: false, reason: 'Mencionaste más de una deuda. Mándame un vencimiento por mensaje, o escríbelos separados con "y luego".' };
      if (futureDates.length > 1) return { ok: false, reason: 'Veo más de una fecha. Dime una sola, por ejemplo "el 25 de octubre".' };
      if (wantsGoalDate) return resolveUpdateGoalDate({ goalNameHint: goalHit.found!.name, targetDate: futureDates[0].iso }, ctx);
      return resolveUpdateLiabilityDueDate({ institutionHint: liabHit.found!.institution, dueDate: futureDates[0].iso }, ctx);
    }
  }

  // ---- Transferencias entre cuentas propias (revisado ANTES que el resto
  // de "Cuentas" — no comparte palabra clave con agregar/borrar cuenta,
  // pero sí necesita ganarle al ajuste genérico de saldo del final). ----
  if (hasAnyWord(normalized, TRANSFER_VERBS)) {
    // Una transferencia con un día FUTURO dicho ("transfiere 300 de Nu a BBVA el lunes") nunca se hace "ahora" en silencio: las
    // transferencias programadas todavía no existen.
    const laterDay = futureDates.find((d) => d.relation === 'future');
    if (laterDay && TRANSFER_ACCOUNTS_REGEX.test(text) && amountOf() !== null) {
      return { ok: false, reason: `Todavía no programo transferencias para otro día (dijiste ${laterDay.text.trim()}). Si quieres que te lo recuerde, di «recuérdame transferir… ${laterDay.text.trim()}»; si la quieres hacer ahora, dime «transfiere…» sin la fecha.` };
    }
    const match = text.match(TRANSFER_ACCOUNTS_REGEX);
    const amount = amountOf();
    if (!match) {
      const rev = text.match(TRANSFER_REVERSED_REGEX);
      if (rev && amount !== null && resolveAccountByNameHint(rev[2].trim(), ctx.accounts) && resolveAccountByNameHint(rev[1].trim(), ctx.accounts)) {
        return resolveTransferBetweenAccounts({ fromAccountNameHint: rev[2].trim(), toAccountNameHint: rev[1].trim(), amount }, ctx);
      }
    }
    if (match) {
      const fromAccountNameHint = match[1].trim();
      const toAccountNameHint = match[2].trim();
      if (fromAccountNameHint.length >= 2 && toAccountNameHint.length >= 2) {
        if (amount !== null) return resolveTransferBetweenAccounts({ fromAccountNameHint, toAccountNameHint, amount }, ctx);
        // Sin monto: solo se pregunta "¿cuánto?" si las DOS cuentas existen de verdad ("¿qué pasa de enero a
        // febrero?" no es una transferencia); si no, sigue como siempre (respuesta del copiloto).
        if (resolveAccountByNameHint(fromAccountNameHint, ctx.accounts) && resolveAccountByNameHint(toAccountNameHint, ctx.accounts)) {
          return resolveTransferBetweenAccounts({ fromAccountNameHint, toAccountNameHint, amount: undefined }, ctx);
        }
      }
    }
  }

  // ---- Cuentas ----
  if (hasAnyWord(normalized, DELETE_VERBS) && /\bcuenta\b/.test(normalized)) {
    const name = captureNameAfter(text, 'cuenta');
    if (name) return resolveDeleteAccount({ accountNameHint: name }, ctx);
  }
  if (hasAnyWord(normalized, ADD_VERBS) && /\bcuenta\b/.test(normalized)) {
    const name = captureNameAfter(text, 'cuenta');
    // "agrega 500 a mi cuenta Nu": si esa cuenta YA existe no se crea otra con el mismo nombre; con un monto es un ajuste de saldo
    // (más abajo), sin él se avisa.
    const existing = name ? ctx.accounts.find((a) => !a.deletedAt && normalize(a.name) === normalize(name)) : undefined;
    if (existing && !detectAccountAdjustment(text)) return { ok: false, reason: `Ya tienes una cuenta que se llama "${existing.name}". Si quieres sumarle o quitarle dinero, dime el monto: por ejemplo "agrégale 500 a ${existing.name}".` };
    if (name && !existing) {
      const typeMatch = normalized.match(/\b(banco|bancaria|tarjeta|credito|efectivo|ahorro|ahorros|inversion)\b/);
      return resolveAddAccount(
        { name, accountTypeHint: typeMatch?.[1], balance: amountOf() ?? undefined },
        ctx
      );
    }
  }

  // ---- Metas (se revisa ANTES del ajuste genérico de cuenta, para que
  // "agrégale 500 a mi meta de viaje" no se confunda con una cuenta). ----
  if (/\b(meta|metas|objetivo)\b/.test(normalized)) {
    const goalHit = findMentioned(normalized, goalsNow, (g) => g.name);
    const amount = amountOf();
    // Retirar de una meta que existe ("retira 500 de mi meta Viaje", "quítale 500 a la meta Laptop")
    if (hasAnyWord(normalized, GOAL_WITHDRAW_VERBS) && goalHit.found && !goalHit.many) {
      const always = normalized.split(' ').some((w) => GOAL_WITHDRAW_ALWAYS.has(w));
      if (amount !== null || always) return resolveWithdrawFromGoal({ goalNameHint: goalHit.found.name, amount: amount ?? undefined }, ctx);
    }
    if (hasAnyWord(normalized, DELETE_VERBS)) {
      const name = captureNameAfter(text, 'meta') ?? captureNameAfter(text, 'objetivo');
      if (name) return resolveDeleteGoal({ goalNameHint: name }, ctx);
    }
    if (hasAnyWord(normalized, ADD_VERBS)) {
      const name = captureNameAfter(text, 'meta');
      if (name) {
        // sin monto: pregunta el objetivo; una fecha dicha ("para el 15 de diciembre") es la fecha de la meta
        return resolveAddGoal({ name: cleanName(name, amount), targetAmount: amount ?? undefined, targetDate: futureDates[0]?.iso }, ctx);
      }
    }
    if (hasAnyWord(normalized, ACCOUNT_INCREMENT_WORDS) || hasAnyWord(normalized, GOAL_CONTRIBUTE_VERBS)) {
      const name = captureNameAfter(text, 'meta') ?? captureNameAfter(text, 'objetivo');
      if (name && amount !== null) return resolveContributeToGoal({ goalNameHint: name, amount }, ctx);
      // Sin monto: solo se pregunta si la meta existe de verdad.
      if (name && resolveGoalByNameHint(name, ctx.goals)) return resolveContributeToGoal({ goalNameHint: name, amount: undefined }, ctx);
    }
  }

  // ---- Deudas ----
  if (/\b(deuda|deudas)\b/.test(normalized)) {
    if (hasAnyWord(normalized, DELETE_VERBS)) {
      const name = captureNameAfter(text, 'deuda');
      if (name) return resolveDeleteLiability({ institutionHint: name }, ctx);
    }
    if (hasAnyWord(normalized, ADD_VERBS)) {
      const name = captureNameAfter(text, 'deuda');
      const amount = amountOf();
      if (name) return resolveAddLiability({ institution: cleanName(name, amount), balance: amount ?? undefined }, ctx); // sin monto: pregunta el saldo
    }
    if (/\b(actualiza|actualizar|cambia|cambiar|pon|poner|debo)\b/.test(normalized)) {
      const name = captureNameAfter(text, 'deuda');
      const amount = amountOf();
      if (name && amount !== null) return resolveUpdateLiabilityBalance({ institutionHint: name, balance: amount }, ctx);
    }
  }

  // ---- Presupuesto (solo montos de la plantilla por defecto) ----
  if (/\b(presupuesto|presupuestar|presupuesta)\b/.test(normalized)) {
    const amount = amountOf();
    const categoryHint = captureNameAfter(text, 'presupuesto') ?? captureNameAfter(text, 'para');
    if (hasAnyWord(normalized, DELETE_VERBS) && categoryHint) {
      return resolveDeleteBudgetLine({ categoryHint }, ctx);
    }
    if (amount !== null && categoryHint) {
      return resolveSetBudgetLine({ categoryHint, monthlyAmount: amount }, ctx);
    }
  }

  // ---- Ajuste genérico de saldo de cuenta (ya probado en producción vía
  // captura por voz) — se revisa AL FINAL, como respaldo general. ----
  const adjustment = detectAccountAdjustment(text);
  if (adjustment) {
    const amount = amountOf();
    if (amount !== null) {
      // un día PASADO dicho ("sácale 200 a mi Morralla ayer") queda como la fecha del movimiento
      const pastDate = findDateMentions(rawText, now, { prefer: 'past' }).find((d) => d.relation === 'past');
      return resolveAddTransaction(
        { transactionType: adjustment.direction === 'increment' ? 'income' : 'expense', amount, accountNameHint: adjustment.accountNameHint, date: pastDate?.iso },
        ctx
      );
    }
  }

  return null;
}


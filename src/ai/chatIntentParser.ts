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
  resolveUpdateLiabilityBalance,
  type ActionValidationContext,
  type ResolveResult,
} from './actionCatalog';
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
function captureNameAfter(text: string, keyword: string): string | null {
  const re = new RegExp(
    `\\b${keyword}\\b\\s+(?:de\\s+)?(?:mi|la|el|tu|una|un)?\\s*(?:llamada|que se llame|de nombre|nombrada)?\\s*([\\p{L}0-9][\\p{L}0-9\\s]*?)(?=\\s+con\\b|\\s+de\\s+saldo\\b|\\s+por\\b|\\s+al\\b|\\s+objetivo\\b|$|[.,;])`,
    'iu'
  );
  const m = text.match(re);
  const name = m?.[1]?.trim();
  return name && name.length >= 2 ? name : null;
}

const ADD_VERBS = ['agregar', 'agrega', 'agrego', 'crea', 'crear', 'creo', 'abre', 'abrir', 'anade', 'anadir', 'nueva', 'nuevo', 'registra', 'registrar'];
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
];

// Captura "de <cuenta A> a <cuenta B>" sobre el texto ORIGINAL (conserva
// mayúsculas/acentos del nombre). Se detiene antes de un número suelto
// para no tragarse un monto que venga DESPUÉS del nombre de la cuenta
// destino (ej. "...a mi tarjeta nu 500 pesos").
const TRANSFER_ACCOUNTS_REGEX =
  /\bde\s+(?:mi|la|el|tu|una|un)?\s*([\p{L}][\p{L}\s]*?)\s+(?:a|hacia|para)\s+(?:mi|la|el|tu|una|un)?\s*([\p{L}][\p{L}\s]*?)(?=\s+\d|$|[.,;])/iu;

export function detectChatIntent(rawText: string, ctx: ActionValidationContext): ResolveResult | null {
  const normalized = normalize(rawText);

  // ---- Transferencias entre cuentas propias (revisado ANTES que el resto
  // de "Cuentas" — no comparte palabra clave con agregar/borrar cuenta,
  // pero sí necesita ganarle al ajuste genérico de saldo del final). ----
  if (hasAnyWord(normalized, TRANSFER_VERBS)) {
    const match = rawText.match(TRANSFER_ACCOUNTS_REGEX);
    const amount = extractAmount(rawText);
    if (match && amount !== null) {
      const fromAccountNameHint = match[1].trim();
      const toAccountNameHint = match[2].trim();
      if (fromAccountNameHint.length >= 2 && toAccountNameHint.length >= 2) {
        return resolveTransferBetweenAccounts({ fromAccountNameHint, toAccountNameHint, amount }, ctx);
      }
    }
  }

  // ---- Cuentas ----
  if (hasAnyWord(normalized, DELETE_VERBS) && /\bcuenta\b/.test(normalized)) {
    const name = captureNameAfter(rawText, 'cuenta');
    if (name) return resolveDeleteAccount({ accountNameHint: name }, ctx);
  }
  if (hasAnyWord(normalized, ADD_VERBS) && /\bcuenta\b/.test(normalized)) {
    const name = captureNameAfter(rawText, 'cuenta');
    if (name) {
      const typeMatch = normalized.match(/\b(banco|bancaria|tarjeta|credito|efectivo|ahorro|ahorros|inversion)\b/);
      return resolveAddAccount(
        { name, accountTypeHint: typeMatch?.[1], balance: extractAmount(rawText) ?? undefined },
        ctx
      );
    }
  }

  // ---- Metas (se revisa ANTES del ajuste genérico de cuenta, para que
  // "agrégale 500 a mi meta de viaje" no se confunda con una cuenta). ----
  if (/\b(meta|metas|objetivo)\b/.test(normalized)) {
    if (hasAnyWord(normalized, DELETE_VERBS)) {
      const name = captureNameAfter(rawText, 'meta') ?? captureNameAfter(rawText, 'objetivo');
      if (name) return resolveDeleteGoal({ goalNameHint: name }, ctx);
    }
    if (hasAnyWord(normalized, ADD_VERBS)) {
      const name = captureNameAfter(rawText, 'meta');
      const amount = extractAmount(rawText);
      if (name && amount !== null) return resolveAddGoal({ name, targetAmount: amount }, ctx);
    }
    if (hasAnyWord(normalized, ACCOUNT_INCREMENT_WORDS)) {
      const name = captureNameAfter(rawText, 'meta') ?? captureNameAfter(rawText, 'objetivo');
      const amount = extractAmount(rawText);
      if (name && amount !== null) return resolveContributeToGoal({ goalNameHint: name, amount }, ctx);
    }
  }

  // ---- Deudas ----
  if (/\b(deuda|deudas)\b/.test(normalized)) {
    if (hasAnyWord(normalized, DELETE_VERBS)) {
      const name = captureNameAfter(rawText, 'deuda');
      if (name) return resolveDeleteLiability({ institutionHint: name }, ctx);
    }
    if (hasAnyWord(normalized, ADD_VERBS)) {
      const name = captureNameAfter(rawText, 'deuda');
      const amount = extractAmount(rawText);
      if (name && amount !== null) return resolveAddLiability({ institution: name, balance: amount }, ctx);
    }
    if (/\b(actualiza|actualizar|cambia|cambiar|pon|poner|debo)\b/.test(normalized)) {
      const name = captureNameAfter(rawText, 'deuda');
      const amount = extractAmount(rawText);
      if (name && amount !== null) return resolveUpdateLiabilityBalance({ institutionHint: name, balance: amount }, ctx);
    }
  }

  // ---- Presupuesto (solo montos de la plantilla por defecto) ----
  if (/\b(presupuesto|presupuestar|presupuesta)\b/.test(normalized)) {
    const amount = extractAmount(rawText);
    const categoryHint = captureNameAfter(rawText, 'presupuesto') ?? captureNameAfter(rawText, 'para');
    if (hasAnyWord(normalized, DELETE_VERBS) && categoryHint) {
      return resolveDeleteBudgetLine({ categoryHint }, ctx);
    }
    if (amount !== null && categoryHint) {
      return resolveSetBudgetLine({ categoryHint, monthlyAmount: amount }, ctx);
    }
  }

  // ---- Ajuste genérico de saldo de cuenta (ya probado en producción vía
  // captura por voz) — se revisa AL FINAL, como respaldo general. ----
  const adjustment = detectAccountAdjustment(rawText);
  if (adjustment) {
    const amount = extractAmount(rawText);
    if (amount !== null) {
      return resolveAddTransaction(
        { transactionType: adjustment.direction === 'increment' ? 'income' : 'expense', amount, accountNameHint: adjustment.accountNameHint },
        ctx
      );
    }
  }

  return null;
}


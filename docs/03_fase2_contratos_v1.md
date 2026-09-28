# Fase 2 P0-S2 — Contratos versionados del motor local

**Fecha:** 28 septiembre 2026 · **Versión de contrato:** `v1` · **Depende de:**
`docs/02_fase2_auditoria_operaciones.md`

Este documento define los contratos que el JSON de instrucciones de Fase 2 pide como segundo
entregable de P0: interpretación de solicitudes, datos faltantes, planes multi-operación, cálculo
de efectos, confirmación, ejecución idempotente y separación previsto/real. Cada contrato dice qué
**ya existe y funciona hoy** (con evidencia) y qué es **nuevo para Fase 2**, para no inventar
donde ya hay una pieza sólida.

## 0. El principio de arquitectura ya está vigente — con una precisión

> "Ningún modelo de IA, canal externo o interfaz debe escribir directamente en la base de datos
> financiera."

Interpretación operativa (para que quede sin ambigüedad): esto rige para **entradas mediadas por
IA o por un canal externo** (chat, futura voz por WhatsApp, futuro documento escaneado). Un
formulario nativo de la app (`app/transaction/new.tsx`, `app/capture.tsx`) no pasa por esta
tubería — el propio acto de tocar "Guardar" ya es la confirmación del usuario sobre su propio
dato; exigirle además un plan-y-confirmación sería friccionar la app sin motivo. Si tu intención
era otra (que hasta los formularios nativos pasen por el catálogo), dímelo y lo ajusto — es una
decisión de producto, no algo que se pueda inferir del código.

Hoy, para el chat, el principio **ya se cumple estructuralmente**:

```
mensaje del usuario
  → ActionAgentProvider.interpretMessage()   (src/providers/types.ts:36-39)
  → ResolvedAction (tipo angosto, del catálogo cerrado)   (src/ai/chatTypes.ts:14-28, 118-132)
  → AIActionProposal { status: 'proposed' }   (se muestra, nada se aplicó aún)
  → ChatActionCard + HoldToConfirmButton   (gesto explícito, no un tap)   (src/components/ChatActionCard.tsx:11-17)
  → aiApplyAction()   (única puerta de escritura — switch exhaustivo)   (src/store/useAppStore.ts:916+)
  → funciones ya validadas del store (addTransaction, addAccount, …)
```

Ningún proveedor de IA toca `addTransaction` directamente; todos pasan por `ResolvedAction` primero.
Este documento extiende esa tubería para planes de varias operaciones — no la reemplaza.

---

## 1. Contrato de interpretación (`interpretMessage` → v2)

**Hoy:** `ActionAgentProvider.interpretMessage(text, ctx): Promise<{ reply: string; action?: ResolvedAction; summary?: string }>`
(`src/providers/types.ts:36-39`) — devuelve **como máximo una** acción por mensaje.

**Nuevo en v1 de este contrato** — la forma de respuesta se vuelve una unión discriminada
versionada, sin romper lo que ya existe (un solo `action` sigue siendo válido, es el caso `plan`
con un solo paso):

```ts
type InterpretResult =
  | { contractVersion: 1; kind: 'reply'; reply: string }
  | { contractVersion: 1; kind: 'clarification'; reply: string; missing: MissingField[] }
  | { contractVersion: 1; kind: 'plan'; reply: string; plan: ActionPlan };

interface MissingField {
  // Qué le falta resolver al catálogo para construir la acción — nunca un
  // campo libre: el mismo vocabulario que ya usan los resolvers de
  // actionCatalog.ts (p.ej. "account", "amount", "category", "goal").
  field: 'account' | 'amount' | 'category' | 'goal' | 'liability' | 'currency' | 'date';
  prompt: string; // pregunta ya redactada para mostrar tal cual, nunca prosa libre del modelo
}
```

`contractVersion` vive en el propio payload (no en el nombre del tipo) para que un mensaje
guardado hace meses siga siendo interpretable por código nuevo — igual que ya hace `AIActionProposal`
al persistir `type`+`args` en vez de un blob genérico.

## 2. Contrato de datos faltantes

**Gap real de hoy:** ni `actionCatalog.ts` ni `chatIntentParser.ts` tienen un camino para "pedir el
dato que falta" — un resolver que no puede completar sus argumentos simplemente no propone nada
(el usuario recibe una respuesta de texto genérica, si acaso). No hay evidencia de una pregunta de
aclaración estructurada en ningún lugar del repo.

**Contrato nuevo:** cuando un resolver de `actionCatalog.ts` identifica una intención pero le falta
un campo obligatorio (p.ej. "transfiere a mi cuenta de ahorros" sin monto), debe devolver
`{ kind: 'clarification', missing: [...] }` en vez de `undefined`. La UI del chat muestra la
pregunta como mensaje del asistente; la respuesta del usuario se reintenta contra el **mismo**
resolver con el campo ya resuelto — nunca se reinicia la conversación ni se le pide repetir todo.

## 3. Contrato de plan multi-operación (`ActionPlan`)

**Gap real de hoy:** `AIActionProposal` (`chatTypes.ts:140-149`) modela **una** acción. No existe
ningún tipo que agrupe varias. "Transfiere $500 a ahorros y regístrame el pago de la tarjeta" hoy
no se puede proponer como una unidad — es la pieza central que pide el JSON de instrucciones
("preparar planes con varias operaciones").

**Contrato nuevo:**

```ts
interface ActionPlan {
  id: string;
  contractVersion: 1;
  steps: AIActionProposal[];      // cada paso sigue siendo un ResolvedAction validado, sin cambios
  status: 'proposed' | 'applying' | 'applied' | 'partially_applied' | 'dismissed' | 'failed';
  createdAt: string;
}
```

Reglas:
- Cada `step` se resuelve y valida **individualmente** contra `actionCatalog.ts` antes de entrar al
  plan — un plan nunca contiene un paso a medio resolver.
- El plan completo se muestra de una vez (ver §4) y se confirma de una vez — no hay confirmación
  paso a paso, para no convertir cada mensaje en una cadena de "mantén presionado" repetida.
- Ejecución **secuencial**, nunca en paralelo: si el paso 2 depende de un efecto del paso 1 (p.ej.
  "pasa $500 de A a B, luego paga la tarjeta desde B"), el orden de escritura debe respetar el orden
  del plan.

## 4. Contrato de cálculo y presentación de efectos

**Hoy:** el `summary` de cada acción (p.ej. "Vas a transferir $500.00 MXN de Débito BBVA a Ahorros")
ya se genera desde datos validados, nunca de la prosa del modelo — es una regla explícita del código
(`chatTypes.ts:136-139`, `chatIntentParser.ts` construye el resumen igual). Esa garantía se conserva
tal cual para cada paso de un plan.

**Nuevo en v1:** un plan además necesita un resumen **agregado** — los saldos resultantes tras
aplicar todos los pasos en orden, no solo la lista de pasos. Ejemplo: mostrar "Débito BBVA quedará en
$1,200.00" (no solo "vas a mover $500"), calculado igual que hoy calcula `computeNetWorth`/
`spendByCategory` (`src/utils/finance.ts`) — en vivo, sobre una copia del estado, nunca escribiendo
nada hasta la confirmación.

## 5. Contrato de confirmación y ejecución idempotente

**Hoy, ya implementado en este mismo commit** (guardia mínima, cambio de una función, sin tocar
ningún flujo existente): `aiApplyAction` ahora rechaza cualquier acción cuyo `status` no sea
`'proposed'` antes de tocar el store (`src/store/useAppStore.ts:916-923`). Antes de este cambio, la
función confiaba en que la UI nunca la llamara dos veces — cierto hoy porque `HoldToConfirmButton`
deshabilita el botón durante `saving`/`success` (`src/components/HoldToConfirmButton.tsx:109,151`),
pero era una suposición de UI, no una garantía del propio ejecutor. Con el guardia, aplicar la misma
propuesta dos veces (doble tap, reintento de red, dos pestañas) devuelve un error explícito en vez
de duplicar la transacción.

**Nuevo en v1, para cuando exista `ActionPlan` (§3):** el mismo principio a nivel de plan —
`aiApplyPlan(plan)` debe:
1. Rechazar si `plan.status !== 'proposed'` (idéntico al guardia de arriba).
2. Marcar `status: 'applying'` **antes** de tocar el primer paso (para que un segundo intento
   concurrente lo vea y se rechace).
3. Aplicar cada paso con `aiApplyAction` (reutiliza el guardia por-paso que ya existe).
4. Si un paso falla a la mitad del plan: **no revertir los pasos ya aplicados** (revertir un
   `addTransaction` ya sincronizado es más riesgoso que dejarlo — spec: "transacción o
   compensación"). En vez de reversión automática, el plan queda `partially_applied` con el detalle
   de qué pasos sí y cuáles no, y el usuario decide el siguiente paso — nunca se reintenta solo.
5. Cada aplicación (completa o parcial) escribe una entrada de auditoría. El mecanismo ya existe:
   `logAudit()` (`useAppStore.ts:318`) ya se usa para cuentas y deudas (líneas 503, 837) — se
   extiende para que cada paso de un plan también quede ahí, no solo esos dos casos.

## 6. Contrato previsto vs. real

Confirma y formaliza la separación que pide el JSON ("los importes previstos afectan proyecciones,
pero no saldos reales hasta que se registren o confirmen"). **Gap real confirmado en la auditoría**
(operaciones #29/#30): `Transaction` (`src/data/types.ts:52-70`) no tiene ningún campo de estado —
todo lo que existe hoy es real por definición.

**Contrato nuevo** (implementación en P3, no ahora — requiere migración):
- Un movimiento previsto es una fila con `status: 'forecast'` (frente al implícito `'posted'` de
  hoy) en la **misma tabla** `transactions` — no una tabla paralela, para que todo el cálculo de
  saldos/presupuesto que ya existe (`finance.ts`) solo necesite filtrar por `status`, no
  reimplementarse dos veces.
- Un `forecast` **nunca** entra a `computeNetWorth` ni al saldo de cuenta; solo a vistas de
  proyección explícitas.
- "Confirmar que ocurrió" (operación #61) transiciona la misma fila de `forecast` → `posted` (con
  su fecha real), nunca crea una fila nueva — así se evita el riesgo #1 del propio inventario
  ("Presupuesto previsto duplica saldo real").

## 7. Interfaces de adaptadores — cuáles ya existen y cuáles son solo contrato todavía

Ya implementadas y en uso (`src/providers/types.ts`) — no se tocan:

| Interfaz | Para qué | Estado |
|---|---|---|
| `SpeechToTextProvider` | Transcripción de voz | En uso (líneas 93-107) |
| `ActionAgentProvider` / `AIInterpreterProvider` | Proveedor de IA | En uso — este documento lo extiende (§1), no lo reemplaza |
| `MarketDataProvider`, `ExchangeRateProvider` | Cotizaciones, tipo de cambio | En uso |

**Nuevas — documentadas aquí como contrato, sin archivo de código todavía** (restricción explícita
del JSON: "no añadas... proveedores solo para aparentar preparación futura"; se implementan cuando
su fase los necesita de verdad):

```ts
// P3 — cuando exista la entidad "aviso" (§6 de docs/02, operaciones 58-65)
interface NotificationProvider {
  name: string;
  requestPermission(): Promise<'granted' | 'denied'>;
  schedule(reminder: { id: string; at: string; title: string; body: string }): Promise<void>;
  cancel(reminderId: string): Promise<void>;
}

// P3/futuro — lectura de recibos/facturas (puerta "whatsapp_y_otros_canales")
interface DocumentReaderProvider {
  name: string;
  extractTransaction(doc: { uri: string; mimeType: string }): Promise<{
    candidate: Partial<AddTransactionArgs>;
    confidence: number;       // nunca se autoaplica; siempre pasa por §2/§3 como cualquier otra propuesta
    sourceDescription: string; // qué se leyó, para mostrarle al usuario el origen antes de confirmar
  }>;
}

// Futuro — vínculo cuenta VALU ↔ identidad externa (WhatsApp u otro canal)
interface ExternalIdentityLink {
  channel: 'whatsapp' | string;
  externalId: string;
  valuUserId: string;
  consentedAt: string;
  revoke(): Promise<void>;
}

// Futuro — entrada de canal externo, independiente del canal
interface ExternalChannelInput {
  channel: string;
  receive(payload: unknown): Promise<{ text?: string; attachments?: Array<{ uri: string; mimeType: string }> }>;
  // El resultado entra al MISMO ActionAgentProvider.interpretMessage() que usa el chat interno —
  // un canal externo nunca tiene su propio camino de escritura.
}
```

Ninguna de estas cuatro tiene implementación ni tabla asociada todavía — son el "punto de extensión
con contrato, caso de uso y prueba" que pide la restricción, sin construir infraestructura muerta.

## 8. Compatibilidad hacia atrás

Todo lo nuevo en este documento (`contractVersion`, `ActionPlan`, `MissingField`) es **aditivo**:
`AIActionProposal` no cambia de forma, `aiApplyAction` sigue aceptando exactamente lo mismo que
acepta hoy (el guardia de idempotencia es la única modificación de comportamiento, y es
estrictamente más estricto, nunca más permisivo). Un `ActionPlan` de un solo paso es indistinguible
en efectos de una `AIActionProposal` suelta de hoy.

## Condición de la puerta P0

Con este documento y `docs/02_fase2_auditoria_operaciones.md`:
✅ Contratos de datos previstos/reales, plan multi-operación, confirmación e idempotencia — definidos.
✅ Primer guardia de idempotencia real, implementado y verificado (`npx tsc --noEmit` limpio).
➡️ P0 completo. Siguiente: Semana 3 — golden set de 1,000 casos (P1), pendiente de que confirmes
que sigo con eso o quieres revisar algo de lo anterior primero.

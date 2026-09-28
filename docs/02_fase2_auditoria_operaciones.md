# Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1)

**Fecha:** 28 septiembre 2026 · **Rama:** `claude/valu-finance-ai-app-rxlwyi` · **Commit base:** `9ddbc99`
**Estado:** P0-S1 cerrado. Este documento es la "matriz del estado real de las 65 operaciones, con
evidencia en archivos del repositorio" pedida como primer entregable de Fase 2.

## De dónde sale el "65"

El registro de 65 operaciones candidatas y el JSON de instrucciones de Fase 2 se recibieron de una
sesión externa ("Dana") que trabajó **sin inspeccionar el repositorio**, citando el blueprint de
Fase 1 y el `.docx` de Fase 2 como única fuente. Su propia hoja `Fuentes` lo dice explícitamente:

> "No se inspeccionó el repositorio en esta tarea. Todo estado más allá de los 14 tipos confirmados
> por el blueprint requiere auditoría."

Este documento es esa auditoría: las 65 filas de `Inventario_65` verificadas una por una contra el
código real, con archivo y línea. Cuatro subagentes de exploración (uno por bloque de áreas)
leyeron el store, las pantallas y las migraciones — ninguno asumió nada del inventario original.

## Catálogo de chat confirmado (única fuente de verdad para "¿está en el chat?")

`src/ai/chatTypes.ts:14-28` — 14 valores de `AIActionType`: `add_transaction`, `add_account`,
`delete_account`, `add_goal`, `contribute_to_goal`, `update_goal_target`, `delete_goal`,
`add_liability`, `update_liability_balance`, `delete_liability`, `set_budget_line`,
`delete_budget_line`, `delete_transaction`, `transfer_between_accounts`.

## Resultado agregado

| Estado real | Operaciones | % del total |
|---|---:|---:|
| **Implementada en chat** | 16 | 24.6% |
| **Implementada en UI/datos, NO en chat** | 24 | 36.9% |
| **No implementada** | 17 | 26.2% |
| **Requiere nueva tabla/columna** | 8 | 12.3% |
| Total | 65 | 100% |

**El hallazgo con más apalancamiento:** 24 operaciones ya tienen código funcionando en la UI (con su
tabla, su store, su pantalla) pero ningún `AIActionType` las expone al chat. Conectarlas al mismo
catálogo (objetivo explícito de P2, semana 9: *"Conectar chat y captura al registro auditado"*) más
que duplica la cobertura del chat — de 16 a 40 operaciones (+150%) — **sin escribir una sola
migración nueva.** Es el trabajo de mayor retorno antes de construir nada nuevo.

Las 17 "no implementadas" y las 8 que "requieren nueva tabla/columna" son las candidatas reales a
P3 (semanas 10-14). Avisos concentra 7 de las 8 completamente ausentes — no hay `expo-notifications`
ni entidad de recordatorio en ningún lado; es la pieza más cara de construir desde cero.

Estados posibles (definición operacional usada por los 4 auditores):
- **Implementada en chat** — el `AIActionType` existe y su resolver en `actionCatalog.ts` valida y aplica. No implica que cubra el 100% de la precondición original (ver notas por fila).
- **Implementada en UI y datos, NO en chat** — función real en el store y/o una pantalla; ningún tipo de `AIActionType` la cubre.
- **No implementada** — no hay código de producto que la resuelva (puede haber una función *muerta* sin UI que la invoque; se marca en la nota).
- **Requiere nueva tabla o columna** — el modelo de datos actual no tiene dónde guardar lo que la operación necesita.

---

## Movimientos (11 operaciones)

| ID | Operación | Estado real | Evidencia | Nota |
|---|---|---|---|---|
| 01 | Registrar ingreso real | Implementada en chat | `app/transaction/new.tsx:17-20`; `actionCatalog.ts:236-267` | Sin selector de fecha (siempre "ahora") ni validación de duplicado en ningún lado. |
| 02 | Registrar gasto real | Implementada en chat | `app/transaction/new.tsx:17-20`; `useAppStore.ts:451-455` | Igual que 01. |
| 03 | Transferir entre cuentas | Implementada en chat | `actionCatalog.ts:277-298`; `useAppStore.ts:937-954` | Solo vía chat (sin UI manual); valida origen/destino/misma moneda pero NO saldo suficiente. |
| 04 | Editar movimiento | Implementada en UI y datos, NO en chat | `app/transaction/[id].tsx:39-47`; `useAppStore.ts:457-467` | `updateTransaction` revierte y reaplica deltas de cuenta correctamente. |
| 05 | Eliminar movimiento | Implementada en chat | `useAppStore.ts:469-476`; `chatTypes.ts:27` | Borrado suave + reversión de deltas. |
| 06 | Dividir movimiento | **No implementada** | `localParser.ts:522-527` | `splitCaptureSegments` separa frases de una captura en transacciones independientes — no es partir un movimiento en partidas que sumen el total. |
| 07 | Reclasificar movimiento | Implementada en UI y datos, NO en chat | `app/transaction/[id].tsx:26,40-44` | Selector de categoría al editar. |
| 08 | Excluir del presupuesto | Implementada en UI y datos, NO en chat | `data/types.ts:65-69`; `app/transaction/new.tsx:66-107` | Campo `excludeFromBudget` + toggle; `AddTransactionArgs` no lo incluye. |
| 09 | Programar movimiento recurrente | **Requiere nueva tabla o columna** | migraciones 0001-0019 (ninguna) | Sin tabla de reglas ni campo de recurrencia en `Transaction`. |
| 10 | Editar regla de recurrencia | **Requiere nueva tabla o columna** | — | Depende de 09, inexistente. |
| 11 | Pausar/reactivar recurrencia | **Requiere nueva tabla o columna** | — | Igual, no hay entidad de recurrencia. |

## Cuentas (8 operaciones)

| ID | Operación | Estado real | Evidencia | Nota |
|---|---|---|---|---|
| 12 | Crear cuenta | Implementada en chat | `AccountForm.tsx:143-151`; `actionCatalog.ts:302-311` | En UI la moneda es fija (`defaultCurrency`); en chat sí es elegible. |
| 13 | Editar cuenta | Implementada en UI y datos, NO en chat | `app/(tabs)/patrimonio.tsx:78,269-273`; `useAppStore.ts:496-511` | Sin `update_account` en `AIActionType`. |
| 14 | Eliminar cuenta | Implementada en chat | `useAppStore.ts:513-519`; `actionCatalog.ts:313-318` | Borrado suave; **no resuelve dependencias** (transacciones de esa cuenta no se reasignan ni avisan). |
| 15 | Ajustar saldo por movimiento | Implementada en UI y datos, NO en chat | `AccountForm.tsx:45-51,142-151`; `useAppStore.ts:502-511` | ⚠️ El ajuste desde Patrimonio **sobrescribe** `balance` directo (solo genera `audit_log`, no un asiento) — contradice la precondición "no sobrescribir saldo". El único camino con asiento trazable real es un `add_transaction` genérico. |
| 16 | Marcar cuenta de transporte | **No implementada** | `data/types.ts:86-90`; `mappers.ts:31,48` | Columna `is_transport_card` existe (migración 0010) pero sin ningún control de UI ni de chat. |
| 17 | Cambiar inclusión en presupuesto | Implementada en UI y datos, NO en chat | `ConceptBudgetForm.tsx:95,103,371-372` | `SetBudgetLineArgs` no incluye cuentas. |
| 18 | Archivar cuenta | Implementada en UI y datos, NO en chat | `useAppStore.ts:513-519`; `selectors.ts:18-21` | Es el mismo soft-delete que "eliminar" — el código no distingue archivar de eliminar. |
| 19 | Restaurar cuenta archivada | **No implementada** | búsqueda `restore\|archivedAt\|isArchived` sin resultados | No existe función que limpie `deletedAt`. |

## Presupuestos (16 operaciones)

| ID | Operación | Estado real | Evidencia | Nota |
|---|---|---|---|---|
| 20 | Crear plantilla | Implementada en UI y datos, NO en chat | `useAppStore.ts:595-600`; `app/presupuesto.tsx:61,411` | Nombre+periodicidad+color+icon. |
| 21 | Renombrar plantilla | Implementada en UI y datos, NO en chat | `useAppStore.ts:601-606`; `BudgetTemplateList.tsx:144,159` | Solo patch de metadatos. |
| 22 | Eliminar plantilla | Implementada en UI y datos, NO en chat | `useAppStore.ts:608-626` | Bloquea solo si `isDefault`; cascada de soft-delete automática. |
| 23 | Asignar plantilla a periodo | Implementada en UI y datos, NO en chat | `useAppStore.ts:685-691`; `finance.ts:1124` | Overlap se detecta y pide confirmación, no bloquea duro. |
| 24 | Desasignar plantilla | **No implementada** | `useAppStore.ts:671-684,692-704` | `unassignPeriod`/`removeBudgetAssignment` existen pero **código muerto** — ningún `.tsx` las invoca. |
| 25 | Crear partida | Implementada en chat | `actionCatalog.ts:400-411` (`set_budget_line`) | Solo sobre la plantilla default, categoría+monto. |
| 26 | Editar partida | Implementada en UI y datos, NO en chat | `useAppStore.ts:627-638`; `presupuesto.tsx:200` | Chat no cubre cuentas incluidas ni frecuencia. |
| 27 | Eliminar partida | Implementada en chat (alcance plantilla); UI cubre alcance periodo | `actionCatalog.ts:413-420`; `presupuesto.tsx:254,257` | "Solo este periodo" es exclusivo de UI (override). |
| 28 | Crear excepción de periodo | Implementada en UI y datos, NO en chat | `useAppStore.ts:705-764`; migración `0014` L118-152 | Tabla `period_budget_overrides`. |
| 29 | Registrar ingreso previsto | **Requiere nueva tabla o columna** | `data/types.ts:52-70` | `Transaction` no tiene campo de estado previsto/pending. |
| 30 | Registrar gasto previsto | **Requiere nueva tabla o columna** | — | Mismo caso que 29. |
| 31 | Definir rango de presupuesto | Implementada en UI y datos, NO en chat | migración `0017`; `useAppStore.ts:685-691` | Prorrateo es cálculo interno silencioso, sin control expuesto al usuario. |
| 32 | Duplicar plantilla | **No implementada** | — | Sin función en store ni UI. |
| 33 | Mover asignación entre partidas | **No implementada** | — | Solo edición independiente por línea, sin operación atómica. |
| 34 | Pausar partida en periodo | Implementada en UI y datos, NO en chat | `useAppStore.ts:705-764`; `presupuesto.tsx:254` | Override con `monthlyAmount:null`, reversible. |
| 35 | Reactivar partida en periodo | Implementada en UI y datos, NO en chat | `useAppStore.ts:765+`; `presupuesto.tsx:101` | `clearPeriodOverride`, recalcula solo ese periodo. |

*Nota: todo lo de Presupuestos en chat se reduce a `set_budget_line`/`delete_budget_line` sobre la plantilla default — ninguna operación de plantillas/asignaciones/overrides está en el catálogo de chat.*

## Metas (7 operaciones)

| ID | Operación | Estado real | Evidencia | Nota |
|---|---|---|---|---|
| 36 | Crear meta | Implementada en chat | `actionCatalog.ts:322-330`; `metas.tsx:60-66` | Chat no fija fecha objetivo. |
| 37 | Cambiar importe objetivo | Implementada en chat | `actionCatalog.ts:341-352`; `useAppStore.ts:986` | `currentAmount` queda intacto. |
| 38 | Cambiar fecha objetivo | Implementada en UI y datos, NO en chat | `metas.tsx:276,298,309`; `useAppStore.ts:783-789` | `update_goal_target` no cubre `targetDate`. |
| 39 | Aportar a meta | Implementada en chat | `actionCatalog.ts:332-339`; `useAppStore.ts:790-796` | `Goal` no tiene `accountId` — nunca descuenta una cuenta real. |
| 40 | Retirar de meta | Implementada en UI y datos, NO en chat | `metas.tsx:73-81,244-249` | Sin `logAudit` para goals → reversión no trazable; sin acción de chat. |
| 41 | Eliminar meta | Implementada en chat | `actionCatalog.ts:354-359`; `useAppStore.ts:797-803` | Borrado suave, sin dependencias. |
| 42 | Programar aportación periódica | **No implementada** | `data/types.ts:225-232` | Sin campos de recurrencia; concepto inexistente. |

## Deudas (9 operaciones)

| ID | Operación | Estado real | Evidencia | Nota |
|---|---|---|---|---|
| 43 | Crear deuda | Implementada en chat | `actionCatalog.ts:363-376`; migración `0003` L41-59 | Sin "sentido" (debo/me deben) ni contraparte. |
| 44 | Cambiar saldo de deuda | Implementada en chat | `actionCatalog.ts:378-389`; `useAppStore.ts:830-845` | `logAudit` automático; sin campo "motivo" capturable. |
| 45 | Cambiar vencimiento | Implementada en UI y datos, NO en chat | `patrimonio.tsx:379,452`; migración `0003` L47 | `due_date timestamptz` sin manejo explícito de zona horaria. |
| 46 | Registrar pago de deuda | **No implementada** | `patrimonio.tsx:385-391,426-450` | Solo ajuste manual de `balance`; nunca crea transacción ni toca cuenta. |
| 47 | Aumentar deuda | Implementada en chat | mismo resolver que #44 | No distingue "nuevo principal" como concepto separado. |
| 48 | Marcar deuda liquidada | **No implementada** | `data/types.ts:258-271` | Sin campo `status`; solo borrar o poner `balance` en 0 a mano. |
| 49 | Eliminar deuda | Implementada en chat | `actionCatalog.ts:391-396`; `useAppStore.ts:847-853` | Borrado suave. |
| 50 | Cambiar contraparte o sentido | **Requiere nueva tabla o columna** | `data/types.ts:258-271`; migración `0003` L41-59 | Sin campo `counterparty`/sentido. |
| 51 | Definir plan de cuotas | **Requiere nueva tabla o columna** | migraciones 0001-0019 | Sin tabla/columnas para plan de cuotas. |

## Inversiones (6 operaciones)

| ID | Operación | Estado real | Evidencia | Nota |
|---|---|---|---|---|
| 52 | Crear posición | Implementada en UI y datos, NO en chat | `inversiones.tsx:46,71`; `useAppStore.ts:805-809`; migración `0003` L9-25 | Ticker/clase/moneda/cantidad/costo capturados; fuera de `AIActionType`. |
| 53 | Editar posición | Implementada en UI y datos, NO en chat | `useAppStore.ts:810-816` | "Rastro de cambios" se limita a `updatedAt`, no hay historial. |
| 54 | Registrar compra | Implementada en UI y datos, NO en chat | `inversiones.tsx:697-752` | ⚠️ "Cuenta origen" **no es una `Account` real** — sale de una posición sintética "Liquidez" (líneas 61-82). |
| 55 | Registrar venta | Implementada en UI y datos, NO en chat | `inversiones.tsx:727-751`; migración `0007` | `realizedPnL` sí se calcula; "cuenta destino" también es la Liquidez sintética. |
| 56 | Eliminar posición | Implementada en UI y datos, NO en chat | `useAppStore.ts:817-823` | Soft delete; no aplica "transacciones vinculadas" porque no existen — `investment_buy/sell` nunca escriben el ledger general. |
| 57 | Registrar dividendo | **No implementada** | búsqueda exhaustiva de "dividend" | Campo `dividendsReceived` existe en esquema pero nada lo escribe. |

## Avisos (8 operaciones)

| ID | Operación | Estado real | Evidencia | Nota |
|---|---|---|---|---|
| 58 | Crear recordatorio | **No implementada** | búsqueda exhaustiva | Sin `expo-notifications`; "Recordatorios para ti" (`index.tsx:651-663`) es solo texto derivado de vencimientos de deudas. |
| 59 | Cambiar horario de aviso | **No implementada** | búsqueda exhaustiva | No existe entidad "aviso programado". |
| 60 | Configurar hasta tres intentos | **Requiere nueva tabla o columna** | búsqueda exhaustiva | Sin rastro de reintentos/ventanas. |
| 61 | Confirmar que ocurrió | **No implementada** | búsqueda exhaustiva | No existe "previsto vs real" para avisos. |
| 62 | Posponer aviso | **No implementada** | búsqueda exhaustiva | Sin infraestructura que posponer. |
| 63 | Cancelar aviso | **No implementada** | búsqueda exhaustiva | Sin scheduler ni background jobs. |
| 64 | Confirmar que no ocurrió | **No implementada** | búsqueda exhaustiva | No existe la entidad base. |
| 65 | Omitir una ocurrencia | **No implementada** | búsqueda exhaustiva | No existe recurrencia de avisos que omitir. |

*Búsqueda cubrió todo el repo (`recordatorio|aviso|notification|reminder|expo-notifications`, excluyendo `node_modules`); los hits reales son copy coloquial, `Haptics.notificationAsync` (feedback táctil, no push) o el widget derivado de deudas.*

---

## Divergencias resueltas frente al inventario original

La hoja `Inventario_65` traía una columna "Estado" propuesta sin auditar. Las diferencias más
importantes con la realidad verificada:

1. **"Confirmado en chat" no siempre significa cobertura completa.** 8 de las 16 operaciones marcadas
   así (01,02,03,25,27,36,37,39,41,43,44,47,49 — trece en realidad) sí están en el catálogo, pero
   varias omiten un campo de la precondición original (fecha en ingresos/gastos, validación de saldo
   en transferencias, fecha objetivo en metas, motivo en ajustes de deuda). Quedó anotado fila por fila.
2. **Bug conceptual en Inversiones:** el inventario asumía "cuenta origen/destino" reales; el código
   usa una posición sintética "Liquidez" — comprar/vender nunca toca el store de cuentas. Esto es una
   decisión de diseño a revisar en P3, no un bug de auditoría.
3. **Código muerto real:** `unassignPeriod`, `removeBudgetAssignment` (presupuestos) y la ausencia de
   `restore` para cuentas archivadas son casos donde el store tiene más lógica que la UI expone.
4. **Ajuste de saldo de cuenta (15) contradice su propia precondición:** el código actual sobrescribe
   `balance` en vez de generar un asiento — hay que decidir si eso se corrige en P2/P3 o se documenta
   como comportamiento intencional.

## Condición de la puerta P0 (según `Fases`: *"100% del inventario identificado y divergencias resueltas"*)

✅ 65/65 operaciones identificadas con evidencia verificable.
✅ Divergencias documentadas arriba.
➡️ Sigue: contratos versionados (`docs/03_fase2_contratos_v1.md`) — Semana 2 de P0.

# Tarjeta de crédito — que no se te pase ni el corte ni el pago

Ver también: [[README|Índice]] · [[10-p3-previsto-recurrentes-avisos-deudas|P3]] · [[04-migraciones-supabase|Migraciones]] · [[06-pendientes|Pendientes]]

Fecha: 2026-10-04. Rama `claude/valu-finance-ai-app-rxlwyi`. Pedido: «para que las personas nunca se les pase sus fechas de
pago ni de corte ni de nada; debe funcionar al cien».

## En una frase

Pones **el día de corte y el día límite de pago** de cada tarjeta (desde la pantalla *Tarjetas de crédito* o diciéndoselo al
chat: «mi tarjeta Oro corta el 5 y paga el 25») y VALU: **te avisa** antes del corte, el día del corte, varios días antes del
pago y el día límite (insistiendo hasta 3 veces si no confirmas), te dice **cuánto falta para no generar intereses**, te deja
**pagar la tarjeta** desde una de tus cuentas, y **da el aviso por cubierto solo cuando el saldo de verdad lo cubre**.

## Cómo funciona (reglas)

| Concepto | Regla |
|---|---|
| Corte | Cada mes cierra el estado de cuenta. Lo que gastas **hasta ese día (incluido)** entra a ese estado. |
| Fecha límite de pago | El **primer día con ese número DESPUÉS del corte**: corte 5 / pago 25 → ese mismo mes; corte 25 / pago 15 → el mes siguiente; mismo número → el mes siguiente. |
| Meses cortos | Un día 30 o 31 en un mes más corto usa el último día de ese mes (febrero incluido, también en bisiestos). |
| Pago para no generar intereses | `saldo que debías al último corte` − `pagos, abonos y reembolsos registrados después del corte`. Las compras nuevas **no** entran: van al siguiente estado. |
| Estado del pago | *pendiente* (antes del límite), *vencido* (después), *cubierto*, o *sin saldo que pagar* (saldo cero o a favor). |
| Saldo al corte | Se reconstruye del saldo de hoy menos lo que pasó después del corte. Solo incluye **lo que has registrado en VALU**: intereses, comisiones o compras a meses sin intereses que el banco cargue pero tú no hayas anotado **no aparecen** — compáralo con tu estado de cuenta. |

## Lo que garantiza que no se te pase

1. **Dos series de avisos por tarjeta** (corte y pago), generadas **6 meses por adelantado** aunque no abras la app, con **ids
   deterministas por tarjeta**: dos dispositivos que configuran la misma tarjeta producen los **mismos** avisos y no se duplica
   ninguno (probado).
2. **Avisos previos y del día** (por defecto: corte 1 día antes y el día; pago 5 y 2 días antes y el día límite a las 9:00), y el
   **día límite insiste hasta 3 veces** (cada 2 h, sin sonar de 22:00 a 6:59) si no confirmas. Todo configurable por tarjeta.
3. **Push desde el servidor** (la misma fase de avisos de P3, sin montos) **+ tarjeta en el inicio** (con monto, solo dentro de la
   app) **+ calendario .ics** (Tarjetas → «Descargar calendario») como respaldo que no depende de nada nuestro.
4. **El aviso se cierra solo si el saldo lo cubre** (no por un toque): un **pago parcial no cierra nada**. Si después **borras ese
   pago**, el aviso se **reabre** y vuelve a insistir. Un «ya pagué» manual (pagaste por fuera de VALU) nunca se reabre.
5. Cambiar el día de corte o de pago **acomoda los avisos futuros** sin duplicar; renombrar la tarjeta actualiza sus títulos;
   quitar las fechas o borrar la tarjeta **cancela** sus avisos (y volver a poner las fechas los revive con el mismo id).

## Dónde está

| Pieza | Archivos |
|---|---|
| Cálculo puro (ciclo, estado de cuenta, avisos) | `src/utils/creditCard.ts` |
| Store | `setCardSettings`, `clearCardSettings`, `payCard`, `refreshCards` en `src/store/useAppStore.ts` |
| Pantalla | `app/tarjetas.tsx`, `src/components/p3/CardPanel.tsx`; atajos en el menú, Patrimonio y el inicio (`AttentionWidget`) |
| Chat | acción `set_card_dates` (`actionCatalogP3.ts`, `p3Intents.ts`) y respuestas a «¿cuándo pago mi tarjeta?» (`localCopilot.ts`) |
| Datos | `Account.cardCutoffDay/cardDueDay/creditLimit/cardMinPayment/cardAlerts`; migración `0024_credit_card_dates.sql` |
| Pruebas | `scripts/golden/tarjeta.cjs` (22, incluye un barrido de 4 años × todas las combinaciones de días) y `tarjeta-store.cjs` (26) |

## Decisiones que tomé por defecto (cámbialas si no te gustan)

- Horario de avisos 9:00; corte: 1 día antes y el día; pago: 5 y 2 días antes y el día límite, con 3 intentos.
- La **fecha límite se deduce** del día que escribes (primer día de ese número después del corte); no hay un campo «días después del corte».
- El **pago mínimo** lo escribe la persona (viene en su estado de cuenta); VALU no lo calcula.
- **Intereses, comisiones y meses sin intereses no se modelan**: el cálculo es «lo registrado».
- Un pago **de más** que la deuda se rechaza (para no crear saldos a favor por error).

## Lo que falta

- Correr la migración **0024** (y la **0023**, que ahora trae `auto_settled`) en Supabase y desplegar `push-notify`.
- Probar en un teléfono real el push de corte/pago, el silencio nocturno y el `.ics`.
- Compras a meses sin intereses (MSI): hoy no hay una forma de modelarlas; sería lo siguiente natural.

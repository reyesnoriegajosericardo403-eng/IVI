# P3 — Previsto vs. real, pagos recurrentes, avisos, deudas y dividendos

Ver también: [[README|Índice]] · [[09-p2-planificador-fechas-y-catalogo-en-segundo-plano|P2]] · [[04-migraciones-supabase|Migraciones]] · [[06-pendientes|Pendientes]] · contratos: `docs/03_fase2_contratos_v1.md` §6

Fecha: 2026-10-04. Rama `claude/valu-finance-ai-app-rxlwyi`.

## En una frase

Antes VALU solo conocía lo que **ya pasó**. Ahora también conoce lo que **va a pasar**: un movimiento *previsto* no toca
ningún saldo hasta que confirmas que ocurrió; un *pago recurrente* (renta, sueldo, Netflix, ahorro a una meta) genera sus
previstos y sus avisos por adelantado; un *aviso* insiste hasta 3 veces si no lo confirmas; las **deudas** se pagan (o se
cobran) moviendo dinero de verdad, con cuotas y «saldada»; y el chat entiende todo esto en español.

## Reglas de oro (lo que no se negocia)

1. **Un previsto NUNCA mueve saldos, patrimonio, gasto, ingreso ni presupuesto.** Solo `status: 'posted'` cuenta
   (`accountDeltasForTransaction` devuelve `[]` para cualquier otro estado; `selectActiveTransactions` los excluye).
   Aparece únicamente en proyecciones explícitas («próximos 30 días») y en avisos.
2. **Todo lo generado es idempotente.** Los ids de previstos y ocurrencias salen de una función determinista
   (`deterministicId('forecast', regla, fecha)`): dos dispositivos que generan lo mismo producen **el mismo id** y no se
   duplica nada; correr la generación 3 veces deja lo mismo. Un previsto confirmado, omitido o borrado **jamás se recrea**.
3. **Los avisos nunca llevan montos ni saldos** (se leen en la pantalla bloqueada): solo el título que escribió la persona.
4. **Si falla, no se pierde.** Una entrega que no llegó a ningún dispositivo no gasta un intento y se reintenta; un estado que
   se rebobina no vuelve a sonar (llave de idempotencia por intento); sin conexión, la app y el calendario `.ics` siguen.
5. **Nada se aplica sin confirmar** y lo que se confirma no se duplica (mismo contrato de P2).

## Mapa de piezas

| Pieza | Archivos | Qué hace |
|---|---|---|
| Repetición | `src/utils/recurrence.ts`, `recurrencePresets.ts` | Diaria/semanal/quincenal/mensual/anual; día 31 = último día; semana desde lunes; `startDate`, `endDate` inclusivo, `count` |
| Previsto | `src/utils/forecast.ts`, `ledger.ts`, `store/selectors.ts` | Consultas puras, proyección de saldos, primer faltante («el día 12 no te alcanza») |
| Generación | `src/utils/materialize.ts`, `deterministicId.ts` | Previstos 90 días y ocurrencias de avisos 180 días por adelantado; reconciliar al editar/pausar/terminar |
| Validación | `src/utils/p3Validation.ts` | Una sola definición de «qué es válido» para store, pantallas y chat |
| Deudas | `src/utils/debts.ts` | Quién debe a quién, cuotas, validar y aplicar un pago |
| Calendario | `src/utils/ics.ts` | `.ics` (RFC 5545) como respaldo que no depende del servidor |
| Store | `src/store/useAppStore.ts` | `addForecast`, `confirm/skip/reopen/postponeForecast`, `create/update/pause/resume/end/deleteRule`, avisos, `payLiability`, `settleLiability`, `registerDividend`, `runMaterialization` |
| Sincronización | `SyncEngine.ts`, `repositories.ts`, `mappers.ts` | Tablas opcionales con marca por tabla; columnas nuevas solo si tienen valor |
| Servidor de avisos | `supabase/functions/push-notify/index.ts`, `_shared/reminderCron.ts` | Fase de avisos del cron horario (lógica pura aparte, probada en Node) |
| Pantallas | `app/avisos.tsx`, `app/recurrentes.tsx`, `src/components/p3/*`, Movimientos → «Previstos», Patrimonio → deudas, formulario con «¿Cuándo?» | Todo lo anterior a la vista |
| Chat | `src/ai/actionCatalogP3.ts`, `p3Intents.ts`, `recurrenceText.ts`, `virtualIds.ts`, `validationContext.ts` | 15 acciones nuevas, ids virtuales entre pasos de un plan |
| Migración | `supabase/migrations/0023_p3_forecast_recurring_reminders.sql` | Columnas nuevas y 3 tablas (ver [[04-migraciones-supabase]]) |
| Despliegue sin terminal | `.github/workflows/desplegar-funciones.yml` | «Run workflow» en GitHub Actions despliega las funciones (necesita un secreto, ver [[06-pendientes]]) |

## 1. Previsto vs. real

`Transaction.status`: `posted` (o sin valor = real), `forecast` (por ocurrir), `skipped` («no ocurrió»), `paused`.

- **Confirmar** (`confirmForecast`): pasa a real **hoy** (o a su fecha si ya pasó), con otro monto o cuenta si cambió; recién ahí
  el ledger mueve los saldos, **una sola vez** (un segundo toque falla sin tocar nada). No se puede confirmar con fecha
  futura, monto inválido ni una cuenta que ya no existe.
- **No ocurrió** (`skipForecast`) y **reabrir** (`reopenForecast`); **posponer** (`postponeForecast`) conserva `plannedDate`.
- Una **tarjeta de crédito** respeta la convención de pasivos: confirmar un gasto previsto en ella **sube** la deuda.
- Pantalla: Movimientos → pestaña **Previstos** (totales de 30 días, aviso de faltante, «pasaron de fecha — ¿ocurrieron?»).
- El formulario manual tiene «¿Cuándo?»: *Ya ocurrió* / *Está previsto* (+ fecha) y «¿Se repite?» (crea un pago recurrente).

## 2. Pagos recurrentes

`RecurringRule` genera previstos (gasto, ingreso, transferencia, ahorro) o recuerda una **aportación periódica a una meta**
(confirmar el aviso aporta a la meta una sola vez; si la meta ya no existe falla y el aviso **no** se cierra).

- Crear: previstos futuros + un aviso (por defecto el día a las 9:00; opciones: avisos previos, hora, hasta 3 intentos, push).
- **Pausar** quita sus previstos y avisos futuros; **reanudar** los vuelve (los de fechas ya pasadas quedan omitidos, no se
  inventan). **Terminar** quita lo que aún no pasa y conserva lo confirmado. **Cambiar monto** actualiza los abiertos,
  nunca lo ya confirmado. **Eliminar** borra la regla y sus previstos abiertos.
- Se mantiene al día solo: `useMaterialization` corre al abrir la app, cada 10 minutos y al volver a primer plano.

## 3. Avisos (recordatorios)

Una **serie** (`Reminder`: una vez o repetida) tiene **ocurrencias** (`ReminderOccurrence`) con copia de lo que el servidor
necesita (título, intentos), así el cron no junta tablas.

| Regla | Valor |
|---|---|
| Intentos | 1 a 3; entre intentos, múltiplos de 60 min (el servidor corre cada hora) |
| Aviso previo («faltan 3 días») | suena **una** vez; solo el del día reintenta |
| Silencio | los **reintentos** no suenan de 22:00 a 6:59 (hora del usuario); el primer aviso suena a la hora que eligió |
| Tolerancia del cron | un intento a las 11:00:03 que se repite 2 h después sale en la corrida de las 13:00:01 |
| Atraso | pasadas 48 h ya no se manda push (sigue visible en la app) |
| Confirmación | «Ya ocurrió» cierra la ocurrencia **y** los avisos previos; sin confirmar, sigue pendiente |
| Posponer | 1 h, 3 h, mañana 9:00 o un día; reinicia los intentos |

Servidor (`runReminders`, dentro del cron existente `valu-push-hourly`): reclama el intento en `notification_log` **antes** de
mandar; si no llegó a ningún dispositivo **libera** la llave (se reintenta, no se pierde); si la llave ya existía solo pone al
día el estado sin volver a sonar; actualiza la ocurrencia **solo si sigue abierta** (si la confirmaste mientras tanto, no se
pisa). Si la migración 0023 no está corrida, la fase de avisos se salta sin romper lo demás (deudas y recordatorio diario).

**Respaldo sin servidor:** Avisos → «Descargar calendario (.ics)» (versión web) para Apple/Google Calendar.

## 4. Deudas ampliadas y dividendos

- `direction`: *yo debo* / *me deben* (lo que te deben es un **activo por cobrar** en el patrimonio); `counterparty`; `status`
  activa/saldada; plan de **cuotas** mensuales (cuántas, de cuánto, primera fecha, pagadas) con próxima fecha y atraso.
- **Pagar** (`payLiability`): baja el saldo, avanza cuotas (y la fecha de pago a la siguiente), registra el gasto en la cuenta
  elegida (categoría Deudas) y, al llegar a 0, queda **saldada**. **Cobrar** es lo inverso (ingreso). No se paga con una
  tarjeta de crédito, ni con otra moneda, ni más de lo que se debe; sin cuenta solo ajusta la deuda. **Saldar** / **reabrir**.
- **Dividendos** (`registerDividend`): ingreso a la cuenta elegida y suma a `dividendsReceived` de la posición.
- Los recordatorios de pago (dashboard y push) ya no incluyen deudas saldadas ni lo que te deben.

## 5. Chat: 15 acciones nuevas

`add_forecast`, `confirm_forecast`, `skip_forecast`, `postpone_forecast`, `add_recurring`, `add_recurring_contribution`,
`update_recurring_amount`, `pause_recurring`, `resume_recurring`, `end_recurring`, `add_reminder`, `cancel_reminder`,
`pay_liability`, `settle_liability`, `register_dividend`. Mismas reglas del catálogo cerrado: se resuelven **por nombre contra
datos reales**, el resumen lo arma el código, pregunta cuando falta un dato y nada se aplica sin «mantén para confirmar».

Ejemplos: «recuérdame pagar la luz el 15 a las 9», «cada mes pago 199 de Spotify con BBVA», «el viernes me depositan 12000
en BBVA», «ya pagué la renta, fueron 8100», «pausa Netflix», «pagué 500 a Coppel desde BBVA», «Juan me pagó 300 en BBVA»,
«me llegó un dividendo de 120 de FUNO11 en Nu».

**Ids virtuales entre pasos** (cierra el pendiente de P2): «crea la cuenta Ahorro2 con 500 y transfiere 200 de BBVA a
Ahorro2» ahora arma **un plan de 2 pasos**. Al armar, cada paso se valida contra una copia del contexto *tal como quedaría*
tras los anteriores (la cuenta nueva existe como `virtual:account:ahorro2`; retirar de una meta tras aportar usa el saldo
nuevo; borrar algo y usarlo después falla). Al aplicar, tras crear de verdad la cuenta se anota virtual→real y se sustituye en
los pasos siguientes; si el paso creador falló, el dependiente **no corre** y nunca queda un id virtual guardado.

También se corrigieron dos comportamientos viejos que P3 dejó al descubierto: una **transferencia con día futuro** («…el
lunes») ya no se ejecuta «ahora» en silencio (se explica que aún no se programan), y «agrega 500 a mi cuenta Nu» con la cuenta
ya existente ya no crea otra cuenta llamada Nu.

## Cómo se midió (y qué NO prueba)

| Qué | Resultado |
|---|---|
| `recurrencia.cjs` | 43 pruebas (calendario, fin de mes, quincena, bisiestos, conteo, rendimiento) |
| `previsto.cjs` | 40 (ids deterministas sin colisión en 60 mil entradas, generación idempotente, pausar/reanudar, proyecciones) |
| `p3-store.cjs` | 30 con el store real (saldos, doble toque, reglas, aportación a meta, avisos, cola de sincronización) |
| `push-avisos.cjs` | 20 (decisión, reintentos, silencio, atraso, idempotencia, zonas horarias, simulación hora por hora) |
| `deudas.cjs` · `ics.cjs` | 15 · 9 |
| `p3-chat.cjs` | 70 (desarrollo + extremo a extremo con el store: ids virtuales, doble toque, sin ids virtuales guardados) |
| Fuzz | 173 (ahora con textos de P3 y rendimiento hostil) |
| Migración 0023 | Probada en un Postgres 16 real (0001→0023), dos veces seguidas (idempotente), con filas de ejemplo y restricciones |
| Navegador real | Todas las pantallas, formularios de pago recurrente y aviso, confirmar un previsto en la pestaña |

Frases del chat **selladas** (escritas por Claude, corridas una vez antes de corregir): **88.4 %** (38/43) y **84.4 %**
(27/32). Las fallas reales (sinónimos como «alarma», «quítame», «me llegan», «me cobran», «aparto», «al 15») se corrigieron
mirándolas, así que ambos conjuntos quedan **contaminados**: hoy dan 97.7 % y 96.9 %, y las 2 «fallas» que quedan eran
**expectativas mal escritas** (el reconocimiento viejo no entiende «cancela mi cuenta»; la transferencia con fecha ahora se
explica en vez de ejecutarse). **Lo que esto no prueba:** que personas reales hablen así. Falta una medición con dictados
reales de la beta (P5) y probar todo en un teléfono.

## Lo que NO está hecho (y por qué)

- **La migración 0023 no está corrida en tu Supabase** y **`push-notify` no está desplegada**: sin eso lo de arriba funciona
  en el dispositivo, pero los avisos al teléfono (push) no salen y previstos/reglas/avisos no viajan a la nube (se quedan en
  la cola, sin perderse). Pasos en [[06-pendientes]].
- Transferencias **programadas** (previsto de tipo transferencia por chat) y repeticiones con varios días de la semana por
  chat: solo desde las pantallas.
- Zona horaria: la hora de un aviso se calcula en la hora **local del dispositivo** donde se creó; si viajas, el aviso ya
  creado conserva su instante.
- No se probó en iPhone/Android reales (push, instalación, offline).

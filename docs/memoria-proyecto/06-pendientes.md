# Pendientes y decisiones abiertas

Ver también: [[README|Índice]]

## Checklist de pendientes (actualizada 2026-10-04)

Esta lista la lee el **explorador del grafo** (`graphify-out/explorer.html`, pestaña «Pendientes») y
cada punto se liga a sus archivos en el mapa. Formato de cada línea:
`- [ ] **Título** — detalle · requiere: Mac, iPhone · archivos: ruta1, ruta2` (`[x]` = hecho). Al
cerrar un pendiente solo hay que cambiar `[ ]` por `[x]` y regenerar el mapa
(`python3 scripts/graphify-explorer/build.py`). Etiquetas de `requiere` usadas: **Mac**, **iPhone**,
**Android**, **Supabase web** (se hace desde el navegador/iPad), **Tu decisión**, **Claude**.

### Notificaciones push — despliegue en Supabase

- [x] **Migraciones 0020 y 0021 corridas** — SQL Editor, hecho el 2026-10-02. Crea `push_subscriptions`, `notification_settings`, `notification_log` y agrega `product`, `annual_rate`, `term_days`, `maturity_date` a `investments` (además de corregir el check de `asset_class`). · requiere: Supabase web · archivos: supabase/migrations/0020_push_notifications.sql, supabase/migrations/0021_investment_institutions.sql
- [x] **Secretos de Edge Functions puestos** — `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` y `CRON_SECRET` (2026-10-02). Si algún día se cambian las llaves VAPID, cada teléfono tiene que volver a activar los avisos. · requiere: Supabase web · archivos: supabase/functions/push-notify/index.ts, supabase/functions/_shared/webpush.ts
- [x] **Cron horario programado** — `valu-push-hourly` (minuto 5 de cada hora), `select cron.schedule` devolvió `1` el 2026-10-02. El `CRON_SECRET` quedó escrito dentro del cron: si se rota el secreto hay que `cron.unschedule('valu-push-hourly')` y programarlo de nuevo. · requiere: Supabase web · archivos: supabase/README.md
- [x] **Desplegar la función push-notify (se hace con el flujo de GitHub del siguiente punto, sin Mac)** — correr `npx supabase functions deploy push-notify --no-verify-jwt` (antes `npx supabase login` y `npx supabase link --project-ref utgwmwlqepevyzgoaato`). Mientras no se haga: el botón «Activar avisos» de la app no funciona (la app le pide la llave pública a esta función) y el cron de cada hora le pega a una función que aún no existe, así que no se envía nada. · requiere: Mac · archivos: supabase/functions/push-notify/index.ts, supabase/functions/_shared/webpush.ts
- [x] **Alternativa para desplegar sin Mac** — construida el 2026-10-04: workflow «Desplegar funciones de Supabase» (`.github/workflows/desplegar-funciones.yml`, manual desde GitHub → Actions → Run workflow). Falta el paso siguiente (crear el token). · requiere: Claude · archivos: supabase/README.md
- [x] **Crear el token y desplegar `push-notify` desde el iPad** — (1) Supabase → Account → Access Tokens → «Generate new token»; (2) GitHub → repositorio → Settings → Secrets and variables → Actions → New repository secret, nombre `SUPABASE_ACCESS_TOKEN`, pegar el token; (3) GitHub → Actions → «Desplegar funciones de Supabase» → Run workflow (función `push-notify`). Reemplaza al punto «Desplegar la función push-notify» (que pedía Mac). Necesario también para los avisos de P3. · requiere: Supabase web, Tu decisión · archivos: supabase/functions/push-notify/index.ts, supabase/README.md
- [ ] **Confirmar si `ai-relay` ya está desplegada** — sin ella la IA propia (Claude/ChatGPT/Gemini/Grok) en la versión web cae al copiloto local; en iPhone/iPad nativo no hace falta. Se despliega con `npx supabase functions deploy ai-relay`. · requiere: Mac · archivos: supabase/functions/ai-relay/index.ts
- [ ] **Probar los avisos en un iPhone real (mañana o pasado)** — push-notify ya está desplegado. iOS 16.4 o superior, VALU en la pantalla de inicio; los avisos se piden solos en el primer toque tras iniciar sesión (o Ajustes → Notificaciones → interruptor «Recibir avisos») y «Enviar prueba» reintenta sola hasta 4 veces. Falta confirmar en hardware que llegan, y también un recordatorio con insistencia y los de tarjeta. · requiere: iPhone · archivos: app/notificaciones.tsx, public/sw.js, src/services/notifications/
- [ ] **Probar los avisos en un Android real** — Chrome, mismo flujo que en iPhone. Depende de desplegar push-notify. · requiere: Android · archivos: app/notificaciones.tsx, public/sw.js
- [ ] **Probar instalación y micrófono en Android real** — el service worker de «red primero» para el manifest y el permiso explícito del micrófono se verificaron solo en Chromium de escritorio. Si falla, anotar el mensaje exacto. · requiere: Android · archivos: public/sw.js, src/ai/

### Inversiones por institución

- [ ] **Confirmar datos del catálogo en las fuentes oficiales** — comisiones de Kuspit, tope de Mercado Pago, niveles de Bitso y mínimo por operación de GBM (la investigación solo pudo leer extractos de búsqueda). Las tasas de ahorro cambian cada pocas semanas: revisar `asOf` de cada producto. · requiere: Claude · archivos: src/data/institutions.ts, docs/memoria-proyecto/07-instituciones-inversion.md
- [ ] **Decidir si la Liquidez se vuelve una cuenta real** — hoy comprar/vender mueve el «efectivo disponible» del producto, no una `Account` del usuario (auditoría #54/#55). · requiere: Tu decisión · archivos: src/store/investmentActions.ts, src/utils/investmentModels.ts

### Decisiones y deuda de producto abiertas

- [ ] **Ajuste de saldo de cuenta: ¿asiento o sobrescribir?** — hoy desde Patrimonio se pone `balance` directo y solo se audita (operación #15 de la auditoría). Decidir si se corrige en P2. · requiere: Tu decisión · archivos: src/store/useAppStore.ts
- [ ] **Código muerto detectado** — `unassignPeriod` y `removeBudgetAssignment` no las llama ninguna pantalla; tampoco existe «restaurar cuenta archivada». Conectarlas o borrarlas. · requiere: Tu decisión · archivos: src/store/useAppStore.ts
- [ ] **Decidir si el chat registra un gasto suelto («gasté 200 en tacos»)** — hoy lo contesta el copiloto de lectura (para registrar está la captura); dentro de un mensaje de varios pasos sí se reconoce, exigiendo un verbo de registro. Unificar evitaría dos caminos; riesgo: que «¿puedo gastar 500 en un viaje?» se vuelva un gasto. Las transferencias, metas y deudas ya viven en el planificador del chat (P2). · requiere: Tu decisión · archivos: src/ai/planner.ts, app/capture.tsx, src/ai/actionCatalog.ts
- [x] **Sincronizar la memoria de correcciones (mapeo personal)** — código listo el 2026-10-04 (tabla `category_mappings`, repositorio, cola de sincronización, mezcla por «gana la más reciente», pantalla de Privacidad y exportación de datos al día). Falta correr la migración (siguiente punto). · requiere: Claude · archivos: src/services/sync/SyncEngine.ts, src/services/supabase/repositories.ts, src/store/useAppStore.ts, app/privacidad.tsx
- [x] **Correr la migración 0022 en Supabase (lo aprendido viaja con la cuenta)** — SQL Editor → New query → pegar `supabase/migrations/0022_category_mappings.sql` completo → Run (debe decir «Success»). (Corrida el 2026-10-04: ya existía.) Mientras no se corra, la app funciona igual: lo aprendido se queda en el dispositivo y espera en la cola, sin perderse. · requiere: Supabase web · archivos: supabase/migrations/0022_category_mappings.sql, docs/memoria-proyecto/04-migraciones-supabase.md
- [ ] **Columnas en Supabase para `dayOfMonth`, `dayOfWeek` y `oneTimeDate` del presupuesto** — hoy solo se guardan local. · requiere: Claude, Supabase web · archivos: src/services/sync/, supabase/migrations/
- [ ] **Pérdida de datos al forzar el cierre en iOS (mitigado, no resuelto)** — las 3 defensas reducen la carrera pero ninguna solución solo-JS la cierra al 100%. Si sigue pasando, considerar app nativa. · requiere: iPhone · archivos: src/services/sync/

### Hoja de ruta de Fase 2

- [x] **P1 · Golden set + ampliar catálogo** — hecho el 2026-10-03: 984 casos + frases frescas, catálogo 864→3,123 claves, 94.9% en frases nuevas selladas (ver docs/memoria-proyecto/08-golden-set-resultados.md). · requiere: Claude · archivos: src/ai/localParser.ts, src/data/keywordPacks/base.ts, scripts/golden/
- [x] **P1b · Catálogo de ≈19 mil palabras, 14 categorías / 178 subcategorías** — hecho el 2026-10-03: pareja/roomies, tarjetas y bancos, impuestos y trámites, hogar, comida, transporte, salud, familia, ocio, trabajo, ahorro/inversión. Índice 53× más rápido, construcción en trozos, léxico de conceptos para futuras funciones. 93.4% y 90.2% en frases nuevas selladas (Fresco 4 y 5). · requiere: Claude · archivos: src/data/keywordPacks/index.ts, src/data/categories.ts, src/data/conceptLexicon.ts, src/ai/localParser.ts, src/ai/concepts.ts
- [ ] **Escribir Fresco 6 (próxima medición honesta)** — ≈120 frases nuevas, de preferencia dictadas por personas reales; correrlo una sola vez. Los Frescos 2, 4 y 5 ya se corrigieron mirando sus fallas y no miden nada. · requiere: Claude, Tu decisión · archivos: scripts/golden/fresh3.cjs, scripts/golden/run-golden.cjs
- [ ] **Ordenar por relevancia la búsqueda de categorías de la interfaz** — con ≈19 mil palabras, el buscador manual de categorías puede devolver demasiadas coincidencias; ordenarlas por mejor coincidencia en vez de por orden del catálogo. · requiere: Claude · archivos: src/data/categories.ts, app/capture.tsx
- [ ] **Conectar `detectConcepts` en P2/P3** — las etiquetas de modalidad (pareja, roomies, a plazos, recurrente…) existen pero ninguna pantalla las usa todavía; el planificador multi-acción es el primer consumidor natural. · requiere: Claude · archivos: src/ai/concepts.ts, src/data/conceptLexicon.ts
- [ ] **Medir el arranque del índice en un teléfono real** — en el contenedor son ≈300 ms en trozos (pausa máxima 13 ms); en un iPhone/Android de gama baja puede ser varias veces más. Si molesta, precalcular o comprimir el índice (idea de Fase 3). · requiere: iPhone, Android · archivos: src/ai/localParser.ts, app/_layout.tsx
- [ ] **Revisar las frases protegidas cuando aparezcan fallas** — `protegidas.ts` guarda los desempates que la poda automática nunca borra; cada falla real nueva debe terminar como frase protegida o palabra débil, no como más plantillas. · requiere: Claude · archivos: src/data/keywordPacks/protegidas.ts, scripts/golden/packs.cjs
- [x] **P2 · Planificador multi-acción + ejecutor seguro con confirmación e idempotencia** — hecho el 2026-10-04: hasta 6 acciones por mensaje con un solo «mantén para confirmar», aclaraciones, vista previa de saldos, ejecutor idempotente con auditoría, fechas en español, acciones nuevas (17 tipos), catálogo en segundo plano y lo aprendido en la nube. Fechas sellado 93.8 %, planificador sellado 87.3 % (primera corrida). Ver docs/memoria-proyecto/09-p2-planificador-fechas-y-catalogo-en-segundo-plano.md. · requiere: Claude · archivos: src/ai/planner.ts, src/ai/planExecutor.ts, src/ai/dates.ts, src/store/useAppStore.ts, src/components/ChatPlanCard.tsx
- [x] **Pasos que dependen de lo creado en el mismo mensaje** — hecho el 2026-10-04 con ids virtuales (`virtual:account:<nombre>`): «crea la cuenta X y transfiere a X» es un plan de 2 pasos; probado de punta a punta con el store. · requiere: Claude · archivos: src/ai/virtualIds.ts, src/ai/planner.ts, src/store/useAppStore.ts
- [x] **Acción «pagar deuda» (operación #46)** — hecho el 2026-10-04 (`pay_liability`, `settle_liability`, cobrar lo que te deben, cuotas) en el chat y en Patrimonio. · requiere: Claude · archivos: src/ai/actionCatalogP3.ts, src/utils/debts.ts, src/store/useAppStore.ts
- [ ] **Catálogo remoto con versión (actualizar el vocabulario sin publicar app)** — diseño en el doc 09: bucket público de Supabase Storage + `manifest.json` {versión, versión mínima de la app, paquetes con hash}; `installKeywordPacks` ya es seguro entre versiones. Decidir si se hace ya o con las tiendas (P5). · requiere: Tu decisión, Supabase web · archivos: src/data/catalogLoader.ts, src/data/categories.ts
- [ ] **Cargar cada pantalla solo al abrirla (rutas asíncronas de Expo Router)** — la siguiente palanca de peso: con P3 el paquete inicial pasó de 793 a 835 KB (presupuesto subido a 880 KB). Ojo: pide precalentar la caché para no perder las pantallas sin conexión. Medir con `npm run size` antes y después. · requiere: Claude · archivos: app/_layout.tsx, scripts/size-report.cjs
- [ ] **Exigir la revisión automática antes de unir a la rama principal** — el workflow «Revisión automática» (tipos, `npm test`, `npm run size`) ya corre en cada subida; falta activar la protección de rama en GitHub (Settings → Branches). · requiere: Tu decisión · archivos: package.json, scripts/size-report.cjs
- [ ] **Escribir Fresco 6 y sellados nuevos de fechas y planes con frases de otras personas** — todo lo medido hasta hoy lo escribió Claude; lo ideal son dictados reales de la beta (P5). · requiere: Claude, Tu decisión · archivos: scripts/golden/fechas-sellado.cjs, scripts/golden/planes-sellado.cjs
- [ ] **Probar P2 en un teléfono real** — plan de varios pasos, «mantener para confirmar», aclaraciones, captura con fechas, descarga del trozo del vocabulario en red lenta y sin conexión (el service worker lo guarda en caché, no se probó sin conexión). Solo se probó en Chromium con la app compilada. · requiere: iPhone, Android · archivos: app/(tabs)/ia.tsx, src/components/ChatPlanCard.tsx, public/sw.js
- [x] **P3 · Previsto vs. real, pagos recurrentes, avisos, deudas ampliadas y dividendos** — hecho el 2026-10-04 (código, pruebas y pantallas). Falta correr la migración 0023, desplegar `push-notify` y probar en teléfonos reales (siguientes puntos). Ver docs/memoria-proyecto/10-p3-previsto-recurrentes-avisos-deudas.md. · requiere: Claude · archivos: src/utils/materialize.ts, src/store/useAppStore.ts, app/avisos.tsx, app/recurrentes.tsx, src/ai/actionCatalogP3.ts
- [x] **Correr la migración 0023 en Supabase (previsto, recurrentes, avisos, deudas)** — SQL Editor → New query → pegar `supabase/migrations/0023_p3_forecast_recurring_reminders.sql` completo → Run (debe decir «Success»). Es seguro correrla más de una vez. Mientras no se corra, la app funciona en el dispositivo y lo nuevo espera en la cola de sincronización sin perderse, pero los avisos al teléfono (push) no pueden salir. · requiere: Supabase web · archivos: supabase/migrations/0023_p3_forecast_recurring_reminders.sql, docs/memoria-proyecto/04-migraciones-supabase.md
- [x] **Tarjeta de crédito: corte, pago y avisos** — hecho el 2026-10-04 (código, pruebas y pantalla). Ver docs/memoria-proyecto/11-tarjeta-de-credito.md. · requiere: Claude · archivos: src/utils/creditCard.ts, app/tarjetas.tsx, src/components/p3/CardPanel.tsx, src/store/useAppStore.ts
- [x] **Correr la migración 0024 en Supabase (fechas de tarjeta)** — SQL Editor → New query → pegar `supabase/migrations/0024_credit_card_dates.sql` completo → Run. Hazlo DESPUÉS de la 0023 (la 0023 ahora también trae `auto_settled`; si ya la corriste antes de hoy, vuelve a correrla: es segura). · requiere: Supabase web · archivos: supabase/migrations/0024_credit_card_dates.sql, docs/memoria-proyecto/04-migraciones-supabase.md
- [ ] **Compras a meses sin intereses (MSI) en la tarjeta** — hoy no se modelan: el pago «para no generar intereses» sale de lo registrado. · requiere: Tu decisión, Claude · archivos: src/utils/creditCard.ts, src/utils/debts.ts
- [ ] **Probar P3 en un teléfono real** — crear un pago recurrente, confirmar un previsto, un aviso con «insistir 3 veces» (push al teléfono, silencio nocturno, posponer), descargar el `.ics`, pagar una deuda con cuotas. Incluye el corte y el pago de una tarjeta. Solo se probó con herramientas y en Chromium. · requiere: iPhone, Android · archivos: app/avisos.tsx, app/recurrentes.tsx, app/tarjetas.tsx, supabase/functions/push-notify/index.ts, src/utils/ics.ts
- [ ] **Medir el chat de P3 con dictados reales** — las 75 frases selladas las escribió Claude (88.4 % y 84.4 % en la primera corrida, luego contaminadas al corregir). Falta una medición con frases de personas reales (beta, P5). · requiere: Claude, Tu decisión · archivos: scripts/golden/p3-chat-sellado.cjs, scripts/golden/p3-chat-sellado2.cjs
- [ ] **Transferencias programadas por chat y repeticiones con varios días de la semana** — hoy «transfiere… el lunes» se explica y no se programa; desde las pantallas sí se pueden varios días. · requiere: Claude · archivos: src/ai/chatIntentParser.ts, src/ai/actionCatalogP3.ts
- [ ] **Ajustar saldos de tarjetas de crédito viejas** — los movimientos en tarjeta registrados antes del 2026-10-04 conservan el signo anterior (gastar bajaba la deuda): revisar el saldo de cada tarjeta y corregirlo con +/−. · requiere: Tu decisión · archivos: src/utils/ledger.ts, src/components/AccountForm.tsx
- [ ] **P4 · Ayuda contextual + auditoría de privacidad** · requiere: Claude
- [ ] **P5 · Beta en hardware real y decisión de tiendas** · requiere: iPhone, Android

La auditoría (docs/02) cambia así: #54/#55 ya mueven el efectivo por producto (sigue sin ser una
`Account` del usuario, es "efectivo disponible" dentro de la institución, como en las apps de
bolsa); #58 "Crear recordatorio" queda parcialmente cubierto (recordatorios automáticos de deudas y
diario; los recordatorios personalizados y #59-#65 siguen pendientes para P3).

## Abierto (2026-09-28) — Hallazgos concretos de la auditoría de las 65 operaciones de Fase 2

Ver detalle completo y evidencia en [[../02_fase2_auditoria_operaciones|docs/02_fase2_auditoria_operaciones.md]].
Tres hallazgos que valen una decisión de producto antes de tocarlos en P2/P3:

- **Ajuste de saldo de cuenta sobrescribe en vez de generar un asiento** (operación #15): el flujo
  desde Patrimonio pone `balance` directo y solo dispara `logAudit`, nunca una transacción — el
  único camino con asiento trazable real hoy es un `add_transaction` genérico. Contradice la propia
  precondición del inventario ("no sobrescribir saldo"). Decidir si se corrige en P2 o se documenta
  como comportamiento intencional.
- **Compra/venta de inversiones no toca cuentas reales**: el dinero sale/entra de una posición
  sintética "Liquidez" dentro de `investments`, nunca de una `Account` del usuario. Es una decisión
  de diseño previa, no un bug de esta auditoría — pero como el inventario asume "cuenta origen/
  destino" reales, hay que decidir explícitamente si se corrige en P3 o se deja así.
- **Código muerto real encontrado**: `unassignPeriod` y `removeBudgetAssignment`
  (`useAppStore.ts`) están escritas pero ninguna pantalla las invoca. Igual, no existe función para
  restaurar una cuenta archivada (`deletedAt` sin `restore`). Candidatos a cerrar en P2 al conectar
  presupuestos/cuentas al catálogo de chat, o a borrar si de plano no se van a usar.

## Resuelto (2026-09-27) — Motor de intenciones financieras por voz/chat (transferencias, deudas, metas)

Un segundo JSON del usuario (catálogo v9, 2026-09-02) pedía que el
registro por voz entendiera verbos de dirección ("pasé X de A a B",
"le debo X a Y", "le metí X a mi meta de Z") para mover dinero entre
cuentas, crear/abonar deudas y abonar a metas directamente. Se investigó
antes de tocar código y se decidió NO implementarlo esa sesión (ver razones
históricas abajo) — deudas y metas se resolvieron después vía el catálogo
de acciones del **chat de IA** (`actionCatalog.ts`), y el 2026-09-27 se
cerró la pieza que faltaba, **transferencias**:

- Nueva acción `transfer_between_accounts` (`src/ai/actionCatalog.ts`):
  resuelve ambas cuentas por nombre real, exige la misma moneda (sin
  conversión de divisas todavía — se rechaza en vez de adivinar un tipo
  de cambio), valida que no sea la misma cuenta.
- Reconocimiento local por regex (`src/ai/chatIntentParser.ts`) para
  frases como "transfiere 500 de mi efectivo a mi tarjeta nu" — sin
  necesitar ninguna IA conectada. Mismo tipo de acción disponible vía LLM
  conectado.
- Nueva categoría "Transferencias" (`categories.ts` + `iconMap.ts`) para
  que el movimiento se vea bien en Movimientos (`"Efectivo → Tarjeta Nu"`
  vía el campo `merchant`) en vez de caer en Miscelánea — resolviendo así
  la razón #1 original de por qué se había pausado (no había vista para
  transferencias).

**Lo que sigue sin resolver**: esto vive en el chat de IA (`ia.tsx`,
texto o su propio micrófono) — la captura rápida dedicada
(`app/capture.tsx` + `src/ai/localParser.ts`, el atajo directo de
"Grabar por voz" desde Inicio) sigue limitada a un solo movimiento/ajuste
de saldo, sin transferencias/deudas/metas. Conectarla al mismo
`actionCatalog.ts` es la pieza de deuda de producto más barata que queda
de este backlog.

### Razones históricas de por qué se pausó originalmente (2026-09-02)

- El modelo de datos ya soportaba transferencias (`Transaction.type =
  'transfer'` + `toAccountId`, con la matemática de saldos ya correcta
  en `src/utils/ledger.ts`) — pero ninguna pantalla las creaba, y
  Movimientos no tenía una vista especial para ese tipo. Ya resuelto
  arriba con la categoría dedicada.
- Crear/abonar una deuda o abonar a una meta implicaba acoplar DOS
  mutaciones a la vez (el pasivo/la meta + la cuenta de origen) — se
  resolvió después con el mismo patrón de `actionCatalog.ts`
  (`resolveAddLiability`, `resolveContributeToGoal`, etc.).

## Mitigado, no resuelto (2026-09-27) — pérdida de datos al forzar el cierre de la app en iOS

Reporte del usuario: nombre y foto de fondo se revertían al reabrir la
app. Se identificaron y corrigieron DOS causas distintas:

1. **Bug real de reconciliación (resuelto de raíz)**: al reabrir,
   `useProfileReconciliation` podía adoptar el perfil viejo de Supabase
   sin fijarse si el perfil local tenía un cambio sin confirmar todavía
   — corregido con un flag `profileDirty` que bloquea esa adopción.
   Confirmado por el usuario que esto arregló el caso de "solo cerré y
   reabrí la app, sin forzar nada".
2. **Cierre forzado real del proceso (quitar la app de "apps activas" en
   iOS) — mitigado, no cerrado del todo.** Un PWA instalado puede
   terminar el proceso por completo en ese momento, matando una petición
   de red a medio vuelo. Se aplicaron tres defensas (`fetch` con
   `keepalive:true` en vez del cliente supabase-js normal, listeners de
   `visibilitychange`/`pagehide`/`AppState` para disparar la subida en el
   primer instante posible, `getSession()` en vez de `getUser()` para
   ahorrar un viaje de red) que reducen la ventana de la carrera contra
   el sistema operativo, pero **ninguna mitigación solo-JS puede
   garantizar cerrarla al 100%** — si el proceso muere antes de que la
   petición alcance a salir, el cambio se pierde igual. Confirmado que la
   sesión de Supabase SÍ sobrevive el force-quit (no pide iniciar sesión
   de nuevo), lo que descarta un borrado total de `localStorage`: es
   específicamente una carrera de timing, no un borrado de
   almacenamiento. Ver `docs/01_project_blueprint_fase1.md` sección 1.6
   para el detalle técnico completo. **Queda abierto** — si el usuario lo
   sigue viendo fallar, ya no hay mucho más margen por el lado
   solo-cliente; habría que considerar una app nativa real en vez de PWA
   para ese caso específico.

## Sobre Obsidian y la base de datos real de la app

El 2026-09-02 se planteó usar Obsidian como "base de datos... para el
resto de usuarios" de VALU. Vale la pena dejar por escrito la respuesta,
para no repetir la confusión más adelante:

**Obsidian es una app de notas personales** — lee una carpeta de
archivos Markdown en un dispositivo (o sincronizada por iCloud/Google
Drive/Obsidian Sync entre los dispositivos de esa misma persona). No
tiene login de usuarios, no aísla los datos de una persona de los de
otra, no está pensada para recibir escrituras de una app en vivo, ni para
estar prendida 24/7 respondiendo peticiones. Usarla como backend de VALU
para varios usuarios sería un paso atrás real en seguridad — cualquiera
con acceso a esa carpeta vería los datos de todos.

**VALU ya tiene la herramienta correcta para eso: Supabase.** Cada
persona ya tiene sus propias filas protegidas por Row Level Security
(nadie más puede leer o escribir los datos de otra cuenta), con
autenticación real, pensado exactamente para ser el backend de una app
con múltiples usuarios. Ver [[01-arquitectura]] y
[[04-migraciones-supabase]]. Esto no cambia.

**Lo que sí tiene sentido, y es lo que se construyó**, es usar archivos
de texto (Markdown, en esta misma carpeta `docs/memoria-proyecto/`) como
memoria **del proyecto en sí** — decisiones, arquitectura, catálogo,
pendientes — no como memoria de los datos financieros de nadie. Esto:

- Reduce la necesidad de repetir contexto en una conversación de Claude nueva (y por lo tanto el gasto de tokens al re-explicar), porque Claude puede leer estos archivos directamente.
- Es "trazable" de verdad: cada cambio a esta documentación queda en el historial de `git`, con fecha y descripción — una base de datos con historial completo, aunque no sea una base de datos en el sentido de motor SQL.
- Cualquier app de notas que lea una carpeta de Markdown puede mostrarla bonito, con enlaces entre notas — Obsidian incluido, si la persona quiere instalarlo en su teléfono y apuntarlo a esta carpeta (por ejemplo clonando el repositorio, o con un plugin tipo "Obsidian Git" que sincroniza solo). Eso es una comodidad de lectura para el ser humano, no una pieza de la arquitectura de la app.

## Auditoría de Android — pendiente de confirmar en un dispositivo real

(2026-09-02) Se corrigieron dos problemas reportados en Android: el
service worker podía quedarse con una versión vieja de `manifest.json`/
íconos y bloquear la instalación en pantalla de inicio (cambiado a "red
primero" para esos archivos); y el micrófono fallaba en silencio porque
no se pedía permiso explícito ni se mostraba el error real. Ambos ya
están en producción, pero **no se pudieron probar en un teléfono Android
real** desde esta sesión — solo se verificó en Chromium de escritorio.
Falta que la persona vuelva a intentar instalar la app y usar el
micrófono en su teléfono (idealmente después de borrar datos del sitio o
reinstalar el acceso directo, por si quedó un service worker viejo
atorado) y reporte si ya funciona o qué mensaje de error exacto le
aparece.

## Memoria de correcciones — ahora viaja con la cuenta (2026-10-04)

El "mapeo personal" (ver [[03-motor-clasificacion]]) se sincroniza con la cuenta en la tabla `category_mappings`
(migración 0022): solo la palabra y la categoría, protegido por RLS, con la misma cola de sincronización que cuentas y
movimientos. **Falta correr la migración** (punto de la lista de arriba); mientras tanto sigue funcionando en el
dispositivo y los cambios esperan en la cola. Detalle: [[09-p2-planificador-fechas-y-catalogo-en-segundo-plano]].

## Campos de fecha del presupuesto — solo locales

`dayOfMonth`, `dayOfWeek` y `oneTimeDate` (agregados 2026-09-02 al tipo
`Budget`) todavía no tienen columna en Supabase — se guardan y usan bien
dentro de un mismo dispositivo, pero no se sincronizan entre
dispositivos todavía. Pendiente si la persona empieza a usar VALU en más
de un dispositivo/navegador.

## Resuelto — Ropa/Compras/Otros de Miscelánea sin concepto de presupuesto

Antes eran un vacío silencioso (se guardaban en Movimientos pero no
sumaban en ningún concepto, sin ninguna señal de que eso pasaba). El
2026-09-02, con instrucciones explícitas del usuario, se marcaron a
propósito como `excludedFromBudget: true` — el registro manual ahora
precarga el toggle "Excluir del presupuesto" al elegir cualquiera de las
tres. Documentado en [[02-catalogo-categorias]]. No requiere más acción,
salvo que la persona cambie de opinión y quiera meterlas a un concepto.

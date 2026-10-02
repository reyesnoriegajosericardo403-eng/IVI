# Bitácora de cambios

Ver también: [[README|Índice]]

Resumen legible del historial del proyecto, agrupado por tema — no es un
calco de cada commit, sino el "por qué" detrás de cada bloque de trabajo.
Orden: **más reciente primero**. El detalle línea por línea vive en
`git log` (trazable de verdad) y en el historial de tareas de la sesión de
Claude Code.

## 2026-10-02 — Despliegue de push en Supabase (avance) + explorador ordenado del grafo

- **Supabase (hecho desde el iPad, sin terminal)**: migraciones `0020` y `0021` corridas, los 4
  secretos de Edge Functions puestos y el cron `valu-push-hourly` programado. **Falta solo
  desplegar la función `push-notify`** (necesita terminal/Mac): hasta entonces «Activar avisos» no
  funciona y el cron le pega a una función que aún no existe. Detalle y demás pendientes en
  [[06-pendientes]] (ahora es una checklist con etiquetas `requiere: Mac/iPhone/Android/…`).
- **Explorador del grafo** (`graphify-out/explorer.html`, se genera con
  `python3 scripts/graphify-explorer/build.py` después de `graphify update .`): reemplaza la «maraña»
  de `graph.html` por un mapa en capas (pantallas → piezas visuales → lógica → datos → backend → web →
  documentación). Búsqueda con palabras normales en español (con glosario español↔inglés: «avisos»
  encuentra `push-notify`), y al elegir algo el mapa pasa a un diagrama **lo usan → elegido → usa a**
  con cables ordenados y, a la derecha, un **resumen en texto** (qué es, qué contiene, de qué depende,
  quién lo usa, qué documentos lo mencionan, qué pendientes tiene) con botón «Copiar» para pegarlo en
  otro chat. Pestaña «Pendientes» leída de [[06-pendientes]]. `graph.html` de graphify se sigue
  regenerando solo; el explorador es complementario.

## 2026-09-28 (tarde) — Notificaciones push reales + Inversiones por institución

- **Notificaciones al celular (Web Push)**: migración `0020_push_notifications.sql`, función
  `push-notify` (registrar dispositivo, aviso de prueba y cron horario de recordatorios), handlers
  `push`/`notificationclick` en `public/sw.js`, pantalla `app/notificaciones.tsx` (Ajustes →
  Notificaciones). Recordatorios: pagos de deudas (3 días, 1 día y el día) y recordatorio diario
  opcional si no registraste nada. Cifrado RFC 8291 + VAPID hecho solo con WebCrypto y verificado
  contra la implementación de referencia; idempotencia con `notification_log` (probado: segunda
  corrida del cron = 0 duplicados). Nunca incluye montos. Primer adaptador real del contrato
  `NotificationProvider` (docs/03 §7). En iPhone requiere iOS 16.4+ y VALU instalada en inicio.
- **Inversiones rediseñadas**: tarjetas de instituciones (GBM, Nu, Actinver Trade —antes
  Bursanet—, Cetesdirecto, Mercado Pago, Hey, Klar, Kuspit, Bitso) → productos → tabla de activos
  estilo app. Cuatro modelos de cálculo (bolsa con comisión + IVA, rendimiento diario, plazo fijo,
  CETES con ISR 2026). Liquidez por producto. Ver [[07-instituciones-inversion]].
- **Bugs reales corregidos de paso**: la Liquidez nunca sincronizaba (check de `asset_class` sin
  `'cash'`, migración 0021); la actualización de precios pedía cotización de "LIQUIDEZ"/CETES y por
  eso consultaba al proveedor aun con el mercado cerrado.

## 2026-09-28 — Arranque formal de Fase 2: auditoría de 65 operaciones + contratos v1

Se recibió un plan revisado de Fase 2 (JSON de instrucciones + xlsx `Inventario_65`, elaborado por
una sesión externa que explícitamente no había revisado el repositorio) con una regla de evidencia
clara: auditar antes de afirmar. Se ejecutó la Semana 1-2 (P0) completa:

- **`docs/02_fase2_auditoria_operaciones.md`**: las 65 operaciones candidatas verificadas una por
  una contra el código real (store, pantallas, migraciones), no contra el inventario recibido.
  Resultado: 16 ya en el catálogo de chat, 24 implementadas en UI/datos pero sin exponer al chat
  (el trabajo de mayor retorno de P2 — más que duplica la cobertura del chat sin tocar el esquema),
  17 sin implementar del todo, 8 necesitan tabla/columna nueva. Documenta también divergencias
  reales encontradas (código muerto en `unassignPeriod`/`removeBudgetAssignment`, el bug conceptual
  de "Liquidez" sintética en vez de cuentas reales para compra/venta de inversiones, el ajuste de
  saldo de cuenta que sobrescribe en vez de generar un asiento).
- **`docs/03_fase2_contratos_v1.md`**: contratos versionados para interpretación con aclaraciones,
  plan multi-operación (`ActionPlan`), cálculo de efectos agregados, confirmación e idempotencia, y
  separación previsto/real (para P3). Formaliza que el principio "ningún canal externo escribe
  directo a la base de datos" ya se cumple hoy para el chat, con evidencia línea por línea.
- **Primer guardia de idempotencia real implementado**: `aiApplyAction` (`useAppStore.ts`) ahora
  rechaza cualquier propuesta cuyo `status` no sea `'proposed'` antes de tocar el store — cierra un
  hueco real (sin ninguna protección a nivel de ejecutor, solo a nivel de UI) sin cambiar ningún
  comportamiento del camino feliz. Verificado con `npx tsc --noEmit` limpio.
- **Decisión de arquitectura fijada por escrito** (ya no es una decisión abierta): pgvector sobre
  Supabase, relaciones de Postgres + Graphify en vez de Neo4j, compartición de correcciones opt-in
  en vez de federated learning completo (pospuesto a una Fase 3 futura).

## 2026-09-27 — Transferencias entre cuentas + endurecimiento de sync + limpieza de estilos

- **Motor local: transferencias entre cuentas propias** (cierra la tarea
  #144, ver [[06-pendientes]]): nueva acción `transfer_between_accounts`
  en el catálogo de acciones del chat de IA, reconocible por regex local
  ("transfiere 500 de mi efectivo a mi tarjeta nu") o vía LLM conectado.
  Nueva categoría "Transferencias" para que se vea bien en Movimientos.
- **Sync endurecido contra pérdida de datos al forzar el cierre de la
  app en iOS** (reporte real del usuario, ver [[06-pendientes]] para el
  detalle completo): flag `profileDirty` para que reabrir la app nunca
  pise un cambio local sin confirmar; subida de emergencia con `fetch`
  + `keepalive:true` disparada en `visibilitychange`/`pagehide`/
  `AppState` en el primer instante en que el sistema avisa que la app se
  va a segundo plano; `getSession()` en vez de `getUser()` para ahorrar
  un viaje de red. Mitiga la ventana de la carrera contra el sistema
  operativo, pero queda documentado como límite real de plataforma, no
  como bug cerrado.
- **Estilo "Neo brutalista" eliminado por completo** (pedido explícito) y
  "Vidrio líquido" pasa a ser la 2ª opción de la lista (antes era la
  última). Quien lo tenía puesto cae solo al de vidrio, sin romper nada.
- Corregida una fuga de sincronización de una sola vía: `ALL_TABLES` en
  `SyncEngine.ts` no traía de vuelta las 4 tablas de "presupuestos con
  nombre" (`budget_templates`, `template_budget_lines`,
  `budget_assignments`, `period_budget_overrides") — el push funcionaba,
  el pull no.

## 2026-09-27 (antes) — Apariencia: Vidrio líquido, paletas y fondo de foto

Ver [[01-arquitectura]] sección 1.7 para el detalle técnico completo.

- Nueva pantalla `app/appearance.tsx`: vista previa, paleta de acento (8
  colores), fondo (catálogo de 5 categorías o foto propia), ajustar
  (arrastrar directo sobre la vista previa para mover el punto focal,
  sliders de oscuridad/desenfoque).
- `AppBackground.tsx` pinta el fondo compartido por TODA la app; se
  corrigió un bug real donde el color de fondo de cada pantalla era
  opaco y tapaba la foto por completo.
- Selector de foto propia en web: el `blob:` URL que devuelve
  `expo-image-picker` se convierte a `data:` URI antes de guardar (moría
  al recargar la página, así que la foto "desaparecía").
- La foto propia ahora sincroniza a Supabase como `data:` URI (migración
  0019) — antes era solo local, decisión revertida explícitamente porque
  el usuario reportó perderla al cerrar la app.
- Nueva categoría de bug encontrada y corregida: reconciliar el perfil al
  reabrir la app podía pisar un cambio local sin confirmar todavía —
  origen del trabajo de `profileDirty` de la entrada de arriba.
- `app/perfil.tsx` y `app/appearance.tsx` ahora esperan (`await
  runSync()`) a que la subida se intente de verdad antes de salir de la
  pantalla, mostrando "Guardando…".
- Se agregaron las primeras 5 fotos reales aprobadas al catálogo de
  fondos (Soft y calma ×2, Gym y movimiento, Naturaleza ×2).

## Chat de IA con acciones sobre datos + rediseño visual

Ver [[01-arquitectura]] secciones 1.5 y 4 para el detalle técnico
completo (pipeline de seguridad de 3 capas, catálogo cerrado de acciones).

- El chat de IA (`app/(tabs)/ia.tsx`) pasó de ser solo-lectura a poder
  **modificar datos reales** (cuentas, metas, deudas, presupuesto,
  transacciones) con un catálogo cerrado de acciones + confirmación
  obligatoria por `HoldToConfirmButton` (nunca un tap) + revalidación
  contra datos reales al confirmar.
- Rediseño visual completo tras feedback directo ("no me agradó para
  nada, se ve serio y nada confortable"): branding VALU, paleta oscura
  fija, `AiOrb.tsx` con el logo real de la app en vez de una esfera
  abstracta, sin tonos naranjas, sidebar de conversaciones contraíble.
- `usePressToTalk.ts` extraído de `capture.tsx` para compartir la lógica
  de mantener/soltar el micrófono entre la captura rápida y el chat.

## Presupuesto — rediseño v2 "Plan de gastos" + calendario por rango

- El calendario de Presupuesto ahora asigna una plantilla a un **rango de
  fechas elegido a mano** (ej. "28 sep – 30 sep"), no solo a un
  día/semana/mes exacto (migración 0017).
- Plantillas de presupuesto con nombre propio, ícono elegible y
  re-escalado automático semana↔mes.

## 2026-09-02 — Motor de clasificación más inteligente + memoria de correcciones

- Cuentas con las que se paga cada categoría: pasó de ser una lista de
  **exclusión** ("qué tarjetas NO usar") a una lista de **inclusión**
  ("con cuáles SÍ pagas esto normalmente") — más natural de explicar y de
  usar. Columna en Supabase renombrada `excluded_account_ids` →
  `included_account_ids` (ver [[04-migraciones-supabase]] por el problema
  que causó al correrla).
- Cálculo de presupuesto por periodicidad corregido: "Semana" usa
  siempre ×4 (antes usaba un promedio de 4.33 semanas/mes, dando
  resultados que no cuadraban con la intuición de la persona); "Día" con
  frecuencia diaria/entre-semana ahora multiplica por los días reales
  del mes específico que se está presupuestando, no un promedio.
- Preguntas de fecha ajustadas según la periodicidad elegida: día de la
  semana (dropdown) para "Semana", día del mes limitado al máximo real
  de ese mes (antes dejaba poner hasta 99) para "Mes", calendario
  completo para gastos de una sola vez ("extemporáneo"), y **ninguna
  pregunta** cuando no aplica (Día + todos los días/entre semana/
  personalizado).
- "Morralla" (efectivo) ahora se puede elegir como cualquier otra cuenta
  en la selección de "con qué pagas esto".
- Botón de regresar agregado en la pantalla de anuncio de la encuesta,
  dentro del onboarding.
- Captura por voz: ahora se elige la cuenta/tarjeta **antes** de grabar,
  no solo después de interpretar el texto.
- Motor de clasificación local (ver [[03-motor-clasificacion]] para el
  detalle técnico): números dictados en palabras compuestas
  ("cincuenta y cinco" = 55), corrección de errores de dictado/tecleo
  por distancia de edición, arreglo de un bug real de coincidencia por
  subcadena ("cuarenta" disparaba la categoría Renta), desambiguación de
  "gas" (gasolina vs. gas de casa).
- **Memoria de correcciones**: cuando VALU no sabe clasificar algo y la
  persona elige la categoría a mano, se acuerda de las palabras clave de
  esa frase para la próxima vez — con prioridad sobre el catálogo y
  sobre cualquier IA conectada. Visible/borrable desde Ajustes →
  Privacidad y datos.
- Auditoría de Android: el service worker cacheaba `manifest.json` e
  íconos con estrategia "caché primero", así que una versión vieja podía
  quedar atorada e impedir instalar la app en pantalla de inicio después
  de un despliegue nuevo — se cambió a "red primero" solo para esos
  archivos. El micrófono ahora pide permiso explícito
  (`getUserMedia`) antes de grabar y muestra el error real (permiso
  bloqueado, sin micrófono, sin conexión) en vez de un mensaje genérico.
- Se creó esta carpeta (`docs/memoria-proyecto/`) como memoria externa
  del proyecto, trazable con git.
- Se armó un catálogo completo de categorías/subcategorías como
  referencia — ver [[02-catalogo-categorias]].

## Presupuesto: rediseño a Necesidades/Deseos/Ahorro + fichas por subcategoría

- Taxonomía de presupuesto recategorizada de "Hoy/Luego/Compartir" a
  **Necesidades/Deseos/Ahorro** (`src/data/budgetConcepts.ts`), con la
  pantalla de Presupuesto rediseñada alrededor de esos 3 grupos.
- "Fichas" por subcategoría dentro de un concepto: un concepto como
  "Transporte cotidiano" puede desglosarse en renglones separados por
  Uber/Metro/Microbús cuando la persona lo necesita, usando una llave
  compuesta (`conceptId::subcategoryId`) sin tocar el esquema de datos.
- Selector de cuenta movido arriba tanto en registro manual como por voz.
- Se quitó el toggle de "tarjeta de transporte" del formulario de
  cuentas (ya no hacía falta con el flujo nuevo).

## PWA e instalación

- Manifest + service worker para que la app se pueda instalar en la
  pantalla de inicio y seguir funcionando sin conexión.
- Atajo directo a "Grabar por voz" desde el ícono instalado; abrir la
  app en general ahora va directo a capturar (menos fricción).
- Guía en Ajustes de cómo instalar VALU en la pantalla de inicio.

## Limpieza de datos de ejemplo

Se eliminaron por completo los datos "demo" de la app — el onboarding y
las pantallas de presupuesto ahora usan texto instructivo y ejemplos
reales del catálogo en vez de tarjetas/transacciones de mentira.

## Cuentas y tarjetas

- Modelo de datos de cuentas: color, marcar tarjeta de transporte,
  cuenta destino/exclusión de presupuesto.
- Ledger real de saldos por transacción (antes el saldo no se movía solo
  al registrar un movimiento).
- Cuenta por defecto y exclusión por categoría al registrar (antecesor
  directo del sistema de inclusión de cuentas de 2026-09-02).
- Onboarding: paso de Cuentas (Morralla + agregar tarjetas) antes de
  Presupuesto.

## Autenticación real

Supabase Auth (correo/contraseña + Google OAuth) reemplazando el modo
solo-local; recuperación de contraseña por correo; corrección de la
sesión de Google OAuth que no quedaba establecida al volver a la app.

## Captura por voz: de mock a real

- Interpretación de lenguaje natural local (`src/ai/localParser.ts`) sin
  depender de ningún proveedor externo.
- Modo continuo: varias cosas dictadas de golpe en una sola grabación,
  con transcripción en vivo en pantalla.
- Botón de "mantener presionado para confirmar" (reemplazó un primer
  intento de "deslizar para confirmar" que no se sentía bien en
  pantallas táctiles).
- Corrección de una condición de carrera donde el botón de grabar
  fallaba una fracción significativa de las veces.

## Fase 3 adelantada — IA "trae tu propia cuenta" (BYOK)

Cada persona conecta su propia clave de Claude, ChatGPT, Gemini o Grok
desde Ajustes; VALU nunca paga ni intermedia el uso de esa IA. Incluye
almacenamiento cifrado de credenciales, clientes por proveedor, y una
Edge Function de relevo solo para esquivar CORS en la versión web.

## Fase 2 — arquitectura a prueba de futuro

Refactor de tipos con UUID + timestamps + borrado suave; esquema de
Supabase con migraciones versionadas y Row Level Security; capa de
proveedores intercambiables; cliente Supabase + repositorios; motor de
sincronización local ↔ Supabase con resolución de conflictos.

## Fase 1 — producto base

Estructura de datos, tema visual, navegación, y las pantallas
principales: Dashboard, Movimientos, Patrimonio, Presupuesto,
Inversiones, Metas, Copiloto IA (basado en reglas), onboarding inicial.

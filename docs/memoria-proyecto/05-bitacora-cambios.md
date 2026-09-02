# Bitácora de cambios

Ver también: [[README|Índice]]

Resumen legible del historial del proyecto, agrupado por tema — no es un
calco de cada commit, sino el "por qué" detrás de cada bloque de trabajo.
Orden: **más reciente primero**. El detalle línea por línea vive en
`git log` (trazable de verdad) y en el historial de tareas de la sesión de
Claude Code.

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

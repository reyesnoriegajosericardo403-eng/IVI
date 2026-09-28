# VALU — Blueprint de Proyecto: Cierre de Fase 1

> **Única Fuente de Verdad** para el estado del proyecto al cierre de la
> Fase 1 (producto base + arquitectura a prueba de futuro + BYOK + chat de
> IA con acciones sobre datos + Apariencia con fondo de foto). Generado
> por auditoría directa del código, `git log`, la lista de 263+ tareas
> rastreadas, y `docs/memoria-proyecto/` (que sigue siendo la memoria
> detallada del "cómo" — este documento es el "dónde estamos parados y qué
> sigue").
>
> Fecha de corte: 2026-09-27 (actualizado tras la ronda de transferencias +
> endurecimiento de sync) · Rama: `claude/valu-finance-ai-app-rxlwyi` ·
> Último commit: `430c6df`.

---

## 1. Estado Actual y Componentes Activos (The Core)

### 1.1 Stack técnico verificado

| Capa | Tecnología | Versión exacta (package.json) |
|---|---|---|
| Framework | Expo SDK 57 + Expo Router | `expo ~57.0.18`, `expo-router ^57.0.17` |
| UI runtime | React 19 + React Native | `react 19.2.3`, `react-native 0.86.3` |
| Web | React Native Web | `^0.21.2` |
| Estado global | Zustand | `^5.0.15` |
| Backend | Supabase (Postgres + Auth + RLS + Edge Functions) | `@supabase/supabase-js ^2.112.4` |
| Lenguaje | TypeScript | `~6.0.3` |
| Animaciones/gestos | Reanimated 4 + Gesture Handler | `^4.6.0` / `^3.2.1` |
| SVG | react-native-svg | `^15.15.5` |
| Nuevo (Fase 1 tardía) | expo-clipboard, expo-haptics | `~7.0.0`, `~57.0.2` |

Un solo `package.json`, sin monorepo. Deploy web en Vercel
(`ivi-beta.vercel.app`). El código es el mismo que correría nativo en
iOS/Android si se compilara — hoy solo se usa/prueba en web.

### 1.2 Inventario de pantallas activas (`app/`)

23 rutas vía Expo Router (una por archivo):

- **Tabs principales** (`app/(tabs)/`): `index` (Inicio/Dashboard),
  `movimientos`, `patrimonio`, `ia` (chat), `inversiones`, `metas`.
- **Flujos**: `capture.tsx` (registro por voz/manual), `onboarding.tsx`,
  `auth.tsx` + `forgot-password.tsx` + `reset-password.tsx`,
  `transaction/new.tsx` + `transaction/[id].tsx`,
  `budget-template/[id].tsx`.
- **Configuración**: `settings.tsx`, `ai-settings.tsx`, `perfil.tsx`,
  `appearance.tsx` **(nuevo)**, `privacidad.tsx`, `terminos.tsx`,
  `instalar.tsx` (guía PWA).
- **Presupuesto**: `presupuesto.tsx` (rediseñado 3 bloques: resumen,
  calendario, lista de plantillas).
- **Salud financiera**: `salud-financiera.tsx`.

Cada una de estas pantallas pasó por al menos un ciclo completo de
diseño → feedback del usuario → rediseño (ver Sección 2). Ninguna es un
placeholder — las 263+ tareas rastreadas terminan, casi todas, en
"Verificar (tsc + Playwright), commit y push".

### 1.3 Esquema de datos — jerarquía y clasificación exacta

Todo registro sincronizable extiende `SyncMeta` (`src/data/types.ts`):

```
SyncMeta { id: UUID, createdAt: ISO, updatedAt: ISO, deletedAt?: ISO }
```

Nunca se borra nada de verdad (borrado suave), nunca un id compuesto de
fecha+monto+categoría (siempre UUID). Entidades que extienden `SyncMeta`,
por dominio:

```
Finanzas núcleo
├─ Transaction        (type, amount, currency, categoryId, subcategoryId,
│                       accountId, toAccountId?, date, origin, excludeFromBudget?)
├─ Account            (name, type, currency, balance, color?, isTransportCard?)
└─ Liability          (type, institution, balance, interestRate?, dueDate?)

Presupuesto (DOS esquemas conviven a propósito)
├─ Budget                    (legado: categoryId suelto + monthlyAmount)
└─ Plantillas con nombre (spec: "presupuesto para clases vs. vacaciones")
   ├─ BudgetTemplate          (name, kind: week|month|day, color, isDefault)
   ├─ TemplateBudgetLine      (templateId, categoryId, monthlyAmount, periodicity,
   │                            frequency, dayOfMonth?, includedAccountIds?)
   ├─ BudgetAssignment        (templateId, periodKey: "2026-09"|"2026-W36"|"2026-09-15")
   └─ PeriodBudgetOverride    (assignmentId, categoryId, monthlyAmount|null — ajuste
                                de UN renglón para UN periodo sin tocar la plantilla)

Metas e inversión
├─ Goal                (name, targetAmount, currentAmount, targetDate?)
├─ InvestmentPosition  (ticker, assetClass, quantity, avgCostPrice, realizedPnL?)
└─ NetWorthSnapshot    (date, assets, liabilities, netWorth — 1 por día)

Auditoría
└─ AuditLogEntry       (entityType, entityId, action, summary, previousValue, newValue)

Catálogo estático (NO vive en Supabase — es código, `src/data/categories.ts`)
└─ CategoryDef[]  (12)
   └─ SubcategoryDef[] (146 total)
        └─ keywords: string[]  (858 total, verificado por conteo directo)

Chat de IA (deliberadamente NO extiende SyncMeta,
local-only, ver Sección 3)
├─ ChatConversation   (id, title, createdAt, updatedAt, lastPreview, pinned?)
├─ ChatMessage        (id, conversationId, role, text, createdAt, action?)
└─ AIActionProposal   (id, type: AIActionType[14 valores], args, summary,
                         status: proposed|applied|dismissed|failed)
```

`UserProfile` (no tiene id propio — 1 por usuario) guarda preferencias:
moneda, tema, `visualStyle`/`lastPermanentVisualStyle`, `age`/`sex` (para
tono de encuesta), `seenBudgetTemplatesIntro`, y — **nuevo, Apariencia**
(Sección 1.7) — `accentPaletteId`, `backgroundMode`
(`none`|`catalog`|`custom`), `backgroundCatalogImageId`,
`backgroundCustomUri` (foto propia, como `data:` URI base64 — sincroniza a
Supabase igual que el resto del perfil, ver 1.7), `backgroundFocalX/Y`
(mobile y desktop por separado), `backgroundDarkness`,
`backgroundBlurAmount`. Además, `profileDirty: boolean` (en el store, no
en `UserProfile`) marca ediciones locales sin confirmar en el servidor —
pieza central del endurecimiento de sync (Sección 1.6).

**Backend real**: 19 migraciones SQL versionadas en `supabase/migrations/`
(`0001` núcleo hasta `0019` sincroniza `background_custom_uri`), todas con
Row Level Security — cada usuario solo lee/escribe sus propias filas.

### 1.4 Capa de proveedores intercambiables (`src/providers/`)

Punto único de cambio (`registry.ts`) — la UI nunca importa una
implementación concreta:

| Interfaz | Implementación local (siempre activa) | Implementación real (opcional) |
|---|---|---|
| `AIInterpreterProvider` | `localAIInterpreter` → `localParser.ts` | `LLMAIInterpreterProvider` (BYOK) |
| `CopilotProvider` | `localCopilotProvider` → `localCopilot.ts` | `LLMCopilotProvider` (BYOK) |
| `ActionAgentProvider` **(nuevo)** | `localActionAgent` → `chatIntentParser.ts` | `LLMActionAgentProvider` (BYOK) |
| `MarketDataProvider` | `unavailableMarketDataProvider` (nunca inventa) | Edge Function `market-data` (Yahoo + CETES/Banxico) |
| `ExchangeRateProvider` | `staticExchangeRateProvider` | — |
| `SpeechToTextProvider` | `webSpeechProvider` (Web Speech API) | — (pendiente STT en nube para iPhone) |

### 1.5 Mecánica de interacción del usuario — dos vías de entrada SEPARADAS

Este es un punto crítico que la auditoría confirma: **captura por voz/manual
y el chat de IA son dos pipelines de lenguaje independientes**, no
comparten motor.

**A) Captura (`app/capture.tsx`, 767 líneas) — solo LECTURA→escritura de
UN movimiento/ajuste a la vez**, vía `src/ai/localParser.ts` (543 líneas):

```
Texto dictado/escrito
  → 1. applyCustomMapping()      (memoria de correcciones del usuario — máxima prioridad)
  → 2. KNOWN_MERCHANTS           (Starbucks, Uber, DiDi, Netflix... → categoría fija)
  → 3. disambiguateGas()         (gasolina vs. gas de casa por contexto)
  → 4. Catálogo por palabra clave (containsKeywordAsWord — límite \b, la keyword
                                    MÁS LARGA que calce gana)
  → 5. fuzzyMatchCategory()      (Levenshtein, solo palabras de 6+ letras, tolerancia
                                    proporcional al largo — último recurso)
  → 6. Si nada calzó: se pregunta a la persona (nunca se inventa)
```

`extractAmount()` reconoce dígitos y números dictados en palabras
compuestas ("cincuenta y cinco" = 55), prefiriendo el número pegado a una
palabra de moneda cuando hay varios en la frase.
`detectAccountAdjustment()` reconoce "agrégale/quítale $X a mi cuenta Y" y
lo aplica como transacción real (nunca sobrescribe el saldo directo).

**B) Chat de IA (`app/(tabs)/ia.tsx`, 527 líneas) — lectura Y escritura
sobre CUALQUIER entidad del catálogo cerrado**, con un pipeline de
seguridad de 3 capas:

```
Mensaje del usuario
  → detectChatIntent() [chatIntentParser.ts, regex local, 132 líneas]
      — SOLO reconoce patrones explícitos (agregar/borrar cuenta, meta, deuda,
        aportar a meta, fijar presupuesto, ajuste genérico de saldo)
      — si no reconoce nada Y hay un LLM conectado (BYOK) → LLMActionAgentProvider
        interpreta lenguaje libre sobre el MISMO catálogo (nunca más permisivo)
      — si ninguno reconoce nada → cae a responder como copiloto de solo lectura
  → resolve*() [actionCatalog.ts, 395 líneas] — VALIDACIÓN OBLIGATORIA:
      — resuelve nombres por similitud contra datos reales (nunca un ID que
        "diga" el modelo) vía resolveByNameHint/resolveAccountByNameHint/etc.
      — arma `summary` (texto de confirmación) SIEMPRE por código, nunca con
        la prosa del modelo
      — categoría/subcategoría solo se aceptan si existen literal en el catálogo
  → ChatActionCard.tsx — muestra el summary + HoldToConfirmButton
      (mantener presionado ~900ms — nunca un tap simple, para que no se dispare
      sin querer en un feed de chat lleno de burbujas tocables)
  → aiApplyAction() [useAppStore.ts] — RE-VALIDA contra el estado ACTUAL
      (cierra TOCTOU: si el usuario borró la cuenta entre que se propuso y
      se confirmó, la acción falla en vez de aplicarse a un id fantasma)
      → despacha por switch EXHAUSTIVO (14 tipos, TS no compila si falta uno)
      → llama la acción hermana real (addAccount, deleteGoal, etc.) → enqueue()
```

Catálogo cerrado de 14 `AIActionType`: `add_transaction`, `add_account`,
`delete_account`, `add_goal`, `contribute_to_goal`, `update_goal_target`,
`delete_goal`, `add_liability`, `update_liability_balance`,
`delete_liability`, `set_budget_line`, `delete_budget_line`,
`delete_transaction`, `transfer_between_accounts` **(nuevo, cierra la
tarea #144 — ver 2.3)**. **Nunca** incluye código, ajustes, autenticación
ni el sistema de estilos — solo entidades de datos del propio usuario.
Como mucho una acción propuesta por turno.

### 1.6 Motor de sincronización (`src/services/sync/SyncEngine.ts`)

`runSync()`: sube primero el perfil si está `profileDirty` (más urgente y
pequeño que la cola de entidades — ver el porqué abajo), luego empuja la
cola de pendientes (`pendingSync`, `enqueue()` en cada mutación del
store), luego trae cambios remotos y fusiona con "el más reciente gana"
por `updatedAt`. Si Supabase no está configurado o no hay sesión, no hace
nada — la app sigue en modo local puro (nunca se rompe por falta de
config). `ALL_TABLES` (la lista que usa `pullRemoteChanges` para TRAER
cambios remotos) ya cubre las 12 tablas reales de `SyncTable` — el hueco
de las 4 tablas de presupuesto documentado en una auditoría anterior de
este mismo blueprint (Sección 3.1) **ya está corregido**.

**Endurecimiento contra pérdida de datos por cierre forzado del proceso
(2026-09-27, dos rondas).** Reporte del usuario: el nombre y la foto de
fondo se revertían al reabrir la app — primero se reprodujo con un simple
cerrar/reabrir (sin forzar el cierre), después con quitar la PWA de "apps
activas" en iOS (force-quit real del proceso, no solo pasarlo a segundo
plano). Dos mecanismos separados, porque son dos causas distintas:

1. **`profileDirty` (bug de reconciliación, resuelto de raíz).**
   `useProfileReconciliation` adoptaba el perfil remoto de Supabase al
   reabrir la app sin fijarse si el perfil LOCAL tenía un cambio todavía
   sin confirmar en el servidor — si la subida anterior no había
   terminado antes de cerrar, reabrir traía de vuelta el perfil viejo y
   "borraba" el cambio. Corregido con un flag `profileDirty` (persistido)
   que la reconciliación revisa ANTES de adoptar cualquier cosa del
   servidor: si hay un cambio local sin confirmar, nunca se pisa — solo
   se dispara `runSync()` para intentar subirlo. **Esto resolvió el caso
   de "solo cerré y reabrí la app".**
2. **Cierre forzado del proceso (mitigado, límite de plataforma — no
   "resuelto" al 100%).** Un PWA instalado en iOS puede terminar el
   proceso por completo al quitarlo de "apps activas", matando una
   petición de red a medio vuelo aunque se haya disparado en el primer
   instante posible. Mitigaciones aplicadas, en orden de cuándo se
   disparan:
   - `useSyncEngine.ts` registra `visibilitychange` (web) y `AppState`
     (nativo) para disparar una subida de emergencia en el primer
     instante en que el sistema avisa que la app se va a segundo plano —
     no espera al ciclo de 60s. También registra `pagehide` en paralelo
     (Safari/iOS no siempre dispara `visibilitychange` de forma
     confiable en este escenario).
   - Esa subida de emergencia (`pushProfileNow()`, en web) usa un `fetch`
     crudo con `keepalive:true` contra el REST de Supabase — en vez del
     cliente `supabase-js` normal, cuyo `fetch` interno NO sobrevive el
     cierre del proceso. `keepalive` le entrega la petición a la capa de
     red del propio navegador/SO (mismo mecanismo que los beacons de
     analítica), que puede seguir en vuelo aunque el proceso que la
     disparó ya haya muerto.
   - `getUserId()`/`getSessionCreds()` usan `supabase.auth.getSession()`
     (lee la sesión local) en vez de `getUser()` (valida contra el
     servidor) — un viaje de red menos en cada sincronización, reduciendo
     el tiempo entre "se dispara la subida" y "sale hacia el servidor".

   **Honestidad sobre el límite real**: esto reduce la ventana de la
   carrera contra el sistema operativo, pero **ninguna mitigación
   solo-JS puede cerrarla del todo** — si el proceso muere antes de que
   el `fetch` con keepalive alcance a salir, el cambio se pierde
   igual. Confirmado que la sesión de Supabase SÍ sobrevive un
   force-quit (no pide iniciar sesión de nuevo), lo que descarta un
   borrado total de `localStorage` — es específicamente una carrera de
   timing contra el cierre del proceso, no un borrado de almacenamiento.
   Queda como **deuda técnica documentada** (Sección 3), no como bug
   cerrado.

### 1.7 Apariencia — Vidrio líquido, paletas y fondo de foto (`app/appearance.tsx`)

Sistema de personalización visual construido en varias rondas
(60a58be→8740bac):

- **Estilos visuales como datos** (`src/theme/visualStyles.ts`): cada
  estilo es un objeto con colores + "tokens de superficie" (borde,
  sombra, blur, degradado). Estilos activos: **Vidrio** (glassmorphism,
  default), **Vidrio líquido** (2º lugar — único con foto de fondo y
  paleta de acento elegible) y **Degradado suave**. *Neo brutalista* se
  quitó por completo (2026-09-27, pedido explícito del usuario) —
  `resolveVisualStyle()` ya sabía regresar a un estilo permanente cuando
  el id guardado no existe, así que a quien lo tenía puesto no se le
  rompe nada, cae solo al de vidrio.
- **`AppBackground.tsx`**, montado una sola vez en `app/_layout.tsx`,
  pinta el fondo compartido por TODA la app (foto o degradado) detrás de
  cada pantalla — cada pantalla pinta su propio contenedor con
  `colors.background: 'transparent'` para dejarlo ver (bug real
  corregido: si ese color era opaco, tapaba la foto por completo aunque
  todo lo demás estuviera bien).
- **`BackgroundPhotoLayer.tsx`** (compartido entre `AppBackground` y la
  vista previa de `AppearancePreview.tsx`, con `filterIdSuffix` para no
  chocar ids de SVG cuando ambos están montados a la vez): foto + punto
  focal + degradado de oscurecimiento + blur opcional, todo dentro de un
  `<Svg>` de tamaño exacto en píxeles.
- **Catálogo de fondos** (`src/data/backgroundCatalog.ts`): 5 categorías
  (Soft y calma, Gym y movimiento, Naturaleza, Inspiracional,
  Arquitectura), con fotos reales aprobadas por el usuario en las
  primeras 3.
- **Foto propia**: selector (`expo-image-picker`), arrastrar directo
  sobre la vista previa para mover el punto focal (reemplazó una rejilla
  3×3 de "Mover imagen"), sliders de oscuridad/desenfoque. En web, el
  `blob:` URL que devuelve el selector se convierte a `data:` URI
  (canvas + `toDataURL`) antes de guardarse — un `blob:` muere al
  recargar la página, así que sin esto la foto "desaparecía" al reabrir
  (bug real, corregido).
- **Sincroniza a Supabase** como el resto del perfil (migración 0019) —
  decisión explícita de sincronizar la foto entera como `data:` URI en
  vez de dejarla solo local, para que sobreviva cerrar la app (ver 1.6).
- `app/perfil.tsx` y `app/appearance.tsx` comparten el mismo patrón:
  botón "Guardar"/"Aplicar" que espera (`await runSync()`) a que la
  subida se intente de verdad antes de salir de la pantalla, mostrando
  "Guardando…" y deshabilitando los botones mientras tanto.

---

## 2. El Cementerio de Ideas y Decisiones (Lessons Learned & ADRs)

Registro honesto de lo que se probó, se rechazó o se revirtió — y por qué.

### 2.1 Rediseños completos por rechazo explícito del usuario

| Qué se construyó primero | Por qué se descartó | En qué se convirtió |
|---|---|---|
| Chat "Copiloto" con paleta seria, orbe abstracto iridiscente, tonos naranjas | Feedback textual: *"no me agradó para nada, se ve serio y nada confortable... nadie va a querer volver a ver esa pantalla"* | Rediseño completo (Turno I→J): branding **VALU** (nunca "Copiloto"), paleta oscura fija tipo asistente, glassmorfismo real |
| Esfera abstracta 3D como avatar del chat | *"quiero que lo cambiemos al logo de la app... circular... con efecto 3D"* | `AiOrb.tsx` reescrito: logo real (`assets/icon.png`) recortado en círculo + gloss/rim-shade SVG + halo pulsante |
| Tonos naranjas en el fondo/acentos del chat | *"quita los tonos naranjas"* — explícito | Paleta `CHAT_PALETTE` sin naranjas, verificado por escaneo automático de colores (Playwright) en la sesión |
| Sidebar de conversaciones fija, sin contraer | *"la barra lateral se debe poder contraer y retraer con un botón"* | Patrón riel (`RAIL_WIDTH=68`) + columna completa (`SIDEBAR_WIDTH=300`) con toggle |
| Componente `SwipeToConfirm` (deslizar para confirmar el registro de voz) — tareas #71-73 | No se sentía bien en pantallas táctiles reales (feedback de uso) | Eliminado por completo (#74) y reemplazado por `HoldToConfirmButton` (mantener presionado) — hoy es el patrón estándar de confirmación en TODA la app, incluido `ChatActionCard` |
| Estilo visual "Neo brutalista" (borde grueso, sombra dura, tipografía pesada) | Pedido explícito del usuario (2026-09-27): quitarlo por completo | Eliminado de `visualStyles.ts` — `resolveVisualStyle()` ya sabía regresar a un estilo permanente cuando el id guardado no existe, así que a quien lo tenía puesto no se le rompe nada |
| Orden de estilos: Vidrio → Degradado suave → Neo brutalista → Vidrio líquido (4º/último) | Pedido explícito: subir Vidrio líquido a 2º lugar | `BUILT_IN_VISUAL_STYLES = [glassmorphism, liquidGlass, softGradient]` |

### 2.2 Decisiones de arquitectura evaluadas y rechazadas (ADRs negativos)

**Búsqueda vectorial / `pg_trgm` en Postgres para el catálogo de
categorías.** Propuesta en un "JSON de arquitectura de IA v7" del
usuario. Rechazada: el catálogo es un archivo estático en código
(`categories.ts`), no vive en Supabase — meter una extensión de Postgres
y un endpoint de búsqueda para esto abría superficie de ataque nueva sin
ninguna ganancia real. Se implementó el equivalente (match por palabra
clave + fuzzy) directo en TypeScript, dentro de la app.

**Reglas de horario nocturno para "antojos".** Se revisó y no resolvía
ninguna ambigüedad real (esas palabras clave ya apuntaban a una sola
subcategoría sin conflicto) — complejidad sin beneficio, no se agregó.

**Verbos "metí"/"guardé" como disparadores genéricos de Inversión.**
Rechazados por ambiguos ("metí gol", "metí la pata") — habrían creado
clasificaciones nuevas incorrectas. Se mantiene el uso más acotado que ya
tenían para Ahorro.

**Obsidian como "base de datos para el resto de usuarios".** El usuario
lo propuso explícitamente el 2026-09-02. Rechazado con explicación
documentada: Obsidian es una app de notas de un solo dispositivo/persona,
sin autenticación ni aislamiento de datos entre usuarios — usarlo como
backend multiusuario habría sido un retroceso real de seguridad. Se
mantuvo Supabase (RLS real) como único backend de datos; Obsidian/Markdown
se usa solo como formato legible para la memoria *del proyecto* (esta
misma carpeta `docs/`), nunca para datos financieros de nadie.

**"Design Style" / toggle decorativo en la referencia visual tipo "Framer
AI".** Al rediseñar el composer del chat según una imagen de referencia,
uno de sus controles (un menú de estilo de diseño) no mapeaba a ninguna
función real de VALU. Se omitió a propósito en vez de construir un
control sin función — mismo criterio de "nunca inventar" que rige el
resto de la app — y el espacio se usó para un indicador real (motor
local vs. proveedor conectado).

**Renombrar `excluded_account_ids` → `included_account_ids`.** No fue un
error técnico sino un cambio de modelo mental a media implementación:
pasar de una lista de exclusión ("qué cuentas NO usar") a una de
inclusión ("con cuáles SÍ se paga esto") resultó más natural de explicar
y usar. Requirió una migración correctiva (`0011` → `0012`) porque la
primera migración de la columna causó un problema documentado en
`04-migraciones-supabase.md`.

**Cálculo de presupuesto por periodicidad — dos correcciones matemáticas
reales.** "Semana" usaba un promedio de 4.33 semanas/mes (matemáticamente
correcto, pero daba resultados que no cuadraban con la intuición de la
persona) → se cambió a ×4 fijo. "Día" con frecuencia diaria usaba un
promedio de días/mes → se cambió a contar los días reales del mes
específico que se está presupuestando.

**Bug de coincidencia por subcadena en el motor de clasificación.**
`texto.includes(palabraClave)` causaba falsos positivos reales:
"cuarenta" (número) contiene "renta" → se clasificaba como Alojamiento;
"aguakate" contiene "agua" → Alojamiento en vez de corrección difusa a
"aguacate". Corregido exigiendo coincidencia de palabra completa
(`\b` regex).

### 2.3 Trabajo pausado deliberadamente (no fallido — diferido con razón documentada)

**Tarea #144 — Motor de intenciones financieras (transferencias, deudas,
metas).** Un segundo JSON del usuario (catálogo v9, 2026-09-02) pedía que
el registro entendiera "pasé X de A a B", "le debo X a Y", "le metí X a mi
meta de Z". Se investigó **antes de tocar código** y se decidió NO
implementarlo en ese momento por dos razones concretas:

1. El modelo de datos ya soporta transferencias (`Transaction.type =
   'transfer'`, matemática correcta en `ledger.ts`) pero **ninguna
   pantalla las creaba ni las mostraba especial** — `movimientos.tsx` las
   mostraría como "Miscelánea -$500" en vez de una transferencia real.
   Activarlo sin la vista habría sido una función a medias.
2. Crear/abonar una deuda o meta acopla DOS mutaciones a la vez (el
   pasivo/meta + la cuenta de origen) — no es una extensión chica.

**Actualización 2026-09-27 — RESUELTA vía chat de texto/voz del chat de
IA.** Deudas y metas ya se habían cerrado en la ronda del catálogo de
acciones (Sección 1.5). Hoy se cerró la pieza que faltaba,
**transferencias**: nueva acción `transfer_between_accounts` en
`actionCatalog.ts` (resuelve ambas cuentas por nombre, exige misma moneda
— sin conversión de divisas todavía —, valida que no sea la misma cuenta),
reconocimiento local por regex en `chatIntentParser.ts` ("transfiere 500
de mi efectivo a mi tarjeta nu"), y una categoría "Transferencias" nueva
(`categories.ts`) para que se vea bien en Movimientos en vez de caer en
Miscelánea. La razón #1 de arriba (sin vista en Movimientos) ya no
aplica: la categoría dedicada + el campo `merchant` ("Efectivo →
Tarjeta Nu") resuelven la visualización sin tocar `movimientos.tsx`.

**Lo que queda pendiente de esto** (ver Sección 3.3): la captura rápida
dedicada (`app/capture.tsx` + `src/ai/localParser.ts`, el motor "de un
solo movimiento a la vez") sigue sin transferencias/deudas/metas — solo
el chat de IA (`ia.tsx`) las tiene, vía `actionCatalog.ts`. El micrófono
del chat sí se beneficia (transcribe con el mismo Speech-to-Text y pasa
por `chatIntentParser.ts`), pero el atajo de "Grabar por voz" de la
pantalla de inicio (que abre `capture.tsx` directo) no.

---

## 3. Deuda Técnica y Parches

### 3.1 ✅ Resuelto — fuga de sincronización de una sola vía en 4 tablas de presupuesto

**Fuga de sincronización de una sola vía en 4 tablas de presupuesto.**
`src/services/sync/types.ts` define `SyncTable` con 12 valores, y
`repositoryByTable` (`src/services/supabase/repositories.ts`) tiene
repositorio real para las 12. `ALL_TABLES` en
`src/services/sync/SyncEngine.ts` (la lista que usa `pullRemoteChanges`
para TRAER cambios remotos) llegó a tener solo **8**, dejando fuera:
`budget_templates`, `template_budget_lines`, `budget_assignments`,
`period_budget_overrides` — exactamente las 4 tablas del sistema de
"presupuestos con nombre" (tareas #166-178, uno de los rediseños más
grandes de la Fase 1).

**Efecto que tuvo mientras estuvo sin corregir**: `pushPendingChanges()`
sí subía cambios de estas 4 tablas (usa `pendingSync` +
`repositoryByTable` directo, sin pasar por `ALL_TABLES`), pero
`pullRemoteChanges()` nunca las volvía a bajar. Un usuario que editara sus
plantillas de presupuesto en un segundo dispositivo, o que reinstalara la
app, nunca veía esos cambios reflejados — el push funcionaba, el pull no,
fuga silenciosa de una sola vía. No estallaba con ningún error visible,
por eso pasó desapercibido hasta esta auditoría.

**Estado actual: corregido.** `ALL_TABLES` ya incluye las 12 tablas reales
de `SyncTable` (ver `src/services/sync/SyncEngine.ts`, comentario "auditoría
2026-09-27"). Queda como entrada histórica del blueprint — el código ya
no tiene el hueco.

### 3.2 La conexión de IA — qué es bug real y qué es diseño esperado

El usuario mencionó una app que "nunca funcionó" al conectar una IA. La
auditoría del código aclara el panorama:

- **Por diseño (no es un bug)**: VALU es BYOK (Bring Your Own Key) a
  propósito — nunca hay una clave propia de VALU. `ai-relay` es
  únicamente un proxy CORS sin estado (no guarda, no factura, no ve el
  contenido más que de paso). Sin conectar nada, el copiloto local
  (`localCopilotProvider`) sigue funcionando siempre.
- **Riesgo real identificado**: `app/ai-settings.tsx` tiene un botón
  "Probar conexión" que sí hace una llamada real de prueba
  (`createLLMClient(...).chat('ping')`) — pero **no hay evidencia en el
  historial de que esto se haya verificado con una clave real de
  producción** desde este entorno de desarrollo (sandbox sin acceso a
  claves de Claude/OpenAI/Gemini/Grok reales). Todo lo verificado en
  sesión fue con Playwright contra el motor local, nunca contra un
  proveedor LLM real end-to-end.
- **Evidencia de al menos una ruptura real pasada**: tarea #226 dice
  literalmente *"IA: limpiar modelo Claude desactualizado y reactivar el
  chat"* — confirma que en algún punto el `model` por defecto quedó
  apuntando a un identificador de modelo que ya no existía, rompiendo la
  conexión hasta que se corrigió.
- **Fricción adicional real, ya documentada en la UI misma**: en la
  versión web sin Supabase configurado, `ai-settings.tsx` avisa
  explícitamente que el proveedor "no podrá responder aquí todavía por
  una restricción de seguridad del navegador" (`needsWebRelay`) — CORS
  exige el relevo de Supabase, así que sin backend configurado, BYOK web
  no funciona aunque la clave sea válida.

**Conclusión honesta**: no hay un bug de código confirmado hoy en el
camino BYOK (el flujo `createClient → relayFetch → ai-relay → proveedor`
es correcto), pero tampoco hay una prueba end-to-end confirmada con una
clave real reciente. Es la pieza de mayor incertidumbre de todo el
proyecto porque es la única que no se puede probar por Playwright/tsc.

### 3.3 Código temporal / soluciones rápidas pendientes de refactor

- **`customCategoryMappings`, `conversations`, `chatMessages` — solo en
  este dispositivo.** Deliberado y documentado (`chatTypes.ts` explica
  por qué no extienden `SyncMeta`), pero sigue siendo deuda desde el
  punto de vista del usuario: reinstalar la app o cambiar de dispositivo
  borra el historial del chat y la memoria de correcciones aprendidas.
- **Campos de fecha de presupuesto (`dayOfMonth`, `dayOfWeek`,
  `oneTimeDate`) sin columna en Supabase** — funcionan bien dentro de un
  mismo dispositivo, no viajan entre dispositivos.
- **Rate limiting de `ai-relay` es en memoria, por instancia de Edge
  Function** — "best-effort": una función que arranca en frío pierde el
  contador. Suficiente para frenar abuso sostenido, no es un límite
  garantizado.
- **Voz/captura rápida vs. chat: dos motores de lenguaje que no se
  comparten todavía.** El catálogo de acciones (`actionCatalog.ts`) que
  el chat ya usa para escribir datos (incluyendo transferencias, deudas y
  metas — ver 2.3) NO está conectado a `capture.tsx` — la captura rápida
  dedicada sigue limitada a un solo movimiento/ajuste de saldo por vez,
  sin acceso a metas/deudas/presupuesto/transferencias. Es la mitad
  todavía sin resolver de la tarea #144: el chat de texto/voz (`ia.tsx`)
  ya cubre las tres, `capture.tsx` (el atajo directo de "Grabar por voz")
  no.
- **iOS PWA + cierre forzado del proceso — mitigado, no cerrado del
  todo.** Ver Sección 1.6: hay defensas reales (`keepalive` fetch,
  `pagehide`/`visibilitychange`, `getSession()` en vez de `getUser()`)
  pero sigue siendo una carrera de timing contra el sistema operativo que
  ningún fix solo-JS garantiza cerrar al 100%.
- **Transferencias sin conversión de divisas.** `transfer_between_accounts`
  (Sección 1.5/2.3) rechaza explícitamente mover dinero entre dos cuentas
  de monedas distintas en vez de adivinar un tipo de cambio — es un límite
  a propósito, no un olvido, pero significa que alguien con cuentas en
  MXN y USD no puede transferir entre ellas todavía.

### 3.4 Tareas abiertas en el backlog (estado real, no aspiracional)

| # | Tarea | Estado |
|---|---|---|
| 144 | Motor de intenciones financieras (transferencias, deudas, metas) | **resuelto vía chat de IA** (texto y voz del chat) — pendiente solo en `capture.tsx`/atajo directo de voz, ver 3.3 |
| 148 | Captura por voz: mantener presionado + iluminación futurista | **in_progress** |
| 149 | Nota grande "mantén presionado" + explicación del ícono LISTO | **pending** |
| 158 | Onboarding: cálculo mensual del presupuesto mal | **in_progress** — bug de cálculo aún sin cerrar |
| — | Pérdida de datos en force-quit de iOS PWA | **mitigado, no cerrado** — ver 1.6 y 3.3 |

### 3.5 Validación pendiente en hardware real

Los arreglos de PWA/Android (service worker "red primero" para
manifest/íconos, permiso explícito de micrófono) están en producción pero
**nunca se probaron en un teléfono Android físico** — solo en Chromium de
escritorio (documentado en `06-pendientes.md` desde 2026-09-02, sigue sin
confirmarse).

---

## 4. Arquitectura y Flujo Actual

### 4.1 Cómo se conectan las piezas, de punta a punta

```
┌─────────────────────────────────────────────────────────────────────┐
│  UI (Expo Router — app/)                                             │
│  23 pantallas, todas leen/escriben SOLO a través de useAppStore()    │
└───────────────────────────┬───────────────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────────────┐
│  ESTADO GLOBAL — src/store/useAppStore.ts (Zustand, 1041 líneas)   │
│  Única fuente de verdad en el cliente. Persistido en                │
│  AsyncStorage/localStorage bajo "valu-app-storage".                  │
│  Cada mutación de datos financieros llama enqueue(tabla, id, op)     │
└──────┬──────────────────────────────────────┬─────────────────────┘
       │ (lectura/interpretación)              │ (cola de sync pendiente)
┌──────▼───────────────────────┐   ┌──────────▼─────────────────────┐
│  CAPA DE PROVEEDORES          │   │  SyncEngine.runSync()          │
│  src/providers/registry.ts    │   │  push → pull → merge (LWW)     │
│  (único punto de cambio)      │   └──────────┬─────────────────────┘
│                                │              │
│  ┌──────────────────────────┐ │   ┌──────────▼─────────────────────┐
│  │ SIEMPRE ACTIVO (local)    │ │   │  SUPABASE                      │
│  │ localParser.ts            │ │   │  Postgres + RLS + Auth +       │
│  │ localCopilot.ts           │ │   │  Edge Functions                │
│  │ chatIntentParser.ts +     │ │   │  (12 tablas, 19 migraciones)   │
│  │ actionCatalog.ts          │ │   └─────────────────────────────────┘
│  └──────────────────────────┘ │
│  ┌──────────────────────────┐ │   ┌─────────────────────────────────┐
│  │ OPCIONAL (BYOK)           │ │   │  ai-relay (Edge Function)       │
│  │ LLMAIInterpreterProvider  │─┼──▶│  Proxy CORS sin estado,         │
│  │ LLMCopilotProvider        │ │   │  rate-limit 30 req/60s/IP,      │
│  │ LLMActionAgentProvider    │ │   │  cap 256KB, solo 4 hosts        │
│  └──────────────────────────┘ │   │  permitidos (Claude/OpenAI/      │
└────────────────────────────────┘   │  Gemini/Grok)                   │
                                      └──────────────┬──────────────────┘
                                                      ▼
                                          Proveedor LLM real, con la
                                          CLAVE DEL USUARIO (nunca de VALU)
```

### 4.2 Las dos superficies de lenguaje natural, en paralelo

```
CAPTURA (app/capture.tsx)              CHAT (app/(tabs)/ia.tsx)
  voz/texto → localParser              texto/voz → chatIntentParser (local)
  → 1 movimiento/ajuste                          → LLMActionAgentProvider (BYOK)
  → HoldToConfirmButton                → actionCatalog.resolve*() (SIEMPRE,
  → store.addTransaction()               venga de regex o de LLM)
                                        → ChatActionCard + HoldToConfirmButton
                                        → aiApplyAction() (re-valida) → store
```

Ambas terminan en las mismas acciones reales del store
(`addTransaction`, `addGoal`, etc.) y ambas pasan por `enqueue()` →
`SyncEngine` — el chat no creó un camino de datos paralelo, reutiliza el
mismo, solo agrega una capa de interpretación/confirmación nueva antes de
llegar ahí.

### 4.3 Seguridad del sistema de escritura por IA (resumen operativo)

1. Catálogo cerrado de 14 tipos, unión discriminada de TypeScript.
2. Nunca se aplica nada sin `HoldToConfirmButton` explícito (~900ms).
3. Se revalida contra datos reales DOS veces (al proponer y al confirmar).
4. El texto de la tarjeta lo genera código desde `args` ya validados,
   nunca la prosa libre del modelo.
5. Como mucho una acción propuesta por turno.
6. Sin confirmación por lenguaje natural ("sí", "confirma") — solo el
   gesto.
7. El contexto que se manda a un LLM conectado incluye IDs pero nunca
   `notes`/texto libre ajeno (reduce superficie de inyección de
   instrucciones).
8. Nada de esto toca código, ajustes, autenticación ni el sistema de
   estilos.

---

## 5. Punto de Partida para la Fase 2

### 5.1 Dónde estamos parados, en una frase

VALU tiene un **producto financiero completo y funcional** (registro,
presupuesto, patrimonio, metas, inversión, sincronización real con
conflictos resueltos), un **chat de IA que ya puede leer y escribir
datos de forma segura** (incluyendo transferencias entre cuentas, cerrado
2026-09-27), y un **sistema de Apariencia** con vidrio líquido, paletas y
fondo de foto propia sincronizado a Supabase (Sección 1.7). Lo que sigue
para hacer el motor de lenguaje del chat dramáticamente más capaz —ya sea
escalando el enfoque local (embeddings + transformer ligero) o
construyendo una arquitectura híbrida edge+backend (knowledge graph +
federated learning)— **sigue sin código todavía**: existen solo como los
dos documentos JSON de planeación ya entregados en conversaciones
anteriores. Lo que sí avanzó desde el corte original de este blueprint
fue la deuda de producto (Pasos 1 y 3 de abajo), no el motor de lenguaje
en sí.

### 5.2 Estado de los 3 pasos originales + lo que sigue

**Paso 1 — Cerrar la deuda técnica antes de construir encima. ✅ Mitad
hecha.** `ALL_TABLES` en `SyncEngine.ts` ya tiene las 12 tablas (Sección
3.1, resuelto). La conexión BYOK con una clave real de producción sigue
**sin verificarse end-to-end** desde este entorno (sigue siendo la pieza
de mayor incertidumbre — Sección 3.2, sin cambios).

**Paso 2 — Decidir la estrategia de Fase 2 explícitamente.** Sin decisión
todavía entre Roadmap A (embeddings/transformer 100% local) y Roadmap B
(edge + backend centralizado tipo knowledge graph). Sigue siendo la
decisión pendiente más importante antes de invertir en el motor de
lenguaje en sí — ninguno de los dos tiene una sola línea de código.

**Paso 3 — Retomar la tarea #144 reutilizando lo construido para el
chat. ✅ Hecho para texto/chat, pendiente para voz dedicada.**
`transfer_between_accounts` ya existe en `actionCatalog.ts` con
reconocimiento local (regex) y vía LLM — deudas, metas y ahora
transferencias completas, todas disponibles desde `ia.tsx` (texto o el
micrófono del chat). Lo que NO se hizo (y sigue siendo el entregable más
barato disponible antes de invertir en el motor de lenguaje grande): **
conectar `capture.tsx`/`localParser.ts`** (el atajo directo de "Grabar
por voz" de la pantalla de inicio) al mismo `actionCatalog.ts`, en vez de
dejarlo limitado a un solo movimiento/ajuste de saldo. La infraestructura
de validación/seguridad ya existe y es la misma — es trabajo de
integración, no de diseño nuevo.

### 5.3bis Fase 2 ya arrancó formalmente (28 sep 2026) — reemplaza el "Paso 2" de arriba

El "Paso 2" de la sección anterior (elegir entre Roadmap A/B) ya no describe la realidad: se recibió
un plan revisado con instrucciones ejecutables (JSON de arquitecto senior + xlsx `Inventario_65` con
65 operaciones candidatas, 18 semanas en 6 fases P0-P5) y arrancó el trabajo real:

- **`docs/02_fase2_auditoria_operaciones.md`** — las 65 operaciones candidatas auditadas una por una
  contra el código real (no contra el inventario recibido, que se armó sin ver el repo): 16 en chat,
  24 en UI/datos sin exponer al chat, 17 sin implementar, 8 necesitan esquema nuevo.
- **`docs/03_fase2_contratos_v1.md`** — contratos versionados para plan multi-operación, datos
  faltantes, confirmación, idempotencia (con un primer guardia real ya en `aiApplyAction`,
  `useAppStore.ts`) y separación previsto/real.
- **Decisión de arquitectura ya tomada** (documentada en `docs/03`, no queda abierta como antes):
  pgvector sobre Supabase en vez de Weaviate, relaciones de Postgres + Graphify (grafo de
  conocimiento del propio código, `graphify-out/`) en vez de Neo4j, y una futura compartición de
  correcciones opt-in en vez de federated learning completo — federated learning real queda
  pospuesto a una Fase 3 explícita, condicionada a una base de usuarios activa real.
- Progreso por fase: **P0 (semanas 1-2) cerrado** con estos dos documentos. P1-P5 (golden set,
  planificador multi-acción, nuevas entidades de datos, ayuda contextual, beta en hardware real) sin
  empezar todavía — el cronograma completo vive en el xlsx recibido, sheet `Cronograma`.

### 5.3 Otros dos hilos abiertos, fuera del roadmap original

Dos piezas de trabajo real ocurrieron entre el corte original de este
blueprint y hoy, impulsadas por reportes directos del usuario, no por el
roadmap de Fase 2 — vale la pena que quien retome esto las tenga
presentes:

- **Apariencia (Sección 1.7)**: sistema completo de fondo de foto +
  paleta de acento + Vidrio líquido, con su propia ronda de bugs reales
  encontrados y corregidos (foto opaca tapando el fondo, `blob:` URL no
  persistente, reconciliación de perfil pisando cambios locales).
- **Endurecimiento de sync contra force-quit de iOS (Sección 1.6)**:
  mitigado con `keepalive` fetch + `pagehide` + `getSession()`, pero
  documentado explícitamente como **no resuelto al 100%** — es un límite
  real de plataforma, no un bug de código pendiente de arreglar. Quien
  retome esto no debería asumir que ya está "cerrado" solo porque hay
  commits al respecto.

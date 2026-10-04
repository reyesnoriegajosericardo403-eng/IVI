# P2 — Planificador multi-acción, fechas y catálogo en segundo plano

Ver también: [[README|Índice]] · [[03-motor-clasificacion|Motor de clasificación]] · [[08-golden-set-resultados|Resultados del golden set]] · [[06-pendientes|Pendientes]] · contratos: `docs/03_fase2_contratos_v1.md`

Fechas: 2026-10-03 y 2026-10-04. Rama `claude/valu-finance-ai-app-rxlwyi`.

## En una frase

Antes, el chat entendía **una** acción por mensaje y la app cargaba todo el vocabulario del motor de golpe. Ahora un
mensaje puede traer **varias acciones que se confirman juntas** (con preguntas cuando falta un dato, vista previa de cómo
quedan los saldos y una ejecución segura), el motor entiende **fechas** («ayer», «el 15 de marzo», «hace 3 días»), el
vocabulario grande **se baja en segundo plano** aparte de la app, y **lo que VALU aprende de ti viaja con tu cuenta**.

## Mapa de piezas

| Pieza | Archivos | Qué hace |
|---|---|---|
| Catálogo en segundo plano («túnel») | `src/data/catalogLoader.ts`, `src/data/keywordPacks/index.ts` (núcleo) y `extended.ts` (ampliado), `src/data/categories.ts` (`installKeywordPacks`), `src/data/useCatalog.ts` | El vocabulario grande sale del paquete inicial y se baja aparte |
| Planificador | `src/ai/planner.ts` | Un mensaje → ninguna, una o varias acciones validadas + aclaraciones + efectos |
| Ejecutor de planes | `src/ai/planExecutor.ts`, `aiApplyPlan` en `src/store/useAppStore.ts` | Aplica un plan una sola vez, en orden, sin inventar nada |
| Aclaraciones | `src/ai/actionCatalog.ts` (`ask`, `resolveCandidate`), `answerClarification` en el planificador | Pregunta el dato que falta y completa la MISMA acción con la respuesta |
| Fechas, horas y periodos | `src/ai/dates.ts` | «ayer», «el viernes», «el 15 de marzo», «a las 5 pm», «este mes» |
| Acciones nuevas del chat | `actionCatalog.ts`, `chatTypes.ts`, store | Retirar de una meta, fecha de una meta, vencimiento de una deuda; fecha en movimientos y metas nuevas |
| Tarjeta de plan | `src/components/ChatPlanCard.tsx`, `app/(tabs)/ia.tsx` | Muestra pasos, saldos resultantes, avisos y UN solo «mantén para confirmar» |
| Lo aprendido, sincronizado | `supabase/migrations/0022_category_mappings.sql`, `src/services/supabase/{mappers,repositories}.ts`, `src/services/sync/SyncEngine.ts`, store | La capa personal de la red de palabras viaja con la cuenta |
| Puertas de calidad | `.github/workflows/revision.yml`, `npm test`, `npm run size`, `scripts/smoke-web.cjs` | Se revisa solo en cada subida (desde el iPad no hace falta terminal) |

## 1. El «túnel» del catálogo: qué es y qué no es

**Lo que se pidió:** que quien descargue la app no baje todo el peso de la «mega red de palabras», sino solo lo de la app;
un «túnel» ligado a cada usuario que trabaje en segundo plano y proteja esos datos.

**Cómo se tradujo** (tres capas, porque cada una resuelve algo distinto):

| Capa | Qué es | Estado |
|---|---|---|
| 1. Vocabulario común | Las ≈19 mil palabras. **Núcleo** (≈3 mil, dentro de la app) + **ampliado** (el resto, un trozo aparte que se baja en segundo plano y queda en caché) | ✅ hecho y medido |
| 2. Lo personal (por usuario) | «Lo que VALU aprendió de ti»: tus correcciones palabra → categoría. Viaja con tu cuenta, protegido para que solo tú lo veas, y se sincroniza solo en segundo plano | ✅ código listo · falta correr la migración 0022 (ver §4) |
| 3. Catálogo remoto con versión | Poder mejorar el vocabulario sin publicar una versión nueva de la app | ⏳ diseñado, no construido (ver abajo) |

### Peso medido (descarga comprimida al abrir la app, versión web; KB = 1,024 bytes)

| Momento | Descarga inicial | Se baja después, en segundo plano |
|---|---:|---:|
| Antes: todo el vocabulario dentro del paquete | 998 KB | — |
| Vocabulario en un trozo aparte | 913 KB | 88 KB |
| Además, sin `react-native-reanimated` en web | **793 KB** | 88 KB |

**−205 KB (−20.5 %) en lo que se baja al abrir.** El trozo de 88 KB se pide 2.5 s después de abrir (o al entrar a captura,
a la búsqueda de categoría o al chat). El service worker (`public/sw.js`) guarda en caché los archivos JS que se bajan y los
sirve de ahí la próxima vez (el nombre del trozo cambia en cada versión, así que no hay riesgo de quedarse con uno viejo);
**no se probó sin conexión.**

### Cómo se comporta

- `loadExtendedCatalog()` baja el trozo una sola vez (varias llamadas comparten la misma descarga); si falla, la próxima
  vez reintenta. `whenCatalogReady()` espera con tope (captura 2.5 s, chat 1.5 s) y, si no llega, **se sigue con el
  núcleo**: nunca se bloquea registrar un gasto por esperar el vocabulario.
- Con solo el núcleo el motor sigue entendiendo lo cotidiano (golden de regresión: 99.0 %, 1,081 de 1,092), pero en temas nuevos baja de
  10 a 20 puntos (en las 122 frases de Fresco 5: 79.5 % solo con núcleo; el número exacto contra el catálogo completo no se
  puede dar porque ese conjunto ya se usó para corregir). **Por eso la captura espera un poco al catálogo completo.**
- `installKeywordPacks(paquetes, versión)` es **seguro entre versiones**: un id de subcategoría que esta versión de la
  app no conoce se **ignora** (un paquete más nuevo que la app no la rompe), instalar dos veces la misma versión no
  cambia nada, y el índice del motor se reconstruye solo por *revisión* siguiendo con el anterior mientras tanto.
- Se comprobó que el orden de desempate no cambió: la foto de las respuestas del motor (`snapshot.cjs`) quedó **idéntica**
  antes y después.
- En la app **nativa** (iOS/Android) el trozo viaja dentro del mismo paquete y solo se evalúa al pedirlo: el beneficio de
  «bajar aparte» es de la versión web/PWA.

### Qué NO se hizo, y por qué

- **Un servidor que clasifique los gastos.** Obligaría a mandar el texto de cada gasto a un servidor: rompe la promesa
  «sin mandarla a ningún proveedor» y la idea de motor local. No se recomienda.
- **«Proteger» el vocabulario.** Lo que la app usa en el teléfono, el teléfono lo tiene: no se puede esconder, y tampoco es
  información sensible (son palabras como «tacos» o «predial»). Lo sensible es **lo aprendido de cada persona**, y eso sí
  está protegido (RLS por usuario, ver §4).
- **Catálogo remoto con versión (capa 3).** Diseño propuesto: un bucket público de Supabase Storage con un
  `manifest.json` (`{ version, minAppVersion, packs: [{ name, url, sha256 }] }`); la app compara versión, baja lo nuevo,
  verifica el hash y lo instala con `installKeywordPacks` (que ya es seguro entre versiones). **No se construyó** porque
  necesita un bucket y una decisión tuya, y en la web un despliegue de Vercel ya actualiza el vocabulario en minutos; el
  beneficio real aparece con las apps de tienda (P5). Está en [[06-pendientes]].

### De dónde sale el resto del peso (atribución por mapa de fuentes, antes de quitar reanimated)

| Paquete | Crudo | ≈ gzip | % |
|---|---:|---:|---:|
| `react-native-reanimated` | 695 KB | 174 KB | 21.9 % — **quitado en web** |
| `expo-router` | 430 KB | 107 KB | 13.5 % |
| `react-native-web` | 292 KB | 73 KB | 9.2 % |
| `react-native-gesture-handler` | 273 KB | 68 KB | 8.6 % |
| Código propio (`app/`, componentes, datos, IA, utilidades…) | ≈ 676 KB | ≈ 169 KB | ≈ 21 % |
| `react-dom` | 175 KB | 44 KB | 5.5 % |
| `@supabase/*` (solo los 4 mayores) | ≈ 207 KB | ≈ 52 KB | ≈ 6.5 % |

`reanimated` entraba al paquete solo porque `gesture-handler` lo pide como **opcional**; la app no lo usa en ninguna
pantalla ni gesto (los gestos son `PanResponder` de React Native). `metro.config.js` lo declara inexistente **solo en web**
(iOS/Android no cambian). Se verificó en Chromium real, antes y después: las 20 pantallas, captura con fechas, chat con
planes, «mantener para confirmar», aclaraciones y el deslizar entre secciones con eventos táctiles. **Para revertirlo:
borrar `metro.config.js`.** La siguiente palanca grande (sin hacer): cargar cada pantalla solo cuando se abre (rutas
asíncronas de Expo Router); el código propio pesa ≈ 169 KB comprimido.

**Vigilancia:** `npm run size` imprime el peso por trozo y **falla** si pasa de su presupuesto (inicial 850 KB, ampliado
130 KB, otros 150 KB). Corre en cada subida a GitHub.

## 2. Planificador multi-acción (contratos §1–§5 de `docs/03_fase2_contratos_v1.md`)

### Qué hace (ejemplos reales de las pruebas)

| Escribes | Propone |
|---|---|
| «transfiere 500 de BBVA a Nu y aporta 300 a mi meta Viaje» | Plan de 2 pasos: transferencia + aporte; muestra BBVA $5,000 → $4,500, Nu $1,200 → $1,700, Viaje $3,000 → $3,300 |
| «registra 200 de tacos ayer en BBVA y transfiere 500 de BBVA a Nu» | Plan: gasto categorizado (Comida rápida) con fecha de ayer + transferencia |
| «registra 90 de café y transfiere 500 de BBVA a Nu» | Pregunta «¿En qué cuenta? (tienes: …)» y, al contestar, arma el plan **con el orden original** |
| «retira 5000 de mi meta Viaje» (tiene 3,000) | Pregunta cuánto retirar; no inventa |
| «Banorte vence el 25 y Coppel vence el 28» | Plan de 2 vencimientos, cada fecha con su deuda |
| «cuánto gasté en comida» | Nada (lo contesta el copiloto de lectura, como siempre) |

### Reglas

- **Cada paso se resuelve y valida por separado** con los mismos resolvers de siempre (por nombre contra datos reales, nunca
  un id que «diga» el modelo); el texto de cada paso lo arma el código, nunca un modelo. Un plan **nunca** lleva un paso a
  medio resolver.
- **Se parte solo donde empieza otra instrucción** (un verbo de acción, «luego», «además», `;`, salto de línea, o un día
  dicho antes del verbo): «Ahorros y Metas» no se parte. Si el corte no da pasos válidos, se vuelve al mensaje completo.
  Máximo 6 pasos por mensaje.
- Un mensaje con **un solo paso sigue el camino de siempre** (con las mejoras de más abajo: preguntar el dato que falta,
  las acciones nuevas y los avisos).
- Un trozo que **no se reconoce** como instrucción **no entra** al plan y se avisa («No entendí esto y no lo incluí: …»);
  con dos o más pasos buenos se propone lo bueno. Un trozo que sí se reconoce pero **no es válido** (por ejemplo,
  transferir a la misma cuenta) hace que se explique qué falló **sin proponer un plan incompleto**.
- Respaldo: si el mensaje entero no se entiende, se prueba partirlo en cada «y» y se acepta **solo si los dos lados son
  acciones completas** («Banorte vence el 25 y Coppel vence el 28»).
- Un gasto suelto («gasté 200 en tacos») dentro de un mensaje de varios pasos se reconoce solo si trae un verbo de registro
  (gasté, pagué, compré, registra…). **Solo** en mensajes de varios pasos: un gasto suelto en el chat sigue sin ser acción
  (eso es la captura); ver «Decisiones abiertas».

### Aclaraciones (§2)

Cuando falta un dato que se contesta en una frase, el resolver devuelve **qué falta y el candidato a medio armar**
(`MissingField` con su `slot`: monto, cuenta, meta, deuda, categoría, nombre, fecha). La respuesta se aplica sobre **esa
misma acción** y se reintenta el mismo resolver: no se reinicia nada ni se repite todo. Una respuesta corta que no sirvió
(un nombre mal escrito) se **vuelve a preguntar**; una respuesta larga o de otro tema se trata como **mensaje nuevo**;
«cancela / mejor no» cierra la pregunta sin aplicar nada. El estado (`abierta / contestada / superada`) se guarda en el
mensaje del chat.

### Vista previa y avisos (§4)

Se calcula **sobre una copia**, en orden, y no escribe nada hasta confirmar: cuentas (con el mismo libro contable de la
app), aportes y retiros de metas, saldos de deudas. Avisos: una cuenta que **no** sea tarjeta de crédito que quedaría en
negativo (y después de qué paso), una meta que quedaría en negativo y pasos idénticos.

### Ejecutor (§5)

1. Un plan que no esté en `proposed` se **rechaza** (doble toque, reintento, dos pestañas). La verdad la tiene **el estado
   guardado**, no el objeto que tenga la pantalla (se probó con una copia vieja).
2. Se marca `applying` y **se guarda antes del primer paso**, así un segundo intento ya lo ve.
3. Se aplica **en orden**, un paso a la vez, guardando el progreso después de cada uno.
4. Si un paso falla: **no se revierte** lo ya aplicado (deshacer algo sincronizado es más riesgoso que dejarlo) y **no se
   siguen aplicando** los siguientes (podrían depender de él). El plan queda `partially_applied` (o `failed` si nada se
   aplicó) con el detalle de cada paso (`aplicado / falló / omitido`). Nunca se reintenta solo.
5. Cada paso aplicado deja una entrada en la bitácora de auditoría con el id del plan y el número de paso
   (`Chat IA · plan 1a2b3c4d · paso 2: …`). Cada paso **vuelve a validar contra lo que existe AHORA** (la propuesta pudo
   armarse hace rato: una cuenta borrada, una meta que ya no alcanza).
6. Si la app se cierra a la mitad, al reabrir el plan se **cierra con lo que de verdad se alcanzó** a aplicar. Límite
   conocido: si el cierre cae justo entre aplicar un paso y guardarlo, ese paso puede quedar como «omitido» aunque se haya
   aplicado (no hay forma de saberlo).

### Acciones del chat (17 tipos, catálogo cerrado)

Las 14 de siempre más **`withdraw_from_goal`** (retirar de una meta; no deja retirar más de lo que tiene, ni al proponer ni
al aplicar), **`update_goal_date`** (fecha objetivo) y **`update_liability_due_date`** (vencimiento). `add_transaction` y
`add_goal` aceptan fecha: un movimiento real solo puede ser de **hoy o de un día pasado** (no del futuro, ni de hace más de
5 años) y una fecha objetivo o vencimiento, de hoy en adelante.

### Reconocimiento local: errores de siempre que se corrigieron

«la» se comía el inicio de «Laptop» (quedaba «ptop»), el nombre de una meta o deuda arrastraba el monto y la fecha
(«Laptop de 20000 para el 15 de diciembre»), «retira/saca X de mi meta» se enrutaba como ajuste de una cuenta, «crea una
meta de ahorro llamada Casa» tomaba «ahorro llamada Casa», «cambia el vencimiento … al 25 de octubre» leía un saldo de 25.
Ahora las fechas se recortan antes de sacar montos y nombres, y las metas y deudas **existentes** se buscan por su nombre
en el texto. También entienden «pásale», «transfiérele» y el orden inverso «a Nu desde BBVA».

### Con una IA conectada (BYOK)

El modelo puede proponer **hasta 6 acciones** (`actions`), y **todas pasan por el mismo catálogo** que las reglas locales:
nada llega al plan sin validar. El contexto trae `fecha_de_hoy`, fecha objetivo de metas y vencimiento de deudas. Contestar
una pregunta pendiente se resuelve localmente (sin gastar cuota del modelo).

### Límites conocidos

- **Un paso que se refiere a algo creado por un paso anterior del mismo mensaje** («crea la meta Cámara y aporta 500 a
  Cámara») pide aclaración, porque la meta aún no existe. Requiere ids virtuales dentro del plan (P3).
- **Pagar una deuda** (operación #46 de la auditoría) aún no es una acción: hoy solo se puede cambiar el saldo.
- Las fechas de un plan se interpretan con el día del dispositivo.
- Probado en navegador real y con el store real, **no en un teléfono**.

## 3. Fechas, horas y periodos en español (`src/ai/dates.ts`)

Pura y determinista (recibe `now`; las pruebas no dependen del calendario real).

| Tipo | Entiende |
|---|---|
| Relativas | hoy, ayer, antier, anoche, mañana, pasado mañana, hace 3 días / dos semanas / un mes / un par de días, en 3 días, la semana pasada |
| Días de la semana | el viernes, el lunes pasado, el próximo martes, el siguiente miércoles, el martes de la semana pasada |
| Con mes | el 15 de marzo, 15 de marzo del 2025, quince de marzo, 3 oct, el 3 de oct 2026, el primero de septiembre |
| Numéricas (día/mes, como en México) | 15/03, 15/03/2026, 15-03-26, 2026-03-15 |
| Solo el día | el día 5, el 20, el primero |
| Horas | a las 5 pm, 17:30, a las 8 de la noche, a las 9 y media, a las 5 menos cuarto, a las cinco de la tarde, al mediodía |
| Periodos | este mes, el mes pasado, esta quincena, la quincena pasada, la próxima semana, este año, en diciembre, en 2027 |

- **`prefer: 'past' | 'future' | 'auto'`** resuelve lo ambiguo («el viernes» al registrar un gasto es el pasado; para
  una meta, el próximo).
- **No inventa**: sin fecha clara devuelve `null`. **No son fechas**: «de lunes a viernes», «todos los lunes», «el 5 de cada
  mes» (recurrente), «a 3 meses sin intereses», «1/2 kilo», «por la mañana», «15 pesos».
- En la **captura** (`parseCaptureText`) las fechas y horas se recortan **antes** de buscar monto, tipo y categoría («el 20
  de octubre pagué 15 de estacionamiento» ya no lee 20) y el movimiento se guarda **en el día dicho** («· ayer» en la
  confirmación). Un día futuro se conserva en `futureDate` pero **no** se usa como fecha del movimiento (el «previsto» es de
  P3). Una corrección: un número de 4 cifras pegado a una fecha («el 28 de septiembre 4998 de la renta») es el monto, no el
  año; la prueba de robustez lo encontró.
- Los meses y días de la semana ya **no se aprenden** como palabras de categoría.

## 4. Lo aprendido, sincronizado con la cuenta

- **Tabla `category_mappings`** (migración `0022_category_mappings.sql`): un renglón por palabra por persona
  (`user_id + keyword`), con RLS (solo el dueño ve y escribe), `updated_at` fijado por el servidor y borrado suave para que
  un «olvidar» llegue a los demás dispositivos. Borrar la cuenta la arrastra (`on delete cascade`).
- **Qué viaja:** solo la **palabra** y la **categoría** que elegiste. Nunca la frase completa ni los montos.
- **Cómo se sincroniza:** con la misma cola de siempre. Aprender, olvidar y el tope de 50 palabras encolan su cambio; las
  palabras que ya existían antes se encolan **una sola vez** al abrir. Gana la corrección **más reciente** por palabra; un
  borrado viejo no quita algo que se volvió a aprender después.
- **Tabla opcional en el motor de sincronización:** si la migración aún no se corrió (o la red falla), **no frena** la
  sincronización de cuentas, movimientos, etc.; los cambios esperan en la cola, sin perderse. Es una tabla chica, así que se
  trae completa en cada ciclo.
- **Honestidad con la persona:** la pantalla *Privacidad y datos* decía «vive solo en este dispositivo, no se sincroniza a
  la nube todavía»; ahora dice la verdad según haya o no cuenta en la nube. Y la **exportación de datos** ahora incluye
  también lo aprendido, el plan de gastos completo (plantillas, partidas, asignaciones, excepciones) y el historial del
  chat, que antes no salían.

## 5. Pruebas, puertas de calidad y cifras honestas

`npm test` (≈ 11 s) corre todo; `npm run typecheck` revisa tipos. GitHub Actions (`Revisión automática`) corre las dos
cosas y `npm run size` en cada subida.

| Prueba | Qué cubre | Resultado |
|---|---|---|
| `run-golden.cjs --min 100` | 1,092 casos de regresión (incluye 45 de fechas dentro de capturas) | 100 % (ya contaminado: solo detecta regresiones) |
| `catalogo.cjs` | el catálogo en segundo plano (núcleo → ampliado, versiones, ids desconocidos) | 10 comprobaciones |
| `planes.cjs` | planificador, aclaraciones, vista previa, acciones nuevas | 46 |
| `ejecutor.cjs` | ejecutor puro **y con el store real**: idempotencia, fallo a la mitad, auditoría, recuperación | 23 |
| `sync-mapeo.cjs` | mezcla, cola y motor de sincronización con servidor falso (con y sin la tabla) | 17 |
| `run-fechas.cjs` | fechas, horas y periodos | 172 |
| `audit-budget.cjs` | todas las subcategorías con concepto de presupuesto | 14 categorías · 178 subcategorías |
| `robustez.cjs` | 26,448 variantes con ruido (incluye fechas y horas): no deben cambiar categoría **ni monto** | 0 cambios |
| `smoke-web.cjs` | 20 pantallas + deslizar entre secciones en Chromium real | sin errores |

**Cifras que se pueden creer** (conjuntos sellados, escritos *antes* de corregir y corridos **una sola vez**):

| Conjunto | Primera corrida | Detalle |
|---|---:|---|
| Fechas, horas y periodos (113 casos) | **93.8 %** (106/113) | fallaron 2 fechas, 3 horas y 2 periodos |
| Planificador del chat (55 frases) | **87.3 %** (48/55) | una acción 26/29 · no-acciones 4/4 · aclaraciones 7/7 · planes 11/15 |
| Monto correcto en capturas con fecha (45) | 42/45 → **45/45** | el motor anterior leía el día o la hora como monto |

Tras ver las fallas se corrigieron (fechas 113/113; planificador 54/55): **esas cifras ya no miden nada**. La única falla
restante del planificador es el límite conocido de arriba. Salidas originales guardadas en
`scripts/golden/sealed-fechas-2026-10-03.txt` y `sealed-planes-2026-10-03.txt`.

**Probado en navegador real (Chromium) con la app compilada:** captura escrita con dos fechas, plan de dos pasos,
«mantener para confirmar» (saldos, meta y bitácora correctos), pregunta de cuenta y su respuesta. **No probado:** teléfono
real (iOS/Android), red lenta, ni el flujo con una IA conectada de verdad.

## 6. Decisiones abiertas (tuyas)

1. **¿El chat debe registrar un gasto suelto?** Hoy «gasté 200 en tacos» en el chat lo contesta el copiloto (para registrar
   gastos está la captura). Dentro de un mensaje de varios pasos sí se reconoce. Unificarlos evitaría tener dos caminos,
   pero riesgo: «¿puedo gastar 500 en un viaje?» no debe volverse un gasto (hoy se evita exigiendo un verbo de registro).
2. **Catálogo remoto con versión** (capa 3): ¿se construye ya o cuando lleguen las tiendas (P5)?
3. **Protección de rama** en GitHub: exigir que la revisión automática pase antes de unir a la rama principal.

## 7. Prerrequisitos de P3 (previsto, recurrencia, avisos, deudas e inversiones) — estado

| Tema | Estado |
|---|---|
| Catálogo en segundo plano y seguro entre versiones | ✅ |
| Capa personal por usuario, sincronizada | ✅ código · ⏳ correr 0022 en Supabase |
| Fechas, horas y periodos (base del «previsto», la recurrencia y los avisos) | ✅ |
| Planificador, aclaraciones y ejecutor idempotente con auditoría | ✅ |
| Revisión automática, presupuestos de peso y prueba de humo | ✅ |
| Pasos que dependen de lo creado en el mismo mensaje (ids virtuales en el plan) | ⏳ P3 |
| Acción «pagar deuda» (mueve dinero de una cuenta y baja la deuda en un solo plan) | ⏳ P3 |
| Reglas de recurrencia («el 5 de cada mes», «cada quincena») | ⏳ P3 (hoy se detectan para NO tomarlas por fecha) |
| Medir en teléfono real: arranque del índice, descarga del trozo ampliado, gestos | ⏳ P5 |

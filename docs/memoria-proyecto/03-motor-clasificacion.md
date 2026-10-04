# Motor de clasificación (registro por voz/texto)

Ver también: [[README|Índice]] · [[02-catalogo-categorias|Catálogo de categorías]] · [[01-arquitectura|Arquitectura]]

Código: `src/ai/localParser.ts`. Esto es lo que clasifica "65 pesos de
café" → monto 65, categoría Comida y bebidas → Café, **sin necesitar
ningún proveedor de IA conectado** — funciona siempre, incluso sin
internet. Si la persona sí conectó su propia IA (Claude/ChatGPT/Gemini/
Grok), ese proveedor hace la interpretación principal
(`LLMAIInterpreterProvider`) y este motor local queda como respaldo si la
respuesta de la IA no es válida.

## Pipeline (orden en que se resuelve una frase)

1. **Mapeo personal** (`applyCustomMapping`) — si la persona ya corrigió antes una categoría para una palabra parecida, se usa directo. Tiene prioridad sobre todo lo demás, incluida la IA conectada. Ver la sección "Memoria de correcciones" abajo.
2. **Comercios conocidos** (`KNOWN_MERCHANTS`) — Starbucks, Uber, DiDi, Netflix, Spotify → categoría fija.
3. **Desambiguación de "gas"** (`disambiguateGas`) — ver abajo.
4. **Catálogo por palabra clave** — recorre `DEFAULT_CATEGORIES`, la palabra clave más larga que calce gana (para que "barbacoa" no se confunda con la subcadena "bar").
5. **Corrección difusa** (`fuzzyMatchCategory` y `fuzzyPhraseMatch`) — solo si el paso 4 no encontró nada. Ver abajo.
6. **Valor por tipo** — un ingreso sin más pistas es «Ingresos › Otros», un ahorro «Ahorro › Otros», una compra de inversión «Inversiones › Otros» (el tipo ya dice la familia).
7. Si nada calzó en un gasto: se pide la categoría a la persona (nunca se inventa).

Actualización 2026-10-03 (P1): el paso 4 ahora **respeta el tipo** del movimiento (un gasto
nunca cae en una categoría de ingreso y viceversa), y las palabras genéricas
(`WEAK_KEYWORDS`: «compré», «pago», «servicio», «pasaje», «suscripción», «membresía», «ingreso»…)
valen 1 punto: solo ganan si no hay nada más específico. Así «mi suscripción de chatgpt» cae en
Software y «pasaje en micro» en Microbús, no en la palabra genérica.

## Extracción del monto (`extractAmount`)

Acepta dígitos (`50`, `$1,500`) **y números dictados en palabras**,
incluyendo compuestos: "cincuenta y cinco" = 55, "ciento veinte" = 120,
"mil quinientos" = 1500 (antes de 2026-09-02 solo reconocía una palabra
suelta, así que "cincuenta y cinco pesos" se leía como 50).

Cuando la frase trae más de un número (ej. "medio kilo de huevo por
cuarenta pesos" trae la cantidad del kilo y el precio), se prefiere el
número que está pegado a una palabra de moneda ("pesos", "dólares") sobre
cualquier otro — así no se confunde una cantidad de otra cosa con el
monto real.

`"un"/"uno"/"una"` sueltos casi siempre son un artículo ("un café"), no
una cantidad — solo cuentan como monto si están pegados a una palabra de
moneda ("un peso").

`splitCaptureSegments` (separa "varios movimientos dictados de golpe")
tiene cuidado de **no cortar en medio de un número compuesto** — "cincuenta
y cinco pesos de tortillas y quince de café" se separa correctamente en
esas dos frases, no en tres.

## Corrección difusa (typos de dictado/tecleo)

Distancia de edición (Levenshtein) como último recurso. **Desde 2026-10-03 la
palabra clave del catálogo debe tener 7 letras o más** (antes 6): con el catálogo ampliado, 6
letras producía falsos positivos reales («deposité»→depósito, «pasada»→posada,
«comisión»→comunión). Tolerancia: 1 error si la palabra clave mide ≤10 letras, 2 si mide más.
Consecuencia aceptada y medida: typos de 6 letras («telmes», «pasage», «lentez») ya no se
corrigen y se piden a la persona (3 «límites conocidos» del golden set). También corrige frases
de varias palabras (`fuzzyPhraseMatch`). Ejemplos reales
verificados: "totillas"→tortillas, "aguakate"→aguacate,
"mcrobus"→microbús.

## Coincidencia por límite de palabra (bug corregido 2026-09-02)

Antes, el catálogo comparaba con `texto.includes(palabraClave)` —
subcadena cruda. Esto causaba falsos positivos reales: **"cuarenta"**
(el número) contiene literalmente "renta" adentro, así que cualquier
monto con "cuarenta" se clasificaba como Alojamiento → Renta; **"aguakate"**
contiene "agua" adentro, así que se clasificaba como Alojamiento → Agua
en vez de intentar la corrección difusa hacia "aguacate". Se corrigió
exigiendo que la palabra clave calce como palabra completa
(`containsKeywordAsWord`, con límites `\b` de regex), no como fragmento.

## Desambiguación de "gas"

"gas" a secas está en las palabras clave tanto de Transporte → Gasolina
como de Alojamiento → Gas. `disambiguateGas` usa el resto de la frase
para decidir: palabras de coche (magna, premium, diesel, gasolinera,
coche, carro, auto, camioneta, litros) → Gasolina; palabras de casa (lp,
cilindro, natural, naturgy, casa, estufa, boiler, calentador) → Gas de
casa. Si no hay ninguna pista, sigue el flujo normal de catálogo.

## Memoria de correcciones (mapeo personal)

Cuando el motor no logra clasificar algo y la persona elige la categoría
a mano (pantalla "¿En qué categoría?"), VALU guarda las palabras "con
contenido" de esa frase (`extractLearnableKeywords` — quita números,
moneda y conectores comunes como "para", "esta", "compré") apuntando a
esa categoría (`learnCategoryMapping`, en el store). La próxima vez que
cualquiera de esas palabras aparezca, se usa esa categoría directo, sin
volver a preguntar — con prioridad sobre el catálogo y sobre cualquier
proveedor de IA conectado.

- Vive en `customCategoryMappings` dentro del store de Zustand, persistido igual que el resto del estado (AsyncStorage/localStorage).
- **Viaja con la cuenta** (desde 2026-10-04, tabla `category_mappings`, migración 0022): se sincroniza en segundo plano, solo la palabra y la categoría (nunca la frase ni los montos), protegido para que solo la persona dueña lo vea. Si la migración aún no se corrió, se queda en el dispositivo y espera en la cola. Ver [[09-p2-planificador-fechas-y-catalogo-en-segundo-plano]].
- La persona puede ver cuántas palabras aprendió y borrarlas todas desde Ajustes → Privacidad y datos → "Lo que VALU aprendió de ti".
- Solo aplica a **gastos** (`type === 'expense'`) — no interfiere con la detección de ingresos/ahorro/inversión.

## Qué se evaluó y NO se implementó (y por qué)

Un JSON con instrucciones de "arquitectura de IA v7" propuesto por el
usuario el 2026-09-02 pedía además:

- **Búsqueda con `pg_trgm` / vectorial en la base de datos**: el catálogo de categorías es un archivo estático en el código (`categories.ts`), no vive en Supabase — meter una extensión de Postgres y un endpoint de búsqueda para esto abriría superficie de ataque nueva sin ninguna ganancia real. Se implementó el equivalente en TypeScript, dentro de la app.
- **Reglas de horario nocturno para "antojos"**: se revisaron y no resuelven ninguna ambigüedad real (esas palabras clave ya apuntan a una sola subcategoría sin conflicto), así que no se agregó complejidad sin beneficio.
- **Verbos como "metí"/"guardé" como disparadores genéricos de Inversión**: son demasiado ambiguos solos ("metí gol", "metí la pata") y ya se usan con mejor contexto para detectar Ahorro — agregarlos sueltos habría creado clasificaciones nuevas incorrectas.


## Montos: decimales, miles y abreviaturas (2026-10-03)

`extractAmount` ahora entiende `$1,500.50`, `1.500,50`, «5 mil», «2 mil 500», «15 lucas», «3k».
Con **varios números** en la frase: si hay uno solo, ese; si hay uno junto a una palabra de moneda,
ese; si no, el mayor (los «2 kilos», «3 tacos» suelen ser cantidades chicas y el precio el mayor).
La moneda reconoce «dólares», «usd», «u$d», «dlls», «dls».

## Ajuste de saldo y separación de varios movimientos

`detectAccountAdjustment` ya no necesita dígitos para sacar el nombre de la cuenta («agrégale a
mi cuenta de ahorro»), y distingue «me depositaron» (ingreso) de «deposité a la cuenta» (ajuste).
`splitCaptureSegments` corta por «y», comas, «luego», «además», saltos de línea, sin partir números
compuestos.

## Catálogo ampliado y cómo se mide (P1 y P1b, 2026-10-03)

### Tamaño real (medido, no estimado)

| | P1 (mañana) | P1b (tarde) |
|---|---:|---:|
| Palabras clave en el catálogo | ≈ 3,100 | **≈ 18,900** (17,900 únicas) |
| Entradas del índice (con plural/singular automático) | ≈ 6,000 | **≈ 33,700** |
| Peso del código de datos | ≈ 45 KB | ≈ 385 KB (**106 KB** comprimido) |
| Tiempo por frase | 1.4 ms | **0.1 ms** |
| Armado del índice (una vez) | 30 ms | ≈ 200–300 ms, **repartido en trozos de ≤13 ms** |

Esas ≈ 18,900 son el resultado de **escribir ≈ 23,000 y quitar las que no aportaban** (ver «poda» abajo).

### Dónde vive cada cosa

- `src/data/categories.ts` — categorías, subcategorías y sus palabras base.
- `src/data/keywordPacks/*.ts` — un archivo por **área de la vida financiera**: `pareja` (roomies, amigos, gastos
  compartidos), `bancos` (tarjetas, intereses, comisiones, remesas, crédito a plazos), `impuestos` (SAT, predial, tenencia,
  multas, trámites, abogados, contador), `hogar`, `comida`, `transporte`, `salud`, `familia` (hijos, mascotas, regalos,
  bodas, funerales, donaciones), `ocio` (viajes, apuestas, tecnología, software), `trabajo` (escuela, cursos, negocio),
  `dinero` (ingresos, ahorro, inversión, transferencias), `compras`, `complementos` y `base`.
  `index.ts` los mezcla; **el orden desempata** cuando una palabra está en dos subcategorías.
- `protegidas.ts` — frases «desempatadoras» a mano; la poda nunca las toca.
- `src/data/conceptLexicon.ts` + `src/ai/concepts.ts` — **modalidades** del movimiento (`detectConcepts`): repartido
  entre varios, me deben / le debo, liquidación entre personas, recurrente, a plazos/MSI, deducible, reembolsable,
  otra moneda, previsto. Hoy ninguna pantalla lo usa: es el enganche para P2/P3.

Agregar un área nueva (p. ej. «mascotas exóticas» o «criptos»): crear `keywordPacks/<area>.ts`, sumarlo a `index.ts`,
y correr las herramientas de abajo.

### Cómo se evita el relleno (la parte que más importa)

Una lista de 20 mil palabras escrita a mano es fácil de inflar con variantes («pago de X», «abono a X», «mi X»…) que no
cambian ninguna respuesta. `scripts/golden/packs.cjs` lo controla:

1. **`format`** — quita repetidas y las palabras ambiguas sueltas (`sol`, `mango`, `cuartos`, `fiesta`, `oficina`…: significan
   otra cosa en el habla diaria; la marca solo entra acompañada: «cerveza sol»).
2. **`resolve`** — cuando una palabra está en dos subcategorías gana la **nueva** si se creó para eso (ej. «predial» → Predial y
   derechos locales, no «Mantenimiento») o, entre dos viejas, la ya existente; las decisiones a mano van en `PREFER`.
3. **`prune`** — una palabra **sobra** si el catálogo, *sin ella*, ya clasifica su mismo texto en la misma subcategoría
   (ej. «pago del predial» sobrando por «predial»). Aun así **no poda frases que contienen vocabulario de otra
   subcategoría** (son desempatadoras: «cuota anual de la tarjeta» tiene que ganarle a «tarjeta»).
4. Prueba de **robustez** (`robustez.cjs`): a cada frase que ya acierta se le agrega ruido que no cambia lo comprado («oye»,
   «con tarjeta», «a meses sin intereses», «el otro día»…) y debe seguir igual. Hoy: **13,224 pruebas, 0 cambios**.
5. **A/B real** antes de adoptar cualquier ayuda: se probó recuperar 2,500 frases desempatadoras podadas (sin ganancia →
   descartado) y una regla de «la cabeza de la frase manda» (empeoraba: 99.4% vs 100% en el set y 17 cambios en robustez →
   descartada). Consecuencia: lo que está en el código es lo que demostró servir.

### Correcciones de lógica que salieron de las pruebas (valen para cualquier tamaño de catálogo)

- **Forma de pago ≠ gasto.** «tacos con mi tarjeta 120» ya es comida (antes: «Tarjeta de crédito»); «la renta por
  transferencia» es renta (no «Entre mis cuentas»); «a meses sin intereses» y «a medias» tampoco son categoría. Solo se
  quitan cuando la coincidencia ganadora vive *dentro* de esa frase; «pagué la tarjeta de crédito» (sin «con») sigue
  siendo deuda. Si solo se entiende la forma de pago («5000 por transferencia») **se pregunta**, no se adivina.
- **Índice por palabra/frase** en vez de recorrer todas: de 4.6 ms a 0.1 ms por frase con 10 mil palabras, resultados idénticos.
- **Calentamiento en trozos** (`warmUpLocalParser`): se llama al abrir la captura y 4 s después de abrir la app.
- «Mis papás» (padres) ya no se confunde con «papas» (verdura); frases que solo nombran a una persona («a mi abuela») valen
  poco, para no tapar lo que sí dice la frase («la enfermera que cuida a mi abuela» es salud).
- Medidas no son dinero: «icloud 50 gb 17» → 17. Más verbos de ingreso («me regresó», «me devolvió», «me reembolsó»,
  beca, pensión, cashback, saldo a favor) y de inversión (centenario, onza, forex).
- Palabras genéricas como «trámite», «oaxaca» o «centro comercial» valen poco (son lugar o contexto, no el artículo).

### Golden set y resultados

- `scripts/golden/` (sin dependencias nuevas): `node scripts/golden/run-golden.cjs [--split dev|holdout|all|fresh1|fresh3|sealed|sealed2|sealed3] [--suite nombre] [--fail] [--min 100]`;
  se regenera con `node scripts/golden/build-golden.cjs`. Hoy: **1,092 casos de regresión** (incluye 63 de conceptos y 45 de
  fechas) + 5 conjuntos de frases nuevas (fresco 1–5). Todo junto: `npm test`.
- Resultados y la cifra honesta sobre frases que el motor nunca vio: [[08-golden-set-resultados]].

## Fechas, planes y catálogo en segundo plano (P2, 2026-10-03/04)

- **Fechas y horas**: `src/ai/dates.ts`. `parseCaptureText(texto, ahora)` recorta las fechas y horas dichas **antes** de
  buscar monto, tipo y categoría, y devuelve `date`/`dateIso`/`dateText` (un día pasado: el movimiento se guarda ese día) y
  `futureDate` (un día futuro, aún sin usar). El tercer paso del pipeline de arriba ya no ve «el 15 de marzo» como un monto.
- **El vocabulario se carga en dos niveles** (núcleo + ampliado en segundo plano): `src/data/catalogLoader.ts`. La captura
  espera un poco al catálogo completo y sigue sin él si tarda.
- **El chat** (`src/ai/planner.ts`) convierte un mensaje en una o varias acciones validadas, con aclaraciones, vista previa
  y ejecución segura. No usa el clasificador de categorías salvo para un gasto dentro de un mensaje de varios pasos.
- Todo el detalle, las cifras y los límites: [[09-p2-planificador-fechas-y-catalogo-en-segundo-plano]].

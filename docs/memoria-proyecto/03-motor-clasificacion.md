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
- **Solo en este dispositivo por ahora** — no se sincroniza a Supabase todavía (si se reinstala la app o se usa otro dispositivo, no viaja con la cuenta). Ver [[06-pendientes]].
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

## Catálogo ampliado y cómo se mide (P1, 2026-10-03)

- Las palabras clave base viven en `src/data/categories.ts` (≈864). Las ampliaciones
  (marcas, productos, frases tal como las dice la gente) viven en `src/data/keywordExpansion.ts`
  y se mezclan al cargar sin duplicar: **3,123 palabras clave** en total, más variantes de
  singular/plural que genera el índice automáticamente (solo cambian el número, nunca inventan
  palabras). Reglas del archivo: una palabra solo va en la subcategoría donde la persona la
  esperaría; si es ambigua, no se agrega (se prefiere preguntar).
- **Golden set** (`scripts/golden/`): 984 casos con etiqueta humana (no copiada de la salida del motor),
  divididos 70% desarrollo / 30% reserva, más 3 «límites conocidos» que no cuentan en el %.
  Cómo correrlo: `node scripts/golden/run-golden.cjs [--split dev|holdout|all|fresh1|sealed] [--suite nombre] [--fail]`;
  regenerarlo: `node scripts/golden/build-golden.cjs`. No necesita instalar nada.
- **Resultados** (ver [[08-golden-set-resultados]]): línea base 69.6% → 100% en el set original
  (**contaminado**: el vocabulario se amplió mirando esas fallas), y la cifra honesta sobre frases
  **nuevas que el motor nunca vio**: **94.9%** (set sellado, una sola corrida).

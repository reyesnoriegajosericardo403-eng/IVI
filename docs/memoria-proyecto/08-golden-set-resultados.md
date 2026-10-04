# Golden set del motor local — resultados (P1, P1b y P2)

Ver también: [[README|Índice]] · [[03-motor-clasificacion|Motor de clasificación]] · [[06-pendientes|Pendientes]]

Fecha: 2026-10-03. Código: `scripts/golden/`. Motor medido: `src/ai/localParser.ts` (el real, no una copia).

## Qué se midió

| Conjunto | Casos | Para qué sirve |
|---|---:|---|
| Original (clasificación, tipos, «gas», typos, sin categoría, montos, varios números, segmentos, ajuste de cuenta) | 984 (+3 límites conocidos) | Regresión: que lo arreglado no se rompa. **Contaminado** (ver abajo). |
| Fresco 1 (`fresco_1`) | 116 | Frases nuevas, escritas aparte del catálogo. Se usó para iterar. |
| Fresco 2 SELLADO (`fresco_2`) | 118 | Frases nuevas; se corrió **una sola vez**, sin mirarlas antes. |

Las etiquetas las puse yo a mano pensando en lo que la persona quiso decir (no se copiaron de la
salida del motor). Donde dos subcategorías son igual de razonables se aceptan ambas (`alt`).

## Resultados

| Momento | Original | Fresco 1 | Fresco 2 (sellado) |
|---|---:|---:|---:|
| Línea base (antes de tocar nada) | 69.6% | — | — |
| Solo arreglos de lógica | ≈89% | — | — |
| + catálogo ampliado (858→3,044 claves) | 100% | 92.2% (primera corrida) | — |
| + ajustes guiados por Fresco 1 | 100% | 100% | **94.9%** (112/118, corrida única) |

**La cifra que se puede creer es 94.9%** (sellado), con intervalo de confianza amplio por ser
solo 118 casos (aprox. ±4 puntos). El 100% del original no demuestra generalización: ampliar el
catálogo se hizo mirando esas mismas frases. Tras ver las 6 fallas del sellado se agregaron
sus palabras al catálogo (cabello, vino, servicio de mi coche, reparación de mi celular,
mercado, bici), así que ese conjunto ya no puede volver a usarse como medición: **para la
próxima ronda hay que escribir un Fresco 3 nuevo**. Salida original guardada en
`scripts/golden/sealed-2026-10-03.txt`.

## Qué aprendimos (patrones de falla en frases nuevas)

1. **Falta de vocabulario coloquial**: «licuado», «bici», «cabello», frases como «a mis papás».
   «papás» chocaba con «papas» (verdura): las frases largas ganan a las palabras sueltas.
2. **Palabras genéricas ganando a las específicas**: «pasaje», «suscripción». Solución: palabras débiles.
3. **Tipo ingreso sin verbo** («mi bono de productividad 4000»): se agregaron bono/ptu/finiquito.
4. Las fallas siempre son «no sé» o «categoría vecina»; solo ~0% de respuestas equivocadas con seguridad en el original.

## Límites conocidos (no se arreglan a propósito)

- Typos de 6 letras: «telmes», «pasage», «lentez» (se pide la categoría en vez de arriesgar falsos positivos).

## Cómo seguir

- Próxima medición: escribir Fresco 6 (≈120 frases nuevas, idealmente con frases reales dictadas por
  la persona en la beta de P5) y correrlo una vez (los Frescos 2, 4 y 5 ya están gastados).
- Cuando haya hardware real (P5), el mejor golden set son las correcciones reales de la gente.

---

## P1b — catálogo ampliado a ≈19 mil palabras (2026-10-03)

Antes de pasar a P2 se amplió el catálogo de ≈3 mil a **18,885 palabras clave** (17,934 únicas) cubriendo
pareja/roomies/amigos, tarjetas y bancos, impuestos y trámites, hogar, comida, transporte, salud,
familia/hijos/mascotas, ocio, trabajo/negocio, ahorro e inversión, compras y más. Se agregó una categoría
(`taxes_fees`, Impuestos y trámites) y 30 subcategorías nuevas (ver [[02-catalogo-categorias]]).

### Conjuntos nuevos

| Conjunto | Casos | Uso |
|---|---:|---|
| Fresco 1 y Fresco 3 (`fresh1`/`fresh3`) | 116 + iterables | Se usaron para afinar; ya no miden nada. |
| Fresco 4 SELLADO (`sealed2`) | 106 | Escrito **antes** de empacar el catálogo ampliado; corrida única. |
| Fresco 5 SELLADO (`sealed3`) | 122 | Escrito **después** de corregir lo que mostró Fresco 4; corrida única. |
| Conceptos | 63 | Prueba del léxico de modalidades (`detectConcepts`). Escrita por mí: no es medición independiente. |

### Cifras que se pueden creer (primera y única corrida de cada sellado)

| Conjunto | Resultado | Referencia |
|---|---:|---|
| Fresco 2 (`sealed`, P1) | **94.9%** | catálogo de 3 mil |
| Fresco 4 (`sealed2`) | **93.4%** (99/106) | misma tanda con el catálogo viejo: 89.6% (línea base previa a los paquetes) |
| Fresco 5 (`sealed3`) | **90.2%** (110/122) | misma tanda con el catálogo viejo, solo subcategorías que ya existían: 81.5% |

Lectura honesta: el catálogo grande sube **≈4 puntos** sobre el viejo en frases nuevas, no 10. Fresco 5 es
más difícil a propósito (más temas nuevos: roomies, trámites, tarjetas) y por eso baja. Intervalo de
confianza de ±5 puntos por tamaño de muestra.

### Contaminación (para no engañarse)

Después de ver las fallas de cada sellado se corrigieron, y esas correcciones hacen que hoy den 99.1%
(`sealed2`) y 100% (`sealed3`). **Esas cifras ya no miden nada**: se arreglaron mirando las respuestas.
Lo mismo vale para el 100% de 1,047 casos del golden completo. Salida original de cada corrida guardada en
`scripts/golden/sealed*-2026-10-03.txt`.

### Qué fallaba en Fresco 5 (clases, no frases sueltas)

1. **Medio de pago que se come el gasto**: «liquidé todo lo que debía en la tarjeta» caía en jugos;
   «tacos … con mi tarjeta» caía en tarjeta de crédito. Se resolvió con `stripPaymentInstruments`
   (quita «con tarjeta / efectivo / spei / a N meses / a medias» antes de clasificar).
2. **Relación sin tema** («mi novia me regresó lo del cine»): se pierde el tipo ingreso/reembolso.
3. **Frases largas que ganan a la palabra importante**: «pastel de cumpleaños» → celebración; «tacos de birria» → súper.
   Se resuelve con frases protegidas (`keywordPacks/protegidas.ts`).
4. **Palabras débiles genéricas**: «centro comercial», «quincena» (ingreso vs. «súper de la quincena»).
5. **Subcategoría de ahorro muy específica** («para la boda» → fondo de boda).

### Experimentos descartados (no se adoptaron)

- «Gana la cabeza de la frase» (head-of-phrase): bajó a 99.4% y movió 17 casos en la prueba de robustez.
- Recuperar ≈2,500 frases podadas por redundancia: sin ganancia al medir (A/B).
- Una palabra suelta de instrumento («visa», «mi tarjeta») como palabra clave: rompía «tacos con mi tarjeta».

### Rendimiento y robustez

| | |
|---|---|
| Búsqueda por frase | 0.115 ms (peor caso 0.22 ms) |
| Construcción del índice | ≈300 ms en trozos de 1,500 palabras (pausa máxima 13 ms), en segundo plano (`warmUpLocalParser`) |
| Peso | 385 KB de código fuente / 106 KB comprimido |
| Robustez (13,224 pruebas metamórficas: mayúsculas, acentos, relleno, orden) | 0 cambios de subcategoría |

### Próximo paso de medición

Escribir **Fresco 6** con frases nuevas (idealmente dictadas por personas reales en la beta de P5) y
correrlo una sola vez. Mientras no haya hardware real, el mejor golden set son las correcciones reales de la gente.

---

## P2 — fechas y planificador (2026-10-03/04)

Detalle y contexto en [[09-p2-planificador-fechas-y-catalogo-en-segundo-plano]]. Aquí solo lo que se midió.

### Conjuntos nuevos

| Conjunto | Casos | Uso |
|---|---:|---|
| Fechas, horas y periodos — DEV (`fechas.cjs`) | 172 | Se usó para construir el módulo (y recibe los casos que mostró el sellado). |
| Fechas — SELLADO (`fechas-sellado.cjs`) | 113 | Escrito después de dejar pasando el DEV, sin correrlo antes; **corrida única**. |
| Fechas dentro de una captura (`fechas-captura.cjs`, suite `fechas` del golden) | 45 | Monto, tipo, categoría y día dicho en la misma frase. Regresión. |
| Planificador — DEV (`planes.cjs`, pruebas con asserts) | 46 | Construcción y regresión. |
| Planificador — SELLADO (`planes-sellado.cjs`, `run-planes.cjs`) | 55 | Escrito después de dejar pasando el DEV; **corrida única**. |

Las etiquetas son juicio humano (lo que la persona quiso decir) y se escribieron sin copiar la salida del código. El
calendario del golden está **fijo** en sábado 2026-10-03 para que nunca dependa del día en que se corra.

### Cifras que se pueden creer (primera y única corrida)

| Conjunto | Resultado | Detalle |
|---|---:|---|
| Fechas SELLADO | **93.8 %** (106/113) | fallaron 7: «el martes de la semana pasada» y «el siguiente miércoles»; «a las 9 y media», «a las cinco de la tarde», «a las 3 y cuarto»; «el gasto del mes pasado» (leído como «este mes») y «en el 2027» |
| Planificador SELLADO | **87.3 %** (48/55) | una acción 26/29 · no son acciones 4/4 · aclaraciones 7/7 · planes 11/15. Fallas: «pásale 300 de BBVA a Nu», «transfiérele 1000 a Nu desde BBVA», «crea una meta de ahorro llamada Casa con 200000» (nombre «ahorro llamada Casa»), «Banorte vence el 25 y Coppel vence el 28», dos planes con un día dicho antes del verbo («el viernes pagué… y el sábado compré…», «ayer… y hoy…»), y el límite conocido de abajo |
| Monto correcto en 45 capturas con fecha | motor anterior 42/45 → **45/45** | el anterior leía el día o la hora como monto: «el 20 de octubre pagué 15 de estacionamiento» daba 20, «a las 16 hrs 12» daba 16 |

### Contaminación (para no engañarse)

Después de ver las fallas de cada sellado se corrigieron: fechas **113/113**, planificador **54/55**. **Esas cifras ya no
miden nada.** La única falla restante es un límite conocido: «agrega la meta Cámara de 12000 y aporta 500 a la meta
Cámara» pide aclaración porque la meta aún no existe cuando se valida el segundo paso (se arregla con ids virtuales
dentro del plan, P3). Salidas originales: `scripts/golden/sealed-fechas-2026-10-03.txt`, `sealed-planes-2026-10-03.txt`.

### Robustez

La prueba metamórfica pasó de 13,224 a **26,448** variantes: ahora también agrega fechas y horas («el viernes», «el 15 de
marzo», «hace 3 días», «a las 5 pm», «el 15/03/2026»…) y exige que no cambie **ni la categoría ni el monto**. Encontró un
error real que se corrigió: un monto de 4 cifras pegado a una fecha («el 28 de septiembre 4998 de la renta») se leía como
el año. Resultado final: 0 cambios.

### Qué falta medir

Un **Fresco 6** (frases nuevas, idealmente dictadas por personas reales en la beta de P5), y los mismos sellados de fechas
y planes con frases de otras personas. Todo esto se midió con texto escrito por mí, no con voz real en un teléfono.

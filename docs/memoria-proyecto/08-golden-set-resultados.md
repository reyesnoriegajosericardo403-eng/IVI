# Golden set del motor local — resultados (P1)

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

- Próxima medición: escribir Fresco 3 (≈120 frases nuevas, idealmente con frases reales dictadas por
  la persona en la beta de P5) y correrlo una vez.
- Cuando haya hardware real (P5), el mejor golden set son las correcciones reales de la gente.

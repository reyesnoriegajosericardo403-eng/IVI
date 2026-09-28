# Instituciones de inversión y modelos de cálculo

Ver también: [[README|Índice]] · [[01-arquitectura]]

Desde el 2026-09-28, Inversiones se organiza en tres niveles: **institución → producto → activos**.
El catálogo vive en `src/data/institutions.ts`; los cálculos en `src/utils/investmentModels.ts`;
las pantallas en `app/(tabs)/inversiones.tsx`, `app/institucion/[id]/index.tsx` y
`app/institucion/[id]/[product].tsx`.

## Instituciones del catálogo (revisado septiembre 2026)

| Institución | Productos | Modelo de cálculo |
|---|---|---|
| GBM | Trading MX, Trading USA, Smart Cash, Fondos y estrategias | bolsa (comisión escalonada + IVA), rendimiento diario, fondo |
| Nu | Cajitas 24/7, Cajita Turbo (tope $25k), Ahorro Congelado | rendimiento diario, plazo fijo |
| Actinver Trade (antes **Bursanet**, renombrada ago-2025) | Acciones BMV/SIC, Fondos Actinver | bolsa, fondo |
| Cetesdirecto | CETES, BONDDIA, Bondes F/Udibonos/Bonos M | CETES (tasa en vivo de Banxico), rendimiento diario, plazo |
| Mercado Pago | Ganancias en cuenta | rendimiento diario |
| Hey Banco | Inversión Hey (7/28 días) | plazo fijo |
| Klar | Inversión Max, Inversión a plazo | rendimiento diario, plazo fijo |
| Kuspit | Acciones, ETFs y SIC | bolsa (comisión de terceros, marcada como tal) |
| Bitso | Cripto | bolsa sin IVA (maker/taker) |
| Otras inversiones | Bolsa, Ahorro, Plazo, Cripto genéricos | — (aquí caen las posiciones registradas antes del catálogo) |

## Modelos de cálculo

- **Bolsa / fondos / cripto**: valor = títulos × precio en vivo (market-data). Comisión sugerida =
  monto × tasa del nivel (según lo invertido en esa institución) + IVA 16% si aplica. El usuario
  puede corregirla. Comprar puede pagarse con el efectivo disponible del producto; vender acredita
  el importe neto a ese efectivo y guarda la ganancia realizada.
- **Rendimiento diario** (Cajitas, Smart Cash, BONDDIA…): saldo × (1 + tasa/365)^días. Con tope
  (Cajita Turbo), sobre el excedente no se estima rendimiento. Depositar, retirar o "poner saldo
  real" re-basa la estimación desde hoy.
- **Plazo fijo** (Hey, Klar, Ahorro Congelado, bonos): interés simple, año de 360 días; se muestra
  lo acumulado a hoy y lo que recibes al vencer. Al vencer: reinvertir al mismo plazo o eliminar.
- **CETES**: precio = 10 / (1 + tasa × plazo/360); títulos = piso(monto/precio); al vencer $10 por
  título menos retención de ISR de **0.90% anual sobre el capital** (LIF 2026), proporcional al plazo.

Todo lo que no es precio de mercado se marca como **estimado, antes de impuestos**. El patrimonio
neto (`computeNetWorth`) sigue contando estas posiciones por su monto invertido — conservador a
propósito, para no mezclar estimaciones con saldos confirmados.

## Cómo mantener el catálogo "siempre actualizado"

Las tasas de ahorro cambian cada pocas semanas y no hay API pública de las instituciones:

1. Cada producto guarda `source` (URL oficial) y `asOf` (mes de revisión); la app los muestra.
2. Cada posición del usuario guarda **su propia tasa** (`annualRate`), que puede editar — el
   catálogo solo precarga el valor de referencia.
3. Las tasas de CETES sí son en vivo (Banxico, vía la función `market-data`).
4. Para actualizar: editar `referenceAnnualRate`/`rateNotes`/`commission` y su `asOf` en
   `src/data/institutions.ts`. Nunca borrar la fuente.

Pendiente de confirmar en la fuente original (la investigación solo pudo leer extractos de
búsqueda, el proxy bloqueó abrir las páginas): comisiones de Kuspit, tope de Mercado Pago, niveles
de Bitso y mínimos por operación de GBM.

## Migración 0021

`broker` guarda el id de la institución; nuevas columnas `product`, `annual_rate`, `term_days`,
`maturity_date`. Corrige además un bug real: el check de `asset_class` no incluía `'cash'`, así
que la Liquidez nunca se sincronizaba (quedaba reintentándose en la cola). Hasta correr la
migración, las columnas nuevas solo se envían si tienen valor, para no frenar la sincronización
de las posiciones de siempre.

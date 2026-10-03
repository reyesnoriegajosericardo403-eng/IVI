# Catálogo de categorías

Ver también: [[README|Índice]] · [[03-motor-clasificacion|Motor de clasificación]]

Fuente real en código: `src/data/categories.ts` (catálogo de
categorías/subcategorías) y `src/data/budgetConcepts.ts` (cómo se agrupan
en el Presupuesto). Este archivo es un espejo legible de esos dos — si se
edita el catálogo en código, esta nota se debe actualizar también.

**14 categorías, 178 subcategorías, 13 tipos de ingreso, 18 conceptos de
presupuesto** (conteo al 2026-10-03; el detalle de lo agregado ese día está en la
sección «Ampliación P1b» al final).

## Ingresos (10 subcategorías)

**Fijos** (con fecha predecible — se pregunta el día que llega): Salario, Mesada.

**Variables/eventuales** (sin fecha fija): Bonos, Inversiones (rendimiento), Dividendos, Intereses, Freelance, Regalos, Ventas, Otros.

## Gastos — 11 categorías

1. **Alojamiento y servicios** (13): Renta, Hipoteca, Seguro, Teléfono, Internet, Electricidad, Agua, Gas, Mantenimiento, Servicios, Cuota de condominio, Muebles, Electrodomésticos.
2. **Comida y bebidas** (12): Supermercado, Restaurante, Café, Alcohol, Comida rápida, Snacks, Dulces, Delivery, Otros, Mercado, Panadería, Orgánico y nutrición.
3. **Transporte** (15): Uber, DiDi, Taxi, Transporte público, Gasolina, Vuelos, Renta de coche, Estacionamiento, Peajes, Mantenimiento, Otros, Transporte escolar, Microbús, Combi, Bici o scooter compartido.
4. **Entretenimiento** (14): Cine, Conciertos, Hobbies, Videojuegos, Deportes, Boliche, Discotecas, Streaming, Suscripciones, Eventos, Vacaciones, Otros, Karaoke y bares, Parques de diversiones.
5. **Estilo de vida** (10): Regalos, Mascotas, Donaciones, Compras personales, Viajes, Experiencias, Otros, Apoyo familiar, Causas comunitarias, Celebraciones familiares.
6. **Salud** (9): Médico, Farmacia, Dentista, Salud mental, Aseo personal, Seguro médico, Otros, Óptica, Vitaminas y suplementos.
7. **Miscelánea** (8): Ropa\*, Bienestar, Cuidado personal, Compras\*, Electrónica, Otros\*, Apps y software, Almacenamiento en la nube.
8. **Deudas** (7): Tarjeta de crédito, Préstamo estudiantil, Préstamo personal, Hipoteca, Otros, Crédito automotriz, Crédito de muebles/electrodomésticos.
9. **Inversiones** (8): Acciones, ETFs, FIBRAs, CETES, Bonos, Fondos, Criptomonedas, Otros.
10. **Ahorros** (8): Fondo de emergencia, Vacaciones, Retiro, Metas, Otros ahorros, Metas a corto plazo, Metas a mediano/largo plazo, Enganche de casa.
11. **Educación y desarrollo** (4): Colegiaturas e inscripción, Materiales y papelería, Cursos y certificaciones, Otros.
12. **Transferencias** (1, agregada 2026-09-27): Entre mis cuentas — categoría propia para el tipo `'transfer'` (mover dinero entre cuentas propias, ver [[01-arquitectura]]), fuera de Presupuesto a propósito (ver nota \* abajo).

\* **Ropa, Compras y Otros de Miscelánea están marcadas a propósito como
"fuera de Presupuesto"** (`excludedFromBudget: true` en
`src/data/categories.ts`, desde 2026-09-02). Un gasto ahí se sigue
guardando normal en Movimientos, pero no suma en ninguna de las barras de
Necesidades/Deseos/Ahorro — y el registro manual precarga el toggle
"Excluir del presupuesto" solo al elegir esas tres. Ver
[[06-pendientes]] por el historial de esta decisión.

Cada subcategoría además tiene su propia lista de palabras
clave/modismos mexicanos (ej. "chela", "caguama", "misil" → Alcohol;
"pastor", "suadero", "guisado" → Comida rápida) para que el reconocimiento
por voz las detecte sin decir el nombre exacto. Esas listas viven en
`src/data/categories.ts` y no se duplican aquí por ser muy extensas.

## Cómo se agrupan los gastos en el Presupuesto

Los 15 conceptos de presupuesto (`src/data/budgetConcepts.ts`) agrupan
una o varias subcategorías reales en un solo renglón editable — nunca
renombran ni eliminan un id de categoría real, solo son una capa de
organización encima.

### Necesidades — gastos indispensables para vivir
- **Vivienda y servicios básicos** — toda "Alojamiento y servicios".
- **Alimentación y súper** — Supermercado, Restaurante, Café, Mercado, Panadería, Orgánico y nutrición, Otros (de Comida).
- **Transporte cotidiano** — toda "Transporte".
- **Salud y bienestar** — toda "Salud" + Bienestar y Cuidado personal (de Miscelánea).
- **Pagos de deudas** — toda "Deudas".
- **Educación y desarrollo** — toda "Educación y desarrollo".

### Deseos — gustos, salidas y estilo de vida
- **Salidas, ocio y antojos** — la mayoría de Entretenimiento + Alcohol/Comida rápida/Snacks/Dulces/Delivery (de Comida) + Viajes/Experiencias/Compras personales (de Estilo de vida).
- **Suscripciones, telefonía y tecnología** — Streaming/Suscripciones (Entretenimiento) + Teléfono/Internet (Alojamiento) + Electrónica/Apps y software/Almacenamiento en la nube (Miscelánea).
- **Regalos e intercambios** — Regalos (Estilo de vida).
- **Apoyo familiar** — Apoyo familiar y Celebraciones familiares (Estilo de vida).
- **Donaciones y causas sociales** — Donaciones y Causas comunitarias (Estilo de vida).

### Ahorro — ahorro e inversión
- **Metas a corto plazo** — Metas a corto plazo, Metas, Vacaciones (de Ahorros).
- **Metas a mediano/largo plazo** — Metas a mediano/largo plazo, Retiro, Enganche de casa (de Ahorros).
- **Fondo de emergencia** — Fondo de emergencia, Otros ahorros.
- **Inversiones** — toda "Inversiones".

### Sin concepto (a propósito)
Ropa, Compras y Otros (Miscelánea) — ver la nota con \* arriba. Igual toda
"Transferencias" (`transfer_own`, `excludedFromBudget: true`) — mover
dinero entre cuentas propias nunca es gasto ni ingreso real.


## Ampliación P1b (2026-10-03): áreas de finanzas personales que faltaban

Se agregaron **30 subcategorías** y **1 categoría nueva** para que cosas que toda persona paga o cobra
dejen de caer en «Otros» o de quedarse sin casa. Todas quedaron en un concepto de Presupuesto (o fuera
de él a propósito); lo verifica `node scripts/golden/audit-budget.cjs` (sin subcategorías huérfanas).

| Categoría | Subcategorías nuevas | Concepto de Presupuesto |
|---|---|---|
| **Impuestos, trámites y comisiones** (categoría nueva, ícono `receipt-outline`) | Impuestos federales (ISR, IVA) · Predial y derechos locales · Tenencia y placas · Trámites y documentos · Abogados, notario y gestoría · Contador y facturación · Multas y recargos · Seguridad social (IMSS, SAR) · Comisiones y anualidades bancarias · Cambio de divisas y envío de dinero | Necesidades › «Impuestos, trámites y comisiones» |
| Alojamiento | Personal doméstico y jardinería | Vivienda y servicios básicos |
| Miscelánea | Trabajo y negocio | Necesidades › «Trabajo y negocio» (nuevo) |
| Entretenimiento | Apuestas y sorteos | Salidas, ocio y antojos |
| Estilo de vida | Pareja y citas · Hijos y bebés · Funerales y duelo | Ocio · Necesidades › «Hijos y bebés» (nuevo) · Apoyo familiar |
| Salud | Hospital y cirugías · Cuidado en casa y adultos mayores · Equipo y aparatos médicos · Seguro de vida | Salud y bienestar |
| Deudas | Intereses y cargos por mora · Compra a plazos (BNPL) | Pagos de deudas |
| Ahorros | Apartado para impuestos · Tandas y cajas de ahorro · Ahorro para hijos | Metas corto plazo · Metas largo plazo |
| Inversiones | Oro, plata y coleccionables · Divisas y trading | Inversiones |
| Educación | Exámenes y titulación | Educación y desarrollo |
| Ingresos | Reembolsos y devoluciones · Renta cobrada · Pensión, becas y apoyos | un renglón de ingreso por cada una |

**Por qué esas y no otras.** Los ids de categoría/subcategoría son texto libre en Supabase (`category_id text`),
así que agregar no rompe datos guardados; el catálogo vive solo en el código (no se guarda por usuario).
Lo que *no* se volvió categoría: «gasto compartido» (pareja/roomies/amigos) y «me deben» — son una
**modalidad** del movimiento (cualquier categoría puede ser compartida), no un tipo de gasto. Esas
modalidades viven en `src/data/conceptLexicon.ts` (ver [[03-motor-clasificacion]]).

Dónde se ve en la app sin tocar pantallas: el selector de categoría de «Nuevo movimiento» y el
presupuesto leen `DEFAULT_CATEGORIES` y `BUDGET_CONCEPTS`, así que muestran lo nuevo solos. Pendiente
anotado en [[06-pendientes]]: el buscador de categorías compara contra TODAS las palabras clave y con
decenas de miles ya conviene ordenar por relevancia.

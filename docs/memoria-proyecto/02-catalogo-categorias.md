# Catálogo de categorías

Ver también: [[README|Índice]] · [[03-motor-clasificacion|Motor de clasificación]]

Fuente real en código: `src/data/categories.ts` (catálogo de
categorías/subcategorías) y `src/data/budgetConcepts.ts` (cómo se agrupan
en el Presupuesto). Este archivo es un espejo legible de esos dos — si se
edita el catálogo en código, esta nota se debe actualizar también.

**12 categorías, 118 subcategorías, 10 tipos de ingreso, 15 conceptos de
presupuesto.**

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
Ropa, Compras y Otros (Miscelánea) — ver la nota con \* arriba.

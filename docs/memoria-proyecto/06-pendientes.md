# Pendientes y decisiones abiertas

Ver también: [[README|Índice]]

## Motor de intenciones financieras por voz (transferencias, deudas, metas) — NO implementado

Un segundo JSON del usuario (catálogo v9, 2026-09-02) pedía que el
registro por voz entendiera verbos de dirección ("pasé X de A a B",
"le debo X a Y", "le metí X a mi meta de Z") para mover dinero entre
cuentas, crear/abonar deudas y abonar a metas directamente. Se investigó
antes de tocar código y se decidió NO implementarlo esta sesión:

- El modelo de datos ya soporta transferencias (`Transaction.type =
  'transfer'` + `toAccountId`, con la matemática de saldos ya correcta
  en `src/utils/ledger.ts`) — pero **ninguna pantalla las crea hoy**, y
  Movimientos (`app/(tabs)/movimientos.tsx`) no tiene una vista especial
  para ese tipo: mostraría "Miscelánea -$500" en vez de una
  transferencia real, aunque el saldo de las dos cuentas se mueva bien.
  Activarlo por voz sin antes construir esa vista habría creado una
  función a medias, viéndose rota aunque el dinero se calculara bien.
- Crear/abonar una deuda o abonar a una meta por voz implica acoplar DOS
  mutaciones a la vez (el pasivo/la meta + la cuenta de origen), con su
  propio diseño de validaciones — no es una extensión chica del parser.

Queda como una función completa aparte para una sesión dedicada:
detección de intención + resolución de nombres de cuentas/acreedores/
metas reales + la vista de Movimientos para transferencias.

## Sobre Obsidian y la base de datos real de la app

El 2026-09-02 se planteó usar Obsidian como "base de datos... para el
resto de usuarios" de VALU. Vale la pena dejar por escrito la respuesta,
para no repetir la confusión más adelante:

**Obsidian es una app de notas personales** — lee una carpeta de
archivos Markdown en un dispositivo (o sincronizada por iCloud/Google
Drive/Obsidian Sync entre los dispositivos de esa misma persona). No
tiene login de usuarios, no aísla los datos de una persona de los de
otra, no está pensada para recibir escrituras de una app en vivo, ni para
estar prendida 24/7 respondiendo peticiones. Usarla como backend de VALU
para varios usuarios sería un paso atrás real en seguridad — cualquiera
con acceso a esa carpeta vería los datos de todos.

**VALU ya tiene la herramienta correcta para eso: Supabase.** Cada
persona ya tiene sus propias filas protegidas por Row Level Security
(nadie más puede leer o escribir los datos de otra cuenta), con
autenticación real, pensado exactamente para ser el backend de una app
con múltiples usuarios. Ver [[01-arquitectura]] y
[[04-migraciones-supabase]]. Esto no cambia.

**Lo que sí tiene sentido, y es lo que se construyó**, es usar archivos
de texto (Markdown, en esta misma carpeta `docs/memoria-proyecto/`) como
memoria **del proyecto en sí** — decisiones, arquitectura, catálogo,
pendientes — no como memoria de los datos financieros de nadie. Esto:

- Reduce la necesidad de repetir contexto en una conversación de Claude nueva (y por lo tanto el gasto de tokens al re-explicar), porque Claude puede leer estos archivos directamente.
- Es "trazable" de verdad: cada cambio a esta documentación queda en el historial de `git`, con fecha y descripción — una base de datos con historial completo, aunque no sea una base de datos en el sentido de motor SQL.
- Cualquier app de notas que lea una carpeta de Markdown puede mostrarla bonito, con enlaces entre notas — Obsidian incluido, si la persona quiere instalarlo en su teléfono y apuntarlo a esta carpeta (por ejemplo clonando el repositorio, o con un plugin tipo "Obsidian Git" que sincroniza solo). Eso es una comodidad de lectura para el ser humano, no una pieza de la arquitectura de la app.

## Auditoría de Android — pendiente de confirmar en un dispositivo real

(2026-09-02) Se corrigieron dos problemas reportados en Android: el
service worker podía quedarse con una versión vieja de `manifest.json`/
íconos y bloquear la instalación en pantalla de inicio (cambiado a "red
primero" para esos archivos); y el micrófono fallaba en silencio porque
no se pedía permiso explícito ni se mostraba el error real. Ambos ya
están en producción, pero **no se pudieron probar en un teléfono Android
real** desde esta sesión — solo se verificó en Chromium de escritorio.
Falta que la persona vuelva a intentar instalar la app y usar el
micrófono en su teléfono (idealmente después de borrar datos del sitio o
reinstalar el acceso directo, por si quedó un service worker viejo
atorado) y reporte si ya funciona o qué mensaje de error exacto le
aparece.

## Memoria de correcciones — solo en este dispositivo

El "mapeo personal" (ver [[03-motor-clasificacion]]) vive únicamente en
el almacenamiento local del dispositivo — no viaja con la cuenta a otro
teléfono ni sobrevive a una reinstalación. Sincronizarlo a Supabase es
una mejora futura razonable (agregar una tabla nueva + repositorio +
motor de sincronización, siguiendo el mismo patrón que ya existe para
cuentas/transacciones/presupuestos), pendiente de que la persona lo pida.

## Campos de fecha del presupuesto — solo locales

`dayOfMonth`, `dayOfWeek` y `oneTimeDate` (agregados 2026-09-02 al tipo
`Budget`) todavía no tienen columna en Supabase — se guardan y usan bien
dentro de un mismo dispositivo, pero no se sincronizan entre
dispositivos todavía. Pendiente si la persona empieza a usar VALU en más
de un dispositivo/navegador.

## Resuelto — Ropa/Compras/Otros de Miscelánea sin concepto de presupuesto

Antes eran un vacío silencioso (se guardaban en Movimientos pero no
sumaban en ningún concepto, sin ninguna señal de que eso pasaba). El
2026-09-02, con instrucciones explícitas del usuario, se marcaron a
propósito como `excludedFromBudget: true` — el registro manual ahora
precarga el toggle "Excluir del presupuesto" al elegir cualquiera de las
tres. Documentado en [[02-catalogo-categorias]]. No requiere más acción,
salvo que la persona cambie de opinión y quiera meterlas a un concepto.

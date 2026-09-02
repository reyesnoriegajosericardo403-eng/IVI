# Memoria del proyecto VALU Finance AI

Esta carpeta es la "memoria externa" del proyecto: en vez de depender de un
historial de chat cada vez más largo, este es un registro escrito,
organizado y **trazable con git** (cada cambio queda en el historial de
commits, con fecha y descripción) de cómo está armado VALU, por qué se
tomó cada decisión importante, y qué sigue pendiente.

Son puros archivos de texto (Markdown) — cualquier app de notas que lea
carpetas de Markdown puede abrir esta carpeta, incluyendo
[Obsidian](https://obsidian.md). Los enlaces `[[así]]` entre notas son
sintaxis de Obsidian; en cualquier otro lector (GitHub, VS Code, etc.) se
ven como texto normal, sin romper nada.

**Qué SÍ es esto:** documentación del proyecto — arquitectura, catálogo de
datos, decisiones, bitácora, pendientes.

**Qué NO es esto:** la base de datos real de la app. Los datos financieros
de cada persona (cuentas, movimientos, presupuestos) viven en Supabase,
protegidos por Row Level Security para que cada usuario solo vea lo suyo.
Esta carpeta nunca reemplaza eso ni lo toca — ver [[06-pendientes#Sobre Obsidian y la base de datos real de la app]] para la explicación completa de por qué.

## Índice

- [[01-arquitectura|Arquitectura]] — de qué está hecho VALU y cómo encajan las piezas.
- [[02-catalogo-categorias|Catálogo de categorías]] — las 12 categorías, 118 subcategorías y 15 conceptos de presupuesto, organizados.
- [[03-motor-clasificacion|Motor de clasificación]] — cómo VALU entiende lo que dictas/escribes sin depender de un proveedor de IA.
- [[04-migraciones-supabase|Migraciones de Supabase]] — historial de la base de datos real y su estado actual.
- [[05-bitacora-cambios|Bitácora de cambios]] — qué se construyó, en orden, y por qué.
- [[06-pendientes|Pendientes y decisiones abiertas]] — lo que falta resolver o confirmar.

## Datos rápidos del proyecto

| | |
|---|---|
| Repositorio | `reyesnoriegajosericardo403-eng/IVI` |
| Rama de desarrollo | `claude/valu-finance-ai-app-rxlwyi` |
| Desplegado en | https://ivi-beta.vercel.app/ |
| Backend | Supabase (`utgwmwlqepevyzgoaato.supabase.co`) |
| Stack | Expo SDK 57 + TypeScript + Expo Router, React Native Web, solo versión web por ahora |
| Idioma de la app | Español (México) |

## Cómo usar esta memoria en una conversación nueva de Claude

Si en el futuro abres una conversación nueva (por ejemplo, para que pese
menos que ir arrastrando todo el historial de chat), puedes simplemente
decir algo como:

> "Lee la carpeta docs/memoria-proyecto antes de empezar."

y Claude puede leer estos archivos directamente del repositorio para
retomar el contexto del proyecto, en vez de depender de que le repitas
todo o de un resumen automático del chat viejo — sale más barato en
tokens y es más confiable, porque queda escrito por decisión, no
reconstruido de memoria.

Esta carpeta no se actualiza sola: consérvala al día pidiendo que se
actualice después de cambios importantes (igual que cualquier
documentación).

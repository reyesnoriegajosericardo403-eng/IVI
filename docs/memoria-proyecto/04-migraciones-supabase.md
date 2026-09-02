# Migraciones de Supabase

Ver también: [[README|Índice]] · [[06-pendientes|Pendientes]]

Proyecto real conectado: `utgwmwlqepevyzgoaato.supabase.co`. Todo el
esquema vive versionado en `supabase/migrations/` — **no hay corredor
automático de migraciones**: cada archivo se debe copiar y correr a mano
en el SQL Editor de Supabase, en orden, una sola vez.

⚠️ **Esto ya causó un problema real** (2026-09-02): se le pidió a la
persona correr la migración 0011, y falló con
`ERROR: 42703: column "excluded_account_ids" does not exist` — la
migración 0010 (que crea esa columna) nunca se había corrido en su base
real, a pesar de que 0010 usa `add column if not exists` (segura de
repetir). Conclusión: **no asumir que las migraciones anteriores ya se
corrieron** — cuando algo falla así, la corrección más segura es una
migración nueva e idempotente que revisa `information_schema.columns`
antes de decidir qué hacer (ver 0012 abajo), en vez de asumir un estado
de partida.

## Historial

| # | Qué hace |
|---|---|
| 0001 | Fundamento: perfiles, cuentas, transacciones. |
| 0002 | Presupuesto por categoría y metas financieras. |
| 0003 | Posiciones de inversión y pasivos/deudas. |
| 0004 | Historial de patrimonio neto (un snapshot por día, para tendencias). |
| 0005 | Bitácora de auditoría (cambios de saldo) + triggers automáticos del servidor. |
| 0006 | Nota libre en cada deuda. |
| 0007 | Ganancia/pérdida ya realizada al vender parte de una inversión. |
| 0008 | Cómo se calculó el monto mensual de un presupuesto (periodicidad/frecuencia/días personalizados). |
| 0009 | Respuestas de la encuesta de bienvenida (6 preguntas, una sola vez). |
| 0010 | Color y "tarjeta de transporte" en cuentas; cuenta destino de un presupuesto. Crea `excluded_account_ids` (ver el problema arriba). |
| 0011 | Intento de renombrar `excluded_account_ids` → `included_account_ids` (cuando se pasó de lista de exclusión a lista de inclusión de cuentas). **Falló en la base real** porque 0010 nunca se había corrido ahí. |
| 0012 | Corrección idempotente de 0011: revisa si existe la columna vieja (la renombra) o si no existe ninguna de las dos (la crea directo), y vuelve a asegurar el resto de columnas de 0010 con `if not exists`. Segura de correr más de una vez. |

## Estado actual del esquema (tablas principales)

`profiles`, `accounts`, `transactions`, `budgets`, `goals`,
`investments`, `liabilities`, `net_worth_snapshots`, `audit_log`,
`survey_responses`.

Campos relevantes de `budgets` hoy: `category_id`, `monthly_amount`,
`currency`, `thresholds` (attention/warning/exceeded), `periodicity`,
`frequency`, `custom_days_per_week`, `base_amount`, `target_account_id`,
`included_account_ids` (uuid[]). Los campos de fecha
(`dayOfMonth`/`dayOfWeek`/`oneTimeDate`, agregados 2026-09-02) son
**solo locales por ahora** — todavía no tienen columna en Supabase ni se
sincronizan (ver [[06-pendientes]]).

## Edge Functions

- `ai-relay` — relevo para las llamadas a Claude/ChatGPT/Gemini/Grok desde la versión web (solo esquiva CORS, no ve ni guarda contenido).
- `market-data` — precios de mercado (Yahoo Finance) y tasa CETES (Banxico), sin guardar historial del lado del servidor.

## Cómo correr una migración nueva (recordatorio para explicarle a la persona)

1. Abrir el proyecto en [supabase.com](https://supabase.com) → **SQL Editor** → **New query**.
2. Pegar el contenido completo del archivo `.sql` correspondiente.
3. Dar **Run**. Debe decir "Success. No rows returned" (o similar).
4. Si marca error, copiar el mensaje exacto — probablemente significa que un paso anterior no se corrió, no que el archivo esté mal.

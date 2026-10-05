# Migraciones de VALU Finance AI

Cada archivo en `migrations/` es una migración versionada (spec sección 72): tiene número de orden, fecha, descripción y un bloque de rollback comentado al final. Se aplican en orden numérico y nunca se editan después de haberse ejecutado en producción — un cambio nuevo siempre es un archivo nuevo.

| Archivo | Contenido |
|---|---|
| `0001_core_profiles_accounts_transactions.sql` | Perfiles de usuario, cuentas, transacciones, función de timestamps compartida |
| `0002_budgets_goals.sql` | Presupuesto por categoría y metas |
| `0003_investments_liabilities.sql` | Inversiones y deudas |
| `0004_net_worth_snapshots.sql` | Historial diario de patrimonio neto |
| `0005_audit_log.sql` | Auditoría de cambios de saldo (cliente + triggers automáticos del servidor) |

Las migraciones **0006 a 0022** están descritas una por una en `docs/memoria-proyecto/04-migraciones-supabase.md`. La más reciente, `0022_category_mappings.sql`, guarda «lo que VALU aprendió de ti» (palabra → categoría) por persona: viaja con la cuenta, solo el dueño la ve (RLS) y el borrado es suave.

## Principios aplicados (spec 69-88)

- **UUID como identificador único global** en todas las tablas — nunca fecha+monto+categoría.
- **`updated_at` gestionado por el servidor** (trigger `set_sync_timestamps`), nunca por el reloj del dispositivo — evita que un teléfono con la hora mal puesta rompa la resolución de conflictos.
- **Borrado suave (`deleted_at`)** en vez de `DELETE` real — nunca se destruye información financiera sin dejar rastro.
- **RLS (Row Level Security)** en todas las tablas: cada usuario solo puede leer/escribir sus propios datos (`auth.uid() = user_id`).
- **Auditoría de cambios de saldo** por partida doble: el cliente registra su propia entrada al editar, y un trigger del servidor la registra también por si el cliente no llegó a sincronizarla.
- **Los cálculos financieros son reproducibles**: nunca se guarda solo el resultado (ej. patrimonio neto) sin conservar también los datos base (cuentas, inversiones, pasivos) desde los que se recalculó.

## Cómo aplicarlas (cuando tengas tu proyecto Supabase)

1. Entra a tu proyecto en [supabase.com](https://supabase.com) → **SQL Editor**.
2. Abre cada archivo de `migrations/` en orden (0001, 0002, 0003...) y pega su contenido completo en el editor.
3. Pulsa "Run". Repite para el siguiente archivo.
4. Copia tu **Project URL** y tu **anon public key** (Settings → API) — la app los necesita para conectarse.

No hace falta usar la terminal ni instalar nada para este paso — todo se hace desde el navegador.

## Función `ai-agent` (el agente de IA de la app)

`functions/ai-agent/index.ts` (lógica en `functions/_shared/aiAgentHandler.ts` y `aiProviders.ts`) recibe la conversación
del agente con la sesión de la persona, la traduce al proveedor (Gemini por defecto; Claude, ChatGPT o Grok) y devuelve
la respuesta. Exige sesión, aplica una cuota diaria por persona y nunca guarda el contenido. Detalle en
`docs/memoria-proyecto/13-agente-ia.md`.

Secretos (Dashboard → Edge Functions → Secrets): **`GEMINI_API_KEY`** (obligatorio para la IA integrada); opcionales
`AI_DAILY_LIMIT`, `AI_ALLOWED_EMAILS`, `AI_MODEL`, `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY`.
Migración recomendada: `0025_ai_usage_and_budget_dates.sql`.

Se despliega sin terminal: GitHub → Actions → «Desplegar funciones de Supabase» → Run workflow → `ai-agent`
(con `--no-verify-jwt`: la función valida la sesión ella misma).

## Función `push-notify` (notificaciones al celular)

Envía avisos push reales a la PWA instalada (Android con Chrome; iPhone con iOS 16.4+ y VALU agregada a la pantalla de inicio). Requiere la migración `0020_push_notifications.sql`.

1. **Secretos** (Supabase → Edge Functions → Secrets): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:tu@correo`), `CRON_SECRET` (cualquier texto largo y aleatorio). Las llaves VAPID se generan una sola vez; si las cambias, cada teléfono tiene que volver a activar los avisos.
2. **Desplegar** — sin terminal: GitHub → Actions → «Desplegar funciones de Supabase» → Run workflow (necesita el secreto `SUPABASE_ACCESS_TOKEN`, ver `docs/memoria-proyecto/06-pendientes.md`). Con terminal (sin verificación de JWT, porque `config` y `cron` no traen sesión; las acciones de usuario validan el token por dentro):
   ```bash
   npx supabase functions deploy push-notify --no-verify-jwt
   ```
3. **Programar los recordatorios** (SQL Editor, una sola vez; cambia `<project-ref>` y `<CRON_SECRET>`):
   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;
   select cron.schedule(
     'valu-push-hourly',
     '5 * * * *',
     $$ select net.http_post(
          url := 'https://<project-ref>.supabase.co/functions/v1/push-notify',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
          body := '{"action":"cron"}'::jsonb
        ) $$
   );
   ```
   Corre cada hora (minuto 5). Cada aviso tiene una llave única en `notification_log`, así que aunque el cron corra de más nunca llega duplicado. Para quitarlo: `select cron.unschedule('valu-push-hourly');`.

Qué avisa hoy: **tus avisos y pagos recurrentes de P3** (migración 0023: hasta 3 intentos, sin reintentos de 22:00 a 6:59, nunca con montos; ver `docs/memoria-proyecto/10-p3-previsto-recurrentes-avisos-deudas.md`), pagos de deudas (3 días antes, 1 día antes y el día; entre 9:00 y 21:59 hora local) y un recordatorio diario opcional para registrar gastos (solo si ese día no hay movimientos). Nunca incluye montos.

# Migraciones de VALU Finance AI

Cada archivo en `migrations/` es una migración versionada (spec sección 72): tiene número de orden, fecha, descripción y un bloque de rollback comentado al final. Se aplican en orden numérico y nunca se editan después de haberse ejecutado en producción — un cambio nuevo siempre es un archivo nuevo.

| Archivo | Contenido |
|---|---|
| `0001_core_profiles_accounts_transactions.sql` | Perfiles de usuario, cuentas, transacciones, función de timestamps compartida |
| `0002_budgets_goals.sql` | Presupuesto por categoría y metas |
| `0003_investments_liabilities.sql` | Inversiones y deudas |
| `0004_net_worth_snapshots.sql` | Historial diario de patrimonio neto |
| `0005_audit_log.sql` | Auditoría de cambios de saldo (cliente + triggers automáticos del servidor) |

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

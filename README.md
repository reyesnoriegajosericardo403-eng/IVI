# VALU Finance AI

Copiloto financiero personal: registro de movimientos por voz/texto en segundos, patrimonio, presupuesto, inversiones y metas — sin fricción, sin tutorial.

> "Si necesitas aprender a usar la aplicación, el diseño está fallando."

## Estado actual

**Fase 1 (producto)**: app completa de usar hoy mismo — dashboard, captura rápida, patrimonio, presupuesto, inversiones, metas y copiloto IA basado en reglas, con datos guardados localmente.

**Fase 2 (arquitectura a prueba de futuro)**: el modelo de datos, el backend y la sincronización ya están construidos siguiendo los principios de compatibilidad futura y protección de datos — pensados para que la app pueda tener más usuarios algún día sin que un usuario nuevo necesite instalar nada extra ni crear cuentas en otro lado. Todo eso pasa detrás de escenas.

Nada de lo mostrado en la app es inventado: donde falta una fuente real (precios de mercado, tipo de cambio en vivo), lo dice explícitamente en vez de simular un dato.

### Incluido en la Fase 1 (producto)

- Onboarding mínimo (nombre, moneda, datos de ejemplo opcionales).
- Captura rápida por voz/texto con interpretación de lenguaje natural local (monto, categoría, comercio) — "65 pesos de café" se registra sin preguntar nada extra.
- Registro manual completo de movimientos.
- Dashboard: patrimonio neto, gasto del periodo, presupuesto vs. real, salud financiera.
- Patrimonio: activos, pasivos, cuentas, deudas, variación 1d/7d/30d/1a con gráfico histórico real (basado en snapshots diarios, nunca inventado).
- Presupuesto por categoría con estados normal/atención/advertencia/excedido.
- Inversiones: posiciones manuales (ticker, cantidad, precio promedio, monto invertido).
- Metas financieras con aportaciones y progreso visual.
- Copiloto IA (basado en reglas sobre tus datos reales — sin modelo de lenguaje todavía) que responde preguntas como "¿cuál es mi patrimonio?" o "¿en qué gasté más este mes?".
- Tema claro / oscuro / automático, identidad visual VALU (placeholder — ver nota abajo), diseño premium fintech con glassmorphism.
- Catálogo completo de categorías/subcategorías del spec.

### Incluido en la Fase 2 (arquitectura)

- **Cada registro tiene un ID único global (UUID)**, nunca fecha+monto+categoría — evita duplicados al sincronizar entre dispositivos.
- **Borrado suave**: eliminar un movimiento nunca lo destruye de verdad, solo lo marca como eliminado — se puede auditar y recuperar.
- **Auditoría de cambios de saldo**: editar el saldo de una cuenta o deuda queda registrado (antes → después), tanto desde la app como con un respaldo automático del lado del servidor.
- **Esquema de base de datos con migraciones versionadas** (`supabase/migrations/`) — cada cambio de estructura tiene número, fecha, descripción y forma de revertirse.
- **Motor de sincronización** local ↔ Supabase con cola de cambios pendientes (funciona offline) y resolución de conflictos "el cambio más reciente gana", con el servidor —no el reloj del teléfono— como autoridad del tiempo.
- **Capa de proveedores intercambiables** (`src/providers/`): IA de interpretación, copiloto, tipo de cambio, precios de mercado y voz están detrás de una interfaz común. Hoy todos usan implementaciones locales; conectar Claude, una API de precios real, etc. en el futuro no requiere tocar ninguna pantalla.
- **Autenticación real con Supabase Auth** (correo + contraseña, dentro de la propia app) con modo local automático si todavía no conectaste un proyecto de Supabase — la app nunca se rompe por falta de configuración.
- Todo pensado para que agregar Android, una app de escritorio, u otro dispositivo en el futuro reutilice exactamente el mismo backend, sin reconstruir nada ni perder el historial financiero del usuario.

### Pendiente para fases siguientes

- Conectar tu proyecto Supabase real (ver abajo) para activar sincronización en la nube.
- Reconocimiento de voz real en iPhone/iPad (hoy solo funciona en navegadores con Web Speech API, o por texto).
- Conexión a Claude (Anthropic) para lenguaje natural completo en el copiloto y la clasificación.
- Precios de mercado en vivo para inversiones (hoy se guarda el monto invertido, no el valor de mercado).
- Integración con brokers (GBM primero, solo lectura, APIs oficiales).
- Alertas inteligentes automáticas, notificaciones push, recordatorios.
- Identidad visual VALU definitiva (el símbolo "Opción 4" del usuario aún no fue compartido en esta conversación — hay un placeholder inspirado en el concepto pedido).

## Nota importante sobre integridad de datos

Ningún número de mercado (precio de acciones, tipo de cambio) se inventa nunca. El tipo de cambio usado hoy es un valor de referencia fijo y claramente etiquetado como tal — no es un dato en vivo. Los datos de demostración están siempre marcados como "MODO DEMO", nunca se sincronizan con el backend y nunca se mezclan con datos reales.

## Cómo conectar tu propio Supabase (para activar la nube)

Sin esto, la app funciona perfectamente en modo local (solo en este dispositivo). Cuando quieras activar sincronización y una cuenta real:

1. Crea una cuenta gratuita en [supabase.com](https://supabase.com) y un nuevo proyecto.
2. Entra a **SQL Editor** y pega el contenido de cada archivo de `supabase/migrations/` en orden (0001, 0002, 0003...), pulsando "Run" en cada uno. Instrucciones detalladas en `supabase/README.md`.
3. Ve a **Settings → API** y copia tu "Project URL" y tu "anon public" key.
4. Copia el archivo `.env.example` de la raíz del proyecto a `.env` y pega ahí esas dos claves.
5. Vuelve a compilar la app. Aparecerá una pantalla de inicio de sesión y, a partir de ahí, tus datos se sincronizan.

Todo esto se hace desde el navegador, sin terminal ni instalar programas. Cuando quieras, te lo hago paso a paso contigo.

## Cómo probarlo ahora mismo (sin computadora, desde el navegador)

Esta app ya se puede usar como **Web App (PWA)** desde Safari en tu iPhone/iPad, o desde cualquier navegador de escritorio. Para eso hay que publicarla en un hosting web. Los pasos recomendados (para hacer en una próxima sesión conmigo, ya que requieren que tú crees una cuenta gratuita):

1. Crear una cuenta gratuita en [Vercel](https://vercel.com) o [Netlify](https://netlify.com) (con tu correo o GitHub).
2. Conectar ese servicio a este repositorio de GitHub.
3. Configurar el comando de build: `npm install && npx expo export --platform web` y la carpeta de salida `dist`.
4. Publicar. Obtendrás una URL que puedes abrir en Safari y "Agregar a pantalla de inicio" para que se sienta como una app.

Cuando quieras, te guío paso a paso para hacerlo.

## Cómo correrlo en desarrollo (si tuvieras Node.js instalado)

```bash
npm install
npx expo start --web   # navegador
npx expo start          # muestra un código QR para abrir con la app "Expo Go" en tu teléfono
```

## Arquitectura (resumen)

- **Frontend**: Expo (React Native + React Native Web) con TypeScript, Expo Router (navegación por archivos), Zustand + AsyncStorage (estado y caché local offline-first).
- **Backend**: Supabase (Postgres con RLS, autenticación, funciones y triggers de auditoría) — ver `supabase/migrations/`.
- **Sincronización**: `src/services/sync/` — cola de cambios pendientes + fusión por "más reciente gana".
- **Capa de proveedores**: `src/providers/` — contratos intercambiables para IA, copiloto, tipo de cambio, precios de mercado y voz.
- **IA (Fase 3)**: Claude (Anthropic) se conectará implementando esos mismos contratos, sin tocar la UI.
- **Datos de mercado (Fase 4)**: API financiera legítima (precios) + API de tipo de cambio — nunca simulados.
- **Estructura**: `app/` (pantallas y navegación), `src/data/` (tipos de dominio, categorías, catálogo), `src/store/` (estado local/caché), `src/services/` (Supabase, sincronización, autenticación), `src/providers/` (proveedores intercambiables), `src/ai/` (implementaciones locales de interpretación y copiloto), `src/theme/` (sistema de diseño), `src/components/` (UI reutilizable).

## Seguridad y privacidad

En modo local, los datos viven únicamente en este dispositivo/navegador — no salen a ningún servidor. Con Supabase conectado: autenticación real, Row Level Security (cada usuario solo ve sus propios datos), cifrado en tránsito, y un registro de auditoría para cambios de saldo. Las claves de Supabase se leen desde variables de entorno, nunca se escriben en el código.

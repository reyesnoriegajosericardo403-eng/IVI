# Arquitectura

Ver también: [[README|Índice]] · [[04-migraciones-supabase|Migraciones de Supabase]] · [[03-motor-clasificacion|Motor de clasificación]]

## Qué es VALU

Copiloto financiero personal: registro de ingresos/gastos por voz o texto en
segundos, patrimonio, presupuesto, inversiones y metas. Filosofía del
producto: "si necesitas aprender a usar la aplicación, el diseño está
fallando" — cero fricción, nada de datos inventados cuando falta una
fuente real (precios de mercado, tipo de cambio).

## Stack técnico

- **Expo SDK 57** + TypeScript + **Expo Router** (navegación basada en archivos, carpeta `app/`).
- **React Native Web** — hoy la app se usa solo en su versión web (desplegada en Vercel), aunque el código es el mismo que correría en iOS/Android nativo si algún día se compila así.
- **Zustand** para el estado local (`src/store/useAppStore.ts`), persistido con **AsyncStorage** (en web, por debajo usa `localStorage` del navegador) bajo la llave `valu-app-storage`.
- **Supabase** (Postgres + Auth + Row Level Security + Edge Functions) como backend real — ver [[04-migraciones-supabase]].

## Principio: offline-first

La app funciona sin conexión. Todo se escribe primero en el store local
(Zustand/AsyncStorage) y se sigue viendo/usando sin internet — un
**service worker** (`public/sw.js`) cachea el shell de la app (HTML, JS,
íconos) para que hasta abrir la app sin conexión funcione (PWA
instalable). Cuando hay conexión, un motor de sincronización empuja los
cambios pendientes a Supabase y resuelve conflictos con la regla "el
cambio más reciente gana" (comparando `updatedAt`, con el reloj del
servidor como autoridad, nunca el del teléfono).

## Cada registro es trazable y nunca se pierde

- Todo registro sincronizable tiene `id` (UUID, nunca fecha+monto+categoría — evita duplicados), `createdAt`, `updatedAt` y `deletedAt` opcional (**borrado suave**: nada se destruye de verdad, se marca eliminado).
- Cambios de saldo quedan en una bitácora de auditoría (`audit_log`), tanto desde la app como por un trigger automático del lado del servidor.

## Capa de proveedores intercambiables (`src/providers/`)

Cinco funciones de la app están detrás de una interfaz común, para poder
cambiar la implementación sin tocar ninguna pantalla:

| Proveedor | Interfaz | Implementación local (siempre disponible) | Implementación real |
|---|---|---|---|
| Interpretación de lenguaje (voz/texto → movimiento) | `AIInterpreterProvider` | `localAIInterpreter` → usa `src/ai/localParser.ts` (reglas, sin IA) | `LLMAIInterpreterProvider` si el usuario conecta su propia clave (Claude/ChatGPT/Gemini/Grok) |
| Copiloto conversacional | `CopilotProvider` | `localCopilotProvider` (reglas sobre datos reales) | `LLMCopilotProvider` |
| Voz a texto | `SpeechToTextProvider` | `webSpeechProvider` (Web Speech API del navegador — Chrome/Android, no Safari/iOS) | — (Fase 3: STT en la nube para iPhone) |
| Precios de mercado | `MarketDataProvider` | `unavailableMarketDataProvider` (dice explícitamente "no disponible", nunca inventa) | Edge Function `market-data` (Yahoo Finance + CETES vía Banxico) |
| Tipo de cambio | `ExchangeRateProvider` | `staticExchangeRateProvider` | — |

`src/providers/registry.ts` es el único lugar que decide cuál
implementación está activa — el resto de la app siempre llama a
`providers.ai`, `providers.speech`, etc., nunca a una implementación
concreta directamente.

## IA "trae tu propia cuenta" (BYOK)

VALU no paga ni intermedia el uso de IA: cada persona conecta su propia
clave de Claude, ChatGPT, Gemini o Grok desde Ajustes → "Conectar tu IA".
Las claves se guardan cifradas (`src/providers/llm/secureConfig.ts`). En
la versión web, las llamadas pasan por una Edge Function de relevo
(`ai-relay`) solo para esquivar CORS del navegador — el relevo no ve ni
guarda el contenido, solo reenvía la petición con la clave que el usuario
ya tiene guardada.

## Autenticación

Supabase Auth (correo + contraseña, Google OAuth) dentro de la propia
app. Si todavía no se conecta un proyecto de Supabase real, la app cae
sola a un modo local (nunca se rompe por falta de configuración).

## PWA (instalar en pantalla de inicio)

`public/manifest.json` + `public/sw.js`. El service worker sirve el
shell de la app "red primero, caché de respaldo" para navegación, y
específicamente **red primero también para `manifest.json` e íconos**
(no solo caché) — esto se corrigió el 2026-09-02 porque una versión vieja
cacheada de esos dos archivos puede tumbar la instalación en Android sin
avisar (ver [[05-bitacora-cambios]]). `CACHE_NAME` se sube de versión
cada vez que cambian esos archivos, para forzar a que se borre la caché
vieja.

## Estructura de carpetas (resumen)

```
app/                  Pantallas (Expo Router = una ruta por archivo)
src/
  ai/                 Parser local de lenguaje natural (sin IA)
  components/         Componentes de UI reutilizables
  data/               Catálogo de categorías, conceptos de presupuesto, tipos
  providers/          Capa de proveedores intercambiables (ai/local/llm/market)
  services/           Supabase (cliente, mappers, repos), auth, sync
  store/              Estado global (Zustand)
  theme/              Colores, tipografía, tema claro/oscuro
  utils/              Cálculos puros (presupuesto, cuentas, fechas, formato)
supabase/
  migrations/         SQL versionado — ver [[04-migraciones-supabase]]
  functions/          Edge Functions (ai-relay, market-data)
docs/memoria-proyecto/ Esta carpeta
```

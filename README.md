# VALU Finance AI

Copiloto financiero personal: registro de movimientos por voz/texto en segundos, patrimonio, presupuesto, inversiones y metas — sin fricción, sin tutorial.

> "Si necesitas aprender a usar la aplicación, el diseño está fallando."

## Estado actual: Fase 1 (MVP visual + funcional local)

Esta primera fase entrega una app **completa de usar hoy mismo**, con todos los módulos principales funcionando sobre datos guardados en el propio dispositivo (sin backend en la nube todavía). Nada de lo mostrado es inventado: donde falta una fuente real (precios de mercado, tipo de cambio en vivo), la app lo dice explícitamente en vez de simular un dato.

Incluido en esta fase:

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

Pendiente para fases siguientes:

- Backend en la nube (Supabase): autenticación real, sincronización entre iPhone/iPad/Web.
- Reconocimiento de voz real en iPhone/iPad (hoy solo funciona en navegadores con Web Speech API, o por texto).
- Conexión a Claude (Anthropic) para lenguaje natural completo en el copiloto y la clasificación.
- Precios de mercado en vivo y tipo de cambio real para inversiones.
- Integración con brokers (GBM primero, solo lectura, APIs oficiales).
- Alertas inteligentes automáticas, notificaciones push, recordatorios.
- Identidad visual VALU definitiva (el símbolo "Opción 4" del usuario aún no fue compartido en esta conversación — hay un placeholder inspirado en el concepto pedido).

## Nota importante sobre integridad de datos

Ningún número de mercado (precio de acciones, tipo de cambio) se inventa nunca. El tipo de cambio usado en esta fase es un valor de referencia fijo y claramente etiquetado como tal — no es un dato en vivo. Los datos de demostración están siempre marcados como "MODO DEMO" y nunca se mezclan con datos reales.

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

- **Frontend**: Expo (React Native + React Native Web) con TypeScript, Expo Router (navegación por archivos), Zustand + AsyncStorage (estado y persistencia local).
- **Backend (Fase 2)**: Supabase (Postgres, autenticación, sincronización en tiempo real).
- **IA (Fase 3)**: Claude (Anthropic) vía función segura en la nube, para interpretación de lenguaje natural y el copiloto conversacional.
- **Datos de mercado (Fase 4)**: API financiera legítima (precios) + API de tipo de cambio — nunca simulados.
- **Estructura**: `app/` (pantallas y navegación), `src/data/` (tipos, categorías, catálogo, storage), `src/store/` (estado global), `src/ai/` (intérprete local de lenguaje natural y copiloto basado en reglas), `src/theme/` (sistema de diseño), `src/components/` (UI reutilizable).

## Seguridad y privacidad (Fase 1)

Los datos viven únicamente en el almacenamiento local de tu dispositivo/navegador en esta fase — no salen a ningún servidor. La Fase 2 añade autenticación real, cifrado en tránsito/reposo y sincronización segura vía Supabase.

# Agente de IA de VALU — el "cerebro" de la app (2026-10-05)

Ver también: [[README|Índice]] · [[12-p4-ayuda-y-privacidad]] · [[06-pendientes]]

## 1. Por qué la IA nunca funcionó (diagnóstico)

Con la captura que mandó el usuario (Ajustes → Conectar tu IA → Gemini → «La función de relevo (ai-relay) todavía no
está desplegada…») se encontraron **tres causas que se sumaban**:

1. **`ai-relay` nunca se desplegó.** Las dos ejecuciones del flujo «Desplegar funciones de Supabase» (5 de octubre,
   #1 y #2) solo desplegaron `push-notify` (se ve en el registro: `Deployed Functions on project …: push-notify`).
2. **El modelo de la app ya no existía.** La app usaba `gemini-2.0-flash`, que Google retiró el **1 de junio de 2026**
   (`gemini-2.5-flash` se retira el **16 de octubre de 2026**). Aunque el relevo hubiera existido, Google respondía 404
   y la app **confundía ese 404 con "no está desplegada"**: el mensaje de error mentía.
3. **El diseño no era un agente.** Cada persona tenía que traer su clave; el relevo aceptaba la llave pública (cualquiera
   podía usarlo); y la IA solo veía un resumen fijo (20 movimientos), sin poder consultar nada más.

## 2. Qué se construyó

```
Chat / captura por voz (app)
   │  mensaje + historial + memoria
   ▼
Bucle del agente (src/ai/agent/agentLoop.ts) ──► herramientas que leen TUS datos en el dispositivo (tools.ts)
   │  conversación neutral (v1) + herramientas          resumen, movimientos, categorías, presupuesto, cuentas,
   ▼                                                   tarjetas, deudas, metas, inversiones, lo que viene
Función ai-agent en tu Supabase (supabase/functions/ai-agent)
   │  exige sesión · cuota diaria por persona · clave del servidor o la tuya · elige el modelo vigente
   ▼
Gemini (por defecto) · Claude · ChatGPT · Grok
```

- **Piensa → consulta → responde.** La IA decide qué herramientas usar (hasta 6 pasos por mensaje). Las herramientas
  corren en el dispositivo; a la IA solo viaja el resultado que pidió. El último paso obliga a contestar con texto.
- **Propone, nunca aplica.** Para cambiar datos usa `proponer_acciones` con el MISMO catálogo cerrado de 33 acciones del
  motor local (`src/ai/agent/modelActions.ts`): cada acción se resuelve por nombre contra los datos reales, en orden y
  con ids virtuales (crear una cuenta y transferirle en el mismo mensaje), y la persona confirma manteniendo presionado.
  Si falta un dato, se le pregunta; si la propuesta es imposible, se le explica a la IA para que corrija (una vez).
- **La categoría la pone el motor local.** La IA solo dice qué fue («tacos», «uber»); el motor de 26 mil palabras elige la
  categoría. La IA no necesita el catálogo en su contexto (menos tokens, cero ids inventados).
- **Memoria.** Con `recordar`, el agente guarda datos estables («cobro cada quincena»). Viven solo en el dispositivo, se
  ven y se borran en Ajustes → IA, y entran como contexto en cada conversación.
- **Respaldo.** Sin sesión, sin conexión, sin clave, sin cuota o con la función sin desplegar, contesta el motor local
  de siempre y, bajo la respuesta, una línea dice por qué («Respondí sin IA: …»). Un error de configuración no se
  reintenta durante un minuto.
- **Captura híbrida.** La captura por voz usa primero el motor local; la IA solo entra si el local no entendió el monto o
  la categoría, y nunca se pierde lo que el local sí entendió.
- **Modelos que se retiran.** El servidor usa el alias `gemini-flash-latest` (Google lo mueve al modelo vigente); si un
  modelo da 404 o no tiene cuota gratuita en esa clave («limit: 0»), pregunta a Google qué modelos tiene la clave y usa
  el mejor «flash». Se recuerda el que funcionó. En la app, un modelo retirado guardado de antes se ignora.
- **Firmas de pensamiento de Gemini 3.** La respuesta original del modelo se devuelve tal cual en el siguiente paso (si
  no, Gemini 3 responde 400 en las llamadas a herramientas).
- **Ligero.** El agente se descarga la primera vez que se usa el chat (trozo de ≈12 KB); el paquete inicial bajó a
  ≈850 KB.

## 3. Cómo activarla (desde el iPad)

1. **Clave:** aistudio.google.com/apikey → «Create API key» (la que empieza con `AIza`).
2. **Secreto en Supabase:** Dashboard → Edge Functions → **Secrets** → Add new secret: `GEMINI_API_KEY` = la clave.
   Opcionales: `AI_DAILY_LIMIT` (consultas por persona al día; por defecto 150), `AI_ALLOWED_EMAILS` (si cualquiera puede
   registrarse en tu app: solo esos correos usan tu clave), `AI_MODEL` (fijar un modelo), `AI_PROVIDER` y
   `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `XAI_API_KEY` para usar otro proveedor.
3. **Migración 0025** (SQL Editor): crea el conteo diario `ai_usage` y las columnas de fechas del presupuesto. La IA
   funciona sin ella (cuenta en memoria), pero con ella la cuota es exacta.
4. **Desplegar:** GitHub → Actions → «Desplegar funciones de Supabase» → Run workflow → `ai-agent`.
5. **Probar:** en la app, Ajustes → IA → «Probar la IA ahora». Luego en el chat: «¿en qué gasté más este mes?».

Si en el iPad quedó guardada la clave propia de antes, la IA la usará (con modelo automático). Para usar la integrada:
Ajustes → IA → Usar mi propia clave → «Quitar mi clave y usar la integrada».

## 4. Costos, límites y privacidad

- Cada mensaje del chat usa de 1 a 6 consultas (una por paso). Con 150 al día por persona caben ≈40–70 mensajes.
- **Nivel gratuito de Gemini:** sin costo, con límites por proyecto (compartidos por todas las personas que usen tu
  clave) y **Google puede usar el contenido para mejorar sus productos**. Con facturación activada (nivel de pago) eso no
  pasa. Está dicho en Privacidad y datos.
- Supabase solo guarda cuántas consultas hizo cada persona al día (`ai_usage`), nunca el contenido. Se borra con la
  cuenta.
- A la IA nunca viajan las notas de los movimientos. «Ocultar nombres a mi IA» reemplaza nombres de personas y
  comercios por «(oculto)» en todo lo que consultan las herramientas.

## 5. Pruebas

| Prueba | Qué cubre | Resultado |
|---|---|---|
| `scripts/golden/ai-agente.cjs` | Servidor con proveedores falsos: traducción a Gemini/Claude/OpenAI, firmas de pensamiento, respaldo de modelos, sesión obligatoria, cuota, clave propia, correos autorizados, nunca 404, columnas 0025 | 26 OK |
| `scripts/golden/agente-app.cjs` | Agente en la app con IA falsa: herramientas con datos reales del store, propuestas, planes con ids virtuales, aclaraciones, memoria, límite de pasos, respaldo local, captura híbrida | 25 OK |
| `scripts/smoke-agente.cjs` | Punta a punta en Chromium con Supabase falso: cabecera, pregunta con herramienta, gasto confirmado y guardado, Ajustes → IA, función sin desplegar | 10 OK |
| `scripts/golden/ayuda.cjs` | Privacidad: destinos de ai-agent inventariados, puntos de red auditados, ocultar nombres en las herramientas, notas nunca viajan | 16 OK |

Lo que **no** se pudo probar desde aquí: una llamada real a Gemini con tu clave (la red de este entorno no llega a
Google ni a tu Supabase). Esa es la primera prueba que hay que hacer al desplegar.

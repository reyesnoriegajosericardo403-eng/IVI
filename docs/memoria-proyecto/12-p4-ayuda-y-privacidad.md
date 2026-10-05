# P4 · Ayuda contextual y auditoría de privacidad (2026-10-05)

## 1. Ayuda contextual

| Pieza | Dónde |
|---|---|
| Contenido (15 temas: pasos, consejos, ejemplos de chat, nota de privacidad) | `src/help/helpTopics.ts` |
| Botón ⓘ que abre la ayuda de la pantalla en una hoja | `src/components/HelpButton.tsx` (también `ScreenHeader help="…"` en las 4 pestañas) |
| Centro de ayuda con búsqueda sin acentos | `app/ayuda.tsx`, entrada «Ayuda» en el menú de cuenta |
| Prueba | `scripts/golden/ayuda.cjs` (dentro de `npm test`) y un paso en `scripts/smoke-web.cjs` |

**La ayuda no puede mentir:** la prueba comprueba que cada tema apunta a una pantalla que existe, que cada
pantalla usa un tema que existe, y que cada ejemplo de chat marcado `accion` lo entiende el planificador real. Al
escribirla apareció una diferencia útil: «aparta 500 para mi viaje» **no** se entiende (el chat exige la palabra
«meta» para no confundir una meta con otra cosa); la ayuda usa «aporta 500 a mi meta de viaje» y lo explica.

## 2. Auditoría de privacidad: qué salió y qué se corrigió

Inventario único en `src/help/dataFlows.ts` (lo muestra Privacidad y datos → «Qué sale de tu dispositivo»):
nube propia (Supabase), avisos (Apple/Google/Mozilla), IA propia (opcional), precios de mercado y lo que nunca sale.

Comprobaciones automáticas (`ayuda.cjs`):
- Todo destino externo (relevo de IA, clientes de IA, función de precios) está en el inventario.
- **Todo punto de red del código está auditado**: una llamada `fetch` nueva en un archivo no listado hace fallar la prueba
  hasta que alguien revise y documente qué sale.
- Sin analítica ni rastreadores de terceros (dependencias y `index.html`).
- Las 21 tablas con datos personales tienen RLS y `on delete cascade` con `auth.users` (se borran con la cuenta);
  `ui_themes` es un catálogo compartido de solo lectura.
- «Exportar mis datos» incluye todas las entidades.
- El resumen que ve la IA no lee `notes`.

### Hallazgos y qué se hizo

| # | Hallazgo | Acción |
|---|---|---|
| 1 | En un dispositivo compartido, al iniciar sesión otra cuenta, los datos locales de la anterior se mostraban y **se subían a la nube de la nueva** (no se recordaba de quién eran). | **Corregido**: `src/services/auth/dataOwner.ts` recuerda al dueño; si entra otra cuenta se borran los datos locales antes de sincronizar. El modo local previo («ya usaba VALU y ahora creo cuenta») se adopta como antes. |
| 2 | Al cerrar sesión, el teléfono seguía recibiendo los avisos de esa cuenta. | **Corregido**: `signOut` da de baja la suscripción push de este teléfono antes de cerrar sesión (no cuenta como «apagarlos»). |
| 3 | A la IA propia viajaban nombres de personas (quién te debe) y comercios. | **Mitigado**: interruptor «Ocultar nombres a mi IA» (por dispositivo); la prueba verifica que no se cuele ningún nombre y que las instituciones financieras no se oculten. |
| 4 | Los avisos al teléfono llevan el título que el usuario escribió (se ve bloqueado). Antes se decía «nunca muestran montos». | **Texto corregido** en Notificaciones, Ayuda y Privacidad: nunca montos calculados por VALU; sí tu título. |
| 5 | La pantalla de Privacidad decía que a la IA solo viajaban «tus preguntas»; viaja también un resumen de cifras. | **Texto corregido** + lista completa. |
| 6 | Eliminar cuenta no mencionaba pagos recurrentes, avisos ni dispositivos de notificación. | **Texto corregido** (el borrado en cascada ya los cubría). |
| 7 | `ai-relay` acepta la llave pública (anon) en lugar de una sesión: cualquiera con la URL puede reenviar a los 4 proveedores permitidos con **su propia** clave (no gasta la tuya, no guarda nada). | **Resuelto el 2026-10-05**: `ai-relay` se reemplazó por `ai-agent`, que exige sesión (ver [[13-agente-ia]]). |
| 8 | Al cerrar sesión, los datos locales quedan en el dispositivo hasta que otra cuenta inicie sesión. | **Abierto, decisión tuya**: borrar al cerrar sesión pierde cambios aún sin sincronizar. |

## 3. Diseño para compartir correcciones (opt-in, no implementado)

Para mejorar el catálogo con correcciones de categorías de muchas personas sin comprometer la privacidad, el diseño es:
1. **Apagado por defecto** y una sola pantalla de consentimiento con ejemplo de lo que se enviaría; revocable.
2. Solo `(palabra normalizada → subcategoría)`, nunca la frase completa, montos, cuentas, fechas ni identificadores.
3. Una palabra solo se considera si **≥ 20 personas distintas** coinciden (k-anonimato); se agrega en el servidor.
4. Los cambios al catálogo remoto se revisan a mano (doc 09: catálogo con versión) antes de publicarse.
5. Todo envío nuevo pasa por `dataFlows.ts` y la prueba de puntos de red.

No se construye hasta que haya beta (P5) y un volumen que lo justifique.

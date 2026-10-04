# Herramientas del golden set y del catálogo de palabras

Todas se corren desde la raíz del repositorio con `node scripts/golden/<archivo>.cjs`. Miden el motor
**real** (`src/ai/localParser.ts`), no una copia. Resultados y método: `docs/memoria-proyecto/08-golden-set-resultados.md`.

| Comando | Para qué sirve |
|---|---|
| `run-golden.cjs [--split dev\|holdout\|all\|fresh1\|fresh3\|sealed\|sealed2\|sealed3] [--suite x] [--fail] [--md]` | Corre el golden. `all` = solo dev + holdout (el conjunto de regresión). Los `sealed*` se corren **una sola vez** y su resultado se guarda en `sealed*-AAAA-MM-DD.txt`. |
| `build-golden.cjs` | Regenera `golden-set.json` (determinista). Cambiar etiquetas aquí cuando cambie la taxonomía (usar `RELABEL`). |
| `packs.cjs format` / `prune [--dry]` / `stats` | Mantiene `src/data/keywordPacks/*.ts`: ordena, quita repetidas y las palabras que no aportan. Nunca poda `protegidas.ts`. |
| `robustez.cjs [--show]` | Prueba metamórfica (13 mil frases con ruido: «oye», «con tarjeta», «hoy»…). Debe dar 0 cambios. |
| `bench.cjs` | Tiempo por frase y peso del catálogo. |
| `snapshot.cjs > out.json` | Foto de las respuestas del motor, para comprobar que un refactor no cambia nada (comparar dos fotos con `diff`). |
| `audit-budget.cjs` | Ninguna subcategoría debe quedar sin concepto de presupuesto; ids que existan. |
| `audit-catalog.cjs` | Palabras repetidas entre subcategorías y palabras sueltas peligrosas. |
| `why.cjs "frase"` | Explica qué palabra clave decidió la categoría. |
| `catalogo.cjs` | El catálogo en segundo plano (núcleo → ampliado, versiones, ids desconocidos). Con `CATALOG=core` en cualquier otro comando, mide solo el núcleo. |
| `planes.cjs` | Planificador del chat: partir mensajes, planes, aclaraciones, vista previa, acciones nuevas (46 comprobaciones). |
| `run-planes.cjs` | Conjunto **SELLADO** del planificador (`planes-sellado.cjs`): se corre una sola vez. |
| `ejecutor.cjs` | Ejecutor de planes puro **y con el store real** (idempotencia, fallo a la mitad, auditoría, recuperación). |
| `sync-mapeo.cjs` | Lo aprendido sincronizado: mezcla, cola y motor de sincronización con un servidor falso (con y sin la tabla). |
| `run-fechas.cjs [--sealed]` | Fechas, horas y periodos (`fechas.cjs` para construir; `--sealed` corre `fechas-sellado.cjs`, una sola vez). |
| `chat-snapshot.cjs` | Foto de lo que reconoce el chat para ~55 frases típicas; compara antes/después de tocar `chatIntentParser`. |

Las pruebas de `ejecutor.cjs` y `sync-mapeo.cjs` usan sustitutos de los módulos nativos (`stub-native.cjs`, `stub-async-storage.cjs`).
**Todo junto:** `npm test` (≈ 11 s) · tipos: `npm run typecheck` · peso de la versión web: `npm run size` · pantallas en navegador
real: `node scripts/smoke-web.cjs <carpeta exportada>`.

Archivos de datos: `lexicon.cjs` y `handwritten.cjs` (casos del golden, etiquetas humanas, nunca copiadas
de la salida del motor), `fresh*.cjs` (frases nuevas), `conceptos.cjs` (casos del detector de modalidades).

Regla de oro: **un conjunto sellado se corre una vez**. Después de corregir lo que mostró, deja de medir y
hay que escribir uno nuevo.

# RITCHIE

**Robust Intelligent Time-series & Conditional Historical Estimation**

Sistema probabilístico de pronóstico y análisis de escenarios para activos
financieros. Le preguntas en español por un activo y te responde con una
probabilidad que puedes entender sin saber estadística — o te dice, con la
misma claridad, que no hay evidencia suficiente para responderte.

> **El principio que ordena todo lo demás:** no construir una máquina que le
> diga al usuario que tiene razón, sino una capaz de demostrarle que está
> equivocado.

---

## Qué hace, en una frase

Toma la historia verificable de un activo, construye variables que solo
conocen el pasado, hace competir once modelos bajo validación temporal
estricta, verifica con una prueba estadística que el ganador no sea producto
del azar, calibra sus probabilidades, simula miles de escenarios y te entrega
la conclusión en lenguaje de todos los días — con toda la evidencia detrás,
por si la quieres ver.

## Qué NO hace

- **No adivina el mercado.** Estima frecuencias, no destinos.
- **No inventa datos.** Si falta un precio, falta. Si no hay fuente, lo dice.
- **No inventa explicaciones.** Cada frase que ves está atada a un número que
  el motor calculó.
- **No te da la razón.** Si tu hipótesis no aguanta los datos, te lo dirá.
- **No es asesoría de inversión.** No sabe nada de ti, de tu situación ni de
  tus objetivos.

---

## Instalación

Requiere Python 3.10 o superior.

```bash
cd ritchie
pip install -r requirements.txt
```

Cuatro dependencias, todas estándar en cómputo científico: `numpy`, `pandas`,
`scipy` y `scikit-learn`. GARCH, los regímenes de Markov, el modelo AR, el
bootstrap por bloques, la prueba de realidad, el Monte Carlo y el servidor web
están implementados dentro del proyecto, sin nada más.

## Uso

### Interfaz web (lo normal)

```bash
python -m ritchie servidor
```

Abre `http://127.0.0.1:8777` y escribe tu pregunta.

### Línea de comandos

```bash
python -m ritchie preguntar "¿Qué probabilidad hay de que MARA suba 4% mañana?"
python -m ritchie analizar AAPL --horizonte 5 --umbral 0.04 --direccion up
python -m ritchie preguntar "¿BTC-USD baja 10% en 10 días?" --perfil completo
```

### Demostración sin conexión

Si quieres ver el sistema funcionando sin depender de ninguna fuente externa:

```bash
python -m ritchie demo --tipo patron   # serie con una ventaja REAL incrustada
python -m ritchie demo --tipo ruido    # paseo aleatorio: debe decir que no hay señal
```

Las dos corridas usan series **simuladas**, y el sistema lo anuncia en cada
pantalla. La primera existe para comprobar que RITCHIE encuentra un patrón
cuando de verdad existe; la segunda, que sabe callarse cuando no lo hay.

### Desde Python

```python
from ritchie import Ritchie, TargetSpec

motor = Ritchie()
respuesta = motor.ask("¿Qué probabilidad hay de que NVDA suba 4% mañana?")
print(respuesta.payload["resumen"]["explicacion_para_cualquiera"])

# O con parámetros explícitos:
respuesta = motor.analyze("NVDA", TargetSpec(horizon=5, threshold=0.04, direction="up"))
```

---

## Fuentes de datos

Se intentan en orden y la primera que responda gana. La procedencia (fuente,
URL y hora exacta de descarga) viaja pegada a la respuesta.

| Fuente | Cobertura | Requiere llave |
|---|---|---|
| `yahoo_finance` | acciones, ETFs, índices, FIBRAs/REITs, materias primas, criptomonedas | no |
| `stooq` | acciones e índices (sin precio ajustado) | no |
| `alpha_vantage` | acciones | sí (`RITCHIE_ALPHAVANTAGE_KEY`) |
| `csv` | cualquier mercado exportado a CSV | no |

Para mercados sin API pública (BIVA, BMV, el histórico de tu bróker), exporta
a CSV con columnas `date,open,high,low,close[,adj_close][,volume]` y:

```bash
export RITCHIE_CSV_DIR=~/mis-datos
python -m ritchie preguntar "¿WALMEX sube 3% esta semana?" --fuente csv
```

Si ninguna fuente responde, RITCHIE **no** rellena el hueco: devuelve el
motivo exacto de cada intento fallido.

---

## Cómo está construido

```
ritchie/
├── ritchie/
│   ├── config.py            semillas, versiones, umbrales de decisión
│   ├── data/                fuentes, calidad, procedencia, series simuladas
│   ├── features/            variables sin look-ahead y definición del objetivo
│   ├── models/              once modelos candidatos + combinaciones
│   ├── validation/          walk-forward, métricas, calibración, selección
│   ├── statistics/          bootstrap, permutación, efecto, prueba de realidad
│   ├── simulation/          motor de escenarios Monte Carlo
│   ├── research/            descubrimiento y validación de patrones
│   ├── backtest/            costos, deslizamiento, referencias
│   ├── decision/            confianza, "sin señal", explicación en español
│   ├── audit.py             auditoría automática con poder de veto
│   ├── nlq.py               interpretación de preguntas en español
│   ├── pipeline.py          orquestador
│   └── server.py            API JSON + interfaz web
├── web/                     interfaz (HTML, CSS y JS, sin dependencias)
└── tests/                   229 pruebas automáticas
```

### Los once modelos que compiten

| Modelo | Familia | Para qué sirve |
|---|---|---|
| `tasa_base` | referencia | La frecuencia histórica del evento. La vara de medir. |
| `tasa_reciente` | referencia | La misma frecuencia, pero solo del último año. |
| `azar` | referencia | El piso absoluto de comparación. |
| `bootstrap_historico` | referencia | Remuestrea la historia real del activo por bloques. |
| `garch` | estadístico | Volatilidad condicional con colas pesadas (t de Student). |
| `ar_bootstrap` | estadístico | Dependencia temporal con residuos remuestreados. |
| `markov_regimenes` | estadístico | Dos regímenes ocultos (calma / estrés), filtro hacia adelante. |
| `bayesiano_analogos` | estadístico | Parte de la tasa base y la actualiza con los días parecidos. |
| `logistica` | estadístico | Probabilidad directa, regularizada, sobre variables estandarizadas. |
| `random_forest` | machine learning | Relaciones no lineales entre variables. |
| `gradient_boosting` | machine learning | Relaciones complejas, con regularización. |

Y cuatro combinaciones fijas (`ensemble_todos`, `ensemble_mediana`,
`ensemble_estadistico`, `ensemble_ml`) definidas **antes** de ver ningún
resultado, para que no sean un ganador armado a conveniencia.

---

## Las siete decisiones de diseño que sostienen la honestidad

### 1. El objetivo es el único lugar que puede ver el futuro

Las variables del día *t* se construyen exclusivamente con información
disponible al cierre de ese día. La etiqueta (lo que realmente pasó) vive en
*t+1…t+H* y se construye en un módulo aparte. Las últimas H sesiones quedan
sin etiqueta y jamás entran al entrenamiento.

### 2. La prueba de causalidad, en cada corrida

No basta con escribir el código con cuidado: hay que demostrarlo. En cada
análisis, la auditoría recorta la serie hasta tres fechas distintas,
**recalcula todas las variables** con la serie truncada y verifica que den
exactamente el mismo valor que con la serie completa. Si algún cálculo mirara
hacia adelante, los números cambiarían y la auditoría lo cazaría.

### 3. Validación hacia adelante, con purga

Se entrena con el pasado y se predice el futuro, avanzando en el tiempo. El
split aleatorio está prohibido. Además: si el objetivo mira H sesiones hacia
adelante, la etiqueta del último día de entrenamiento usaría precios que caen
*dentro* del periodo de prueba, así que se recortan las últimas H+1 filas del
entrenamiento. El reentrenamiento es periódico (cada 21 sesiones por defecto),
no diario, porque eso es lo que una persona real haría.

### 4. La prueba de realidad

Comparar quince modelos hace que el mejor se vea bien aunque ninguno sirva —
igual que el más alto de quince personas al azar parece alto. RITCHIE usa una
**prueba de realidad estudentizada (White / Hansen)**: remuestrea el tiempo una
sola vez por réplica y la aplica a todos los modelos a la vez, obteniendo la
distribución del máximo bajo la hipótesis de que ninguno aporta nada. Dos
detalles la hacen funcionar: estudentizar (si no, el máximo lo domina el modelo
más ruidoso) y descartar a los modelos claramente peores que la referencia.

Si esa prueba no pasa, **no se elige ningún modelo**, y RITCHIE lo dice.

### 5. El tramo final nunca participa en una decisión

La muestra se parte en desarrollo y prueba final. **Toda** la selección
—qué modelo gana, qué calibrador usar— ocurre en desarrollo. La prueba final
se mira una sola vez, al final, para reportar si lo elegido se sostiene. Si no
se sostiene, el sistema lo publica en la tabla comparativa y la confianza baja.

### 6. Calibrar es tan importante como acertar

Un modelo puede ordenar bien los casos (buen AUC) y aun así mentir en la
magnitud: decir 80% cuando en realidad pasa el 40% de las veces. Por eso el
criterio de selección pondera la calidad de la probabilidad (Brier, error de
calibración) y la estabilidad por encima de la discriminación. El calibrador
(ninguno, Platt o isotónico) se elige por validación temporal dentro del tramo
de desarrollo, y si ninguno mejora, **no se calibra**: tocar por tocar empeora.

### 7. El derecho a callar

RITCHIE bloquea la señal, con el motivo exacto, cuando: hay poca historia, hay
pocas predicciones fuera de muestra, el evento casi nunca ocurrió, ningún
modelo superó a la tasa base, las probabilidades están mal calibradas, los
modelos se contradicen, el momento actual no se parece a nada del pasado, los
datos tienen problemas, o la estimación no se distingue del promedio
histórico. Una falla crítica en la auditoría también veta la respuesta.

---

## Qué ves en pantalla

La interfaz sigue **divulgación progresiva**: primero la conclusión, el detalle
solo si lo pides.

- **Nivel 1 — la conclusión.** Probabilidad, dirección, confianza, escenarios y
  una explicación que entiende cualquiera: *"De cada 100 días parecidos al de
  hoy, en 42 pasó y en 58 no."*
- **Nivel 2 — la evidencia.** Qué está pesando hoy (medido, no interpretado),
  qué dice cada modelo, cuántos días históricos se parecen a hoy y qué pasó en
  ellos.
- **Nivel 3 — los números.** Cómo se validó, calidad de las probabilidades en
  desarrollo y en la prueba final, curva de calibración, backtest con costos
  contra tres referencias, y los patrones que el sistema buscó por su cuenta.
- **Nivel 4 — la metodología.** Competencia completa de modelos, prueba de
  realidad, por qué se descartó cada candidato, ajuste de calibración.
- **Nivel 5 — lo técnico.** Auditoría automática verificación por verificación,
  diagnóstico de cada modelo, procedencia de los datos y todo lo necesario para
  reproducir la corrida.

## Perfiles de cómputo

El protocolo de validación es idéntico en los tres; lo que cambia es cuánto se
reentrena y cuántos caminos se simulan.

| Perfil | Reentrena cada | Tiempo típico |
|---|---|---|
| `rapido` (por defecto) | 42 sesiones | ~40-60 s la primera vez |
| `completo` | 21 sesiones | ~2-3 min |
| `exhaustivo` | 10 sesiones | ~6-10 min |

Los resultados se guardan en caché por activo, objetivo y fecha del último
dato: la segunda vez que preguntas lo mismo, la respuesta es instantánea.

## Reproducibilidad

Cada respuesta incluye versión del motor, semilla, perfil, configuración
completa, fuente y URL de los datos, hora de descarga, huella criptográfica de
la serie, definición exacta del objetivo, filas de entrenamiento y momento del
análisis. Dos corridas con los mismos datos dan exactamente el mismo número.

## Pruebas

```bash
pip install -r requirements-dev.txt
python -m pytest              # todo (~3 min)
python -m pytest -m "not lento"   # sin el pipeline completo
```

229 pruebas que cubren datos, variables, objetivo, modelos, validación,
estadística, simulación, backtest, decisión, lenguaje, auditoría, interfaz,
API, casos límite y el recorrido completo. Entre ellas, las tres que más
importan:

- **`test_ninguna_variable_mira_al_futuro`** — recalcula las 62 variables con
  la serie truncada en tres fechas y exige coincidencia exacta.
- **`test_la_auditoria_caza_una_fuga_de_informacion`** — inyecta a propósito
  una variable que ve el futuro y verifica que la auditoría la detecte.
- **`test_dice_que_no_hay_senal_en_el_ruido`** — corre el sistema completo
  sobre un paseo aleatorio y exige que se niegue a dar una probabilidad.

## Limitaciones (las de verdad)

- Solo ve precio, volumen y contexto de mercado. **No lee noticias, reportes
  trimestrales, demandas ni decisiones regulatorias.** Un activo puede moverse
  40% por algo que RITCHIE no tiene forma de saber.
- Toda la evidencia es histórica. Si el activo cambia de naturaleza (una
  fusión, un cambio de negocio, un régimen regulatorio nuevo), el pasado deja
  de ser una guía y el sistema no tiene cómo enterarse.
- Las probabilidades describen frecuencias, no certezas: un 80% falla una de
  cada cinco veces, y eso no es un error del modelo.
- En la mayoría de los activos líquidos, lo más probable es que RITCHIE
  encuentre poca o ninguna ventaja predecible en la dirección del precio. **Eso
  no es una falla del sistema: es el resultado.** La volatilidad sí es
  predecible; la dirección, casi nunca.
- El backtest asume que puedes operar a la apertura siguiente con el
  deslizamiento configurado. En activos poco líquidos eso es optimista.

## Licencia

Ver `LICENSE` en la raíz del repositorio.

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

## Ábrelo en tu computadora (2 minutos, sin saber programar)

**¿Por qué no me das un link directo?** Porque cuando hablas conmigo aquí, yo
corro dentro de un contenedor temporal en la nube — no en tu computadora. Si
levanto un servidor ahí, solo yo puedo verlo; tu navegador no tiene forma de
llegar a él, sin importar la URL que te dé. RITCHIE necesita correr en un
equipo que de verdad sea tuyo, para poder conectarse a internet con tu
conexión y mostrarte la página en tu propio navegador. Es la única manera
honesta de que "lo veas funcionando" de verdad, con datos reales.

La buena noticia: una vez instalado, se abre solo con un doble clic.

**Paso 1 — Consigue la carpeta `ritchie/`.** Descarga este repositorio desde
GitHub (botón verde **Code → Download ZIP**) y descomprímelo, o clónalo si ya
usas Git. Todo lo que necesitas está dentro de la carpeta `ritchie/`.

**Paso 2 — Ábrelo:**

| Tu computadora | Qué hacer |
|---|---|
| **Mac** | Doble clic en **`Iniciar RITCHIE (Mac).command`**. Si macOS dice que no puede verificar al desarrollador: clic derecho sobre el archivo → *Abrir* → *Abrir* (solo la primera vez). |
| **Windows** | Doble clic en **`Iniciar RITCHIE (Windows).bat`**. |
| **Cualquier sistema, por terminal** | `cd ritchie` y luego `python3 iniciar.py` |

Eso es todo. Se instala lo que haga falta (una sola vez, ~1-2 minutos), se
abre tu navegador solo, y ya puedes escribir tu pregunta. La próxima vez que
lo abras arranca al instante.

**¿No tienes Python?** El lanzador te avisa con un mensaje claro y el enlace
para instalarlo (es gratis, oficial, y toma dos minutos: python.org).

**¿Quieres ver el diseño antes de instalar algo?** Hay una vista previa (pídela
aparte) con la misma interfaz, pero es solo eso: una **maqueta estática** con
dos respuestas ya calculadas de antemano. Escribas lo que escribas ahí, no
analiza nada nuevo — no tiene el motor corriendo detrás. Sirve para juzgar el
diseño, no para preguntar por un activo real. Para eso hace falta correr el
motor de verdad, con alguna de las dos opciones de abajo.

## Solo tienes iPad, celular, o no quieres instalar nada: despliega en la nube (gratis)

Si no tienes una computadora a la mano, la alternativa real es poner RITCHIE
en un servidor de verdad en internet — gratis — para que te dé una dirección
normal (`https://algo.onrender.com`) que abres en Safari como cualquier
página. Uso [Render](https://render.com) porque tiene un plan gratuito que sí
alcanza a internet libremente (a diferencia de otras opciones gratuitas, que
bloquean justo las conexiones a Yahoo Finance que RITCHIE necesita) y todo se
hace con clics, sin terminal ni computadora.

**Paso 1.** Desde tu iPad, entra a [render.com](https://render.com) y crea una
cuenta gratis — el botón "Sign up with GitHub" es el más rápido si el
repositorio ya está en tu GitHub (usa la misma cuenta con la que se creó este
proyecto).

**Paso 2.** Adentro, toca **New +** → **Blueprint**.

**Paso 3.** Conecta tu repositorio (`IVI` o como se llame el que tiene la
carpeta `ritchie/`). Render va a encontrar solo el archivo `render.yaml` de la
raíz del repositorio y va a proponerte crear un servicio llamado **ritchie**
con todo ya configurado — plan **Free**, comando de instalación y de arranque
correctos. Solo confirma con **Apply** / **Create**.

**Paso 4.** Espera unos minutos (instala las librerías y arranca). Cuando
termine, Render te muestra una URL como `https://ritchie-xxxx.onrender.com`
— esa es tu RITCHIE, de verdad, funcionando, accesible desde cualquier
dispositivo. Guárdala; en iPad puedes tocar el botón de compartir de Safari →
**Agregar a pantalla de inicio** para que se sienta como una app.

**Cosas que debes saber de este plan gratuito** (para que nada te tome por
sorpresa):

- **Se duerme.** Si nadie lo usa por 15 minutos, Render lo apaga. La primera
  pregunta después de eso tarda un poco más (~30-60s extra) mientras despierta.
- **Es más lento que una computadora normal.** La CPU gratuita es compartida;
  un análisis puede tardar algunos minutos en vez de ~1 minuto. Es el mismo
  motor con el mismo rigor, solo con menos músculo.
- **Sigue el perfil `rapido` por defecto** (ver más abajo, sección "Perfiles
  de cómputo") — es el que mejor rinde con recursos limitados sin recortar el
  protocolo de validación.
- Si algún día quieres algo más rápido y siempre despierto, Render también
  tiene planes de pago; no hace falta para empezar.

### Si Yahoo y Stooq no responden: una llave gratuita de respaldo

La IP de salida de Render (plan gratuito) la comparten muchas aplicaciones a
la vez. Si justo en ese momento Yahoo Finance o Stooq están limitando esa IP
por el tráfico de **otras** apps, RITCHIE lo va a decir tal cual (verás un
error 429 o una respuesta que no trae lo esperado) — no es que RITCHIE esté
roto, es que esa IP compartida está topada. Más reintentos no arreglan esto
porque el límite es por IP, no por cuánto insiste RITCHIE.

**Para las criptomonedas principales (BTC-USD, ETH-USD, SOL-USD y ~23 más)
esto ya no debería pasar**: RITCHIE las consigue primero por `coingecko`, una
fuente sin llave que en la práctica no bloquea la IP compartida de Render
como sí lo hacen Yahoo y Stooq. Si preguntas por una de esas criptomonedas y
sigue fallando, dínoslo — puede ser una caída puntual de CoinGecko, no el
mismo problema de siempre.

Para acciones, ETFs, índices, materias primas y divisas —donde `coingecko`
no aplica— la solución de verdad es una fuente que no dependa de tu IP:
**Alpha Vantage**, con una llave gratuita personal (no compartida con nadie
más). Un minuto, sin computadora:

**Paso 1.** Desde Safari, entra a
[alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key).
Pon tu correo y toca **GET FREE API KEY**. Te da una llave al instante, sin
tarjeta ni confirmación por correo.

**Paso 2.** En Render, tu servicio `ritchie` → pestaña **Environment** →
**Add Environment Variable**:

| Key | Value |
| --- | --- |
| `RITCHIE_ALPHAVANTAGE_KEY` | la llave que te dio Alpha Vantage |

Guarda; Render redespliega solo. RITCHIE la va a usar automáticamente en
cuanto Yahoo y Stooq fallen — no hace falta tocar nada más.

**El límite del plan gratuito de Alpha Vantage** es de 25 peticiones al día
por llave — de sobra para preguntar por varios activos distintos, pero no
para un uso intensivo. Es un respaldo, no un reemplazo: cuando Yahoo/Stooq sí
respondan (lo normal la mayoría del tiempo), esas siguen siendo las
primeras que se intentan.

### Memoria persistente (opcional): que lo que se descarga se quede guardado

Por defecto, cada vez que Render duerme y despierta, RITCHIE empieza de cero:
vuelve a pedirle todo a Yahoo/Stooq. Si además quieres que **lo que ya
consiguió una vez quede guardado para siempre** — y poder subir tú mismo un
CSV cuando ninguna fuente automática responda — conecta RITCHIE a Supabase.
Si ya usas VALU en este mismo proyecto, es el mismo proyecto de Supabase, una
tabla nueva (`ritchie_market_data`) que nadie más puede leer ni escribir.

**Paso 1 — crea la tabla.** Desde Safari, entra a tu proyecto en
[supabase.com](https://supabase.com) → menú lateral **SQL Editor** → **New
query**. Pega el contenido completo de
[`supabase/migrations/0015_ritchie_market_data.sql`](../supabase/migrations/0015_ritchie_market_data.sql)
y toca **Run**.

**Paso 2 — copia las dos claves.** En el mismo proyecto: **Settings** → **API**.
Copia:
- **Project URL** (la misma que ya usa VALU).
- La clave **`service_role`** en "Project API keys" — **no** la `anon`. Esta sí
  puede escribir sin restricciones, así que trátala como una contraseña:
  nunca la pegues en el navegador ni la subas a un repositorio.

**Paso 3 — pégalas en Render.** En tu servicio `ritchie` → pestaña
**Environment** → **Add Environment Variable**, dos veces:

| Key | Value |
| --- | --- |
| `RITCHIE_SUPABASE_URL` | tu Project URL |
| `RITCHIE_SUPABASE_SERVICE_KEY` | tu clave `service_role` |

Guarda; Render redespliega solo en un par de minutos.

**Listo.** A partir de ahí:
- Todo lo que RITCHIE consiga de Yahoo/Stooq/Alpha Vantage se guarda solo,
  sin que hagas nada.
- La próxima pregunta sobre el mismo símbolo y rango de fechas se responde
  desde esa memoria antes de intentar salir a internet — más rápido y sin
  gastar la cuota de las fuentes gratuitas.
- En la barra lateral aparece **Cargar tus datos**: para cuando ninguna
  fuente responda, o quieras analizar algo que RITCHIE no cubre (un CSV de tu
  bróker, un mercado local), puedes subir tú mismo el histórico en CSV y
  queda guardado igual.

Sin estas dos variables, RITCHIE funciona exactamente igual que siempre —
esto es un extra, nunca un requisito.

## Diseño

Interfaz minimalista con el vocabulario visual de Apple: materiales
translúcidos con jerarquía real, resortes en vez de animaciones prescritas
(interrumpibles, con traspaso de velocidad en el arrastre de la hoja
inferior), tipografía con seguimiento óptico y un selector de tema
claro/oscuro/automático con indicador animado — conservando la paleta de
color viva del proyecto (azul, verde, rojo, ámbar). Principios adaptados de
[emilkowalski/skills](https://github.com/emilkowalski/skills) (`apple-design`,
`mobile-native`). Responsivo verificado en móvil, tablet, laptop y escritorio.

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

## Instalación (manual, para quien prefiere control total)

Si ya tienes experiencia con Python y prefieres no usar `iniciar.py`:

Requiere Python 3.10 o superior.

```bash
cd ritchie
pip install -r requirements.txt
```

Cinco dependencias: `numpy`, `pandas`, `scipy` y `scikit-learn` (estándar en
cómputo científico) más `requests` (el cliente HTTP que usan las fuentes de
datos en línea). GARCH, los regímenes de Markov, el modelo AR, el bootstrap
por bloques, la prueba de realidad, el Monte Carlo y el servidor web están
implementados dentro del proyecto, sin nada más.

## Uso

### Interfaz web (lo normal)

```bash
python3 iniciar.py            # instala lo que falte y abre el navegador solo
# — o, si ya instalaste las dependencias a mano —
python -m ritchie servidor
```

Abre `http://127.0.0.1:8777` y escribe tu pregunta. Si ese puerto está
ocupado, usa `python -m ritchie servidor --puerto 0` para que el sistema
elija uno libre (la dirección exacta aparece impresa en la terminal).

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
| `supabase_store` | lo que ya se guardó antes (en línea o subido a mano) | no, pero se salta si no está configurada (ver "Memoria persistente" arriba) |
| `coingecko` | ~26 criptomonedas principales (BTC-USD, ETH-USD, SOL-USD, etc.) | no |
| `yahoo_finance` | acciones, ETFs, índices, FIBRAs/REITs, materias primas, criptomonedas | no |
| `stooq` | acciones e índices (sin precio ajustado) | no |
| `alpha_vantage` | acciones | sí (`RITCHIE_ALPHAVANTAGE_KEY`) |
| `csv` | cualquier mercado exportado a CSV | no |

Cuando la memoria persistente está configurada, `supabase_store` se antepone
solo a este orden (es la primera que se intenta). `coingecko` va justo
después: para cualquier símbolo que no sea una de sus criptomonedas
conocidas falla al instante sin tocar la red, así que no le cuesta nada al
resto — y para las que sí cubre, evita la espera de Yahoo/Stooq cuando esa
IP compartida está bloqueada. Además, cualquier serie que consiga
`coingecko`, `yahoo_finance`, `stooq` o `alpha_vantage` se guarda en la
memoria persistente sola, de regalo, para la próxima vez.

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

# Selector Interactivo de Técnicas de Diagnóstico Organizacional

Aplicación web (SPA responsive, HTML/CSS/JS vanilla) que guía al usuario por un
cuestionario de 10 preguntas cualitativas y recomienda, con un porcentaje de
compatibilidad, la técnica de diagnóstico organizacional más idónea entre seis
técnicas administrativas:

- Análisis FODA (SWOT)
- Análisis PESTEL
- Benchmarking Competitivo
- Diagrama de Ishikawa (Causa-Efecto)
- Análisis de la Cadena de Valor (Porter)
- Matriz BCG (Boston Consulting Group)

> Proyecto académico independiente dentro de este repositorio — vive por
> completo en esta carpeta `diagnostico-organizacional/` y no depende ni
> modifica ninguna otra parte del repositorio.

## Créditos académicos

| | |
|---|---|
| **Autor** | Ricardo Reyes y Equipo de Consultoría Estudiantil |
| **Institución** | Universidad Nacional Autónoma de México — FCA UNAM |
| **Evento** | 32ª Semana Académica Interdisciplinaria (SAI) |
| **Concurso** | 9º Concurso de diseño de tríptico informativo sobre técnicas administrativas |
| **Asignatura** | Técnicas de la Administración (5º semestre) |

## Estructura del proyecto

```
diagnostico-organizacional/
├── index.html      # Hero, cuestionario, dashboard de resultados, fichas, footer
├── styles.css       # Paleta "GrowSphere", tarjetas, botones píldora, @media print
├── app.js           # Estado, árbol de decisión, cálculo de puntajes, gráfico SVG
├── vercel.json       # Cabeceras de caché para despliegue estático en Vercel
└── README.md
```

No requiere build ni instalación de dependencias: es HTML/CSS/JS estático que
usa Tailwind CSS vía CDN y la tipografía Inter de Google Fonts.

## Cómo funciona

1. **Hero**: presenta el proyecto y da acceso a "Comenzar diagnóstico".
2. **Cuestionario**: 10 preguntas de opción única. Cada opción suma puntos a
   una o más de las 6 técnicas (ver `QUESTIONS` en `app.js`).
3. **Cálculo**: al responder la última pregunta se suman los puntajes por
   técnica, se calcula el máximo teórico alcanzable por cada técnica (la suma
   de su mejor puntaje posible en cada nodo) y el **% de compatibilidad** de
   cada técnica = `(puntaje obtenido / máximo teórico de esa técnica) × 100`.
   La técnica con mayor puntaje es la **Técnica Principal**; la segunda, la
   **Técnica Secundaria**.
4. **Dashboard de resultados**: gráfico de dona SVG interactivo (hover para
   ver el % de compatibilidad de cada técnica), ficha ejecutiva de la técnica
   principal y secundaria, y acciones para exportar a PDF o copiar el resumen.
5. **Repositorio de fichas**: las 6 fichas técnicas completas siempre
   accesibles desde el menú, independientemente del resultado del cuestionario.

## Ejecutarlo en local

No necesita servidor ni build. Basta con abrir `index.html` en el navegador,
o servirlo con cualquier servidor estático, por ejemplo:

```bash
cd diagnostico-organizacional
npx serve .
# o bien
python3 -m http.server 8080
```

Y abrir `http://localhost:8080` (o el puerto que indique la herramienta).

## Despliegue en Vercel

1. En [vercel.com](https://vercel.com), **Add New → Project** e importa este
   repositorio de GitHub.
2. En **Root Directory**, selecciona `diagnostico-organizacional`.
3. Framework Preset: **Other** (sitio estático, sin build). Deja **Build
   Command** y **Output Directory** vacíos.
4. Despliega. Vercel usará automáticamente `vercel.json` de esta carpeta para
   las cabeceras de caché de `styles.css` y `app.js`.

Cada `git push` a la rama configurada vuelve a desplegar el sitio
automáticamente.

## Despliegue en GitHub Pages

1. En **Settings → Pages** del repositorio, elige la fuente **Deploy from a
   branch**.
2. Como GitHub Pages solo puede publicar desde la raíz o `/docs` de una rama,
   la forma más simple es publicar esta carpeta usando GitHub Actions, o
   copiar su contenido a una rama dedicada (por ejemplo `gh-pages`) con la
   carpeta `diagnostico-organizacional/` como raíz de esa rama.
3. Alternativa recomendada si no se quiere tocar la estructura del
   repositorio: usar Vercel (ver arriba), que sí soporta desplegar una
   subcarpeta como raíz del proyecto sin configuración adicional.

## Generar el código QR para el tríptico impreso

Una vez publicada la aplicación (Vercel o GitHub Pages) tendrás una URL
pública, por ejemplo `https://selector-diagnostico.vercel.app`.

1. Entra a un generador de códigos QR gratuito, por ejemplo
   [qr-code-generator.com](https://www.qr-code-generator.com) o
   [qrcode-monkey.com](https://www.qrcode-monkey.com).
2. Pega la URL pública de tu despliegue.
3. Descarga el QR en formato PNG o SVG en alta resolución (mínimo 1000×1000 px
   para impresión).
4. Inserta la imagen del QR en el tríptico impreso, idealmente junto a un
   texto breve como *"Escanea y descubre tu técnica de diagnóstico ideal"*.

## Aviso legal

Esta herramienta tiene fines educativos. Los resultados son orientativos y no
sustituyen una consultoría profesional en administración de empresas.

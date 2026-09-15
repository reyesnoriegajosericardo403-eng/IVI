/* RITCHIE — interfaz.
   Toda la lógica pesada vive en el motor de Python. Aquí solo se presenta la
   respuesta: primero la conclusión, y el detalle únicamente si se pide. */

(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const el = {
    hero: $('hero'), form: $('formulario'), input: $('pregunta'), send: $('enviar'),
    chips: $('ejemplos'), interp: $('interpretacion'),
    working: $('trabajando'), stage: $('etapa'), bar: $('barra'),
    errorBox: $('error-box'), errorTitle: $('error-titulo'), errorText: $('error-texto'),
    errorList: $('error-detalles'),
    result: $('resultado'), simBanner: $('aviso-simulado'), simText: $('aviso-simulado-texto'),
    symbol: $('simbolo'), name: $('nombre'), price: $('precio'), date: $('fecha'),
    restated: $('restated'), headline: $('titular'), arc: $('donut-arc'),
    probability: $('probabilidad'), probCaption: $('probabilidad-pie'),
    explanation: $('explicacion'), confidence: $('confianza-chip'),
    stats: $('tarjetas-resumen'), grandma: $('abuelita'),
    priceChart: $('grafica-precio'), priceTitle: $('titulo-precio'),
    scenarioChart: $('grafica-escenarios'), scenarioLegend: $('leyenda-escenarios'),
    rangeCard: $('rango-card'), rangeTitle: $('titulo-rango'), rangeChart: $('grafica-rango'),
    rangeFoot: $('rango-pie'),
    factorsCard: $('factores-card'), factors: $('factores'),
    noSignalCard: $('sin-senal-card'), blockers: $('bloqueos'),
    levels: $('niveles'), disclaimer: $('disclaimer'), provenance: $('procedencia'),
    dialog: $('dialogo'), openDialog: $('acerca-de'), closeDialog: $('cerrar-dialogo'),
    sheet: $('hoja'), sheetHandle: $('hoja-manija'),
    themeToggle: $('selector-tema'), themeThumb: $('tema-indicador'),
    shell: $('shell'), sidebarToggle: $('alternar-barra'), sidebar: $('barra-lateral'),
    sidebarCats: $('barra-categorias'), sidebarScrim: $('barra-scrim'),
  };

  const DONUT = 2 * Math.PI * 52;
  const nf = (digits = 2) => new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  });
  const pct = (value, digits = 0) =>
    value === null || value === undefined || Number.isNaN(value)
      ? '—'
      : `${(value * 100).toFixed(digits)}%`;
  const signed = (value, digits = 1) =>
    value === null || value === undefined ? '—' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(digits)}%`;
  const money = (value) => (value === null || value === undefined ? '—' : nf(value >= 100 ? 2 : 4).format(value));
  const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------ movimiento
     Un resorte de verdad, no una transición disfrazada: se usa donde el
     gesto de la persona debe poder interrumpirlo en cualquier instante (la
     hoja que se arrastra). Parámetros al estilo Apple: damping 1.0 (sin
     rebote) para asentar, algo menor solo cuando el soltar trae velocidad
     propia. Semi-implícito de Euler — estable y barato de sobra para 60fps. */
  function crearResorte({ amortiguacion = 1, respuesta = 0.35 } = {}) {
    // De (amortiguación, tiempo de respuesta) a rigidez/fricción físicas.
    const angular = (2 * Math.PI) / Math.max(respuesta, 0.05);
    const rigidez = angular * angular;
    const friccion = 2 * amortiguacion * angular;
    return function paso(valor, velocidad, objetivo, dt) {
      const fuerza = -rigidez * (valor - objetivo) - friccion * velocidad;
      const nuevaVelocidad = velocidad + fuerza * dt;
      const nuevoValor = valor + nuevaVelocidad * dt;
      const asentado = Math.abs(nuevoValor - objetivo) < 0.4 && Math.abs(nuevaVelocidad) < 30;
      return { valor: asentado ? objetivo : nuevoValor, velocidad: asentado ? 0 : nuevaVelocidad, listo: asentado };
    };
  }

  /** Anima un número desde `desde` hasta `objetivo`, arrancando con
   * `velocidadInicial` (traspaso de velocidad del gesto — sección 5 de la
   * guía) y entregando cada cuadro a `escribir(valor)`. Interrumpible:
   * cancelar el resultado y volver a llamar desde el valor en pantalla es
   * seguro en cualquier momento, porque nunca se anima "hacia" nada que no
   * sea el objetivo actual — nunca hacia un punto intermedio ya superado. */
  function animarConResorte(desde, objetivo, velocidadInicial, opciones, escribir, alTerminar) {
    const paso = crearResorte(opciones);
    let valor = desde;
    let velocidad = velocidadInicial;
    let anterior = performance.now();
    let vivo = true;
    function marco(ahora) {
      if (!vivo) return;
      const dt = Math.min((ahora - anterior) / 1000, 1 / 30);
      anterior = ahora;
      const resultado = paso(valor, velocidad, objetivo, dt);
      valor = resultado.valor; velocidad = resultado.velocidad;
      escribir(valor);
      if (resultado.listo) { if (alTerminar) alTerminar(); return; }
      requestAnimationFrame(marco);
    }
    requestAnimationFrame(marco);
    return () => { vivo = false; };
  }

  /** Resistencia progresiva al tirar más allá de un límite — nunca un tope
   * duro. `over` es cuánto se pasó del límite; `dimension`, el tamaño de
   * referencia (alto de la hoja, ancho del riel del interruptor). */
  function rubberband(over, dimension, constante = 0.55) {
    return (over * dimension * constante) / (dimension + constante * Math.abs(over));
  }

  /** current + proyección del punto de reposo a partir de la velocidad de
   * salida — la misma función que usa Apple para que un tironazo aterrice
   * más allá del punto de soltado, no exactamente en él. */
  function proyectarDestino(actual, velocidadPxPorSeg, decel = 0.998) {
    return actual + (velocidadPxPorSeg / 1000) * decel / (1 - decel);
  }

  /* ------------------------------------------------------------- gráficas */
  const svgNS = 'http://www.w3.org/2000/svg';

  function makeSvg(width, height) {
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('role', 'img');
    return svg;
  }

  function node(name, attrs) {
    const item = document.createElementNS(svgNS, name);
    Object.entries(attrs).forEach(([key, value]) => item.setAttribute(key, value));
    return item;
  }

  function lineChart(container, series, options = {}) {
    container.innerHTML = '';
    if (!series || series.length < 2) return;
    const W = 640, H = 220, padX = 8, padTop = 14, padBottom = 22;
    const values = series.map((p) => p.valor);
    const min = Math.min(...values), max = Math.max(...values);
    const span = max - min || 1;
    const x = (i) => padX + (i * (W - padX * 2)) / (series.length - 1);
    const y = (v) => padTop + (1 - (v - min) / span) * (H - padTop - padBottom);

    const svg = makeSvg(W, H);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const path = series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
    const area = `${path} L${x(series.length - 1).toFixed(1)},${H - padBottom} L${padX},${H - padBottom} Z`;

    const gradientId = `grad-${Math.random().toString(36).slice(2, 8)}`;
    const defs = document.createElementNS(svgNS, 'defs');
    const gradient = node('linearGradient', { id: gradientId, x1: '0', y1: '0', x2: '0', y2: '1' });
    gradient.appendChild(node('stop', { offset: '0%', 'stop-color': 'var(--accent)', 'stop-opacity': '.20' }));
    gradient.appendChild(node('stop', { offset: '100%', 'stop-color': 'var(--accent)', 'stop-opacity': '0' }));
    defs.appendChild(gradient);
    svg.appendChild(defs);

    svg.appendChild(node('path', { d: area, fill: `url(#${gradientId})`, stroke: 'none' }));
    svg.appendChild(node('path', {
      d: path, fill: 'none', stroke: options.color || 'var(--accent)',
      'stroke-width': '2', 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    }));
    svg.appendChild(node('circle', {
      cx: x(series.length - 1), cy: y(values[values.length - 1]), r: '3.5',
      fill: options.color || 'var(--accent)',
    }));

    const label = (text, px, py, anchor) => {
      const item = node('text', {
        x: px, y: py, 'text-anchor': anchor, fill: 'var(--text-3)', 'font-size': '11',
        'font-family': 'inherit',
      });
      item.textContent = text;
      return item;
    };
    svg.appendChild(label(series[0].fecha, padX, H - 6, 'start'));
    svg.appendChild(label(series[series.length - 1].fecha, W - padX, H - 6, 'end'));
    svg.appendChild(label(money(max), padX, padTop - 2, 'start'));
    svg.appendChild(label(money(min), padX, H - padBottom - 3, 'start'));
    container.appendChild(svg);
  }

  function coneChart(container, cone, lastPrice) {
    container.innerHTML = '';
    if (!cone || !cone.length) return;
    const W = 640, H = 220, padL = 8, padR = 46, padTop = 14, padBottom = 22;
    const start = { sesion: 0, p10: lastPrice, p25: lastPrice, p50: lastPrice, p75: lastPrice, p90: lastPrice };
    const points = [start, ...cone];
    const lows = points.map((p) => p.p10), highs = points.map((p) => p.p90);
    const min = Math.min(...lows), max = Math.max(...highs);
    const span = max - min || 1;
    const x = (i) => padL + (i * (W - padL - padR)) / (points.length - 1);
    const y = (v) => padTop + (1 - (v - min) / span) * (H - padTop - padBottom);

    const svg = makeSvg(W, H);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const band = (lowKey, highKey, opacity) => {
      const top = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[highKey]).toFixed(1)}`).join(' ');
      const bottom = points.slice().reverse()
        .map((p, i) => `L${x(points.length - 1 - i).toFixed(1)},${y(p[lowKey]).toFixed(1)}`).join(' ');
      return node('path', { d: `${top} ${bottom} Z`, fill: 'var(--accent)', opacity: String(opacity), stroke: 'none' });
    };
    svg.appendChild(band('p10', 'p90', 0.12));
    svg.appendChild(band('p25', 'p75', 0.20));
    svg.appendChild(node('path', {
      d: points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.p50).toFixed(1)}`).join(' '),
      fill: 'none', stroke: 'var(--accent)', 'stroke-width': '2', 'stroke-linecap': 'round',
    }));
    svg.appendChild(node('line', {
      x1: padL, y1: y(lastPrice), x2: W - padR, y2: y(lastPrice),
      stroke: 'var(--text-3)', 'stroke-width': '1', 'stroke-dasharray': '3 4', opacity: '.7',
    }));

    const last = points[points.length - 1];
    const tag = (value, py, color) => {
      const item = node('text', {
        x: W - padR + 6, y: py + 3.5, fill: color, 'font-size': '11', 'font-family': 'inherit',
      });
      item.textContent = money(value);
      return item;
    };
    svg.appendChild(tag(last.p90, y(last.p90), 'var(--text-3)'));
    svg.appendChild(tag(last.p50, y(last.p50), 'var(--accent)'));
    svg.appendChild(tag(last.p10, y(last.p10), 'var(--text-3)'));

    const axis = (text, px, anchor) => {
      const item = node('text', {
        x: px, y: H - 6, 'text-anchor': anchor, fill: 'var(--text-3)', 'font-size': '11',
        'font-family': 'inherit',
      });
      item.textContent = text;
      return item;
    };
    svg.appendChild(axis('hoy', padL, 'start'));
    svg.appendChild(axis(`sesión ${cone.length}`, W - padR, 'end'));
    container.appendChild(svg);
  }

  function rangeBar(container, percentiles, lastPrice) {
    container.innerHTML = '';
    if (!percentiles) return;
    const W = 640, H = 92;
    const p5 = percentiles.p5, p95 = percentiles.p95;
    const min = Math.min(p5, lastPrice), max = Math.max(p95, lastPrice);
    const span = max - min || 1;
    const x = (v) => 12 + ((v - min) / span) * (W - 24);
    const svg = makeSvg(W, H);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    svg.appendChild(node('rect', {
      x: x(p5), y: 30, width: Math.max(1, x(p95) - x(p5)), height: 18, rx: 9,
      fill: 'var(--accent)', opacity: '.14',
    }));
    svg.appendChild(node('rect', {
      x: x(percentiles.p25), y: 30, width: Math.max(1, x(percentiles.p75) - x(percentiles.p25)),
      height: 18, rx: 9, fill: 'var(--accent)', opacity: '.30',
    }));
    svg.appendChild(node('line', {
      x1: x(percentiles.p50), y1: 26, x2: x(percentiles.p50), y2: 52,
      stroke: 'var(--accent)', 'stroke-width': '2.5', 'stroke-linecap': 'round',
    }));
    svg.appendChild(node('line', {
      x1: x(lastPrice), y1: 22, x2: x(lastPrice), y2: 56,
      stroke: 'var(--text)', 'stroke-width': '1.5', 'stroke-dasharray': '3 3',
    }));

    const label = (text, px, py, anchor, color) => {
      const item = node('text', {
        x: px, y: py, 'text-anchor': anchor, fill: color, 'font-size': '11.5', 'font-family': 'inherit',
      });
      item.textContent = text;
      return item;
    };
    svg.appendChild(label(money(p5), x(p5), 22, 'start', 'var(--text-3)'));
    svg.appendChild(label(money(p95), x(p95), 22, 'end', 'var(--text-3)'));
    svg.appendChild(label(`hoy ${money(lastPrice)}`, x(lastPrice), 70, 'middle', 'var(--text-2)'));
    svg.appendChild(label('5%', x(p5), 66, 'start', 'var(--text-3)'));
    svg.appendChild(label('95%', x(p95), 66, 'end', 'var(--text-3)'));
    container.appendChild(svg);
  }

  function calibrationChart(container, bins) {
    container.innerHTML = '';
    if (!bins || bins.length < 2) {
      container.innerHTML = '<p class="fineprint">No hay suficientes puntos para dibujar la curva.</p>';
      return;
    }
    const W = 340, H = 240, pad = 34;
    const x = (v) => pad + v * (W - pad * 2);
    const y = (v) => H - pad - v * (H - pad * 2);
    const svg = makeSvg(W, H);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.appendChild(node('line', {
      x1: x(0), y1: y(0), x2: x(1), y2: y(1),
      stroke: 'var(--text-3)', 'stroke-width': '1', 'stroke-dasharray': '4 4',
    }));
    svg.appendChild(node('path', {
      d: bins.map((b, i) => `${i ? 'L' : 'M'}${x(b.probabilidad_dicha).toFixed(1)},${y(b.frecuencia_real).toFixed(1)}`).join(' '),
      fill: 'none', stroke: 'var(--accent)', 'stroke-width': '2',
    }));
    bins.forEach((b) => {
      svg.appendChild(node('circle', {
        cx: x(b.probabilidad_dicha), cy: y(b.frecuencia_real),
        r: String(3 + Math.min(4, Math.log10(Math.max(b.n, 1)) * 2)),
        fill: 'var(--accent)', opacity: '.85',
      }));
    });
    const label = (text, px, py, anchor) => {
      const item = node('text', {
        x: px, y: py, 'text-anchor': anchor, fill: 'var(--text-3)', 'font-size': '11',
        'font-family': 'inherit',
      });
      item.textContent = text;
      return item;
    };
    svg.appendChild(label('lo que dijo el modelo →', W / 2, H - 8, 'middle'));
    svg.appendChild(label('lo que pasó', 8, 16, 'start'));
    container.appendChild(svg);
  }

  function skillBars(container, rows) {
    container.innerHTML = '';
    if (!rows || !rows.length) return;
    const W = 640, rowH = 26, H = rows.length * rowH + 18;
    const nameW = 176;           // columna fija de nombres
    const zero = nameW + 26;     // eje del cero
    const usable = W - zero - 76;
    const bound = Math.max(0.005, ...rows.map((r) => Math.abs(r.valor || 0)));
    const svg = makeSvg(W, H);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.appendChild(node('line', {
      x1: zero, y1: 4, x2: zero, y2: H - 10, stroke: 'var(--line-strong)', 'stroke-width': '1',
    }));
    rows.forEach((row, i) => {
      const cy = 8 + i * rowH;
      const value = row.valor || 0;
      // Los negativos se dibujan hacia la izquierda, pero nunca invaden la
      // columna de nombres: se recortan y el número sigue siendo visible.
      const width = Math.min(Math.abs(value) / bound * usable, value >= 0 ? usable : zero - nameW - 10);
      svg.appendChild(node('rect', {
        x: value >= 0 ? zero : zero - width, y: cy + 3, width: Math.max(width, 1.5), height: 12, rx: 3,
        fill: value >= 0 ? 'var(--up)' : 'var(--down)', opacity: row.destacado ? '1' : '.5',
      }));
      const name = node('text', {
        x: nameW, y: cy + 13, 'text-anchor': 'end', 'font-size': '12',
        fill: row.destacado ? 'var(--text)' : 'var(--text-2)', 'font-family': 'inherit',
        'font-weight': row.destacado ? '600' : '400',
      });
      name.textContent = row.nombre;
      svg.appendChild(name);
      const label = node('text', {
        x: value >= 0 ? zero + width + 8 : zero + 8,
        y: cy + 13, 'text-anchor': 'start',
        'font-size': '11.5', fill: 'var(--text-3)', 'font-family': 'inherit',
      });
      label.textContent = signed(value, 2);
      svg.appendChild(label);
    });
    container.appendChild(svg);
  }

  function equityChart(container, curve) {
    container.innerHTML = '';
    if (!curve || curve.length < 3) return;
    lineChart(container, curve.map((p) => ({ fecha: p.fecha, valor: p.valor })), {});
  }

  /* --------------------------------------------------------------- estado */
  let polling = null;

  function show(section, visible) { section.hidden = !visible; }

  function setWorking(active) {
    show(el.working, active);
    el.send.disabled = active;
    if (active) {
      show(el.errorBox, false);
      show(el.result, false);
      el.hero.classList.add('compact');
    }
  }

  function fail(title, message, details = []) {
    setWorking(false);
    el.errorTitle.textContent = title;
    el.errorText.textContent = message;
    el.errorList.innerHTML = details.map((d) => `<li>${esc(d)}</li>`).join('');
    show(el.errorBox, true);
  }

  /* ------------------------------------------------------------- petición
     Modo vista previa: cuando la página se publica sin el motor de Python
     detrás (por ejemplo, como Artifact para que alguien la revise sin
     instalar nada), `window.__RITCHIE_DEMO__` trae dos análisis YA
     calculados por el motor real sobre series simuladas. La pantalla, la
     lógica de presentación y hasta la barra de avance son las mismas de
     siempre — lo único que cambia es de dónde sale el JSON. Nunca se
     inventa un resultado nuevo aquí: solo se reproduce uno ya calculado. */
  const DEMO = window.__RITCHIE_DEMO__ || null;

  async function ask(question) {
    if (!question.trim()) return;
    setWorking(true);
    if (DEMO) return askDemo(question);
    el.stage.textContent = 'Enviando';
    el.bar.style.width = '2%';
    try {
      const response = await fetch('/api/preguntar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: question }),
      });
      const data = await response.json();
      if (!response.ok || !data.trabajo) {
        fail('No se pudo iniciar', data.error || 'Respuesta inesperada del servidor.');
        return;
      }
      poll(data.trabajo);
    } catch (error) {
      fail('Sin conexión con el motor', String(error));
    }
  }

  async function askDemo(question) {
    const escrita = question.trim().toLowerCase();
    const coincidencia = DEMO.ejemplos.find((e) => e.pregunta.toLowerCase() === escrita);
    const elegido = coincidencia || DEMO.ejemplos[0];
    const etapas = [
      [12, 'Buscando datos verificables'],
      [28, 'Construyendo variables sin mirar al futuro'],
      [50, 'Validando modelos contra el pasado, día por día'],
      [72, 'Comparando modelos y corrigiendo por pruebas múltiples'],
      [88, 'Simulando miles de escenarios'],
      [97, 'Auditando el análisis'],
    ];
    for (const [avance, etapa] of etapas) {
      el.stage.textContent = etapa;
      el.bar.style.width = `${avance}%`;
      await new Promise((resolve) => setTimeout(resolve, sinMovimiento() ? 40 : 220));
    }
    setWorking(false);
    render(elegido.payload);
  }

  function poll(jobId) {
    clearInterval(polling);
    polling = setInterval(async () => {
      try {
        const response = await fetch(`/api/trabajo/${jobId}`);
        const job = await response.json();
        if (job.estado === 'trabajando') {
          el.stage.textContent = job.etapa;
          el.bar.style.width = `${Math.max(2, job.avance * 100)}%`;
          return;
        }
        clearInterval(polling);
        setWorking(false);
        if (job.estado === 'error') {
          fail('Algo falló durante el análisis', job.mensaje || 'Error desconocido.');
          return;
        }
        render(job.resultado);
      } catch (error) {
        clearInterval(polling);
        fail('Se perdió la conexión', String(error));
      }
    }, 700);
  }

  /* -------------------------------------------------------------- render */
  function render(payload) {
    if (!payload) { fail('Respuesta vacía', 'El motor no devolvió nada.'); return; }
    if (payload.ok === false) {
      fail(
        'No hay datos para responder',
        payload.mensaje || 'No se pudo conseguir información verificable.',
        [...(payload.motivos || []), ...(payload.aclaraciones || [])],
      );
      return;
    }

    const asset = payload.activo || {};
    const summary = payload.resumen || {};
    const simulation = payload.simulacion || {};
    const scenarios = payload.escenarios || {};

    show(el.simBanner, Boolean(simulation.activa));
    el.simText.textContent = simulation.aviso || '';

    el.symbol.textContent = asset.simbolo || '';
    el.name.textContent = asset.nombre || '';
    el.price.textContent = money(asset.precio_actual);
    el.date.textContent = `cierre del ${asset.fecha_ultimo_dato || '—'}`;
    el.restated.textContent = payload.interpretacion || '';
    el.headline.textContent = summary.titular || '';
    el.explanation.textContent = summary.explicacion_simple || '';
    el.grandma.textContent = summary.explicacion_para_cualquiera || '';
    el.disclaimer.textContent = summary.advertencia || '';

    const probability = summary.probabilidad;
    if (probability === null || probability === undefined) {
      el.probability.textContent = '—';
      el.probCaption.textContent = 'sin señal';
      el.arc.style.strokeDasharray = `0 ${DONUT}`;
    } else {
      el.probability.textContent = pct(probability);
      el.probCaption.textContent = 'probabilidad';
      requestAnimationFrame(() => {
        el.arc.style.strokeDasharray = `${(probability * DONUT).toFixed(1)} ${DONUT}`;
      });
    }

    const confidence = summary.confianza || {};
    el.confidence.innerHTML =
      `<span class="dot ${esc(confidence.nivel || '')}"></span>` +
      `<span>Confianza ${esc(confidence.nivel_texto || '—')}` +
      (confidence.punto_mas_debil ? ` · lo más flojo: ${esc(confidence.punto_mas_debil.toLowerCase())}` : '') +
      '</span>';

    renderStats(summary, scenarios, payload);
    renderFactors(summary.factores || []);
    renderBlockers(payload.senal || {}, summary.hay_senal);
    renderCharts(payload, scenarios, asset);
    renderLevels(payload);

    const provenance = (payload.nivel_5_tecnico || {}).procedencia || payload.procedencia || {};
    const primary = provenance.primary || {};
    el.provenance.textContent =
      `Fuente: ${primary.source || '—'} · ${primary.rows || 0} sesiones ` +
      `(${primary.first_date || '?'} a ${primary.last_date || '?'}) · ` +
      `descargado ${(primary.retrieved_at || '').slice(0, 16).replace('T', ' ')} UTC · ` +
      `análisis en ${payload.segundos || 0}s${payload.desde_cache ? ' (desde caché)' : ''}.`;

    show(el.result, true);
    el.result.classList.remove('reveal');
    void el.result.offsetWidth;
    el.result.classList.add('reveal');
    el.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderStats(summary, scenarios, payload) {
    const cards = [];
    if (summary.probabilidad_contraria !== null && summary.probabilidad_contraria !== undefined) {
      cards.push({
        label: 'Movimiento contrario',
        value: pct(summary.probabilidad_contraria),
        note: summary.objetivo_contrario || 'según los escenarios simulados',
      });
    }
    if (summary.tasa_base_historica !== null && summary.tasa_base_historica !== undefined) {
      cards.push({
        label: 'Promedio histórico',
        value: pct(summary.tasa_base_historica),
        note: 'con qué frecuencia ocurrió en toda su historia',
      });
    }
    const risk = scenarios.riesgo || {};
    if (risk.var_95 !== undefined) {
      cards.push({
        label: 'Escenario adverso',
        value: signed(risk.var_95),
        note: 'peor 5% de los escenarios simulados',
      });
    }
    el.stats.innerHTML = cards.map((c) => `
      <div class="stat">
        <p class="stat-label">${esc(c.label)}</p>
        <p class="stat-value">${esc(c.value)}</p>
        <p class="stat-note">${esc(c.note)}</p>
      </div>`).join('');
    // Reinicia la entrada escalonada en cada respuesta nueva, no solo la primera.
    el.stats.classList.remove('reveal-stagger');
    void el.stats.offsetWidth;
    el.stats.classList.add('reveal-stagger');
    show(el.stats, cards.length > 0);
  }

  function renderFactors(factors) {
    if (!factors.length) { show(el.factorsCard, false); return; }
    const top = Math.max(...factors.map((f) => f.peso || 0), 1e-9);
    el.factors.innerHTML = factors.map((f) => {
      const direction = f.empuja === 'hacia arriba' ? 'sube' : (f.empuja === 'hacia abajo' ? 'baja' : 'neutro');
      const glyph = direction === 'sube' ? '↑' : (direction === 'baja' ? '↓' : '·');
      const width = Math.round(((f.peso || 0) / top) * 100);
      return `
        <li>
          <span class="arrow ${direction}">${glyph}</span>
          <span class="factor-text">${esc(f.texto)}</span>
          ${f.peso ? `<span class="factor-weight"><i style="width:${width}%"></i></span>` : ''}
        </li>`;
    }).join('');
    show(el.factorsCard, true);
  }

  function renderBlockers(signal, hasSignal) {
    const blockers = signal.bloqueos || [];
    if (hasSignal || !blockers.length) { show(el.noSignalCard, false); return; }
    el.blockers.innerHTML = blockers.map((b) => `
      <li>
        <strong>${esc(b.motivo)}</strong>
        <span>${esc(b.detalle)}</span>
        ${b.remedio ? `<em>${esc(b.remedio)}</em>` : ''}
      </li>`).join('');
    show(el.noSignalCard, true);
  }

  function renderCharts(payload, scenarios, asset) {
    const history = payload.grafica_precio || [];
    el.priceTitle.textContent = `Últimos ${history.length} cierres`;
    lineChart(el.priceChart, history.map((p) => ({ fecha: p.fecha, valor: p.precio })));

    const cone = scenarios.cono || [];
    if (cone.length) {
      el.scenarioChart.parentElement.hidden = false;
      el.rangeCard.hidden = false;
      coneChart(el.scenarioChart, cone, asset.precio_actual);
      el.scenarioLegend.innerHTML = `
        <span><i class="swatch" style="background:var(--accent);opacity:.30"></i> mitad de los escenarios</span>
        <span><i class="swatch" style="background:var(--accent);opacity:.14"></i> 8 de cada 10</span>
        <span><i class="swatch" style="background:var(--accent)"></i> escenario central</span>`;
      const prices = scenarios.percentiles_precio || {};
      rangeBar(el.rangeChart, prices, asset.precio_actual);
      const cases = scenarios.escenarios || {};
      el.rangeTitle.textContent =
        `Entre ${money(prices.p10)} y ${money(prices.p90)} en 8 de cada 10 escenarios`;
      el.rangeFoot.textContent =
        `Escenario central ${money((cases.base || {}).precio)} (${signed((cases.base || {}).rendimiento)}). ` +
        `${(scenarios.caminos || 0).toLocaleString('es-MX')} caminos simulados con ` +
        `${(scenarios.motores || []).length} métodos distintos: ${(scenarios.motores || []).join(', ')}.`;
    } else {
      el.scenarioChart.parentElement.hidden = true;
      el.rangeCard.hidden = true;
    }
  }

  /* ---------------------------------------------- divulgación progresiva */
  function level(number, title, tag, body) {
    return `
      <details class="level">
        <summary><span>${esc(title)}</span><span class="level-tag">${esc(tag)}</span></summary>
        <div class="level-body">${body}</div>
      </details>`;
  }

  function kv(pairs) {
    const items = pairs.filter((p) => p[1] !== null && p[1] !== undefined && p[1] !== '');
    if (!items.length) return '';
    return `<div class="kv">${items.map(
      ([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`,
    ).join('')}</div>`;
  }

  function renderLevels(payload) {
    const two = payload.nivel_2_factores || {};
    const three = payload.nivel_3_estadisticas || {};
    const four = payload.nivel_4_metodologia || {};
    const five = payload.nivel_5_tecnico || {};
    const parts = [];

    /* --- Nivel 2: evidencia --- */
    const analog = two.evidencia_historica || {};
    const models = two.probabilidad_por_modelo || {};
    let body2 = '';
    if (analog.vecinos) {
      body2 += `<h5 class="sub">Días históricos parecidos a hoy</h5>
        <p>De los <strong>${analog.vecinos}</strong> días más parecidos, el movimiento ocurrió en
        <strong>${analog.aciertos}</strong> (${pct(analog.frecuencia_cruda, 1)}), frente a un promedio
        general de ${pct(analog.tasa_base, 1)}.</p>` +
        kv([
          ['Fechas de ejemplo', (analog.fechas_ejemplo || []).join(', ')],
          ['Distancia típica', nf(2).format(analog.distancia_mediana || 0)],
          ['Probabilidad tras actualizar', pct(analog.probabilidad_posterior, 1)],
        ]);
    }
    const modelRows = Object.entries(models);
    if (modelRows.length) {
      body2 += `<h5 class="sub">Qué dice cada modelo hoy</h5>
        <div class="table-scroll"><table class="data">
          <tr><th>Modelo</th><th>Probabilidad</th></tr>
          ${modelRows.sort((a, b) => b[1] - a[1]).map(
            ([name, value]) => `<tr><td>${esc(name)}</td><td>${pct(value, 1)}</td></tr>`,
          ).join('')}
        </table></div>
        <p class="fineprint">Desacuerdo entre modelos: ${pct(two.desacuerdo_entre_modelos, 1)}.
        Mientras más se separan, menos confiable es cualquiera de ellos por su cuenta.</p>`;
    }
    const patterns = two.patrones_activos_hoy || [];
    if (patterns.length) {
      body2 += `<h5 class="sub">Condiciones que se cumplen hoy</h5>
        <ul class="plain-list">${patterns.map((p) => `<li><strong>${esc(p.patron)}</strong> — ${esc(p.explicacion)}
        ${p.util ? '<span class="pill si">patrón validado</span>' : '<span class="pill">no validado fuera de muestra</span>'}</li>`).join('')}</ul>`;
    }
    const state = two.estado_actual || {};
    if (state.detalle) body2 += `<p class="fineprint">${esc(state.detalle)}</p>`;
    if (body2) parts.push(level(2, 'La evidencia detrás del número', 'nivel 2', body2));

    /* --- Nivel 3: estadísticas --- */
    let body3 = '';
    const validation = three.validacion || {};
    const test = three.metricas_prueba_final;
    const dev = three.metricas_desarrollo_calibradas;
    body3 += `<h5 class="sub">Cómo se validó</h5>` + kv([
      ['Predicciones fuera de muestra', validation.predicciones_fuera_de_muestra],
      ['Bloques de reentrenamiento', validation.bloques],
      ['Ajustes de modelos', validation.ajustes_totales],
      ['Periodo de selección', `hasta ${validation.fin_periodo_seleccion || '—'}`],
      ['Prueba final (nunca usada para decidir)', `${validation.predicciones_prueba_final || 0} predicciones`],
    ]);
    if (dev) {
      body3 += `<h5 class="sub">Calidad de las probabilidades</h5>
        <div class="table-scroll"><table class="data">
          <tr><th>Métrica</th><th>Selección</th><th>Prueba final</th></tr>
          ${[
            ['Observaciones', dev.n, test ? test.n : null, (v) => v],
            ['Frecuencia real del evento', dev.tasa_base, test ? test.tasa_base : null, (v) => pct(v, 1)],
            ['Brier (menor es mejor)', dev.brier, test ? test.brier : null, (v) => nf(4).format(v)],
            ['Mejora sobre la tasa base', dev.brier_skill, test ? test.brier_skill : null, (v) => signed(v, 2)],
            ['AUC (0.5 = azar)', dev.auc, test ? test.auc : null, (v) => (v === null ? '—' : nf(3).format(v))],
            ['PR-AUC', dev.pr_auc, test ? test.pr_auc : null, (v) => (v === null ? '—' : nf(3).format(v))],
            ['Error de calibración', dev.ece, test ? test.ece : null, (v) => pct(v, 2)],
            ['Pendiente de calibración (ideal 1)', dev.pendiente_calibracion, test ? test.pendiente_calibracion : null,
              (v) => (v === null ? '—' : nf(2).format(v))],
          ].map(([label, a, b, format]) =>
            `<tr><td>${esc(label)}</td><td>${esc(a === null || a === undefined ? '—' : format(a))}</td>` +
            `<td>${esc(b === null || b === undefined ? '—' : format(b))}</td></tr>`).join('')}
        </table></div>
        <h5 class="sub">Curva de calibración</h5>
        <p class="fineprint">Si el modelo dice 30% y en la realidad pasa el 30% de las veces, el punto cae
        sobre la diagonal. Alejarse de ella significa exagerar o quedarse corto.</p>
        <div class="chart" id="curva-calibracion"></div>`;
    }
    const backtest = three.backtest || {};
    if (backtest.disponible) {
      const strategy = backtest.estrategia || {};
      body3 += `<h5 class="sub">Si se hubiera operado esta señal</h5>
        <p>${esc(backtest.veredicto || '')}</p>
        <div class="table-scroll"><table class="data">
          <tr><th>Estrategia</th><th>Rendimiento</th><th>Anualizado</th><th>Sharpe</th><th>Caída máxima</th><th>Operaciones</th></tr>
          ${[strategy, ...(backtest.referencias || [])].map((s, i) => `
            <tr class="${i === 0 ? 'winner' : ''}">
              <td>${esc((s.estrategia || '').replace(/_/g, ' '))}</td>
              <td>${signed(s.rendimiento_total, 1)}</td>
              <td>${signed(s.rendimiento_anualizado, 1)}</td>
              <td>${s.sharpe === null || s.sharpe === undefined ? '—' : nf(2).format(s.sharpe)}</td>
              <td>${signed(s.caida_maxima, 1)}</td>
              <td>${s.operaciones ?? '—'}</td>
            </tr>`).join('')}
        </table></div>
        <p class="fineprint">Supuestos: comisión ${pct((backtest.supuestos || {}).comision_por_lado, 2)} y
        deslizamiento ${pct((backtest.supuestos || {}).deslizamiento_por_lado, 2)} por lado, entrada en la
        apertura siguiente a la señal, una sola posición a la vez.
        ${esc(backtest.advertencia || '')}</p>
        <div class="chart" id="curva-capital"></div>`;
    }
    const found = three.patrones_descubiertos || [];
    if (found.length) {
      body3 += `<h5 class="sub">Patrones que RITCHIE buscó por su cuenta</h5>
        <div class="table-scroll"><table class="data">
          <tr><th>Condición</th><th>Casos</th><th>Frecuencia</th><th>Base</th><th>p</th><th>Efecto</th><th>Fuera de muestra</th></tr>
          ${found.slice(0, 14).map((h) => `
            <tr>
              <td>${esc(h.patron)}</td>
              <td>${h.casos_desarrollo}</td>
              <td>${pct(h.frecuencia_con_la_condicion, 1)}</td>
              <td>${pct(h.frecuencia_base, 1)}</td>
              <td>${nf(3).format(h.p_valor)}</td>
              <td>${esc(h.lectura_del_efecto)}</td>
              <td>${h.confirmado_fuera_de_muestra === true
                ? '<span class="pill si">se repitió</span>'
                : (h.confirmado_fuera_de_muestra === false ? '<span class="pill no">no se repitió</span>' : '—')}</td>
            </tr>`).join('')}
        </table></div>
        <p class="fineprint">Se probaron ${found.length} condiciones definidas de antemano. Un patrón solo
        cuenta como útil si sobrevive a la corrección por pruebas múltiples, tiene un efecto suficientemente
        grande y se repite en un periodo posterior que no participó en el hallazgo.</p>`;
    }
    parts.push(level(3, 'Números, validación y desempeño histórico', 'nivel 3', body3));

    /* --- Nivel 4: metodología --- */
    let body4 = `<h5 class="sub">Protocolo</h5>
      <ul class="plain-list">${(four.protocolo || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`;
    const ranking = four.modelos_evaluados || [];
    if (ranking.length) {
      body4 += `<h5 class="sub">Competencia de modelos</h5>
        <p class="fineprint">Mejora sobre la tasa base (Brier skill). A la derecha del cero, el modelo aporta
        información; a la izquierda, resta.</p>
        <div class="chart" id="barras-modelos"></div>
        <div class="table-scroll"><table class="data">
          <tr><th>Modelo</th><th>Para qué sirve</th><th>Puntaje</th><th>Mejora</th><th>AUC</th><th>Calibración</th><th>Estabilidad</th></tr>
          ${ranking.map((m) => `
            <tr class="${m.modelo === payload.resumen.modelo_elegido ? 'winner' : ''}">
              <td>${esc(m.modelo)}</td>
              <td style="white-space:normal;color:var(--text-3)">${esc(m.proposito || '')}</td>
              <td>${nf(3).format(m.puntaje)}</td>
              <td>${signed(m.metricas_desarrollo.brier_skill, 2)}</td>
              <td>${m.metricas_desarrollo.auc === null ? '—' : nf(3).format(m.metricas_desarrollo.auc)}</td>
              <td>${pct(m.metricas_desarrollo.ece, 2)}</td>
              <td>${pct(m.estabilidad, 0)}</td>
            </tr>`).join('')}
        </table></div>`;
    }
    const reality = four.prueba_de_realidad || {};
    if (reality.p_valor !== undefined) {
      body4 += `<h5 class="sub">Prueba de realidad</h5>
        <p>${esc(reality.detalle || '')} Resultado: <strong>p = ${nf(3).format(reality.p_valor)}</strong>
        ${reality.p_valor < 0.05
          ? '<span class="pill si">la ventaja del ganador no parece casualidad</span>'
          : '<span class="pill no">compatible con el azar</span>'}</p>`;
    }
    if ((four.motivos_de_rechazo || []).length) {
      body4 += `<h5 class="sub">Por qué se descartaron modelos</h5>
        <ul class="plain-list">${four.motivos_de_rechazo.slice(0, 8).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`;
    }
    const calibration = four.calibracion || {};
    if (calibration.decision) {
      body4 += `<h5 class="sub">Ajuste de calibración</h5>` + kv([
        ['Método elegido', calibration.decision],
        ['Motivo', calibration.motivo || 'el que mejor Brier obtuvo en validación temporal'],
      ]);
    }
    const features = four.variables || {};
    if (features.total) {
      body4 += `<h5 class="sub">Variables</h5>` + kv([
        ['Total usadas', features.total],
        ...Object.entries(features.por_familia || {}).map(([k, v]) => [`De ${k}`, v]),
      ]);
    }
    parts.push(level(4, 'Metodología y modelos usados', 'nivel 4', body4));

    /* --- Nivel 5: técnico --- */
    const audit = five.auditoria || {};
    let body5 = `<h5 class="sub">Auditoría automática</h5>
      <p>${esc(audit.resumen || '')} ${audit.aprobada
        ? '<span class="pill si">sin fallas críticas</span>'
        : '<span class="pill no">hay fallas críticas</span>'}</p>
      <ul class="checks">${(audit.pruebas || []).map((c) => `
        <li>
          <span class="${c.resultado === 'correcto' ? 'ok' : 'bad'}">${c.resultado === 'correcto' ? '✓' : '✕'}</span>
          <span><strong>${esc(c.prueba)}</strong><small>${esc(c.detalle)}</small></span>
        </li>`).join('')}</ul>`;
    const repro = five.reproducibilidad || {};
    body5 += `<h5 class="sub">Reproducibilidad</h5>` + kv([
      ['Versión del motor', repro.version_motor],
      ['Semilla', repro.semilla],
      ['Perfil de cómputo', repro.perfil],
      ['Huella de los datos', repro.huella_datos],
      ['Objetivo', repro.objetivo],
      ['Filas de entrenamiento', repro.filas_entrenamiento],
      ['Datos obtenidos', (repro.datos_obtenidos_en || '').slice(0, 19).replace('T', ' ')],
      ['Análisis ejecutado', (repro.momento_del_analisis || '').slice(0, 19).replace('T', ' ')],
    ]);
    const diagnostics = five.diagnosticos_de_modelos || {};
    if (Object.keys(diagnostics).length) {
      body5 += `<h5 class="sub">Diagnóstico de cada modelo</h5>
        <div class="table-scroll"><table class="data">
          <tr><th>Modelo</th><th>Detalle</th></tr>
          ${Object.entries(diagnostics).map(([name, info]) => `
            <tr><td>${esc(name)}</td>
            <td style="white-space:normal;text-align:left;color:var(--text-3)">${esc(
              JSON.stringify(info.diagnostics || {}, null, 0).replace(/[{}"]/g, '').replace(/,/g, ' · '),
            )}</td></tr>`).join('')}
        </table></div>`;
    }
    if ((payload.limitaciones || []).length) {
      body5 += `<h5 class="sub">Limitaciones declaradas</h5>
        <ul class="plain-list">${payload.limitaciones.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
    }
    if ((five.advertencias || []).length) {
      body5 += `<h5 class="sub">Incidencias</h5>
        <ul class="plain-list">${five.advertencias.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`;
    }
    parts.push(level(5, 'Detalle técnico y auditoría', 'nivel 5', body5));

    el.levels.innerHTML = parts.join('');

    /* gráficas que viven dentro de los niveles */
    const calibrationBox = document.getElementById('curva-calibracion');
    if (calibrationBox && dev) calibrationChart(calibrationBox, dev.curva_calibracion || []);
    const equityBox = document.getElementById('curva-capital');
    if (equityBox && backtest.disponible) equityChart(equityBox, (backtest.estrategia || {}).curva || []);
    const barsBox = document.getElementById('barras-modelos');
    if (barsBox && ranking.length) {
      skillBars(barsBox, ranking.slice(0, 12).map((m) => ({
        nombre: m.modelo,
        valor: m.metricas_desarrollo.brier_skill,
        destacado: m.modelo === payload.resumen.modelo_elegido,
      })));
    }
  }

  /* -------------------------------------------------------------- eventos */
  el.form.addEventListener('submit', (event) => {
    event.preventDefault();
    ask(el.input.value);
  });

  let interpretTimer = null;
  el.input.addEventListener('input', () => {
    if (DEMO) return; // la vista previa no tiene motor de lenguaje detrás
    clearTimeout(interpretTimer);
    const question = el.input.value.trim();
    if (question.length < 4) { el.interp.hidden = true; return; }
    interpretTimer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/interpretar?pregunta=${encodeURIComponent(question)}`);
        const parsed = await response.json();
        if (!parsed.simbolo) {
          el.interp.textContent = (parsed.aclaraciones || [])[0] || '';
        } else {
          el.interp.textContent =
            `Entiendo: ${parsed.simbolo} · ${parsed.objetivo.description}` +
            ((parsed.supuestos || []).length ? ` · ${parsed.supuestos.join(' ')}` : '');
        }
        el.interp.hidden = !el.interp.textContent;
      } catch (_) { el.interp.hidden = true; }
    }, 280);
  });

  /* --------------------------------------------------------------- hoja
     "Cómo funciona": tarjeta de vidrio centrada con puntero fino, hoja que
     se arrastra desde abajo en táctil. El arrastre es de verdad —
     interrumpible en cualquier cuadro, con la velocidad del soltar pasada
     al resorte que la asienta o la despide (secciones 3, 5 y 9 de la guía
     de diseño de Apple). */
  const esVistaHoja = () => window.matchMedia('(max-width: 680px), (hover: none)').matches;
  let cancelarResorteHoja = null;
  let arrastre = null;

  function leerTranslateY(elemento) {
    const transform = getComputedStyle(elemento).transform;
    if (!transform || transform === 'none') return 0;
    const matriz = new DOMMatrixReadOnly(transform);
    return matriz.m42;
  }

  function abrirDialogo() {
    if (cancelarResorteHoja) { cancelarResorteHoja(); cancelarResorteHoja = null; }
    el.sheet.style.transition = '';
    el.sheet.style.transform = '';
    el.dialog.showModal();
    // Un cuadro después de mostrarlo, para que el navegador pinte el estado
    // "cerrado" primero y la transición de apertura tenga algo desde dónde
    // animar (si no, no hay salto que animar y la hoja aparece de golpe).
    requestAnimationFrame(() => requestAnimationFrame(() => el.dialog.setAttribute('data-open', '')));
  }

  function cerrarDialogo() {
    if (!el.dialog.open) return;
    if (cancelarResorteHoja) { cancelarResorteHoja(); cancelarResorteHoja = null; }
    el.dialog.removeAttribute('data-open');
    el.sheet.style.transition = '';
    el.sheet.style.transform = '';
    const duracion = sinMovimiento() ? 160 : 340;
    setTimeout(() => { try { el.dialog.close(); } catch (_) {} }, duracion);
  }

  el.openDialog.addEventListener('click', abrirDialogo);
  el.closeDialog.addEventListener('click', cerrarDialogo);
  el.dialog.addEventListener('click', (event) => {
    if (event.target === el.dialog) cerrarDialogo();
  });
  el.dialog.addEventListener('cancel', (event) => { // tecla Esc
    event.preventDefault();
    cerrarDialogo();
  });

  function iniciarArrastre(event) {
    if (!esVistaHoja() || event.button > 0) return;
    if (cancelarResorteHoja) { cancelarResorteHoja(); cancelarResorteHoja = null; }
    el.sheetHandle.setPointerCapture(event.pointerId);
    el.sheet.style.transition = 'none';
    arrastre = {
      puntero: event.pointerId,
      inicioClienteY: event.clientY,
      inicioTranslate: leerTranslateY(el.sheet),
      muestras: [{ t: performance.now(), y: leerTranslateY(el.sheet) }],
    };
  }

  function moverArrastre(event) {
    if (!arrastre || event.pointerId !== arrastre.puntero) return;
    const alto = el.sheet.getBoundingClientRect().height || 1;
    const delta = event.clientY - arrastre.inicioClienteY;
    let y = arrastre.inicioTranslate + delta;
    if (y < 0) y = -rubberband(-y, alto, 0.55); // resistencia al tirar de más hacia arriba
    el.sheet.style.transform = `translateY(${y}px)`;
    arrastre.muestras.push({ t: performance.now(), y });
    if (arrastre.muestras.length > 6) arrastre.muestras.shift();
  }

  function soltarArrastre(event) {
    if (!arrastre || event.pointerId !== arrastre.puntero) return;
    const muestras = arrastre.muestras;
    const primera = muestras[0];
    const ultima = muestras[muestras.length - 1];
    const dt = Math.max((ultima.t - primera.t) / 1000, 1 / 60);
    const velocidad = (ultima.y - primera.y) / dt; // px/s, positivo = hacia abajo
    const alto = el.sheet.getBoundingClientRect().height || 1;
    const proyectado = proyectarDestino(ultima.y, velocidad);
    const debeCerrar = proyectado > alto * 0.45 || velocidad > 600;

    el.sheet.style.transition = '';
    if (debeCerrar) {
      el.dialog.removeAttribute('data-open');
      cancelarResorteHoja = animarConResorte(
        ultima.y, alto + 40, velocidad, { amortiguacion: 1, respuesta: 0.38 },
        (v) => { el.sheet.style.transform = `translateY(${v}px)`; },
        () => { try { el.dialog.close(); } catch (_) {} el.sheet.style.transform = ''; },
      );
    } else {
      cancelarResorteHoja = animarConResorte(
        ultima.y, 0, velocidad, { amortiguacion: 1, respuesta: 0.32 },
        (v) => { el.sheet.style.transform = `translateY(${v}px)`; },
        () => { el.sheet.style.transform = ''; },
      );
    }
    arrastre = null;
  }

  el.sheetHandle.addEventListener('pointerdown', iniciarArrastre);
  el.sheetHandle.addEventListener('pointermove', moverArrastre);
  el.sheetHandle.addEventListener('pointerup', soltarArrastre);
  el.sheetHandle.addEventListener('pointercancel', soltarArrastre);

  /* ------------------------------------------------------------ tema
     Tres estados persistentes en este dispositivo: sistema, claro, oscuro.
     El HTML ya aplicó el tema guardado antes de pintar (evita el parpadeo);
     aquí solo se sincroniza el control visual y se atienden los cambios. */
  const CLAVE_TEMA = 'ritchie-tema';
  const botonesTema = Array.from(el.themeToggle.querySelectorAll('button'));

  function temaGuardado() {
    try {
      const valor = localStorage.getItem(CLAVE_TEMA);
      return valor === 'claro' || valor === 'oscuro' ? valor : 'sistema';
    } catch (_) { return 'sistema'; }
  }

  function moverIndicadorTema(instantaneo) {
    const activo = el.themeToggle.querySelector('button[aria-pressed="true"]');
    if (!activo) return;
    // activo.offsetLeft ya es relativo a .theme-toggle (su offsetParent, por
    // ser el ancestro posicionado más cercano) — igual que la posición base
    // de la perilla. Nunca mezclar esto con .theme-toggle.offsetLeft: ese es
    // relativo a SU PROPIO offsetParent (el header, con position:sticky),
    // una referencia distinta que produce un desplazamiento absurdo.
    const x = activo.offsetLeft - 3;
    if (instantaneo) {
      el.themeThumb.style.transitionProperty = 'none';
      el.themeThumb.style.width = `${activo.offsetWidth}px`;
      el.themeThumb.style.transform = `translateX(${x}px)`;
      void el.themeThumb.offsetWidth; // fuerza a aplicar antes de reactivar la transición
      el.themeThumb.style.transitionProperty = '';
    } else {
      el.themeThumb.style.width = `${activo.offsetWidth}px`;
      el.themeThumb.style.transform = `translateX(${x}px)`;
    }
  }

  function aplicarTema(tema, { instantaneo = false, guardar = true } = {}) {
    if (tema === 'sistema') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = tema === 'claro' ? 'light' : 'dark';
    botonesTema.forEach((boton) => {
      const activo = boton.dataset.tema === tema;
      boton.setAttribute('aria-pressed', String(activo));
      boton.setAttribute('aria-checked', String(activo));
    });
    moverIndicadorTema(instantaneo);
    if (guardar) {
      try { localStorage.setItem(CLAVE_TEMA, tema); } catch (_) {}
    }
  }

  botonesTema.forEach((boton) => {
    boton.addEventListener('click', () => aplicarTema(boton.dataset.tema));
  });
  window.addEventListener('resize', () => moverIndicadorTema(true));
  aplicarTema(temaGuardado(), { instantaneo: true, guardar: false });

  /* ------------------------------------------------------------ barra
     Un solo estado (abierta/cerrada) que la persona controla con el botón
     del encabezado. La MISMA clase decide dos comportamientos distintos
     según el ancho de pantalla (ver styles.css): en escritorio encoge el
     ancho de la barra y empuja el contenido; en iPad vertical o teléfono
     se convierte en un cajón que se desliza encima, con velo detrás. */
  const CLAVE_BARRA = 'ritchie-barra';
  const esAngosto = () => window.matchMedia('(max-width: 900px)').matches;

  function barraPreferida() {
    try {
      const guardada = localStorage.getItem(CLAVE_BARRA);
      if (guardada === 'abierta' || guardada === 'cerrada') return guardada;
    } catch (_) { /* localStorage no disponible: se usa el valor por defecto */ }
    return esAngosto() ? 'cerrada' : 'abierta';
  }

  function aplicarBarra(estado, { guardar = true } = {}) {
    const cerrada = estado === 'cerrada';
    el.shell.classList.toggle('barra-cerrada', cerrada);
    el.sidebarToggle.setAttribute('aria-expanded', String(!cerrada));
    if (guardar) {
      try { localStorage.setItem(CLAVE_BARRA, estado); } catch (_) {}
    }
  }

  el.sidebarToggle.addEventListener('click', () => {
    const cerradaAhora = el.shell.classList.contains('barra-cerrada');
    aplicarBarra(cerradaAhora ? 'abierta' : 'cerrada');
  });
  el.sidebarScrim.addEventListener('click', () => aplicarBarra('cerrada'));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && esAngosto() && !el.shell.classList.contains('barra-cerrada')) {
      aplicarBarra('cerrada');
    }
  });
  aplicarBarra(barraPreferida(), { guardar: false });

  /** Pinta las categorías de activos en la barra lateral. Cada categoría es
   * un acordeón simple (la primera abierta de entrada); cada ejemplo es un
   * botón que hace la pregunta directamente y, en pantallas angostas,
   * cierra el cajón para dejar ver el resultado. */
  function renderBarraCategorias(categorias) {
    if (!categorias || !categorias.length) { el.sidebarCats.innerHTML = ''; return; }
    el.sidebarCats.innerHTML = categorias.map((cat, i) => `
      <div class="sidebar-cat" data-abierta="${i === 0 ? 'true' : 'false'}">
        <button type="button" class="sidebar-cat-head" aria-expanded="${i === 0 ? 'true' : 'false'}">
          <span>${esc(cat.etiqueta)}</span>
          <svg class="sidebar-cat-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6"/>
          </svg>
        </button>
        ${cat.descripcion ? `<p class="sidebar-cat-desc">${esc(cat.descripcion)}</p>` : ''}
        <ul class="sidebar-cat-list" ${i === 0 ? '' : 'hidden'}>
          ${(cat.ejemplos || []).map((texto) =>
            `<li><button type="button" class="sidebar-cat-item">${esc(texto)}</button></li>`
          ).join('')}
        </ul>
      </div>`).join('');

    el.sidebarCats.querySelectorAll('.sidebar-cat').forEach((catEl) => {
      const head = catEl.querySelector('.sidebar-cat-head');
      const list = catEl.querySelector('.sidebar-cat-list');
      head.addEventListener('click', () => {
        const abrir = catEl.dataset.abierta !== 'true';
        catEl.dataset.abierta = String(abrir);
        head.setAttribute('aria-expanded', String(abrir));
        show(list, abrir);
      });
    });

    el.sidebarCats.querySelectorAll('.sidebar-cat-item').forEach((boton) => {
      boton.addEventListener('click', () => {
        el.input.value = boton.textContent;
        ask(boton.textContent);
        if (esAngosto()) aplicarBarra('cerrada');
      });
    });
  }

  /* --------------------------------------------------------------- inicio */
  function iniciarChips(ejemplos, alClic) {
    el.chips.innerHTML = ejemplos.map(
      (texto) => `<button class="chip" type="button">${esc(texto)}</button>`,
    ).join('');
    el.chips.querySelectorAll('.chip').forEach((chip, i) => {
      chip.addEventListener('click', () => {
        el.input.value = chip.textContent;
        alClic(chip.textContent, i);
      });
    });
  }

  if (DEMO) {
    iniciarChips(DEMO.ejemplos.map((e) => e.pregunta), (texto) => ask(texto));
    renderBarraCategorias([{
      etiqueta: 'Vista previa',
      descripcion: 'Preguntas de ejemplo ya calculadas sobre series simuladas.',
      ejemplos: DEMO.ejemplos.map((e) => e.pregunta),
    }]);
    el.input.value = DEMO.ejemplos[0].pregunta;
    el.interp.hidden = false;
    el.interp.textContent = DEMO.aviso ||
      'Vista previa sin conexión: cada pregunta de ejemplo muestra un análisis ya calculado ' +
      'por el motor real sobre una serie simulada. La versión que corre en tu computadora sí ' +
      'analiza el activo real que escribas.';
    el.input.focus();
  } else {
    (async () => {
      try {
        const status = await (await fetch('/api/estado')).json();
        iniciarChips(status.ejemplos || [], (texto) => ask(texto));
        renderBarraCategorias(status.categorias || []);
        if (status.datos_simulados_permitidos) {
          el.interp.hidden = false;
          el.interp.textContent =
            'Modo con datos simulados habilitado: lo que veas no corresponde a ningún mercado real.';
        }
      } catch (_) { /* la interfaz sigue siendo usable sin los ejemplos */ }
      el.input.focus();
    })();
  }
})();

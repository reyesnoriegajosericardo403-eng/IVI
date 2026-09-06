/* ==========================================================================
   Selector Interactivo de Técnicas de Diagnóstico Organizacional
   Lógica de la SPA: estado, árbol de decisión, cálculo de resultados,
   gráfico de dona SVG, exportación a PDF y copia al portapapeles.
   ========================================================================== */

'use strict';

/* ---------------------------------------------------------------------- */
/* 1. BASE DE DATOS: TÉCNICAS                                              */
/* ---------------------------------------------------------------------- */

const TECHNIQUES = {
  FODA: {
    nombre: 'Análisis FODA (SWOT)',
    slogan: 'Tu mapa de navegación estratégico definitivo',
    pitch: '¡Esta es la herramienta exacta que tu organización necesita hoy! Has indicado la necesidad de equilibrar tus capacidades internas con el entorno cambiante. El Análisis FODA no es un simple ejercicio de lista; es el pivote estratégico que transformará tus vulnerabilidades en ventajas competitivas y alineará a todo tu equipo hacia las oportunidades de mayor impacto.',
    beneficio: 'Visión 360° sin cegueras operativas ni omisión de riesgos externos.',
    pasos: [
      'Realizar taller cualitativo con líderes clave.',
      'Cruzar fortalezas con oportunidades (Estrategia FO).',
      'Establecer plan de mitigación para debilidades y amenazas.'
    ],
    color: '#2563EB'
  },
  PESTEL: {
    nombre: 'Análisis PESTEL',
    slogan: 'Anticipación estratégica frente a la incertidumbre del entorno',
    pitch: 'Si el entorno está cambiando las reglas del juego, intentar resolver tus retos solo mirando hacia adentro es un riesgo innecesario. PESTEL es tu radar de alta precisión. Te permitirá blindar a la empresa ante regulaciones, cambios económicos y tecnológicos, convirtiendo las amenazas del mercado en tus próximas grandes oportunidades de innovación.',
    beneficio: 'Toma de decisiones proactiva que evita pérdidas por imprevistos macroeconómicos.',
    pasos: [
      'Mapear las 6 dimensiones macroeconómicas no controlables.',
      'Evaluar el nivel de impacto de las regulaciones y tendencias tecnológicas.',
      'Diseñar planes de contingencia para riesgos legislativos y de mercado.'
    ],
    color: '#0891B2'
  },
  Benchmarking: {
    nombre: 'Benchmarking Competitivo',
    slogan: 'Acelera tus resultados aprendiendo de los mejores de la industria',
    pitch: '¿Por qué reinventar la rueda cuando puedes adoptar los estándares de las organizaciones líderes? El Benchmarking es tu atajo directo a la excelencia. Al comparar tus procesos clave contra la vanguardia del sector, descubrirás brechas de rendimiento exactas y podrás implementar las mejores prácticas comprobadas con el menor margen de error.',
    beneficio: 'Crecimiento acelerado reduciendo la curva de aprendizaje operativo.',
    pasos: [
      'Seleccionar los procesos e indicadores críticos a comparar.',
      'Identificar las empresas líderes de referencia (competencia o de otro sector).',
      'Adaptar e implementar las mejores prácticas detectadas.'
    ],
    color: '#059669'
  },
  Ishikawa: {
    nombre: 'Diagrama de Ishikawa (Causa-Efecto)',
    slogan: 'Cirugía de precisión para eliminar la ineficiencia y las fallas',
    pitch: 'Tus síntomas de retrabajo, quejas o retrasos tienen una causa origen explícita, y el Diagrama de Ishikawa es la herramienta médica por excelencia para encontrarla. Deja de poner parches temporales a los problemas. Con este instrumento desarmarás la complejidad de tus operaciones en las 6 M y erradicarás la causa raíz de raíz.',
    beneficio: 'Eliminación directa de desperdicios, cuellos de botella y costos ocultos.',
    pasos: [
      'Definir con precisión el problema central o defecto a resolver.',
      "Categorizar las posibles causas en las 6 M (Mano de obra, Método, etc.).",
      "Aplicar la técnica de los '5 Porqué' hasta hallar la causa raíz."
    ],
    color: '#D97706'
  },
  Cadena_de_Valor: {
    nombre: 'Análisis de la Cadena de Valor (Porter)',
    slogan: 'Maximización de márgenes y eficiencia operativa por proceso',
    pitch: 'Si tu volumen de ventas no se traduce en los márgenes de utilidad esperados, la Cadena de Valor de Porter es tu aliado indispensable. Esta técnica audita quirúrgicamente cada eslabón de tus actividades primarias y de soporte para identificar exactamente dónde estás perdiendo dinero y en qué punto generas la verdadera ventaja competitiva.',
    beneficio: 'Optimización de costos y rentabilidad sostenible en cada proceso.',
    pasos: [
      'Descomponer la empresa en actividades primarias y de soporte.',
      'Asignar costos y generadores de valor a cada eslabón.',
      'Optimizar los enlaces para reducir gastos y aumentar el margen.'
    ],
    color: '#7C3AED'
  },
  Matriz_BCG: {
    nombre: 'Matriz BCG (Boston Consulting Group)',
    slogan: 'Optimización estratégica de tu portafolio de inversión',
    pitch: 'No todos tus productos o servicios merecen el mismo capital y esfuerzo. La Matriz BCG es la brújula financiera y comercial que necesitas para saber exactamente dónde invertir para crecer, qué líneas mantener para generar flujo constante y de cuáles desinvertir de inmediato para frenar el goteo de recursos.',
    beneficio: 'Asignación inteligente del presupuesto para maximizar el retorno de inversión.',
    pasos: [
      'Clasificar cada producto/servicio por su cuota de mercado y tasa de crecimiento.',
      'Ubicarlos en los cuadrantes: Estrella, Vaca, Incógnita o Perro.',
      'Definir estrategias de inversión, mantenimiento o retiro.'
    ],
    color: '#DB2777'
  }
};

const ICONS = {
  FODA: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>',
  PESTEL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18"/><path d="M12 3c-3 3-3 15 0 18"/></svg>',
  Benchmarking: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M20 20V8"/></svg>',
  Ishikawa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h16"/><path d="M18 12l4-3M18 12l4 3"/><path d="M6 12L2 7M6 12l-4 5"/><path d="M11 12L8 6M11 12l-3 6"/><path d="M15 12l-3-6M15 12l-3 6"/></svg>',
  Cadena_de_Valor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="9" width="7" height="6" rx="3"/><rect x="9" y="9" width="7" height="6" rx="3"/><rect x="16" y="9" width="6" height="6" rx="3"/></svg>',
  Matriz_BCG: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>'
};

/* ---------------------------------------------------------------------- */
/* 2. BASE DE DATOS: ÁRBOL DE DECISIÓN (10 NODOS)                          */
/* ---------------------------------------------------------------------- */

const QUESTIONS = [
  {
    nodo: 1,
    pregunta: '¿En qué área se manifiesta la situación más urgente que motiva este diagnóstico?',
    opciones: [
      { id: 'N1_A', texto: 'En la operación diaria, fallas en el servicio/producto o elevados costos internos.', puntuacion: { Ishikawa: 3, Cadena_de_Valor: 3, FODA: 1 } },
      { id: 'N1_B', texto: 'En la presión de competidores, cambios del mercado o nuevas regulaciones.', puntuacion: { PESTEL: 3, Benchmarking: 3 } },
      { id: 'N1_C', texto: 'En la definición de rumbo, crecimiento del negocio o gestión de varios productos/servicios.', puntuacion: { FODA: 3, Matriz_BCG: 3 } }
    ]
  },
  {
    nodo: 2,
    pregunta: '¿Cuál es la principal interrogante que la dirección necesita responder?',
    opciones: [
      { id: 'N2_A', texto: '¿Por qué están ocurriendo errores o retrasos específicos en nuestros procesos?', puntuacion: { Ishikawa: 4 } },
      { id: 'N2_B', texto: '¿Cómo se comparan nuestros costos y márgenes frente al valor que entregamos?', puntuacion: { Cadena_de_Valor: 4 } },
      { id: 'N2_C', texto: '¿Cómo nos afectan las variables externas no controlables?', puntuacion: { PESTEL: 4 } },
      { id: 'N2_D', texto: '¿Qué productos o servicios debemos impulsar, mantener o retirar?', puntuacion: { Matriz_BCG: 4 } }
    ]
  },
  {
    nodo: 3,
    pregunta: '¿Qué nivel de profundidad se busca en esta evaluación?',
    opciones: [
      { id: 'N3_A', texto: 'Un mapa general equilibrado de fortalezas, debilidades, oportunidades y amenazas.', puntuacion: { FODA: 4 } },
      { id: 'N3_B', texto: 'Un análisis comparativo detallado contra los líderes del sector.', puntuacion: { Benchmarking: 4 } },
      { id: 'N3_C', texto: 'Una revisión causa-efecto en una línea de producción o área operativa.', puntuacion: { Ishikawa: 3 } },
      { id: 'N3_D', texto: 'Un análisis detallado de la cadena de suministro y soporte interno.', puntuacion: { Cadena_de_Valor: 3 } }
    ]
  },
  {
    nodo: 4,
    pregunta: '¿Qué tan relevante es el impacto de factores macro (política, economía, tecnología, leyes) en su situación actual?',
    opciones: [
      { id: 'N4_A', texto: 'Crítico; los cambios externos amenazan o transforman el modelo de negocio.', puntuacion: { PESTEL: 4 } },
      { id: 'N4_B', texto: 'Moderado; competimos en un mercado estable pero exigente.', puntuacion: { Benchmarking: 2, FODA: 2 } },
      { id: 'N4_C', texto: 'Secundario; el verdadero reto reside en la eficiencia interna.', puntuacion: { Ishikawa: 2, Cadena_de_Valor: 2 } }
    ]
  },
  {
    nodo: 5,
    pregunta: '¿Se cuenta con datos o referencias sobre el desempeño de la competencia en el sector?',
    opciones: [
      { id: 'N5_A', texto: 'Sí, y queremos adaptar las mejores prácticas del mercado.', puntuacion: { Benchmarking: 4 } },
      { id: 'N5_B', texto: 'No, el enfoque debe estar 100% centrado en nuestros propios recursos e indicadores.', puntuacion: { Cadena_de_Valor: 2, Ishikawa: 2 } },
      { id: 'N5_C', texto: 'Requerimos primero un marco situacional amplio antes de compararnos externamente.', puntuacion: { FODA: 3 } }
    ]
  },
  {
    nodo: 6,
    pregunta: '¿Cómo está estructurada la oferta comercial de la empresa?',
    opciones: [
      { id: 'N6_A', texto: 'Un solo producto/servicio o un catálogo homogéneo.', puntuacion: { FODA: 1, Cadena_de_Valor: 1, Ishikawa: 1 } },
      { id: 'N6_B', texto: 'Múltiples líneas de productos/servicios con diferentes niveles de venta y crecimiento.', puntuacion: { Matriz_BCG: 4 } },
      { id: 'N6_C', texto: 'Ofrecemos servicios/productos donde la clave es el tiempo de respuesta y la calidad operativa.', puntuacion: { Ishikawa: 3 } }
    ]
  },
  {
    nodo: 7,
    pregunta: 'Si tuviera que señalar el síntoma más claro de ineficiencia, ¿cuál sería?',
    opciones: [
      { id: 'N7_A', texto: 'Quejas recurrentes de clientes, desperdicio de insumos o cuellos de botella.', puntuacion: { Ishikawa: 4 } },
      { id: 'N7_B', texto: 'Margen de ganancia bajo a pesar de un alto volumen de ventas.', puntuacion: { Cadena_de_Valor: 4 } },
      { id: 'N7_C', texto: 'Desconocimiento de oportunidades emergentes en el mercado.', puntuacion: { PESTEL: 3, FODA: 2 } },
      { id: 'N7_D', texto: 'Falta de claridad en qué unidades de negocio generan flujo de caja real.', puntuacion: { Matriz_BCG: 4 } }
    ]
  },
  {
    nodo: 8,
    pregunta: '¿Con qué nivel de documentación e indicadores cuenta actualmente la organización?',
    opciones: [
      { id: 'N8_A', texto: 'Sin indicadores formales; requerimos una evaluación cualitativa inicial.', puntuacion: { FODA: 3, PESTEL: 3 } },
      { id: 'N8_B', texto: 'Procesos estandarizados donde es posible rastrear el origen de fallas técnicas.', puntuacion: { Ishikawa: 3 } },
      { id: 'N8_C', texto: 'Información financiera y de costos disponible por cada actividad o departamento.', puntuacion: { Cadena_de_Valor: 3, Matriz_BCG: 3 } }
    ]
  },
  {
    nodo: 9,
    pregunta: '¿Qué tipo de entregable espera obtener la alta dirección tras aplicar la técnica?',
    opciones: [
      { id: 'N9_A', texto: 'Un plan de acción correctivo e inmediato sobre causas específicas.', puntuacion: { Ishikawa: 4 } },
      { id: 'N9_B', texto: 'Un plan estratégico integral de alineación institucional.', puntuacion: { FODA: 4 } },
      { id: 'N9_C', texto: 'Un rediseño de actividades de valor y optimización de costos.', puntuacion: { Cadena_de_Valor: 4 } },
      { id: 'N9_D', texto: 'Una matriz de inversión y asignación de recursos presupuestales.', puntuacion: { Matriz_BCG: 4 } }
    ]
  },
  {
    nodo: 10,
    pregunta: '¿Cuál es la ventana de tiempo prioritaria para ver resultados del diagnóstico?',
    opciones: [
      { id: 'N10_A', texto: 'Inmediata / Corto plazo (Solución de problemas tácticos concretos).', puntuacion: { Ishikawa: 3, Benchmarking: 3 } },
      { id: 'N10_B', texto: 'Mediano plazo (Optimización de rentabilidad y procesos internos).', puntuacion: { Cadena_de_Valor: 3, FODA: 2 } },
      { id: 'N10_C', texto: 'Largo plazo (Estrategia corporativa, entorno y portafolio).', puntuacion: { PESTEL: 3, Matriz_BCG: 3 } }
    ]
  }
];

/* ---------------------------------------------------------------------- */
/* 3. ESTADO GLOBAL                                                        */
/* ---------------------------------------------------------------------- */

const state = {
  currentNode: 0,       // índice 0-based dentro de QUESTIONS
  answers: new Array(QUESTIONS.length).fill(null), // optionId seleccionado por nodo
  result: null          // se llena al terminar el cuestionario
};

/* ---------------------------------------------------------------------- */
/* 4. NAVEGACIÓN ENTRE VISTAS                                              */
/* ---------------------------------------------------------------------- */

function showView(id) {
  document.querySelectorAll('.view').forEach(section => {
    section.classList.toggle('hidden', section.id !== id);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------------------------------------------------------------- */
/* 5. CUESTIONARIO                                                         */
/* ---------------------------------------------------------------------- */

function startQuiz() {
  state.currentNode = 0;
  state.answers = new Array(QUESTIONS.length).fill(null);
  showView('quiz');
  renderNode();
}

function renderNode() {
  const node = QUESTIONS[state.currentNode];
  const total = QUESTIONS.length;
  const stepLabel = document.getElementById('quiz-step-label');
  const percentLabel = document.getElementById('quiz-percent-label');
  const progressBar = document.getElementById('quiz-progress-bar');
  const questionEl = document.getElementById('quiz-question');
  const optionsEl = document.getElementById('quiz-options');
  const backBtn = document.getElementById('btn-quiz-back');
  const nextBtn = document.getElementById('btn-quiz-next');

  stepLabel.textContent = `Pregunta ${state.currentNode + 1} de ${total}`;
  const progressPct = Math.round((state.currentNode / total) * 100);
  percentLabel.textContent = `${progressPct}%`;
  progressBar.style.width = `${progressPct}%`;

  questionEl.textContent = node.pregunta;
  optionsEl.innerHTML = '';

  const selected = state.answers[state.currentNode];

  node.opciones.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quiz-option' + (selected === opt.id ? ' selected' : '');
    btn.setAttribute('aria-pressed', selected === opt.id ? 'true' : 'false');
    btn.innerHTML = `<span class="option-dot"></span><span>${opt.texto}</span>`;
    btn.addEventListener('click', () => selectOption(opt.id));
    optionsEl.appendChild(btn);
  });

  backBtn.style.visibility = state.currentNode === 0 ? 'hidden' : 'visible';
  nextBtn.disabled = selected === null;
  nextBtn.textContent = state.currentNode === total - 1 ? 'Ver resultado →' : 'Siguiente →';
}

function selectOption(optionId) {
  state.answers[state.currentNode] = optionId;
  renderNode();
}

function goNext() {
  if (state.answers[state.currentNode] === null) return;
  if (state.currentNode === QUESTIONS.length - 1) {
    finishQuiz();
  } else {
    state.currentNode += 1;
    renderNode();
  }
}

function goBack() {
  if (state.currentNode === 0) return;
  state.currentNode -= 1;
  renderNode();
}

/* ---------------------------------------------------------------------- */
/* 6. CÁLCULO DE RESULTADOS                                                */
/* ---------------------------------------------------------------------- */

function computeMaxPossiblePerTechnique() {
  const maxPerTechnique = {};
  QUESTIONS.forEach(node => {
    const nodeMax = {};
    node.opciones.forEach(opt => {
      Object.entries(opt.puntuacion).forEach(([tech, pts]) => {
        nodeMax[tech] = Math.max(nodeMax[tech] || 0, pts);
      });
    });
    Object.entries(nodeMax).forEach(([tech, pts]) => {
      maxPerTechnique[tech] = (maxPerTechnique[tech] || 0) + pts;
    });
  });
  return maxPerTechnique;
}

function finishQuiz() {
  const scores = {};
  Object.keys(TECHNIQUES).forEach(tech => { scores[tech] = 0; });

  state.answers.forEach((optionId, nodeIndex) => {
    const node = QUESTIONS[nodeIndex];
    const opt = node.opciones.find(o => o.id === optionId);
    if (!opt) return;
    Object.entries(opt.puntuacion).forEach(([tech, pts]) => {
      scores[tech] += pts;
    });
  });

  const maxPerTechnique = computeMaxPossiblePerTechnique();

  const ranking = Object.keys(scores)
    .map(tech => ({
      tech,
      score: scores[tech],
      maxPosible: maxPerTechnique[tech] || 1,
      matchPct: Math.min(100, Math.round((scores[tech] / (maxPerTechnique[tech] || 1)) * 100))
    }))
    .sort((a, b) => b.score - a.score);

  state.result = {
    scores,
    maxPerTechnique,
    ranking,
    principal: ranking[0],
    secundaria: ranking[1]
  };

  showView('results');
  renderResults();
}

/* ---------------------------------------------------------------------- */
/* 7. DASHBOARD DE RESULTADOS                                              */
/* ---------------------------------------------------------------------- */

function techniqueCardHTML(entry, isPrincipal) {
  const t = TECHNIQUES[entry.tech];
  const badge = isPrincipal
    ? `<span class="inline-block px-3 py-1 rounded-full bg-[--primary-blue] text-white text-xs font-bold uppercase tracking-wide mb-4">Técnica principal recomendada · ${entry.matchPct}% de compatibilidad</span>`
    : `<span class="inline-block px-3 py-1 rounded-full bg-slate-100 text-[--text-muted] text-xs font-bold uppercase tracking-wide mb-4">Técnica secundaria · ${entry.matchPct}% de compatibilidad</span>`;

  return `
    ${badge}
    <div class="flex items-start gap-4 mb-4">
      <div class="ficha-icon" style="background:${t.color}1A;color:${t.color}">${ICONS[entry.tech]}</div>
      <div>
        <h3 class="text-2xl font-extrabold text-[--primary-dark-blue]">${t.nombre}</h3>
        <p class="text-[--text-muted] italic">${t.slogan}</p>
      </div>
    </div>
    <p class="text-[--text-main] leading-relaxed mb-5">${t.pitch}</p>
    <p class="font-semibold text-[--primary-dark-blue] mb-4">✓ Beneficio clave: <span class="font-normal text-[--text-muted]">${t.beneficio}</span></p>
    <p class="font-bold text-sm uppercase tracking-wide text-[--text-muted] mb-2">Pasos de ejecución</p>
    <ol class="ficha-steps">
      ${t.pasos.map(p => `<li>${p}</li>`).join('')}
    </ol>
  `;
}

function renderResults() {
  const { principal, secundaria } = state.result;

  document.getElementById('result-primary-card').innerHTML = techniqueCardHTML(principal, true);
  document.getElementById('result-secondary-card').innerHTML = techniqueCardHTML(secundaria, false);
  document.getElementById('print-date').textContent = `Generado el ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`;

  renderDonutChart();
}

function renderDonutChart() {
  const svg = document.getElementById('donut-chart');
  const legend = document.getElementById('donut-legend');
  svg.innerHTML = '';
  legend.innerHTML = '';

  const { ranking } = state.result;
  const visible = ranking.filter(r => r.score > 0);
  const totalScore = visible.reduce((sum, r) => sum + r.score, 0) || 1;

  const cx = 110, cy = 110, r = 80;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;

  const svgNS = 'http://www.w3.org/2000/svg';

  // pista base
  const track = document.createElementNS(svgNS, 'circle');
  track.setAttribute('cx', cx);
  track.setAttribute('cy', cy);
  track.setAttribute('r', r);
  track.setAttribute('fill', 'none');
  track.setAttribute('stroke', '#E2E8F0');
  track.setAttribute('stroke-width', '22');
  svg.appendChild(track);

  visible.forEach(entry => {
    const t = TECHNIQUES[entry.tech];
    const share = entry.score / totalScore;
    const dash = share * circumference;
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', t.color);
    circle.setAttribute('stroke-width', '22');
    circle.setAttribute('stroke-dasharray', `${dash} ${circumference - dash}`);
    circle.setAttribute('stroke-dashoffset', `${-cumulative}`);
    circle.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
    circle.dataset.tech = entry.tech;
    circle.addEventListener('mouseenter', () => highlightTechnique(entry.tech));
    circle.addEventListener('mouseleave', () => highlightTechnique(null));
    svg.appendChild(circle);
    cumulative += dash;
  });

  const centerName = document.createElementNS(svgNS, 'text');
  centerName.setAttribute('x', cx);
  centerName.setAttribute('y', cy - 6);
  centerName.setAttribute('text-anchor', 'middle');
  centerName.setAttribute('font-size', '13');
  centerName.setAttribute('font-weight', '700');
  centerName.setAttribute('fill', '#0F172A');
  centerName.textContent = state.result.principal.tech.replace(/_/g, ' ');
  svg.appendChild(centerName);

  const centerPct = document.createElementNS(svgNS, 'text');
  centerPct.setAttribute('x', cx);
  centerPct.setAttribute('y', cy + 20);
  centerPct.setAttribute('text-anchor', 'middle');
  centerPct.setAttribute('font-size', '26');
  centerPct.setAttribute('font-weight', '800');
  centerPct.setAttribute('fill', '#2563EB');
  centerPct.textContent = `${state.result.principal.matchPct}%`;
  svg.appendChild(centerPct);

  visible.forEach(entry => {
    const t = TECHNIQUES[entry.tech];
    const row = document.createElement('div');
    row.className = 'legend-item';
    row.dataset.tech = entry.tech;
    row.innerHTML = `
      <span class="flex items-center gap-3">
        <span class="legend-dot" style="background:${t.color}"></span>
        <span class="font-medium text-sm">${t.nombre}</span>
      </span>
      <span class="font-bold text-sm" style="color:${t.color}">${entry.matchPct}%</span>
    `;
    row.addEventListener('mouseenter', () => highlightTechnique(entry.tech));
    row.addEventListener('mouseleave', () => highlightTechnique(null));
    legend.appendChild(row);
  });
}

function highlightTechnique(tech) {
  document.querySelectorAll('#donut-chart circle[data-tech]').forEach(c => {
    c.classList.toggle('dimmed', tech !== null && c.dataset.tech !== tech);
    c.classList.toggle('highlighted', tech !== null && c.dataset.tech === tech);
  });
  document.querySelectorAll('.legend-item').forEach(el => {
    el.classList.toggle('highlighted', tech !== null && el.dataset.tech === tech);
  });
}

/* ---------------------------------------------------------------------- */
/* 8. EXPORTAR PDF / COPIAR AL PORTAPAPELES / TOAST                        */
/* ---------------------------------------------------------------------- */

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
}

function exportPDF() {
  window.print();
}

async function copyResults() {
  const { principal, secundaria } = state.result;
  const tp = TECHNIQUES[principal.tech];
  const ts = TECHNIQUES[secundaria.tech];
  const summary =
`📊 Diagnóstico Organizacional — Resultado

Técnica principal recomendada: ${tp.nombre} (${principal.matchPct}% de compatibilidad)
"${tp.slogan}"

Técnica secundaria: ${ts.nombre} (${secundaria.matchPct}% de compatibilidad)

Generado con el Selector Interactivo de Técnicas de Diagnóstico Organizacional
FCA UNAM — 32ª Semana Académica Interdisciplinaria
${window.location.href}`;

  try {
    await navigator.clipboard.writeText(summary);
    showToast('Resumen copiado al portapapeles');
  } catch (err) {
    showToast('No se pudo copiar automáticamente. Selecciona y copia manualmente.');
  }
}

function restartQuiz() {
  state.result = null;
  showView('hero');
}

/* ---------------------------------------------------------------------- */
/* 9. REPOSITORIO DE FICHAS ACADÉMICAS                                     */
/* ---------------------------------------------------------------------- */

function renderFichas() {
  const grid = document.getElementById('fichas-grid');
  grid.innerHTML = Object.entries(TECHNIQUES).map(([key, t]) => `
    <article class="ficha-card">
      <div class="ficha-icon" style="background:${t.color}1A;color:${t.color}">${ICONS[key]}</div>
      <h3 class="text-lg font-bold text-[--primary-dark-blue] mb-1">${t.nombre}</h3>
      <p class="text-sm italic text-[--text-muted] mb-3">${t.slogan}</p>
      <p class="text-sm text-[--text-main] mb-4 flex-1">${t.pitch}</p>
      <p class="text-sm font-semibold text-[--primary-dark-blue] mb-3">✓ ${t.beneficio}</p>
      <p class="text-xs font-bold uppercase tracking-wide text-[--text-muted] mb-2">Pasos de ejecución</p>
      <ol class="ficha-steps">
        ${t.pasos.map(p => `<li>${p}</li>`).join('')}
      </ol>
    </article>
  `).join('');
}

function renderHeroTechniquesList() {
  const list = document.getElementById('hero-techniques-list');
  list.innerHTML = Object.entries(TECHNIQUES).map(([key, t]) => `
    <div class="flex items-center gap-3 text-white">
      <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15" style="color:white">${ICONS[key]}</span>
      <span class="text-sm font-medium">${t.nombre}</span>
    </div>
  `).join('');
}

/* ---------------------------------------------------------------------- */
/* 10. INICIALIZACIÓN                                                      */
/* ---------------------------------------------------------------------- */

function init() {
  document.getElementById('footer-year').textContent = new Date().getFullYear();

  renderFichas();
  renderHeroTechniquesList();
  showView('hero');

  document.getElementById('btn-start-quiz').addEventListener('click', startQuiz);
  document.getElementById('btn-nav-cta').addEventListener('click', startQuiz);
  document.getElementById('btn-quiz-back').addEventListener('click', goBack);
  document.getElementById('btn-quiz-next').addEventListener('click', goNext);
  document.getElementById('btn-export-pdf').addEventListener('click', exportPDF);
  document.getElementById('btn-copy-results').addEventListener('click', copyResults);
  document.getElementById('btn-restart').addEventListener('click', restartQuiz);
  document.getElementById('btn-view-fichas').addEventListener('click', () => {
    document.getElementById('fichas').scrollIntoView({ behavior: 'smooth' });
  });

  document.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = link.getAttribute('data-nav');
      if (target === 'hero') {
        e.preventDefault();
        showView('hero');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', init);

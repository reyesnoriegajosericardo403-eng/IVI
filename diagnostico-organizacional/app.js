/* ==========================================================================
   Selector Interactivo de Técnicas de Diagnóstico Organizacional
   Estado, árbol de decisión, cálculo de resultados, gráfico de dona SVG
   animado, modal de fichas, exportación a PDF y copia al portapapeles.
   ========================================================================== */

'use strict';

/* ---------------------------------------------------------------------- */
/* 1. BASE DE DATOS: TÉCNICAS                                              */
/* ---------------------------------------------------------------------- */

const TECHNIQUES = {
  FODA: {
    nombre: 'Análisis FODA (SWOT)',
    slogan: 'Tu mapa de navegación estratégico',
    pitch: 'Equilibra tus capacidades internas con un entorno que cambia constantemente. El Análisis FODA transforma vulnerabilidades en ventajas competitivas y alinea a todo tu equipo hacia las oportunidades de mayor impacto.',
    beneficio: 'Visión de 360° sin puntos ciegos operativos ni riesgos externos ignorados.',
    pasos: [
      'Realizar un taller cualitativo con los líderes clave.',
      'Cruzar fortalezas con oportunidades (estrategia FO).',
      'Establecer un plan de mitigación para debilidades y amenazas.'
    ],
    color: '#2563EB',
    gradient: 'linear-gradient(160deg, #1E3A8A 0%, #2563EB 55%, #60A5FA 100%)'
  },
  PESTEL: {
    nombre: 'Análisis PESTEL',
    slogan: 'Anticipación frente a la incertidumbre del entorno',
    pitch: 'Cuando el entorno cambia las reglas del juego, mirar solo hacia adentro es un riesgo innecesario. PESTEL es tu radar de alta precisión: blinda a la empresa ante regulaciones y cambios económicos o tecnológicos, y convierte las amenazas del mercado en oportunidades de innovación.',
    beneficio: 'Decisiones proactivas que evitan pérdidas por imprevistos macroeconómicos.',
    pasos: [
      'Mapear las 6 dimensiones macroeconómicas no controlables.',
      'Evaluar el nivel de impacto de regulaciones y tendencias tecnológicas.',
      'Diseñar planes de contingencia para riesgos legislativos y de mercado.'
    ],
    color: '#0891B2',
    gradient: 'linear-gradient(160deg, #075985 0%, #0891B2 55%, #67E8F9 100%)'
  },
  Benchmarking: {
    nombre: 'Benchmarking Competitivo',
    slogan: 'Acelera resultados aprendiendo de los mejores',
    pitch: 'No hace falta reinventar la rueda cuando puedes adoptar los estándares de las organizaciones líderes. Al comparar tus procesos clave contra la vanguardia del sector, identificas brechas de rendimiento exactas y adoptas mejores prácticas con el menor margen de error.',
    beneficio: 'Crecimiento acelerado reduciendo la curva de aprendizaje operativo.',
    pasos: [
      'Seleccionar los procesos e indicadores críticos a comparar.',
      'Identificar empresas líderes de referencia (del sector o de otro).',
      'Adaptar e implementar las mejores prácticas detectadas.'
    ],
    color: '#059669',
    gradient: 'linear-gradient(160deg, #065F46 0%, #059669 55%, #6EE7B7 100%)'
  },
  Ishikawa: {
    nombre: 'Diagrama de Ishikawa (Causa-Efecto)',
    slogan: 'Precisión para eliminar ineficiencia y fallas',
    pitch: 'Los síntomas de retrabajo, quejas o retrasos tienen una causa origen explícita, y el Diagrama de Ishikawa es la herramienta por excelencia para encontrarla. En lugar de parches temporales, desarma la complejidad de tus operaciones en las 6 M y llega a la causa raíz.',
    beneficio: 'Eliminación directa de desperdicios, cuellos de botella y costos ocultos.',
    pasos: [
      'Definir con precisión el problema central o defecto a resolver.',
      'Categorizar las posibles causas en las 6 M (mano de obra, método, etc.).',
      "Aplicar la técnica de los '5 porqués' hasta hallar la causa raíz."
    ],
    color: '#D97706',
    gradient: 'linear-gradient(160deg, #92400E 0%, #D97706 55%, #FCD34D 100%)'
  },
  Cadena_de_Valor: {
    nombre: 'Cadena de Valor (Porter)',
    slogan: 'Maximización de márgenes y eficiencia',
    pitch: 'Cuando el volumen de ventas no se traduce en los márgenes esperados, la Cadena de Valor de Porter es la herramienta indicada: audita cada eslabón de las actividades primarias y de soporte para identificar dónde se pierde dinero y dónde se genera la verdadera ventaja competitiva.',
    beneficio: 'Optimización de costos y rentabilidad sostenible en cada proceso.',
    pasos: [
      'Descomponer la empresa en actividades primarias y de soporte.',
      'Asignar costos y generadores de valor a cada eslabón.',
      'Optimizar los enlaces para reducir gastos y aumentar el margen.'
    ],
    color: '#7C3AED',
    gradient: 'linear-gradient(160deg, #4C1D95 0%, #7C3AED 55%, #C4B5FD 100%)'
  },
  Matriz_BCG: {
    nombre: 'Matriz BCG',
    slogan: 'Optimización del portafolio de inversión',
    pitch: 'No todos los productos o servicios merecen el mismo capital y esfuerzo. La Matriz BCG es la brújula financiera y comercial para saber dónde invertir para crecer, qué líneas mantener para generar flujo constante y de cuáles desinvertir para frenar la fuga de recursos.',
    beneficio: 'Asignación inteligente del presupuesto para maximizar el retorno de inversión.',
    pasos: [
      'Clasificar cada producto o servicio por cuota de mercado y crecimiento.',
      'Ubicarlos en los cuadrantes: Estrella, Vaca, Incógnita o Perro.',
      'Definir estrategias de inversión, mantenimiento o retiro.'
    ],
    color: '#DB2777',
    gradient: 'linear-gradient(160deg, #831843 0%, #DB2777 55%, #F9A8D4 100%)'
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

/* Iconos de interfaz (sin emojis) */
const UI = {
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6-8.5"/><path d="M21 3v6h-6"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v5h5"/><path d="M6 3h8l5 5v13H6z"/><path d="M9 13h6M9 17h6"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="4" width="10" height="16" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 10-10"/></svg>',
  externalLink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4L10 14"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></svg>'
};

/* ---------------------------------------------------------------------- */
/* 2. METODOLOGÍA Y FUENTES                                                */
/* ---------------------------------------------------------------------- */

const REFERENCES = [
  {
    institucion: 'McKinsey & Company',
    marco: 'McKinsey 7S Framework',
    nota: 'Estrategia, estructura, sistemas, valores compartidos, habilidades, personal y estilo: el marco de referencia de la consultoría estratégica para el diagnóstico organizacional integral.',
    url: 'https://www.mckinsey.com/'
  },
  {
    institucion: 'APQC',
    marco: 'Process Classification Framework (PCF) y Open Standards Benchmarking',
    nota: 'El estándar internacional para clasificar procesos de negocio y compararlos contra el desempeño de otras organizaciones del sector.',
    url: 'https://www.apqc.org/'
  },
  {
    institucion: 'OCDE',
    marco: 'SME and Entrepreneurship Policy and Evaluation Framework',
    nota: 'Marco de evaluación de políticas para pequeñas y medianas empresas, usado como referencia para el análisis del entorno macroeconómico (PESTEL).',
    url: 'https://www.oecd.org/'
  }
];

/* ---------------------------------------------------------------------- */
/* 3. BASE DE DATOS: ÁRBOL DE DECISIÓN (10 NODOS)                          */
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
/* 4. ESTADO GLOBAL                                                        */
/* ---------------------------------------------------------------------- */

const state = {
  currentNode: 0,
  answers: new Array(QUESTIONS.length).fill(null),
  result: null,
  advanceTimer: null
};

const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------------- */
/* 5. NAVEGACIÓN ENTRE VISTAS                                              */
/* ---------------------------------------------------------------------- */

function showView(id) {
  document.querySelectorAll('.view').forEach(section => {
    if (section.id === id) {
      section.hidden = false;
      section.classList.add('entering');
      requestAnimationFrame(() => requestAnimationFrame(() => section.classList.remove('entering')));
    } else {
      section.hidden = true;
    }
  });
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/* ---------------------------------------------------------------------- */
/* 6. CUESTIONARIO (con avance automático)                                 */
/* ---------------------------------------------------------------------- */

const AUTO_ADVANCE_DELAY = 380;

function startQuiz() {
  state.currentNode = 0;
  state.answers = new Array(QUESTIONS.length).fill(null);
  clearTimeout(state.advanceTimer);
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

  backBtn.hidden = state.currentNode === 0;
}

function selectOption(optionId) {
  clearTimeout(state.advanceTimer);
  state.answers[state.currentNode] = optionId;
  renderNode();

  state.advanceTimer = setTimeout(() => {
    if (state.currentNode === QUESTIONS.length - 1) {
      finishQuiz();
    } else {
      state.currentNode += 1;
      renderNode();
    }
  }, AUTO_ADVANCE_DELAY);
}

function goBack() {
  clearTimeout(state.advanceTimer);
  if (state.currentNode === 0) return;
  state.currentNode -= 1;
  renderNode();
}

/* ---------------------------------------------------------------------- */
/* 7. CÁLCULO DE RESULTADOS                                                */
/* ---------------------------------------------------------------------- */

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

  // El % de compatibilidad es la participación de cada técnica sobre el total
  // de puntos obtenidos: así el ganador se distingue con claridad y el orden
  // de la lista siempre coincide con el porcentaje mostrado.
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0) || 1;

  const ranking = Object.keys(scores)
    .map(tech => ({
      tech,
      score: scores[tech],
      matchPct: Math.round((scores[tech] / totalScore) * 100)
    }))
    .sort((a, b) => b.score - a.score);

  state.result = {
    scores,
    ranking,
    principal: ranking[0],
    secundaria: ranking[1]
  };

  showView('results');
  renderResults();
}

/* ---------------------------------------------------------------------- */
/* 8. DASHBOARD DE RESULTADOS                                              */
/* ---------------------------------------------------------------------- */

function resultCardHTML(entry, kind) {
  const t = TECHNIQUES[entry.tech];
  const label = kind === 'principal' ? 'Técnica principal recomendada' : 'Técnica secundaria';
  return `
    <div class="editorial-icon">${ICONS[entry.tech]}</div>
    <div class="editorial-scrim"></div>
    <div class="editorial-content">
      <div class="editorial-meta">${label} · ${entry.matchPct}% de compatibilidad</div>
      <div class="editorial-title">${t.nombre}</div>
      <div class="editorial-slogan">${t.slogan}</div>
    </div>
  `;
}

function detailCardHTML(entry) {
  const t = TECHNIQUES[entry.tech];
  return `
    <p class="text-[--text-main] leading-relaxed mb-5">${t.pitch}</p>
    <p class="flex items-start gap-2 font-semibold text-[--primary-dark-blue] mb-4">
      <span class="inline-icon mt-0.5 text-[--primary-blue]">${UI.check}</span>
      <span><span class="font-semibold">Beneficio clave:</span> <span class="font-normal text-[--text-muted]">${t.beneficio}</span></span>
    </p>
    <p class="font-bold text-sm uppercase tracking-wide text-[--text-muted] mb-2">Pasos de ejecución</p>
    <ol class="ficha-steps">
      ${t.pasos.map(p => `<li>${p}</li>`).join('')}
    </ol>
  `;
}

function renderResults() {
  const { principal, secundaria } = state.result;
  const tp = TECHNIQUES[principal.tech];
  const ts = TECHNIQUES[secundaria.tech];

  const primaryCard = document.getElementById('result-primary-card');
  primaryCard.style.background = tp.gradient;
  primaryCard.innerHTML = resultCardHTML(principal, 'principal');

  const secondaryCard = document.getElementById('result-secondary-card');
  secondaryCard.style.background = ts.gradient;
  secondaryCard.innerHTML = resultCardHTML(secundaria, 'secundaria');

  document.getElementById('result-primary-detail').innerHTML = detailCardHTML(principal);
  document.getElementById('result-secondary-detail').innerHTML = detailCardHTML(secundaria);

  document.getElementById('print-date').textContent = `Generado el ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`;

  renderDonutChart();
}

function renderDonutChart() {
  const svg = document.getElementById('donut-chart');
  const legend = document.getElementById('donut-legend');
  svg.innerHTML = '';
  legend.innerHTML = '';

  const { ranking, principal } = state.result;
  const visible = ranking.filter(r => r.score > 0);

  const cx = 110, cy = 110, r = 80;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;
  const reduced = prefersReducedMotion();

  const svgNS = 'http://www.w3.org/2000/svg';

  const track = document.createElementNS(svgNS, 'circle');
  track.setAttribute('cx', cx);
  track.setAttribute('cy', cy);
  track.setAttribute('r', r);
  track.setAttribute('fill', 'none');
  track.setAttribute('stroke', '#E2E8F0');
  track.setAttribute('stroke-width', '22');
  svg.appendChild(track);

  visible.forEach((entry, i) => {
    const t = TECHNIQUES[entry.tech];
    const share = entry.matchPct / 100;
    const dash = share * circumference;
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', t.color);
    circle.setAttribute('stroke-width', '22');
    circle.setAttribute('stroke-dashoffset', `${-cumulative}`);
    circle.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
    circle.style.transitionDelay = reduced ? '0ms' : `${i * 70}ms`;
    circle.dataset.tech = entry.tech;

    // Arranca en 0 y crece hacia su valor final vía transición CSS (stroke-dasharray).
    circle.setAttribute('stroke-dasharray', `0 ${circumference}`);
    svg.appendChild(circle);
    requestAnimationFrame(() => {
      circle.setAttribute('stroke-dasharray', `${dash} ${circumference - dash}`);
    });

    circle.addEventListener('mouseenter', () => highlightTechnique(entry.tech));
    circle.addEventListener('mouseleave', () => highlightTechnique(null));
    cumulative += dash;
  });

  const centerName = document.createElementNS(svgNS, 'text');
  centerName.setAttribute('x', cx);
  centerName.setAttribute('y', cy - 6);
  centerName.setAttribute('text-anchor', 'middle');
  centerName.setAttribute('font-size', '13');
  centerName.setAttribute('font-weight', '700');
  centerName.setAttribute('fill', '#0F172A');
  centerName.textContent = TECHNIQUES[principal.tech].nombre.split(' ')[0];
  svg.appendChild(centerName);

  const centerPct = document.createElementNS(svgNS, 'text');
  centerPct.setAttribute('x', cx);
  centerPct.setAttribute('y', cy + 20);
  centerPct.setAttribute('text-anchor', 'middle');
  centerPct.setAttribute('font-size', '26');
  centerPct.setAttribute('font-weight', '800');
  centerPct.setAttribute('fill', '#2563EB');
  centerPct.classList.add('donut-pct');
  svg.appendChild(centerPct);
  animateCounter(centerPct, principal.matchPct, reduced);

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

function animateCounter(el, target, reduced) {
  if (reduced) {
    el.textContent = `${target}%`;
    return;
  }
  const duration = 700;
  const start = performance.now();
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = `${Math.round(target * easeOutCubic(t))}%`;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
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
/* 9. EXPORTAR PDF / COPIAR AL PORTAPAPELES / TOAST                        */
/* ---------------------------------------------------------------------- */

function showToast(message, iconSvg) {
  const toast = document.getElementById('toast');
  toast.innerHTML = `<span style="width:16px;height:16px;display:inline-flex">${iconSvg || UI.check}</span><span>${message}</span>`;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2600);
}

function exportPDF() {
  window.print();
}

async function copyResults() {
  const { principal, secundaria } = state.result;
  const tp = TECHNIQUES[principal.tech];
  const ts = TECHNIQUES[secundaria.tech];
  const summary =
`Diagnóstico Organizacional — Resultado

Técnica principal recomendada: ${tp.nombre} (${principal.matchPct}% de compatibilidad)
"${tp.slogan}"

Técnica secundaria: ${ts.nombre} (${secundaria.matchPct}% de compatibilidad)

Generado con el Selector Interactivo de Técnicas de Diagnóstico Organizacional
${window.location.href}`;

  try {
    await navigator.clipboard.writeText(summary);
    showToast('Resumen copiado al portapapeles', UI.check);
  } catch (err) {
    showToast('No se pudo copiar automáticamente. Selecciona y copia manualmente.', UI.clipboard);
  }
}

function restartQuiz() {
  state.result = null;
  showView('hero');
}

/* ---------------------------------------------------------------------- */
/* 10. REPOSITORIO DE FICHAS ACADÉMICAS + MODAL                            */
/* ---------------------------------------------------------------------- */

function renderFichas() {
  const grid = document.getElementById('fichas-grid');
  grid.innerHTML = Object.entries(TECHNIQUES).map(([key, t]) => `
    <div class="editorial-card compact" style="background:${t.gradient}" data-tech="${key}" role="button" tabindex="0" aria-haspopup="dialog" aria-label="Ver ficha completa de ${t.nombre}">
      <div class="editorial-icon">${ICONS[key]}</div>
      <div class="editorial-scrim"></div>
      <div class="editorial-content">
        <div class="editorial-meta">Técnica de diagnóstico</div>
        <div class="editorial-title">${t.nombre}</div>
        <div class="editorial-slogan">${t.slogan}</div>
        <span class="editorial-cta">Ver ficha completa ${UI.chevronRight}</span>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.editorial-card').forEach(card => {
    card.addEventListener('click', () => openFichaModal(card.dataset.tech));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFichaModal(card.dataset.tech);
      }
    });
  });
}

function openFichaModal(techKey) {
  const t = TECHNIQUES[techKey];
  const modal = document.getElementById('ficha-modal');
  modal.innerHTML = `
    <div class="modal-panel app-card">
      <button type="button" class="icon-btn modal-close" id="modal-close-btn" aria-label="Cerrar">${UI.close}</button>
      <div class="ficha-icon" style="background:${t.color}1A;color:${t.color}">${ICONS[techKey]}</div>
      <h3 class="text-2xl font-extrabold text-[--primary-dark-blue] mb-1">${t.nombre}</h3>
      <p class="italic text-[--text-muted] mb-5">${t.slogan}</p>
      <p class="text-[--text-main] leading-relaxed mb-5">${t.pitch}</p>
      <p class="flex items-start gap-2 font-semibold text-[--primary-dark-blue] mb-5">
        <span class="inline-icon mt-0.5 text-[--primary-blue]">${UI.check}</span>
        <span><span class="font-semibold">Beneficio clave:</span> <span class="font-normal text-[--text-muted]">${t.beneficio}</span></span>
      </p>
      <p class="font-bold text-sm uppercase tracking-wide text-[--text-muted] mb-2">Pasos de ejecución</p>
      <ol class="ficha-steps">${t.pasos.map(p => `<li>${p}</li>`).join('')}</ol>
    </div>
  `;
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('open'));
  document.getElementById('modal-close-btn').addEventListener('click', closeFichaModal);
  document.body.style.overflow = 'hidden';
}

function closeFichaModal() {
  const modal = document.getElementById('ficha-modal');
  modal.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => { modal.hidden = true; modal.innerHTML = ''; }, prefersReducedMotion() ? 0 : 320);
}

/* ---------------------------------------------------------------------- */
/* 11. METODOLOGÍA Y FUENTES                                               */
/* ---------------------------------------------------------------------- */

function renderReferences() {
  const grid = document.getElementById('references-grid');
  if (!grid) return;
  grid.innerHTML = REFERENCES.map(ref => `
    <div class="reference-card">
      <p class="font-bold text-white mb-1">${ref.institucion}</p>
      <p class="text-sm text-white/70 mb-1">${ref.marco}</p>
      <p class="text-sm text-white/50">${ref.nota}</p>
      <a class="ref-link" href="${ref.url}" target="_blank" rel="noopener noreferrer">
        Visitar sitio ${UI.externalLink}
      </a>
    </div>
  `).join('');
}

/* ---------------------------------------------------------------------- */
/* 12. INICIALIZACIÓN                                                      */
/* ---------------------------------------------------------------------- */

function renderHeroTechniquesList() {
  const list = document.getElementById('hero-techniques-list');
  list.innerHTML = Object.entries(TECHNIQUES).map(([key, t]) => `
    <div class="flex items-center gap-3 text-white">
      <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15">${ICONS[key]}</span>
      <span class="text-sm font-medium">${t.nombre}</span>
    </div>
  `).join('');
}

function init() {
  document.getElementById('footer-year').textContent = new Date().getFullYear();

  renderFichas();
  renderReferences();
  renderHeroTechniquesList();
  showView('hero');

  document.getElementById('btn-start-quiz').addEventListener('click', startQuiz);
  document.getElementById('btn-nav-cta').addEventListener('click', startQuiz);
  document.getElementById('btn-quiz-back').addEventListener('click', goBack);
  document.getElementById('btn-export-pdf').addEventListener('click', exportPDF);
  document.getElementById('btn-copy-results').addEventListener('click', copyResults);
  document.getElementById('btn-restart').addEventListener('click', restartQuiz);
  document.getElementById('btn-view-fichas').addEventListener('click', () => {
    document.getElementById('fichas').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  });

  const modal = document.getElementById('ficha-modal');
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeFichaModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeFichaModal();
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

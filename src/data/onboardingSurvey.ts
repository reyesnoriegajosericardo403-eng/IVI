// Encuesta de bienvenida — 5 preguntas, una por pantalla, con avance
// automático al elegir una respuesta (spec: "al contestar la pregunta y
// seleccionar el botón de respuesta automáticamente pase a la
// siguiente"). La edad ya no se pregunta aquí — se recoge antes, en el
// paso de perfil, y también decide qué tono de encuesta ver (spec
// 2026-09-02: "las personas de 0 a 22 ven el cuestionario... las de 23 a
// 100 ven uno con un tono más formal").
//
// Dos tonos con el MISMO significado por pregunta (mismos `id`/`value`,
// para que las respuestas se puedan comparar sin importar qué tono vio
// la persona): "casual" es la voz relajada original para 0-22 años,
// "formal" es una reescritura seria y profesional para 23-100 años, sin
// modismos ni tono de broma.

export interface SurveyOption {
  value: string;
  label: string;
}

export interface SurveyQuestion {
  id: 'occupation' | 'goal' | 'experience' | 'discovery' | 'challenge';
  prompt: string;
  options: SurveyOption[];
}

export type SurveyTone = 'casual' | 'formal';

const CASUAL_SURVEY: SurveyQuestion[] = [
  {
    id: 'occupation',
    prompt: 'Oye, ¿y de qué vives o qué onda? ¿En qué se te va la vida entre semana?',
    options: [
      { value: 'estudiante', label: 'Llevándomela tranki en la escuela' },
      { value: 'empleado', label: 'Godín de alto rendimiento' },
      { value: 'emprendedor', label: 'Emprendiendo el imperio' },
      { value: 'multitarea', label: 'Haciendo malabares con la vida' },
    ],
  },
  {
    id: 'goal',
    prompt: 'Para no marearte con cosas que ni te interesan… ¿a qué venimos hoy?',
    options: [
      { value: 'ordenar_finanzas', label: 'A poner en orden mi desmadre financiero' },
      { value: 'acelerar_metas', label: 'A meterle velocidad a mis metas' },
      { value: 'aprender', label: 'A aprender sin que me duerma' },
      { value: 'curiosidad', label: 'Vine por curiosidad' },
    ],
  },
  {
    id: 'experience',
    prompt: 'Sincerándonos, ¿qué tan crack te sientes usando apps como esta?',
    options: [
      { value: 'principiante', label: 'Voy empezando, no me presiones' },
      { value: 'basico', label: 'Le sé a lo básico' },
      { value: 'master', label: 'Soy un máster, tú nomás dime dónde picarle' },
    ],
  },
  {
    id: 'discovery',
    prompt: '¿Quién pasó el chisme de que existíamos? Suelta el dato:',
    options: [
      { value: 'instagram_tiktok', label: 'Instagram / TikTok' },
      { value: 'recomendacion_amigo', label: 'Recomendación de un amigo' },
      { value: 'busqueda_tienda', label: 'Búsqueda en la tienda de aplicaciones' },
      { value: 'anuncio_publicitario', label: 'Anuncio publicitario' },
      { value: 'twitter_youtube', label: 'X (Twitter) o YouTube' },
      { value: 'blog_resena', label: 'Blog, artículo o reseña en internet' },
      { value: 'universidad_escolar', label: 'Universidad o recomendación escolar' },
      { value: 'otro_medio', label: 'Otro medio' },
    ],
  },
  {
    id: 'challenge',
    prompt: 'La verdad, ¿qué es lo que más te está quitando el sueño ahorita?',
    options: [
      { value: 'numeros_rojos', label: 'Llego a fin de mes en números rojos' },
      { value: 'odio_excel', label: 'Odio las hojas de Excel aburridas y laboriosas' },
      { value: 'desidia', label: 'Me gana la desidia a los dos días, odio las apps complejas' },
    ],
  },
];

const FORMAL_SURVEY: SurveyQuestion[] = [
  {
    id: 'occupation',
    prompt: '¿A qué te dedicas actualmente?',
    options: [
      { value: 'estudiante', label: 'Estudiante' },
      { value: 'empleado', label: 'Empleado(a) de tiempo completo' },
      { value: 'emprendedor', label: 'Emprendedor(a) o negocio propio' },
      { value: 'multitarea', label: 'Combino varias actividades' },
    ],
  },
  {
    id: 'goal',
    prompt: '¿Qué te gustaría lograr con VALU?',
    options: [
      { value: 'ordenar_finanzas', label: 'Poner en orden mis finanzas' },
      { value: 'acelerar_metas', label: 'Alcanzar mis metas financieras más rápido' },
      { value: 'aprender', label: 'Aprender más sobre finanzas personales' },
      { value: 'curiosidad', label: 'Conocer la aplicación' },
    ],
  },
  {
    id: 'experience',
    prompt: '¿Qué tan familiarizado(a) estás con aplicaciones de finanzas personales?',
    options: [
      { value: 'principiante', label: 'Es la primera vez que uso una' },
      { value: 'basico', label: 'Tengo experiencia básica' },
      { value: 'master', label: 'Tengo bastante experiencia' },
    ],
  },
  {
    id: 'discovery',
    prompt: '¿Cómo te enteraste de VALU?',
    options: [
      { value: 'instagram_tiktok', label: 'Instagram / TikTok' },
      { value: 'recomendacion_amigo', label: 'Recomendación de un conocido' },
      { value: 'busqueda_tienda', label: 'Búsqueda en la tienda de aplicaciones' },
      { value: 'anuncio_publicitario', label: 'Anuncio publicitario' },
      { value: 'twitter_youtube', label: 'X (Twitter) o YouTube' },
      { value: 'blog_resena', label: 'Blog, artículo o reseña en internet' },
      { value: 'universidad_escolar', label: 'Universidad o recomendación escolar' },
      { value: 'otro_medio', label: 'Otro medio' },
    ],
  },
  {
    id: 'challenge',
    prompt: '¿Cuál es tu principal reto financiero en este momento?',
    options: [
      { value: 'numeros_rojos', label: 'Llegar a fin de mes con números negativos' },
      { value: 'odio_excel', label: 'Las hojas de cálculo me resultan poco prácticas' },
      { value: 'desidia', label: 'Mantener la constancia con aplicaciones complejas' },
    ],
  },
];

export function getOnboardingSurvey(tone: SurveyTone): SurveyQuestion[] {
  return tone === 'formal' ? FORMAL_SURVEY : CASUAL_SURVEY;
}

// Encuesta de bienvenida — 6 preguntas, una por pantalla, con avance
// automático al elegir una respuesta (spec: "al contestar la pregunta y
// seleccionar el botón de respuesta automáticamente pase a la
// siguiente"). El texto es deliberadamente informal — es la voz que
// pidió el dueño de la app para que el onboarding no se sienta aburrido.

export interface SurveyOption {
  value: string;
  label: string;
}

export interface SurveyQuestion {
  id: 'age' | 'occupation' | 'goal' | 'experience' | 'discovery' | 'challenge';
  prompt: string;
  options: SurveyOption[];
}

export const ONBOARDING_SURVEY: SurveyQuestion[] = [
  {
    id: 'age',
    prompt: 'A ver, para saber en qué época del internet naciste… ¿cuántas primaveras juntas?',
    options: [
      { value: '18-24', label: '18-24' },
      { value: '25-34', label: '25-34' },
      { value: '35-44', label: '35-44' },
      { value: '45+', label: '45+' },
    ],
  },
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
      { value: 'olvido_anotar', label: 'Se me olvida anotar lo que gasto: falta de hábito' },
      { value: 'numeros_rojos', label: 'Llego a fin de mes en números rojos' },
      { value: 'odio_excel', label: 'Odio las hojas de Excel aburridas y laboriosas' },
      { value: 'gastos_hormiga', label: 'Siento que gasto en cosas estúpidas, necesito ver a dónde se va mi dinero' },
      { value: 'desidia', label: 'Me gana la desidia a los dos días, odio las apps complejas' },
    ],
  },
];

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
      { value: 'curiosidad', label: 'A probar a ver si es cierto, vine por curiosidad' },
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
      { value: 'redes_sociales', label: 'Me salió en TikTok/IG' },
      { value: 'recomendacion', label: 'Un compa me la recomendó' },
      { value: 'tienda', label: 'Curiosidad pura en la tienda' },
      { value: 'anuncio', label: 'Un anuncio por ahí' },
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

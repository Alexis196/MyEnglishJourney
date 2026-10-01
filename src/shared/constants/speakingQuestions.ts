import type { CefrLevel } from "./exerciseTypes";
import type { FocusArea } from "./focusAreas";
import type { Interest } from "./personalization";

/**
 * Practice questions for the Speaking Lab. Every question carries its Spanish translation so the student can
 * reveal it on demand. Topic-specific questions are only offered when the student's own profile points to that
 * topic (an interest, a focus area, or a stated profession) — nothing is assumed about anyone.
 */
export type SpeakingTopic = "general" | "work" | "tech" | "travel" | "study" | Interest;
export type SpeakingBand = "basic" | "mid" | "advanced";

export interface SpeakingQuestion {
  en: string;
  es: string;
  band: SpeakingBand;
  topic: SpeakingTopic;
}

export function speakingBandFor(level: CefrLevel | null | undefined): SpeakingBand {
  if (level === "C1" || level === "C2") return "advanced";
  if (level === "B1" || level === "B2") return "mid";
  return "basic";
}

const q = (band: SpeakingBand, topic: SpeakingTopic, en: string, es: string): SpeakingQuestion => ({ band, topic, en, es });

export const SPEAKING_QUESTIONS: readonly SpeakingQuestion[] = [
  // --- basic (A1-A2): short questions, everyday words ---
  q("basic", "general", "What is your name and where are you from?", "¿Cómo te llamás y de dónde sos?"),
  q("basic", "general", "What do you usually do in the morning?", "¿Qué hacés normalmente a la mañana?"),
  q("basic", "general", "What do you like to eat for breakfast?", "¿Qué te gusta comer en el desayuno?"),
  q("basic", "general", "Tell me about your family.", "Contame sobre tu familia."),
  q("basic", "general", "What do you do on weekends?", "¿Qué hacés los fines de semana?"),
  q("basic", "general", "Describe your house or your room.", "Describí tu casa o tu habitación."),
  q("basic", "general", "What did you do yesterday?", "¿Qué hiciste ayer?"),
  q("basic", "general", "What is your favorite day of the week? Why?", "¿Cuál es tu día favorito de la semana? ¿Por qué?"),
  q("basic", "work", "What do you do for work? Do you like it?", "¿A qué te dedicás? ¿Te gusta?"),
  q("basic", "work", "Describe a normal day at work.", "Describí un día normal en el trabajo."),
  q("basic", "study", "What are you studying? Why?", "¿Qué estás estudiando? ¿Por qué?"),
  q("basic", "tech", "What apps or programs do you use every day?", "¿Qué aplicaciones o programas usás todos los días?"),
  q("basic", "travel", "Which city or country would you like to visit? Why?", "¿Qué ciudad o país te gustaría visitar? ¿Por qué?"),
  q("basic", "music", "What kind of music do you like?", "¿Qué tipo de música te gusta?"),
  q("basic", "movies_series", "What is your favorite movie or series?", "¿Cuál es tu película o serie favorita?"),
  q("basic", "videogames", "What video games do you like to play?", "¿A qué videojuegos te gusta jugar?"),
  q("basic", "sports", "Do you play any sports? Which one?", "¿Practicás algún deporte? ¿Cuál?"),
  q("basic", "fitness", "How often do you exercise?", "¿Con qué frecuencia hacés ejercicio?"),
  q("basic", "cooking", "What is your favorite food? Can you cook it?", "¿Cuál es tu comida favorita? ¿Sabés cocinarla?"),
  q("basic", "books", "Do you like reading? What do you read?", "¿Te gusta leer? ¿Qué leés?"),
  q("basic", "pets", "Do you have a pet? Tell me about it.", "¿Tenés una mascota? Contame sobre ella."),
  q("basic", "art_design", "Do you like drawing or design? What do you make?", "¿Te gusta dibujar o diseñar? ¿Qué hacés?"),
  q("basic", "photography", "What do you like to take photos of?", "¿Qué te gusta fotografiar?"),
  q("basic", "science", "What is one thing in science you find interesting?", "¿Qué cosa de la ciencia te parece interesante?"),
  q("basic", "finance", "Do you save money? How?", "¿Ahorrás dinero? ¿Cómo?"),

  // --- mid (B1-B2): opinions, past experiences, comparisons ---
  q("mid", "general", "Tell me about yourself and what you enjoy doing in your free time.", "Contame sobre vos y qué disfrutás hacer en tu tiempo libre."),
  q("mid", "general", "Describe a memorable day you had recently and why it was special.", "Describí un día memorable que tuviste hace poco y por qué fue especial."),
  q("mid", "general", "What are your goals for the next year? How will you achieve them?", "¿Cuáles son tus metas para el próximo año? ¿Cómo las vas a lograr?"),
  q("mid", "general", "What is the biggest challenge you have faced and what did you learn?", "¿Cuál fue el mayor desafío que enfrentaste y qué aprendiste?"),
  q("mid", "general", "Why are you learning English, and how do you want to use it?", "¿Por qué estás aprendiendo inglés y cómo querés usarlo?"),
  q("mid", "work", "Describe your job and the part of it you enjoy the most.", "Describí tu trabajo y la parte que más disfrutás."),
  q("mid", "work", "Tell me about a recent meeting or conversation at work. What was it about?", "Contame sobre una reunión o conversación reciente en el trabajo. ¿De qué se trató?"),
  q("mid", "work", "How would you introduce yourself to a new coworker?", "¿Cómo te presentarías ante un nuevo compañero de trabajo?"),
  q("mid", "tech", "Tell me about a technical problem you solved and how you did it.", "Contame sobre un problema técnico que resolviste y cómo lo hiciste."),
  q("mid", "tech", "What tools or technologies do you use most, and why?", "¿Qué herramientas o tecnologías usás más y por qué?"),
  q("mid", "study", "Describe a subject you study and explain why it matters to you.", "Describí una materia que estudiás y explicá por qué es importante para vos."),
  q("mid", "travel", "Describe a trip you took. What did you do and what did you like most?", "Describí un viaje que hiciste. ¿Qué hiciste y qué fue lo que más te gustó?"),
  q("mid", "music", "How has music influenced your life? Tell me about an artist you love.", "¿Cómo influyó la música en tu vida? Contame sobre un artista que amás."),
  q("mid", "movies_series", "Recommend a movie or series and explain why people should watch it.", "Recomendá una película o serie y explicá por qué la gente debería verla."),
  q("mid", "videogames", "Explain a game you enjoy to someone who has never played it.", "Explicá un juego que disfrutás a alguien que nunca lo jugó."),
  q("mid", "sports", "Describe a match or sporting event you remember well.", "Describí un partido o evento deportivo que recuerdes bien."),
  q("mid", "fitness", "What does your training routine look like, and how do you stay motivated?", "¿Cómo es tu rutina de entrenamiento y cómo te mantenés motivado?"),
  q("mid", "cooking", "Explain how to cook a dish you know well.", "Explicá cómo cocinar un plato que conozcas bien."),
  q("mid", "books", "Tell me about a book that changed the way you think.", "Contame sobre un libro que cambió tu forma de pensar."),
  q("mid", "pets", "Describe your pet's personality and a funny thing it did.", "Describí la personalidad de tu mascota y algo gracioso que hizo."),
  q("mid", "art_design", "Describe a piece of art or design you admire and say why.", "Describí una obra de arte o diseño que admires y explicá por qué."),
  q("mid", "photography", "Describe your favorite photo you have taken and the story behind it.", "Describí tu foto favorita y la historia detrás de ella."),
  q("mid", "science", "Explain a scientific idea you find fascinating in simple words.", "Explicá con palabras simples una idea científica que te fascine."),
  q("mid", "finance", "What advice would you give to someone who wants to start investing or saving?", "¿Qué consejo le darías a alguien que quiere empezar a invertir o ahorrar?"),

  // --- advanced (C1-C2): argumentation, hypotheticals, abstract topics ---
  q("advanced", "general", "How has your way of thinking changed over the last few years? Give examples.", "¿Cómo cambió tu forma de pensar en los últimos años? Da ejemplos."),
  q("advanced", "general", "If you could change one thing about the way people communicate today, what would it be and why?", "Si pudieras cambiar algo de cómo se comunica la gente hoy, ¿qué sería y por qué?"),
  q("advanced", "general", "Discuss the advantages and drawbacks of living abroad.", "Discutí las ventajas y desventajas de vivir en el exterior."),
  q("advanced", "work", "How do you handle disagreement with a colleague or a superior? Give a concrete example.", "¿Cómo manejás un desacuerdo con un colega o un superior? Da un ejemplo concreto."),
  q("advanced", "tech", "How is technology reshaping the way we work, and what risks does it bring?", "¿Cómo está cambiando la tecnología nuestra forma de trabajar y qué riesgos trae?"),
  q("advanced", "study", "Is formal education still the best way to learn? Defend your view.", "¿Sigue siendo la educación formal la mejor forma de aprender? Defendé tu postura."),
  q("advanced", "travel", "What does traveling teach us that books cannot?", "¿Qué nos enseña viajar que los libros no pueden?"),
  q("advanced", "movies_series", "Do films and series reflect society or shape it? Argue your position.", "¿Las películas y series reflejan la sociedad o la moldean? Argumentá tu posición."),
  q("advanced", "science", "Which scientific advance will matter most in the next decade, in your opinion?", "En tu opinión, ¿qué avance científico será el más importante de la próxima década?"),
  q("advanced", "finance", "How should people balance saving for the future with enjoying the present?", "¿Cómo deberían equilibrar las personas el ahorro para el futuro con disfrutar el presente?"),
];

/** Topics the student's own profile unlocks. "general" is always included. */
export function speakingTopicsFor(profile: {
  interests?: readonly Interest[];
  focusAreas?: readonly FocusArea[];
  profession?: string | null;
  primaryGoal?: string | null;
}): SpeakingTopic[] {
  const topics = new Set<SpeakingTopic>(["general"]);
  for (const interest of profile.interests ?? []) {
    topics.add(interest);
    if (interest === "technology") topics.add("tech");
    if (interest === "travel") topics.add("travel");
  }
  for (const area of profile.focusAreas ?? []) {
    if (area === "software_development") topics.add("tech");
    if (area === "travel") topics.add("travel");
    if (["remote_work", "work_meetings", "job_interviews", "coworker_communication"].includes(area)) topics.add("work");
  }
  if (profile.profession) topics.add("work");
  if (profile.primaryGoal === "career" || profile.primaryGoal === "job_search") topics.add("work");
  if (profile.primaryGoal === "travel") topics.add("travel");
  if (profile.primaryGoal === "studies") topics.add("study");
  return Array.from(topics);
}

/**
 * Picks a question for the student's level, favouring their own topics when they have any
 * (about two thirds of the time) so practice also covers general English.
 */
export function pickSpeakingQuestion(params: {
  level: CefrLevel | null | undefined;
  topics: readonly SpeakingTopic[];
  excludeEn?: string;
  random?: () => number;
}): SpeakingQuestion {
  const random = params.random ?? Math.random;
  const band = speakingBandFor(params.level);
  const inBand = SPEAKING_QUESTIONS.filter((item) => item.band === band && item.en !== params.excludeEn);
  const personal = inBand.filter((item) => item.topic !== "general" && params.topics.includes(item.topic));
  const general = inBand.filter((item) => item.topic === "general");

  const pool = personal.length > 0 && (general.length === 0 || random() < 0.65) ? personal : general;
  const fallback = SPEAKING_QUESTIONS.find((item) => item.band === band && item.topic === "general") ?? SPEAKING_QUESTIONS[0]!;
  return pool[Math.floor(random() * pool.length)] ?? fallback;
}

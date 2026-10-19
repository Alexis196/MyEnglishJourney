import type { CefrLevel } from "./exerciseTypes";

/**
 * Role-play situations for live conversation practice. "Free" conversation needs no scenario.
 * `from` is the lowest level it makes sense for (the tutor still adapts its language to the student's level).
 */
export interface LiveScenario {
  id: string;
  title: string;
  /** Spanish blurb shown on the picker. */
  description: string;
  /** What the tutor plays, in English (goes straight into the prompt). */
  roleplay: string;
  from: CefrLevel;
}

export const LIVE_SCENARIOS: readonly LiveScenario[] = [
  {
    id: "meeting_someone",
    title: "Conocer a alguien",
    description: "Presentate y charlá con alguien que conocés por primera vez.",
    roleplay: "A friendly person the student has just met at a social event. Ask and answer simple getting-to-know-you questions.",
    from: "A1",
  },
  {
    id: "coffee_shop",
    title: "Pedir en una cafetería",
    description: "Pedí un café y algo para comer, preguntá precios.",
    roleplay: "A barista at a coffee shop taking the student's order, offering options and asking follow-up questions.",
    from: "A1",
  },
  {
    id: "directions",
    title: "Pedir indicaciones",
    description: "Preguntá cómo llegar a un lugar en una ciudad.",
    roleplay: "A helpful local on the street who gives directions when the student asks how to get somewhere.",
    from: "A1",
  },
  {
    id: "hotel_checkin",
    title: "Check-in en un hotel",
    description: "Hacé el registro, preguntá por el desayuno y el wifi.",
    roleplay: "A hotel receptionist checking the student in, explaining breakfast times and answering questions.",
    from: "A2",
  },
  {
    id: "restaurant",
    title: "En un restaurante",
    description: "Pedí la comida, hacé preguntas sobre el menú y pagá.",
    roleplay: "A waiter at a restaurant: recommend dishes, take the order, answer questions about the menu and bring the bill.",
    from: "A2",
  },
  {
    id: "doctor_visit",
    title: "Consulta médica",
    description: "Explicá cómo te sentís y qué te duele.",
    roleplay: "A doctor asking the student about their symptoms and giving simple advice.",
    from: "B1",
  },
  {
    id: "job_interview",
    title: "Entrevista de trabajo",
    description: "Respondé preguntas sobre tu experiencia y tus objetivos.",
    roleplay: "An interviewer in a friendly job interview asking about experience, strengths and goals.",
    from: "B1",
  },
  {
    id: "debate_opinion",
    title: "Dar tu opinión",
    description: "Defendé tu punto de vista sobre un tema y respondé objeciones.",
    roleplay: "A thoughtful conversation partner who politely disagrees and asks the student to justify their opinions.",
    from: "B2",
  },
] as const;

export function getLiveScenario(id: string | undefined): LiveScenario | undefined {
  return LIVE_SCENARIOS.find((scenario) => scenario.id === id);
}

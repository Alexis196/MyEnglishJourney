export const FOCUS_AREAS = [
  "personal_introductions",
  "daily_routines",
  "remote_work",
  "software_development",
  "work_meetings",
  "job_interviews",
  "coworker_communication",
  "everyday_conversation",
  "travel",
  "hobbies_interests",
] as const;

export type FocusArea = (typeof FOCUS_AREAS)[number];

export const FOCUS_AREA_LABELS: Record<FocusArea, string> = {
  personal_introductions: "Presentaciones personales",
  daily_routines: "Rutinas diarias",
  remote_work: "Trabajo remoto",
  software_development: "Desarrollo de software",
  work_meetings: "Reuniones de trabajo",
  job_interviews: "Entrevistas laborales",
  coworker_communication: "Comunicación con compañeros",
  everyday_conversation: "Conversaciones cotidianas",
  travel: "Viajes",
  hobbies_interests: "Hobbies y temas de interés",
};

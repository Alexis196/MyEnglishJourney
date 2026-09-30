export const INTERESTS = [
  "music",
  "movies_series",
  "videogames",
  "sports",
  "fitness",
  "travel",
  "cooking",
  "books",
  "technology",
  "art_design",
  "science",
  "finance",
  "pets",
  "photography",
] as const;

export type Interest = (typeof INTERESTS)[number];

export const INTEREST_LABELS: Record<Interest, string> = {
  music: "Música",
  movies_series: "Películas y series",
  videogames: "Videojuegos",
  sports: "Deportes",
  fitness: "Gimnasio / fitness",
  travel: "Viajes",
  cooking: "Cocina",
  books: "Libros",
  technology: "Tecnología",
  art_design: "Arte y diseño",
  science: "Ciencia",
  finance: "Finanzas e inversiones",
  pets: "Mascotas",
  photography: "Fotografía",
};

export const MAIN_GOALS = ["career", "job_search", "travel", "studies", "relocation", "personal_growth"] as const;

export type MainGoal = (typeof MAIN_GOALS)[number];

export const MAIN_GOAL_LABELS: Record<MainGoal, string> = {
  career: "Crecer en mi trabajo actual",
  job_search: "Conseguir un trabajo en inglés",
  travel: "Viajar y desenvolverme",
  studies: "Estudiar o certificarme",
  relocation: "Mudarme a otro país",
  personal_growth: "Crecimiento personal",
};

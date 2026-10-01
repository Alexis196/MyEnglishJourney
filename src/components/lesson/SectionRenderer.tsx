"use client";

import type { LessonSection } from "@myenglishjourney/shared";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { ExerciseRenderer } from "../exercises/ExerciseRenderer";

const sectionLabels: Record<LessonSection["sectionType"], string> = {
  review: "Repaso inicial",
  vocabulary: "Vocabulario",
  grammar: "Gramática",
  interactive: "Ejercicios interactivos",
  listening: "Listening",
  speaking: "Speaking",
  final_assessment: "Evaluación final",
};

export function SectionRenderer({ section, lessonId }: { section: LessonSection; lessonId: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Badge tone="brand">{sectionLabels[section.sectionType]}</Badge>
        <h2 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-ink">{section.title}</h2>
      </div>

      {section.content.explanation && (
        <Card className="prose-sm text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {section.content.explanation}
        </Card>
      )}

      {section.content.examples && section.content.examples.length > 0 && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-ink">Ejemplos</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            {section.content.examples.map((example, i) => (
              <li key={i}>{example}</li>
            ))}
          </ul>
        </Card>
      )}

      {section.content.vocabulary && section.content.vocabulary.length > 0 && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-ink">Vocabulario nuevo</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {section.content.vocabulary.map((item, i) => (
              <div key={i} className="rounded-xl bg-zinc-50 p-3 text-sm dark:bg-white/[0.04]">
                <p className="font-medium text-zinc-900 dark:text-ink">{item.term}</p>
                <p className="text-muted">{item.translation}</p>
                {item.example && <p className="mt-1 italic text-zinc-500 dark:text-zinc-400">"{item.example}"</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {section.content.audioUrl && (
        <Card>
          <audio controls src={section.content.audioUrl} className="w-full">
            Tu navegador no soporta audio.
          </audio>
        </Card>
      )}

      {section.exercises.map((exercise) => (
        <ExerciseRenderer key={exercise.id} exercise={exercise} lessonId={lessonId} />
      ))}
    </div>
  );
}

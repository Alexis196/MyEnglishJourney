"use client";

import { LESSON_STAGE_LABELS, type LessonSection } from "@myenglishjourney/shared";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { ExerciseRenderer } from "../exercises/ExerciseRenderer";

const sectionLabels: Record<LessonSection["sectionType"], string> = {
  review: "Repaso inicial",
  vocabulary: "Vocabulario",
  grammar: "Gramática",
  interactive: "Ejercicios interactivos",
  listening: "Listening",
  // Older lessons labelled written activities "speaking"; they are writing, so they are shown as such.
  speaking: "Producción escrita",
  final_assessment: "Evaluación final",
};

/** Newer lessons carry their pedagogical stage; older ones fall back to the section type. */
function sectionLabel(section: LessonSection): string {
  return section.content.stage ? LESSON_STAGE_LABELS[section.content.stage] : sectionLabels[section.sectionType];
}

export function SectionRenderer({ section, lessonId }: { section: LessonSection; lessonId: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Badge tone="brand">{sectionLabel(section)}</Badge>
        <h2 className="mt-2 text-lg font-semibold text-ink">{section.title}</h2>
      </div>

      {section.content.explanation && (
        <Card className="prose-sm text-sm leading-relaxed text-ink-2">
          {section.content.explanation}
        </Card>
      )}

      {section.content.pattern && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-ink">Patrón</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[16rem] border-separate border-spacing-y-1 text-sm">
              <thead>
                <tr>
                  {section.content.pattern.columns.map((column, i) => (
                    <th key={i} className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-link">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.content.pattern.rows.map((row, r) => (
                  <tr key={r} className="bg-tint">
                    {row.map((cell, c) => (
                      <td key={c} className="px-3 py-2 text-ink first:rounded-l-lg last:rounded-r-lg">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {section.content.pattern.note && <p className="mt-2 text-xs text-muted">{section.content.pattern.note}</p>}
        </Card>
      )}

      {section.content.examples && section.content.examples.length > 0 && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-ink">Ejemplos</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-ink-2">
            {section.content.examples.map((example, i) => (
              <li key={i}>{example}</li>
            ))}
          </ul>
        </Card>
      )}

      {section.content.vocabulary && section.content.vocabulary.length > 0 && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-ink">Vocabulario nuevo</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {section.content.vocabulary.map((item, i) => (
              <div key={i} className="rounded-xl bg-tint p-3 text-sm">
                <p className="font-medium text-ink">{item.term}</p>
                <p className="text-muted">{item.translation}</p>
                {item.example && <p className="mt-1 italic text-faint">"{item.example}"</p>}
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

"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import type { LessonDetail } from "@myenglishjourney/shared";
import { Button } from "../ui/Button";
import { SectionRenderer } from "./SectionRenderer";
import { LessonProgressBar } from "./LessonProgressBar";

interface LessonStepperProps {
  lesson: LessonDetail;
  currentIndex: number;
  onNavigate: (index: number, isCompleting: boolean) => void;
  isSaving: boolean;
}

export function LessonStepper({ lesson, currentIndex, onNavigate, isSaving }: LessonStepperProps) {
  const prefersReducedMotion = useReducedMotion();
  const total = lesson.sections.length;
  const section = lesson.sections[currentIndex];
  const isLast = currentIndex === total - 1;

  if (!section) return null;

  return (
    <div className="flex flex-col gap-5">
      <LessonProgressBar current={currentIndex} total={total} />

      <AnimatePresence mode="wait">
        <motion.div
          key={section.id}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <SectionRenderer section={section} lessonId={lesson.id} />
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-white/[0.06]">
        <Button
          variant="outline"
          onClick={() => onNavigate(currentIndex - 1, false)}
          disabled={currentIndex === 0 || isSaving}
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>
        <Button onClick={() => onNavigate(currentIndex + 1, isLast)} isLoading={isSaving}>
          {isLast ? (
            <>
              <CheckCircle2 className="h-4 w-4" /> Completar clase
            </>
          ) : (
            <>
              Siguiente <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

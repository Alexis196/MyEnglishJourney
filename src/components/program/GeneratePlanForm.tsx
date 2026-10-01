"use client";

import { useState } from "react";
import { useForm, Controller, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import {
  generatePlanRequestSchema,
  CEFR_LEVELS,
  FOCUS_AREAS,
  FOCUS_AREA_LABELS,
  INTERESTS,
  INTEREST_LABELS,
  MAIN_GOALS,
  MAIN_GOAL_LABELS,
  type GeneratePlanRequest,
} from "@myenglishjourney/shared";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useGeneratePlan } from "../../hooks/useGeneratePlan";
import { useToast } from "../../context/ToastProvider";
import { cn } from "../../utils/cn";
import { ApiError } from "../../lib/apiClient";

const selectClasses =
  "rounded-xl border border-line-strong bg-soft px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

const STEPS: Array<{ title: string; subtitle: string; fields: FieldPath<GeneratePlanRequest>[] }> = [
  {
    title: "Sobre vos",
    subtitle: "Así armamos ejemplos y vocabulario que realmente uses.",
    fields: ["occupation", "interests", "otherInterests"],
  },
  {
    title: "Tu nivel y tu meta",
    subtitle: "Desde dónde partís y hasta dónde querés llegar en 90 días.",
    fields: ["currentLevel", "targetLevel", "mainGoal", "motivation"],
  },
  {
    title: "Tu rutina de estudio",
    subtitle: "Cuánto tiempo tenés y qué situaciones querés practicar.",
    fields: ["dailyMinutesGoal", "focusAreas"],
  },
];

function ChipToggle({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        checked
          ? "border-primary bg-primary/10 text-primary"
          : "border-line text-ink-2 hover:bg-hover",
      )}
    >
      {label}
    </button>
  );
}

interface GeneratePlanFormProps {
  /** Called after the new plan was created (e.g. to close the form). */
  onCreated?: () => void;
  /** When set, step 1 shows a cancel button to go back to the plan list. */
  onCancel?: () => void;
}

export function GeneratePlanForm({ onCreated, onCancel }: GeneratePlanFormProps) {
  const generatePlan = useGeneratePlan();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);

  const {
    register,
    handleSubmit,
    control,
    trigger,
    formState: { errors },
  } = useForm<GeneratePlanRequest>({
    resolver: zodResolver(generatePlanRequestSchema),
    defaultValues: {
      occupation: "",
      interests: [],
      otherInterests: "",
      mainGoal: "career",
      currentLevel: "A2",
      targetLevel: "B1",
      dailyMinutesGoal: 60,
      focusAreas: [],
      motivation: "",
    },
  });

  const currentStep = STEPS[step] ?? STEPS[0]!;
  const isLastStep = step === STEPS.length - 1;

  const goNext = async () => {
    const valid = await trigger(currentStep.fields);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const onSubmit = async (data: GeneratePlanRequest) => {
    try {
      await generatePlan.mutateAsync(data);
      showToast("¡Tu plan de 90 días está listo!", "success");
      onCreated?.();
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 429
          ? "Se alcanzó el presupuesto de IA configurado. Revisá tu configuración."
          : err instanceof ApiError && err.status === 409
            ? "Ya tenés un plan activo."
            : "No se pudo generar el plan. Intentá de nuevo en un momento.";
      showToast(message, "error");
    }
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-ink">Generá tu plan de 90 días</h2>
      </div>
      <div className="mb-4 flex items-center gap-1.5" aria-label={`Paso ${step + 1} de ${STEPS.length}`}>
        {STEPS.map((s, index) => (
          <div
            key={s.title}
            className={cn("h-1.5 flex-1 rounded-full", index <= step ? "bg-brand-gradient" : "bg-track")}
          />
        ))}
      </div>
      <p className="text-sm font-medium text-ink">
        {step + 1}. {currentStep.title}
      </p>
      <p className="mb-4 text-sm text-muted">{currentStep.subtitle}</p>

      <form
        onSubmit={(event) => {
          // Enter on an early step moves forward instead of submitting an unfinished form.
          if (!isLastStep) {
            event.preventDefault();
            void goNext();
            return;
          }
          void handleSubmit(onSubmit)(event);
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        {step === 0 && (
          <>
            <Input
              label="¿A qué te dedicás? (opcional)"
              placeholder="Ej: diseñadora, estudiante de medicina, contador… Podés dejarlo vacío."
              error={errors.occupation?.message}
              {...register("occupation")}
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-2">
                ¿Qué cosas te gustan? <span className="font-normal text-muted">(elegí las que quieras)</span>
              </span>
              <Controller
                control={control}
                name="interests"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Intereses">
                    {INTERESTS.map((interest) => (
                      <ChipToggle
                        key={interest}
                        label={INTEREST_LABELS[interest]}
                        checked={field.value.includes(interest)}
                        onToggle={() =>
                          field.onChange(
                            field.value.includes(interest)
                              ? field.value.filter((i) => i !== interest)
                              : [...field.value, interest],
                          )
                        }
                      />
                    ))}
                  </div>
                )}
              />
            </div>

            <Input
              label="¿Algo más que te apasione? (opcional)"
              placeholder="Ej: ajedrez, anime, jardinería, Fórmula 1…"
              error={errors.otherInterests?.message}
              {...register("otherInterests")}
            />
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="currentLevel" className="text-sm font-medium text-ink-2">
                  Nivel actual
                </label>
                <select id="currentLevel" className={selectClasses} {...register("currentLevel")}>
                  {CEFR_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="targetLevel" className="text-sm font-medium text-ink-2">
                  Nivel al que querés llegar
                </label>
                <select id="targetLevel" className={selectClasses} {...register("targetLevel")}>
                  {CEFR_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
                {errors.targetLevel && <p className="text-sm text-red-500">{errors.targetLevel.message}</p>}
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted">
              ¿No sabés tu nivel? A1 = principiante, A2 = básico, B1 = intermedio, B2 = intermedio alto, C1/C2 = avanzado.
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="mainGoal" className="text-sm font-medium text-ink-2">
                ¿Para qué querés mejorar tu inglés?
              </label>
              <select id="mainGoal" className={selectClasses} {...register("mainGoal")}>
                {MAIN_GOALS.map((goal) => (
                  <option key={goal} value={goal}>
                    {MAIN_GOAL_LABELS[goal]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="motivation" className="text-sm font-medium text-ink-2">
                Contanos más (opcional)
              </label>
              <textarea
                id="motivation"
                rows={3}
                maxLength={500}
                placeholder="Ej: tengo entrevistas en unos meses y me cuesta hablar con fluidez."
                className={cn(selectClasses, "resize-none placeholder:text-muted")}
                {...register("motivation")}
              />
              {errors.motivation && <p className="text-sm text-red-500">{errors.motivation.message}</p>}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Input
              label="Minutos de estudio por día"
              type="number"
              min={10}
              max={240}
              error={errors.dailyMinutesGoal?.message}
              {...register("dailyMinutesGoal", { valueAsNumber: true })}
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-2">Áreas de enfoque</span>
              <Controller
                control={control}
                name="focusAreas"
                render={({ field }) => (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {FOCUS_AREAS.map((area) => {
                      const checked = field.value?.includes(area);
                      return (
                        <label
                          key={area}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-sm transition-colors",
                            checked
                              ? "border-primary bg-primary/5 dark:bg-primary/10"
                              : "border-line hover:bg-hover",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...(field.value ?? []), area]
                                : (field.value ?? []).filter((a) => a !== area);
                              field.onChange(next);
                            }}
                          />
                          <span className="text-ink-2">{FOCUS_AREA_LABELS[area]}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              />
              {errors.focusAreas && <p className="text-sm text-red-500">{errors.focusAreas.message}</p>}
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={generatePlan.isPending}>
              <ArrowLeft className="h-4 w-4" /> Atrás
            </Button>
          ) : onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={generatePlan.isPending}>
              Cancelar
            </Button>
          ) : (
            <span />
          )}

          {isLastStep ? (
            <Button type="submit" isLoading={generatePlan.isPending}>
              {generatePlan.isPending ? "Armando tu plan personalizado (puede tardar un poco)..." : "Generar mi plan"}
            </Button>
          ) : (
            <Button type="button" onClick={() => void goNext()}>
              Siguiente <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import {
  generatePlanRequestSchema,
  CEFR_LEVELS,
  FOCUS_AREAS,
  FOCUS_AREA_LABELS,
  type GeneratePlanRequest,
} from "@myenglishjourney/shared";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useGeneratePlan } from "../../hooks/useGeneratePlan";
import { useToast } from "../../context/ToastProvider";
import { cn } from "../../utils/cn";
import { ApiError } from "../../lib/apiClient";

export function GeneratePlanForm() {
  const generatePlan = useGeneratePlan();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<GeneratePlanRequest>({
    resolver: zodResolver(generatePlanRequestSchema),
    defaultValues: { currentLevel: "A2", targetLevel: "B1", dailyMinutesGoal: 60, focusAreas: [] },
  });

  const onSubmit = async (data: GeneratePlanRequest) => {
    try {
      await generatePlan.mutateAsync(data);
      showToast("¡Tu plan de 90 días está listo!", "success");
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
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Generá tu plan de 90 días</h2>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nivel actual</label>
            <select
              className="rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary"
              {...register("currentLevel")}
            >
              {CEFR_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nivel objetivo</label>
            <select
              className="rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary"
              {...register("targetLevel")}
            >
              {CEFR_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Minutos de estudio por día"
          type="number"
          min={10}
          max={240}
          error={errors.dailyMinutesGoal?.message}
          {...register("dailyMinutesGoal", { valueAsNumber: true })}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Áreas de enfoque</label>
          <Controller
            control={control}
            name="focusAreas"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                {FOCUS_AREAS.map((area) => {
                  const checked = field.value?.includes(area);
                  return (
                    <label
                      key={area}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-sm transition-colors",
                        checked
                          ? "border-primary bg-primary/5 dark:bg-primary/10"
                          : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800",
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
                      <span className="text-zinc-800 dark:text-zinc-200">{FOCUS_AREA_LABELS[area]}</span>
                    </label>
                  );
                })}
              </div>
            )}
          />
          {errors.focusAreas && <p className="text-sm text-red-500">{errors.focusAreas.message}</p>}
        </div>

        <Button type="submit" isLoading={generatePlan.isPending} className="w-fit">
          {generatePlan.isPending ? "Generando tu plan (puede tardar unos segundos)..." : "Generar mi plan"}
        </Button>
      </form>
    </Card>
  );
}

"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema, CEFR_LEVELS, type UpdateProfileInput } from "@myenglishjourney/shared";
import { ProfileCard } from "../../components/profile/ProfileCard";
import { useAuth } from "../../context/AuthProvider";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { CardSkeleton } from "../../components/ui/Skeleton";
import { useProfile, useUpdateProfile } from "../../hooks/useProfile";
import { useToast } from "../../context/ToastProvider";

export function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { showToast } = useToast();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateProfileInput>({ resolver: zodResolver(updateProfileSchema) });

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName ?? "",
        currentLevel: profile.currentLevel ?? undefined,
        explanationLanguage: profile.explanationLanguage,
        themePreference: profile.themePreference,
        timezone: profile.timezone ?? "",
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: UpdateProfileInput) => {
    try {
      await updateProfile.mutateAsync(data);
      showToast("Perfil actualizado", "success");
    } catch {
      showToast("No se pudo actualizar el perfil", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ProfileCard
        title="Perfil"
        subtitle="Actualizá tu información y nivel estimado."
        displayName={profile?.fullName || user?.email || "Tu perfil"}
        email={user?.email}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input label="Nombre completo" error={errors.fullName?.message} {...register("fullName")} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="currentLevel" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nivel actual (CEFR)
            </label>
            <select
              id="currentLevel"
              className="rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-surface-raised-dark dark:text-ink focus:outline-none focus:ring-2 focus:ring-primary"
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
            <label htmlFor="explanationLanguage" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Idioma de las explicaciones
            </label>
            <select
              id="explanationLanguage"
              className="rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-surface-raised-dark dark:text-ink focus:outline-none focus:ring-2 focus:ring-primary"
              {...register("explanationLanguage")}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <Button type="submit" isLoading={updateProfile.isPending} className="w-fit">
            Guardar cambios
          </Button>
        </form>
      </ProfileCard>
    </div>
  );
}

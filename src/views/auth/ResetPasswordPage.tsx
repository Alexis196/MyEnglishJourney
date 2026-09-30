"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { resetPasswordSchema, type ResetPasswordInput } from "@myenglishjourney/shared";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../context/ToastProvider";

export function ResetPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (data: ResetPasswordInput) => {
    setServerError(null);
    if (!supabase) return;
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) {
      setServerError(error.message);
      return;
    }
    showToast("Contraseña actualizada", "success");
    router.replace("/login");
  };

  return (
    <AuthLayout title="Nueva contraseña" subtitle="Elegí una contraseña nueva y segura">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        {serverError && (
          <p className="text-sm text-red-500" role="alert">
            {serverError}
          </p>
        )}
        <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">
          Guardar contraseña
        </Button>
      </form>
    </AuthLayout>
  );
}

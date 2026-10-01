"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { resetPasswordSchema, type ResetPasswordInput } from "@myenglishjourney/shared";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { AuthInput } from "../../components/auth/AuthInput";
import { AuthSubmitButton } from "../../components/auth/AuthSubmitButton";
import { AuthAlert } from "../../components/auth/AuthAlert";
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
    <AuthLayout title="Nueva contraseña" subtitle="Elegí una contraseña nueva y segura.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <AuthInput
          label="Nueva contraseña"
          type="password"
          icon={Lock}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          error={errors.password?.message}
          {...register("password")}
        />
        {serverError && <AuthAlert message={serverError} />}
        <AuthSubmitButton isLoading={isSubmitting} loadingText="Guardando..." className="mt-1">
          Guardar contraseña
        </AuthSubmitButton>
      </form>
    </AuthLayout>
  );
}

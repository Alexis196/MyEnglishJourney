"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@myenglishjourney/shared";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { AuthInput } from "../../components/auth/AuthInput";
import { AuthSubmitButton } from "../../components/auth/AuthSubmitButton";
import { AuthAlert } from "../../components/auth/AuthAlert";
import { AuthSwitch } from "../../components/auth/AuthSwitch";
import { supabase } from "../../lib/supabaseClient";

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setServerError(null);
    if (!supabase) return;
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <AuthLayout title="Recuperar contraseña" subtitle="Te enviamos un enlace para restablecerla.">
      {sent ? (
        <p className="text-sm leading-relaxed text-[var(--auth-label)]" role="status">
          Si el correo existe, vas a recibir un enlace para restablecer tu contraseña.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <AuthInput
            label="Correo electrónico"
            type="email"
            icon={Mail}
            autoComplete="email"
            placeholder="usuario@email.com"
            error={errors.email?.message}
            {...register("email")}
          />
          {serverError && <AuthAlert message={serverError} />}
          <AuthSubmitButton isLoading={isSubmitting} loadingText="Enviando..." className="mt-1">
            Enviar enlace
          </AuthSubmitButton>
        </form>
      )}
      <AuthSwitch prompt="¿Ya te acordaste?" href="/login" action="Volver a iniciar sesión" />
    </AuthLayout>
  );
}

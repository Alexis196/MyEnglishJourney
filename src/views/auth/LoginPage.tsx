"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { loginSchema, type LoginInput } from "@myenglishjourney/shared";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { AuthInput } from "../../components/auth/AuthInput";
import { AuthSubmitButton } from "../../components/auth/AuthSubmitButton";
import { AuthAlert } from "../../components/auth/AuthAlert";
import { AuthSwitch } from "../../components/auth/AuthSwitch";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../context/ToastProvider";

export function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) {
      setServerError(error.message);
      return;
    }
    showToast("¡Bienvenido de nuevo!", "success");
    const requested = new URLSearchParams(window.location.search).get("from");
    // Only follow same-site relative paths to avoid open redirects.
    const from = requested && requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";
    router.replace(from);
  };

  return (
    <AuthLayout title="¡Qué bueno verte de nuevo!" subtitle="Iniciá sesión para continuar tu aprendizaje.">
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
        <AuthInput
          label="Contraseña"
          type="password"
          icon={Lock}
          autoComplete="current-password"
          placeholder="••••••••••"
          error={errors.password?.message}
          {...register("password")}
        />
        <div className="-mt-1 flex justify-end">
          <Link
            href="/forgot-password"
            className="rounded-md px-1 text-sm text-[var(--auth-link)] transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        {serverError && <AuthAlert message={serverError} />}
        <AuthSubmitButton isLoading={isSubmitting} loadingText="Ingresando..." className="mt-1">
          Iniciar sesión
        </AuthSubmitButton>
      </form>
      <AuthSwitch prompt="¿Todavía no tenés una cuenta?" href="/register" action="Crear cuenta" />
    </AuthLayout>
  );
}

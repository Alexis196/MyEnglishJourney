"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginSchema, type LoginInput } from "@myenglishjourney/shared";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
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
    <AuthLayout title="Iniciá sesión" subtitle="Continuá tu camino de aprendizaje">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        {serverError && (
          <p className="text-sm text-red-500" role="alert">
            {serverError}
          </p>
        )}
        <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">
          Iniciar sesión
        </Button>
      </form>
      <div className="mt-4 flex flex-col items-center gap-2 text-sm">
        <Link href="/forgot-password" className="text-primary hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
        <p className="text-muted">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

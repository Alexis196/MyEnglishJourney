"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { registerSchema, type RegisterInput } from "@myenglishjourney/shared";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { AuthInput } from "../../components/auth/AuthInput";
import { AuthSubmitButton } from "../../components/auth/AuthSubmitButton";
import { AuthAlert } from "../../components/auth/AuthAlert";
import { AuthSwitch } from "../../components/auth/AuthSwitch";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../context/ToastProvider";

export function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    if (!supabase) return;
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.fullName } },
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    showToast("Cuenta creada. Revisá tu correo para confirmar.", "success");
    router.replace("/login");
  };

  return (
    <AuthLayout
      title="Empezá tu English Journey"
      subtitle="Creá tu cuenta y comenzá a construir tu camino en inglés."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <AuthInput
          label="Nombre completo"
          icon={User}
          autoComplete="name"
          placeholder="Tu nombre y apellido"
          error={errors.fullName?.message}
          {...register("fullName")}
        />
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
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          error={errors.password?.message}
          {...register("password")}
        />
        {serverError && <AuthAlert message={serverError} />}
        <AuthSubmitButton isLoading={isSubmitting} loadingText="Creando cuenta..." className="mt-1">
          Crear cuenta
        </AuthSubmitButton>
      </form>
      <AuthSwitch prompt="¿Ya tenés una cuenta?" href="/login" action="Iniciar sesión" />
    </AuthLayout>
  );
}

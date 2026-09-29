import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@myenglishjourney/shared";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
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
    <AuthLayout title="Recuperar contraseña" subtitle="Te enviamos un enlace para restablecerla">
      {sent ? (
        <p className="text-center text-sm text-zinc-700 dark:text-zinc-300">
          Si el correo existe, vas a recibir un enlace para restablecer tu contraseña.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          {serverError && (
            <p className="text-sm text-red-500" role="alert">
              {serverError}
            </p>
          )}
          <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">
            Enviar enlace
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm text-muted">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  );
}

import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión | Safety360 HSEQ" },
      {
        name: "description",
        content:
          "Acceso para profesionales de prevención de riesgos a la plataforma de gestión de accidentes e incidentes Safety360 HSEQ.",
      },
      { property: "og:title", content: "Iniciar sesión | Safety360 HSEQ" },
      {
        property: "og:description",
        content: "Plataforma de gestión de accidentes, acciones correctivas y MIPER.",
      },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Ingresa tu correo" })
    .email({ message: "Correo no válido" })
    .max(255),
  password: z.string().min(6, { message: "Mínimo 6 caracteres" }).max(128),
});

const recoverSchema = loginSchema.pick({ email: true });

type LoginValues = z.infer<typeof loginSchema>;
type RecoverValues = z.infer<typeof recoverSchema>;
type Mode = "login" | "recover";

function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-sidebar p-10 lg:flex">
        <Logo tone="dark" />
        <div className="max-w-md">
          <h2 className="font-display text-3xl leading-tight font-bold text-sidebar-foreground">
            Del accidente al aprendizaje{" "}
            <span className="text-primary">incorporado al sistema</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-sidebar-foreground/70">
            Investigación, análisis causal, planes de acción, verificación de eficacia y
            actualización de la MIPER en un solo expediente digital. Un caso se cierra cuando las
            medidas fueron implementadas y verificadas.
          </p>
        </div>
        <p className="flex items-center gap-2 text-xs text-sidebar-foreground/50">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Entorno de demostración con datos ficticios
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 md:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo tone="light" />
          </div>
          {mode === "login" ? (
            <LoginForm onRecover={() => setMode("recover")} />
          ) : (
            <RecoverForm onBack={() => setMode("login")} />
          )}
          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
            El registro público está deshabilitado. Las cuentas son creadas o invitadas por la
            administración del sistema.
          </p>
        </div>
      </section>
    </div>
  );
}

function LoginForm({ onRecover }: { onRecover: () => void }) {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit(async (raw) => {
    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos no válidos");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      toast.error("No fue posible iniciar sesión", {
        description:
          error.message === "Invalid login credentials"
            ? "Correo o contraseña incorrectos."
            : error.message,
      });
      return;
    }

    toast.success("Sesión iniciada");
    await navigate({ to: "/dashboard" });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <p className="eyebrow">Acceso profesional</p>
        <h1 className="mt-1 text-2xl font-bold">Iniciar sesión</h1>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Correo corporativo</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="nombre@empresa.cl"
          aria-invalid={Boolean(errors.email)}
          {...register("email", {
            validate: (value) =>
              loginSchema.shape.email.safeParse(value).success || "Correo no válido",
          })}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          <button
            type="button"
            onClick={onRecover}
            className="text-xs font-medium underline underline-offset-4"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password", {
            validate: (value) =>
              loginSchema.shape.password.safeParse(value).success || "Mínimo 6 caracteres",
          })}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="min-h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Verificando…" : "Ingresar"}
      </Button>
    </form>
  );
}

function RecoverForm({ onBack }: { onBack: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoverValues>({ defaultValues: { email: "" } });

  const onSubmit = handleSubmit(async (raw) => {
    const parsed = recoverSchema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos no válidos");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/auth/actualizar-clave`,
    });
    if (error) {
      toast.error("No fue posible enviar el correo", { description: error.message });
      return;
    }

    toast.success("Revisa tu correo", {
      description: "Si la cuenta existe, enviamos un enlace para restablecer la contraseña.",
    });
    onBack();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <p className="eyebrow">Recuperación</p>
        <h1 className="mt-1 text-2xl font-bold">Recuperar contraseña</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enviaremos un enlace de restablecimiento al correo registrado.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="recover-email">Correo corporativo</Label>
        <Input
          id="recover-email"
          type="email"
          autoComplete="email"
          placeholder="nombre@empresa.cl"
          aria-invalid={Boolean(errors.email)}
          {...register("email", {
            validate: (value) =>
              recoverSchema.shape.email.safeParse(value).success || "Correo no válido",
          })}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <Button type="submit" className="min-h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Enviando…" : "Enviar enlace"}
      </Button>
      <Button type="button" variant="ghost" className="min-h-11 w-full" onClick={onBack}>
        Volver al inicio de sesión
      </Button>
    </form>
  );
}

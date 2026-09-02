import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth_/actualizar-clave")({
  head: () => ({
    meta: [
      { title: "Cambiar contraseña | Safety360 HSEQ" },
      {
        name: "description",
        content: "Define una nueva contraseña para tu cuenta de Safety360 HSEQ.",
      },
      { property: "og:title", content: "Cambiar contraseña | Safety360 HSEQ" },
      {
        property: "og:description",
        content: "Actualiza la contraseña de acceso a la plataforma.",
      },
    ],
  }),
  component: UpdatePasswordPage,
});

const schema = z
  .object({
    password: z.string().min(8, { message: "Mínimo 8 caracteres" }).max(128),
    confirm: z.string().min(8).max(128),
  })
  .refine((values) => values.password === values.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

type Values = z.infer<typeof schema>;

function UpdatePasswordPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues: { password: "", confirm: "" } });

  const onSubmit = handleSubmit(async (raw) => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos no válidos");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      toast.error("No fue posible actualizar la contraseña", { description: error.message });
      return;
    }

    toast.success("Contraseña actualizada");
    await navigate({ to: "/dashboard" });
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <Logo tone="light" className="mb-8" />
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <div>
            <p className="eyebrow">Seguridad de la cuenta</p>
            <h1 className="mt-1 text-2xl font-bold">Cambiar contraseña</h1>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              {...register("password", {
                validate: (value) => value.length >= 8 || "Mínimo 8 caracteres",
              })}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar contraseña</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirm)}
              {...register("confirm")}
            />
            {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
          </div>

          <Button type="submit" className="min-h-11 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Guardando…" : "Guardar contraseña"}
          </Button>
        </form>
      </div>
    </div>
  );
}

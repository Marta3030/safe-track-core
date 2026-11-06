import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InviteSchema = z.object({
  email: z.string().trim().email().max(255),
  full_name: z.string().trim().min(2).max(120),
  job_title: z.string().trim().max(120).optional(),
  role: z.enum(["administrador", "prevencionista", "supervisor", "auditor"]),
  redirect_to: z.string().url().max(500),
});

/** Invites a user into the caller's organization. Only administrators may call it. */
export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InviteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: isAdmin }, { data: me }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "administrador" }),
      supabase.from("profiles").select("organization_id").eq("id", userId).maybeSingle(),
    ]);
    if (!isAdmin || !me?.organization_id) throw new Error("Solo un administrador puede invitar usuarios.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: data.redirect_to,
      data: { full_name: data.full_name },
    });
    if (error || !invited.user) {
      throw new Error(
        error?.message?.includes("already") ? "Ese correo ya tiene una cuenta." : error?.message ?? "No se pudo invitar.",
      );
    }
    const id = invited.user.id;
    const { error: pErr } = await supabaseAdmin.from("profiles").upsert({
      id,
      full_name: data.full_name,
      job_title: data.job_title || null,
      organization_id: me.organization_id,
      is_active: true,
    });
    if (pErr) throw new Error(pErr.message);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
    const { error: rErr } = await supabaseAdmin.from("user_roles").insert({ user_id: id, role: data.role });
    if (rErr) throw new Error(rErr.message);
    return { id };
  });

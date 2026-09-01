import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_ROLE, isAppRole, type AppRole } from "@/lib/roles";

export type Profile = {
  id: string;
  full_name: string | null;
  job_title: string | null;
  organization_id: string | null;
};

export type SessionState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole;
};

/**
 * Sesión activa + perfil + rol efectivo.
 * Los permisos reales se aplican en el backend mediante RLS; el rol aquí
 * sólo condiciona la interfaz.
 */
export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole>(DEFAULT_ROLE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      setProfile(null);
      setRole(DEFAULT_ROLE);
      return;
    }

    let active = true;

    void (async () => {
      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, job_title, organization_id")
          .eq("id", userId)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);

      if (!active) return;
      if (profileResult.data) setProfile(profileResult.data as Profile);

      const roles = (roleResult.data ?? [])
        .map((row) => row.role)
        .filter(isAppRole);
      setRole(pickHighestRole(roles));
    })();

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  return {
    loading,
    session,
    user: session?.user ?? null,
    profile,
    role,
  };
}

function pickHighestRole(roles: AppRole[]): AppRole {
  const order: AppRole[] = ["administrador", "prevencionista", "supervisor", "auditor"];
  return order.find((candidate) => roles.includes(candidate)) ?? DEFAULT_ROLE;
}

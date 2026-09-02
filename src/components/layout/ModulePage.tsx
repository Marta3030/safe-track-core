import type { ReactNode } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSession } from "@/hooks/use-session";
import { Skeleton } from "@/components/ui/skeleton";

type ModulePageProps = {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
};

/** Envoltorio de página autenticada: resuelve sesión, perfil y rol. */
export function ModulePage({ title, subtitle, children }: ModulePageProps) {
  const { loading, user, profile, role } = useSession();

  const userName = profile?.full_name?.trim() || user?.email || "Usuario";
  const email = user?.email ?? "";

  return (
    <AppLayout title={title} subtitle={subtitle} role={role} userName={userName} email={email}>
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        children
      )}
    </AppLayout>
  );
}

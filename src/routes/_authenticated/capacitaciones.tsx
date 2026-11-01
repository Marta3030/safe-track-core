import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/layout/ModulePage";
import { TrainingsBoard } from "@/components/trainings/TrainingsBoard";
import { useSession } from "@/hooks/use-session";
import { canManageCases } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/capacitaciones")({
  head: () => ({
    meta: [
      { title: "Capacitaciones | Safety360 HSEQ" },
      { name: "description", content: "Programación, ejecución y evidencia de capacitaciones asociadas a casos, acciones y riesgos MIPER." },
      { property: "og:title", content: "Capacitaciones | Safety360 HSEQ" },
      { property: "og:description", content: "Capacitaciones vinculadas al aprendizaje derivado de los eventos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrainingsPage,
});

function TrainingsPage() {
  const { role, user, profile } = useSession();
  return (
    <ModulePage title="Capacitaciones" subtitle="Programación, ejecución y evidencia">
      <TrainingsBoard canManage={canManageCases(role)} userId={user?.id ?? null} orgId={profile?.organization_id ?? null} />
    </ModulePage>
  );
}

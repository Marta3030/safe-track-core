import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/layout/ModulePage";
import { MiperBoard } from "@/components/miper/MiperBoard";
import { useSession } from "@/hooks/use-session";
import { canManageCases } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/miper")({
  head: () => ({
    meta: [
      { title: "MIPER | Safety360 HSEQ" },
      {
        name: "description",
        content: "Matriz de identificación de peligros y evaluación de riesgos con metodología configurable.",
      },
      { property: "og:title", content: "MIPER | Safety360 HSEQ" },
      { property: "og:description", content: "Identificación de peligros, evaluación de riesgos y riesgo residual." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MiperPage,
});

function MiperPage() {
  const { role, user, profile } = useSession();
  return (
    <ModulePage title="MIPER" subtitle="Matriz de identificación de peligros y evaluación de riesgos">
      <MiperBoard canManage={canManageCases(role)} userId={user?.id ?? null} orgId={profile?.organization_id ?? null} />
    </ModulePage>
  );
}

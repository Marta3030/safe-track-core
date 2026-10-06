import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/layout/ModulePage";
import { ActionsBoard } from "@/components/actions/ActionsBoard";
import { useSession } from "@/hooks/use-session";
import { canManageCases } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/planes-accion")({
  head: () => ({
    meta: [
      { title: "Planes de Acción | Safety360 HSEQ" },
      {
        name: "description",
        content:
          "Acciones correctivas y preventivas con responsable, fecha compromiso, evidencia y verificación de eficacia.",
      },
      { property: "og:title", content: "Planes de Acción | Safety360 HSEQ" },
      {
        property: "og:description",
        content: "Seguimiento de acciones, vencimientos y verificación de eficacia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActionsPage,
});

function ActionsPage() {
  const { role, user } = useSession();
  return (
    <ModulePage title="Planes de Acción" subtitle="Acciones inmediatas, correctivas y preventivas">
      <ActionsBoard canManage={canManageCases(role)} userId={user?.id ?? null} />
    </ModulePage>
  );
}

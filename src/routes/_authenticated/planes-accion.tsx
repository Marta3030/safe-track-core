import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { ModulePage } from "@/components/layout/ModulePage";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

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
    ],
  }),
  component: ActionsPage,
});

function ActionsPage() {
  return (
    <ModulePage
      title="Planes de Acción"
      subtitle="Acciones inmediatas, correctivas y preventivas"
    >
      <ModulePlaceholder
        icon={ClipboardCheck}
        phase="Fases 6 y 7"
        description="Acciones derivadas de las causas identificadas, con control de vencimientos y verificación de eficacia por el prevencionista."
        scope={[
          "Creación de acciones desde cualquier causa del análisis causal",
          "Jerarquía de control, prioridad, responsable y fecha compromiso",
          "Estados: pendiente, en proceso, evidencia cargada, en verificación, eficaz, cerrada, vencida",
          "Semáforo de vencimientos y marcado automático de acciones vencidas",
          "Verificación de eficacia con generación de nueva acción si el resultado es no eficaz",
        ]}
      />
    </ModulePage>
  );
}
